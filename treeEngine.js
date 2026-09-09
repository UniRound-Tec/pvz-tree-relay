const fs = require('fs');
const path = require('path');

// 加载智慧树台词数据
const quotesPath = path.join(__dirname, 'tree_of_wisdom_quotes.json');
const quotesData = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));

class SingleTree {
  constructor(id = 'global') {
    this.id = id;
    this.height = 0;
    this.fertilizerCount = 0;
    this.activeCheats = new Set();
    this.recentLogs = [];
  }

  reset(height = 0) {
    this.height = height;
    this.activeCheats.clear();
    this.logAction('RESET', '', `智慧树已重置为 ${height} 英尺`);
  }

  getGrowthStage() {
    const h = this.height;
    if (h <= 0) return { stage: 'seed', name: 'SEED_TIER_0 (胚芽初始态)', emoji: '🌱' };
    if (h < 10) return { stage: 'sprout', name: 'SPROUT_TIER_1 (新生初级节点)', emoji: '🌿' };
    if (h < 40) return { stage: 'sapling', name: 'SAPLING_TIER_2 (亚稳态茁壮枝干)', emoji: '🪴' };
    if (h < 100) return { stage: 'tree', name: 'CANOPY_TIER_3 (高通量成型古木)', emoji: '🌲' };
    if (h < 500) return { stage: 'large_tree', name: 'CENTURY_TIER_4 (百尺神经中枢巨木)', emoji: '🌳' };
    if (h < 1000) return { stage: 'ancient_tree', name: 'ANCIENT_TIER_5 (五百尺原生算力古神)', emoji: '🌴' };
    return { stage: 'world_tree', name: 'PLANETARY_TIER_6 (千尺行星级世界之树)', emoji: '✨🌲✨' };
  }

  getNextMilestone() {
    const h = this.height;
    if (h < 3) return { height: 3, reward: "future (Temporal Cyber Vision 偏光滤镜)" };
    if (h < 18) return { height: 18, reward: "mustache (Gentleman Facial Texture 绅士纹理)" };
    if (h < 25) return { height: 25, reward: "trickedout (Machinery Aerodynamics 反重力割草机)" };
    if (h < 35) return { height: 35, reward: "sukhbir (Phonetic Modulation 声学发生器调制)" };
    if (h < 100) return { height: 100, reward: "daisies (Floral Emission 战损雏菊固碳)" };
    if (h < 500) return { height: 500, reward: "dance (Kinetic Disco Algorithm 动能步态同调)" };
    if (h < 1000) return { height: 1000, reward: "pinata (Sugar-Based Confetti Burst 糖类高能爆裂)" };
    return { height: 1000, reward: "已达成终极标高！全量参数认知矩阵已完全激活" };
  }

  fertilize(inputPrompt = '', options = {}) {
    this.fertilizerCount++;
    const targetHeight = options.heightOverride !== undefined
      ? parseInt(options.heightOverride, 10)
      : this.height + 1;
    this.height = targetHeight;

    const promptText = (inputPrompt || '').trim().toLowerCase();

    // 1. 检查秘籍指令输入
    const cheatResult = this.checkCheats(promptText);
    if (cheatResult) {
      this.logAction('CHEAT_TRIGGERED', promptText, cheatResult.reply);
      return cheatResult;
    }

    // 2. 根据语义或高度智能匹配语录
    const quote = this.getSmartQuote(this.height, promptText, options);

    // 3. 构建生动好玩的智慧树回复文本
    const stage = this.getGrowthStage();
    const replyText = this.formatTreeResponse(quote, stage, options);

    this.logAction('FERTILIZE', promptText, replyText);

    return {
      type: 'quote',
      height: this.height,
      stage: stage.name,
      quote: quote,
      reply: replyText
    };
  }

