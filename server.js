const express = require('express');
const cors = require('cors');
const path = require('path');
const treeEngine = require('./treeEngine');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 生成唯一 ID
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

// 解析会话 ID (用于多轮对话隔离或会话级树高追踪)
function resolveSessionId(req) {
  return req.headers['x-session-id'] ||
         req.body?.user ||
         req.query?.session_id ||
         'global';
}

// 检查是否是刚执行完 Tool 返回的结果消息
function checkToolResult(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return { hasToolResult: false, summary: '' };
  const lastMsg = messages[messages.length - 1];

  // OpenAI 格式: role === 'tool'
  if (lastMsg.role === 'tool') {
    return {
      hasToolResult: true,
      summary: typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content)
    };
  }

  // Anthropic 格式: role === 'user' 且 content 中包含 tool_result
  if (Array.isArray(lastMsg.content)) {
    const toolResultBlock = lastMsg.content.find(p => p.type === 'tool_result');
    if (toolResultBlock) {
      return {
        hasToolResult: true,
        summary: typeof toolResultBlock.content === 'string' ? toolResultBlock.content : JSON.stringify(toolResultBlock.content)
      };
    }
  }

  return { hasToolResult: false, summary: '' };
}

// 解析消息中的最后一条有效用户输入
function extractLastUserText(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user') {
      if (typeof msg.content === 'string' && msg.content.trim()) {
        return msg.content;
      }
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            return part.text;
          }
        }
      }
    }
  }
  // 兜底返回最后一条内容
  const last = messages[messages.length - 1];
  return typeof last?.content === 'string' ? last.content : '';
}

// 核心决策：Agent 多轮交互中是否应该发起 Tool Call
function resolveToolCall(tools, toolChoice, userPrompt, hasToolResult, isAnthropic = false) {
  // 如果刚刚执行完 Tool 返回，绝对不再发起新的 Tool Call，避免 Agent 陷入死循环！
  if (hasToolResult) {
    return null;
  }

  if (!Array.isArray(tools) || tools.length === 0) {
    return null;
  }

  // 1. 规范化 toolChoice 解析
  let shouldCall = false;
  let targetToolName = null;

  const isRequired =
    toolChoice === 'required' ||
    (typeof toolChoice === 'object' && toolChoice !== null && toolChoice.type === 'any');

  if (isRequired) {
    shouldCall = true;
  } else if (typeof toolChoice === 'object' && toolChoice !== null) {
    // OpenAI 格式: { type: 'function', function: { name: '...' } }
    if (toolChoice.function?.name) {
      shouldCall = true;
      targetToolName = toolChoice.function.name;
    }
    // Anthropic 格式: { type: 'tool', name: '...' }
    else if (toolChoice.type === 'tool' && toolChoice.name) {
      shouldCall = true;
      targetToolName = toolChoice.name;
    }
    // Anthropic 格式或通用: { name: '...' }
    else if (toolChoice.name) {
      shouldCall = true;
      targetToolName = toolChoice.name;
    }
  }

  // 2. 如果未显式指定，但处于 auto 模式（包括字符串 'auto' 或对象 { type: 'auto' } 或未设置）
  const isAutoMode =
    !shouldCall &&
    (toolChoice === 'auto' ||
     (typeof toolChoice === 'object' && toolChoice !== null && toolChoice.type === 'auto') ||
     toolChoice === null ||
     toolChoice === undefined);

  if (isAutoMode) {
    const promptLower = (userPrompt || '').toLowerCase();
    for (const t of tools) {
      const name = (t.name || t.function?.name || '').toLowerCase();
      const desc = (t.description || t.function?.description || '').toLowerCase();
      // 如果工具名或描述命中了用户关键词 (例如查僵尸、查植物、施肥、计算等)
      if (
        (name && (promptLower.includes('查') || promptLower.includes('search') || promptLower.includes('get') || promptLower.includes('call') || promptLower.includes('工具') || promptLower.includes('调用'))) &&
        (promptLower.includes(name) || desc.includes('僵尸') || desc.includes('植物') || desc.includes('tree') || desc.includes('zombie'))
      ) {
        shouldCall = true;
        targetToolName = t.name || t.function?.name;
        break;
      }
    }
  }

  if (!shouldCall) {
    return null;
  }

  // 匹配选定的工具
  let selectedTool = null;
  if (targetToolName) {
    selectedTool = tools.find(t => (t.name === targetToolName || t.function?.name === targetToolName));
  }
  if (!selectedTool) {
    selectedTool = tools[0];
  }

  const toolName = selectedTool.name || selectedTool.function?.name || 'fertilize_tree';
  const schema = selectedTool.input_schema || selectedTool.function?.parameters || {};

  // 智能根据用户输入构造合理的工具参数
  const mockArgs = {};
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.type === 'number' || prop.type === 'integer') {
        mockArgs[key] = key.includes('height') ? 10 : 1;
      } else if (prop.type === 'boolean') {
        mockArgs[key] = true;
      } else if (prop.type === 'string') {
        mockArgs[key] = userPrompt.slice(0, 30) || '智慧树情报分析';
      } else {
        mockArgs[key] = {};
      }
    }
  }

  return {
    id: isAnthropic ? `toolu_${generateId('tree')}` : `call_${generateId('tree')}`,
    name: toolName,
    args: mockArgs
  };
}

