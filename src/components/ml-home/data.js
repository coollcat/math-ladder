import { NODES, EDGES, DEPTH, USE_AGG } from './full-graph-data';

export const CHAPTERS = [
  { n: '00', title: 'Python 工具箱', short: '工具箱', count: 5, to: '/docs/python-tools/', desc: '变量、循环、函数与画图——第一卷的登山杖。', tools: 'sum · matplotlib · random' },
  { n: '01', title: '算术四则', short: '算术四则', count: 5, to: '/docs/arithmetic/', desc: '加减乘除、负数与运算优先级，一切的地基。', tools: '分配律矩形 · 发糖余数机' },
  { n: '02', title: '分数与小数', short: '分数小数', count: 7, to: '/docs/fractions/', desc: '除法的另一种写法，数轴上的缝隙被填满。', tools: '分数圆盘 · 符号翻转台' },
  { n: '03', title: '幂、根与对数', short: '幂根对数', count: 6, to: '/docs/exponents/', desc: '连乘的记号，以及它的两个逆操作。', tools: 'math.sqrt · math.log · 二分求 √2' },
  { n: '04', title: '代数与方程', short: '代数方程', count: 6, to: '/docs/algebra/', desc: '字母登场：式子可化简，未知数站到台前。', tools: '天平 balance · 判别式三态' },
  { n: '05', title: '几何入门', short: '几何入门', count: 5, to: '/docs/geometry/', desc: '角度、勾股与圆周率——给公式一张看得见的脸。', tools: 'math.hypot · math.pi · 勾股方块' },
  { n: '06', title: '函数与图像', short: '函数图像', count: 5, to: '/docs/functions/', desc: '数学的核心语言：机器、曲线与变换三件事。', tools: 'fit 拟合 · floor/ceil · 反函数镜像' },
  { n: '07', title: '三角与振动', short: '三角振动', count: 6, to: '/docs/trigonometry/', desc: '单位圆上转圈：波的语言从此开始。', tools: 'math.sin/cos/tau · 单位圆 · 拍频' },
  { n: '08', title: '数列与归纳法', short: '数列归纳', count: 4, to: '/docs/sequences/', desc: '一格一格的数学，和无穷步的通行证。', tools: '多米诺 · 斐波那契螺方 · Σ 记号' },
  { n: '09', title: '概率与统计', short: '概率统计', count: 4, to: '/docs/probability/', desc: '不确定性也能精确研究。', tools: 'coinlaw 大数定律 · statdots · statistics' },
  { n: '10', title: '数论', short: '数论', count: 4, to: '/docs/numbertheory/', desc: '素数、余数与密码学的地基。', tools: '同余时钟 · 素数筛 · math.gcd' },
  { n: '11', title: '线性代数', short: '线性代数', count: 5, to: '/docs/linear-algebra/', desc: '会算术的几何：向量、矩阵与正交。', tools: '矩阵变形机 · 点积投影 · 基变换' },
  { n: '12', title: '复数与欧拉公式', short: '复数欧拉', count: 5, to: '/docs/complex/', desc: '升维钥匙与最美的公式。', tools: 'math.e/exp · 复平面 · 乘法即旋转' },
  { n: '13', title: '极限与导数', short: '极限导数', count: 5, to: '/docs/derivatives/', desc: '变化率的科学：割线一步步贴成切线。', tools: '割线收敛器 · 链式法则' },
  { n: '14', title: '积分', short: '积分', count: 4, to: '/docs/integrals/', desc: '面积的语言：分割、求和、取极限。', tools: '黎曼和 · FTC 双面板' },
  { n: '15', title: '级数与泰勒', short: '级数泰勒', count: 4, to: '/docs/series-taylor/', desc: '无穷个数的和，与用多项式逼近一切。', tools: 'taylor 逼近机 · 手搓 sin/cos/exp' },
  { n: '16', title: '傅里叶', short: '傅里叶', count: 8, to: '/docs/fourier/', desc: '信号与变换枢纽：任何波都是正弦的和。', tools: '正交性实验 · 吉布斯 · 手搓 DFT' },
];

export const EXTRA_EDGES = [[5, 7], [7, 12], [10, 12], [11, 16], [14, 16]];

export const VOLUMES = [
  { n: '卷一', title: '数学地基', range: '00–16 章 · 104 课', status: 'done', statusLabel: '已完工', desc: '地基层与第一段主线的完整地基：从数量直觉一路长出函数、微积分、级数与傅里叶枢纽站——全部可交互、可运行，工具都有出生证明。' },
  { n: '卷二', title: '高等数学核心', range: '18–26 章', status: 'plan', statusLabel: '规划中', desc: '从计算工具走向严格数学结构：数学语言与证明、实分析、多元微积分、线代进阶、微分方程、复分析、测度论与泛函分析——回答「为什么成立」。' },
  { n: '卷三', title: '离散数学与计算', range: '27–35 章', status: 'plan', statusLabel: '规划中', desc: '为计算机、AI、密码学和优化提供离散语言：逻辑与集合、组合、图论、算法、自动机、可计算性、代数结构、密码学与编码理论。' },
  { n: '卷四', title: '概率统计与信息', range: '36–42 章', status: 'plan', statusLabel: '规划中', desc: '在不确定世界里做推断和决策：概率进阶、随机过程、统计推断、贝叶斯统计、信息论、学习理论与因果推断。' },
  { n: '卷五', title: '应用 AI 与前沿', range: '43–65 章 · 含 AI for Math', status: 'plan', statusLabel: '规划中', desc: '把数学变成理解和使用现代智能系统的工具：优化、深度学习、Transformer、生成模型、强化学习、可信 AI 等前沿章。' },
];

