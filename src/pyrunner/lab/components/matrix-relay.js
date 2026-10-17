/* =========================================================================
 * lab 组件：matrix-relay —— 矩阵接力的「同屏赛跑」（线代 35 / 45 课共用）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "matrix-relay", "mode": "multiply",
 *     "title": "AB 与 BA 同屏赛跑", "e": 1, "f": 1, "g": 0, "h": 1 }
 *   ```
 *   ```lab
 *   { "type": "matrix-relay", "mode": "inverse",
 *     "title": "A 出门、A⁻¹ 回家", "a": 1, "b": 1, "c": 0, "d": 1 }
 *   ```
 *
 * 字段：
 *   mode = 'multiply'：主路径「先 B 后 A」与对照路径「先 A 后 B」同屏走一
 *          遍。四条滑块调 B = [[e,f],[g,h]]，分段按钮换 A 的预设
 *          （左转 90° / 横拉 2 倍 / 左右镜像）。
 *   mode = 'inverse' ：第一棒 A 出门、第二棒 A⁻¹ 回家。四条滑块调
 *          A = [[a,b],[c,d]]，预设含「近奇异」——det 逼近 0 时房子被
 *          压成一条线、A⁻¹ 的元素爆炸。
 *   t 接力进度（0..1），课文可给初值；其余字段同名覆盖滑块初值。
 *
 * 能拖什么：画布上任意处左右拖 = 拉时间轴；也可以用「时间 t」滑块，
 *   或按播放按钮让接力自己走一遍（reduced-motion 下播放自动禁用）。
 *
 * 看什么：网格式小房子在两条路线上各走一遍——蓝实线是主路径、橙虚线是
 *   对照路径。multiply 模式 t→1 时两组顶点之间连出分岔线，「AB ≠ BA」
 *   是量出来的而不是背出来的；inverse 模式 t = 0.5 的橙虚影是「出门时
 *   的样子」，回家路上每一步都踩在 A⁻¹ 的放大倍率上。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented, buildReadout,
  anim, label, fmt, clamp, setSliderRow, mergeSpec, clearBg,
} from '../core.js';

/* ---------- 2×2 矩阵工具（数组记法 [m11, m12, m21, m22]） ---------- */

const mul = (X, Y) => [
  X[0] * Y[0] + X[1] * Y[2],
  X[0] * Y[1] + X[1] * Y[3],
  X[2] * Y[0] + X[3] * Y[2],
  X[2] * Y[1] + X[3] * Y[3],
];
const det2 = (M) => M[0] * M[3] - M[1] * M[2];
const apply = (M, x, y) => [M[0] * x + M[1] * y, M[2] * x + M[3] * y];
/* 从单位矩阵连续长到 M（s = 0 → I，s = 1 → M）：接力的"半程状态" */
const interpI = (M, s) => [1 + (M[0] - 1) * s, M[1] * s, M[2] * s, 1 + (M[3] - 1) * s];
const frob = (M) => Math.hypot(M[0], M[1], M[2], M[3]);
const matStr = (M) => '[' + M.map((v) => fmt(v, 2)).join(', ') + ']';
const inv2 = (M) => {
  const d = det2(M);
  if (Math.abs(d) < 1e-9 || !isFinite(d)) return null;
  return [M[3] / d, -M[1] / d, -M[2] / d, M[0] / d];
};

/* 跟随接力走的小房子：底 + 屋顶 + 一扇门（门也参与顶点差的计算） */
const HOUSE = [[-0.7, -0.9], [0.7, -0.9], [0.7, 0.2], [0, 0.8], [-0.7, 0.2]];
const DOOR = [[-0.22, -0.9], [-0.22, -0.4], [0.22, -0.4], [0.22, -0.9]];
const VERTICES = HOUSE.concat(DOOR);
const GRID_G = 1.8;
const GRID_CORNERS = [
  [-GRID_G, -GRID_G], [GRID_G, -GRID_G], [GRID_G, GRID_G], [-GRID_G, GRID_G],
];

/* A 的预设（multiply 模式）：对照的是"顺序"，A 本身取常见的三种动作 */
const A_PRESETS = [
  { value: 'rotate', label: 'A = 左转 90°', M: [0, -1, 1, 0] },
  { value: 'stretch', label: 'A = 横拉 2 倍', M: [2, 0, 0, 1] },
  { value: 'mirror', label: 'A = 左右镜像', M: [-1, 0, 0, 1] },
];

/* inverse 模式的预设：最后一格专供"近奇异塌缩" */
const INV_PRESETS = [
  { value: 'shear', label: '剪切', M: [1, 1, 0, 1] },
  { value: 'scale', label: '横 2 竖 3', M: [2, 0, 0, 3] },
  { value: 'rotate', label: '左转 90°', M: [0, -1, 1, 0] },
  { value: 'collapse', label: '近奇异（det ≈ 0.05）', M: [1, 1, 1, 1.05] },
];