// 解析流式延迟配置 (毫秒/片段，默认 20ms 营造逼真的大模型打字机流式效果)
function resolveStreamDelay(req) {
  const custom = req.headers['x-stream-delay'] || req.query?.stream_delay || req.query?.delay;
  if (custom !== undefined) {
    const parsed = parseInt(custom, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 20; // 默认 20ms
}

// 仿真 OpenAI SSE 流式输出
async function streamOpenAIPseudo(res, completionId, createdTime, model, treeResult, toolCall, delayMs = 20) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (toolCall) {
    const argsStr = JSON.stringify(toolCall.args);
    // 1. 发送工具调用头 (name 与空 arguments)
    res.write(`data: ${JSON.stringify({
      id: completionId,
      object: 'chat.completion.chunk',
      created: createdTime,
      model,
      choices: [{
        index: 0,
        delta: {
          role: 'assistant',
          tool_calls: [{
            index: 0,
            id: toolCall.id,
            type: 'function',
            function: { name: toolCall.name, arguments: '' }
          }]
        },
        finish_reason: null
      }]
    })}\n\n`);

    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

    // 2. 仿真流式吐出参数 JSON
    const chunkSize = 10;
    let cursor = 0;
    while (cursor < argsStr.length) {
      if (res.writableEnded || res.destroyed) break;
      const nextEnd = Math.min(cursor + chunkSize, argsStr.length);
      const piece = argsStr.slice(cursor, nextEnd);
      cursor = nextEnd;

      res.write(`data: ${JSON.stringify({
        id: completionId,
        object: 'chat.completion.chunk',
        created: createdTime,
        model,
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: piece }
            }]
          },
          finish_reason: null
        }]
      })}\n\n`);

      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    // 3. 终结帧
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify({
        id: completionId,
        object: 'chat.completion.chunk',
        created: createdTime,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }]
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
    return;
  }

  // 正常文本伪流式逐字/逐词推送
  const fullText = treeResult.reply;
  const chunkSize = 3; // 每次吐出 3 个字符
  let cursor = 0;
  let isFirst = true;

  while (cursor < fullText.length) {
    if (res.writableEnded || res.destroyed) break;
    const nextEnd = Math.min(cursor + chunkSize, fullText.length);
    const piece = fullText.slice(cursor, nextEnd);
    cursor = nextEnd;

    const chunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created: createdTime,
      model,
      choices: [
        {
          index: 0,
          delta: isFirst ? { role: 'assistant', content: piece } : { content: piece },
          finish_reason: null
        }
      ]
    };
    isFirst = false;
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);

    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }

  // 结束帧
  if (!res.writableEnded && !res.destroyed) {
    const endChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created: createdTime,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
    };
    res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

// 仿真 Anthropic SSE 流式输出
async function streamAnthropicPseudo(res, messageId, model, treeResult, toolCall, delayMs = 20) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 1. message_start
  res.write(`event: message_start\ndata: ${JSON.stringify({
    type: 'message_start',
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 15, output_tokens: 1 }
    }
  })}\n\n`);

  if (toolCall) {
    const argsStr = JSON.stringify(toolCall.args);

    // 2. content_block_start
    res.write(`event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.name,
        input: {}
      }
    })}\n\n`);

    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

    // 3. input_json_delta
    const chunkSize = 10;
    let cursor = 0;
    while (cursor < argsStr.length) {
      if (res.writableEnded || res.destroyed) break;
      const nextEnd = Math.min(cursor + chunkSize, argsStr.length);
      const piece = argsStr.slice(cursor, nextEnd);
      cursor = nextEnd;

      res.write(`event: content_block_delta\ndata: ${JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: piece }
      })}\n\n`);

      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    // 4. content_block_stop
    res.write(`event: content_block_stop\ndata: ${JSON.stringify({
      type: 'content_block_stop',
      index: 0
    })}\n\n`);

    // 5. message_delta
    res.write(`event: message_delta\ndata: ${JSON.stringify({
      type: 'message_delta',
      delta: { stop_reason: 'tool_use', stop_sequence: null },
      usage: { output_tokens: 30 }
    })}\n\n`);
  } else {
    const fullText = treeResult.reply;

    // 2. content_block_start
    res.write(`event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' }
    })}\n\n`);

    // 3. text_delta 逐字流式
    const chunkSize = 3;
    let cursor = 0;
    while (cursor < fullText.length) {
      if (res.writableEnded || res.destroyed) break;
      const nextEnd = Math.min(cursor + chunkSize, fullText.length);
      const piece = fullText.slice(cursor, nextEnd);
      cursor = nextEnd;

      res.write(`event: content_block_delta\ndata: ${JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: piece }
      })}\n\n`);

      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    }

    // 4. content_block_stop
    res.write(`event: content_block_stop\ndata: ${JSON.stringify({
      type: 'content_block_stop',
      index: 0
    })}\n\n`);

    // 5. message_delta
    res.write(`event: message_delta\ndata: ${JSON.stringify({
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: fullText.length }
    })}\n\n`);
  }

  // 6. message_stop
  res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
  res.end();
}

// ==========================================
// 1. OpenAI 兼容接口: POST /v1/chat/completions
// ==========================================
app.post(['/v1/chat/completions', '/chat/completions'], async (req, res) => {
  const {
    model = 'tree-of-wisdom',
    messages = [],
    stream = false,
    tools = null,
    tool_choice = null,
    temperature = 0.7
  } = req.body;

  const sessionId = resolveSessionId(req);
  const { hasToolResult, summary } = checkToolResult(messages);
  const userPrompt = extractLastUserText(messages);
  const heightOverride = req.headers['x-tree-height'] || req.query.height;

  // 检查是否需要调用工具
  const toolCall = resolveToolCall(tools, tool_choice, userPrompt, hasToolResult, false);

  // 如果没有调用工具，给智慧树施肥并获取台词
  let treeResult = null;
  if (!toolCall) {
    treeResult = treeEngine.fertilize(userPrompt, {
      sessionId,
      heightOverride,
      hasToolResult,
      toolResultSummary: summary
    });
  }

  const completionId = generateId('chatcmpl-tree');
  const createdTime = Math.floor(Date.now() / 1000);
  const delayMs = resolveStreamDelay(req);

  // 流式传输 (伪流式打字机 SSE)
  if (stream) {
    return streamOpenAIPseudo(res, completionId, createdTime, model, treeResult, toolCall, delayMs);
  }

  // 非流式响应
  const responseMessage = {
    role: 'assistant',
    content: toolCall ? null : treeResult.reply
  };

  if (toolCall) {
    responseMessage.tool_calls = [
      {
        id: toolCall.id,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args)
        }
      }
    ];
  }

  const responseBody = {
    id: completionId,
    object: 'chat.completion',
    created: createdTime,
    model,
    choices: [
      {
        index: 0,
        message: responseMessage,
        finish_reason: toolCall ? 'tool_calls' : 'stop'
      }
    ],
    usage: {
      prompt_tokens: Math.max(1, userPrompt.length),
      completion_tokens: toolCall ? 20 : treeResult.reply.length,
      total_tokens: userPrompt.length + (toolCall ? 20 : treeResult.reply.length)
    },
    system_fingerprint: `tree-session-${sessionId}`
  };

  return res.json(responseBody);
});

