/* 带传动与链传动：同是「隔空传运动和力」，机理完全不同。
   带靠摩擦，紧边与松边拉力之比受欧拉公式 F1/F2 = e^(μα) 封顶，超了就打滑；
   链靠啮合，不会滑，但链条绕在多边形链轮上，瞬时链速随转角波动——
   这就是多边形效应，齿数越少抖得越厉害。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mode: spec.mode || 'belt',
    mu: spec.mu ?? 0.3,       // 摩擦系数
    alpha: spec.alpha ?? 160, // 包角（°）
    F0: spec.F0 ?? 400,       // 初拉力 N
    Z: spec.Z ?? 17,          // 链轮齿数
    ang: 0,
  };

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '拉力比 F1/F2': '—', '有效拉力 Fe': '—', '状态': '—', '速度波动': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '带传动（摩擦）', value: 'belt' }, { label: '链传动（啮合）', value: 'chain' }],
    s.mode,
    (v) => { s.mode = v; draw(); },
  ));

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (s.mode === 'belt') {
      /* ---------- 带传动 ---------- */
      const e = Math.exp(s.mu * (s.alpha * Math.PI) / 180);
      const F2 = (2 * s.F0) / (1 + e);
      const F1 = e * F2;
      const Fe = F1 - F2;

      const R1 = clamp(H * 0.17, 22, 54);
      const R2 = R1 * 0.62;
      const c1 = { x: 78 + R1, y: Math.round(H * 0.40) };
      const c2 = { x: W - 70 - R2, y: c1.y - 6 };
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const dd = Math.hypot(dx, dy);
      /* 外公切线 */
      const gamma = Math.asin(clamp((R1 - R2) / dd, -1, 1));
      const base = Math.atan2(dy, dx);
      const a1 = base + Math.PI / 2 + gamma;
      const a2 = base - Math.PI / 2 - gamma;
      const wrap = Math.PI - 2 * gamma; // 小轮包角（rad）

      /* 带：上下两条切线 + 两段圆弧 */
      const t1a = [c1.x + R1 * Math.cos(a2), c1.y + R1 * Math.sin(a2)];
      const t1b = [c2.x + R2 * Math.cos(a2), c2.y + R2 * Math.sin(a2)];
      const t2a = [c1.x + R1 * Math.cos(a1), c1.y + R1 * Math.sin(a1)];
      const t2b = [c2.x + R2 * Math.cos(a1), c2.y + R2 * Math.sin(a1)];
      /* 紧边（下）用红色，松边（上）用蓝色 */
      polyline(ctx, [t1a, t1b], C.bad, 4);
      polyline(ctx, [t2a, t2b], C.series(0), 4);
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.bad;
      ctx.beginPath();
      ctx.arc(c1.x, c1.y, R1, a1, a2 + Math.PI * 2, false);
      ctx.stroke();
      ctx.strokeStyle = C.series(0);
      ctx.beginPath();
      ctx.arc(c2.x, c2.y, R2, a2, a1, false);
      ctx.stroke();

      /* 两个带轮 */
      [[c1, R1, 1], [c2, R2, -R1 / R2]].forEach(([c, R, sp]) => {
        ctx.strokeStyle = C.fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + R * 0.85 * Math.cos(s.ang * sp), c.y + R * 0.85 * Math.sin(s.ang * sp));
        ctx.stroke();
        ctx.fillStyle = C.fg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      label(ctx, '主动轮', c1.x, c1.y + R1 + 16, C.fg, { align: 'center', size: 10 });
      label(ctx, '从动轮', c2.x, c2.y + R2 + 16, C.fg, { align: 'center', size: 10 });

      /* 包角弧标注 */
      ctx.save();
      ctx.strokeStyle = C.named('amber');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c2.x, c2.y, R2 + 11, a2, a1, false);
      ctx.stroke();
      ctx.restore();
      label(ctx, '包角 α = ' + fmt(s.alpha, 0) + '°', (c2.x + W) / 2 - 10, c2.y - R2 - 18, C.named('amber'), { align: 'center', size: 10 });

      /* 拉力箭头 */
      const ay = c1.y + R1 + 40;
      polyline(ctx, [[40, ay], [40 + Math.min(80, F1 / 8), ay]], C.bad, 3);
      label(ctx, 'F1 = ' + fmt(F1, 0) + ' N（紧边）', 40, ay - 8, C.bad, { size: 10 });
      polyline(ctx, [[40, ay + 20], [40 + Math.min(80, F2 / 8), ay + 20]], C.series(0), 3);
      label(ctx, 'F2 = ' + fmt(F2, 0) + ' N（松边）', 40, ay + 34, C.series(0), { size: 10 });

      label(ctx, '欧拉公式  F1/F2 = e^(μα) = ' + fmt(e, 3), 8, 14, C.fg, { size: 11, weight: 600 });
      label(ctx, '实际几何包角 ' + fmt((wrap * 180) / Math.PI, 0) + '°（小轮上更小，更容易打滑）', 8, 30, C.fg, { size: 10 });

      ro.set('拉力比 F1/F2', fmt(e, 3) + '（上限，靠摩擦撑住）');
      ro.set('有效拉力 Fe', fmt(Fe, 0) + ' N = F1 − F2');
      ro.set('状态', '初拉力 F0 = ' + fmt(s.F0, 0) + ' N；需要传的圆周力超过 ' + fmt(Fe, 0) + ' N 就打滑');
      ro.set('速度波动', '带传动有弹性滑动（约 1–2%），不会 100% 同步');
    } else {
      /* ---------- 链传动：多边形效应 ---------- */
      const Z = clamp(Math.round(s.Z), 6, 40);
      const pitch = 3.0;
      const R = (pitch / 2) / Math.sin(Math.PI / Z); // 分度圆半径（px 单位下的比例）
      const k = Math.min((H * 0.34) / R, 3.4);
      const RR = R * k;
      const cx = 96 + RR;
      const cy = Math.round(H * 0.46);

      /* 链轮多边形 */
      const poly = [];
      for (let i = 0; i < Z; i += 1) {
        const a = s.ang + (i / Z) * Math.PI * 2;
        poly.push([cx + RR * Math.cos(a), cy + RR * Math.sin(a)]);
      }
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = C.fg;
      poly.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });

      /* 链条：沿切线方向铺开的一串链节 */
      const dirY = cy;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      const links = [];
      for (let i = 0; i < 14; i += 1) {
        links.push([cx + RR + i * pitch * k, dirY]);
      }
      polyline(ctx, links, C.accent, 3);
      ctx.fillStyle = C.accent;
      links.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      /* 瞬时链速：v = R·ω·cos(β)，β 为链节与切线的夹角 */
      const beta = ((s.ang % (2 * Math.PI / Z)) + (2 * Math.PI / Z)) % (2 * Math.PI / Z) - Math.PI / Z;
      const vRel = Math.cos(beta);
      const fluct = 1 - Math.cos(Math.PI / Z);

      /* 右侧：v(θ) 曲线 */
      const gx = cx + RR + 30;
      const gw = Math.max(W - gx - 16, 60);
      const gy = Math.round(H * 0.62);
      const gh = H * 0.30;
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy - gh);
      ctx.lineTo(gx, gy);
      ctx.lineTo(gx + gw, gy);
      ctx.stroke();
      label(ctx, '瞬时链速 v(θ) / Rω', gx, gy - gh - 6, C.fg, { size: 10 });
      const pts = [];
      for (let i = 0; i <= 120; i += 1) {
        const t = (i / 120) * (2 * Math.PI / Z);
        pts.push([gx + (i / 120) * gw, gy - gh * 0.86 * Math.cos(t - Math.PI / Z)]);
      }
      polyline(ctx, pts, C.named('purple'), 2.2);
      /* 当前点 */
      const idx = ((s.ang % (2 * Math.PI / Z)) + (2 * Math.PI / Z)) % (2 * Math.PI / Z);
      const cxp = gx + (idx / (2 * Math.PI / Z)) * gw;
      const cyp = gy - gh * 0.86 * vRel;
      ctx.fillStyle = C.named('amber');
      ctx.beginPath();
      ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'v = ' + fmt(vRel, 3) + ' Rω', cxp + 6, cyp, C.named('amber'), { size: 10, weight: 600 });
      label(ctx, '一个齿距 2π/Z', gx + gw / 2, gy + 14, C.fg, { align: 'center', size: 9 });

      label(ctx, '链靠啮合，不打滑——但链速不均匀（多边形效应）', 8, 14, C.fg, { size: 11, weight: 600 });
      label(ctx, '链轮 Z = ' + Z + ' 齿', cx, cy + RR + 18, C.fg, { align: 'center', size: 10 });

      ro.set('拉力比 F1/F2', '链传动不受摩擦封顶（啮合传力）');
      ro.set('有效拉力 Fe', '受链条抗拉极限与铰链比压限制，而非欧拉公式');
      ro.set('状态', Z < 13 ? '齿数偏少：多边形效应显著，高速时噪声与冲击大' : '齿数适中：速度波动可接受');
      ro.set('速度波动', '±' + fmt(fluct * 100 / 2, 2) + '%（峰谷差 ' + fmt(fluct * 100, 2) + '%，∝ 1/Z²）');
    }
  }

  const controls = anim(host, {
    onTick(dt) { s.ang += dt * 1.4; draw(); },
    onReset() { s.ang = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'mu', label: '带：摩擦系数 μ', min: 0.05, max: 0.8, step: 0.01, value: s.mu, fmt: 2 },
        { name: 'alpha', label: '带：包角 α', min: 60, max: 220, step: 5, value: s.alpha, fmt: 0 },
        { name: 'F0', label: '带：初拉力 F0', min: 50, max: 1500, step: 10, value: s.F0, fmt: 0 },
        { name: 'Z', label: '链：链轮齿数 Z', min: 6, max: 40, step: 1, value: s.Z, fmt: 0 },
      ],
    },
    (st) => { s.mu = st.mu; s.alpha = st.alpha; s.F0 = st.F0; s.Z = st.Z; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
