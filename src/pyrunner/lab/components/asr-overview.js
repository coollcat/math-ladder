/* =========================================================================
 * lab 组件：asr-overview（语音识别三代路线同屏对比）
 * -------------------------------------------------------------------------
 * 演示什么
 *   同一段内置示例语音（合成的「你好」，约 1 秒，见下「数据怎么来的」），
 *   三代识别架构各自怎么吃掉它：
 *     · 一代 HMM+GMM（1990s）：分帧 → MFCC → GMM 逐帧打分 → HMM 维特比
 *       对齐 → 词典 + 语言模型 → 文本。约 10⁶ 参数。
 *     · 二代 CTC/RNN-T（2015s）：分帧 → FBank → 深度网络逐帧出 token 分布
 *       → CTC 坍缩（去重 + 删空白符）→ 文本。约 10⁸ 参数。
 *     · 三代 端到端 Transformer（2020s）：特征 → 编码器自注意力（词与词
 *       直接对上眼）→ 解码器逐 token 生成。约 10⁹ 参数。
 *
 *   每一代是一条流程，**流程上每个框都能点**：点开看这一级真正的中间结果
 *   （MFCC 热图、GMM 逐帧似然曲线、CTC 概率热图与坍缩路径、注意力矩阵、
 *   解码器逐 token 置信度）——中间结果全部由内置音频现算，不是贴图。
 *
 * 能玩什么
 *   · 分段按钮切三代：流程图与解释整体切换；
 *   · 点流程图上的任意一个框：下方展示该级的中间结果；
 *   · **拖时间光标**（波形条上或任意热图里左右拖）：每一级视图都跟着高亮
 *     当前帧正在发生什么；
 *   · 读数条显示当前代 / 阶段 / 时刻 / 识别输出 / 参数量级。
 *
 * 用法（在 .md 里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "asr-overview",
 *     "title": "切到二代，点「CTC 坍缩」，看空白符是怎么把帧对齐成字的"
 *   }
 *   ```
 *
 * spec 字段（全部可省，省了用默认值）
 *   height  画布高度（像素），默认 450
 *
 * 出声：否（本组件只看不听；要听合成请看 tts-overview）。
 * 引擎：dsp（mfcc）。
 * 数据怎么来的（重要，别当真实系统读）
 *   · 语音是内置的「源-滤波器」合成品：5 个音素段 n-i-h-a-o，脉冲串 +
 *     噪声过三个时变谐振器，音素边界是写死的常量。
 *   · 特征 = dsp.mfcc（32 ms 窗 / 10 ms 帧移，12 维，去 c0）。
 *   · 「GMM」= 每个音素拿自己真实帧的均值/方差当一组高斯参数，逐帧算
 *     似然再归一化——量级和形状对，但不是训练出来的模型。
 *   · 「CTC 分布」= 空白符概率 + 音素似然的混合，逐帧归一化；贪心路径
 *     去重删空白后得到 "nihao"。
 *   · 「注意力矩阵」= 同音素内部高斯邻近 + 跨段弱连接，按行归一化的
 *     示意头，不是真实注意力权重。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildReadout,
  engine, label, clamp, fmt,
} from '../core.js';

const FS = 16000;
const FRAME = 512;
const HOP = 160;
const TAIL = 0.18;

/* 音素段：d 时长秒 / F 三个共振峰目标 / type 声源类型 / ch CTC 的 token / zh 汉字 */
const SEG = [
  { ph: 'n', type: 'nasal', F: [280, 1500, 2600], d: 0.09, ch: 'n', zh: '你' },
  { ph: 'i', type: 'vowel', F: [320, 2300, 3000], d: 0.22, ch: 'i', zh: '你' },
  { ph: 'h', type: 'fric',  F: [500, 1500, 2500], d: 0.09, ch: 'h', zh: '好' },
  { ph: 'a', type: 'vowel', F: [730, 1150, 2600], d: 0.24, ch: 'a', zh: '好' },
  { ph: 'o', type: 'vowel', F: [520, 900, 2450],  d: 0.18, ch: 'o', zh: '好' },
];
const TOTAL = SEG.reduce((a, s) => a + s.d, 0) + TAIL;
const TRANS = 0.03;
const TOKENS = ['⊔', 'n', 'i', 'h', 'a', 'o'];