// ==========================================
// 2. Anthropic 兼容接口: POST /v1/messages
// ==========================================
app.post(['/v1/messages', '/messages'], async (req, res) => {
  const {
    model = 'claude-3-5-sonnet-20241022',
    messages = [],
    system = '',
    stream = false,
    tools = null,
    tool_choice = null,
    max_tokens = 1024
  } = req.body;

  const sessionId = resolveSessionId(req);
  const { hasToolResult, summary } = checkToolResult(messages);
  const userPrompt = extractLastUserText(messages);
  const heightOverride = req.headers['x-tree-height'] || req.query.height;

  const toolCall = resolveToolCall(tools, tool_choice, userPrompt, hasToolResult, true);

  let treeResult = null;
  if (!toolCall) {
    treeResult = treeEngine.fertilize(userPrompt, {
      sessionId,
      heightOverride,
      hasToolResult,
      toolResultSummary: summary
    });
  }

  const messageId = generateId('msg_tree');
  const delayMs = resolveStreamDelay(req);

  // 流式响应 (Anthropic 伪流式 SSE)
  if (stream) {
    return streamAnthropicPseudo(res, messageId, model, treeResult, toolCall, delayMs);
  }

  // 非流式响应
  const content = [];
  let stopReason = 'end_turn';

  if (toolCall) {
    stopReason = 'tool_use';
    content.push({
      type: 'tool_use',
      id: toolCall.id,
      name: toolCall.name,
      input: toolCall.args
    });
  } else {
    content.push({
      type: 'text',
      text: treeResult.reply
    });
  }

  const responseBody = {
    id: messageId,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: Math.max(10, userPrompt.length),
      output_tokens: toolCall ? 25 : treeResult.reply.length
    }
  };

  return res.json(responseBody);
});

