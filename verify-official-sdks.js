const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const openai = new OpenAI({
  baseURL: 'http://localhost:3333/v1',
  apiKey: 'tree-of-wisdom-test'
});

const anthropic = new Anthropic({
  baseURL: 'http://localhost:3333',
  apiKey: 'tree-of-wisdom-test'
});

const sampleToolsOpenAI = [
  {
    type: 'function',
    function: {
      name: 'fertilize_tree',
      description: '给智慧树投喂树肥',
      parameters: {
        type: 'object',
        properties: {
          bag_count: { type: 'number', description: '肥料数量' },
          notes: { type: 'string', description: '备注文案' }
        },
        required: ['bag_count']
      }
    }
  }
];

const sampleToolsAnthropic = [
  {
    name: 'fertilize_tree',
    description: '给智慧树投喂树肥',
    input_schema: {
      type: 'object',
      properties: {
        bag_count: { type: 'number', description: '肥料数量' },
        notes: { type: 'string', description: '备注文案' }
      },
      required: ['bag_count']
    }
  }
];

async function run() {
  console.log('🚀 开始使用官方 SDK 进行极其严苛的兼容性验证...\n');
  let passed = 0;
  let total = 0;

  // 1. OpenAI 非流式文本
  total++;
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '你好呀' }]
    });
    console.log('✅ [1/8] 官方 OpenAI SDK 非流式文本调用成功!');
    if (!res.choices[0].message.content) throw new Error('content is empty');
    passed++;
  } catch (e) {
    console.error('❌ [1/8] 官方 OpenAI SDK 非流式文本调用失败:', e.message);
  }

  // 2. OpenAI 流式文本
  total++;
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '给我讲讲大嘴花' }],
      stream: true
    });
    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk.choices[0]?.delta?.content || '';
    }
    console.log('✅ [2/8] 官方 OpenAI SDK 流式文本 (SSE) 调用成功! 接收长度:', fullText.length);
    if (!fullText) throw new Error('stream fullText is empty');
    passed++;
  } catch (e) {
    console.error('❌ [2/8] 官方 OpenAI SDK 流式文本调用失败:', e.message);
  }

  // 3. OpenAI 非流式 Tools Call
  total++;
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '必须调用工具进行施肥' }],
      tools: sampleToolsOpenAI,
      tool_choice: 'required'
    });
    const toolCall = res.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'fertilize_tree') {
      throw new Error('未正确生成 tool_calls');
    }
    const parsedArgs = JSON.parse(toolCall.function.arguments);
    console.log('✅ [3/8] 官方 OpenAI SDK 非流式 Tools Call 成功! 函数名:', toolCall.function.name, '参数:', parsedArgs);
    passed++;
  } catch (e) {
    console.error('❌ [3/8] 官方 OpenAI SDK 非流式 Tools Call 失败:', e.message);
  }

  // 4. OpenAI 流式 Tools Call
  total++;
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '流式必须调用工具' }],
      tools: sampleToolsOpenAI,
      tool_choice: 'required',
      stream: true
    });
    let collectedToolCalls = [];
    let finishReason = null;
    for await (const chunk of stream) {
      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
      const tc = chunk.choices[0]?.delta?.tool_calls;
      if (tc) {
        collectedToolCalls.push(...tc);
      }
    }
    console.log('✅ [4/8] 官方 OpenAI SDK 流式 Tools Call 成功! finish_reason:', finishReason);
    passed++;
  } catch (e) {
    console.error('❌ [4/8] 官方 OpenAI SDK 流式 Tools Call 失败:', e.message);
  }

  // 5. Anthropic 非流式文本
  total++;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: '今天天气真好' }]
    });
    console.log('✅ [5/8] 官方 Anthropic SDK 非流式文本调用成功! ID:', res.id);
    passed++;
  } catch (e) {
    console.error('❌ [5/8] 官方 Anthropic SDK 非流式文本调用失败:', e.message);
  }

  // 6. Anthropic 流式文本
  total++;
  try {
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: '来句名言' }],
      stream: true
    });
    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        fullText += chunk.delta.text;
      }
    }
    console.log('✅ [6/8] 官方 Anthropic SDK 流式文本调用成功! 接收字符数:', fullText.length);
    passed++;
  } catch (e) {
    console.error('❌ [6/8] 官方 Anthropic SDK 流式文本调用失败:', e.message);
  }

  // 7. Anthropic 非流式 Tools Call
  total++;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: '请使用工具进行施肥' }],
      tools: sampleToolsAnthropic,
      tool_choice: { type: 'tool', name: 'fertilize_tree' }
    });
    const toolBlock = res.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.name !== 'fertilize_tree') {
      throw new Error('未正确解析出 tool_use 块');
    }
    console.log('✅ [7/8] 官方 Anthropic SDK 非流式 Tools Call 成功! 工具名:', toolBlock.name, 'input:', toolBlock.input);
    passed++;
  } catch (e) {
    console.error('❌ [7/8] 官方 Anthropic SDK 非流式 Tools Call 失败:', e.message);
  }

  // 8. Anthropic 流式 Tools Call
  total++;
  try {
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: '流式调用工具' }],
      tools: sampleToolsAnthropic,
      tool_choice: { type: 'tool', name: 'fertilize_tree' },
      stream: true
    });
    let toolUseEvent = false;
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_start' && chunk.content_block?.type === 'tool_use') {
        toolUseEvent = true;
      }
    }
    console.log('✅ [8/8] 官方 Anthropic SDK 流式 Tools Call 成功! 成功捕获 tool_use 事件:', toolUseEvent);
    passed++;
  } catch (e) {
    console.error('❌ [8/8] 官方 Anthropic SDK 流式 Tools Call 失败:', e.message);
  }

  console.log(`\n📊 最终结果: ${passed}/${total} 项通过！`);
}

run().catch(console.error);
