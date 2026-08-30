/* 静力平衡：一根刚体梁上挂三个可拖的力，实时算合力与对支点的合力矩。
   核心命题：ΣF = 0 只保证「不平移」，还得 ΣM = 0 才「不转动」。
   把力配得再平，力矩不为零，梁照样会转起来。 */
import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildToolbar, mkBtn, label, clamp, fmt,
} from '../core.js';

const SPAN = 6;      // 梁长（m）
const FSC = 0.042;   // 每牛顿画多少像素

function arrow(ctx, x0, y0, x1, y1, color, w, head) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w || 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (len > 5) {
    const h = head || 9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(ang - 0.42), y1 - h * Math.sin(ang - 0.42));
    ctx.lineTo(x1 - h * Math.cos(ang + 0.42), y1 - h * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export default function render(host, spec) {
  const C = themeColors();
  const s = { xp: spec.xp ?? 3 };
  const F = [
    { x: 1.0, fx: 0, fy: -400 },
    { x: 3.0, fx: 0, fy: -600 },
    { x: 5.2, fx: 0, fy: -300 },
  ];

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ 'ΣFx': '—', 'ΣFy': '—', 'ΣM(支点)': '—', '支点反力 R': '—', '状态': '—' });
  host.appendChild(ro.box);

  const PAD = 36;
  const sc = () => (cv.W - PAD * 2) / SPAN;
  const px = (x) => PAD + x * sc();
  const inv = (X) => clamp((X - PAD) / sc(), 0, SPAN);
  const beamY = () => Math.round(cv.H * 0.44);

  function sums() {
    let fx = 0;
    let fy = 0;
    let m = 0;
    F.forEach((f) => {
      fx += f.fx;
      fy += f.fy;
      m += (f.x - s.xp) * f.fy; // r × F：力作用在梁轴线上，水平分量对该点力矩为零
    });
    return { fx, fy, m };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const by = beamY();
    const x0 = px(0);
    const x1 = px(SPAN);
    const gy = by + 62;

    /* 地面 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
    for (let x = 0; x < W; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x - 6, gy + 7);
      ctx.stroke();
    }

    /* 梁 */
    ctx.fillStyle = C.soft;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x0, by - 7, x1 - x0, 14);
    ctx.fill();
    ctx.stroke();

    /* 铰支座 */
    const sx = px(s.xp);
    ctx.strokeStyle = C.accent;
    ctx.fillStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, by + 7);
    ctx.lineTo(sx - 12, gy);
    ctx.lineTo(sx + 12, gy);
    ctx.closePath();
    ctx.stroke();
    label(ctx, '铰支点 x = ' + fmt(s.xp, 2) + ' m', sx, gy + 20, C.accent, { align: 'center', size: 11 });
    label(ctx, 'L = ' + SPAN + ' m', x1, by - 14, C.fg, { align: 'right', size: 11 });

    const t = sums();

    /* 支座反力（铰支座不能承受力矩，只能给两个力分量） */
    ctx.globalAlpha = 0.9;
    arrow(ctx, sx, by, sx - t.fx * FSC, by + t.fy * FSC, C.accent2, 2.2, 9);
    ctx.globalAlpha = 1;
    label(ctx, 'R（支座反力）', sx - t.fx * FSC + 6, by + t.fy * FSC, C.accent2, { size: 11 });

    /* 三个可拖的力：拖箭头尖端改大小与方向，拖根部圆点改作用位置 */
    F.forEach((f, i) => {
      const col = C.series(i);
      const bx = px(f.x);
      const tx = bx + f.fx * FSC;
      const ty = by - f.fy * FSC;
      arrow(ctx, bx, by, tx, ty, col, 2.4, 10);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fill();
      const mag = Math.hypot(f.fx, f.fy);
      label(ctx, 'F' + (i + 1) + ' = ' + fmt(mag, 0) + ' N', tx + 7, ty, col, { size: 11, weight: 600 });
    });

    label(ctx, '拖箭头尖端改力的大小与方向 · 拖根部圆点改作用位置', 8, 14, C.fg, { size: 11 });

    const tol = Math.max(25, 0.02 * F.reduce((a, f) => a + Math.abs(f.fy), 0) * SPAN);
    const balanced = Math.abs(t.m) < tol;
    ro.set('ΣFx', fmt(t.fx, 0) + ' N');
    ro.set('ΣFy', fmt(t.fy, 0) + ' N');
    ro.set('ΣM(支点)', fmt(t.m, 0) + ' N·m');
    ro.set('支点反力 R', fmt(Math.hypot(t.fx, t.fy), 0) + ' N');
    ro.set('状态', balanced ? 'ΣM ≈ 0，不转动' : (t.m > 0 ? 'ΣM > 0，趋向逆时针转动' : 'ΣM < 0，趋向顺时针转动'));
  }

  bindPointer(cv.canvas, {
    pick(X, Y) {
      let best = null;
      let bd = 16;
      F.forEach((f, i) => {
        const bx = px(f.x);
        const dTip = Math.hypot(X - (bx + f.fx * FSC), Y - (beamY() - f.fy * FSC));
        const dBase = Math.hypot(X - bx, Y - beamY());
        if (dTip < bd) { bd = dTip; best = 't' + i; }
        if (dBase < bd) { bd = dBase; best = 'b' + i; }
      });
      return best;
    },
    down(id) { void id; },
    move(id, X, Y) {
      const i = Number(id.slice(1));
      const f = F[i];
      if (id[0] === 't') {
        f.fx = clamp((X - px(f.x)) / FSC, -900, 900);
        f.fy = clamp((beamY() - Y) / FSC, -1600, 1600);
      } else {
        f.x = clamp(inv(X), 0.15, SPAN - 0.15);
      }
      draw();
    },
  });

  const balanceBtn = mkBtn('配平最后一个力（令 ΣM = 0）');
  balanceBtn.addEventListener('click', () => {
    const denom = F[2].x - s.xp;
    if (Math.abs(denom) < 0.25) return;
    F[2].fy = clamp(-((F[0].x - s.xp) * F[0].fy + (F[1].x - s.xp) * F[1].fy) / denom, -1800, 1800);
    draw();
  });
  const zeroBtn = mkBtn('全部归零');
  zeroBtn.addEventListener('click', () => {
    F.forEach((f) => { f.fx = 0; f.fy = 0; });
    draw();
  });
  host.appendChild(buildToolbar(balanceBtn, zeroBtn));

  const sliders = buildSliders(
    { sliders: [{ name: 'xp', label: '支点位置', min: 0.3, max: SPAN - 0.3, step: 0.05, value: s.xp, fmt: 2 }] },
    (st) => { s.xp = st.xp; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
