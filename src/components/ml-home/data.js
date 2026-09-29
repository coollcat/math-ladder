/* 扩展名写全：Docusaurus 两种都认，写全了 node 也能直接 import
   （.tmp-audit / 单测脚本要用它算章清单，见 ringLayout.js 的头注释）。
   ------------------------------------------------------------------------
   2026-09-29 章节信息去重：本文件此前是**章节名的第二份手抄**——
     · CHAPTER_META 手写第 0–16 章的 title/short/desc/tools；
     · CH_TITLES 手写第 18–78 章的正式标题；CH_SHORT 又手写一遍短名。
   三张表都要跟着 docs 走，改课改名时必漏（66/67 章就漏过，图谱 tooltip
   退化成「66 章」；第 1–16 章的短名还只有 CHAPTER_META 有）。
   现在 title / short / volume / 课数 全部来自生成数据 CHAPTER_INFO
   （源头是各章 index.md 的 front matter，脚本 scripts/gen-graph.mjs），
   本文件只保留**只在首页出现的教学说明文案**（卷一各章的 desc / tools）
   与卷册级介绍（VOLUMES）——那是 UI 文案，不是章节元数据。
   改了章名忘了跑生成器？scripts/check-chapter-sync.mjs 会拦下来。 */
import { NODES, EDGES, DEPTH, USE_AGG, CHAPTER_INFO } from './full-graph-data.js';

/* 卷一各章的介绍语与代表工具：纯首页文案，不参与任何同步口径。
   章名与短名不在这里写——去各章 index.md 的 front matter 改。 */
const VOL1_PROSE = {
  0: { desc: '变量、循环、函数与画图——第一卷的登山杖。', tools: 'sum · matplotlib · random' },
  1: { desc: '加减乘除、负数与运算优先级，一切的地基。', tools: '分配律矩形 · 发糖余数机' },
  2: { desc: '除法的另一种写法，数轴上的缝隙被填满。', tools: '分数圆盘 · 符号翻转台' },
  3: { desc: '连乘的记号，以及它的两个逆操作。', tools: 'math.sqrt · math.log · 二分求 √2' },
  4: { desc: '字母登场：式子可化简，未知数站到台前。', tools: '天平 balance · 判别式三态' },
  5: { desc: '角度、勾股与圆周率——给公式一张看得见的脸。', tools: 'math.hypot · math.pi · 勾股方块' },
  6: { desc: '数学的核心语言：机器、曲线与变换三件事。', tools: 'fit 拟合 · floor/ceil · 反函数镜像' },
  7: { desc: '单位圆上转圈：波的语言从此开始。', tools: 'math.sin/cos/tau · 单位圆 · 拍频' },
  8: { desc: '一格一格的数学，和无穷步的通行证。', tools: '多米诺 · 斐波那契螺方 · Σ 记号' },
  9: { desc: '不确定性也能精确研究。', tools: 'coinlaw 大数定律 · statdots · statistics' },
  10: { desc: '素数、余数与密码学的地基。', tools: '同余时钟 · 素数筛 · math.gcd' },
  11: { desc: '会算术的几何：向量、矩阵与正交。', tools: '矩阵变形机 · 点积投影 · 基变换' },
  12: { desc: '升维钥匙与最美的公式。', tools: 'math.e/exp · 复平面 · 乘法即旋转' },
  13: { desc: '变化率的科学：割线一步步贴成切线。', tools: '割线收敛器 · 链式法则' },
  14: { desc: '面积的语言：分割、求和、取极限。', tools: '黎曼和 · FTC 双面板' },
  15: { desc: '无穷个数的和，与用多项式逼近一切。', tools: 'taylor 逼近机 · 手搓 sin/cos/exp' },
  16: { desc: '信号与变换枢纽：任何波都是正弦的和。', tools: '正交性实验 · 吉布斯 · 手搓 DFT' },
};

/* 全部已开课的章（与图谱、知识树同口径：78 章，不含第 17 章导览章）。
   n 保留两位字符串是历史约定（首页与旧版图谱按 '00'/'01' 取键）。 */
