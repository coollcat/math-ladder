/* =========================================================================
 * lab 组件：adsr-shaper（包络 ADSR）
 * -------------------------------------------------------------------------
 * 演示：一个音的「性格」几乎全在音头上。A（起音）决定是敲的还是拉出来的，
 * D（衰减）决定音头之后掉多快，S（延音）决定按住时还剩多少，R（释放）决定
 * 松手后拖多长。上面画包络，下面用滚动示波器画出**实测输出电平**——照着
 * 包络真发声，所以两条形状对得上。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "adsr-shaper",
 *     "title": "钢琴、管风琴、拨弦：差别全在音头上"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   preset 初始预设：钢琴（默认）/ 管风琴 / 拨弦 / 弦乐
 *   A / D / S / R / hold   起音秒 / 衰减秒 / 延音电平 / 释放秒 / 保持秒
 *                          不给时取 preset 的值（钢琴：0.005 / 1.4 / 0 / 0.35 / 0.2）
 *   freq   音高（Hz），默认 220
 *   wave   波形：sine（默认）/ triangle / square / sawtooth
 *
 * 出声组件：点「▶ 播放」才创建 AudioContext，之后按包络循环触发一个个音，
 * 「■ 停止」随时停，滚出视口自动停，峰值增益 0.2。
 *
 * 能拖：包络上五个把手——A 端点（左右=起音）、D 端点（左右=衰减）、
 * S 中点（上下=延音电平）、延音末端（左右=保持时长）、R 末端（左右=释放）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, buildSegmented,
  audioShell, rafLoop, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';

const PRESETS = {
  钢琴: { A: 0.005, D: 1.4, S: 0, R: 0.35, hold: 0.2 },
  管风琴: { A: 0.04, D: 0.05, S: 0.95, R: 0.12, hold: 0.8 },
  拨弦: { A: 0.003, D: 0.7, S: 0, R: 0.25, hold: 0.1 },
  弦乐: { A: 0.35, D: 0.2, S: 0.8, R: 0.9, hold: 0.6 },
};
const GAP = 0.25;
const HIST = 300;   /* 示波器历史帧数，60 fps 下约 5 秒 */

