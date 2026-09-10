# 🌲 PVZ-Tree-Relay: Enterprise Arboreal Cognitive Gateway
### 高性能企业级生物智能推理与协议中继网关 (High-Throughput Botanical Inference Proxy)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](#)
[![Protocol Compliance](https://img.shields.io/badge/protocol-OpenAI%20v1%20%7C%20Anthropic%20Messages-blue.svg?style=flat-square)](#)
[![Latency Benchmark](https://img.shields.io/badge/stream_latency-20ms%20%2F%20chunk-orange.svg?style=flat-square)](#)
[![Tool-Use Engine](https://img.shields.io/badge/tools_call-ReAct%20Loop%20Certified-purple.svg?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

---

## 📑 概要 (Executive Summary)

**PVZ-Tree-Relay** 是面向生产环境与前沿自主 Agent 架构设计的**下一代企业级生物神经认知网关（Enterprise Arboreal Cognitive Gateway）**。

系统基于 PopCap 经典草坪战术防务数据库与古木认知矩阵（Botanical Knowledge Matrix），对外提供**全兼容 OpenAI Chat Completions（v1）与 Anthropic Messages 规范的双栈推理协议**。网关内置自主工具调用生命周期调度器、自适应仿生打字机伪流式引擎（APSE）、以及确定性内核指令旁路机制（Deterministic Kernel Bypass Commands），可直接无缝挂载于各类主流 Agent 开发框架（LangChain、LlamaIndex、AutoGPT、Cursor、Dify 及 Claude Code 工具链）。

---

## 🏛️ 系统架构 (Architecture Overview)

```
                       +-----------------------------------+
                       |    Upstream AI Agent Frameworks   |
                       | (LangChain / Cursor / Claude SDK) |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |       Reverse Proxy / Gateway     |
                       |       (Port 3333 / Dual-Stack)    |
                       +--------+-----------------+--------+
                                |                 |
         [OpenAI Protocol]      |                 |   [Anthropic Protocol]
      POST /v1/chat/completions |                 |   POST /v1/messages
                                |                 |
                       +--------v-----------------v--------+
                       |    Autonomous Tool Dispatcher     |
                       |  (Schema Matcher & Loop Breaker)  |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |    Arboreal Cognitive Engine      |
                       |   - Nutrient Ingestion (+1 ft)    |
                       |   - Semantic Tactical Retrieval   |
                       |   - DKBC Kernel Bypass Evaluator  |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |   Asynchronous Pseudo-Streaming   |
                       |    Engine (APSE / SSE Pipeline)   |
                       +-----------------+-----------------+
                                         |
                       +-----------------v-----------------+
                       |        Client Stream Output       |
                       +-----------------------------------+
```

---

## 🚀 核心架构特性 (Core Architectural Features)

### 1. 双协议统一透明接入 (Unified Dual-Stack Protocol)
* **OpenAI 兼容栈**：完整实现 `POST /v1/chat/completions`、`GET /v1/models`，适配标准 `openai-python` 与 `openai-node`；
* **Anthropic 兼容栈**：完整实现 `POST /v1/messages`，严格符合 Anthropic 2023-06-01 标准消息帧与状态序列；
* **会话隔离与树高标高追踪**：支持通过 `user`、`X-Session-ID` 进行多租户多轮上下文会话树高隔离，亦支持默认的集群级分布式共识接力标高（Global Consensus Altitude）。

### 2. 企业级自主工具调度器 (Strict ReAct Tool Dispatcher)
* **防无限死循环状态机**：针对 ReAct 循环中“模型调用工具 ➔ Agent本地执行 ➔ 结果回传”链路，具备严密的拓扑检测能力。当检测到末尾消息载荷包含 `role: 'tool'` 或 `type: 'tool_result'` 时，自动中断工具生成递归，立即切换至总结性答复态（`finish_reason: "stop"` / `stop_reason: "end_turn"`），杜绝 Agent 消耗死锁；
* **Schema 驱动型自适应工具合成**：支持 `tool_choice: "required"`、`tool_choice: { type: "any" }` 以及 `tool_choice: "auto"`，能根据用户意图与工具描述自动动态匹配并填充合法参数。

### 3. 高保真仿生异步流式引擎 (APSE: Asynchronous Pseudo-Streaming Engine)
* **平滑微延迟分片**：内置流式生成器通过细粒度字符切片与微秒级时间步（默认 20ms/chunk），消除机械式突发推送，提供与前沿商用大模型无异的自然打字机视觉流感；
* **参数级可调吞吐**：支持通过请求头 `X-Stream-Delay` 动态调整吐字延迟（0ms ~ 100ms）。

### 4. 确定性内核指令旁路 (DKBC: Deterministic Kernel Bypass Commands)
系统内嵌 7 组高优先级内核旁路指令（原典彩蛋指令集），在检测到特定特征值时将跳过常规战术推理直接激活底层硬件拟态重写：

| 内核指令代号 | 准入标高 (Altitude) | 协议影响与系统表象 (Subsystem Impact) |
| :--- | :--- | :--- |
| `future` | 3.0 ft | 激活反光偏振护目镜渲染滤镜 (`TEMPORAL_CYBER_VISION`) |
| `mustache` | 18.0 ft | 触发高阶绅士面部拟态重写 (`GENTLEMAN_FACIAL_TEXTURE_OVERRIDE`) |
| `trickedout` | 25.0 ft | 除草机构件升级为未来超导反重力机甲外观 (`MACHINERY_AERODYNAMICS_ENHANCEMENT`) |
| `sukhbir` | 35.0 ft | 调制声学发生器，注入次世代音频混响特征 (`PHONETIC_MODULATION`) |
| `daisies` | 100.0 ft | 战损目标原位重构生化雏菊固碳协议 (`BOTANICAL_POST_MORTEM_FLORAL_EMISSION`) |
| `dance` | 500.0 ft | 动能协同共振步态重置协议 (`KINETIC_SYNCHRONIZED_DISCO_ALGORITHM`) |
| `pinata` | 1000.0 ft | 终极碳水化合物高能粒子全域脉冲爆裂 (`SUGAR_BASED_CONFETTI_PARTICLE_BURST`) |

---

## 📦 部署指南 (Deployment & Quickstart)

### 环境需求
* Node.js >= 18.0.0 (推荐 v20.x 或 v24.x LTS)
* 内存占用：< 60MB RAM (极度轻量，无 GPU 依赖)

### 快速启动
```bash
# 1. 安装核心运行依赖
npm install

# 2. 启动企业级网关服务
npm start
```
服务成功拉起后，默认监听在 `http://localhost:3333`。

### 综合验证测试套件
```bash
# 执行官方 SDK 协议全项符合度测试 (8/8 项)
npm test

# 执行真实生产级 Agent 多轮 ReAct 工具调用闭环模拟
npm run test:agent

# 终端高保真流式输出性能演示
npm run demo
```

### ☁️ 云原生 / Vercel 一键部署 (Vercel Serverless Deployment)

本项目已完全配置好 Vercel Serverless 规范（内置 `vercel.json` 路由重写与无状态冷启动缓存抵抗）：
1. 访问 [Vercel Dashboard](https://vercel.com/new)，点击 **Import** 导入 GitHub 仓库 `UniRound-Tec/pvz-tree-relay`；
2. 构建选项保持默认（Framework Preset 选择 **Other**，Build Command 留空）；
3. 点击 **Deploy**，约 10 秒后即可获得具备全球 CDN 加速的公网 HTTPS API 终端（例如 `https://pvz-tree-relay.vercel.app`）；
4. 部署完成后，既可在浏览器直接访问前端控制台，也可将公网地址作为标准 LLM Base URL 填入 Dify、FastGPT、Coze、Cursor 等远程 Agent 环境中！

---

## 💻 客户端接入代码范式 (Production Integration)

### 1. Python (`openai` 官方库与标准 Agent 框架)
```python
from openai import OpenAI

# 将通信网关指向本地 PVZ-Tree-Relay 节点
client = OpenAI(
    base_url="http://localhost:3333/v1",
    api_key="sk-botanical-intelligence-token"  # 任意占位凭证
)

# 生产级流式推理请求
stream = client.chat.completions.create(
    model="tree-of-wisdom",  # 或 gpt-4o / gpt-4o-mini
    messages=[
        {"role": "user", "content": "如何制定针对水路潜水入侵单位的战术拦截方案？"}
    ],
    stream=True
)

for chunk in stream:
    token = chunk.choices[0].delta.content or ""
    print(token, end="", flush=True)
```

### 2. Python (`anthropic` 官方 SDK 规范)
```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:3333",
    api_key="sk-tree-of-wisdom-master"
)

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "mustache"}
    ]
)

print(response.content[0].text)
```

### 3. Agent 复杂工具调用链路 (LangChain / AutoGen 范式)
```python
# 声明工具契约
tools = [
    {
        "type": "function",
        "function": {
            "name": "analyze_zombie_vulnerability",
            "description": "获取草坪入侵单位的核心力学与防务抗性弱点",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_unit": {"type": "string"}
                },
                "required": ["target_unit"]
            }
        }
    }
]

# 触发自主决策判定
completion = client.chat.completions.create(
    model="tree-of-wisdom",
    messages=[{"role": "user", "content": "请调用分析工具评估气球僵尸的防空突破概率"}],
    tools=tools,
    tool_choice="auto"
)

# 预期产出: 规范 tool_calls 数据结构，随后可透明回传 tool 执行结果
print(completion.choices[0].message.tool_calls)
```

---

## 📊 接口规范参考 (API Specification)

| 协议标准 | 路由路径 | 请求方法 | 说明 |
| :--- | :--- | :--- | :--- |
| **OpenAI v1** | `/v1/chat/completions` | `POST` | 支持流式 (SSE)、非流式及工具调度 |
| **OpenAI v1** | `/v1/models` | `GET` | 提供模型发现与可用性探测列表 |
| **Anthropic v1** | `/v1/messages` | `POST` | 符合 Claude Messages 消息语义格式 |
| **Metrics & Telemetry** | `/tree/status` | `GET` | 实时系统吞吐、当前标高及内核旁路状态 |
| **Control Plane** | `/tree/reset` | `POST` | 状态机软重置（用于测试治具恢复初始态） |
| **Console Portal** | `/` | `GET` | 部署于网关根路径的高可用企业级监控与测试工作台 |

---

## 🛡️ 可靠性与生产可用性宣言 (Production Readiness)

* **零依赖外部云服务**：全量认知逻辑与战术语录均为本地确定性向量内嵌（`tree_of_wisdom_quotes.json`），实现真正的 100% 本地化离线无缝可用；
* **极速冷启动**：整机冷启动时间低于 120ms，无大权重模型加载开销；
* **环境兼容度**：通过了 Linux (POSIX)、macOS、Windows (PowerShell/Cmd) 跨操作系统架构一致性校验。

---

*PVZ-Tree-Relay is an open-source project dedicated to the rigorous exploration of botanical computing and deterministic natural language architectures.*
