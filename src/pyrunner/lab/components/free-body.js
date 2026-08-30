/* 自由体图与约束反力：选左右两端的支座形式，看它到底「给得出几个反力、吃掉几个自由度」。
   命题：平面刚体只有 3 个自由度；未知反力数 = 3 才静定，>3 超静定，<3 是机构。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  label, fmt,
} from '../core.js';

const SPAN = 6;

/* 每种支座：提供的未知反力数与约束掉的自由度 */
const KINDS = {
  none: { label: '无', r: 0, desc: '自由端，不提供任何反力' },
  pin: { label: '铰支座', r: 2, desc: '约束两个平移，释放转动：给 Fx、Fy' },
  roller: { label: '辊支座', r: 1, desc: '只约束竖向平移：只给 Fy' },
  fixed: { label: '固定端', r: 3, desc: '约束两平移 + 转动：给 Fx、Fy、M' },
};

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
  const s = {
    left: spec.left || 'pin',
    right: spec.right || 'roller',
    P: spec.P ?? 800,
    a: spec.a ?? 3,
  };

  const cv = setupCanvas(host, 290);
  const ro = buildReadout({
    '未知反力数': '—', '剩余自由度': '—', '静定性': '—', '左支座': '—', '右支座': '—',
  });
  host.appendChild(ro.box);

  const opts = ['pin', 'roller', 'fixed', 'none'].map((k) => ({ label: KINDS[k].label, value: k }));
  const wrapL = buildSegmented(opts, s.left, (v) => { s.left = v; draw(); });
  const wrapR = buildSegmented(opts, s.right, (v) => { s.right = v; draw(); });
  host.appendChild(wrapL);
  host.appendChild(wrapR);

  const PAD = 44;
  const sc = () => (cv.W - PAD * 2) / SPAN;
  const px = (x) => PAD + x * sc();

  /* 画支座符号；返回支座顶端的 y */
  function drawSupport(ctx, kind, X, yTop, yGround) {
    if (kind === 'none') return;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    if (kind === 'fixed') {
      ctx.beginPath();
      ctx.moveTo(X - 9, yTop);
      ctx.lineTo(X - 9, yGround);
      ctx.moveTo(X + 9, yTop);
      ctx.lineTo(X + 9, yGround);
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.rect(X - 9, yTop - 4, 18, 7);
      ctx.fill();
      for (let k = 0; k < 4; k += 1) {
        ctx.beginPath();
        ctx.moveTo(X - 9 - 12, yTop + k * 11 + 6);
        ctx.lineTo(X - 9, yTop + k * 11 + 12);
        ctx.stroke();
      }
      return;
    }
    ctx.beginPath();
    ctx.moveTo(X, yTop);
    ctx.lineTo(X - 12, yTop + 22);
    ctx.lineTo(X + 12, yTop + 22);
    ctx.closePath();
    ctx.stroke();
    if (kind === 'roller') {
      ctx.beginPath();
      ctx.arc(X - 7, yTop + 27, 5, 0, Math.PI * 2);
      ctx.moveTo(X + 12, yTop + 27);
      ctx.arc(X + 7, yTop + 27, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X - 16, yTop + 34);
      ctx.lineTo(X + 16, yTop + 34);
      ctx.stroke();
    } else {
      for (let k = -1; k <= 1; k += 1) {
        ctx.beginPath();
        ctx.moveTo(X + k * 14, yTop + 34);
        ctx.lineTo(X + k * 14 - 7, yTop + 42);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(X - 20, yTop + 22);
      ctx.lineTo(X + 20, yTop + 22);
      ctx.stroke();
    }
  }

  /* 反力箭头：未知量用另一种颜色画成「待求」 */
  function drawReactions(ctx, kind, X, y) {
    if (kind === 'none') return;
    const col = C.accent2;
    if (kind === 'pin' || kind === 'fixed') arrow(ctx, X, y, X + 30, y, col, 2, 8);
    if (kind === 'fixed') {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X, y, 18, -0.5, 2.2);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'M?', X - 34, y - 12, col, { size: 10 });
    }
    arrow(ctx, X, y, X, y + 30, col, 2, 8);
    if (kind === 'pin' || kind === 'fixed') label(ctx, 'Fx? Fy?', X + 34, y - 6, col, { size: 10 });
    else label(ctx, 'Fy?', X + 6, y + 40, col, { size: 10 });
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const by = Math.round(H * 0.42);
    const gy = by + 52;
    const x0 = px(0);
    const x1 = px(SPAN);

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy + 6);
    ctx.lineTo(W, gy + 6);
    ctx.stroke();

    /* 隔离体：把梁从周围世界里「切」出来 */
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.rect(x0 - 26, by - 40, x1 - x0 + 52, gy - by + 46);
    ctx.stroke();
    ctx.restore();
    label(ctx, '隔离体（自由体）', x0 - 22, by - 46, C.fg, { size: 11 });

    ctx.fillStyle = C.soft;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x0, by - 7, x1 - x0, 14);
    ctx.fill();
    ctx.stroke();

    drawSupport(ctx, s.left, x0, by + 7, gy);
    drawSupport(ctx, s.right, x1, by + 7, gy);
    drawReactions(ctx, s.left, x0, by);
    drawReactions(ctx, s.right, x1, by);

    /* 外载荷 */
    const lx = px(s.a);
    arrow(ctx, lx, by - 60, lx, by, C.named('red'), 2.4, 9);
    label(ctx, 'P = ' + fmt(s.P, 0) + ' N', lx + 6, by - 52, C.named('red'), { size: 11, weight: 600 });
    label(ctx, '自重忽略', x1 - 4, by + 26, C.fg, { align: 'right', size: 10 });

    /* 自由度图示：平面刚体 3 个自由度，看被吃掉几个 */
    const kinds = [s.left, s.right];
    const hasX = kinds.some((k) => k === 'pin' || k === 'fixed');
    const hasY = kinds.some((k) => k !== 'none');
    const hasRot = kinds.some((k) => k === 'fixed');
    const nU = KINDS[s.left].r + KINDS[s.right].r;
    const locked = (hasX ? 1 : 0) + (hasY ? 1 : 0) + (hasRot ? 1 : 0);
    const dy = gy + 30;
    const glyph = [
      { t: '↔ 平移 x', on: !hasX },
      { t: '↕ 平移 y', on: !hasY },
      { t: '↻ 转动', on: !hasRot },
    ];
    glyph.forEach((g, i) => {
      label(ctx, (g.on ? '● ' : '✕ ') + g.t, x0 + i * ((x1 - x0) / 3), dy, g.on ? C.ok : C.bad, { size: 11 });
    });

    ro.set('未知反力数', nU + ' 个（平衡方程 3 个）');
    ro.set('剩余自由度', (3 - locked) + ' / 3');
    ro.set('静定性', nU === 3 ? '静定：反力可唯一求出' : nU > 3 ? '超静定 ' + (nU - 3) + ' 次：需变形协调条件' : '约束不足：是机构，会动');
    ro.set('左支座', KINDS[s.left].desc);
    ro.set('右支座', KINDS[s.right].desc);
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'P', label: '外载荷 P', min: 0, max: 3000, step: 50, value: s.P, fmt: 0 },
        { name: 'a', label: '载荷位置', min: 0.2, max: SPAN - 0.2, step: 0.1, value: s.a, fmt: 2 },
      ],
    },
    (st) => { s.P = st.P; s.a = st.a; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
