/* =========================================================================
 * lab 组件：latch-flipflop（电平敏感的锁存器 vs 边沿触发的触发器）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "latch-flipflop",
 *     "title": "把 S、R 同时松开，看电路会不会发疯",
 *     "mode": "sr",
 *     "d": 0,
 *     "auto": true,
 *     "setup": 2,
 *     "speed": 0.05
 *   }
 *   ```
 *
 * 字段（全部可省略）：
 *   mode   "sr"（默认，SR 锁存器）或 "d"（D 触发器）
 *   d      D 触发器的 D 初值，默认 0
 *   auto   D 模式下 D 是否自己随机跳变，默认 true（跳到时钟边沿附近就会出违例）
 *   setup  建立时间窗口，单位「子步」（一个时钟周期 = 16 子步），默认 2
 *   speed  每个子步的时长（秒），默认 0.05
 *
 * 演示什么：
 *   **SR 锁存器**是两个或非门交叉耦合——输出绕回输入，电路因此「记住了」上一次的
 *   状态：S=R=0 时保持，S=1 置位，R=1 复位。它没有时钟，输入一变输出就跟着变
 *   （电平敏感）。S=R=1 是禁区：Q 和 Q̄ 同时为 0，互补性没了；更糟的是两个输入
 *   同时松开时，两个门会比赛谁先翻转——真实电路可能震荡很久或停在随机值上，
 *   这就是亚稳态。组件里这种情况会掷硬币决定结果，并把那段波形标红画成抖动。
 *   **D 触发器**只在时钟**上升沿**那一瞬间看一眼 D，其余时间 D 怎么折腾都不管。
 *   但如果 D 恰好在上升沿前的一小段窗口里变化（建立时间违例），这一眼看到的是
 *   「正在变化的 D」，输出同样可能进入亚稳态。让 D 自己随机跳变，跑一会儿就能
 *   抓到几次违例；把随机跳变关掉、自己挑安全时刻按「翻转 D」，一次都不会违例。
 *
 * 能拖什么：
 *   · SR 模式：点左边 S / R 的方块（或下面同名按钮）压上 / 松开
 *   · D 模式：点波形上 D 那一道 → 翻转 D
 *   · 两种模式都能在波形区按住左右拖 → 时间游标，读出该时刻各信号的值
 *   滑块：时钟速度、建立时间窗口。按钮：时钟单步、D 随机跳变开关。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, buildToolbar, mkBtn, anim, label, clamp, fmt,
} from '../core.js';
import { evalCombinational, createSim } from '../engines/logic.js';

const SUB = 16;        // 一个时钟周期切成 16 个子步
const HALF = SUB / 2;  // 上升沿发生在第 8 个子步
/* SR 原理图的设计坐标（窄屏整体缩放） */
const DS = { gx: 150, gw: 84, gh: 46, gy1: 48, gy2: 122, h: 300 };

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    mode: spec.mode === 'd' ? 'd' : 'sr',
    d: spec.d ? 1 : 0,
    auto: spec.auto !== false,
    setup: clamp(Math.round(spec.setup ?? 2), 1, 5),
    speed: clamp(spec.speed ?? 0.05, 0.015, 0.2),
  };

  const st = {
    S: 0, R: 0, q: 0, qn: 1, prevBoth: false, metaSR: 0, srHist: [],
    D: s.d, Q: 0, sub: 0, lastDSub: -99, metaD: 0, dHist: [],
    cursor: null, accSR: 0, accD: 0,
  };
  let srScale = 1;
  let waveGeo = { x: 58, w: 300, y: 340, laneH: 24, lanes: 4 };

  /* D 触发器：网表里放一个 dff 门，边沿采样交给引擎的时序仿真 */
  const dffNet = {
    inputs: ['D'],
    outputs: ['Q'],
    gates: [{ id: 'ff', type: 'dff', in: ['D'], out: 'Q', qn: 'Qn', reset: 0 }],
  };
  const sim = createSim(dffNet, { initial: { D: 0 } });

  const cv = setupCanvas(host, 440);
  const ro = buildReadout({
    '模式': '—', '输入': '—', 'Q': '—', 'Q̄': '—', '提示': '—', '游标': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: 'SR 锁存器（电平敏感）', value: 'sr' }, { label: 'D 触发器（边沿触发）', value: 'd' }],
    s.mode,
    (v) => { s.mode = v; st.cursor = null; syncBtns(); draw(); },
  ));

  /* ---------- SR：交叉耦合或非门 ---------- */
  function settleSR(randomize) {
    const g1 = { id: 'g1', type: 'nor', in: ['R', 'Qn'], out: 'Q' };
    const g2 = { id: 'g2', type: 'nor', in: ['S', 'Q'], out: 'Qn' };
    /* 两个门谁先翻转，比赛结果就不同：随机换门序来模拟真实的门级比赛 */
    const order = randomize && Math.random() < 0.5 ? [g2, g1] : [g1, g2];
    const net = { inputs: ['S', 'R'], outputs: ['Q', 'Qn'], gates: order };
    const values = { S: st.S, R: st.R, Q: st.q, Qn: st.qn };
    evalCombinational(net, values, 60);
    st.q = values.Q === undefined ? 0 : values.Q;
    st.qn = values.Qn === undefined ? 1 : values.Qn;
  }
  function setSR(key, v) {
    if (key === 'S') st.S = v ? 1 : 0;
    else st.R = v ? 1 : 0;
    const both = st.S === 1 && st.R === 1;
    const released = st.prevBoth && !both && st.S === 0 && st.R === 0;
    settleSR(released);
    if (released) st.metaSR = 4;      // 同时松开 → 亚稳态，画几格抖动波形
    st.prevBoth = both;
    pushSR();
    draw();
  }
  function pushSR() {
    st.srHist.push({ S: st.S, R: st.R, Q: st.q, Qn: st.qn, meta: st.metaSR > 0 });
    if (st.srHist.length > 200) st.srHist.shift();
    if (st.metaSR > 0) st.metaSR -= 1;
  }

  /* ---------- D：按子步推进 ---------- */
  function pushD(extra) {
    const phase = st.sub % SUB;
    const rec = { clk: phase < HALF ? 0 : 1, D: st.D, Q: st.Q, meta: st.metaD > 0 };
    Object.assign(rec, extra || {});
    st.dHist.push(rec);
    if (st.dHist.length > 240) st.dHist.shift();
    if (st.metaD > 0) st.metaD -= 1;
  }
  function stepSub() {
    st.sub += 1;
    const phase = st.sub % SUB;
    if (phase === HALF) {
      const since = st.sub - st.lastDSub;
      const viol = since >= 0 && since < s.setup;
      const snap = sim.tick({ D: st.D });
      st.Q = snap.Q === undefined ? 0 : snap.Q;
      if (viol) {
        st.metaD = 4;
        /* 违例时这一眼看到的是正在变化的 D，结果不定——掷硬币 */
        st.Q = Math.random() < 0.5 ? 0 : 1;
      }
      pushD({ clk: 1, edge: true, viol });
    } else {
      if (s.auto && Math.random() < 0.055) {
        st.D = st.D ? 0 : 1;
        st.lastDSub = st.sub;
      }
      pushD({});
    }
  }
  function clockStep() {
    /* 手动单步：一路推进到「刚好越过下一个上升沿」 */
    let guard = 0;
    do {
      stepSub();
      guard += 1;
    } while (st.sub % SUB !== HALF + 1 && guard < SUB + 2);
    draw();
  }

  /* ---------- 工具条 ---------- */
  const btnS = mkBtn('S：松开');
  const btnR = mkBtn('R：松开');
  const btnD = mkBtn('翻转 D');
  const btnStep = mkBtn('时钟单步');
  const btnAuto = mkBtn('D 随机跳变：开');
  btnS.addEventListener('click', () => setSR('S', st.S ? 0 : 1));
  btnR.addEventListener('click', () => setSR('R', st.R ? 0 : 1));
  btnD.addEventListener('click', () => {
    st.D = st.D ? 0 : 1;
    st.lastDSub = st.sub;
    pushD({});
    draw();
  });
  btnStep.addEventListener('click', clockStep);
  btnAuto.addEventListener('click', () => {
    s.auto = !s.auto;
    btnAuto.textContent = 'D 随机跳变：' + (s.auto ? '开' : '关');
    btnAuto.classList.toggle('is-active', s.auto);
  });
  host.appendChild(buildToolbar(btnS, btnR, btnD, btnStep, btnAuto));
  function syncBtns() {
    const sr = s.mode === 'sr';
    btnS.style.display = sr ? '' : 'none';
    btnR.style.display = sr ? '' : 'none';
    btnD.style.display = sr ? 'none' : '';
    btnStep.style.display = sr ? 'none' : '';
    btnAuto.style.display = sr ? 'none' : '';
    btnAuto.textContent = 'D 随机跳变：' + (s.auto ? '开' : '关');
    btnAuto.classList.toggle('is-active', s.auto);
  }
  syncBtns();

  /* ---------- 波形 ---------- */
  function drawWave(ctx, x0, y0, w, laneH, lanes, samples) {
    const n = samples.length;
    lanes.forEach((ln, li) => {
      const base = y0 + li * laneH + laneH - 8;
      const hi = base - (laneH - 16);
      label(ctx, ln.name, x0 - 8, base - (laneH - 16) / 2 + 4, C.fg,
        { align: 'right', size: 10, weight: 700 });
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, base);
      ctx.lineTo(x0 + w, base);
      ctx.stroke();
      if (n < 2) return;
      ctx.save();
      ctx.strokeStyle = ln.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i += 1) {
        const y = ln.get(samples[i]) ? hi : base;
        const xa = x0 + (i / (n - 1)) * w;
        const xb = x0 + ((i + 1) / (n - 1)) * w;
        if (i === 0) ctx.moveTo(xa, y);
        else ctx.lineTo(xa, y);
        ctx.lineTo(xb, y);
      }
      ctx.stroke();
      ctx.restore();
      /* 亚稳态：这一段画成抖动 */
      if (!ln.wave) return;
      ctx.save();
      ctx.strokeStyle = C.named('red');
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i += 1) {
        if (!samples[i].meta) continue;
        const xa = x0 + (i / (n - 1)) * w;
        const xb = x0 + ((i + 1) / (n - 1)) * w;
        const mid = ln.get(samples[i]) ? hi : base;
        ctx.beginPath();
        ctx.moveTo(xa, mid);
        ctx.lineTo((xa + xb) / 2, (base + hi) / 2);
        ctx.lineTo(xb, mid);
        ctx.stroke();
      }
      ctx.restore();
      /* 违例标记画在 Q 那一道上 */
      if (ln.markViol) {
        for (let i = 0; i < n; i += 1) {
          if (!samples[i].viol) continue;
          const xa = x0 + (i / (n - 1)) * w;
          label(ctx, '⚠', xa, hi - 4, C.named('red'), { size: 9, weight: 700 });
        }
      }
    });
  }

  function wire(ctx, pts, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1.4;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const sr = s.mode === 'sr';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const waveX = 58;
    const waveW = Math.max(120, W - waveX - 14);

    if (sr) {
      /* ===== SR 锁存器原理图（设计坐标，窄屏整体缩放） ===== */
      label(ctx, '两个或非门交叉耦合：输出绕回输入，电路就有了记忆', 8, 15, C.fg,
        { size: 11, weight: 600 });
      srScale = Math.min(1, W / 560);
      ctx.save();
      ctx.scale(srScale, srScale);
      const { gx, gw, gh, gy1, gy2 } = DS;
      const c1 = gy1 + gh / 2;      // 上门输出
      const c2 = gy2 + gh / 2;      // 下门输出
      const inR = gy1 + 12;         // 上门输入①：R
      const inQn = gy1 + 34;        // 上门输入②：Q̄ 反馈
      const inQ = gy2 + 12;         // 下门输入①：Q 反馈
      const inS = gy2 + 34;         // 下门输入②：S

      const pad = (x, y, name, v) => {
        ctx.fillStyle = v ? C.named('green') : C.soft;
        ctx.fillRect(x, y - 12, 48, 24);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y - 12, 48, 24);
        label(ctx, name + '=' + v, x + 24, y + 4, v ? C.bg : C.fg,
          { align: 'center', size: 11, weight: 700 });
      };
      pad(20, inR, 'R', st.R);
      pad(20, inS, 'S', st.S);
      /* 反馈线（先画线，后画门，免得盖住门体） */
      wire(ctx, [[gx + gw, c1], [290, c1], [290, 196], [104, 196], [104, inQ], [gx, inQ]],
        st.q ? C.named('green') : C.axis, st.q ? 2.2 : 1.2);
      wire(ctx, [[gx + gw, c2], [310, c2], [310, 214], [86, 214], [86, inQn], [gx, inQn]],
        st.qn ? C.named('green') : C.axis, st.qn ? 2.2 : 1.2);
      /* 输入线 */
      wire(ctx, [[68, inR], [gx, inR]], st.R ? C.named('green') : C.axis, st.R ? 2.2 : 1.2);
      wire(ctx, [[68, inS], [gx, inS]], st.S ? C.named('green') : C.axis, st.S ? 2.2 : 1.2);
      /* 门 */
      const norGate = (x, y, text, val) => {
        ctx.fillStyle = C.bg;
        ctx.fillRect(x, y, gw, gh);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x, y, gw, gh);
        label(ctx, text, x + gw / 2, y + gh / 2 + 4, C.fg,
          { align: 'center', size: 12, weight: 700 });
      };
      norGate(gx, gy1, 'NOR', st.q);
      norGate(gx, gy2, 'NOR', st.qn);
      label(ctx, 'Q = NOR(R, Q̄)', gx + 4, gy1 - 6, C.fg, { size: 10 });
      label(ctx, 'Q̄ = NOR(S, Q)', gx + 4, gy2 + gh + 14, C.fg, { size: 10 });
      /* 输出灯 */
      const lamp = (x, y, name, v, warn) => {
        ctx.fillStyle = warn ? C.named('red') : v ? C.named('green') : C.soft;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        label(ctx, String(v), x, y + 5, v || warn ? C.bg : C.fg,
          { align: 'center', size: 14, weight: 700 });
        label(ctx, name, x, y - 20, C.fg, { align: 'center', size: 10, weight: 700 });
      };
      const forbid = st.S === 1 && st.R === 1;
      lamp(300, c1, 'Q', st.q, forbid);
      lamp(340, c2, 'Q̄', st.qn, forbid);
      ctx.restore();

      const schBot = DS.h * srScale;
      if (forbid) {
        label(ctx, '禁区：S=R=1，Q 与 Q̄ 同时为 0，「互补」这条铁律破了', 8, schBot + 2,
          C.named('red'), { size: 11, weight: 600 });
        label(ctx, '此时若两个输入同时松开，两个门比赛谁先翻转 → 亚稳态（结果随机）',
          8, schBot + 18, C.named('red'), { size: 10 });
      } else if (st.metaSR > 0) {
        label(ctx, '亚稳态：刚刚两个输入同时松开，Q 停在哪一边是随机的（真实电路可能震荡更久）',
          8, schBot + 2, C.named('red'), { size: 11, weight: 600 });
        label(ctx, '这就是为什么真实设计里禁止 S、R 同时有效，也不允许它们同时撤销',
          8, schBot + 18, C.named('red'), { size: 10 });
      } else if (st.S === 0 && st.R === 0) {
        label(ctx, 'S=R=0：保持。两个输入都松开，状态靠反馈互相撑着留下来——这就是「记忆」',
          8, schBot + 2, C.named('green'), { size: 11, weight: 600 });
        label(ctx, '没有时钟：输入一变输出立刻跟着变（电平敏感，跟后面的边沿触发器不一样）',
          8, schBot + 18, C.grid, { size: 10 });
      } else if (st.S === 1) {
        label(ctx, 'S=1：置位，Q 被拉到 1（松开 S 后保持 1）', 8, schBot + 2, C.named('green'),
          { size: 11, weight: 600 });
      } else {
        label(ctx, 'R=1：复位，Q 被拉到 0（松开 R 后保持 0）', 8, schBot + 2, C.named('green'),
          { size: 11, weight: 600 });
      }

      const wy = Math.min(H - 120, schBot + 34);
      const laneH = (H - wy - 10) / 4;
      waveGeo = { x: waveX, w: waveW, y: wy, laneH, lanes: 4 };
      drawWave(ctx, waveX, wy, waveW, laneH, [
        { name: 'S', get: (z) => z.S, color: C.series(1), wave: false },
        { name: 'R', get: (z) => z.R, color: C.series(3), wave: false },
        { name: 'Q', get: (z) => z.Q, color: C.named('green'), wave: true },
        { name: 'Q̄', get: (z) => z.Qn, color: C.named('purple'), wave: true },
      ], st.srHist);
    } else {
      /* ===== D 触发器 ===== */
      label(ctx, '只在时钟上升沿看一眼 D，其余时间 D 怎么折腾都不管', 8, 15, C.fg,
        { size: 11, weight: 600 });
      const scD = Math.min(1, W / 560);
      ctx.save();
      ctx.scale(scD, scD);
      const bx = 96;
      const by = 34;
      const bw = 96;
      const bh = 66;
      ctx.fillStyle = C.bg;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(bx, by, bw, bh);
      label(ctx, 'D', bx - 8, by + 26, C.fg, { align: 'right', size: 11, weight: 700 });
      label(ctx, 'Q', bx + bw + 8, by + 26, C.fg, { size: 11, weight: 700 });
      label(ctx, 'Q̄', bx + bw + 8, by + 54, C.fg, { size: 11, weight: 700 });
      label(ctx, 'D 触发器', bx + bw / 2, by + 22, C.fg, { align: 'center', size: 11, weight: 700 });
      label(ctx, '边沿触发', bx + bw / 2, by + 40, C.accent, { align: 'center', size: 10 });
      label(ctx, 'Q', bx + 14, by + 58, C.fg, { size: 10 });
      label(ctx, 'Q̄', bx + bw - 20, by + 58, C.fg, { size: 10 });
      /* 时钟小三角 */
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bx, by + 48);
      ctx.lineTo(bx + 13, by + 56);
      ctx.lineTo(bx, by + 64);
      ctx.stroke();
      wire(ctx, [[bx - 46, by + 20], [bx, by + 20]], st.D ? C.series(1) : C.axis, st.D ? 2.2 : 1.2);
      label(ctx, 'D=' + st.D, bx - 52, by + 24, st.D ? C.series(1) : C.grid,
        { align: 'right', size: 10, weight: 700 });
      wire(ctx, [[bx - 46, by + 56], [bx, by + 56]], C.fg, 1.4);
      label(ctx, 'CLK', bx - 52, by + 60, C.fg, { align: 'right', size: 10, weight: 700 });
      /* 输出灯 */
      const lamp2 = (x, y, name, v, warn) => {
        ctx.fillStyle = warn ? C.named('red') : v ? C.named('green') : C.soft;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.3;
        ctx.stroke();
        label(ctx, warn ? '?' : String(v), x, y + 5, v || warn ? C.bg : C.fg,
          { align: 'center', size: 13, weight: 700 });
        label(ctx, name, x, y - 17, C.fg, { align: 'center', size: 10, weight: 700 });
      };
      lamp2(bx + bw + 44, by + 22, 'Q', st.Q, st.metaD > 0);
      lamp2(bx + bw + 44, by + 52, 'Q̄', st.Q ? 0 : 1, st.metaD > 0);
      ctx.restore();

      const symBot = 130 * scD;
      label(ctx, '现态 D = ' + st.D + '　次态 Q = ' + (st.metaD > 0 ? '不定（亚稳态）' : st.Q)
        + '　（下一个上升沿到来时 Q 才变成 D）', 8, symBot + 18, C.fg, { size: 10 });
      if (st.metaD > 0) {
        label(ctx, '⚠ 建立时间违例：D 在上升沿前 ' + fmt(s.setup, 0)
          + ' 个子步内变过，触发器看到的是「正在变化的 D」', 8, symBot + 34,
          C.named('red'), { size: 10, weight: 600 });
      } else {
        label(ctx, '红色竖条 = 建立时间窗口（D 在这段里变化就会违例）　⚠ = 该边沿采样失败',
          8, symBot + 34, C.grid, { size: 10 });
      }

      const wy = Math.min(H - 130, symBot + 52);
      const laneH = (H - wy - 10) / 4;
      waveGeo = { x: waveX, w: waveW, y: wy, laneH, lanes: 4 };
      const n = st.dHist.length;
      /* 建立时间窗口阴影 + 上升沿虚线 */
      if (n > 2) {
        for (let i = 0; i < n; i += 1) {
          if (!st.dHist[i].edge) continue;
          const xa = waveX + (Math.max(0, i - s.setup) / (n - 1)) * waveW;
          const xb = waveX + (i / (n - 1)) * waveW;
          ctx.fillStyle = C.named('red');
          ctx.globalAlpha = 0.10;
          ctx.fillRect(xa, wy, Math.max(1, xb - xa), laneH * 4 - 6);
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.strokeStyle = C.axis;
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(xb, wy);
          ctx.lineTo(xb, wy + laneH * 4 - 6);
          ctx.stroke();
          ctx.restore();
        }
      }
      drawWave(ctx, waveX, wy, waveW, laneH, [
        { name: 'CLK', get: (z) => z.clk, color: C.fg, wave: false },
        { name: 'D', get: (z) => z.D, color: C.series(1), wave: false },
        { name: 'Q', get: (z) => z.Q, color: C.named('green'), wave: true, markViol: true },
        { name: 'Q̄', get: (z) => (z.Q ? 0 : 1), color: C.named('purple'), wave: true },
      ], st.dHist);
    }

    /* ---------- 游标 ---------- */
    const samples = sr ? st.srHist : st.dHist;
    if (st.cursor !== null && st.cursor >= 0 && st.cursor < samples.length) {
      const n = Math.max(samples.length - 1, 1);
      const xa = waveGeo.x + (st.cursor / n) * waveGeo.w;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xa, waveGeo.y);
      ctx.lineTo(xa, waveGeo.y + waveGeo.laneH * waveGeo.lanes - 6);
      ctx.stroke();
    }

    /* ---------- 读数 ---------- */
    const cur = st.cursor !== null && st.cursor >= 0 && st.cursor < samples.length
      ? samples[st.cursor] : null;
    if (sr) {
      ro.set('模式', 'SR 锁存器（或非门交叉耦合 · 电平敏感 · 无时钟）');
      ro.set('输入', 'S = ' + st.S + '　R = ' + st.R
        + (st.S === 1 && st.R === 1 ? '　⚠ 禁区' : ''));
      ro.set('Q', String(st.q));
      ro.set('Q̄', String(st.qn) + (st.q === st.qn
        ? '　⚠ 与 Q 不互补（禁区）' : '　（与 Q 互补 ✓）'));
      ro.set('提示', st.S === 0 && st.R === 0 ? '保持：两个输入都松开，状态靠反馈撑着'
        : st.S === 1 && st.R === 1 ? '禁区：Q = Q̄ = 0，且同时松开会亚稳态'
          : st.S === 1 ? '置位：Q ← 1' : '复位：Q ← 0');
      ro.set('游标', cur ? 'S=' + cur.S + ' R=' + cur.R + ' Q=' + cur.Q + ' Q̄=' + cur.Qn
        + (cur.meta ? '　⚠ 亚稳态' : '') : '（在波形上拖一下）');
    } else {
      const nViol = st.dHist.filter((z) => z.viol).length;
      const nEdge = st.dHist.filter((z) => z.edge).length;
      ro.set('模式', 'D 触发器（上升沿采样 · 一个时钟周期 ' + SUB + ' 子步）');
      ro.set('输入', 'D = ' + st.D + '　CLK = ' + (st.sub % SUB < HALF ? 0 : 1)
        + '　（子步 ' + (st.sub % SUB) + '/' + SUB + '）');
      ro.set('Q', String(st.Q) + (st.metaD > 0 ? '　⚠ 亚稳态中' : ''));
      ro.set('Q̄', String(st.Q ? 0 : 1));
      ro.set('提示', '建立时间窗口 = ' + fmt(s.setup, 0) + ' 子步　已发生 '
        + nViol + ' 次违例 / ' + nEdge + ' 个上升沿'
        + (nViol ? '　（把「D 随机跳变」关掉，自己挑安全时刻翻转 D）' : ''));
      ro.set('游标', cur ? 'CLK=' + cur.clk + ' D=' + cur.D + ' Q=' + cur.Q
        + (cur.meta ? '　⚠ 亚稳态' : '') + (cur.viol ? '　（本沿违例）' : '')
        : '（在波形上拖一下，或点「时钟单步」）');
    }
  }

  /* ---------- 交互 ---------- */
  function waveIdx(x, y) {
    if (y < waveGeo.y || y > waveGeo.y + waveGeo.laneH * waveGeo.lanes) return null;
    if (x < waveGeo.x - 10 || x > waveGeo.x + waveGeo.w + 10) return null;
    const samples = s.mode === 'sr' ? st.srHist : st.dHist;
    if (samples.length < 2) return null;
    const t = clamp((x - waveGeo.x) / waveGeo.w, 0, 1);
    return Math.round(t * (samples.length - 1));
  }
  function padHit(x, y) {
    if (s.mode !== 'sr') return null;
    const X = x / srScale;
    const Y = y / srScale;
    if (X < 14 || X > 74) return null;
    if (Math.abs(Y - (DS.gy1 + 12)) <= 13) return 'R';
    if (Math.abs(Y - (DS.gy2 + 34)) <= 13) return 'S';
    return null;
  }
  function onDLane(y) {
    return y >= waveGeo.y + waveGeo.laneH && y <= waveGeo.y + 2 * waveGeo.laneH;
  }

  bindPointer(cv.canvas, {
    pick: (x, y) => {
      const p = padHit(x, y);
      if (p) return 'pad:' + p;
      return waveIdx(x, y) === null ? null : 'wave';
    },
    down(id, x, y) {
      const p = id.split(':');
      if (p[0] === 'pad') {
        setSR(p[1], p[1] === 'S' ? (st.S ? 0 : 1) : (st.R ? 0 : 1));
        return;
      }
      const ci = waveIdx(x, y);
      if (ci === null) return;
      st.cursor = ci;
      if (s.mode === 'd' && onDLane(y)) {
        st.D = st.D ? 0 : 1;
        st.lastDSub = st.sub;
        pushD({});
      }
      draw();
    },
    move(id, x, y) {
      void id;
      const ci = waveIdx(x, y);
      if (ci === null || st.cursor === ci) return;
      st.cursor = ci;
      draw();
    },
    up() {},
  });

  const controls = anim(host, {
    onTick(dt) {
      if (s.mode === 'sr') {
        st.accSR += dt;
        if (st.accSR >= 0.1) {
          st.accSR = 0;
          pushSR();
          draw();
        }
      } else {
        st.accD += dt;
        let guard = 0;
        while (st.accD >= s.speed && guard < 8) {
          st.accD -= s.speed;
          guard += 1;
          stepSub();
        }
        draw();
      }
    },
    onReset() {
      st.srHist = [];
      st.dHist = [];
      st.q = 0;
      st.qn = 1;
      st.S = 0;
      st.R = 0;
      st.prevBoth = false;
      st.metaSR = 0;
      st.Q = 0;
      st.D = s.d;
      st.sub = 0;
      st.lastDSub = -99;
      st.metaD = 0;
      st.cursor = null;
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'speed', label: '时钟速度（秒/子步）', min: 0.02, max: 0.16, step: 0.005, value: s.speed, fmt: 3 },
        { name: 'setup', label: '建立时间窗口（子步）', min: 1, max: 5, step: 1, value: s.setup, fmt: 0 },
      ],
    },
    (v) => { s.speed = v.speed; s.setup = v.setup; draw(); },
  );

  /* 起手先跑一段，别让波形空着 */
  for (let i = 0; i < 48; i += 1) stepSub();
  pushSR();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