export default function render(host, spec) {
  let C = themeColors();
  const base = PRESETS[spec.preset] || PRESETS.钢琴;
  const s = {
    A: spec.A ?? base.A,
    D: spec.D ?? base.D,
    S: spec.S ?? base.S,
    R: spec.R ?? base.R,
    hold: spec.hold ?? base.hold,
    freq: spec.freq ?? 220,
    wave: spec.wave || 'sine',
  };

  const cv = setupCanvas(host, 320);
  const seg = buildSegmented(
    [
      { label: '钢琴', value: '钢琴' },
      { label: '管风琴', value: '管风琴' },
      { label: '拨弦', value: '拨弦' },
      { label: '弦乐', value: '弦乐' },
      { label: '自定义', value: '自定义' },
    ],
    PRESETS[spec.preset] ? spec.preset : '钢琴',
    (v) => {
      if (v === '自定义') return;
      applyPreset(v);
    },
  );
  host.appendChild(seg);
  const ro = buildReadout({ 总时长: '—', 当前阶段: '—', 包络值: '—', 触发周期: '—' });
  host.appendChild(ro.box);

  const PAD_L = 46;
  const PAD_R = 18;
  const E_TOP = 40;
  const E_BOT = 178;
  const S_TOP = 198;
  const S_BOT = 292;

  const laneW = () => cv.W - PAD_L - PAD_R;
  const total = () => s.A + s.D + s.hold + s.R;
  const period = () => total() + GAP;

  /* 包络值：0 → 1 → S → S → 0（与 Web Audio 的线性斜坡一致） */
  function envAt(t) {
    if (t <= 0) return 0;
    if (t < s.A) return t / s.A;
    const td = t - s.A;
    if (td < s.D) return 1 + (s.S - 1) * (td / s.D);
    const ts = td - s.D;
    if (ts < s.hold) return s.S;
    const tr = ts - s.hold;
    if (tr < s.R) return s.S * (1 - tr / s.R);
    return 0;
  }

  function stageAt(t) {
    if (t < 0) return '—';
    if (t < s.A) return 'A 起音';
    if (t < s.A + s.D) return 'D 衰减';
    if (t < s.A + s.D + s.hold) return 'S 延音';
    if (t < total()) return 'R 释放';
    return '间隙（等下一个音）';
  }

  let engRef = null;
  let analyser = null;
  let bus = null;
  let timer = null;
  let loop = null;
  const voices = [];
  const starts = [];
  const hist = new Float32Array(HIST);
  let hi = 0;
  let dragging = false;
  let tMax = 1;

  const curTMax = () => {
    if (!dragging) tMax = total() * 1.12 + 0.05;
    return tMax;
  };
  const xOfT = (t) => PAD_L + (t / curTMax()) * laneW();
  const tOfX = (x) => ((x - PAD_L) / laneW()) * curTMax();
  const yOfV = (v) => E_BOT - clamp(v, 0, 1) * (E_BOT - E_TOP);
  const vOfY = (y) => clamp((E_BOT - y) / (E_BOT - E_TOP), 0, 1);

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    const TM = curTMax();
    const tot = total();

    /* ---------- 上：包络 ---------- */
    [0, 0.5, 1].forEach((v) => {
      const y = yOfV(v);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      label(ctx, fmt(v, 1), PAD_L - 6, y + 3, C.fg, { align: 'right', size: 9 });
    });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(PAD_L, E_TOP);
    ctx.lineTo(PAD_L, E_BOT);
    ctx.lineTo(W - PAD_R, E_BOT);
    ctx.stroke();
    label(ctx, '包络（0 → 1 → S → 0）', PAD_L, E_TOP - 10, C.fg, { size: 10 });
    label(ctx, '总时长 ' + fmt(tot, 2) + ' s', W - PAD_R, E_TOP - 10, C.fg,
      { align: 'right', size: 10 });

    /* 包络曲线 */
    const pts = [];
    for (let i = 0; i <= 400; i += 1) {
      const t = (i / 400) * tot;
      pts.push([xOfT(t), yOfV(envAt(t))]);
    }
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], yOfV(0));
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], yOfV(0));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    polyline(ctx, pts, C.accent, 2.4);

    /* 四个阶段：分隔线 + 名称 */
    const stages = [
      { t0: 0, t1: s.A, name: 'A 起音', col: C.accent },
      { t0: s.A, t1: s.A + s.D, name: 'D 衰减', col: C.accent2 },
      { t0: s.A + s.D, t1: s.A + s.D + s.hold, name: 'S 延音', col: C.ok },
      { t0: s.A + s.D + s.hold, t1: tot, name: 'R 释放', col: C.named('purple') },
    ];
    stages.forEach((st) => {
      if (st.t0 > 0) {
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xOfT(st.t0), E_TOP);
        ctx.lineTo(xOfT(st.t0), E_BOT);
        ctx.stroke();
        ctx.restore();
      }
      const mid = (xOfT(st.t0) + xOfT(st.t1)) / 2;
      label(ctx, st.name, mid, E_BOT + 14, st.col, { align: 'center', size: 10 });
    });
    label(ctx, '拖动五个把手改包络', PAD_L, E_BOT + 26, C.fg, { size: 9 });

    /* 播放头 */
    let playT = -1;
    if (engRef && starts.length) {
      const t = engRef.ctx.currentTime - starts[0];
      if (t >= 0 && t <= tot) playT = t;
    }
    if (playT >= 0) {
      const x = xOfT(playT);
      ctx.strokeStyle = C.named('red');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, E_TOP);
      ctx.lineTo(x, E_BOT);
      ctx.stroke();
      const v = envAt(playT);
      ctx.fillStyle = C.named('red');
      ctx.beginPath();
      ctx.arc(x, yOfV(v), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 五个把手 */
    const handles = [
      { id: 'A', x: xOfT(s.A), y: yOfV(1) },
      { id: 'D', x: xOfT(s.A + s.D), y: yOfV(s.S) },
      { id: 'S', x: xOfT(s.A + s.D + s.hold / 2), y: yOfV(s.S) },
      { id: 'hold', x: xOfT(s.A + s.D + s.hold), y: yOfV(s.S) },
      { id: 'R', x: xOfT(tot), y: yOfV(0) },
    ];
    handles.forEach((h) => {
      ctx.fillStyle = h.id === 'S' ? C.ok : C.bg;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    /* ---------- 下：实测电平（滚动示波器） ---------- */
    [0, 0.5, 1].forEach((v) => {
      const y = S_BOT - v * (S_BOT - S_TOP);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(W - PAD_R, y);
      ctx.stroke();
      label(ctx, fmt(v, 1), PAD_L - 6, y + 3, C.fg, { align: 'right', size: 9 });
    });
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(PAD_L, S_TOP);
    ctx.lineTo(PAD_L, S_BOT);
    ctx.lineTo(W - PAD_R, S_BOT);
    ctx.stroke();
    label(ctx, '实测输出电平（最近约 5 秒，右端是当下）', PAD_L, S_TOP - 8, C.fg, { size: 10 });
    if (!engRef) {
      label(ctx, '点「▶ 播放」后这里画出真实输出的包络',
        PAD_L + laneW() / 2, (S_TOP + S_BOT) / 2, C.fg, { align: 'center', size: 11 });
    } else {
      const tr = [];
      for (let i = 0; i < HIST; i += 1) {
        const v = hist[(hi + i) % HIST];
        tr.push([PAD_L + (i / (HIST - 1)) * laneW(), S_BOT - clamp(v, 0, 1.2) * (S_BOT - S_TOP)]);
      }
      ctx.fillStyle = C.named('teal');
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(tr[0][0], S_BOT);
      tr.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(tr[tr.length - 1][0], S_BOT);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      polyline(ctx, tr, C.named('teal'), 1.6);
    }

    /* ---------- 读数 ---------- */
    ro.set('总时长', 'A ' + fmt(s.A, 3) + ' + D ' + fmt(s.D, 3) + ' + 保持 '
      + fmt(s.hold, 2) + ' + R ' + fmt(s.R, 3) + ' = ' + fmt(tot, 3) + ' s');
    ro.set('当前阶段', stageAt(playT));
    ro.set('包络值', playT >= 0 ? fmt(envAt(playT), 3) : '—（未播放）');
    ro.set('触发周期', fmt(period(), 2) + ' s 一个音（峰值增益 0.2）');
  }

  function scheduleNote(eng, t0) {
    const ctx = eng.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = s.wave;
    osc.frequency.value = s.freq;
    const peak = 0.2;
    const a = Math.max(0.001, s.A);
    const d = Math.max(0.001, s.D);
    const r = Math.max(0.001, s.R);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.linearRampToValueAtTime(peak * s.S, t0 + a + d);
    const tRel = t0 + a + d + Math.max(0.001, s.hold);
    g.gain.setValueAtTime(peak * s.S, tRel);
    g.gain.linearRampToValueAtTime(0, tRel + r);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(tRel + r + 0.05);
    const v = { osc, g };
    voices.push(v);
    osc.onended = () => {
      try { g.disconnect(); } catch (e) { void e; }
      const i = voices.indexOf(v);
      if (i >= 0) voices.splice(i, 1);
    };
  }

  const shell = audioShell(host, (eng, api) => {
    engRef = eng;
    bus = eng.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(eng.master);
    analyser = eng.analyser({ fftSize: 1024, input: bus });
    starts.length = 0;
    hist.fill(0);
    hi = 0;
    let next = eng.ctx.currentTime + 0.06;
    const tick = () => {
      while (next < eng.ctx.currentTime + 0.35) {
        scheduleNote(eng, next);
        starts.push(next);
        next += period();
      }
      while (starts.length > 1 && starts[1] <= eng.ctx.currentTime) starts.shift();
    };
    tick();
    timer = setInterval(tick, 60);
    api.hint.textContent = '每 ' + fmt(period(), 2) + ' s 触发一个音';
    loop = rafLoop(host, () => {
      const w = analyser.waveform();
      let p = 0;
      for (let i = 0; i < w.length; i += 1) {
        const v = Math.abs(w[i]);
        if (v > p) p = v;
      }
      hist[hi % HIST] = p / 0.2;   /* 归一化：0.2 峰值 = 满格 */
      hi += 1;
      draw();
    });
    return () => {
      if (loop) loop.stop();
      if (timer) clearInterval(timer);
      loop = null;
      timer = null;
      voices.slice().forEach((v) => {
        try { v.osc.stop(); } catch (e) { void e; }
        try { v.osc.disconnect(); } catch (e) { void e; }
        try { v.g.disconnect(); } catch (e) { void e; }
      });
      voices.length = 0;
      starts.length = 0;
      if (bus) {
        try { bus.disconnect(); } catch (e) { void e; }
      }
      analyser = null;
      bus = null;
      engRef = null;
      draw();
    };
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'A', label: '起音 A', min: 0.001, max: 2, step: 0.001, value: s.A, fmt: 3 },
        { name: 'D', label: '衰减 D', min: 0.005, max: 2, step: 0.005, value: s.D, fmt: 3 },
        { name: 'S', label: '延音 S', min: 0, max: 1, step: 0.01, value: s.S, fmt: 2 },
        { name: 'R', label: '释放 R', min: 0.005, max: 3, step: 0.005, value: s.R, fmt: 3 },
        { name: 'hold', label: '保持时长', min: 0.02, max: 3, step: 0.02, value: s.hold, fmt: 2 },
        { name: 'freq', label: '音高', min: 110, max: 880, step: 1, value: s.freq, fmt: 0 },
      ],
    },
    (st) => {
      s.A = st.A;
      s.D = st.D;
      s.S = st.S;
      s.R = st.R;
      s.hold = st.hold;
      s.freq = st.freq;
      draw();
    },
  );

  function syncAll() {
    setSliderRow(sliders, 0, s.A, 3, 'A');
    setSliderRow(sliders, 1, s.D, 3, 'D');
    setSliderRow(sliders, 2, Math.round(s.S * 100) / 100, 2, 'S');
    setSliderRow(sliders, 3, s.R, 3, 'R');
    setSliderRow(sliders, 4, s.hold, 2, 'hold');
    draw();
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    Object.assign(s, p);
    syncAll();
  }

  function handleAt(x, y) {
    const tot = total();
    const cand = [
      { id: 'A', x: xOfT(s.A), y: yOfV(1) },
      { id: 'D', x: xOfT(s.A + s.D), y: yOfV(s.S) },
      { id: 'S', x: xOfT(s.A + s.D + s.hold / 2), y: yOfV(s.S) },
      { id: 'hold', x: xOfT(s.A + s.D + s.hold), y: yOfV(s.S) },
      { id: 'R', x: xOfT(tot), y: yOfV(0) },
    ];
    let best = null;
    let bd = 18;
    cand.forEach((c) => {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bd) {
        bd = d;
        best = c.id;
      }
    });
    return best;
  }

  function applyHandle(id, x, y) {
    if (id === 'A') s.A = clamp(tOfX(x), 0.001, 2);
    else if (id === 'D') s.D = clamp(tOfX(x) - s.A, 0.005, 2);
    else if (id === 'S') s.S = vOfY(y);
    else if (id === 'hold') s.hold = clamp(tOfX(x) - s.A - s.D, 0.02, 3);
    else if (id === 'R') s.R = clamp(tOfX(x) - s.A - s.D - s.hold, 0.005, 3);
    syncAll();
  }

  bindPointer(cv.canvas, {
    pick: (x, y) => ((y >= E_TOP - 20 && y <= E_BOT + 20) ? handleAt(x, y) : null),
    down: (id, x, y) => {
      dragging = true;
      applyHandle(id, x, y);
    },
    move: (id, x, y) => applyHandle(id, x, y),
    up: () => {
      dragging = false;
      draw();
    },
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
      if (loop) loop.stop();
      if (timer) clearInterval(timer);
    },
  };
}