export const CHAPTERS = CHAPTER_INFO.map((chapter) => {
  const prose = VOL1_PROSE[chapter.n] || { desc: '', tools: '' };
  return {
    n: String(chapter.n).padStart(2, '0'),
    num: chapter.n,
    title: chapter.title,
    short: chapter.short,
    to: chapter.to,
    dir: chapter.dir,
    volume: chapter.volume,
    count: chapter.lessons,
    desc: prose.desc,
    tools: prose.tools,
  };
});

export const EXTRA_EDGES = [[5, 7], [7, 12], [10, 12], [11, 16], [14, 16]];

export const VOLUMES = [
  { n: '卷一', title: '数学地基', range: '00–16 章', status: 'done', statusLabel: '已成稿', desc: '地基层与第一段主线的完整地基：从数量直觉一路长出函数、微积分、级数与傅里叶枢纽站——全部可交互、可运行，工具都有出生证明。' },
  { n: '卷二', title: '高等数学核心', range: '18–26 章', status: 'done', statusLabel: '已成稿', desc: '从计算工具走向严格数学结构：数学语言与证明、实分析、多元微积分、线代进阶、微分方程、复分析、测度论与泛函分析——回答「为什么成立」。' },
  { n: '卷三', title: '离散数学与计算', range: '27–35 章', status: 'done', statusLabel: '已成稿', desc: '为计算机、AI、密码学和优化提供离散语言：逻辑与集合、组合、图论、算法、自动机、可计算性、代数结构、密码学与编码理论。' },
  { n: '卷四', title: '概率统计与信息', range: '36–42 章', status: 'done', statusLabel: '已成稿', desc: '在不确定世界里做推断和决策：概率进阶、随机过程、统计推断、贝叶斯统计、信息论、学习理论与因果推断。' },
  { n: '卷五', title: '应用 AI 与前沿', range: '43–67 章 · 含 AI for Math', status: 'done', statusLabel: '已成稿', desc: '把数学变成理解和使用现代智能系统的工具：优化、深度学习、Transformer、生成模型、强化学习、可信 AI、随机分析、范畴论等前沿章。' },
  { n: '卷六', title: '工程与系统', range: '68–75 章', status: 'done', statusLabel: '已成稿', desc: '前五卷回答「数学是什么」，卷六回答「数学在真实机器里怎么落地」。按依赖拓扑编排：电（68 电子电路）→ 算（69 数字系统、70 计算机系统）→ 机（71 机械工程、72 机电系统）→ 声（73 音频声学、74 语音音频）→ 画（75 图像视频）——只引用、不发明新数学的落地卷。' },
  { n: '卷七', title: '物理与前沿交叉', range: '76–78 章', status: 'done', statusLabel: '已成稿', desc: '把前六卷的数学搬到物理与神经科学的主战场：76 狭义相对论与时空几何（洛伦兹变换、闵可夫斯基度量、四动量与 E=mc²）、77 哈密顿力学与对称性（勒让德变换、正则方程、相空间、泊松括号、诺特定理与辛积分）、78 脑机接口的数学（脉冲编码、贝叶斯与卡尔曼解码、CSP 与 SPD 流形、闭环刺激）——每一件工具都能追回它在前六卷的出生地。' },
];

/* ---- 由图谱数据实时聚合的全站章节/统计（避免首页文案随课程增长过期） ---- */

const VOLUME_OF = new Map(CHAPTER_INFO.map((chapter) => [chapter.n, chapter.volume]));

/** 章号 → 卷下标（0 起，与 VOLUMES 数组对齐）。卷号由生成数据给出，不再手写区间。 */
export function volumeOf(ch) {
  const v = VOLUME_OF.get(Number(ch));
  return v ? v - 1 : 0;
}

/* 全部已开课的章（图谱数据里有正式课的章），按卷分组返回 */
export function allChapterGroups() {
  const groups = VOLUMES.map((v, vi) => ({ ...v, index: vi, chapters: [] }));
  CHAPTER_INFO.forEach((chapter) => {
    const group = groups[chapter.volume - 1];
    if (!group) return; /* 卷号越界：宁可少一章，也不让整页崩掉 */
    group.chapters.push({
      n: chapter.n,
      title: chapter.title,
      short: chapter.short,
      to: chapter.to,
      dir: chapter.dir,
      count: chapter.lessons,
      volume: chapter.volume - 1,
      done: true,
    });
  });
  groups.forEach((g) => {
    g.lessonCount = g.chapters.reduce((sum, c) => sum + c.count, 0);
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
