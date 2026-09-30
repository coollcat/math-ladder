/* =========================================================================
 * lab 组件：tts-overview（语音合成流水线：文本 → 特征 → 梅尔谱 → 波形）
 * -------------------------------------------------------------------------
 * 演示什么
 *   TTS 就是把 ASR 倒过来走。四个阶段，每个都能点开看中间结果：
 *     ① 文本 → 拼音：查词典（真实系统用 G2P 模型），得到声母/韵母/声调；
 *     ② 语言学特征：音素时间轴 + 基频 F0 曲线（韵律模型的输出，
 *        这里由「音调」「语速」两个滑块直接控制）；
 *     ③ 声学特征：40 维梅尔谱热图——**由合成出来的波形现算**（真实
 *        声学模型要预测的就是这口锅）；
 *     ④ 波形·试听：源-滤波「教具声码器」把波形画出来，点 ▶ 播放能听
 *        （音量默认 0.2）。
 *
 *   必须玩出来的两件事：
 *     · 拖「音调」滑块：梅尔谱整体上下平移（F0 变了），波形疏密跟着变；
 *     · 拖「语速」：音素被拉伸/压缩，梅尔谱横向伸缩——声学特征对时长的
 *       敏感，就是「时长模型」存在的原因。
 *
 * 用法（在 .md 里写 ```lab 围栏）
 *
 *   ```lab
 *   {
 *     "type": "tts-overview",
 *     "title": "把音调拖到 1.5，听一听 F0 对合成结果意味着什么"
 *   }
 *   ```
 *
 * spec 字段（全部可省，省了用默认值）
 *   text    要合成的句子，默认 '你好世界'。内置词典的字：你好世界数学
 *           语音我的爱真的有梯阶趣（其余字当停顿处理）
 *   pitch   初始音调倍率，0.6–1.6，默认 1.0
 *   speed   初始语速倍率，0.6–1.8，默认 1.0
 *   vol     播放音量，0–0.4，默认 0.2
 *   height  画布高度（像素），默认 400
 *
 * 出声：是。走 core.audioShell（▶/■ 按钮、离开视口自动停、默认 0.2）。
 * 引擎：dsp（melFilterbank / rfft / window / powToDb）+ audio（播放）。
 * 口径说明：合成器是「脉冲串/噪声 → 三个时变谐振器」的教具级源-滤波模型，
 * 音素表与声调曲线是写死的常量，不是训练出来的模型——听起来像机器人在
 * 说话，但这恰好能听清每个部件的贡献。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented, buildReadout,
  audioShell, engine, label, clamp, fmt, mulberry32,
  clearBg,
} from '../core.js';

const FS = 16000;
const FRAME = 512;
const HOP = 128;
const NMEL = 40;

/* 内置「词典」：字 → 拼音 / 声母 / 韵母 / 声调 */
const DICT = {
  '你': { py: 'nǐ', init: 'n', fin: 'i', tone: 3 },
  '好': { py: 'hǎo', init: 'h', fin: 'ao', tone: 3 },
  '世': { py: 'shì', init: 'sh', fin: 'i', tone: 4 },
  '界': { py: 'jiè', init: 'j', fin: 'ie', tone: 4 },
  '数': { py: 'shù', init: 'sh', fin: 'u', tone: 4 },
  '学': { py: 'xué', init: 'x', fin: 'e', tone: 2 },
  '语': { py: 'yǔ', init: null, fin: 'u', tone: 3 },
  '音': { py: 'yīn', init: null, fin: 'in', tone: 1 },
  '我': { py: 'wǒ', init: 'w', fin: 'o', tone: 3 },
  '的': { py: 'de', init: 'd', fin: 'e', tone: 0 },
  '爱': { py: 'ài', init: null, fin: 'ai', tone: 4 },
  '真': { py: 'zhēn', init: 'zh', fin: 'en', tone: 1 },
  '有': { py: 'yǒu', init: null, fin: 'ou', tone: 3 },
  '趣': { py: 'qù', init: 'q', fin: 'u', tone: 4 },
  '梯': { py: 'tī', init: 't', fin: 'i', tone: 1 },
  '阶': { py: 'jiē', init: 'j', fin: 'ie', tone: 1 },
};