/* 接力矩阵：第一棒走 [0, 0.5]，第二棒走 [0.5, 1]。
   second 为 null 时第二棒缺席（逆不存在），画面停在第一棒终点。 */
function relayMatrix(path, t) {
  const s1 = t <= 0.5 ? t / 0.5 : 1;
  const M1 = interpI(path.first, s1);
  if (!path.second) return M1;
  const s2 = t <= 0.5 ? 0 : (t - 0.5) / 0.5;
  return mul(interpI(path.second, s2), M1);
}

export default function render(host, spec) {
  const isMult = spec.mode !== 'inverse';

  const cv = setupCanvas(host, 400);
  /* 触屏上让"拖时间"不被页面滚动抢走 */
  cv.canvas.style.touchAction = 'none';
  cv.canvas.style.cursor = 'ew-resize';

  const geo = { x0: 0, y0: 0, size: 0, cx: 0, cy: 0, s: 1 };
  const X = (v) => geo.cx + v * geo.s;
  const Y = (v) => geo.cy - v * geo.s;

  let aPreset = 0;
  let order = 0; /* multiply：0 = 主路径 AB（先 B 后 A），1 = 主路径 BA */
  let sl = null;

  const TIME_I = 4; /* 滑块第 5 行固定是时间 t */

  /* ---------- 状态 ---------- */

  function state() {
    if (isMult) {
      const A = A_PRESETS[aPreset].M;
      const B = [sl.state.e, sl.state.f, sl.state.g, sl.state.h];
      const main = order === 0 ? { first: B, second: A } : { first: A, second: B };
      const ghost = order === 0 ? { first: A, second: B } : { first: B, second: A };
      return { A, B, main, ghost, AB: mul(A, B), BA: mul(B, A) };
    }
    const A = [sl.state.a, sl.state.b, sl.state.c, sl.state.d];
    const Ainv = inv2(A);
    /* 虚影 = "出门时的样子"：静态停在 A 的房子上（second 为 null） */
    return { A, Ainv, main: { first: A, second: Ainv }, ghost: { first: A, second: null } };
  }

  /* 视野半径：两条路线全程扫过的最大坐标（翻滑块时平滑改比例） */
  function radiusFor(st) {
    let r = 1.6;
    [st.main, st.ghost].forEach((path) => {
      for (let i = 0; i <= 8; i += 1) {
        const M = relayMatrix(path, i / 8);
        GRID_CORNERS.forEach(([x, y]) => {
          const q = apply(M, x, y);
          r = Math.max(r, Math.abs(q.x), Math.abs(q.y));
        });
      }
    });
    return clamp(r * 1.06, 2, 3.8);
  }

  /* ---------- 绘图小件 ---------- */

  function shapePath(ctx, M, pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const [sx, sy] = apply(M, x, y);
      if (i === 0) ctx.moveTo(X(sx), Y(sy));
      else ctx.lineTo(X(sx), Y(sy));
    });
    ctx.closePath();
  }

  function morphGrid(ctx, M, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -2; k <= 2; k += 1) {
      let p = apply(M, k, -GRID_G);
      let q = apply(M, k, GRID_G);
      ctx.moveTo(X(p[0]), Y(p[1]));
      ctx.lineTo(X(q[0]), Y(q[1]));
      p = apply(M, -GRID_G, k);
      q = apply(M, GRID_G, k);
      ctx.moveTo(X(p[0]), Y(p[1]));
      ctx.lineTo(X(q[0]), Y(q[1]));
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    if (!sl) return;
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const st = state();
    const t = clamp(sl.state.t, 0, 1);
    const plot = Math.max(Math.min(W - 12, H - 76), 150);
    geo.size = plot;
    geo.x0 = (W - plot) / 2;
    geo.y0 = 34;
    geo.cx = geo.x0 + plot / 2;
    geo.cy = geo.y0 + plot / 2;
    geo.s = (plot * 0.94) / (2 * radiusFor(st));

    const Mmain = relayMatrix(st.main, t);
    const Mghost = relayMatrix(st.ghost, t);
    const legend = isMult
      ? '蓝实线 = 主路径（' + (order === 0 ? '先 B 后 A' : '先 A 后 B') + '）· 橙虚线 = 对照路径'
      : '蓝实线 = A 出门 · 橙虚线 = 出门时的样子';

    label(ctx, legend, geo.x0, 16, C.fg, { size: 12, weight: 600 });

    /* 汇总量：用于课文读数的「顶点最大差」/「敏感度」 */
    let maxDiff = 0;
    if (isMult) {
      VERTICES.forEach(([x, y]) => {
        const p = apply(st.AB, x, y);
        const q = apply(st.BA, x, y);
        maxDiff = Math.max(maxDiff, Math.hypot(p[0] - q[0], p[1] - q[1]));
      });
    }
    const detA = det2(st.A);
    const sens = st.Ainv ? frob(st.A) * frob(st.Ainv) : Infinity;

    /* 画面主体：夹在绘图区里画 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(geo.x0, geo.y0, plot, plot);
    ctx.clip();

    /* ① 未变形的参考网格（最淡的一层，用来看"动了多少"） */
    morphGrid(ctx, [1, 0, 0, 1], C.grid, 1);

    /* ② 对照路径的网格与房子 */
    morphGrid(ctx, Mghost, C.accent2, 0.22);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.85;
    shapePath(ctx, Mghost, HOUSE);
    ctx.stroke();
    shapePath(ctx, Mghost, DOOR);
    ctx.stroke();
    ctx.restore();

    /* ③ 主路径的网格、房子与两支基箭头 */
    morphGrid(ctx, Mmain, C.accent, 0.34);
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = C.accent;
    shapePath(ctx, Mmain, HOUSE);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    shapePath(ctx, Mmain, HOUSE);
    ctx.stroke();
    shapePath(ctx, Mmain, DOOR);
    ctx.stroke();
    ctx.restore();

    const o = apply(Mmain, 0, 0);
    const ei = apply(Mmain, 1, 0);
    const ej = apply(Mmain, 0, 1);
    ctx.save();
    ctx.strokeStyle = C.named('green');
    ctx.fillStyle = C.named('green');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(o[0]), Y(o[1]));
    ctx.lineTo(X(ei[0]), Y(ei[1]));
    ctx.moveTo(X(o[0]), Y(o[1]));
    ctx.lineTo(X(ej[0]), Y(ej[1]));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(ei[0]), Y(ei[1]), 3, 0, Math.PI * 2);
    ctx.arc(X(ej[0]), Y(ej[1]), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, 'i', X(ei[0]) + 6, Y(ei[1]) + 4, C.named('green'), { size: 11, weight: 700 });
    label(ctx, 'j', X(ej[0]) + 6, Y(ej[1]) - 4, C.named('green'), { size: 11, weight: 700 });

    /* ④ 分岔线：t 收尾时把"两条路线各自的落点"连起来（量出差异） */
    if (isMult && t > 0.7) {
      const fade = clamp((t - 0.7) / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = C.named('red');
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      VERTICES.forEach(([x, y]) => {
        const p = apply(Mmain, x, y);
        const q = apply(Mghost, x, y);
        ctx.moveTo(X(p[0]), Y(p[1]));
        ctx.lineTo(X(q[0]), Y(q[1]));
      });
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore(); /* 解除绘图区裁剪 */

    /* ⑤ 顶部状态与告警 */
    const half = t <= 0.5;
    const legName = isMult
      ? (half ? '第一棒：' + (order === 0 ? 'B' : 'A') : '第二棒：' + (order === 0 ? 'A' : 'B'))
      : (half ? '第一棒：A 出门' : '第二棒：A⁻¹ 回家');
    const pct = Math.round((half ? t / 0.5 : (t - 0.5) / 0.5) * 100);
    const stageText = t >= 0.995
      ? (isMult ? '两条路线都已到达（看红色分岔线）' : '已回家：房子与出发点重合')
      : legName + '（' + pct + '%）';
    label(ctx, stageText, geo.x0 + plot, 16, C.accent,
      { size: 12, weight: 700, align: 'right' });

    if (!isMult && Math.abs(detA) < 0.05) {
      const dead = Math.abs(detA) < 1e-3 || !st.Ainv;
      label(ctx, dead ? 'det ≈ 0：平面被压成一条线，撤销键不存在' : 'det 很小：A⁻¹ 的元素正在爆炸',
        geo.x0, geo.y0 + plot + 34, C.bad, { size: 11.5, weight: 700 });
    }

    /* ⑥ 时间轴（拖这里或拖画布都可以） */
    const by = geo.y0 + plot + 14;
    const bx0 = geo.x0 + 6;
    const bx1 = geo.x0 + plot - 6;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx0, by);
    ctx.lineTo(bx1, by);
    ctx.stroke();
    ctx.strokeStyle = C.accent;
    ctx.beginPath();
    ctx.moveTo(bx0, by);
    ctx.lineTo(bx0 + (bx1 - bx0) * t, by);
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.arc(bx0 + (bx1 - bx0) * t, by, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    label(ctx, '时间 t = ' + fmt(t, 2) + '（在画布上左右拖，或拖下面的时间滑块）',
      geo.x0, by + 20, C.axis, { size: 11 });

    /* ⑦ 读数条 */
    if (isMult) {
      ro.set('时间', fmt(t, 2) + ' · ' + (t >= 0.995 ? '已完成' : half ? '第一棒进行中' : '第二棒进行中'));
      ro.set('路径 AB', matStr(st.AB) + '（先 B 后 A）');
      ro.set('路径 BA', matStr(st.BA) + '（先 A 后 B）');
      ro.set('顶点最大差', fmt(maxDiff, 2) + (maxDiff < 1e-6 ? '：这一对恰好可交换' : '：顺序不同，落点不同'));
      ro.set('det 接力', 'det A = ' + fmt(detA, 2) + '，det B = ' + fmt(det2(st.B), 2)
        + '，det(AB) = ' + fmt(det2(st.AB), 2));
    } else {
      ro.set('时间', fmt(t, 2) + ' · ' + (half ? 'A 正在出门' : 'A⁻¹ 正在送货回家'));
      ro.set('A', matStr(st.A));
      ro.set('det A', fmt(detA, 3));
      ro.set('A⁻¹', st.Ainv ? matStr(st.Ainv) : '不存在（det = 0）');
      ro.set('敏感度', st.Ainv
        ? fmt(sens, 1) + '（det 越小越抖；det→0 时爆表）'
        : '∞（拆不回去）');
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout(isMult
    ? { 时间: '—', '路径 AB': '—', '路径 BA': '—', 顶点最大差: '—', 'det 接力': '—' }
    : { 时间: '—', A: '—', 'det A': '—', 'A⁻¹': '—', 敏感度: '—' });
  host.appendChild(ro.box);

  const BASE = isMult
    ? [
      { name: 'e', label: 'B 的 e', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 'f', label: 'B 的 f', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 'g', label: 'B 的 g', min: -2, max: 2, step: 0.05, value: 0 },
      { name: 'h', label: 'B 的 h', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 't', label: '时间 t', min: 0, max: 1, step: 0.01, value: 0 },
    ]
    : [
      { name: 'a', label: 'A 的 a', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 'b', label: 'A 的 b', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 'c', label: 'A 的 c', min: -2, max: 2, step: 0.05, value: 0 },
      { name: 'd', label: 'A 的 d', min: -2, max: 2, step: 0.05, value: 1 },
      { name: 't', label: '时间 t', min: 0, max: 1, step: 0.01, value: 0 },
    ];
  sl = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => draw());

  const segRows = [];
  if (isMult) {
    segRows.push(buildSegmented(
      [{ value: 'AB', label: '主路径 AB（先 B 后 A）' }, { value: 'BA', label: '主路径 BA（先 A 后 B）' }],
      order === 0 ? 'AB' : 'BA',
      (v) => { order = v === 'BA' ? 1 : 0; draw(); },
    ));
    segRows.push(buildSegmented(
      A_PRESETS.map((p) => ({ value: p.value, label: p.label })),
      A_PRESETS[aPreset].value,
      (v) => {
        aPreset = Math.max(0, A_PRESETS.findIndex((p) => p.value === v));
        draw();
      },
    ));
  } else {
    segRows.push(buildSegmented(
      INV_PRESETS.map((p) => ({ value: p.value, label: p.label })),
      INV_PRESETS[0].value,
      (v) => {
        const p = INV_PRESETS.find((it) => it.value === v) || INV_PRESETS[0];
        ['a', 'b', 'c', 'd'].forEach((n, i) => setSliderRow(sl, i, p.M[i], 2, n));
        draw();
      },
    ));
  }
  segRows.forEach((box) => host.appendChild(box));

  /* 播放：2 秒走完全程；减动效用户在 anim 内部已被禁用 */
  const ap = anim(host, {
    onTick(dt) {
      const next = clamp(sl.state.t + dt / 2, 0, 1);
      setSliderRow(sl, TIME_I, Math.round(next * 100) / 100, 2, 't');
      draw();
      if (next >= 1) ap.stop();
    },
    onReset() {
      setSliderRow(sl, TIME_I, 0, 2, 't');
      draw();
    },
  });

  /* ---------- 指针：左右拖 = 拉时间轴 ---------- */

  let dragT = 0;
  let dragX = 0;
  bindPointer(cv.canvas, {
    pick(x, y) {
      const inside = x >= geo.x0 - 12 && x <= geo.x0 + geo.size + 12
        && y >= geo.y0 - 12 && y <= geo.y0 + geo.size + 46;
      return inside ? 'time' : null;
    },
    down(id, x, y) {
      dragT = sl.state.t;
      dragX = x;
      ap.stop();
      void y;
    },
    move(id, x, y) {
      const span = Math.max(geo.size, 200) * 0.85;
      const next = clamp(dragT + (x - dragX) / span, 0, 1);
      setSliderRow(sl, TIME_I, Math.round(next * 100) / 100, 2, 't');
      draw();
      void y;
    },
  });

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sl.box,
    destroy() {
      ap.stop();
      cv.redraw = null;
    },
  };
}