  checkCheats(text) {
    const cheats = [
      {
        code: 'mustache',
        name: 'GENTLEMAN_FACIAL_TEXTURE_OVERRIDE',
        reply: `[DKBC_OVERRIDE_ACTIVE: MUSTACHE]\n系统面部渲染管线已重写：全域草坪入侵目标已统一附加英伦绅士小胡子三维纹理（Facial Mesh Updated）。\n\n核心语录推演结论：“这里有个实用短语：'mustache'。在玩游戏时用键盘输入它，你就能把不死僵尸变成绅士！”`
      },
      {
        code: 'future',
        name: 'TEMPORAL_CYBER_VISION',
        reply: `[DKBC_OVERRIDE_ACTIVE: FUTURE]\n时空偏振波束已注入：召唤来自遥远未来的赛博入侵单位，全员已装备反光偏光太阳镜（Cyber Sunglasses Equipped）。\n\n核心语录推演结论：“召唤来自遥远未来的僵尸！现在他们看起来酷毙了！”`
      },
      {
        code: 'dance',
        name: 'KINETIC_SYNCHRONIZED_DISCO',
        reply: `[DKBC_OVERRIDE_ACTIVE: DANCE]\n步态运动学发生器共振：全域入侵单位步态已被迪斯科太空步强行同调重置（Disco Kinematics Engaged）。\n\n核心语录推演结论：“我想跳舞！摇摆吧，让僵尸们一起 Boogie！”`
      },
      {
        code: 'pinata',
        name: 'SUGAR_BASED_CONFETTI_BURST',
        reply: `[DKBC_OVERRIDE_ACTIVE: PINATA]\n终极高能粒子色散激活：击毁目标瞬间触发糖类多相粒子与高能彩带漫天喷射脉冲（High-Energy Confetti Burst）。\n\n核心语录推演结论：“一千英尺的终极智慧！尝尝击碎僵尸爆出的甜头吧！”`
      },
      {
        code: 'trickedout',
        name: 'MACHINERY_AERODYNAMICS_ENHANCEMENT',
        reply: `[DKBC_OVERRIDE_ACTIVE: TRICKEDOUT]\n除草机构件重构：手推式机械割草机已升级为超时空悬浮飞行战车外观（Hovercraft Mod Activated）。\n\n核心语录推演结论：“它不会帮你玩得更好，但绝对让你的割草机帅呆了！”`
      },
      {
        code: 'daisies',
        name: 'BOTANICAL_POST_MORTEM_FLORAL_EMISSION',
        reply: `[DKBC_OVERRIDE_ACTIVE: DAISIES]\n生化善后固碳重构激活：战损入侵单位倒伏坐标原位盛开纯白小雏菊（Daisies Emission Armed）。\n\n核心语录推演结论：“正如承诺的那样，当你消灭僵尸时，地上就会留下一朵雏菊！”`
      },
      {
        code: 'sukhbir',
        name: 'PHONETIC_MODULATION',
        reply: `[DKBC_OVERRIDE_ACTIVE: SUKHBIR]\n声学发生器声纹重调：入侵单位求脑声波已切换为定制音阶混响特征（Phonetic Reverb Engaged）。\n\n核心语录推演结论：“想知道输入‘sukhbir’会发生什么吗？注意听僵尸的哼叫声！”`
      }
    ];

    for (const cheat of cheats) {
      const regex = new RegExp(`\\b${cheat.code}\\b`, 'i');
      if (regex.test(text) || text.includes(cheat.code)) {
        this.activeCheats.add(cheat.code);
        return {
          type: 'cheat',
          code: cheat.code,
          name: cheat.name,
          reply: cheat.reply
        };
      }
    }
    return null;
  }