/* 韵母：起/止共振峰（三列 = F1/F2/F3），nasal 表示带鼻音尾 */
const FIN = {
  a:  { F: [[730, 1090, 2440], [760, 1150, 2500]] },
  o:  { F: [[540, 900, 2450], [470, 820, 2400]] },
  e:  { F: [[530, 1840, 2500], [500, 1900, 2500]] },
  i:  { F: [[320, 2250, 3000], [300, 2300, 3050]] },
  u:  { F: [[340, 900, 2250], [320, 840, 2200]] },
  ai: { F: [[700, 1300, 2600], [420, 2000, 2700]] },
  ao: { F: [[720, 1150, 2600], [480, 880, 2450]] },
  ie: { F: [[420, 2100, 2700], [330, 2300, 3000]] },
  en: { F: [[550, 1700, 2600], [320, 1500, 2500]], nasal: true },
  in: { F: [[330, 2200, 3000], [300, 1900, 2700]], nasal: true },
  ou: { F: [[600, 1100, 2600], [400, 860, 2350]] },
};

/* 声母表：kind 决定声源，sib 是擦音的噪声中心频率，glide 自带共振峰起点 */
const INIT = {
  n:  { kind: 'nasal', F: [280, 1500, 2600] },
  h:  { kind: 'fric', sib: 1300 },
  sh: { kind: 'fric', sib: 2800 },
  x:  { kind: 'fric', sib: 4500 },
  j:  { kind: 'fric', sib: 3500 },
  q:  { kind: 'fric', sib: 3800 },
  zh: { kind: 'fric', sib: 2000 },
  d:  { kind: 'stop' },
  t:  { kind: 'stop' },
  w:  { kind: 'glide', F: [340, 900, 2250] },
  y:  { kind: 'glide', F: [320, 2200, 3000] },
};

/* 声调：F0 倍率随韵母进度 u ∈ 0..1 变化 */
const TONES = {
  1: () => 1.12,
  2: (u) => 0.92 + 0.34 * u,
  3: (u) => 1.02 - 0.34 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.06 * u,
  4: (u) => 1.32 - 0.52 * u,
  0: () => 1.0,
};

const STAGES = ['① 文本→拼音', '② 语言学特征', '③ 梅尔谱', '④ 波形·试听'];

/* ---------- 文本 → 音素段计划 ---------- */
function planText(txt, speed) {
  const segs = [];
  const chars = [];
  let t = 0.05;
  for (const ch of txt) {
    if (!DICT[ch]) { t += 0.12 / speed; continue; }   // 标点/生字 → 停顿
    const c = { ch, ...DICT[ch] };
    chars.push(c);
    const ii = c.init ? INIT[c.init] : null;
    if (ii && ii.kind !== 'glide') {
      const dur = (ii.kind === 'nasal' ? 0.07 : ii.kind === 'fric' ? 0.08 : 0.06) / speed;
      segs.push({ kind: ii.kind, sib: ii.sib || 0, F: ii.F, ch: c, lab: c.init, t0: t, t1: t + dur, voiced: ii.kind === 'nasal' });
      t += dur;
    }
    const f = FIN[c.fin] || FIN.a;
    const dur = (0.24 + (f.nasal ? 0.06 : 0)) / speed;
    segs.push({
      kind: 'vowel', F: f.F[0], F2: f.F[1], nasal: !!f.nasal, tone: c.tone, ch: c, lab: c.py,
      t0: t, t1: t + dur, voiced: true,
      glide: ii && ii.kind === 'glide' ? ii.F : null,
    });
    t += dur + 0.03 / speed;
  }
  return { segs, chars, total: t + 0.08 };
}