// ==========================================
// 3. 模型列表接口: GET /v1/models
// ==========================================
app.get(['/v1/models', '/models'], (req, res) => {
  const models = [
    { id: 'tree-of-wisdom', object: 'model', owned_by: 'popcap-zen-garden' },
    { id: 'pvz-tree', object: 'model', owned_by: 'popcap-zen-garden' },
    { id: 'wisdom-tree-1000ft', object: 'model', owned_by: 'popcap-zen-garden' },
    { id: 'gpt-4o', object: 'model', owned_by: 'openai-alias' },
    { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai-alias' },
    { id: 'gpt-3.5-turbo', object: 'model', owned_by: 'openai-alias' },
    { id: 'claude-3-5-sonnet-20241022', object: 'model', owned_by: 'anthropic-alias' },
    { id: 'claude-3-opus-20240229', object: 'model', owned_by: 'anthropic-alias' },
    { id: 'claude-3-haiku-20240307', object: 'model', owned_by: 'anthropic-alias' }
  ];
  return res.json({ object: 'list', data: models });
});

// ==========================================
// 4. 智慧树状态与控制接口
// ==========================================
app.get('/tree/status', (req, res) => {
  const sessionId = resolveSessionId(req);
  res.json(treeEngine.getStatus(sessionId));
});

app.post('/tree/reset', (req, res) => {
  const sessionId = resolveSessionId(req);
  const targetHeight = req.body.height !== undefined ? parseInt(req.body.height, 10) : 0;
  treeEngine.reset(sessionId, targetHeight);
  res.json({ message: `智慧树 (${sessionId}) 已重置为 ${targetHeight} 英尺`, status: treeEngine.getStatus(sessionId) });
});

app.post('/tree/fertilize', (req, res) => {
  const sessionId = resolveSessionId(req);
  const prompt = req.body.prompt || '手动施肥';
  const result = treeEngine.fertilize(prompt, { ...req.body, sessionId });
  res.json(result);
});

app.get('/tree_of_wisdom_quotes.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'tree_of_wisdom_quotes.json'));
});

// 启动服务 (仅在作为主程序直接运行时监听，适配 Vercel Serverless Function 导出)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🌲 植物大战僵尸 智慧树 API 中继 (PvZ Tree Relay) 运行就绪!`);
    console.log(`📍 本地监控控制台: http://localhost:${PORT}`);
    console.log(`🔌 OpenAI API 接口:  POST http://localhost:${PORT}/v1/chat/completions`);
    console.log(`🔌 Anthropic 接口:    POST http://localhost:${PORT}/v1/messages`);
    console.log(`🤖 Agent 支持:       多轮对话会话隔离 + 完整 Tool Call ReAct 闭环`);
    console.log('====================================================');
  });
}

module.exports = app;
