/* =========================================================================
 * 随机账本：同一路径的普通账 / 平方账 / 左右端点 Itō 账（第 66 章）
 * -------------------------------------------------------------------------
 * 一条固定种子、固定细分（1024 个微增量）的布朗路径，被分成 m = 2^k 段。
 * 「单步」沿路径走一段，五本账同步累加：
 *   Σ|ΔB|            普通账（全变差）：越走越陡，分割越细涨得越高
 *   Σ(ΔB)²           平方账（二次变差）：钉在流逝的时间 T 附近
 *   Σ B_k ΔB_k       左端点账（Itō，合法）
 *   Σ B_{k+1} ΔB_k   右端点账（偷看未来，违规）
 *   Σ 中点 ΔB_k      中点账（Stratonovich）
 * 两条恒等式逐段核对：右 − 左 = 平方账；左 + 平方账/2 = (B_T² − B_0²)/2。
 *
 * 交互：单步 / 回退 / 播放 / 重置都是真正的步进状态机；「细分档」改分割
 * 粒度（同一条路径的嵌套细分，粗筛是细筛跳着取，三条账才有可比性）。
 * reduced-motion 用户禁用自动播放，单步直接给终态；滚出视口自动暂停。
 *
 * 契约（```lab 围栏里的 JSON）：
 *   {
 *     "type": "stochastic-ledger",
 *     "focus": "variation",     // variation | ito | all
 *     "level": 4,               // 细分档 k：分割数 m = 2^k，范围 2..7
 *     "seed": 7
 *   }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, polyline, fmt, clamp, el,
  buildSliders, mergeSpec, buildSegmented, buildToolbar, buildReadout, mkBtn,
  mulberry32, gaussOf, onScreen,
} from '../core.js';

const FINE = 1024;          // 最细一层：1024 个微增量，T = 1
const T_END = 1;
const STEP_DUR = 0.9;       // 速度 1 倍时，走一段的动画时长（秒）
const HOLD_DUR = 0.25;

const BASE_SLIDERS = [
  { name: 'level', label: '细分档 k（分割数 2^k）', min: 2, max: 7, step: 1, value: 4 },
  { name: 'speed', label: '播放速度（段/秒）', min: 0.5, max: 8, step: 0.5, value: 2.5, fmt: 1 },
];

const ROWS = [
  { key: 'tv', label: '普通账 Σ|ΔB|', color: 'orange', signed: false },
  { key: 'qv', label: '平方账 Σ(ΔB)²', color: 'blue', signed: false },
  { key: 'l', label: 'Itō 左端点账', color: 'green', signed: true },
  { key: 'r', label: '右端点账（违规）', color: 'red', signed: true },
  { key: 'mid', label: '中点账（Stratonovich）', color: 'purple', signed: true },
];

const easeInOut = (t) => {
  const u = clamp(t, 0, 1);
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
};

function buildBrownianPath(seed) {
  const rnd = mulberry32(seed);
  const sd = Math.sqrt(1 / FINE);
  const path = new Float64Array(FINE + 1);
  let b = 0;
  for (let i = 1; i <= FINE; i += 1) {
    b += gaussOf(rnd) * sd;
    path[i] = b;
  }
  return path;
}

export default function render(host, spec) {
  const seed = Number.isFinite(spec.seed) ? Math.round(spec.seed) : 7;
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cfg = {
    focus: ['variation', 'ito', 'all'].indexOf(spec.focus) >= 0 ? spec.focus : 'all',
  };

  const path = buildBrownianPath(seed);
  const bEnd = path[FINE];

  const sliders = buildSliders(
    { sliders: mergeSpec(BASE_SLIDERS, spec) },
    () => { rebuild(); },
  );

  const ro = buildReadout({
    分割: '—', 进度: '—', '普通账 Σ|ΔB|': '—', '平方账 Σ(ΔB)²': '—',
    '右 − 左': '—', '左 + 平方/2': '—',
  });
  host.appendChild(ro.box);

  const segFocus = buildSegmented(
    [
      { label: '普通账 vs 平方账', value: 'variation' },
      { label: 'Itō 左右端点', value: 'ito' },
      { label: '全部一起看', value: 'all' },
    ],
    cfg.focus,
    (v) => { cfg.focus = v; draw(); },
  );
  host.appendChild(segFocus);

  const btnStep = mkBtn('单步 ▶');
  const btnBack = mkBtn('回退一段');
  const btnPlay = mkBtn(reduced ? '减少动效' : '播放');
  const btnReset = mkBtn('重置');
  btnPlay.disabled = reduced;
  host.appendChild(buildToolbar(btnStep, btnBack));
  host.appendChild(buildToolbar(btnPlay, btnReset));

  const legend = el('div', 'ml-lab__legend');
  [
    ['同一路径', '固定种子的 1024 步布朗路径，只换分割粒度'],
    ['恒等式', '右 − 左 = 平方账（逐段精确，不是数值巧合）'],
  ].forEach(([k, v]) => legend.appendChild(el('span', null, k + '：' + v)));
  host.appendChild(legend);

  const cv = setupCanvas(host, 420);

  let m = 0;
  let stride = 0;
  let dSeg = null;            // 每段增量 ΔB
  let bSeg = null;            // 每段左端点 B_k
  let acc = null;             // 五本账的前缀和（长度 m+1）
  let c = 0;                  // 已完成的段数
  let segT = 0;
  let anim = false;
  let hold = 0;
  let playing = false;
  let visible = true;
  let raf = null;
  let last = 0;
  let plotRect = null;

  /* ---------- 数据 ---------- */

  function rebuild() {
    const k = Math.round(clamp(sliders.state.level, 2, 7));
    m = 2 ** k;
    stride = FINE / m;
    dSeg = new Float64Array(m);
    bSeg = new Float64Array(m + 1);
    for (let j = 0; j < m; j += 1) {
      bSeg[j] = path[j * stride];
      dSeg[j] = path[(j + 1) * stride] - path[j * stride];
    }
    bSeg[m] = path[FINE];
    acc = {
      tv: new Float64Array(m + 1),
      qv: new Float64Array(m + 1),
      l: new Float64Array(m + 1),
      r: new Float64Array(m + 1),
      mid: new Float64Array(m + 1),
    };
    for (let j = 0; j < m; j += 1) {
      const d = dSeg[j];
      acc.tv[j + 1] = acc.tv[j] + Math.abs(d);
      acc.qv[j + 1] = acc.qv[j] + d * d;
      acc.l[j + 1] = acc.l[j] + bSeg[j] * d;
      acc.r[j + 1] = acc.r[j] + bSeg[j + 1] * d;
      acc.mid[j + 1] = acc.mid[j] + ((bSeg[j] + bSeg[j + 1]) / 2) * d;
    }
    c = 0;
    segT = 0;
    anim = false;
    hold = 0;
    stopPlayback();
    draw();
  }

  /* 当前显示值：已完成前缀 + 进行中段的按比例贡献 */
  function live() {
    const s = anim ? segT : 0;
    const j = Math.min(c, m - 1);
    const d = dSeg[j];
    const out = {};
    Object.keys(acc).forEach((key) => { out[key] = acc[key][c]; });
    out.tv += Math.abs(d) * s;
    out.qv += d * d * s;
    out.l += bSeg[j] * d * s;
    out.r += bSeg[j + 1] * d * s;
    out.mid += ((bSeg[j] + bSeg[j + 1]) / 2) * d * s;
    out.floor = {
      tv: acc.tv[c], qv: acc.qv[c], l: acc.l[c], r: acc.r[c], mid: acc.mid[c],
    };
    return out;
  }

  /* ---------- 布局 ---------- */

  function layout() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    if (narrow) {
      const plotH = Math.round(H * 0.36);
      return {
        narrow,
        plot: { x: 10, y: 26, w: W - 20, h: plotH },
        ledger: { x: 10, y: 26 + plotH + 40, w: W - 20, h: H - (26 + plotH + 52) },
      };
    }
    return {
      narrow,
      plot: { x: 10, y: 26, w: Math.round(W * 0.54) - 12, h: H - 56 },
      ledger: { x: Math.round(W * 0.56), y: 30, w: W - Math.round(W * 0.56) - 12, h: H - 60 },
    };
  }

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const rects = layout();
    drawPath(ctx, rects.plot, C);
    drawLedger(ctx, rects.ledger, C, rects.narrow);
    label(ctx, '一条固定路径、固定分割：向右的累加是逐段完成的，不是滑块换图', 8, H - 20, C.grid, { size: 10 });
    label(ctx, '恒等式对每条路径逐段成立；「平方账 → T」的收敛定理要靠证明，一次抽样只是旁证', 8, H - 7, C.grid, { size: 10 });
    updateReadout();
  }

  function drawPath(ctx, rect, C) {
    plotRect = rect;
    let bMax = 1e-9;
    for (let i = 0; i <= FINE; i += 1) bMax = Math.max(bMax, Math.abs(path[i]));
    bMax *= 1.15;
    const px = (t) => rect.x + 26 + t * (rect.w - 40);
    const py = (b) => rect.y + rect.h / 2 - (b / bMax) * (rect.h / 2 - 14);
    label(ctx, 'B_t（一条布朗路径）', rect.x, rect.y - 8, C.fg, { size: 11, weight: 700 });
    /* 零线 + 时间轴 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(1), py(0));
    ctx.stroke();
    ctx.restore();
    /* 分割线（分割数不多时才画满） */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    const marks = m <= 32 ? m + 1 : 17;
    for (let i = 0; i < marks; i += 1) {
      const t = i / (marks - 1);
      ctx.moveTo(px(t), py(-bMax));
      ctx.lineTo(px(t), py(bMax));
    }
    ctx.stroke();
    ctx.restore();
    /* 路径（抽稀绘制） */
    const step = Math.max(1, Math.floor(FINE / 240));
    const pts = [];
    for (let i = 0; i <= FINE; i += step) pts.push([px(i / FINE), py(path[i])]);
    pts.push([px(1), py(path[FINE])]);
    polyline(ctx, pts, C.accent, 1.6);
    /* 已完成的部分加粗 */
    if (c > 0) {
      const done = [];
      const stop = Math.min(c * stride, FINE);
      for (let i = 0; i <= stop; i += step) done.push([px(i / FINE), py(path[i])]);
      done.push([px(stop / FINE), py(path[stop])]);
      polyline(ctx, done, C.named('green'), 2.6);
    }
    /* 当前段 + 光标 */
    const j = Math.min(c, m - 1);
    const s = anim ? easeInOut(segT) : 0;
    const t0 = j / m;
    const t1 = (j + 1) / m;
    polyline(ctx, [
      [px(t0), py(bSeg[j])],
      [px(t1), py(bSeg[j + 1])],
    ], C.accent2, 3.4);
    const ct = t0 + (t1 - t0) * s;
    const cb = bSeg[j] + dSeg[j] * s;
    ctx.save();
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(px(ct), py(cb), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, 't = ' + fmt(T_END * ct, 3), px(ct), rect.y + rect.h + 14, C.axis, { size: 9.5, align: 'center' });
    label(ctx, '第 ' + (Math.min(c, m - 1) + 1) + ' / ' + m + ' 段：ΔB = ' + fmt(dSeg[j], 4),
      rect.x + 30, rect.y + 12, C.accent2, { size: 10 });
  }

  function drawLedger(ctx, rect, C, narrow) {
    const L = live();
    const showRows = cfg.focus === 'all' ? ROWS : ROWS.filter((r) => (
      cfg.focus === 'variation'
        ? (r.key === 'tv' || r.key === 'qv')
        : (r.key === 'l' || r.key === 'r')
    ));
    const rowH = Math.min(30, Math.max(20, (rect.h - 78) / Math.max(showRows.length, 1)));
    const bx = rect.x + 96;
    const bw = rect.w - 106;
    label(ctx, '五本账（边算边对）', rect.x, rect.y - 6, C.fg, { size: 11, weight: 700 });
    const scale = {
      tv: Math.max(acc.tv[m] * 1.25, 1e-6),
      qv: Math.max(1.3 * Math.max(1, acc.qv[m]), 1e-6),
      l: Math.max(Math.abs(acc.l[m]), Math.abs(acc.r[m]), 0.3) * 1.3,
      r: Math.max(Math.abs(acc.l[m]), Math.abs(acc.r[m]), 0.3) * 1.3,
      mid: Math.max(Math.abs(acc.mid[m]), 0.3) * 1.3,
    };
    showRows.forEach((r, i) => {
      const y = rect.y + i * rowH;
      label(ctx, r.label, rect.x, y + 11, C.fg, { size: narrow ? 9.5 : 10, weight: 600 });
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, y + 2, bw, 11);
      ctx.restore();
      const v = L[r.key];
      if (r.signed) {
        /* 有符号账：从中心线往两边长 */
        const zero = bx + bw / 2;
        const w = (Math.abs(v) / scale[r.key]) * (bw / 2);
        ctx.save();
        ctx.fillStyle = C.named(r.color);
        ctx.fillRect(v >= 0 ? zero : zero - w, y + 2, Math.max(1.5, w), 11);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(zero + 0.5, y);
        ctx.lineTo(zero + 0.5, y + 15);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = C.named(r.color);
        ctx.fillRect(bx, y + 2, Math.max(1.5, (clamp(v / scale[r.key], 0, 1)) * bw), 11);
        ctx.restore();
      }
      label(ctx, fmt(v, 3), bx + bw, y + 11, hoverish(r.key) ? C.accent2 : C.fg, { size: 10, align: 'right', weight: 700 });
      if (r.key === 'qv') {
        const tx = bx + (T_END / scale.qv) * bw;
        ctx.save();
        ctx.strokeStyle = C.named('gray');
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(tx, y - 1);
        ctx.lineTo(tx, y + 16);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'T = 1', tx, y + rowH - 3, C.named('gray'), { size: 8.5, align: 'center' });
      }
    });
    /* 恒等式两行 */
    const iy = rect.y + showRows.length * rowH + 10;
    const id1 = L.r - L.l - L.qv;
    const id2 = L.floor.l + L.floor.qv / 2 - (bEnd * bEnd) / 2;
    label(ctx, '核对 ①：右 − 左 = ' + fmt(L.r - L.l, 3) + '，平方账 = ' + fmt(L.qv, 3)
      + '（差 ' + fmt(Math.abs(id1), 6) + '）', rect.x, iy, Math.abs(id1) < 1e-9 ? C.ok : C.bad, { size: 10 });
    label(ctx, '核对 ②（整段结算）：左 + 平方/2 = ' + fmt(L.floor.l + L.floor.qv / 2, 3)
      + '，B_T²/2 = ' + fmt((bEnd * bEnd) / 2, 3)
      + '（差 ' + fmt(Math.abs(id2), 6) + '）', rect.x, iy + 15, Math.abs(id2) < 1e-9 ? C.ok : C.bad, { size: 10 });
    label(ctx, '注：中点账恒等于 B_T²/2 —— 它把「右端点多算的那半份平方账」提前均分给了每段的两端',
      rect.x, iy + 30, C.grid, { size: 9 });
  }

  function hoverish(key) {
    if (cfg.focus === 'all') return false;
    if (cfg.focus === 'variation') return key === 'tv' || key === 'qv';
    return key === 'l' || key === 'r';
  }

  function updateReadout() {
    const L = live();
    ro.set('分割', 'm = ' + m + ' 段（细分档 ' + Math.round(sliders.state.level) + '，同一条路径的嵌套细分）');
    ro.set('进度', '第 ' + Math.min(c + (anim ? 1 : 0), m) + ' / ' + m + ' 段');
    ro.set('普通账 Σ|ΔB|', fmt(L.tv, 3) + '（最终 ' + fmt(acc.tv[m], 2) + '，没有天花板）');
    /* 措辞要小心：E[Σ(ΔB)²] = T 对**任何**分割都成立，但这是期望，
       不是这条路径的实测值。细分越粗，单次实现的涨落越大（相对标准差
       ≈ √(2/m)），所以读数 1.14～2.21 都可能出现。写成"理论端点 T = 1"
       容易被读成"应该等于 1"，反而让人以为组件算错了。 */
    ro.set('平方账 Σ(ΔB)²', fmt(L.qv, 3) + '（期望 = T = 1，单次实现会抖）');
    ro.set('右 − 左', fmt(L.r - L.l, 4));
    ro.set('左 + 平方/2', fmt(L.floor.l + L.floor.qv / 2, 4) + '（B_T²/2 = ' + fmt((bEnd * bEnd) / 2, 4) + '）');
  }

  /* ---------- 步进状态机 ---------- */

  function startRaf() {
    if (raf == null && !reduced) raf = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  function beginStep() {
    if (anim || c >= m) return false;
    if (reduced) {
      c += 1;
      segT = 0;
      hold = HOLD_DUR;
      return true;
    }
    anim = true;
    segT = 0;
    hold = 0;
    startRaf();
    return true;
  }

  function advance(dt) {
    const speed = sliders.state.speed || 1;
    if (anim) {
      segT += dt / (STEP_DUR / speed);
      if (segT >= 1) {
        segT = 0;
        anim = false;
        c = Math.min(c + 1, m);
        hold = HOLD_DUR;
      }
      return;
    }
    if (!playing) return;
    if (hold > 0) {
      hold = Math.max(0, hold - dt);
      return;
    }
    if (c < m) beginStep();
    else stopPlayback();
  }

  function tick(now) {
    raf = null;
    if (!host.isConnected) {
      stopPlayback();
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!visible) {
      stopRaf();
      return;
    }
    advance(dt);
    draw();
    if (playing || anim) startRaf();
  }

  function stopPlayback() {
    playing = false;
    btnPlay.textContent = reduced ? '减少动效' : '播放';
  }

  btnStep.addEventListener('click', () => { beginStep(); draw(); });
  btnBack.addEventListener('click', () => {
    if (anim) {
      anim = false;
      segT = 0;
    } else {
      c = Math.max(0, c - 1);
    }
    hold = 0;
    stopPlayback();
    stopRaf();
    draw();
  });
  btnPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    last = 0;
    if (playing && c >= m && !anim) playing = false;
    btnPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
    if (playing) startRaf();
    else stopRaf();
    draw();
  });
  btnReset.addEventListener('click', () => {
    stopPlayback();
    stopRaf();
    c = 0;
    segT = 0;
    anim = false;
    hold = 0;
    draw();
  });

  onScreen(host, (v) => {
    visible = v;
    if (!v) stopRaf();
    else if (playing || anim) startRaf();
  });

  rebuild();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() {
      stopPlayback();
      stopRaf();
      cv.redraw = null;
    },
  };
}
