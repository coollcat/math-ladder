/* 交流功率与功率因数。
   三轨图说明一件事：p(t) = v(t)·i(t) 的频率是电压的两倍，而且平均值才是真正干活的功率。
   P = VI·cosφ 是做功的部分，Q = VI·sinφ 是在电源与负载间来回倒腾、不做功的部分，
   S = VI 是两者的矢量和——电力公司要按 S 配设备，却只按 P 收钱，所以 cosφ 低了要罚款。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = { V: spec.V ?? 220, I: spec.I ?? 5, phi: spec.phi ?? 30, f: spec.f ?? 50 };
  let t = 0;

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '有功 P': '—', '无功 Q': '—', '视在 S': '—', '功率因数': '—' });
  host.appendChild(ro.box);

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const w = 2 * Math.PI * s.f;
    const ph = (s.phi * Math.PI) / 180;
    const Vp = s.V * Math.SQRT2;
    const Ip = s.I * Math.SQRT2;

    /* ---------- 左：三轨波形 ---------- */
    const gx = 8;
    const gw = W * 0.56;
    const trackH = (H - 46) / 3;
    const tracks = [
      { name: 'v(t)', col: C.accent, fn: (tt) => Vp * Math.sin(w * tt), amp: Vp },
      { name: 'i(t)', col: C.accent2, fn: (tt) => Ip * Math.sin(w * tt - ph), amp: Ip },
      { name: 'p(t) = v·i', col: C.named('green'), fn: (tt) => (Vp * Math.sin(w * tt)) * (Ip * Math.sin(w * tt - ph)), amp: Vp * Ip },
    ];
    const CYC = 2;
    tracks.forEach((tr, k) => {
      const y0 = 22 + k * trackH;
      const mid = y0 + trackH / 2;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, mid); ctx.lineTo(gx + gw, mid);
      ctx.stroke();
      const amp = Math.max(tr.amp, 1e-9);
      const pts = [];
      for (let i = 0; i <= 260; i += 1) {
        const tt = t + (i / 260) * (CYC / s.f);
        pts.push([gx + (i / 260) * gw, mid - (tr.fn(tt) / amp) * (trackH / 2 - 8)]);
      }
      /* p(t) 负半周（能量回馈）打底 */
      if (k === 2) {
        ctx.fillStyle = C.named('red');
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], mid);
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.lineTo(pts[pts.length - 1][0], mid);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      polyline(ctx, pts, tr.col, 2);
      label(ctx, tr.name, gx + 4, y0 + 12, tr.col, { size: 10, weight: 600 });
      if (k === 2) {
        const P = s.V * s.I * Math.cos(ph);
        ctx.save();
        ctx.strokeStyle = C.named('purple');
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(gx, mid - (P / amp) * (trackH / 2 - 8));
        ctx.lineTo(gx + gw, mid - (P / amp) * (trackH / 2 - 8));
        ctx.stroke();
        ctx.restore();
        label(ctx, '平均 = P（虚线）', gx + gw - 4, mid - (P / amp) * (trackH / 2 - 8) - 5,
          C.named('purple'), { align: 'right', size: 10 });
      }
    });

    /* ---------- 右：功率三角形 ---------- */
    const P = s.V * s.I * Math.cos(ph);
    const Q = s.V * s.I * Math.sin(ph);
    const S = s.V * s.I;
    const tx = gx + gw + 40;
    const ty = H - 40;
    const sc = Math.min((W - tx - 20) / Math.max(S, 1e-9), (H - 90) / Math.max(S, 1e-9)) * 0.9;
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.abs(P) * sc, ty);
    ctx.lineTo(tx + Math.abs(P) * sc, ty - Q * sc);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = C.named('amber');
    ctx.globalAlpha = 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
    label(ctx, 'P = ' + fmt(P, 1) + ' W', tx + (Math.abs(P) * sc) / 2, ty + 15, C.accent,
      { align: 'center', size: 11, weight: 600 });
    label(ctx, 'Q = ' + fmt(Q, 1) + ' var', tx + Math.abs(P) * sc + 6, ty - (Q * sc) / 2,
      C.named('green'), { size: 11, weight: 600 });
    label(ctx, 'S = ' + fmt(S, 1) + ' VA', tx + (Math.abs(P) * sc) / 2 - 10, ty - (Q * sc) / 2 - 6,
      C.named('amber'), { align: 'center', size: 11, weight: 600 });
    /* 相角弧 */
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(tx, ty, 26, -ph, 0, ph > 0);
    ctx.stroke();
    label(ctx, 'φ = ' + fmt(s.phi, 0) + '°', tx + 30, ty - 12, C.named('purple'), { size: 10 });
    label(ctx, '功率三角形', tx, 24, C.fg, { size: 11, weight: 600 });

    const pf = Math.cos(ph);
    ro.set('有功 P', fmt(P, 1) + ' W　（真正做功、发热、出力）');
    ro.set('无功 Q', fmt(Q, 1) + ' var　（在电源与负载间来回搬运，' + (Q >= 0 ? '感性吸收' : '容性发出') + '）');
    ro.set('视在 S', fmt(S, 1) + ' VA　= Vrms × Irms，决定导线与变压器容量');
    ro.set('功率因数', 'cosφ = ' + fmt(pf, 3) + '　' + (Math.abs(pf) > 0.95
      ? '合格（一般要求 ≥0.9）'
      : '偏低：同样的有功要多付 ' + fmt((1 / Math.max(Math.abs(pf), 0.01) - 1) * 100, 0) + '% 电流，需并联电容补偿'));
  }

  const controls = anim(host, {
    onTick(dt) { t += dt * 0.02; draw(); },
    onReset() { t = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'V', label: '电压有效值 Vrms', min: 1, max: 400, step: 1, value: s.V, fmt: 0 },
        { name: 'I', label: '电流有效值 Irms', min: 0.1, max: 20, step: 0.1, value: s.I, fmt: 1 },
        { name: 'phi', label: '相位差 φ', min: -90, max: 90, step: 1, value: s.phi, fmt: 0 },
        { name: 'f', label: '频率 f', min: 10, max: 200, step: 5, value: s.f, fmt: 0 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
