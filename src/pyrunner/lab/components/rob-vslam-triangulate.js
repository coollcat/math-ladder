/* =========================================================================
 * rob-vslam-triangulate —— 视差三角化：一个公式，双向收费（第 65 章 · 视觉 SLAM）
 * -------------------------------------------------------------------------
 * 上半幅是「侧视图」：相机基线 t·f 固定，画面里同一个点的位移 Δs 决定深度
 *   Z = (t·f) / Δs。
 * 下半幅是「图像坐标」：同一批点被画在两帧的像素位置上，位移就是 Δs。
 *
 * 三颗**固定的**参照点 A/B/C 常驻在深度 2 / 3 / 4 米：它们共享同一个 t·f，
 * 位移严格按 1/Z 分布——「谁动得快谁就近」在画面上直接可读。
 * 第四颗**橙色测量点** M 才是滑块操纵的对象：
 *   · 视角 A「读深度」：拖 Δs → 由 Z = t·f/Δs 反读深度，与 M 的真实深度对照；
 *   · 视角 B「读平移」：拖真实深度 → 位移随之变，反过来校 t·f = Δs × Z。
 *   · 噪声地板默认开着：Δs 小于 1 像素时机器拒绝给数，只报不可信。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "rob-vslam-triangulate", "tf": 12, "noise": 1 }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, mkBtn,
  buildSliders, buildToolbar, buildSegmented, buildReadout, clearBg, mergeSpec,
} from '../core.js';

/* 三颗常驻参照点：深度固定，位移由 t·f 反比给出 */
const REFS = [
  { id: 'A', z: 2, color: 'red' },
  { id: 'B', z: 3, color: 'green' },
  { id: 'C', z: 4, color: 'blue' },
];

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let tf = Number.isFinite(safe.tf) ? clamp(safe.tf, 4, 24) : 12;
  const noiseFloor = Number.isFinite(safe.noise) ? clamp(safe.noise, 0.2, 4) : 1;

  let mode = 'depth';            /* depth | shift */
  let dsRead = 3;                /* 测量点 M 的位移读数（像素） */
  let zTrue = 3;                 /* 测量点 M 的真实深度（米） */
  let useNoise = true;

  /* 当前这颗测量点的位移与反读深度 */
  function measuredDs() {
    return mode === 'depth' ? dsRead : tf / Math.max(0.1, zTrue);
  }
  function measuredZ() {
    const ds = measuredDs();
    return ds > 0 ? tf / ds : Infinity;
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    模式: '—',
    '测量点位移': '—',
    '反读深度': '—',
    相对误差: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [{ label: '视角 A：从位移读深度', value: 'depth' }, { label: '视角 B：从深度读位移', value: 'shift' }],
    mode,
    (v) => {
      mode = v;
      sync();
      draw();
    },
  ));

  const base = [
    { name: 'tf', label: '既知量 t·f（像素·米）', min: 4, max: 24, step: 1, value: tf, fmt: 0 },
    { name: 'ds', label: '测量点的位移 Δs（像素）', min: 0.2, max: 8, step: 0.1, value: dsRead, fmt: 1 },
    { name: 'ztrue', label: '测量点的真实深度 Z（米）', min: 1, max: 12, step: 0.1, value: zTrue, fmt: 1 },
  ];
  const sliders = buildSliders({ sliders: mergeSpec(base, safe) }, () => {
    tf = sliders.state.tf;
    dsRead = sliders.state.ds;
    zTrue = sliders.state.ztrue;
    sync();
    draw();
  });

  const bNoise = mkBtn('关闭噪声地板');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bNoise, bReset));

  const cv = setupCanvas(host, 460);
  const geo = { W: 0, H: 0 };

  function setRow(i, v, digits) {
    const row = sliders.box.children[i];
    if (!row) return;
    const input = row.children[1];
    const val = row.children[2];
    if (input) input.value = String(v);
    if (val) val.textContent = digits === undefined ? String(v) : v.toFixed(digits);
  }

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geo.W = W;
    geo.H = H;
    clearBg(ctx, W, H, C);

    const ds = measuredDs();
    const z = measuredZ();
    const tooSmall = useNoise && ds < noiseFloor;

    /* ---------- 上半：侧视图 ---------- */
    label(ctx, '上半：侧视图。A/B/C 三颗参照点深度固定，位移按 1/Z 分布', 10, 16,
      C.fg, { size: 11, weight: 700 });

    const sx0 = 46;
    const sx1 = W - 44;
    const yCam = 66;
    const yFloor = 186;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx0, yFloor);
    ctx.lineTo(sx1, yFloor);
    ctx.stroke();
    ctx.restore();

    /* 两个相机位置（基线长度随 t·f 变） */
    const camAX = sx0 + 16;
    const baseline = clamp((tf / 24) * (sx1 - sx0) * 0.42, 24, sx1 - sx0 - 90);
    const camBX = camAX + baseline;
    [camAX, camBX].forEach((x, i) => {
      ctx.save();
      ctx.fillStyle = i === 0 ? C.named('blue') : C.named('teal');
      ctx.beginPath();
      ctx.moveTo(x, yCam - 11);
      ctx.lineTo(x - 9, yCam + 6);
      ctx.lineTo(x + 9, yCam + 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      label(ctx, i === 0 ? '第 1 帧' : '第 2 帧', x, yCam + 22, C.axis, { size: 9.5, align: 'center' });
    });
    label(ctx, '基线 t（× 焦距 f = ' + Math.round(tf) + '）', (camAX + camBX) / 2, yCam + 40,
      C.fg, { size: 10, align: 'center', weight: 600 });

    /* 深度轴：从 0 到 12 米，竖直铺开 */
    const dTop = yCam + 54;
    const dBot = yFloor - 8;
    const zToY = (zz) => dTop + clamp(zz / 12, 0, 1) * (dBot - dTop);
    label(ctx, '0 m', sx0 - 6, dTop + 4, C.grid, { size: 9, align: 'right' });
    label(ctx, '12 m', sx0 - 6, dBot + 4, C.grid, { size: 9, align: 'right' });

    /* 参照点 A/B/C（固定） */
    REFS.forEach((pt) => {
      const py = zToY(pt.z);
      const col = C.named(pt.color);
      const d = tf / pt.z;
      ctx.save();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc((camAX + camBX) / 2, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(camAX, yCam);
      ctx.lineTo((camAX + camBX) / 2, py);
      ctx.moveTo(camBX, yCam);
      ctx.lineTo((camAX + camBX) / 2, py);
      ctx.stroke();
      ctx.restore();
      label(ctx, pt.id + '：Z=' + pt.z.toFixed(1) + ' m，Δs=' + d.toFixed(2) + ' px',
        (camAX + camBX) / 2 + 16, py + 4, col, { size: 9.5 });
    });

    /* 测量点 M（橙色，随滑块动） */
    const mz = mode === 'depth' ? z : zTrue;
    const my = zToY(mz);
    const mx = W - 96;
    ctx.save();
    ctx.fillStyle = C.named('orange');
    ctx.beginPath();
    ctx.arc(mx, my, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, 'M', mx, my - 12, C.named('orange'), { size: 10.5, align: 'center', weight: 700 });
    label(ctx, 'Z=' + mz.toFixed(2) + ' m', mx, my + 20, C.named('orange'), { size: 9.5, align: 'center' });

    /* ---------- 下半：图像坐标 ---------- */
    const iy0 = 254;
    label(ctx, '下半：图像坐标。同一批点被画在两帧的像素位置上，位移就是 Δs', 10, iy0 - 12,
      C.fg, { size: 11, weight: 700 });

    const ix0 = 40;
    const ix1 = W - 30;
    const pxPerUnit = (ix1 - ix0 - 80) / 8;
    const rows = REFS.map((pt) => ({ id: pt.id, d: tf / pt.z, col: C.named(pt.color), z: pt.z }))
      .concat([{ id: 'M', d: ds, col: C.named('orange'), z: mz, main: true }]);

    rows.forEach((r, i) => {
      const y = iy0 + 12 + i * 30;
      const x0 = ix0 + 34;
      const x1 = x0 + Math.min(r.d, 7.8) * pxPerUnit;
      ctx.save();
      ctx.fillStyle = C.named('blue');
      ctx.beginPath();
      ctx.arc(x0, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = r.col;
      ctx.lineWidth = r.main ? 1.8 : 1.1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.named('teal');
      ctx.beginPath();
      ctx.arc(x1, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, r.id, ix0 + 22, y + 4, r.col, { size: 9.5, align: 'right' });
      label(ctx, 'Δs = ' + r.d.toFixed(2) + ' px　→　Z = ' + (tf / r.d).toFixed(2) + ' m',
        x1 + 12, y + 4, r.col, { size: 9.5, weight: r.main ? 700 : 400 });
    });

    /* ---------- 判词 ---------- */
    const cy = 428;
    if (tooSmall) {
      label(ctx, '⚠ 位移读数 ' + ds.toFixed(2) + ' px 低于噪声地板 '
        + noiseFloor.toFixed(1) + ' px：这颗点的深度不可信。', 12, cy, C.bad,
      { size: 11, weight: 700 });
      label(ctx, '相对误差 δZ/Z = δ(Δs)/Δs = ' + ((noiseFloor / Math.max(0.01, ds)) * 100).toFixed(0)
        + '%——读数越小，同样的 1 像素误差被放大得越狠。', 12, cy + 18, C.axis, { size: 10 });
    } else {
      label(ctx, 'Z = (t·f) / Δs = ' + Math.round(tf) + ' / ' + ds.toFixed(2) + ' = '
        + (isFinite(z) ? z.toFixed(3) : '∞') + ' 米。', 12, cy, C.ok, { size: 11, weight: 700 });
      label(ctx, '反着用：已知深 ' + zTrue.toFixed(1) + ' 米、量到 Δs = '
        + (tf / zTrue).toFixed(2) + ' 像素，则 t·f = Δs × Z = '
        + ((tf / zTrue) * zTrue).toFixed(2) + '；多点各报一份，联立即最小二乘。',
      12, cy + 18, C.axis, { size: 10 });
    }
    label(ctx, '三颗参照点共享同一个 t·f，位移严格按 1/Z 分布——「谁动得快谁就近」不是经验之谈。',
      12, cy + 40, C.axis, { size: 10 });
    label(ctx, '纯旋转（基线 = 0）时公式给出 Δs = 0，任何深度都读不出来：没有视差就没有信息。',
      12, cy + 56, C.grid, { size: 10 });
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const ds = measuredDs();
    const z = measuredZ();
    const tooSmall = useNoise && ds < noiseFloor;
    ro.set('模式', mode === 'depth' ? '视角 A：从位移读深度' : '视角 B：从真实深度读位移');
    ro.set('测量点位移', ds.toFixed(2) + ' px' + (tooSmall ? '（低于噪声地板）' : ''));
    ro.set('反读深度', tooSmall ? '拒绝给出' : (isFinite(z) ? z.toFixed(3) + ' m' : '∞'));
    ro.set('相对误差', '± ' + ((noiseFloor / Math.max(0.01, ds)) * 100).toFixed(1)
      + ' %（= 1 px / Δs）');
    ro.set('结论', tooSmall
      ? '宁可缺深度，不要错深度'
      : '一个公式双向收费：正向读位移、反向读深度');

    /* 视角 B 不需要 Δs 滑块（它反过来算），视角 A 不需要真实深度 */
    const rows = sliders.box.children;
    if (rows[0]) rows[0].style.display = '';
    if (rows[1]) rows[1].style.display = mode === 'depth' ? '' : 'none';
    if (rows[2]) rows[2].style.display = mode === 'shift' ? '' : 'none';
  }

  /* ---------- 交互 ---------- */

  bNoise.addEventListener('click', () => {
    useNoise = !useNoise;
    bNoise.textContent = useNoise ? '关闭噪声地板' : '启用噪声地板';
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    tf = 12;
    dsRead = 3;
    zTrue = 3;
    useNoise = true;
    bNoise.textContent = '关闭噪声地板';
    setRow(0, tf, 0);
    setRow(1, dsRead, 1);
    setRow(2, zTrue, 1);
    sliders.state.tf = tf;
    sliders.state.ds = dsRead;
    sliders.state.ztrue = zTrue;
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