const GENS = [
  {
    label: '① HMM+GMM（1990s）',
    stages: ['分帧+MFCC', 'GMM 打分', 'HMM 对齐', '词典+语言模型'],
    params: '约 10⁶ 参数',
    cap: ['前端：32ms 窗、10ms 帧移的 MFCC（12 维，去 c0）',
      'GMM：每个音素一组高斯，给每一帧打「像谁」的分',
      'HMM：状态必须从左往右走，维特比找出最优状态序列',
      '词典 + 3-gram 语言模型：把音素串翻成字，纠同音错'],
  },
  {
    label: '② CTC / RNN-T（2015s）',
    stages: ['分帧+FBank', '深度网络', 'CTC 坍缩', '解码输出'],
    params: '约 10⁸ 参数',
    cap: ['前端：FBank / MFCC，人工特征仍是主角',
      '深度网络（LSTM/TCN）：逐帧输出「token 或 ⊔」的概率分布',
      'CTC 坍缩：贪心取每帧最可能 token → 去重 → 删空白符 ⊔',
      '解码：束搜索 + 简单语言模型打分'],
  },
  {
    label: '③ 端到端 Transformer（2020s）',
    stages: ['特征前端', '编码器', '注意力对齐', '解码器输出'],
    params: '约 10⁹ 参数',
    cap: ['前端：FBank / 原始波形 patch，特征也交给模型学',
      '编码器：几十层自注意力，每帧都能看到全部帧',
      '注意力：字与帧直接软对齐（这里画一层示意头）',
      '解码器：逐 token 自回归生成，概率一路都很高'],
  },
];
const OUTPUTS = [
  { text: '你好', score: 0.87, alts: [['尼好', 0.06], ['李豪', 0.04]], note: '同音字靠语言模型纠——GMM 时代最常见的错误形态' },
  { text: 'nihao → 你好', score: 0.93, alts: [['niha → 你好', 0.04], ['nǐ hǎo', 0.02]], note: '端到端到字，无需发音词典' },
  { text: '你好', score: 0.98, alts: [['你好。', 0.01], ['nǐ hǎo', 0.005]], note: '连标点都顺手生成' },
];

function mulberry32(a) {
  return function rnd() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 源-滤波器合成「你好」 ---------- */
function buildWave() {
  const n = Math.round(TOTAL * FS);
  const x = new Float64Array(n);
  const edges = [];
  let acc = 0;
  SEG.forEach((s) => { acc += s.d; edges.push(acc); });

  const F = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  const A = new Float64Array(n);
  const VOICED = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / FS;
    let k = 0;
    while (k < SEG.length - 1 && t > edges[k]) k += 1;
    const seg = SEG[k];
    const t0 = k === 0 ? 0 : edges[k - 1];
    const local = t - t0;
    /* 段首 30ms 从上一段的共振峰滑过来 */
    const u = (k > 0 && local < TRANS) ? 0.5 * (1 - local / TRANS) : 0;
    const prev = SEG[Math.max(0, k - 1)];
    for (let j = 0; j < 3; j += 1) {
      F[j][i] = seg.F[j] + (prev.F[j] - seg.F[j]) * u;
    }
    const env = Math.min(1, Math.sin((Math.PI * clamp(local / seg.d, 0, 1)) * 1.6));
    A[i] = seg.type === 'fric' ? 0.4 * env : env;
    VOICED[i] = seg.type === 'fric' ? 0 : 1;
  }

  const rnd = mulberry32(715);
  let ph = 0;
  const src = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    if (!VOICED[i]) { src[i] = (rnd() * 2 - 1) * 0.6; continue; }
    const f0 = 145 * (1 + 0.06 * Math.sin((2 * Math.PI * 1.3 * i) / n));
    ph += f0 / FS;
    if (ph >= 1) ph -= 1;
    src[i] = ph < 0.4 ? 0.5 * (1 - Math.cos((2 * Math.PI * ph) / 0.4)) - 0.2 : -0.2;
  }
  /* 三个时变谐振器 */
  let y = src;
  for (let k = 0; k < 3; k += 1) {
    const out = new Float64Array(n);
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < n; i += 1) {
      const r = Math.exp((-Math.PI * (k === 0 ? 80 : 120)) / FS);
      const c = 2 * r * Math.cos((2 * Math.PI * F[k][i]) / FS);
      const v = y[i] + c * y1 - r * r * y2;
      out[i] = v;
      y2 = y1;
      y1 = v;
    }
    y = out;
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) { y[i] *= A[i]; peak = Math.max(peak, Math.abs(y[i])); }
  if (peak > 0) for (let i = 0; i < n; i += 1) y[i] = (y[i] / peak) * 0.85;
  return y;
}