/* ---------- 计划 → 波形 + F0 曲线（源-滤波） ---------- */
function synthWave(plan, pitch) {
  const n = Math.ceil(plan.total * FS);
  const F1 = new Float64Array(n);
  const F2 = new Float64Array(n);
  const F3 = new Float64Array(n);
  const A = new Float64Array(n);
  const VOICED = new Uint8Array(n);
  const F0 = new Float64Array(n);
  const rnd = mulberry32(907);

  for (let i = 0; i < n; i += 1) {
    const t = i / FS;
    const seg = plan.segs.find((sg) => t >= sg.t0 && t < sg.t1);
    if (!seg) continue;
    const local = t - seg.t0;
    const dur = seg.t1 - seg.t0;
    const u = clamp(local / dur, 0, 1);
    const env = Math.min(1, Math.sin(Math.PI * clamp(u, 0.02, 0.98)) * 1.4);

    if (seg.kind === 'stop') {
      if (u > 0.55) { A[i] = 0.25 * env; VOICED[i] = 0; F1[i] = 1800; F2[i] = 2600; F3[i] = 3200; }
      continue;
    }
    if (seg.kind === 'fric') {
      A[i] = 0.32 * env;
      VOICED[i] = 0;
      F1[i] = seg.sib; F2[i] = seg.sib * 1.15; F3[i] = seg.sib * 1.4;
      continue;
    }
    /* vowel / nasal：共振峰从起点滑到目标 */
    const base = seg.F;
    const tgt = seg.kind === 'nasal' ? seg.F : seg.F2;
    const k = clamp(local / 0.08, 0, 1);
    for (let j = 0; j < 3; j += 1) {
      let f = base[j] + (tgt[j] - base[j]) * k;
      if (seg.glide) f = seg.glide[j] + (f - seg.glide[j]) * clamp(local / 0.06, 0, 1);
      if (j === 0) F1[i] = f; else if (j === 1) F2[i] = f; else F3[i] = f;
    }
    A[i] = (seg.kind === 'nasal' ? 0.55 : 1) * env;
    VOICED[i] = 1;
    F0[i] = 170 * pitch * (TONES[seg.tone] || TONES[0])(u);
  }

  const src = new Float64Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    if (!VOICED[i]) { src[i] = (rnd() * 2 - 1) * 0.5; continue; }
    ph += F0[i] / FS;
    if (ph >= 1) ph -= 1;
    src[i] = ph < 0.4 ? 0.5 * (1 - Math.cos((2 * Math.PI * ph) / 0.4)) - 0.2 : -0.2;
  }
  let y = src;
  for (let k = 0; k < 3; k += 1) {
    const out = new Float64Array(n);
    let y1 = 0;
    let y2 = 0;
    const Fk = k === 0 ? F1 : (k === 1 ? F2 : F3);
    for (let i = 0; i < n; i += 1) {
      const r = Math.exp((-Math.PI * (k === 0 ? 80 : 120)) / FS);
      const c = 2 * r * Math.cos((2 * Math.PI * Fk[i]) / FS);
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
  return { wave: y, F0, n };
}

/* ---------- 波形 → 梅尔谱（真实的 dsp 链） ---------- */
function melSpectrogram(m, wave) {
  const fb = m.melFilterbank({ nFilters: NMEL, fftSize: FRAME, fs: FS });
  const w = m.window('hann', FRAME);
  const cols = [];
  for (let s0 = 0; s0 + FRAME <= wave.length; s0 += HOP) {
    const seg = new Float64Array(FRAME);
    for (let i = 0; i < FRAME; i += 1) seg[i] = wave[s0 + i] * w[i];
    const { mag } = m.rfft(seg);
    const col = new Float64Array(NMEL);
    for (let mm = 0; mm < NMEL; mm += 1) {
      let e = 0;
      const row = fb[mm];
      for (let k = 0; k < mag.length; k += 1) e += row[k] * mag[k] * mag[k];
      col[mm] = m.powToDb(Math.max(e, 1e-12));
    }
    cols.push(col);
  }
  let mn = Infinity;
  let mx = -Infinity;
  cols.forEach((c) => c.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); }));
  const span = mx - mn || 1;
  return cols.map((c) => Float64Array.from(c, (v) => (v - mn) / span));
}

