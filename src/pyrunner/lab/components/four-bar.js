/* 四连杆机构运动学：拖输入角或让它自己转，看连杆平面上某点画出的耦合曲线。
   三个要盯住的量：Grashof 类型（谁能够整周回转）、传动角 μ（越接近 90° 越省力）、
   死点位置（μ→0 或 180°，此时输入再大也推不动输出杆）。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    a: spec.a ?? 1.0,      // 曲柄 AB
    b: spec.b ?? 2.6,      // 连杆 BC
    c: spec.c ?? 2.2,      // 摇杆 CD
    d: spec.d ?? 2.8,      // 机架 AD
    theta: spec.theta ?? 1.0,
    t: spec.t ?? 0.5,      // 耦合点在连杆上的位置
    off: spec.off ?? 0.35, // 耦合点相对连杆的垂向偏置
    spd: spec.spd ?? 1,
    branch: spec.branch ?? 1,
  };

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ 'Grashof': '—', '传动角 μ': '—', 'ω₄ / ω₂': '—', '输出杆摆角': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '开式分支', value: '1' }, { label: '交叉分支', value: '-1' }],
    String(s.branch),
    (v) => { s.branch = Number(v); draw(); },
  ));

  let mech = null;
  let pos = null;
  let vel = null;

  function compute() {
    if (!mech) return;
    pos = mech.fourBar({ a: s.a, b: s.b, c: s.c, d: s.d, theta: s.theta, branch: s.branch });
    vel = pos.ok ? mech.fourBarVelocity(pos, 1) : null;
  }

  /* 耦合点：连杆 BC 上距离 B 为 t 处，再沿法向偏置 off */
  function couplerPoint(p) {
    const dx = p.C.x - p.B.x;
    const dy = p.C.y - p.B.y;
    const L = Math.hypot(dx, dy) || 1e-9;
    const ux = dx / L;
    const uy = dy / L;
    return {
      x: p.B.x + ux * L * s.t - uy * s.off,
      y: p.B.y + uy * L * s.t + ux * s.off,
    };
  }

  /* 耦合曲线 + 输出杆摆角范围：扫一圈输入角。
     非 Grashof 机构有一段输入角无解，因此按段收集，段间断开不连线。 */
  function sweep() {
    const segs = [];
    let cur = [];
    let th4min = Infinity;
    let th4max = -Infinity;
    if (!mech) return { segs, th4min, th4max };
    for (let i = 0; i <= 240; i += 1) {
      const th = (i / 240) * Math.PI * 2;
      const p = mech.fourBar({ a: s.a, b: s.b, c: s.c, d: s.d, theta: th, branch: s.branch });
      if (!p.ok) {
        if (cur.length > 1) segs.push(cur);
        cur = [];
        continue;
      }
      cur.push(couplerPoint(p));
      th4min = Math.min(th4min, p.theta4);
      th4max = Math.max(th4max, p.theta4);
    }
    if (cur.length > 1) segs.push(cur);
    return { segs, th4min, th4max };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!mech || !pos) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const sw = sweep();
    /* 视口：把整条运动轨迹框进画面 */
    const all = [];
    sw.segs.forEach((seg) => seg.forEach((p) => all.push(p)));
    all.push({ x: 0, y: 0 }, { x: s.d, y: 0 });
    if (pos && pos.ok) all.push(pos.B, pos.C);
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const sc = Math.min((W - 70) / Math.max(x1 - x0, 1e-6), (H - 60) / Math.max(y1 - y0, 1e-6));
    const ox = W / 2 - ((x0 + x1) / 2) * sc;
    const oy = H / 2 + 6 + ((y0 + y1) / 2) * sc;
    const PX = (p) => ox + p.x * sc;
    const PY = (p) => oy - p.y * sc;

    /* 耦合曲线 */
    if (sw.segs.length && sw.segs[0].length > 2) {
      sw.segs.forEach((seg) => polyline(ctx, seg.map((p) => [PX(p), PY(p)]), C.named('purple'), 1.8, [5, 3]));
      label(ctx, '耦合曲线', PX(sw.segs[0][0]), PY(sw.segs[0][0]) - 6, C.named('purple'), { size: 10 });
    }

    if (pos.ok) {
      /* 机架 */
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PX(pos.A), PY(pos.A) + 12);
      ctx.lineTo(PX(pos.D), PY(pos.D) + 12);
      ctx.stroke();
      for (let k = 0; k < 8; k += 1) {
        const X = PX(pos.A) + (k / 8) * (PX(pos.D) - PX(pos.A));
        ctx.beginPath();
        ctx.moveTo(X, PY(pos.A) + 12);
        ctx.lineTo(X - 5, PY(pos.A) + 19);
        ctx.stroke();
      }
      ctx.restore();

      /* 三根活动杆 */
      polyline(ctx, [[PX(pos.A), PY(pos.A)], [PX(pos.B), PY(pos.B)]], C.series(0), 4);
      polyline(ctx, [[PX(pos.B), PY(pos.B)], [PX(pos.C), PY(pos.C)]], C.accent, 4);
      polyline(ctx, [[PX(pos.C), PY(pos.C)], [PX(pos.D), PY(pos.D)]], C.series(3), 4);

      /* 耦合点与它和连杆的连接 */
      const P = couplerPoint(pos);
      polyline(ctx, [[PX(pos.B), PY(pos.B)], [PX(P), PY(P)], [PX(pos.C), PY(pos.C)]], C.grid, 1.4, [3, 3]);
      ctx.fillStyle = C.named('purple');
      ctx.beginPath();
      ctx.arc(PX(P), PY(P), 5, 0, Math.PI * 2);
      ctx.fill();

      /* 铰链 */
      [pos.A, pos.B, pos.C, pos.D].forEach((p, i) => {
        ctx.fillStyle = C.bg;
        ctx.strokeStyle = C.fg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(PX(p), PY(p), 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        label(ctx, 'ABCD'[i], PX(p) + 8, PY(p) - 7, C.fg, { size: 11, weight: 600 });
      });

      /* 传动角：连杆与输出杆的夹角 */
      const mu = pos.transmissionAngle;
      const muDeg = (mu * 180) / Math.PI;
      const good = muDeg > 40 && muDeg < 140;
      const a1 = Math.atan2(PY(pos.B) - PY(pos.C), PX(pos.B) - PX(pos.C));
      const a2 = Math.atan2(PY(pos.D) - PY(pos.C), PX(pos.D) - PX(pos.C));
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      ctx.save();
      ctx.strokeStyle = good ? C.ok : C.bad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(PX(pos.C), PY(pos.C), 20, a1, a1 + delta, delta < 0);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'μ = ' + fmt(muDeg, 1) + '°', PX(pos.C) + 24, PY(pos.C) + 4, good ? C.ok : C.bad, { size: 11, weight: 600 });

      /* 输入角弧 */
      ctx.save();
      ctx.strokeStyle = C.series(0);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(PX(pos.A), PY(pos.A), 26, 0, -s.theta, s.theta > 0);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'θ₂ = ' + fmt((s.theta * 180) / Math.PI, 0) + '°', PX(pos.A) + 30, PY(pos.A) - 14, C.series(0), { size: 10 });

      const g = mech.grashof(s.a, s.b, s.c, s.d);
      const ratio = vel && vel.ok ? vel.omega4 : NaN;
      ro.set('Grashof', g.type + '（S+L ' + (g.satisfied ? '≤' : '>') + ' P+Q，余量 ' + fmt(g.margin, 3) + '）');
      ro.set('传动角 μ', fmt(muDeg, 1) + '°　' + (muDeg < 40 || muDeg > 140 ? '⚠ 传力恶化，接近死点' : '良好（接近 90° 最佳）'));
      ro.set('ω₄ / ω₂', isFinite(ratio) ? fmt(ratio, 3) + '（含符号，负=反向）' : '速度奇异');
      ro.set('输出杆摆角', isFinite(sw.th4min) ? fmt(((sw.th4max - sw.th4min) * 180) / Math.PI, 1) + '°' : '—');
    } else {
      label(ctx, pos.reason || '此位置无解', W / 2, H / 2, C.bad, { align: 'center', size: 12, weight: 600 });
      ro.set('Grashof', mech.grashof(s.a, s.b, s.c, s.d).type);
      ro.set('传动角 μ', '—（机构未装配）');
      ro.set('ω₄ / ω₂', '—');
      ro.set('输出杆摆角', '—');
    }

    label(ctx, '紫虚线 = 连杆平面上一点的耦合曲线', 8, 14, C.fg, { size: 10 });
  }

  const controls = anim(host, {
    onTick(dt) {
      s.theta += dt * 1.1 * s.spd;
      if (s.theta > Math.PI * 2) s.theta -= Math.PI * 2;
      draw();
    },
    onReset() { s.theta = spec.theta ?? 1.0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'a', label: '曲柄 a', min: 0.3, max: 3, step: 0.05, value: s.a, fmt: 2 },
        { name: 'b', label: '连杆 b', min: 0.5, max: 4.5, step: 0.05, value: s.b, fmt: 2 },
        { name: 'c', label: '摇杆 c', min: 0.5, max: 4.5, step: 0.05, value: s.c, fmt: 2 },
        { name: 'd', label: '机架 d', min: 0.5, max: 5, step: 0.05, value: s.d, fmt: 2 },
        { name: 'theta', label: '输入角 θ₂', min: 0, max: 6.283, step: 0.01, value: s.theta, fmt: 2 },
        { name: 't', label: '耦合点位置 t', min: 0, max: 1.2, step: 0.02, value: s.t, fmt: 2 },
        { name: 'off', label: '耦合点偏置', min: -1.2, max: 1.2, step: 0.02, value: s.off, fmt: 2 },
        { name: 'spd', label: '转速', min: 0.2, max: 3, step: 0.1, value: s.spd, fmt: 1 },
      ],
    },
    (st) => {
      s.a = st.a; s.b = st.b; s.c = st.c; s.d = st.d;
      s.theta = st.theta; s.t = st.t; s.off = st.off; s.spd = st.spd;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
