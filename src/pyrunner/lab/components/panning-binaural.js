/* =========================================================================
 * lab 组件：panning-binaural（立体声声像 ↔ 真实双耳线索）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   两件事，别混为一谈——
 *   1) 等功率声像（录音棚的做法）：把同一个单声道信号按 L = cosθ、R = sinθ
 *      分给两个音箱（θ = (pan+1)·π/4）。它只改强度，不改时间，听感是
 *      「声音在两耳之间滑动」，不是「声音在某个方位」。
 *   2) 双耳线索（真实听觉的做法）：声源偏到一侧时，两耳收到的信号有
 *      时间差 ITD 与强度差 ILD。
 *        ITD = (a/c)(φ + sinφ)     （Woodworth 球形头模型，φ 用弧度）
 *        ILD ≈ min(20, 0.005·f)·|sinφ| dB（头影效应的简化经验模型，示意量级）
 *      低频靠 ITD 定位（相位差小、不会绕圈），高频靠 ILD（头挡得住）；
 *      中间 1.5–3 kHz 两头都不灵——这就是「 duplex theory 」的缺口。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "panning-binaural", "title": "把声源从正前方拖到正右方" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   azimuth  方位角（度，−90 左 … 0 正前 … +90 右）  默认 30
 *   pan      等功率声像旋钮（−1 全左 … +1 全右）      默认 0
 *   freq     正弦频率（Hz）                          默认 500
 *   mode     "binaural"（默认，双耳线索）| "pan"（等功率声像）
 *   src      "tone"（默认）| "noise"
 *   volume   播放音量  默认 0.2
 *
 * 能拖什么：
 *   左上俯视图：按住拖动，声源绕着头从前方的 −90° 转到 +90°；
 *   底部那条轨道：拖方块改等功率声像旋钮，看 L/R 两条电平怎么此消彼长。
 *
 * 出声：是（戴耳机效果最明显）。带「■ 停止」按钮，离开视口自动停，默认音量 0.2。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, audioShell, polyline, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';
import { chain } from '../engines/audio.js';

const A_HEAD = 0.0875;    // 头半径（m），成人约 17.5 cm 头宽
const C_SOUND = 343;      // 声速（m/s）

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    azimuth: spec.azimuth ?? 30,
    pan: spec.pan ?? 0,
    freq: spec.freq ?? 500,
    volume: spec.volume ?? 0.2,
    mode: spec.mode === 'pan' ? 'pan' : 'binaural',
    src: spec.src === 'noise' ? 'noise' : 'tone',
  };

  const cv = setupCanvas(host, 420);

  const segMode = buildSegmented(
    [
      { label: '双耳线索 ITD+ILD', value: 'binaural' },
      { label: '等功率声像', value: 'pan' },
    ],
    s.mode,
    (v) => {
      s.mode = v;
      applyAudio();
      draw();
    },
  );
  host.appendChild(segMode);

  const segSrc = buildSegmented(
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
  host.appendChild(segSrc);

  const ro = buildReadout({ 方位角: '—', 'ITD 时间差': '—', 'ILD 强度差': '—', 相位差: '—', '声像 L / R': '—' });
  host.appendChild(ro.box);

  let nodes = null;
  let geo = null;

  /* ---------- 模型 ---------- */

  /* ITD（秒）：Woodworth 公式，φ 用弧度，右侧为正 */
  function itd(deg) {
    const p = (clamp(deg, -90, 90) * Math.PI) / 180;
    return (A_HEAD / C_SOUND) * (p + Math.sin(p));
  }
  /* ILD（dB）：头影效应的简化经验模型——低频绕得过去，高频绕不过去 */
  function ild(deg, f) {
    return Math.min(20, 0.005 * f) * Math.abs(Math.sin((clamp(deg, -90, 90) * Math.PI) / 180));
  }
  /* 等功率声像：L = cosθ，R = sinθ，θ = (pan+1)·π/4，保证 L²+R² = 1 */
  const panGains = () => {
    const th = ((clamp(s.pan, -1, 1) + 1) * Math.PI) / 4;
    return [Math.cos(th), Math.sin(th)];
  };

  /* ---------- 音频 ---------- */

  function applyAudio() {
    if (!nodes) return;
    const t = nodes.ctx.currentTime;
    const dt = itd(s.azimuth);
    const db = ild(s.azimuth, s.freq);
    const far = 10 ** (-db / 20);
    const right = s.azimuth >= 0;
    nodes.dlyL.delayTime.setTargetAtTime(Math.max(dt, 0), t, 0.03);
    nodes.dlyR.delayTime.setTargetAtTime(Math.max(-dt, 0), t, 0.03);
    nodes.gL.gain.setTargetAtTime(right ? far : 1, t, 0.03);
    nodes.gR.gain.setTargetAtTime(right ? 1 : far, t, 0.03);
    nodes.panner.set(s.pan);
    nodes.panG.gain.setTargetAtTime(s.mode === 'pan' ? 1 : 0, t, 0.03);
    nodes.binG.gain.setTargetAtTime(s.mode === 'pan' ? 0 : 1, t, 0.03);
    nodes.eng.setMasterGain(s.volume);
  }

  function startSource() {
    if (!nodes) return;
    const ctx = nodes.ctx;
    if (s.src === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = nodes.eng.makeNoiseBuffer(2, 'white');
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      chain(src, g, nodes.input);
      src.start();
      nodes.cont = { src, g };
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = s.freq;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      chain(osc, g, nodes.input);
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
    ['input', 'dlyL', 'dlyR', 'gL', 'gR', 'merger', 'binG', 'panG'].forEach((k) => {
      try { nodes[k].disconnect(); } catch (e) { void e; }
    });
    try { nodes.panner.node.disconnect(); } catch (e) { void e; }
    nodes = null;
  }

  const shell = audioShell(host, (eng, api) => {
    const ctx = eng.ctx;
    const input = ctx.createGain();
    /* 支路一：等功率声像 */
    const panner = eng.panner({ pan: s.pan });
    const panG = ctx.createGain();
    panG.gain.value = s.mode === 'pan' ? 1 : 0;
    chain(input, panner.node, panG, eng.master);
    /* 支路二：双耳线索——两耳各自一条延迟 + 增益，再合成左右声道 */
    const dlyL = ctx.createDelay(0.02);
    const dlyR = ctx.createDelay(0.02);
    const gL = ctx.createGain();
    const gR = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const binG = ctx.createGain();
    binG.gain.value = s.mode === 'pan' ? 0 : 1;
    chain(input, dlyL, gL);
    chain(input, dlyR, gR);
    gL.connect(merger, 0, 0);      // 左声道
    gR.connect(merger, 0, 1);      // 右声道
    chain(merger, binG, eng.master);
    nodes = { eng, ctx, input, panner, panG, dlyL, dlyR, gL, gR, merger, binG, cont: null };
    applyAudio();
    startSource();
    api.hint.textContent = '请戴耳机：时间差与强度差只有耳机才还原得出来';
    return () => {
      stopNodes();
    };
  });

  /* ---------- 绘图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const dt = itd(s.azimuth);
    const db = ild(s.azimuth, s.freq);
    const far = 10 ** (-db / 20);
    const right = s.azimuth >= 0;

    /* ===== 左上：头俯视图 ===== */
    const A = { x0: 10, x1: Math.round(W * 0.36), y0: 26, y1: 232 };
    const hcx = (A.x0 + A.x1) / 2;
    const hcy = (A.y0 + A.y1) / 2 + 6;
    const hr = Math.min(A.x1 - A.x0, A.y1 - A.y0) * 0.19;
    const R = hr * 2.15;
    geo = { A, hcx, hcy, hr, R, panTrack: null };

    /* 可绕行的轨道 */
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hcx, hcy, R, -Math.PI / 2 - Math.PI / 2, -Math.PI / 2 + Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* 头 + 耳 + 鼻 */
    ctx.fillStyle = C.soft;
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(hcx, hcy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hcx, hcy - hr);
    ctx.lineTo(hcx - 5, hcy - hr - 8);
    ctx.lineTo(hcx + 5, hcy - hr - 8);
    ctx.closePath();
    ctx.fillStyle = C.fg;
    ctx.fill();
    const ear = (ex, ey, sgn, on) => {
      ctx.strokeStyle = on ? C.accent : C.fg;
      ctx.lineWidth = on ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.arc(ex, ey, hr * 0.3, -Math.PI / 2 + (sgn > 0 ? 0 : Math.PI), Math.PI / 2 + (sgn > 0 ? 0 : Math.PI));
      ctx.stroke();
    };
    ear(hcx - hr, hcy, -1, !right);
    ear(hcx + hr, hcy, 1, right);

    /* 声源 + 两条路径 */
    const phi = (clamp(s.azimuth, -90, 90) * Math.PI) / 180;
    const sx = hcx + R * Math.sin(phi);
    const sy = hcy - R * Math.cos(phi);
    const nearX = right ? hcx + hr : hcx - hr;
    const farX = right ? hcx - hr : hcx + hr;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(nearX, hcy);
    ctx.stroke();
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(right ? hcx : hcx, hcy - hr * 1.45, farX, hcy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, fmt(s.azimuth, 0) + '°', sx, sy - 12, C.named('red'), { align: 'center', size: 11 });
    label(ctx, '正前 0°', hcx, hcy - R - 14, C.fg, { align: 'center', size: 10 });
    label(ctx, '左 −90°', hcx - R, hcy + 16, C.fg, { align: 'center', size: 10 });
    label(ctx, '右 +90°', hcx + R, hcy + 16, C.fg, { align: 'center', size: 10 });
    label(ctx, '拖红点绕着头转', A.x0, A.y1 - 4, C.fg, { size: 10 });

    /* ===== 右上：ITD 随方位角 ===== */
    const B = { x0: A.x1 + 26, x1: W - 14, y0: 30, y1: 116 };
    const XI = (d) => B.x0 + ((clamp(d, -90, 90) + 90) / 180) * (B.x1 - B.x0);
    const YI = (v) => B.y1 - ((clamp(v, 0, 0.0008) / 0.0008)) * (B.y1 - B.y0);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [-90, -45, 0, 45, 90].forEach((d) => {
      const x = Math.round(XI(d)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, B.y0);
      ctx.lineTo(x, B.y1);
      ctx.stroke();
      label(ctx, String(d), x, B.y1 + 12, C.fg, { align: 'center', size: 10 });
    });
    [0, 200, 400, 600, 800].forEach((us) => {
      const y = Math.round(YI(us / 1e6)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(B.x0, y);
      ctx.lineTo(B.x1, y);
      ctx.stroke();
      label(ctx, String(us), B.x0 - 5, y + 3, C.fg, { align: 'right', size: 10 });
    });
    const itdPts = [];
    for (let d = -90; d <= 90; d += 2) itdPts.push([XI(d), YI(itd(d))]);
    polyline(ctx, itdPts, C.accent, 2.2);
    const cx1 = XI(s.azimuth);
    const cy1 = YI(dt);
    ctx.strokeStyle = C.named('red');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx1, B.y0);
    ctx.lineTo(cx1, B.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(cx1, cy1, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'ITD = (a/c)(φ+sinφ)，µs', B.x0, B.y0 - 6, C.fg, { size: 10 });
    label(ctx, '方位角（度）', B.x1, B.y1 + 24, C.fg, { align: 'right', size: 10 });

    /* ===== 右中：ILD 随频率 ===== */
    const Dp = { x0: B.x0, x1: B.x1, y0: 156, y1: 236 };
    const FMIN = 100;
    const FMAX = 10000;
    const XF = (f) => Dp.x0 + (Math.log(clamp(f, FMIN, FMAX) / FMIN) / Math.log(FMAX / FMIN)) * (Dp.x1 - Dp.x0);
    const YD = (v) => Dp.y1 - (clamp(v, 0, 22) / 22) * (Dp.y1 - Dp.y0);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [100, 500, 1000, 5000, 10000].forEach((f) => {
      const x = Math.round(XF(f)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, Dp.y0);
      ctx.lineTo(x, Dp.y1);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + 'k' : String(f), x, Dp.y1 + 12, C.fg, { align: 'center', size: 10 });
    });
    [0, 10, 20].forEach((v) => {
      const y = Math.round(YD(v)) + 0.5;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(Dp.x0, y);
      ctx.lineTo(Dp.x1, y);
      ctx.stroke();
      label(ctx, String(v), Dp.x0 - 5, y + 3, C.fg, { align: 'right', size: 10 });
    });
    const ildPts = [];
    for (let i = 0; i <= 120; i += 1) {
      const f = FMIN * (FMAX / FMIN) ** (i / 120);
      ildPts.push([XF(f), YD(ild(s.azimuth, f))]);
    }
    polyline(ctx, ildPts, C.accent2, 2.2);
    const cx2 = XF(s.freq);
    const cy2 = YD(db);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'ILD ≈ min(20, 0.005f)·|sinφ|，dB', Dp.x0, Dp.y0 - 6, C.fg, { size: 10 });
    label(ctx, '频率（Hz）', Dp.x1, Dp.y1 + 24, C.fg, { align: 'right', size: 10 });

    /* ===== 下：两耳收到的波形 ===== */
    const E = { x0: 60, x1: W - 16, y0: 278, y1: 344 };
    const emid = (E.y0 + E.y1) / 2;
    const ea = (E.y1 - E.y0) / 2 - 6;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(E.x0, emid);
    ctx.lineTo(E.x1, emid);
    ctx.stroke();
    const win = 3 / s.freq;                       // 画三个周期
    const N = 240;
    const wave = (lead, ampv) => {
      const p = [];
      for (let i = 0; i <= N; i += 1) {
        const t = (i / N) * win;
        p.push([E.x0 + (i / N) * (E.x1 - E.x0), emid - Math.sin(2 * Math.PI * s.freq * (t + lead)) * ea * ampv]);
      }
      return p;
    };
    /* 近耳先到（波形整体左移 Δt），远耳迟到且弱 ILD */
    const pNear = wave(dt, 1);
    const pFar = wave(0, far);
    polyline(ctx, pFar, C.accent2, 2);
    polyline(ctx, pNear, C.accent, 2);
    /* 时间差标尺：两条曲线第一个上升零点之间的那一段就是 ITD */
    const zNear = E.x0 + ((1 / s.freq - dt) / win) * (E.x1 - E.x0);
    const zFar = E.x0 + ((1 / s.freq) / win) * (E.x1 - E.x0);
    ctx.strokeStyle = C.named('green');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(zNear, E.y0 + 4);
    ctx.lineTo(zNear, E.y1 - 4);
    ctx.moveTo(zFar, E.y0 + 4);
    ctx.lineTo(zFar, E.y1 - 4);
    ctx.stroke();
    label(ctx, '近耳（先到、更响）', E.x1 - 4, E.y0 + 12, C.accent, { align: 'right', size: 10 });
    label(ctx, '远耳（迟到 ' + fmt(Math.abs(dt) * 1000, 3) + ' ms，弱 ' + fmt(db, 1) + ' dB）',
      E.x1 - 4, E.y0 + 26, C.accent2, { align: 'right', size: 10 });
    label(ctx, '两耳波形（时间轴按真实比例，画三个周期）', E.x0, E.y0 - 8, C.fg, { size: 11 });

    /* ===== 底：等功率声像 ===== */
    const P = { x0: 60, x1: W - 16, y0: 380, y1: 400 };
    const [gLv, gRv] = panGains();
    geo.panTrack = P;
    const knobX = P.x0 + ((s.pan + 1) / 2) * (P.x1 - P.x0);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(P.x0, (P.y0 + P.y1) / 2);
    ctx.lineTo(P.x1, (P.y0 + P.y1) / 2);
    ctx.stroke();
    ctx.fillStyle = C.named('purple');
    ctx.fillRect(knobX - 6, (P.y0 + P.y1) / 2 - 8, 12, 16);
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(knobX - 6, (P.y0 + P.y1) / 2 - 8, 12, 16);
    label(ctx, 'L', P.x0 - 20, (P.y0 + P.y1) / 2 + 4, C.fg, { size: 11 });
    label(ctx, 'R', P.x1 + 12, (P.y0 + P.y1) / 2 + 4, C.fg, { size: 11 });
    label(ctx, '等功率声像（两个音箱之间滑动，与方位角无关）', E.x0, P.y0 - 16, C.fg, { size: 11 });
    /* 两条电平条 */
    const barY = P.y1 + 8;
    const barW = (P.x1 - P.x0) / 2 - 12;
    [[C.accent, gLv, 'L = cosθ = ' + fmt(gLv, 2), P.x0],
      [C.accent2, gRv, 'R = sinθ = ' + fmt(gRv, 2), P.x0 + barW + 24]].forEach(([col, v, txt, bx]) => {
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, barY, barW, 10);
      ctx.fillStyle = col;
      ctx.fillRect(bx, barY, barW * v, 10);
      label(ctx, txt, bx, barY - 3, col, { size: 10 });
    });

    /* 读数 */
    const phase = 360 * s.freq * Math.abs(dt);
    ro.set('方位角', (s.azimuth > 0 ? '右 ' : s.azimuth < 0 ? '左 ' : '正前 ') + fmt(Math.abs(s.azimuth), 0) + '°');
    ro.set('ITD 时间差', fmt(dt * 1000, 3) + ' ms');
    ro.set('ILD 强度差', fmt(db, 1) + ' dB');
    ro.set('相位差', fmt(phase, 0) + '°' + (phase > 180 ? '（超过半周，分不清先后）' : ''));
    ro.set('声像 L / R', fmt(gLv, 2) + ' / ' + fmt(gRv, 2));
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      const A = geo.A;
      if (x >= A.x0 && x <= A.x1 && y >= A.y0 && y <= A.y1) return 'az';
      const P = geo.panTrack;
      if (P && x >= P.x0 - 14 && x <= P.x1 + 14 && y >= P.y0 - 12 && y <= P.y1 + 12) return 'pan';
      return null;
    },
    move(id, x, y) {
      if (!geo) return;
      if (id === 'az') {
        const deg = (Math.atan2(x - geo.hcx, geo.hcy - y) * 180) / Math.PI;
        s.azimuth = clamp(deg, -90, 90);
        setSliderRow(sliders, 0, Math.round(s.azimuth * 10) / 10, 2, NAMES[0]);
      } else if (id === 'pan') {
        const P = geo.panTrack;
        s.pan = clamp(((x - P.x0) / (P.x1 - P.x0)) * 2 - 1, -1, 1);
        setSliderRow(sliders, 1, Math.round(s.pan * 100) / 100, 2, NAMES[1]);
      }
      applyAudio();
      draw();
    },
  });

  const NAMES = ['azimuth', 'pan', 'freq', 'volume'];
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'azimuth', label: '方位角', min: -90, max: 90, step: 1, value: s.azimuth },
        { name: 'pan', label: '声像旋钮', min: -1, max: 1, step: 0.01, value: s.pan },
        { name: 'freq', label: '正弦频率', min: 100, max: 8000, step: 10, value: s.freq },
        { name: 'volume', label: '音量', min: 0, max: 0.5, step: 0.02, value: s.volume },
      ],
    },
    (st) => {
      s.azimuth = st.azimuth;
      s.pan = st.pan;
      s.freq = st.freq;
      s.volume = st.volume;
      applyAudio();
      if (nodes && nodes.cont && nodes.cont.src.frequency) {
        nodes.cont.src.frequency.setTargetAtTime(s.freq, nodes.ctx.currentTime, 0.02);
      }
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      shell.stop();
    },
  };
}