export default function render(host, spec) {
  const s = {
    pitch: clamp(spec.pitch ?? 1, 0.6, 1.6),
    speed: clamp(spec.speed ?? 1, 0.6, 1.8),
    vol: clamp(spec.vol ?? 0.2, 0, 0.4),
  };
  const text = typeof spec.text === 'string' && spec.text.length ? spec.text : '你好世界';
  let stage = 2;
  let curT = 0.3;
  let dsp = null;

  let plan = planText(text, s.speed);
  let synth = synthWave(plan, s.pitch);
  let mel = null;

  const cv = setupCanvas(host, spec.height || 400);

  const segCtl = buildSegmented(
    STAGES.map((t, i) => ({ label: t, value: i })),
    stage,
    (v) => { stage = v; drawAll(); },
  );
  host.appendChild(segCtl);

  const ro = buildReadout({
    句子: '—', 音节数: '—', 总长: '—', F0: '—', mel帧: '—', 当前: '—',
  });
  host.appendChild(ro.box);

  function recompute() {
    plan = planText(text, s.speed);
    synth = synthWave(plan, s.pitch);
    curT = clamp(curT, 0, plan.total);
    if (dsp) mel = melSpectrogram(dsp, synth.wave);
    drawAll();
  }

  const sl = buildSliders(
    {
      sliders: [
        { name: 'pitch', label: '音调倍率（F0）', min: 0.6, max: 1.6, step: 0.05, value: s.pitch, fmt: 2 },
        { name: 'speed', label: '语速倍率', min: 0.6, max: 1.8, step: 0.05, value: s.speed, fmt: 2 },
        { name: 'vol', label: '音量', min: 0, max: 0.4, step: 0.02, value: s.vol, fmt: 2 },
      ],
    },
    (st) => {
      const volChanged = st.vol !== s.vol;
      s.pitch = st.pitch;
      s.speed = st.speed;
      s.vol = st.vol;
      if (volChanged && gainNode && engRef) {
        gainNode.gain.setTargetAtTime(s.vol, engRef.ctx.currentTime, 0.02);
      }
      if (!volChanged) recompute();
      else drawAll();
    },
  );

  /* ---------- 绘制 ---------- */
  let geom = null;
  let engRef = null;
  let gainNode = null;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geom = { x0: 46, x1: W - 12, y0: 34, y1: H - 34 };
    clearBg(ctx, W, H, C);
    const TX = (t) => geom.x0 + (clamp(t, 0, plan.total) / plan.total) * (geom.x1 - geom.x0);

    if (stage === 0) {
      label(ctx, '文本规范化 → 查词典（真实 TTS 用 G2P 神经模型；这里查内置字表，生字当停顿）',
        10, 18, C.fg, { size: 10.5 });
      const n = Math.max(1, plan.chars.length);
      const bw = Math.min(120, (W - 20) / n);
      plan.chars.forEach((c, i) => {
        const x = 10 + i * bw;
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 2.5, 34.5, bw - 10, 64);
        label(ctx, c.ch, x + (bw - 6) / 2, 78, C.fg, { align: 'center', size: 30, weight: 700 });
        label(ctx, c.py, x + (bw - 6) / 2, 96, C.accent, { align: 'center', size: 13, weight: 600 });
        label(ctx, '声调' + (c.tone || 0) + (c.init ? ' · 声母 ' + c.init : ' · 零声母'),
          x + (bw - 6) / 2, 112, C.axis, { align: 'center', size: 9 });
      });
      label(ctx, '下一级：拼音序列变成「音素段 + 声调曲线」，即语言学特征', 10, 136, C.axis, { size: 10 });
      return;
    }

    if (stage === 1) {
      label(ctx, '语言学特征：音素时间轴（色块）+ 基频 F0 曲线（韵律模型输出，滑块直接控制）',
        10, 18, C.fg, { size: 10.5 });
      const y0 = geom.y0 + 26;
      const h = geom.y1 - y0 - 6;
      const kindCol = { fric: C.named('orange'), stop: C.bad, nasal: C.named('teal'), vowel: C.accent };
      plan.segs.forEach((sg) => {
        ctx.fillStyle = kindCol[sg.kind] || C.axis;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(TX(sg.t0), y0, Math.max(2, TX(sg.t1) - TX(sg.t0)), 26);
        ctx.globalAlpha = 1;
        if (TX(sg.t1) - TX(sg.t0) > 16) {
          label(ctx, sg.lab, (TX(sg.t0) + TX(sg.t1)) / 2, y0 + 17, '#fff', { align: 'center', size: 9.5, weight: 700 });
        }
      });
      const fmax = 170 * s.pitch * 1.45;
      ctx.strokeStyle = C.named('purple');
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      const step = Math.max(1, Math.floor(synth.n / (geom.x1 - geom.x0)));
      for (let i = 0; i < synth.n; i += step) {
        if (!synth.F0[i]) { started = false; continue; }
        const px = TX(i / FS);
        const py = y0 + h - (synth.F0[i] / fmax) * (h * 0.72) - 34;
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      label(ctx, 'F0（紫线）', geom.x0 + 4, y0 + 42, C.named('purple'), { size: 10, weight: 600 });
      label(ctx, '色块：橙=擦音 红=爆破音 青=鼻音 蓝=韵母', geom.x0 + 4, geom.y1 + 16, C.axis, { size: 9.5 });
      const cx = TX(curT);
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 1.5, y0 - 4, 3, h + 8);
      label(ctx, '红框 = 当前时刻（可拖）', geom.x1, geom.y1 + 16, C.bad, { align: 'right', size: 9.5 });
      return;
    }

    if (stage === 2) {
      label(ctx, '声学特征：40 维梅尔谱——由 ④ 级的波形现算，真实声学模型预测的就是这口锅',
        10, 18, C.fg, { size: 10.5 });
      if (!mel) {
        label(ctx, '正在载入 dsp 引擎…', W / 2, H / 2, C.axis, { align: 'center', size: 11 });
        return;
      }
      const y0 = geom.y0 + 22;
      const h = geom.y1 - y0;
      const nf = mel.length;
      const cw = Math.max(1, ((HOP / FS) / plan.total) * (geom.x1 - geom.x0));
      mel.forEach((col, f) => {
        for (let mm = 0; mm < NMEL; mm += 1) {
          ctx.globalAlpha = 0.05 + 0.9 * col[mm];
          ctx.fillStyle = C.named('teal');
          ctx.fillRect(TX((f * HOP) / FS), y0 + (1 - (mm + 1) / NMEL) * h, cw, h / NMEL + 0.6);
        }
      });
      ctx.globalAlpha = 1;
      const cx = TX(curT);
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, y0 - 2);
      ctx.lineTo(cx, y0 + h + 2);
      ctx.stroke();
      label(ctx, '纵轴：mel 1..40（低频在下）　拖「音调」看整谱上下平移，拖「语速」看横向伸缩',
        geom.x0 + 4, y0 - 6, C.axis, { size: 9.5 });
      return;
    }

    /* stage 3：波形 */
    label(ctx, '波形：源-滤波教具声码器还原的声音 —— 点下方 ▶ 试听（音量 ' + fmt(s.vol, 2) + '）',
      10, 18, C.fg, { size: 10.5 });
    const y0 = geom.y0 + 26;
    const h = geom.y1 - y0;
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(geom.x0, y0 + h / 2);
    ctx.lineTo(geom.x1, y0 + h / 2);
    ctx.stroke();
    ctx.strokeStyle = C.series(0);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(synth.n / (geom.x1 - geom.x0)));
    for (let i = 0; i < synth.n; i += step) {
      const px = TX(i / FS);
      const py = y0 + h / 2 - synth.wave[i] * (h / 2) * 0.92;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const cx = TX(curT);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 1.5, y0 - 4, 3, h + 8);
    label(ctx, '③ 级的梅尔谱就是从这条波形算出来的（红框 = 当前时刻，可拖）',
      geom.x0 + 4, H - 10, C.axis, { size: 9.5 });
  }

  function drawStatics() {
    ro.set('句子', text);
    ro.set('音节数', String(plan.chars.length));
    ro.set('总长', fmt(plan.total, 2) + ' s（语速 ×' + fmt(s.speed, 2) + '）');
    ro.set('F0', '基频 ' + fmt(170 * s.pitch, 0) + ' Hz × 声调曲线');
    ro.set('mel帧', mel ? mel.length + ' 帧 × 40 维（32ms 窗 8ms 移）' : '…');
    ro.set('当前', fmt(curT, 2) + ' s / ' + fmt(plan.total, 2) + ' s');
  }

  function drawAll() { draw(); drawStatics(); }

  /* ---------- 拖拽：时间光标 ---------- */
  bindPointer(cv.canvas, {
    pick() { return 'cur'; },
    move(id, x) {
      if (id !== 'cur' || !geom) return;
      curT = clamp(((x - geom.x0) / (geom.x1 - geom.x0)) * plan.total, 0, plan.total);
      draw();
      ro.set('当前', fmt(curT, 2) + ' s / ' + fmt(plan.total, 2) + ' s');
    },
    up() { },
  });

  /* ---------- 出声（audioShell：▶/■ + 离屏自动停） ---------- */
  const shell = audioShell(host, (eng, api) => {
    if (!synth.wave || !synth.n) {
      api.hint.textContent = '还在计算波形，稍候再点播放';
      return () => { };
    }
    eng.setMasterGain(0.8);
    engRef = eng;
    const buf = eng.ctx.createBuffer(1, synth.n, FS);
    buf.copyToChannel(Float32Array.from(synth.wave), 0);
    const node = eng.ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    gainNode = eng.ctx.createGain();
    gainNode.gain.value = clamp(s.vol, 0, 0.4);
    node.connect(gainNode);
    gainNode.connect(eng.master);
    node.start(0);
    api.hint.textContent = '循环播放合成语音（音量 ' + fmt(s.vol, 2) + '，滑块可调）';
    return () => {
      try { node.stop(); } catch (e) { void e; }
      try { node.disconnect(); } catch (e) { void e; }
      try { gainNode.disconnect(); } catch (e) { void e; }
      gainNode = null;
      engRef = null;
    };
  });

  drawAll();
  cv.redraw = drawAll;
  engine('dsp').then((m) => {
    dsp = m;
    mel = melSpectrogram(dsp, synth.wave);
    drawAll();
  }).catch(() => { void 0; });

  return {
    slidersBox: sl.box,
    destroy() { shell.stop(); },
  };
}

