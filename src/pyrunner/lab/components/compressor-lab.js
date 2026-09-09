/* =========================================================================
 * lab 组件：compressor-lab（动态范围压缩：输入多大，输出就多大）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   压缩器的全部行为就是一条「输入 dB → 输出 dB」的曲线：
 *     阈值以下：1:1，原样放过（y = x）；
 *     阈值以上：斜率变成 1/R，超出的部分被按比例压下去；
 *     中间那段圆弧叫拐点（knee），knee 越大过渡越软、越听不出「被压」。
 *   静态曲线只说了「压多少」，另外两个参数说了「多快压、多快放」——
 *   启动 attack 与释放 release，它们在右下的增益衰减轨迹里看得最清楚。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "compressor-lab", "title": "把压缩比拖到 20:1，它就成了限幅器" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   threshold  阈值（dBFS）   默认 −24
 *   ratio      压缩比 R       默认 4（1 = 不压，20 ≈ 限幅）
 *   knee       拐点宽度（dB）  默认 6（0 = 硬拐点，拐点处会「咔」）
 *   attack     启动时间（ms）  默认 10
 *   release    释放时间（ms）  默认 250
 *   level      输入电平（dB）  默认 −10
 *   depth      脉动深度（dB）  默认 12（0 = 恒定电平，专门看静态压缩量）
 *   makeup     补偿增益（dB）  默认 0
 *   src        "tone"（默认正弦）| "noise"（白噪声）
 *   volume     播放音量       默认 0.2
 *
 * 能拖什么：
 *   静态曲线上三个把手——
 *     圆点在阈值处：横向拖改阈值；
 *     方块在曲线右端：纵向拖改压缩比（拖到顶就是 1:1 不压）；
 *     菱形在拐点左端：横向拖改拐点宽度。
 *   曲线上那个跟着动的大圆点是当前工作点（实测输入电平在曲线上的位置）。
 *
 * 出声：是。带「■ 停止」按钮，离开视口自动停，默认音量 0.2。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, rafLoop, audioShell, polyline, label, clamp, fmt,
} from '../core.js';
import { chain } from '../engines/audio.js';

const DBMIN = -60;
const DBMAX = 0;
const TRACE = 200;

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    threshold: spec.threshold ?? -24,
    ratio: spec.ratio ?? 4,
    knee: spec.knee ?? 6,
    attack: spec.attack ?? 10,
    release: spec.release ?? 250,
    level: spec.level ?? -10,
    depth: spec.depth ?? 12,
    makeup: spec.makeup ?? 0,
    volume: spec.volume ?? 0.2,
    src: spec.src === 'noise' ? 'noise' : 'tone',
  };

  const cv = setupCanvas(host, 340);

  const seg = buildSegmented(
    [
      { label: '正弦音', value: 'tone' },
      { label: '白噪声', value: 'noise' },
    ],
    s.src,
    (v) => {
      s.src = v;
      rebuildSource();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 输入电平: '—', 输出电平: '—', '增益衰减（实测）': '—', '增益衰减（静态）': '—', 曲线斜率: '—' });
  host.appendChild(ro.box);

  let nodes = null;
  let loop = null;
  const trIn = [];
  const trGr = [];
  let geo = null;
  let curIn = null;
  let curGr = null;

  /* ---------- 静态曲线（与 WebAudio DynamicsCompressorNode 同款软拐点） ---------- */

  function outAt(x) {
    const t = s.threshold;
    const R = Math.max(1, s.ratio);
    const k = Math.max(0, s.knee);
    if (k > 0 && x > t - k / 2 && x < t + k / 2) {
      return x + ((1 / R - 1) * (x - t + k / 2) ** 2) / (2 * k);
    }
    if (x >= t + k / 2 || (k === 0 && x >= t)) return t + (x - t) / R;
    return x;
  }
  const grAt = (x) => outAt(x) - x;

  /* ---------- 音频 ---------- */

  const amp = (db) => 10 ** (db / 20);

  function applyComp() {
    if (!nodes) return;
    const t = nodes.ctx.currentTime;
    nodes.comp.set('threshold', s.threshold);
    nodes.comp.set('ratio', s.ratio);
    nodes.comp.set('knee', s.knee);
    nodes.comp.set('attack', s.attack / 1000);
    nodes.comp.set('release', s.release / 1000);
    nodes.outG.gain.setTargetAtTime(amp(s.makeup), t, 0.05);
    nodes.eng.setMasterGain(s.volume);
    applyLevel();
  }

  /* 脉动音：一个低频正弦 LFO 直接调制输入增益的 AudioParam，
     电平就能在 (level−depth) 与 (level+depth) 之间来回扫过阈值。 */
  function applyLevel() {
    if (!nodes) return;
    const hi = amp(clamp(s.level + s.depth, DBMIN, DBMAX));
    const lo = amp(clamp(s.level - s.depth, DBMIN, DBMAX));
    nodes.preG.gain.setTargetAtTime((hi + lo) / 2, nodes.ctx.currentTime, 0.05);
    nodes.lfoG.gain.setTargetAtTime((hi - lo) / 2, nodes.ctx.currentTime, 0.05);
  }

  function startSource() {
    if (!nodes) return;
    const ctx = nodes.ctx;
    if (s.src === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = nodes.eng.makeNoiseBuffer(2, 'white');
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.7;
      chain(src, g, nodes.preG);
      src.start();
      nodes.cont = { src, g };
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 330;
      const g = ctx.createGain();
      g.gain.value = 0.7;
      chain(osc, g, nodes.preG);
      osc.start();
      nodes.cont = { src: osc, g };
    }
  }

  function stopSource() {
    if (!nodes || !nodes.cont) return;
    try { nodes.cont.src.stop(); } catch (e) { void e; }
    try { nodes.cont.src.disconnect(); } catch (e) { void e; }
    try { nodes.cont.g.disconnect(); } catch (e) { void e; }
    nodes.cont = null;
  }

  function rebuildSource() {
    if (!nodes) return;
    stopSource();
    startSource();
  }

  function stopNodes() {
    stopSource();
    if (!nodes) return;
    if (nodes.lfo) {
      try { nodes.lfo.stop(); } catch (e) { void e; }
      try { nodes.lfo.disconnect(); } catch (e) { void e; }
    }
    ['preG', 'outG', 'lfoG'].forEach((k) => {
      try { nodes[k].disconnect(); } catch (e) { void e; }
    });
    try { nodes.comp.node.disconnect(); } catch (e) { void e; }
    nodes = null;
    curIn = null;
    curGr = null;
  }

  const shell = audioShell(host, (eng, api) => {
    const ctx = eng.ctx;
    const preG = ctx.createGain();
    const comp = eng.compressor({
      threshold: s.threshold, ratio: s.ratio, knee: s.knee,
      attack: s.attack / 1000, release: s.release / 1000,
    });
    const outG = ctx.createGain();
    outG.gain.value = amp(s.makeup);
    chain(preG, comp.node, outG, eng.master);

    /* LFO：正弦调制输入增益，让工作点在曲线上往复运动 */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.2;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0;
    chain(lfo, lfoG, preG.gain);
    lfo.start();

    const anIn = eng.analyser({ fftSize: 1024, smoothing: 0.2, input: preG });
    const anOut = eng.analyser({ fftSize: 1024, smoothing: 0.2, input: outG });
    nodes = { eng, ctx, preG, comp, outG, lfo, lfoG, anIn, anOut, cont: null };
    applyComp();
    startSource();
    api.hint.textContent = '看着增益衰减轨迹，改启动/释放听「抽气」与「喘息」';
    loop = rafLoop(host, () => {
      if (!nodes) return;
      const di = nodes.anIn.levelDb();
      curIn = isFinite(di) ? di : -90;
      let gr = nodes.comp.reduction;
      if (typeof gr !== 'number' || !isFinite(gr)) gr = grAt(curIn);
      curGr = gr;
      trIn.push(curIn);
      trGr.push(gr);
      if (trIn.length > TRACE) trIn.shift();
      if (trGr.length > TRACE) trGr.shift();
      draw();
    });
    return () => {
      if (loop) { loop.stop(); loop = null; }
      trIn.length = 0;
      trGr.length = 0;
      stopNodes();
      draw();
    };
  });

  /* ---------- 绘图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const lx0 = 46, lx1 = Math.max(lx0 + 60, W * 0.52 - 12);
    const ly0 = 32, ly1 = 302;
    const LW = lx1 - lx0, LH = ly1 - ly0;
    const X = (db) => lx0 + ((clamp(db, DBMIN, DBMAX) - DBMIN) / (DBMAX - DBMIN)) * LW;
    const Y = (db) => ly1 - ((clamp(db, DBMIN, DBMAX) - DBMIN) / (DBMAX - DBMIN)) * LH;
    const XI = (x) => DBMIN + ((clamp(x, lx0, lx1) - lx0) / LW) * (DBMAX - DBMIN);
    const YI = (y) => DBMIN + ((ly1 - clamp(y, ly0, ly1)) / LH) * (DBMAX - DBMIN);
    geo = { lx0, lx1, ly0, ly1, LW, LH, XI, YI, X, Y };

    /* ---- 左：静态传输曲线 ---- */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let db = DBMIN; db <= DBMAX; db += 10) {
      const x = Math.round(X(db)) + 0.5;
      const y = Math.round(Y(db)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, ly0); ctx.lineTo(x, ly1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx0, y); ctx.lineTo(lx1, y); ctx.stroke();
      label(ctx, String(db), x, ly1 + 13, C.fg, { align: 'center', size: 10 });
      label(ctx, String(db), lx0 - 6, y + 3, C.fg, { align: 'right', size: 10 });
    }
    label(ctx, '输入（dBFS）', (lx0 + lx1) / 2, ly1 + 26, C.fg, { align: 'center', size: 10 });
    ctx.save();
    ctx.translate(lx0 - 32, (ly0 + ly1) / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, '输出（dBFS）', 0, 0, C.fg, { align: 'center', size: 10 });
    ctx.restore();

    /* 拐点区间 */
    if (s.knee > 0.05) {
      ctx.fillStyle = C.soft;
      ctx.fillRect(X(s.threshold - s.knee / 2), ly0, X(s.threshold + s.knee / 2) - X(s.threshold - s.knee / 2), LH);
      label(ctx, '拐点区', X(s.threshold), ly0 + 12, C.fg, { align: 'center', size: 10 });
    }
    /* 无压缩参考线 */
    polyline(ctx, [[X(DBMIN), Y(DBMIN)], [X(DBMAX), Y(DBMAX)]], C.axis, 1.2, [4, 4]);
    label(ctx, 'y = x（不压缩）', X(-14), Y(-14) - 6, C.axis, { size: 10 });
    /* 阈值竖线 */
    ctx.strokeStyle = C.named('green');
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    const xt = X(s.threshold);
    ctx.beginPath();
    ctx.moveTo(xt, ly0);
    ctx.lineTo(xt, ly1);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '阈值 ' + fmt(s.threshold, 0) + ' dB', xt + 4, ly1 - 6, C.named('green'), { size: 10 });

    /* 曲线本身 */
    const pts = [];
    for (let i = 0; i <= 240; i += 1) {
      const db = DBMIN + (i / 240) * (DBMAX - DBMIN);
      pts.push([X(db), Y(outAt(db) + s.makeup)]);
    }
    polyline(ctx, pts, C.accent, 2.6);

    /* 三个把手 */
    const hThr = [X(s.threshold), Y(s.threshold + s.makeup)];
    const yEnd = outAt(DBMAX) + s.makeup;
    const hRatio = [X(DBMAX), Y(yEnd)];
    const yKnee = outAt(s.threshold - s.knee / 2) + s.makeup;
    const hKnee = [X(s.threshold - s.knee / 2), Y(yKnee)];

    ctx.fillStyle = C.named('green');
    ctx.beginPath();
    ctx.arc(hThr[0], hThr[1], 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = C.named('red');
    ctx.fillRect(hRatio[0] - 6, hRatio[1] - 6, 12, 12);
    ctx.strokeStyle = C.bg;
    ctx.strokeRect(hRatio[0] - 6, hRatio[1] - 6, 12, 12);

    if (s.knee > 0.05) {
      ctx.fillStyle = C.named('purple');
      ctx.beginPath();
      ctx.moveTo(hKnee[0], hKnee[1] - 6);
      ctx.lineTo(hKnee[0] + 6, hKnee[1]);
      ctx.lineTo(hKnee[0], hKnee[1] + 6);
      ctx.lineTo(hKnee[0] - 6, hKnee[1]);
      ctx.closePath();
      ctx.fill();
    }

    /* 当前工作点 */
    if (curIn !== null && curIn > -89) {
      const px = X(curIn);
      const py = Y(outAt(curIn) + s.makeup);
      ctx.strokeStyle = C.accent2;
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, Y(curIn));
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, fmt(curIn, 1) + ' → ' + fmt(outAt(curIn) + s.makeup, 1) + ' dB',
        clamp(px, lx0 + 4, lx1 - 70), Y(curIn) - 6, C.accent2, { size: 10 });
    }
    label(ctx, '拖：圆点=阈值，方块=压缩比，菱形=拐点', lx0, ly0 - 10, C.fg, { size: 11 });

    /* ---- 右：输入电平 / 增益衰减 随时间 ---- */
    const rx0 = lx1 + 34;
    const rx1 = W - 16;
    const RW = Math.max(20, rx1 - rx0);
    const lane = (y0, y1, title, arr, dbLo, dbHi, col, mark) => {
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(rx0, y0, RW, y1 - y0);
      const YL = (db) => y1 - ((clamp(db, dbLo, dbHi) - dbLo) / (dbHi - dbLo)) * (y1 - y0);
      ctx.strokeStyle = C.grid;
      for (let db = Math.ceil(dbLo / 20) * 20; db <= dbHi; db += 20) {
        const y = Math.round(YL(db)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(rx0, y);
        ctx.lineTo(rx1, y);
        ctx.stroke();
        label(ctx, String(db), rx0 - 5, y + 3, C.fg, { align: 'right', size: 10 });
      }
      if (mark !== undefined && mark > dbLo && mark < dbHi) {
        ctx.strokeStyle = C.named('green');
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(rx0, YL(mark));
        ctx.lineTo(rx1, YL(mark));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (arr.length > 1) {
        const p = arr.map((v, i) => [rx0 + (i / (TRACE - 1)) * RW, YL(v)]);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p[0][0], y1);
        p.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.lineTo(p[p.length - 1][0], y1);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.22;
        ctx.fill();
        ctx.restore();
        polyline(ctx, p, col, 1.6);
      } else {
        label(ctx, '点「▶ 播放」开始记录', rx0 + 6, y0 + 16, C.fg, { size: 10 });
      }
      label(ctx, title, rx0, y0 - 6, C.fg, { size: 10 });
    };

    lane(38, 158, '输入电平（dBFS）', trIn, DBMIN, DBMAX, C.accent2, s.threshold);
    lane(196, 302, '增益衰减 GR（dB，向下=压得更多）', trGr, -30, 0, C.named('red'), undefined);

    /* 读数 */
    ro.set('输入电平', curIn === null || curIn <= -89 ? '—' : fmt(curIn, 1) + ' dBFS');
    ro.set('输出电平', curIn === null || curIn <= -89 ? '—' : fmt(outAt(curIn) + s.makeup, 1) + ' dBFS');
    ro.set('增益衰减（实测）', curGr === null ? '—' : fmt(curGr, 1) + ' dB');
    ro.set('增益衰减（静态）', curIn === null ? '—' : fmt(grAt(curIn), 1) + ' dB');
    ro.set('曲线斜率', s.ratio >= 19.5 ? '≈ 限幅' : '1 : ' + fmt(s.ratio, 1));
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      if (x < geo.lx0 - 16 || x > geo.lx1 + 16 || y < geo.ly0 - 16 || y > geo.ly1 + 16) return null;
      const yEndV = outAt(DBMAX) + s.makeup;
      const cands = [
        ['thr', [geo.X(s.threshold), geo.Y(s.threshold + s.makeup)], 14],
        ['ratio', [geo.X(DBMAX), geo.Y(yEndV)], 15],
        ['knee', [geo.X(s.threshold - s.knee / 2), geo.Y(outAt(s.threshold - s.knee / 2) + s.makeup)], 12],
      ];
      let best = null;
      let bd = Infinity;
      cands.forEach(([id, p, r]) => {
        const d = Math.hypot(x - p[0], y - p[1]);
        if (d < r && d < bd) { bd = d; best = id; }
      });
      return best;
    },
    move(id, x, y) {
      if (!geo) return;
      if (id === 'thr') {
        s.threshold = clamp(geo.XI(x), DBMIN, DBMAX);
        setSlider(0, Math.round(s.threshold * 10) / 10);
      } else if (id === 'ratio') {
        const out = clamp(geo.YI(y), s.threshold + 0.5, DBMAX);
        s.ratio = clamp(-s.threshold / (out - s.threshold), 1, 20);
        setSlider(1, Math.round(s.ratio * 10) / 10);
      } else if (id === 'knee') {
        s.knee = clamp(2 * (s.threshold - geo.XI(x)), 0, 40);
        setSlider(2, Math.round(s.knee * 10) / 10);
      }
      applyComp();
      draw();
    },
  });

  const NAMES = ['threshold', 'ratio', 'knee', 'attack', 'release', 'level', 'depth', 'makeup', 'volume'];
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'threshold', label: '阈值', min: -60, max: 0, step: 0.5, value: s.threshold },
        { name: 'ratio', label: '压缩比 R', min: 1, max: 20, step: 0.1, value: s.ratio },
        { name: 'knee', label: '拐点宽度', min: 0, max: 40, step: 0.5, value: s.knee },
        { name: 'attack', label: '启动（ms）', min: 1, max: 200, step: 1, value: s.attack },
        { name: 'release', label: '释放（ms）', min: 20, max: 1000, step: 10, value: s.release },
        { name: 'level', label: '输入电平（dB）', min: -40, max: 0, step: 0.5, value: s.level },
        { name: 'depth', label: '脉动深度（dB）', min: 0, max: 24, step: 0.5, value: s.depth },
        { name: 'makeup', label: '补偿增益（dB）', min: 0, max: 24, step: 0.5, value: s.makeup },
        { name: 'volume', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.volume },
      ],
    },
    (st) => {
      s.threshold = st.threshold;
      s.ratio = st.ratio;
      s.knee = st.knee;
      s.attack = st.attack;
      s.release = st.release;
      s.level = st.level;
      s.depth = st.depth;
      s.makeup = st.makeup;
      s.volume = st.volume;
      applyComp();
      if (!loop) draw();
    },
  );

  function setSlider(i, v) {
    const row = sliders.box.children[i];
    if (!row) return;
    const range = row.querySelector('input');
    const val = row.querySelector('.ml-slider__val');
    if (range) range.value = String(v);
    if (val) val.textContent = fmt(v, 1);
    sliders.state[NAMES[i]] = v;
  }

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
    },
  };
}
