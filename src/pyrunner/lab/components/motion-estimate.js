/* =========================================================================
 * lab 组件：motion-estimate —— 块匹配与运动估计
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "motion-estimate",
 *     "title": "在搜索窗口里翻找最像的那一块",
 *     "blockSize": 16,
 *     "search": 8,
 *     "dx": 6,
 *     "dy": 0,
 *     "fast": false,
 *     "field": true
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：16×16 块、搜索半径 8、
 * 真实位移 (6, 0)、全搜索、画运动矢量场。
 *
 * 字段：
 *   blockSize  块边长 4/8/12/16/20/24，默认 16
 *   search     搜索半径（像素）2..12，默认 8
 *   dx / dy    当前帧相对参考帧的真实位移 −12..12，默认 (6, 0)
 *   fast       true = 三步搜索（引擎 blockMatch 的 fast 分支），默认 false = 全搜索
 *   field      是否在当前帧上画整幅运动矢量场，默认 true
 *
 * 能拖什么：
 *   在「参考帧」或「当前帧」上拖动 —— 换选中的块，右边的 SAD 曲面整个重算；
 *   搜索半径 / 块大小 / 位移（xy）四个滑块；
 *   「全搜索 / 三步搜索」「矢量场 开 / 关」两个分段按钮。
 *
 * 看什么：
 *   左：参考帧，白框是当前块的「原地」位置，虚线框是搜索窗口，橙框是找到的最像的一块。
 *   中：当前帧，白框是选中块，箭头是它的运动矢量（开矢量场时画出全部块的矢量）。
 *   右：SAD 曲面 —— 搜索窗口里每一个候选位置的匹配代价，蓝 = 代价低（像），
 *   红 = 代价高（不像）；蓝环是算法找到的最优点，叉号是真实位移。
 *   把搜索半径拖到比真实位移小，最优点会被逼到窗口边缘，矢量场立刻散掉。
 *
 * 用的引擎函数：synth / conv2 / KERNELS（合成带纹理的场景）/ blockMatch（运动估计本体）
 * 画面来源：程序化随机纹理经 conv2 平滑 + synth 的小球，不依赖外部视频。
 * 说明：引擎的 blockMatch 只返回最优矢量，不导出单个候选的代价，
 *      右侧 SAD 曲面由本地 sadSurface 按同一公式逐点算，仅用于可视化；
 *      三步搜索的路径同理，是引擎 fast 分支的镜像，估计结果仍以 blockMatch 为准。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildSegmented,
  buildReadout, label, polyline, fmt, clamp,
} from '../core.js';
import { synth, conv2, KERNELS, blockMatch } from '../engines/media.js';

const IW = 96;
const IH = 72;
const N = IW * IH;
const PAD = 16;          /* 大画布留边，保证平移后取窗口不出界 */
const BW = IW + PAD * 2;
const BH = IH + PAD * 2;

/* 场景底图：随机场经 3×3 盒式模糊 → 有纹理、处处唯一（块匹配才不歧义） */
function makeTexture(w, h) {
  const r = new Float64Array(w * h);
  for (let i = 0; i < r.length; i += 1) r[i] = Math.random();
  return conv2(r, w, h, KERNELS.boxBlur);
}

function makeBig() {
  const tex = makeTexture(BW, BH);
  const ball = synth(BW, BH, 'moving-ball', 30);   /* cx = 0.5，居中 */
  const img = new Float64Array(BW * BH);
  for (let i = 0; i < img.length; i += 1) img[i] = clamp(0.62 * tex[i] + 0.38 * ball[i], 0, 1);
  return img;
}

function cropView(big, ox, oy) {
  const out = new Float64Array(N);
  for (let y = 0; y < IH; y += 1) {
    for (let x = 0; x < IW; x += 1) {
      out[y * IW + x] = big[(oy + y) * BW + ox + x];
    }
  }
  return out;
}