/* ---------- 主数据（dsp 载入后一次性算齐） ---------- */
let wave = null;
let feat = [];
let framePh = [];
let gmm = [];
let like = [];       // like[f][p] 归一化似然
let ctc = [];        // ctc[f][tok]
let greedy = [];     // 每帧 argmax token
let ctext = '';      // 坍缩结果
let attn = [];       // attn[f][g]
let nF = 0;

function frameTime(f) { return (f * HOP + FRAME / 2) / FS; }

function computeAll(m) {
  wave = buildWave();
  const raw = m.mfcc(wave, { fs: FS, frameLen: FRAME, hop: HOP, nFilters: 26, nCeps: 13 });
  feat = raw.map((v) => Float64Array.from(v.slice(1)));
  nF = feat.length;
  const D = 12;

  /* 帧 → 音素真值 */
  const edges = [];
  let acc = 0;
  SEG.forEach((s) => { acc += s.d; edges.push(acc); });
  framePh = feat.map((_, f) => {
    const t = frameTime(f);
    let k = 0;
    while (k < SEG.length - 1 && t > edges[k]) k += 1;
    return k;
  });

  /* 每个音素一组「高斯」（均值/方差取自自己的真实帧） */
  gmm = SEG.map((_, p) => {
    const mine = feat.filter((_, f) => framePh[f] === p);
    const c = new Float64Array(D);
    const v = new Float64Array(D);
    if (mine.length) {
      mine.forEach((x) => { for (let d = 0; d < D; d += 1) c[d] += x[d] / mine.length; });
      mine.forEach((x) => { for (let d = 0; d < D; d += 1) v[d] += (x[d] - c[d]) ** 2 / mine.length; });
    }
    let vmean = 0;
    for (let d = 0; d < D; d += 1) vmean += v[d] / D;
    for (let d = 0; d < D; d += 1) v[d] = Math.max(v[d], vmean * 0.25, 1e-3);
    return { c, v };
  });

  /* 逐帧似然 → 归一化 */
  like = feat.map((x) => {
    const l = SEG.map((_, p) => {
      let s = 0;
      for (let d = 0; d < D; d += 1) s -= ((x[d] - gmm[p].c[d]) ** 2) / (2 * gmm[p].v[d]);
      return Math.exp(s);
    });
    const sum = l.reduce((a, b) => a + b, 0) || 1;
    return l.map((v) => v / sum);
  });

  /* CTC 分布：空白符为主，音素按似然分 */
  ctc = like.map((l) => {
    const mx = Math.max(...l);
    const pBlank = 0.35 + 0.5 * (1 - mx);
    const row = [pBlank];
    l.forEach((v) => row.push((1 - pBlank) * v));
    return row;
  });
  greedy = ctc.map((row) => row.reduce((bi, v, i) => (v > row[bi] ? i : bi), 0));
  const collapsed = [];
  greedy.forEach((t) => {
    if (t === 0) return;
    if (collapsed[collapsed.length - 1] !== t) collapsed.push(t);
  });
  ctext = collapsed.map((t) => TOKENS[t]).join('');

  /* 注意力（示意头）：同音素内高斯邻近 + 跨段弱连接，行归一化 */
  const segLen = SEG.map((s) => Math.max(3, s.d / (HOP / FS)));
  attn = feat.map((_, f) => {
    const row = new Float64Array(nF);
    const p = framePh[f];
    const sig = Math.max(2, segLen[p] / 3);
    for (let g = 0; g < nF; g += 1) {
      const near = Math.exp(-((f - g) ** 2) / (2 * sig * sig));
      row[g] = (framePh[g] === p ? 0.9 : 0.18) * near + 0.02;
    }
    const sum = row.reduce((a, b) => a + b, 0) || 1;
    for (let g = 0; g < nF; g += 1) row[g] /= sum;
    return row;
  });
}

