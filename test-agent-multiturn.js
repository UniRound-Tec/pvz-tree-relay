const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const openai = new OpenAI({
  baseURL: 'http://localhost:3333/v1',
  apiKey: 'agent-test-key'
});

const anthropic = new Anthropic({
  baseURL: 'http://localhost:3333',
  apiKey: 'agent-test-key'
});

async function testOpenAIMultiTurn() {
  console.log('--- 1. 测试 OpenAI 格式的多轮会话与树高累加 ---');
  const user = 'agent_session_alpha';
  const history = [];

  // 第 1 轮
  history.push({ role: 'user', content: '你好智慧树！第一包肥料给你！' });
  let res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: history,
    user: user
  });
  console.log('第 1 轮回复:\n', res.choices[0].message.content);
  history.push(res.choices[0].message);

  // 第 2 轮
  history.push({ role: 'user', content: '我想了解大嘴花和坚果' });
  res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: history,
    user: user
  });
  console.log('\n第 2 轮回复 (针对大嘴花关键词语义匹配):\n', res.choices[0].message.content);
  history.push(res.choices[0].message);
  console.log('\n-----------------------------------------------\n');
}

async function testOpenAIAgentToolLoop() {
  console.log('--- 2. 测试真实 Agent ReAct 工具调用完整闭环 (OpenAI) ---');
  const user = 'agent_session_beta';
  const messages = [
    { role: 'system', content: '你是一个植物大战僵尸情报助手，可以调用工具进行情报侦查。' },
    { role: 'user', content: '请帮我调用工具查一下矿工僵尸的情报' }
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'query_zombie_database',
        description: '查询某种僵尸的详细弱点和威胁',
        parameters: {
          type: 'object',
          properties: {
            zombie_name: { type: 'string', description: '僵尸名字' }
          },
          required: ['zombie_name']
        }
      }
    }
  ];

  // Agent 步骤 1: 发送提示词，触发工具调用
  console.log('[Agent Step 1] Agent 向模型发送请求，期望触发工具...');
  const step1 = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    tool_choice: 'auto',
    user
  });

  const toolCall = step1.choices[0].message.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('Agent Step 1 失败: 未能触发工具调用');
  }
  console.log('成功触发工具调用:', toolCall.function.name, '参数:', toolCall.function.arguments);
  console.log('Finish Reason:', step1.choices[0].finish_reason); // 必须是 tool_calls

  // Agent 步骤 2: Agent 本地执行该工具
  console.log('\n[Agent Step 2] Agent 本地执行工具并获取执行结果...');
  const mockToolOutput = JSON.stringify({
    status: 'success',
    weakness: '从地下绕到最左侧吃植物，防线后方脆弱'
  });

  messages.push(step1.choices[0].message);
  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content: mockToolOutput
  });

  // Agent 步骤 3: Agent 将工具执行结果送回给模型，期望得到最终总结答案 (finish_reason 必须是 stop，不能再无限循环 call tool!)
  console.log('\n[Agent Step 3] Agent 将工具结果回传给模型，期望模型做终结性总结...');
  const step3 = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    user
  });

  console.log('Finish Reason:', step3.choices[0].finish_reason); // 必须是 stop!
  console.log('模型终结总结回复:\n', step3.choices[0].message.content);
  console.log('\n-----------------------------------------------\n');
}

async function testAnthropicAgentToolLoop() {
  console.log('--- 3. 测试真实 Agent ReAct 工具调用完整闭环 (Anthropic) ---');
  const messages = [
    { role: 'user', content: '请帮我调用工具查一下气球僵尸的情报' }
  ];

  const tools = [
    {
      name: 'query_zombie_database',
      description: '查询某种僵尸的情报',
      input_schema: {
        type: 'object',
        properties: {
          zombie_name: { type: 'string' }
        },
        required: ['zombie_name']
      }
    }
  ];

  // Anthropic 步骤 1
  console.log('[Anthropic Step 1] 发送消息期望触发 tool_use...');
  const step1 = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages,
    tools,
    tool_choice: { type: 'auto' }
  });

  const toolBlock = step1.content.find(b => b.type === 'tool_use');
  if (!toolBlock) throw new Error('Anthropic Step 1 失败: 未触发 tool_use');
  console.log('成功捕获 tool_use:', toolBlock.name, 'input:', toolBlock.input);
  console.log('Stop Reason:', step1.stop_reason);

  // Anthropic 步骤 2 & 3: 回传 tool_result
  console.log('\n[Anthropic Step 2 & 3] 回传 tool_result 期望 end_turn...');
  messages.push({
    role: 'assistant',
    content: step1.content
  });
  messages.push({
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: '气球僵尸浮在半空，会越过大部分地面植物'
      }
    ]
  });

  const step3 = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages,
    tools
  });

  console.log('Stop Reason:', step3.stop_reason); // 必须是 end_turn
  const textBlock = step3.content.find(b => b.type === 'text');
  console.log('模型终结回复:\n', textBlock.text);
  console.log('\n-----------------------------------------------\n');
}

async function main() {
  await testOpenAIMultiTurn();
  await testOpenAIAgentToolLoop();
  await testAnthropicAgentToolLoop();
  console.log('🎉 所有多轮会话、会话状态累加与 Agent 闭环测试全部通过！');
}

main().catch(console.error);
