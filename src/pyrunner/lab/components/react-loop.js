/* =========================================================================
 * lab 组件：react-loop —— 一圈三拍，观察必须喂回去
 * -------------------------------------------------------------------------
 * 用法（第 56 章《LLM Agent：会调用工具的推理循环》动手实验）：
 *   { "type": "react-loop", "title": "…" }
 * 字段（都可省）：start 初始已知量（默认 3）；height 画布高度（默认 470）。
 *
 * 演示什么：ReAct 的一圈只有三拍——想（缺什么）、动（发一次工具调用）、
 *   看（把工具返回的实数拼回上下文）。读者自己按「square / halve」决定下一拍，
 *   每一拍的观察被**真的**接成下一拍的输入，历史逐条往下长。
 *   · 默认路径 3 → 9 → 4.5 → 20.25 → 10.125，与课文那个玩具 Agent 逐字一致；
 *   · 点「观察不喂回」：每一拍都拿初始值 3 去调工具，于是输出变成
 *     9 / 9、4.5 / 4.5 的复读机——循环还在转，却没有一环咬住上一环；
 *   · 点「收工」：历史冻结，读数条标出这次答案与拍数。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：两个工具按钮就是 Agent 的动作集，读者当策略 π；
 *      「观察不喂回」扳手是那个唯一会毁掉整条链的开关。
 *   2. 即时后果：当前已知量、历史链、三拍高亮一帧内重算，链条自己长出来。
 *   3. 读数：当前已知量 / 拍数 / 历史长度 / 状态，与正文 $h_{t+1} = h_t \oplus (a_t, o_t)$ 对齐。
 *   4. 啊哈预设：「观察不喂回」一键到达复读机现场，读数条写明哪一拍开始掉队。
 *   5. 默认状态：3、零拍、未开工——读者点第一下之前就已经知道该点什么。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout,
  mkBtn, label, arrow, clearBg, clamp,
} from '../core.js';

export default function render(host, spec) {
  const X0 = typeof spec.start === 'number' ? spec.start : 3;
  const st = {
    x: X0,            /* 当前已知量（观察的落点） */
    hist: [],         /* [{tool, in, out}] */
    phase: 0,         /* 0 想 / 1 动 / 2 看 */
    done: false,
    feedBack: true,   /* 观察是否喂回：本课唯一的灵魂开关 */
  };

  const cv = setupCanvas(host, clamp(spec.height || 470, 360, 900));
  const ro = buildReadout({ 当前已知量: '—', 拍数: '—', 历史长度: '—', 状态: '—' });
  host.appendChild(ro.box);

  const bSq = mkBtn('动：square(x)');
  const bHalf = mkBtn('动：halve(x)');
  const bStop = mkBtn('想：够了，收工');
  host.appendChild(buildToolbar(bSq, bHalf, bStop));

  const bAuto = mkBtn('自动走一拍');
  const bFeed = mkBtn('观察不喂回');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bAuto, bFeed, bReset));

  const TOOL = {
    square: (v) => v * v,
    halve: (v) => v / 2,
  };

  function fmtNum(v) {
    const r = Math.round(v * 1e4) / 1e4;
    return String(r);
  }

  /* 走一拍：想→动→看。feedBack 关掉时输入恒为初值，链条断在第一环 */
  function step(tool) {
    if (st.done) return;
    const input = st.feedBack ? st.x : X0;
    const out = TOOL[tool](input);
    st.hist.push({ tool, in: input, out });
    st.x = st.feedBack ? out : X0;
    st.phase = 2;
    draw();
    st.phase = 0;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const wide = W >= 620;
    label(ctx, 'ReAct：想（缺什么）→ 动（工具调用）→ 看（观察拼回上下文），三拍一圈',
      14, 20, C.axis, { size: 10.5 });

    /* ---- 三拍环 ---- */
    const cx = wide ? W * 0.22 : W / 2;
    const cy = wide ? H * 0.36 : 110;
    const r = wide ? Math.min(W * 0.14, H * 0.22) : Math.min(W * 0.22, 78);
    const NODES = [
      { t: '想', sub: '缺什么', ang: -Math.PI / 2, col: C.named('blue') },
      { t: '动', sub: '调工具', ang: -Math.PI / 2 + (Math.PI * 2) / 3, col: C.named('orange') },
      { t: '看', sub: '喂回去', ang: -Math.PI / 2 + (Math.PI * 4) / 3, col: C.named('green') },
    ];
    /* 三段弧把三个节点连成环，箭头表示流转方向 */
    NODES.forEach((n, i) => {
      const nx = cx + Math.cos(n.ang) * r;
      const ny = cy + Math.sin(n.ang) * r;
      const nxt = NODES[(i + 1) % NODES.length];
      const ex = cx + Math.cos(nxt.ang - 0.38) * r;
      const ey = cy + Math.sin(nxt.ang - 0.38) * r;
      arrow(ctx, cx + Math.cos(n.ang + 0.38) * r, cy + Math.sin(n.ang + 0.38) * r, ex, ey,
        C.axis, 1.4, 7);
    });
    NODES.forEach((n) => {
      const nx = cx + Math.cos(n.ang) * r;
      const ny = cy + Math.sin(n.ang) * r;
      ctx.save();
      ctx.beginPath();
      ctx.arc(nx, ny, 21, 0, Math.PI * 2);
      ctx.fillStyle = n.col;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = n.col;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      label(ctx, n.t, nx, ny + 5, n.col, { size: 15, align: 'center', weight: 700 });
      label(ctx, n.sub, nx, ny + 34, C.axis, { size: 9.5, align: 'center' });
    });
    label(ctx, '已知量 ' + fmtNum(st.x), cx, cy + r + 54, st.done ? C.ok : C.fg,
      { size: 13, align: 'center', weight: 700 });

    /* ---- 历史链 ---- */
    const hx = wide ? W * 0.46 : 16;
    let hy = wide ? 44 : H * 0.52;
    const histW = W - hx - 16;
    label(ctx, '历史 h_t：每拍的观察都成为下一拍的输入', hx, hy, C.fg, { size: 11.5, weight: 700 });
    hy += 20;
    if (!st.hist.length) {
      label(ctx, '（还没开工——按下面的「动：square(x)」走第一拍）', hx, hy, C.axis, { size: 10.5 });
    }
    const lineH = 20;
    let prevOut = X0;
    st.hist.slice(0, 9).forEach((h, i) => {
      const broken = h.in !== prevOut;
      label(ctx, '第 ' + (i + 1) + ' 拍　' + h.tool + '(' + fmtNum(h.in) + ') = ' + fmtNum(h.out),
        hx, hy, broken ? C.bad : C.fg, { size: 10.5 });
      if (broken) label(ctx, '← 又用了初值，断链', hx + histW - 96, hy, C.bad, { size: 9.5 });
      prevOut = h.out;
      hy += lineH;
    });
    if (st.hist.length > 9) label(ctx, '…… 共 ' + st.hist.length + ' 拍', hx, hy, C.axis, { size: 10 });

    hy += 6;
    if (st.hist.length && !st.feedBack) {
      label(ctx, '观察没喂回：x 恒为 ' + fmtNum(X0) + '，循环在原地打转', hx, hy, C.bad,
        { size: 10.5, weight: 700 });
    } else if (st.done) {
      label(ctx, '收工：答案 ' + fmtNum(st.x) + '，共 ' + st.hist.length + ' 拍', hx, hy, C.ok,
        { size: 10.5, weight: 700 });
    } else {
      label(ctx, '观察喂回中：上一拍的 out 就是下一拍的 x', hx, hy, C.ok, { size: 10.5 });
    }

    ro.set('当前已知量', fmtNum(st.x));
    ro.set('拍数', String(st.hist.length));
    ro.set('历史长度', 'h_' + st.hist.length + '（' + (st.hist.length * 2 + 1) + ' 项）');
    ro.set('状态', st.done ? '已收工'
      : !st.feedBack ? '断链：观察未喂回，循环空转'
        : st.hist.length ? '观察已喂回，可继续下一拍' : '未开工');
  }

  bSq.addEventListener('click', () => step('square'));
  bHalf.addEventListener('click', () => step('halve'));
  bStop.addEventListener('click', () => { st.done = true; draw(); });
  bAuto.addEventListener('click', () => {
    /* 自动一拍按课文那条示范路径走：偶数拍平方、奇数拍减半 */
    step(st.hist.length % 2 === 0 ? 'square' : 'halve');
  });
  bFeed.addEventListener('click', () => {
    st.feedBack = !st.feedBack;
    bFeed.textContent = st.feedBack ? '观察不喂回' : '恢复喂回（灵魂开关）';
    st.hist = st.hist.length ? [st.hist[0]] : [];
    st.x = st.hist.length ? (st.feedBack ? st.hist[0].out : X0) : X0;
    st.done = false;
    draw();
  });
  bReset.addEventListener('click', () => {
    st.x = X0; st.hist = []; st.phase = 0; st.done = false; st.feedBack = true;
    bFeed.textContent = '观察不喂回';
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { cv.redraw = null; } };
}