export default function render(host, spec) {
  let gen = 0;
  let stage = 0;
  let curF = 0;

  const cv = setupCanvas(host, spec.height || 450);

  const segCtl = buildSegmented(
    GENS.map((g, i) => ({ label: g.label, value: i })),
    gen,
    (v) => { gen = v; stage = 0; draw(); },
  );
  host.appendChild(segCtl);

  const ro = buildReadout({
    代: '—', 阶段: '—', 时刻: '—', 帧: '—', 输出: '—', 量级: '—',
  });
  host.appendChild(ro.box);

  let geom = null;

  /* ---------- 热图 ---------- */
  function heat(ctx, x, y, w, h, mat, nR, nC, color, cursor) {
    const cw = w / nC;
    const ch = h / nR;
    for (let r = 0; r < nR; r += 1) {
      for (let c = 0; c < nC; c += 1) {
        const t = mat[r][c];
        ctx.globalAlpha = 0.05 + 0.9 * clamp(t, 0, 1);
        ctx.fillStyle = color;
        ctx.fillRect(x + c * cw, y + r * ch, cw + 0.6, ch + 0.6);
      }
    }
    ctx.globalAlpha = 1;
    if (cursor >= 0 && cursor < nC) {
      ctx.strokeStyle = C_bad(ctx);
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x + cursor * cw, y - 1, Math.max(1.5, cw), h + 2);
    }
  }
  let C_bad = () => '#d44';

  function drawDetail(ctx, g, W, H, C) {
    const x0 = 48;
    const x1 = W - 12;
    const FX = (f) => x0 + ((f + 0.5) / nF) * (x1 - x0);
    const cap = GENS[gen].cap[stage];
    label(ctx, cap, 10, g.detY + 14, C.fg, { size: 10.5, weight: 600 });

    if (stage === 0) {
      /* MFCC 热图：12 维 × 帧 */
      const y0 = g.detY + 24;
      const h = H - y0 - 30;
      const mat = [];
      for (let d = 0; d < 12; d += 1) {
        const col = feat.map((x) => x[d]);
        const mn = Math.min(...col);
        const mx = Math.max(...col);
        mat.push(col.map((v) => (mx - mn ? (v - mn) / (mx - mn) : 0.5)));
      }
      heat(ctx, x0, y0, x1 - x0, h, mat, 12, nF, C.accent, curF);
      label(ctx, 'c1..c12', 42, y0 + 10, C.axis, { align: 'right', size: 9 });
      [0, 0.5, 1].forEach((u) => label(ctx, fmt(u * TOTAL, 2) + 's', x0 + u * (x1 - x0), H - 12, C.axis,
        { align: 'center', size: 9 }));
      label(ctx, '冷色=低 暖色=高（每维各自归一化）　红框 = 当前帧', x0 + 4, y0 - 4, C.axis, { size: 9 });
      return;
    }

    if (stage === 1) {
      /* 逐帧打分曲线 */
      const y0 = g.detY + 30;
      const h = H - y0 - 32;
      const Y = (v) => y0 + h - clamp(v, 0, 1) * h;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x0, y0, x1 - x0, h);
      if (gen === 0) {
        like[0].forEach((_, p) => {
          const pts = [];
          for (let f = 0; f < nF; f += 1) pts.push([FX(f), Y(like[f][p])]);
          ctx.strokeStyle = C.series(p);
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
          ctx.stroke();
          label(ctx, SEG[p].ch, x1 - 18 - p * 22, y0 + 12, C.series(p), { size: 11, weight: 700 });
        });
        label(ctx, '每条线 = 一帧属于该音素的 GMM 似然（归一化）', x0 + 4, H - 14, C.axis, { size: 9 });
      } else {
        const pts = [];
        for (let f = 0; f < nF; f += 1) pts.push([FX(f), Y(Math.max(...ctc[f].slice(1)))]);
        ctx.strokeStyle = C.named('teal');
        ctx.lineWidth = 2;
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        const pb = [];
        for (let f = 0; f < nF; f += 1) pb.push([FX(f), Y(ctc[f][0])]);
        ctx.strokeStyle = C.axis;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        pb.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        ctx.setLineDash([]);
        label(ctx, gen === 1 ? '青实线 = 网络给出的最强音素概率　灰虚线 = 空白符 ⊔ 概率' : '青实线 = 编码器逐帧置信度（示意）　灰虚线 = 空白符概率',
          x0 + 4, H - 14, C.axis, { size: 9 });
      }
      const cx = FX(clamp(curF, 0, nF - 1));
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, y0);
      ctx.lineTo(cx, y0 + h);
      ctx.stroke();
      return;
    }

    if (stage === 2) {
      const y0 = g.detY + 26;
      if (gen === 0) {
        /* HMM 状态带 */
        const h = 30;
        for (let f = 0; f < nF; f += 1) {
          ctx.fillStyle = C.series(framePh[f]);
          ctx.globalAlpha = 0.85;
          ctx.fillRect(FX(f) - (x1 - x0) / nF / 2, y0, (x1 - x0) / nF + 0.5, h);
          ctx.globalAlpha = 1;
        }
        let accT = 0;
        let prevX = x0;
        SEG.forEach((sg, i) => {
          accT += sg.d;
          const bx = x0 + (accT / TOTAL) * (x1 - x0);
          ctx.strokeStyle = C.bg;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx, y0 - 3);
          ctx.lineTo(bx, y0 + h + 3);
          ctx.stroke();
          label(ctx, sg.ch, (prevX + bx) / 2, y0 - 6, C.series(i), { align: 'center', size: 10, weight: 700 });
          prevX = bx;
        });
        label(ctx, '色块 = 维特比路径停在哪个状态（必须从左往右走，不能跳回）', x0, y0 + h + 20, C.axis, { size: 9.5 });
        const cx = FX(clamp(curF, 0, nF - 1));
        ctx.strokeStyle = C.bad;
        ctx.beginPath();
        ctx.moveTo(cx, y0 - 4);
        ctx.lineTo(cx, y0 + h + 4);
        ctx.stroke();
      } else if (gen === 1) {
        /* CTC 热图 */
        const h = 96;
        const mat = TOKENS.map((_, t) => ctc.map((row) => row[t]));
        heat(ctx, x0, y0, x1 - x0, h, mat, TOKENS.length, nF, C.named('teal'), curF);
        TOKENS.forEach((t, i) => label(ctx, t, x0 - 6, y0 + (i + 0.5) * (h / TOKENS.length) + 3,
          t === '⊔' ? C.axis : C.series(i - 1), { align: 'right', size: 10, weight: 700 }));
        /* 贪心路径 */
        ctx.fillStyle = C.bad;
        for (let f = 0; f < nF; f += 1) {
          ctx.beginPath();
          ctx.arc(FX(f), y0 + (greedy[f] + 0.5) * (h / TOKENS.length), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, '红点 = 每帧贪心选中的 token → 去重 → 删 ⊔ → 「' + ctext + '」→ 你好',
          x0, y0 + h + 20, C.axis, { size: 9.5 });
      } else {
        /* 注意力矩阵 */
        const sz = Math.min(x1 - x0, H - y0 - 40);
        heat(ctx, x0, y0, sz, sz, attn, nF, nF, C.named('purple'), -1);
        const cx = FX(clamp(curF, 0, nF - 1));
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + (curF / nF) * sz);
        ctx.lineTo(x0 + sz, y0 + (curF / nF) * sz);
        ctx.stroke();
        label(ctx, '行 = 当前帧在看谁（亮块 = 同一音素内部互相看见）', x0, y0 + sz + 16, C.axis, { size: 9.5 });
        label(ctx, '拖光标换查询帧', x0 + sz + 6, y0 + sz / 2, C.bad, { size: 9.5 });
      }
      return;
    }

    /* stage 3：输出 */
    const out = OUTPUTS[gen];
    const y0 = g.detY + 34;
    label(ctx, '识别输出：', 10, y0, C.fg, { size: 12, weight: 700 });
    label(ctx, out.text, 96, y0 + 2, C.ok, { size: 20, weight: 700 });
    label(ctx, '置信度 ' + fmt(out.score * 100, 0) + '%', 96 + ctx.measureText(out.text).width * 2.2 + 110, y0,
      C.axis, { size: 10 });
    out.alts.forEach(([t, p], i) => {
      const yy = y0 + 26 + i * 20;
      label(ctx, t, 96, yy, C.axis, { size: 11 });
      ctx.fillStyle = C.soft;
      ctx.fillRect(150, yy - 9, 180 * p * 8, 12);
      label(ctx, fmt(p * 100, 1) + '%', 340, yy, C.axis, { size: 9.5 });
    });
    label(ctx, out.note, 10, y0 + 26 + out.alts.length * 20 + 18, C.fg, { size: 10 });
    if (gen === 2) {
      label(ctx, '解码器逐 token 概率：<zh> 0.99 · 你 0.98 · 好 0.99 · </s> 0.99 —— 全程自信',
        10, y0 + 26 + out.alts.length * 20 + 36, C.named('purple'), { size: 10 });
    }
  }

  function draw() {
    const C = themeColors();
    C_bad = () => C.bad;
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (!wave || !nF) {
      label(ctx, '正在载入 dsp 引擎并合成示例语音…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* ---- 流程框 ---- */
    const stages = GENS[gen].stages;
    const bw = (W - 16) / stages.length;
    stages.forEach((t, i) => {
      const x = 8 + i * bw;
      const on = i === stage;
      ctx.fillStyle = on ? C.accent : C.soft;
      ctx.strokeStyle = on ? C.accent : C.grid;
      ctx.lineWidth = on ? 2 : 1;
      ctx.fillRect(x + 2, 8, bw - 10, 34);
      ctx.strokeRect(x + 2.5, 8.5, bw - 11, 33);
      label(ctx, t, x + 2 + (bw - 10) / 2, 28, on ? '#fff' : C.fg, { align: 'center', size: 11, weight: on ? 700 : 400 });
      if (i < stages.length - 1) label(ctx, '→', x + bw - 7, 28, C.axis, { align: 'center', size: 12 });
    });

    /* ---- 波形条（共享的「同一段音频」） ---- */
    const wY = 56;
    const wH = 52;
    label(ctx, '同一段内置示例语音（红框 = 当前帧，可拖）', 10, wY - 2, C.axis, { size: 9.5 });
    const stride = Math.max(1, Math.floor(wave.length / W));
    ctx.strokeStyle = C.series(0);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0, px = 0; i < wave.length; i += stride, px += 1) {
      const py = wY + 14 + wH / 2 - wave[i] * (wH / 2) * 0.9;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    /* 音素边界刻度 */
    let accT = 0;
    SEG.forEach((s, i) => {
      accT += s.d;
      const bx = (accT / TOTAL) * W;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(bx, wY + 10);
      ctx.lineTo(bx, wY + 14 + wH);
      ctx.stroke();
      label(ctx, s.ch, bx - (s.d / 2 / TOTAL) * W, wY + 14 + wH + 12, C.series(i),
        { align: 'center', size: 10, weight: 700 });
    });
    curF = clamp(curF, 0, nF - 1);
    const cx = (frameTime(curF) / TOTAL) * W;
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(cx - 2, wY + 8, 4, wH + 4);

    geom = { detY: wY + 14 + wH + 20 };
    drawDetail(ctx, geom, W, H, C);

    ro.set('代', GENS[gen].label);
    ro.set('阶段', (stage + 1) + '/4 · ' + stages[stage] + '（点框切换）');
    ro.set('时刻', fmt(frameTime(curF), 2) + ' s');
    ro.set('帧', '#' + curF + ' / ' + nF);
    ro.set('输出', OUTPUTS[gen].text + '（' + fmt(OUTPUTS[gen].score * 100, 0) + '%）');
    ro.set('量级', GENS[gen].params);
  }

  /* ---------- 拖拽：时间光标 + 点流程框 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geom) return null;
      if (y <= 46) return 'stage';
      if (y >= 50 && y <= geom.detY - 4) return 'cur';
      return 'cur';
    },
    down(id, x) {
      if (id === 'stage') {
        const bw = (cv.W - 16) / 4;
        const i = clamp(Math.floor((x - 8) / bw), 0, 3);
        stage = i;
        draw();
      } else moveCur(x);
    },
    move(id, x) {
      if (id === 'cur') moveCur(x);
    },
    up() { },
  });

  function moveCur(x) {
    const t = clamp(x / cv.W, 0, 1) * TOTAL;
    curF = clamp(Math.round((t * FS - FRAME / 2) / HOP), 0, nF - 1);
    draw();
  }

  draw();
  cv.redraw = draw;
  engine('dsp').then((m) => {
    computeAll(m);
    draw();
  }).catch(() => { void 0; });

  return { };
}
