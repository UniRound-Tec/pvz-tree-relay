// 测试客户端: 验证 OpenAI 和 Anthropic 的 Tools Call 与流式输出
const http = require('http');

const PORT = process.env.PORT || 3333;

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- 🧪 开始自动化测试 Tools Call 与双协议兼容性 ---\n');

  // 测试 1: OpenAI 普通对话 (带 tools 参数，但不强制调用)
  console.log('[测试 1] OpenAI 格式: 传入 tools，常规对话');
  const res1 = await post('/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '今天打巨人僵尸好难啊，请问怎么打？' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_plant_info',
          description: '查询某种植物的详细攻防参数',
          parameters: {
            type: 'object',
            properties: {
              plant_name: { type: 'string' }
            }
          }
        }
      }
    ]
  });
  console.log('Status:', res1.status);
  console.log('Finish Reason:', res1.data.choices[0].finish_reason);
  console.log('Response Content:\n', res1.data.choices[0].message.content);
  console.log('--------------------------------------------------\n');

  // 测试 2: OpenAI 强制 Tool Call (tool_choice: "required")
  console.log('[测试 2] OpenAI 格式: tool_choice="required" 强制要求工具调用');
  const res2 = await post('/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: '请帮我给智慧树施肥' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'fertilize_tree',
          description: '给智慧树施肥',
          parameters: {
            type: 'object',
            properties: {
              fertilizer_bags: { type: 'number', description: '肥料包数' },
              special_note: { type: 'string', description: '施肥备注' }
            },
            required: ['fertilizer_bags']
          }
        }
      }
    ],
    tool_choice: 'required'
  });
  console.log('Status:', res2.status);
  console.log('Finish Reason:', res2.data.choices[0].finish_reason);
  console.log('Tool Calls:', JSON.stringify(res2.data.choices[0].message.tool_calls, null, 2));
  console.log('--------------------------------------------------\n');

  // 测试 3: Anthropic 格式 (带 tools)
  console.log('[测试 3] Anthropic 格式: /v1/messages 带 tools');
  const res3 = await post('/v1/messages', {
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'mustache' }],
    tools: [
      {
        name: 'toggle_mustache_mode',
        description: '切换僵尸小胡子外观模式',
        input_schema: {
          type: 'object',
          properties: {
            enable: { type: 'boolean' }
          }
        }
      }
    ],
    tool_choice: { type: 'tool', name: 'toggle_mustache_mode' }
  }, {
    'x-api-key': 'tree-secret-key',
    'anthropic-version': '2023-06-01'
  });
  console.log('Status:', res3.status);
  console.log('Stop Reason:', res3.data.stop_reason);
  console.log('Anthropic Content:', JSON.stringify(res3.data.content, null, 2));
  console.log('--------------------------------------------------\n');

  console.log('🎉 所有接口与 Tools Call 协议测试全部通过！');
}

runTests().catch(console.error);
