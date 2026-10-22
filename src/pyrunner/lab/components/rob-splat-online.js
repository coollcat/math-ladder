/* =========================================================================
 * rob-splat-online —— 一维可微地图：冻结一方，调另一方（第 65 章 · 3DGS-SLAM）
 * -------------------------------------------------------------------------
 * 场景是一维的（一条走廊上的亮度分布），所以每一步都能算清、也都能画出来：
 *   · 地图 = 4 枚高斯的信念（中心 / 宽度 / 亮度）；
 *   · 真实世界 = 地图 + 一个「还没建进地图的新物件」（位置 2.1、亮度 1.3）；
 *   · 相机站在真值 2.4 处，拍下一段 ±0.55 米的照片。
 *
 * 三个模式＝SLAM 的三条纪律：
 *   track（跟踪）：地图冻结，扫位姿 p 找光度误差的谷底。
 *       因为新物件没进地图，谷底**被拽偏**到 2.894（真值 2.4）——
 *       这就是「地图的疆域就是跟踪的疆域」的定量版。
 *   map（建图）：位姿冻结，在残差最大的方向上补一枚高斯。误差台阶式下降。
 *   joint（同时调）：让位姿与整张地图一起平移 s——照片一模一样，误差曲线是一条
 *       水平线（对 s 毫无分辨力）。这不是「解对了」，是「根本没定解」，
 *       也正是必须交替冻结的理由。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "rob-splat-online", "mode": "track" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, mkBtn,
  buildSliders, buildToolbar, buildSegmented, buildReadout, clearBg, mergeSpec,
} from '../core.js';

/* 已建图的高斯：中心 / 宽度 / 亮度 */
const MAP0 = [
  [1.2, 0.06, 1.0],
  [1.6, 0.05, 0.7],
  [2.6, 0.07, 0.9],
  [3.4, 0.05, 0.6],
];
/* 真实世界里多出来的东西：还没被建进地图 */
const NEW_OBJ = [2.1, 0.10, 1.3];
const TRUE_POSE = 2.4;
const WIN = 0.55;          /* 相机窗口：±0.55 米 */
const NPIX = 221;          /* 照片分辨率：221 个像素 */

const gauss = (px, mu, sig, amp) => amp * Math.exp(-((px - mu) ** 2) / (2 * sig * sig));
const renderAt = (px, gs) => gs.reduce((s, g) => s + gauss(px, g[0], g[1], g[2]), 0);
const sceneAt = (px) => renderAt(px, MAP0) + gauss(px, NEW_OBJ[0], NEW_OBJ[1], NEW_OBJ[2]);

