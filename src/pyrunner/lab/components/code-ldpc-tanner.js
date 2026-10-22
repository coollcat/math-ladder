/* =========================================================================
 * lab 组件：code-ldpc-tanner —— 变量节点与检查节点之间的消息传递
 * -------------------------------------------------------------------------
 * 用法（第 35 章《LDPC 思想预告》动手实验）：
 *   { "type": "code-ldpc-tanner", "title": "…" }
 * 字段（都可省）：n 变量节点数（4–8，默认 6）；checks 检查节点定义
 *   （每项是变量下标的数组）；flip 初始翻转的位（0 起址，-1 表示不注错）；
 *   height 画布高度（默认 540）。
 *
 * 左列是变量节点（码位），右列是检查节点（奇偶方程），连线表示「这位参与这条方程」。
 *   · 每一轮：每条检查节点先算自己现在的奇偶 —— 不通过就翻转它邻居里「嫌疑最大」
 *     的那个变量节点（硬判决的比特翻转译码，真的在迭代，不是假动画）；
 *   · 报警的检查节点画红，被它指认的变量节点闪光；
 *   · 右侧记录「第几轮 → 还有几条检查在报警」，你可以按单步一轮一轮看它收敛。
 * 点左列的方块可以直接翻转某一位，看新的错误图样会留下什么「报警指纹」。
 *
 * 取舍：这是比特翻转（bit-flipping）硬判决，不是真实 LDPC 的软消息 BP；
 *   课文第 2 节的「多个邻居交换线索」在这个玩具尺度上就是这套规则。
 *   为避免震荡，翻转后同一轮内不再重复处理同一个变量节点。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp, polyline, anim,
} from '../core.js';

const DEF_CHECKS = [[0, 1], [0, 2], [0, 3], [2, 3, 4], [1, 4, 5]];

export default function render(host, spec) {
  const n = clamp(Math.round(spec.n || 6), 4, 8);
  let checks = Array.isArray(spec.checks) && spec.checks.length
    ? spec.checks.map((c) => (Array.isArray(c) ? c.filter((i) => i >= 0 && i < n) : [0, 1])).filter((c) => c.length)
    : DEF_CHECKS.map((c) => c.filter((i) => i < n)).filter((c) => c.length);
  if (!checks.length) checks = [[0, 1], [0, 2]];

  /* 全零块满足所有「偶校验」方程，是一个合法码字；再按 spec.flip 注一位错 */
  let bits = new Array(n).fill(0);
  const flip0 = spec.flip === undefined ? 1 : Math.round(spec.flip);
  if (flip0 >= 0 && flip0 < n) bits[flip0] = 1;

  let round = 0;
  let history = [];        /* 每轮之后的报警条数 */
  let accused = new Set(); /* 本轮被指认的变量节点 */
  let alarms = new Set();  /* 本轮报警的检查节点 */

  const cv = setupCanvas(host, spec.height || 540);
  const ro = buildReadout({
    接收块: '—',
    报警检查数: '—',
    迭代轮次: '—',
    当前状态: '—',
    '本轮翻位': '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步一轮 ▶');
  const bReset = mkBtn('复原（清空注错）');
  const bFlip2 = mkBtn('再翻一位');
  host.appendChild(buildToolbar(bStep, bReset, bFlip2));

  const geo = { vx: 0, vy: 0, cx: 0, cy: 0, W: 0, H: 0, gap: 0 };

  function layout(W, H) {
    const wide = W >= 620;
    geo.W = W;
    geo.H = H;
    const top = 96;
    const bottom = H - 108;
    const rows = Math.max(n, checks.length);
    const pitch = clamp((bottom - top) / Math.max(1, rows - 1), 30, 62);
    geo.vy = top;
    geo.cy = top + (rows - 1) * pitch * 0.5 - ((checks.length - 1) * pitch) / 2 + pitch * 0.1;
    geo.vx = wide ? Math.min(W * 0.26, 190) : W * 0.26;
    geo.cx = wide ? Math.min(W * 0.72, W - 130) : W * 0.74;
    geo.gap = pitch;
    geo.pitch = pitch;
  }

  const vY = (i) => geo.vy + i * geo.pitch;
  const cY = (j) => geo.cy + j * geo.pitch;

  /* 当前每条检查的奇偶（0 = 通过） */
  function syndrome() {
    return checks.map((c) => {
      let s = 0;
      c.forEach((i) => { s += bits[i]; });
      return s % 2;
    });
  }

  /* 一轮比特翻转：先收集报警检查，再按「被几条报警检查指控」排序翻最可疑的一位 */
  function stepRound() {
    const syn = syndrome();
    const score = new Array(n).fill(0);
    syn.forEach((s, j) => {
      if (s === 1) checks[j].forEach((i) => { score[i] += 1; });
    });
    let target = -1;
    let best = 0;
    for (let i = 0; i < n; i += 1) {
      if (score[i] > best) { best = score[i]; target = i; }
    }
    if (target >= 0) {
      bits[target] = 1 - bits[target];
      accused = new Set([target]);
    } else {
      accused = new Set();
    }
    round += 1;
    history.push(syndrome().reduce((a, b) => a + b, 0));
    if (history.length > 12) history.shift();
    alarms = new Set(syndrome().map((s, j) => (s ? j : -1)).filter((j) => j >= 0));
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const syn = syndrome();
    alarms = new Set(syn.map((s, j) => (s ? j : -1)).filter((j) => j >= 0));
    const alarmCount = alarms.size;

    label(ctx, 'Tanner 图：左 = 变量节点（码位），右 = 检查节点（奇偶方程）', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '红圈 = 这条方程现在不通过；实线 = 该位参与该方程', 16, 46, C.axis, { size: 10.5 });

    /* ---- 边 ---- */
    checks.forEach((c, j) => {
      c.forEach((i) => {
        const bad = syn[j] === 1;
        polyline(ctx, [[geo.vx + 20, vY(i)], [geo.cx - 16, cY(j)]],
          bad ? C.bad : C.grid, bad ? 1.9 : 1.1);
      });
    });

    /* ---- 变量节点 ---- */
    for (let i = 0; i < n; i += 1) {
      const y = vY(i);
      const isAcc = accused.has(i);
      ctx.save();
      ctx.fillStyle = bits[i] ? C.named('blue') : C.soft;
      ctx.globalAlpha = bits[i] ? 0.9 : 0.7;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(geo.vx - 4, y - 12, 26, 24, 5) : ctx.rect(geo.vx - 4, y - 12, 26, 24);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = isAcc ? 2.6 : 1;
      ctx.strokeStyle = isAcc ? C.accent2 : C.grid;
      ctx.stroke();
      ctx.restore();
      label(ctx, String(bits[i]), geo.vx + 9, y + 5, bits[i] ? C.bg : C.fg,
        { size: 12, align: 'center', weight: 700 });
      label(ctx, '位' + (i + 1), geo.vx - 12, y + 4, C.axis, { size: 10.5, align: 'right' });
    }
    label(ctx, '变量节点', geo.vx + 9, geo.vy - 26, C.fg, { size: 11, align: 'center', weight: 700 });

    /* ---- 检查节点 ---- */
    checks.forEach((c, j) => {
      const y = cY(j);
      const bad = syn[j] === 1;
      ctx.save();
      ctx.fillStyle = bad ? C.bad : C.named('green');
      ctx.globalAlpha = bad ? 0.9 : 0.75;
      ctx.fillRect(geo.cx - 14, y - 12, 28, 24);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(geo.cx - 13.5, y - 11.5, 27, 23);
      ctx.restore();
      label(ctx, String.fromCharCode(65 + j), geo.cx, y + 5, C.bg, { size: 12, align: 'center', weight: 700 });
      label(ctx, c.map((i) => '位' + (i + 1)).join('+') + ' ≡ ' + syn[j],
        geo.cx + 22, y + 4, bad ? C.bad : C.axis, { size: 10 });
    });
    label(ctx, '检查节点', geo.cx, geo.vy - 26, C.fg, { size: 11, align: 'center', weight: 700 });

    /* ---- 右侧（窄屏下方）账本 ---- */
    const px = geo.W >= 620 ? Math.min(geo.W - 152, geo.cx + 150) : 16;
    let py = geo.W >= 620 ? 96 : geo.vy + geo.pitch * n + 28;
    if (geo.W >= 620) {
      label(ctx, '迭代记录', px, py, C.fg, { size: 11.5, weight: 700 });
      py += 18;
      label(ctx, '轮次 → 报警条数', px, py, C.axis, { size: 9.5 });
      py += 16;
      label(ctx, '0 → ' + (history.length ? '—' : alarmCount), px, py, C.axis, { size: 10 });
      py += 14;
      history.slice(-8).forEach((h, i) => {
        const t = history.length - Math.min(8, history.length) + i + 1;
        label(ctx, t + ' → ' + h, px, py, h === 0 ? C.ok : C.fg,
          { size: 10, weight: h === 0 ? 700 : 400 });
        py += 14;
      });
      py += 8;
      label(ctx, '本轮翻位：' + (accused.size ? [...accused].map((i) => '位' + (i + 1)).join('、') : '（无）'),
        px, py, C.named('orange'), { size: 10 });
    }

    /* ---- 状态条 ---- */
    const sy = geo.H - 74;
    if (alarmCount === 0) {
      label(ctx, '全部检查通过 —— 已收敛到码字（或本来就没出错）', 20, sy, C.ok, { size: 12.5, weight: 700 });
    } else {
      label(ctx, alarmCount + ' 条检查在报警，嫌疑集中在：'
        + [...accused].map((i) => '位' + (i + 1)).join('、'), 20, sy, C.bad, { size: 12, weight: 700 });
    }
    label(ctx, '比特翻转译码：每轮翻「被最多报警方程指着」的那一位，直到没人报警或开始来回震荡',
      20, sy + 20, C.axis, { size: 10.5 });

    ro.set('接收块', bits.join(''));
    ro.set('报警检查数', alarmCount + ' / ' + checks.length);
    ro.set('迭代轮次', String(round));
    ro.set('当前状态', alarmCount === 0 ? '已收敛' : '未收敛');
    ro.set('本轮翻位', accused.size ? [...accused].map((i) => '位' + (i + 1)).join('、') : '（无）');
  }

  function hit(x0, y0) {
    for (let i = 0; i < n; i += 1) {
      if (Math.abs(y0 - vY(i)) <= 13 && x0 >= geo.vx - 6 && x0 <= geo.vx + 24) return i;
    }
    return -1;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hit(x0, y0) >= 0 ? 'bit' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hit(x0, y0) >= 0 ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const i = hit(x0, y0);
      if (i < 0) return;
      bits[i] = 1 - bits[i];
      round = 0;
      history = [];
      accused = new Set();
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bStep.addEventListener('click', () => { stepRound(); draw(); });
  bReset.addEventListener('click', () => {
    bits = new Array(n).fill(0);
    round = 0;
    history = [];
    accused = new Set();
    draw();
  });
  bFlip2.addEventListener('click', () => {
    const i = Math.floor(Math.random() * n);
    bits[i] = 1 - bits[i];
    round = 0;
    history = [];
    accused = new Set();
    draw();
  });

  let acc = 0;
  const player = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.9) return;
      acc = 0;
      stepRound();
      draw();
    },
    onReset() {
      bits = new Array(n).fill(0).map(() => 1);
      round = 0;
      history = [];
      accused = new Set();
      acc = 0;
      draw();
    },
  });

  draw();
  cv.redraw = draw;
  return { destroy() { player.stop(); } };
}