function toCanvas(data, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d');
  const im = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const v = clamp(data[i], 0, 1) * 255;
    const k = i * 4;
    im.data[k] = v;
    im.data[k + 1] = v;
    im.data[k + 2] = v;
    im.data[k + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
}

export default function render(host, spec) {
  const big = makeBig();
  let bs = clamp(Math.round((spec.blockSize ?? 16) / 4) * 4, 4, 24);
  let R = clamp(Math.round(spec.search ?? 8), 2, 12);
  let tdx = clamp(Math.round(spec.dx ?? 6), -12, 12);
  let tdy = clamp(Math.round(spec.dy ?? 0), -12, 12);
  let fast = spec.fast === true;
  let showField = spec.field !== false;
  let selbx = 0;
  let selby = 0;

  let ref = null;
  let cur = null;
  let mvs = null;        /* blockMatch 的结果 */
  let surface = null;    /* 选中块的 SAD 曲面 */
  let path = [];         /* 三步搜索走过的候选点 */

  const cv = setupCanvas(host, 240);

  const seg1 = buildSegmented(
    [{ label: '全搜索', value: 'full' }, { label: '三步搜索', value: 'fast' }],
    fast ? 'fast' : 'full',
    (v) => { fast = v === 'fast'; recomputeAll(); },
  );
  const seg2 = buildSegmented(
    [{ label: '矢量场：开', value: 'on' }, { label: '矢量场：关', value: 'off' }],
    showField ? 'on' : 'off',
    (v) => { showField = v === 'on'; draw(); },
  );
  host.appendChild(seg1);
  host.appendChild(seg2);

  const ro = buildReadout({
    选中块: '—', 估计矢量: '—', 真实位移: '—', 最小SAD: '—', 搜索代价: '—', 矢量命中率: '—',
  });
  host.appendChild(ro.box);

  const box = { ref: null, cur: null, sad: null };

  /* 与 blockMatch 内部同一公式的单个候选代价（引擎未导出，这里只做可视化） */
  function sadAt(rx, ry, cx, cy) {
    const cl = (v, hi) => Math.min(Math.max(v, 0), hi);
    let s = 0;
    for (let y = 0; y < bs; y += 1) {
      for (let x = 0; x < bs; x += 1) {
        s += Math.abs(ref[cl(ry + y, IH - 1) * IW + cl(rx + x, IW - 1)]
          - cur[(cy + y) * IW + cx + x]);
      }
    }
    return s;
  }

  function sadSurface(cx, cy) {
    const n = 2 * R + 1;
    const s = new Float64Array(n * n);
    let best = Infinity;
    let bdx = 0;
    let bdy = 0;
    let worst = 0;
    for (let dy = -R; dy <= R; dy += 1) {
      for (let dx = -R; dx <= R; dx += 1) {
        const v = sadAt(cx + dx, cy + dy, cx, cy);
        s[(dy + R) * n + dx + R] = v;
        if (v < best) { best = v; bdx = dx; bdy = dy; }
        if (v > worst) worst = v;
      }
    }
    return { s, n, best, bdx, bdy, worst };
  }

  /* 三步搜索：引擎 fast 分支的镜像，这里额外记录走过的候选点用于画路径 */
  function threeStepPath(cx, cy) {
    const pts = [];
    let step = R / 2;
    let px = cx;
    let py = cy;
    while (step >= 1) {
      let bsad = Infinity;
      let bx = px;
      let by = py;
      for (let dy = -step; dy <= step; dy += step) {
        for (let dx = -step; dx <= step; dx += step) {
          const tx = clamp(Math.round(px + dx), 0, IW - bs);
          const ty = clamp(Math.round(py + dy), 0, IH - bs);
          const s = sadAt(tx, ty, cx, cy);
          pts.push({ dx: tx - cx, dy: ty - cy });
          if (s < bsad) { bsad = s; bx = tx; by = ty; }
        }
      }
      px = bx;
      py = by;
      step /= 2;
    }
    return pts;
  }

  function recomputeFrames() {
    /* cur = ref 平移 (−tdx, −tdy) 后的视图：ref(x+tdx, y+tdy) == cur(x, y) */
    ref = cropView(big, PAD, PAD);
    cur = cropView(big, PAD + tdx, PAD + tdy);
  }

  function recomputeAll() {
    recomputeFrames();
    mvs = blockMatch(ref, cur, IW, IH, bs, R, fast);
    const nb = { x: Math.max(0, Math.min(mvs.bw - 1, selbx)), y: Math.max(0, Math.min(mvs.bh - 1, selby)) };
    selbx = nb.x;
    selby = nb.y;
    recomputeSel();
  }

  function recomputeSel() {
    const cx = selbx * bs;
    const cy = selby * bs;
    surface = sadSurface(cx, cy);
    path = fast ? threeStepPath(cx, cy) : [];

    const mv = mvs.vectors[selby * mvs.bw + selbx] || { dx: 0, dy: 0, sad: 0 };
    let hit = 0;
    mvs.vectors.forEach((v) => {
      if (v.dx === tdx && v.dy === tdy) hit += 1;
    });
    const nFull = (2 * R + 1) * (2 * R + 1);
    const nFast = path.length || Math.max(1, Math.round(9 * Math.log2(Math.max(2, R))));

    ro.set('选中块', `(${selbx}, ${selby})，共 ${mvs.bw} × ${mvs.bh} 块`);
    ro.set('估计矢量', `(${mv.dx}, ${mv.dy})${mv.dx === tdx && mv.dy === tdy ? ' ✓ 命中' : ' ✗ 与真值不符'}`);
    ro.set('真实位移', `(${tdx}, ${tdy})`);
    ro.set('最小SAD', `${fmt(mv.sad, 0)}（每像素 ${fmt(mv.sad / (bs * bs), 3)}）`);
    ro.set('搜索代价', fast
      ? `三步搜索 ${nFast} 个候选点（全搜索要 ${nFull} 个，省 ${fmt((1 - nFast / nFull) * 100, 0)}%）`
      : `全搜索 ${nFull} 个候选点 × ${bs * bs} 像素`);
    ro.set('矢量命中率', `${hit} / ${mvs.vectors.length} 块的矢量与真实位移完全一致`);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const gap = 16;
    const pw = Math.min(196, (W - 20 - gap * 2) / 3);
    const ph = Math.round((pw * IH) / IW);
    const off = Math.max(10, (W - (pw * 3 + gap * 2)) / 2);
    const topY = 22;

    const r1 = { x: off, y: topY, w: pw, h: ph };
    const r2 = { x: off + pw + gap, y: topY, w: pw, h: ph };
    const r3 = { x: off + (pw + gap) * 2, y: topY, w: pw, h: ph };
    box.ref = r1;
    box.cur = r2;
    box.sad = r3;

    const k1 = pw / IW;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(toCanvas(ref, IW, IH), r1.x, r1.y, pw, ph);
    ctx.drawImage(toCanvas(cur, IW, IH), r2.x, r2.y, pw, ph);
    ctx.restore();

    const cx = selbx * bs;
    const cy = selby * bs;
    const mv = mvs.vectors[selby * mvs.bw + selbx] || { dx: 0, dy: 0 };

    /* --- 参考帧：原地白框 + 搜索窗口虚线框 + 命中橙框 --- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(r1.x + 0.5, r1.y + 0.5, pw - 1, ph - 1);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = C.accent;
    ctx.strokeRect(r1.x + (cx - R) * k1, r1.y + (cy - R) * k1, (bs + 2 * R) * k1, (bs + 2 * R) * k1);
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(r1.x + cx * k1, r1.y + cy * k1, bs * k1, bs * k1);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.strokeRect(r1.x + (cx + mv.dx) * k1, r1.y + (cy + mv.dy) * k1, bs * k1, bs * k1);

    /* --- 当前帧：选中块 + 运动矢量（可选整场） --- */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(r2.x + 0.5, r2.y + 0.5, pw - 1, ph - 1);
    if (showField) {
      mvs.vectors.forEach((v) => {
        const px = r2.x + (v.bx * bs + bs / 2) * k1;
        const py = r2.y + (v.by * bs + bs / 2) * k1;
        const ex = px + v.dx * k1;
        const ey = py + v.dy * k1;
        const bad = v.dx !== tdx || v.dy !== tdy;
        ctx.strokeStyle = bad ? C.named('red') : C.named('green');
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fillStyle = bad ? C.named('red') : C.named('green');
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(r2.x + cx * k1, r2.y + cy * k1, bs * k1, bs * k1);
    /* 选中块的矢量加粗 */
    const sx = r2.x + (cx + bs / 2) * k1;
    const sy = r2.y + (cy + bs / 2) * k1;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + mv.dx * k1, sy + mv.dy * k1);
    ctx.stroke();

    /* --- SAD 曲面 --- */
    const n = surface.n;
    const side = Math.min(pw, ph);
    const cell = side / n;
    const ox = r3.x + (pw - side) / 2;
    const oy = r3.y + (ph - side) / 2;
    const span = Math.max(1e-9, surface.worst - surface.best);
    for (let gy = 0; gy < n; gy += 1) {
      for (let gx = 0; gx < n; gx += 1) {
        const v = surface.s[gy * n + gx];
        const t = (v - surface.best) / span;
        ctx.fillStyle = C.soft;
        ctx.fillRect(ox + gx * cell, oy + gy * cell, Math.ceil(cell), Math.ceil(cell));
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.fillStyle = C.accent;
        ctx.fillRect(ox + gx * cell, oy + gy * cell, Math.ceil(cell), Math.ceil(cell));
        ctx.globalAlpha = 0.9 * t;
        ctx.fillStyle = C.named('red');
        ctx.fillRect(ox + gx * cell, oy + gy * cell, Math.ceil(cell), Math.ceil(cell));
        ctx.restore();
      }
    }
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, side - 1, side - 1);

    const mid = (n - 1) / 2;
    const toPx = (dx, dy) => [ox + (mid + dx + 0.5) * cell, oy + (mid + dy + 0.5) * cell];

    /* 三步搜索的路径 */
    if (path.length > 1) {
      polyline(ctx, path.map((p) => toPx(p.dx, p.dy)), 'rgba(255,255,255,0.65)', 1.2);
      path.forEach((p) => {
        const [px, py] = toPx(p.dx, p.dy);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    /* 真实位移：叉号 */
    if (Math.abs(tdx) <= R && Math.abs(tdy) <= R) {
      const [px, py] = toPx(tdx, tdy);
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 5);
      ctx.lineTo(px + 5, py + 5);
      ctx.moveTo(px + 5, py - 5);
      ctx.lineTo(px - 5, py + 5);
      ctx.stroke();
    }
    /* 最优点：环 */
    const [bx, by] = toPx(surface.bdx, surface.bdy);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(4, cell * 0.8), 0, Math.PI * 2);
    ctx.stroke();

    label(ctx, '参考帧（白=原地，虚线=搜索窗，橙=找到的块）', r1.x, r1.y - 6, C.fg,
      { size: 10, weight: 600 });
    label(ctx, '当前帧（箭头=运动矢量，红=与真值不符）', r2.x, r2.y - 6, C.fg,
      { size: 10, weight: 600 });
    label(ctx, `SAD 曲面（${n}×${n} 个候选位置）`, r3.x, r3.y - 6, C.fg, { size: 10, weight: 600 });
    label(ctx, '蓝=像（SAD 小）　红=不像　○=最优点　×=真实位移',
      r3.x, r3.y + ph + 14, C.fg, { size: 10 });
    label(ctx, '在左/中两帧上拖动 = 换选中的块；把搜索半径拖到小于真实位移，最优点会被逼到窗口边缘',
      10, H - 4, C.accent, { size: 11 });
  }

  function pickBlock(which, x, y) {
    const r = which === 'cur' ? box.cur : box.ref;
    if (!r) return;
    const bx = clamp(Math.floor(((x - r.x) / r.w) * mvs.bw), 0, mvs.bw - 1);
    const by = clamp(Math.floor(((y - r.y) / r.h) * mvs.bh), 0, mvs.bh - 1);
    if (bx === selbx && by === selby) return;
    selbx = bx;
    selby = by;
    recomputeSel();
    draw();
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const hit = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      if (hit(box.ref)) return 'ref';
      if (hit(box.cur)) return 'cur';
      return null;
    },
    down(id, x, y) { pickBlock(id, x, y); },
    move(id, x, y) { pickBlock(id, x, y); },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'search', label: '搜索半径 R', min: 2, max: 12, step: 1, value: R, fmt: 0 },
        { name: 'blockSize', label: '块大小', min: 4, max: 24, step: 4, value: bs, fmt: 0 },
        { name: 'dx', label: '真实位移 x', min: -12, max: 12, step: 1, value: tdx, fmt: 0 },
        { name: 'dy', label: '真实位移 y', min: -12, max: 12, step: 1, value: tdy, fmt: 0 },
      ],
    },
    (st) => {
      R = clamp(Math.round(st.search ?? R), 2, 12);
      bs = clamp(Math.round((st.blockSize ?? bs) / 4) * 4, 4, 24);
      tdx = clamp(Math.round(st.dx ?? tdx), -12, 12);
      tdy = clamp(Math.round(st.dy ?? tdy), -12, 12);
      recomputeAll();
      draw();
    },
  );

  recomputeAll();
  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