  getSmartQuote(height, promptText = '', options = {}) {
    // 1. 如果有特定里程碑，优先返回里程碑
    if (height === 100) return quotesData.milestones.find(m => m.height_ft === 100);
    if (height === 500) return quotesData.milestones.find(m => m.height_ft === 500);
    if (height === 1000) return quotesData.milestones.find(m => m.height_ft === 1000);

    // 2. 语义关键词匹配（让 Agent 对话极具答疑真实感！）
    if (promptText) {
      const keywordMap = [
        { keys: ['潜水', '泳池', '睡莲', 'snorkel'], id: 20 },
        { keys: ['气球', '三叶草', '吹走', 'balloon', 'blover'], id: 26 },
        { keys: ['巨人', '砸', '樱桃炸弹', 'gargantuar'], id: 4 },
        { keys: ['矿工', '后方', '挖地', 'digger'], id: 15 },
        { keys: ['跳跳', '弹跳', 'pogo', '高坚果'], id: 17 },
        { keys: ['小丑', '爆炸', '音乐盒', 'jack-in-the-box'], id: 38 },
        { keys: ['大蒜', '屋顶', 'roof', 'garlic'], id: 24 },
        { keys: ['金币', '钱', '吸金', 'gold', 'magnet'], id: 12 },
        { keys: ['玉米加农炮', '大炮', '轰炸', '炮', 'cannon'], id: 27 },
        { keys: ['忧郁菇', '扎堆', '群怪', 'gloom'], id: 19 },
        { keys: ['磁力菇', '金属', '铁桶', '梯子', 'magnet-shroom'], id: 39 },
        { keys: ['大嘴花', '坚果', 'chomper', 'wall-nut'], id: 2 },
        { keys: ['无尽', '生存', 'endless'], id: 33 },
        { keys: ['猫尾草', '导向', 'cattail'], id: 21 },
        { keys: ['保护伞', '蹦极', '篮球', 'umbrella'], id: 28 },
        { keys: ['冰西瓜', '减速', 'winter melon'], id: 29 },
        { keys: ['花瓶', '敲罐', 'vasebreaker'], id: 36 },
        { keys: ['雪人', 'yeti'], id: 8 }
      ];

      for (const item of keywordMap) {
        if (item.keys.some(k => promptText.includes(k))) {
          const match = quotesData.regular_tips.find(t => t.id === item.id);
          if (match) return match;
        }
      }
    }

    // 3. 1 ~ 39 尺正常循序渐进
    if (height >= 1 && height <= 39) {
      const tip = quotesData.regular_tips.find(t => t.height_ft === height);
      if (tip) return tip;
    }

    // 4. > 1000 尺终局大树
    if (height > 1000) {
      const loops = quotesData.endgame_loop;
      const pick = loops[Math.floor(Math.random() * loops.length)];
      return {
        key: pick.key,
        height_ft: height,
        text_en: pick.text_en,
        text_zh: pick.text_zh,
        category: 'endgame'
      };
    }

    // 5. 其余高度随机温故知新
    const regularTips = quotesData.regular_tips;
    const randomTip = regularTips[Math.floor(Math.random() * regularTips.length)];
    return {
      key: randomTip.key,
      height_ft: height,
      text_en: randomTip.text_en,
      text_zh: randomTip.text_zh,
      category: 'growth_review',
      target: randomTip.target
    };
  }

  formatTreeResponse(quote, stage, options = {}) {
    const next = this.getNextMilestone();
    const cheatNote = quote.cheat_code
      ? `\n[DKBC_BYPASS_DETECTED]: 捕获底层内核旁路特征：“${quote.cheat_code}”`
      : '';

    // 如果是工具执行返回后的综合回答
    const toolPrefix = options.hasToolResult
      ? `\n[TACTICAL_INTEL_PAYLOAD_PARSED]: 侦查情报回传载荷已确认解析：\n> “${options.toolResultSummary}”\n`
      : '';

    return `[ARBOREAL_NODE_TELEMETRY: ALTITUDE ${this.height}.0 FT | TIER: ${stage.name}]
[NUTRIENT_INGESTION_STATUS]: 成功摄入 1.0 单位标准生物营养基质，突触权重已完成递增。${toolPrefix}
草坪战术防务推演评估结论：
“${quote.text_zh}”

[EN_CANONICAL]: "${quote.text_en}"${cheatNote}
[NEXT_THRESHOLD]: 距 ${next.height}.0 FT 标高尚需 ${Math.max(0, next.height - this.height)}.0 FT（待激活系统: ${next.reward}）`;
  }

  logAction(type, prompt, reply) {
    this.recentLogs.unshift({
      time: new Date().toLocaleTimeString(),
      type,
      height: this.height,
      prompt: (prompt || '').slice(0, 60),
      reply: (reply || '').slice(0, 80)
    });
    if (this.recentLogs.length > 50) {
      this.recentLogs.pop();
    }
  }
}

class TreeManager {
  constructor() {
    this.globalTree = new SingleTree('global');
    this.sessionTrees = new Map(); // sessionId -> SingleTree
  }

  getTree(sessionId = null) {
    if (!sessionId || sessionId === 'global') {
      return this.globalTree;
    }
    if (!this.sessionTrees.has(sessionId)) {
      this.sessionTrees.set(sessionId, new SingleTree(sessionId));
    }
    return this.sessionTrees.get(sessionId);
  }

  getStatus(sessionId = null) {
    const tree = this.getTree(sessionId);
    return {
      sessionId: tree.id,
      height: tree.height,
      fertilizerCount: tree.fertilizerCount,
      activeCheats: Array.from(tree.activeCheats),
      stage: tree.getGrowthStage(),
      nextMilestone: tree.getNextMilestone(),
      recentLogs: tree.recentLogs.slice(0, 20),
      totalActiveSessions: this.sessionTrees.size
    };
  }

  reset(sessionId = null, height = 0) {
    const tree = this.getTree(sessionId);
    tree.reset(height);
  }

  fertilize(inputPrompt, options = {}) {
    const tree = this.getTree(options.sessionId);
    return tree.fertilize(inputPrompt, options);
  }
}

module.exports = new TreeManager();
