// 伪流式效果终端演示: 实时查看大模型打字机流式输出
const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: 'http://localhost:3333/v1',
  apiKey: 'demo'
});

async function demo() {
  console.log('🌲 [智慧树打字机伪流式效果演示]：\n');

  const stream = await openai.chat.completions.create({
    model: 'tree-of-wisdom',
    messages: [{ role: 'user', content: '智慧树，今天来点秘籍！' }],
    stream: true
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(text);
  }

  console.log('\n\n✨ 流式输出结束！');
}

demo().catch(console.error);