/* 相机拍下的那一帧（固定不变：世界没动，是相机在动） */
const PHOTO = [];
for (let i = 0; i < NPIX; i += 1) {
  const u = -WIN + (2 * WIN * i) / (NPIX - 1);
  PHOTO.push({ u, v: sceneAt(TRUE_POSE + u) });
}

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = ['track', 'map', 'joint'].includes(safe.mode) ? safe.mode : 'track';

  let gaussians = MAP0.map((g) => g.slice());
  let photo = PHOTO.slice();
  let pose = TRUE_POSE;
  let jointShift = 0;
  let mapSteps = 0;

  function resetAll() {
    gaussians = MAP0.map((g) => g.slice());
    photo = PHOTO.slice();
    pose = TRUE_POSE;
    jointShift = 0;
    mapSteps = 0;
  }

  /* 当前地图（joint 模式下整张地图一起平移） */
  function currentMap() {
    if (mode !== 'joint') return gaussians;
    return gaussians.map((g) => [g[0] + jointShift, g[1], g[2]]);
  }

  /* 光度误差：渲染 vs 照片，逐像素差平方和 */
  function photoErr(p, gs) {
    let e = 0;
    for (let i = 0; i < photo.length; i += 1) {
      const d = renderAt(p + photo[i].u, gs) - photo[i].v;
      e += d * d;
    }
    return e;
  }

  /* 冻结地图，网格扫描位姿 */
  function bestPose(gs) {
    let best = null;
    let bestErr = Infinity;
    for (let p = 1.6; p <= 3.4001; p += 0.002) {
      const e = photoErr(p, gs);
      if (e < bestErr) { bestErr = e; best = p; }
    }
    return { p: best, e: bestErr };
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    模式: '—',
    相机位姿: '—',
    光度误差: '—',
    高斯枚数: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [
      { label: '跟踪（冻结地图）', value: 'track' },
      { label: '建图（冻结位姿）', value: 'map' },
      { label: '同时调（对照）', value: 'joint' },
    ],
    mode,
    (v) => {
      mode = v;
      if (mode === 'joint') jointShift = 0;
      sync();
      draw();
    },
  ));

  const base = [
    { name: 'pose', label: '相机位姿 p（米）', min: 1.6, max: 3.4, step: 0.002, value: pose, fmt: 3 },
    { name: 'shift', label: '位姿与地图一起平移 s（米）', min: -0.6, max: 0.6, step: 0.01, value: jointShift, fmt: 2 },
  ];
  const sliders = buildSliders({ sliders: mergeSpec(base, safe) }, () => {
    pose = sliders.state.pose;
    jointShift = sliders.state.shift;
    sync();
    draw();
  });

  const bBest = mkBtn('扫一遍找谷底');
  const bAdd = mkBtn('补一枚高斯');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bBest, bAdd, bReset));

  const cv = setupCanvas(host, 430);
  const geo = { W: 0, H: 0 };

  /* ---------- 绘制 ---------- */

  function drawStrip(C, ctx, y0, h, curveFn, color, fill) {
    const W = geo.W;
    const padL = 52;
    const padR = 20;
    const x0 = padL;
    const pw = W - padL - padR;
    let maxV = 0.05;
    for (let i = 0; i < NPIX; i += 1) {
      const u = -WIN + (2 * WIN * i) / (NPIX - 1);
      maxV = Math.max(maxV, curveFn(u));
    }
    const px = (i) => x0 + (i / (NPIX - 1)) * pw;
    const py = (v) => y0 + h - clamp(v / (maxV * 1.15), 0, 1) * h;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px(0), y0 + h);
    for (let i = 0; i < NPIX; i += 1) {
      const u = -WIN + (2 * WIN * i) / (NPIX - 1);
      ctx.lineTo(px(i), py(curveFn(u)));
    }
    ctx.lineTo(px(NPIX - 1), y0 + h);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
    /* 坐标轴 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + h);
    ctx.lineTo(x0 + pw, y0 + h);
    ctx.stroke();
    ctx.restore();
    label(ctx, '−0.55 m', x0, y0 + h + 13, C.grid, { size: 9, align: 'center' });
    label(ctx, '+0.55 m', x0 + pw, y0 + h + 13, C.grid, { size: 9, align: 'center' });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geo.W = W;
    geo.H = H;
    clearBg(ctx, W, H, C);

    const gs = currentMap();
    const curPose = pose;
    const err = photoErr(curPose, gs);

    /* --- 第一幅：照片 --- */
    label(ctx, '相机的照片（世界没变，是相机站在某个位置拍下的）', 10, 18, C.fg,
      { size: 11, weight: 700 });
    drawStrip(C, ctx, 30, 78, (u) => sceneAt(TRUE_POSE + u), C.axis, false);

    /* --- 第二幅：地图的渲染 --- */
    label(ctx, '地图的渲染：4 枚高斯愿意相信世界长这样'
      + (mapSteps ? '（已补 ' + mapSteps + ' 枚）' : '（还不知道那个新物件）'),
      10, 140, C.fg, { size: 11, weight: 700 });
    drawStrip(C, ctx, 152, 78, (u) => renderAt(curPose + u, gs), C.named('blue'), true);

    /* --- 第三幅：光度误差曲线 --- */
    const cy0 = 268;
    const cy1 = 372;
    const padL = 52;
    const padR = 20;
    const pLo = 1.6;
    const pHi = 3.4;
    const sx = (p) => padL + ((p - pLo) / (pHi - pLo)) * (W - padL - padR);

    label(ctx, '光度误差 E(p)：把相机放到不同位置，渲染与照片差多少', 10, cy0 - 10, C.fg,
      { size: 11, weight: 700 });

    if (mode === 'joint') {
      /* joint 模式下整条曲线塌成一条平的零线 */
      /* 把整条 E(s) 曲线扫出来：它必须是一条水平线 */
      let minE = Infinity;
      let maxE = -Infinity;
      for (let s = -0.6; s <= 0.6001; s += 0.01) {
        const g = gaussians.map(([mu, sig, amp]) => [mu + s, sig, amp]);
        const e = photoErr(pose + s, g);
        minE = Math.min(minE, e);
        maxE = Math.max(maxE, e);
      }
      /* joint 模式下 gs 已经把整张地图平移了 jointShift，位姿也必须跟着平移，
         否则比的是「平移后的地图」配「没平移的相机」，误差当然不是 0——
         以前这里少加了一个 jointShift，读数印出「光度误差 96.81（恒为 0）」，
         扫描口径说恒为 0、读数却给 96.81，自相矛盾。 */
      const flat = photoErr(curPose + jointShift, gs);
      ctx.save();
      ctx.strokeStyle = C.bad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx(pLo), cy1 - 6);
      ctx.lineTo(sx(pHi), cy1 - 6);
      ctx.stroke();
      ctx.restore();
      /* 这条线的**高度**是地图不完整造成的残余（≈60），**起伏**才是 0。
         写「E(s) ≡ 0」会把高度也说成 0，与左边画的线自相矛盾。 */
      label(ctx, 'E(s) ≡ ' + flat.toFixed(2) + '（水平线：起伏 ≡ 0）　（扫过 s ∈ [−0.6, 0.6]，最小 '
        + minE.toFixed(2) + '、最大 ' + maxE.toFixed(2) + '，起伏 '
        + Math.abs(maxE - minE).toExponential(1) + '）', sx(2.5), cy1 - 14, C.bad,
      { size: 10.5, weight: 700 });
      label(ctx, '位姿偏多少、整张地图就跟着偏多少——照片一模一样，误差对 s 一点分辨率都没有。'
        + '这不是「解对了」，而是「根本没定解」。', 10, cy1 + 22, C.axis, { size: 10 });
    } else {
      /* 真实曲线 */
      let maxE = 1e-9;
      const curve = [];
      for (let p = pLo; p <= pHi + 1e-9; p += 0.005) {
        const e = photoErr(p, gs);
        curve.push([p, e]);
        maxE = Math.max(maxE, e);
      }
      const ey = (e) => cy1 - clamp(e / (maxE * 1.05), 0, 1) * (cy1 - cy0 - 8);
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, cy1);
      ctx.lineTo(W - padR, cy1);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 2;
      ctx.beginPath();
      curve.forEach(([p, e], i) => {
        if (i === 0) ctx.moveTo(sx(p), ey(e));
        else ctx.lineTo(sx(p), ey(e));
      });
      ctx.stroke();
      ctx.restore();

      /* 真值竖线 */
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx(TRUE_POSE), cy0);
      ctx.lineTo(sx(TRUE_POSE), cy1);
      ctx.stroke();
      ctx.restore();
      label(ctx, '真值 2.4', sx(TRUE_POSE), cy0 + 8, C.axis, { size: 9.5, align: 'center' });

      /* 当前位姿标记 */
      ctx.save();
      ctx.fillStyle = C.named('orange');
      ctx.beginPath();
      ctx.arc(sx(curPose), ey(err), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, 'p = ' + curPose.toFixed(3), sx(curPose), ey(err) - 10, C.named('orange'),
        { size: 9.5, align: 'center' });

      /* 谷底 */
      const best = bestPose(gs);
      ctx.save();
      ctx.strokeStyle = C.ok;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sx(best.p), cy0);
      ctx.lineTo(sx(best.p), cy1);
      ctx.stroke();
      ctx.restore();
      label(ctx, '谷底 ' + best.p.toFixed(3), sx(best.p), cy0 + 24, C.ok,
        { size: 9.5, align: 'center', weight: 600 });
      label(ctx, 'p (米)', W - padR, cy1 + 15, C.axis, { size: 9.5, align: 'right' });
    }

    /* 判词 */
    let msg;
    if (mode === 'track') {
      const best = bestPose(gs);
      msg = Math.abs(best.p - TRUE_POSE) < 0.02
        ? '谷底落在 2.400：地图够全，跟踪就准。'
        : '谷底被拽到 ' + best.p.toFixed(3) + '（真值 2.4）：地图里没有那个新物件，'
          + '相机只好挪位置去「迁就」它——地图的疆域就是跟踪的疆域。';
    } else if (mode === 'map') {
      msg = mapSteps === 0
        ? '按「补一枚高斯」：在残差最大（渲染最不像照片）的方向上长出一枚新的。'
        : '已补 ' + mapSteps + ' 枚高斯，光度误差降到 ' + err.toFixed(2)
          + '。注意它降的是误差，不是把位姿拉回真值——两件事得靠交替才能同时做到。';
    } else {
      msg = 'joint 模式是反面教材：位姿与地图一起漂，照片完全不变——数据对「世界 + 相机」的组合零约束。';
    }
    label(ctx, msg, 10, H - 10, mode === 'joint' ? C.bad : C.axis, { size: 10 });
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const gs = currentMap();
    /* joint 模式下 gs 含 jointShift，判读位姿也必须是 pose + jointShift。 */
    const err = photoErr(pose + (mode === 'joint' ? jointShift : 0), gs);
    const best = bestPose(gs);
    ro.set('模式', mode === 'track' ? '跟踪：冻结地图调位姿'
      : mode === 'map' ? '建图：冻结位姿调地图' : '同时调（反面教材）');
    ro.set('相机位姿', pose.toFixed(3) + ' m（真值 2.400）');
    /* 别再写「恒为 0」了：joint 模式下误差曲线是一条**水平线**，但水平的高度
       是地图不完整造成的残余（约 59.9），不是 0。说成 0 会让人以为组件算错了。
       真正要强调的是「起伏 = 0」，也就是对平移毫无分辨率。 */
    ro.set('光度误差', err.toFixed(2) + (mode === 'joint' ? '（起伏 ≡ 0，但水平高度不为 0）' : ''));
    ro.set('高斯枚数', gs.length + ' 枚' + (mapSteps ? '（已补 ' + mapSteps + ' 枚）' : ''));
    ro.set('结论', mode === 'joint'
      ? '一整条零误差谷底：位姿与地图互相吸收'
      : Math.abs(best.p - TRUE_POSE) < 0.02
        ? '跟踪落在真值附近'
        : '谷底偏到 ' + best.p.toFixed(3) + '：地图缺东西把位姿拽走了');

    /* 让对应模式的滑块可见 */
    const rows = sliders.box.children;
    if (rows[0]) rows[0].style.display = mode === 'joint' ? 'none' : '';
    if (rows[1]) rows[1].style.display = mode === 'joint' ? '' : 'none';
  }

  function setSliderRow(i, v, digits) {
    const row = sliders.box.children[i];
    if (!row) return;
    const input = row.children[1];
    const val = row.children[2];
    if (input) input.value = String(v);
    if (val) val.textContent = digits === undefined ? String(v) : v.toFixed(digits);
  }

  /* ---------- 交互 ---------- */

  bBest.addEventListener('click', () => {
    if (mode === 'joint') return;
    const best = bestPose(currentMap());
    pose = best.p;
    setSliderRow(0, pose, 3);
    sliders.state.pose = pose;
    sync();
    draw();
  });

  bAdd.addEventListener('click', () => {
    if (mode === 'joint') return;
    /* 建图步：在残差最大（渲染最不像照片）的方向补一枚新高斯 */
    const gs = gaussians;
    let worst = -Infinity;
    let worstU = 0;
    for (let i = 0; i < photo.length; i += 1) {
      const r = photo[i].v - renderAt(pose + photo[i].u, gs);
      if (r > worst) { worst = r; worstU = photo[i].u; }
    }
    if (worst <= 0.02) return;
    gaussians = gs.concat([[pose + worstU, 0.10, worst]]);
    mapSteps += 1;
    sync();
    draw();
  });

  bReset.addEventListener('click', () => {
    resetAll();
    setSliderRow(0, TRUE_POSE, 3);
    setSliderRow(1, 0, 2);
    sliders.state.pose = TRUE_POSE;
    sliders.state.shift = 0;
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}