/* ---- 由图谱数据实时聚合的全站章节/统计（避免首页文案随课程增长过期） ---- */

export function volumeOf(ch) {
  if (ch < 18) return 0;
  if (ch <= 26) return 1;
  if (ch <= 35) return 2;
  if (ch <= 42) return 3;
  return 4;
}

const CH_TITLES = new Map([
  [0, 'Python 工具箱'], [18, '数学语言与证明'], [19, '实分析'],
  [20, '多元微积分'], [21, '线性代数进阶'], [22, 'ODE 与动力系统'],
  [23, '偏微分方程入门'], [24, '复分析'], [25, '测度论'], [26, '泛函分析'],
  [27, '逻辑与集合'], [28, '组合数学'], [29, '图论'], [30, '算法与数据结构数学'],
  [31, '形式语言与自动机'], [32, '可计算性与复杂度'], [33, '代数结构'],
  [34, '密码学'], [35, '编码理论'], [36, '概率论进阶'],
  [37, '随机过程'], [38, '统计推断与实验设计'], [39, '贝叶斯统计'],
  [40, '信息论'], [41, '学习理论'], [42, '因果推断'], [43, '优化'],
  [44, '数值分析'], [45, '机器学习数学'], [46, '深度学习'], [47, 'Transformer'],
  [48, '表示与嵌入'], [49, '生成模型'], [50, '强化学习'], [51, '博弈论'],
  [52, '控制理论'], [53, '图与网络'], [54, '可信 AI'], [55, '科学计算 ML'],
  [56, 'AI for Math'], [57, '微分几何'], [58, '拓扑与数据几何'],
  [59, '量子信息'], [60, '工程控制论'], [61, '数字信号处理'],
  [62, '通信系统'], [63, '无线电'], [64, '计算机图形学'], [65, '机器人运动'],
]);

const CH_SHORT = new Map([
  [18, '数学语言'], [19, '实分析'], [20, '多元微积分'], [21, '线代进阶'],
  [22, '常微分方程'], [23, '偏微分方程入门'], [24, '复分析'], [25, '测度论'],
  [26, '泛函分析'], [27, '逻辑集合'], [28, '组合'], [29, '图论'], [30, '算法'],
  [31, '自动机'], [32, '可计算性'], [33, '代数结构'], [34, '密码学'],
  [35, '编码理论'], [36, '概率进阶'], [37, '随机过程'], [38, '统计推断'],
  [39, '贝叶斯'], [40, '信息论'], [41, '学习理论'], [42, '因果推断'],
  [43, '优化'], [44, '数值分析'], [45, 'ML 数学'], [46, '深度学习'],
  [47, 'Transformer'], [48, '嵌入几何'], [49, '生成模型'], [50, '强化学习'],
  [51, '博弈论'], [52, '控制'], [53, '图网络'], [54, '可信 AI'],
  [55, '科学 ML'], [56, 'AI for Math'], [58, '拓扑数据'], [60, '工程控制'],
]);

/* 全部已开课的章（图谱数据里有正式课的章），按卷分组返回 */
export function allChapterGroups() {
  const byCh = new Map();
  NODES.forEach((node) => {
    if (!byCh.has(node.ch)) {
      const info = CHAPTERS.find((c) => Number(c.n) === node.ch);
      const dir = node.to.split('/').slice(0, 3).join('/');
      const volDone = node.ch < 18;
      const title = info ? info.title : (CH_TITLES.get(node.ch) || `${node.ch} 章`);
      byCh.set(node.ch, {
        n: node.ch,
        title,
        short: info ? info.short : (CH_SHORT.get(node.ch) || title),
        to: dir + '/',
        count: 0,
        volume: volumeOf(node.ch),
        done: volDone,
      });
    }
    byCh.get(node.ch).count += 1;
  });
  const groups = VOLUMES.map((v, vi) => ({ ...v, index: vi, chapters: [] }));
  [...byCh.values()].sort((a, b) => a.n - b.n).forEach((ch) => groups[ch.volume].chapters.push(ch));
  groups.forEach((g) => {
    g.lessonCount = g.chapters.reduce((s, c) => s + c.count, 0);
    g.rangeLabel = `${g.chapters.length} 章 · ${g.lessonCount} 课`;
    if (g.status === 'done') g.range = g.rangeLabel;
    else g.range = `${g.range} · 已开课 ${g.rangeLabel}`;
  });
  return groups;
}

export function siteStats() {
  const chapters = new Set(NODES.map((n) => n.ch));
  const tools = new Set(NODES.flatMap((n) => n.born));
  return {
    lessons: NODES.length,
    chapters: chapters.size,
    edges: EDGES.length,
    maxDepth: Math.max(...DEPTH),
    tools: tools.size,
    toolFlows: USE_AGG.length,
  };
}
