/* 齿轮传动与传动比：定轴轮系里，中间齿轮只是惰轮——它改转向，但总传动比
   只由首末两轮的齿数决定。切到行星轮系，同一个齿轮组换个固定件就换一套速比。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  engine, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mode: spec.mode || 'fixed',
    stages: spec.stages ?? 3,   // 齿轮个数 2–4
    z1: spec.z1 ?? 20,
    z2: spec.z2 ?? 40,
    z3: spec.z3 ?? 30,
    z4: spec.z4 ?? 60,
    rpm: spec.rpm ?? 100,
    Zs: spec.Zs ?? 24,
    Zr: spec.Zr ?? 72,
    fixed: spec.fixed || 'ring',
    ang: 0,
  };

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '总传动比': '—', '输出转速': '—', '输出转向': '—', '各级速比': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '定轴轮系', value: 'fixed' }, { label: '行星轮系', value: 'planet' }],
    s.mode,
    (v) => { s.mode = v; draw(); },
  ));
  host.appendChild(buildSegmented(
    [{ label: '齿圈固定', value: 'ring' }, { label: '太阳固定', value: 'sun' }, { label: '行星架固定', value: 'carrier' }],
    s.fixed,
    (v) => { s.fixed = v; draw(); },
  ));

  let mech = null;
  let out = null;

  function teeth() {
    const arr = [s.z1, s.z2];
    if (s.stages >= 3) arr.push(s.z3);
    if (s.stages >= 4) arr.push(s.z4);
    return arr.map((z) => clamp(Math.round(z), 8, 120));
  }

  function compute() {
    if (!mech) return;
    if (s.mode === 'fixed') out = { kind: 'fixed', r: mech.gearTrain(teeth(), s.rpm), t: teeth() };
    else out = { kind: 'planet', r: mech.planetary(s.Zs, s.Zr, s.rpm, s.fixed) };
  }

  /* 画一个齿轮：圆 + 齿 + 一根随转角转的辐条 */
  function gear(ctx, cx, cy, R, Z, ang, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    const n = Math.min(Z, 60);
    for (let i = 0; i < n; i += 1) {
      const a = ang + (i / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.lineTo(cx + (R + 7) * Math.cos(a), cy + (R + 7) * Math.sin(a));
      ctx.stroke();
    }
    /* 辐条：看转向 */
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * 0.85 * Math.cos(ang), cy + R * 0.85 * Math.sin(ang));
    ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!mech || !out) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    if (out.kind === 'fixed') {
      const arr = out.t;
      const r = out.r;
      /* 半径 ∝ 齿数，等比缩放到画面宽度内 */
      const sumZ = arr.reduce((a, z) => a + z, 0);
      const k = (W - 60) / (sumZ * 2);
      const cy = Math.round(H * 0.48);
      let cx = 30;
      const centers = [];
      arr.forEach((z) => {
        const R = z * k;
        centers.push({ cx: cx + R, R, z });
        cx += R * 2;
      });
      centers.forEach((g, i) => {
        const dir = i === 0 ? 1 : (r.stages[i - 1].direction === '同向' ? 1 : -1);
        const speed = i === 0 ? 1 : 1 / Math.abs(arr.slice(0, i).reduce((a, v, j) => a * (arr[j + 1] / arr[j]), 1));
        gear(ctx, g.cx, cy, g.R, g.z, s.ang * dir * speed, C.series(i));
        label(ctx, 'Z' + (i + 1) + '=' + g.z, g.cx, cy + g.R + 16, C.series(i), { align: 'center', size: 11, weight: 600 });
        label(ctx, (i === 0 ? fmt(s.rpm, 0) : fmt(r.stages[i - 1].rpmOut, 1)) + ' rpm',
          g.cx, cy - g.R - 8, C.series(i), { align: 'center', size: 10 });
      });
      /* 啮合点标记 */
      for (let i = 0; i < centers.length - 1; i += 1) {
        const mx = (centers[i].cx + centers[i].R + centers[i + 1].cx - centers[i + 1].R) / 2;
        ctx.fillStyle = C.named('amber');
        ctx.beginPath();
        ctx.arc(mx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      /* 转向箭头 */
      centers.forEach((g, i) => {
        if (g.R < 12) return;
        const dir = i === 0 ? 1 : (r.stages[i - 1].direction === '同向' ? 1 : -1);
        ctx.strokeStyle = C.fg;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(g.cx, cy, g.R * 0.45, -0.6, 0.6);
        ctx.stroke();
        const ax = g.cx + g.R * 0.45 * Math.cos(dir > 0 ? 0.6 : -0.6);
        const ay = cy + g.R * 0.45 * Math.sin(dir > 0 ? 0.6 : -0.6);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 4 * (dir > 0 ? 1 : -1), ay - 5);
        ctx.lineTo(ax + 3 * (dir > 0 ? 1 : -1), ay - 3);
        ctx.closePath();
        ctx.fillStyle = C.fg;
        ctx.fill();
      });
      if (arr.length >= 3) {
        label(ctx, '↑ 中间的是惰轮：只改转向，不影响总传动比', centers[1].cx, cy - centers[1].R - 24, C.named('amber'), { align: 'center', size: 10 });
      }
      ro.set('总传动比', fmt(r.totalRatio, 4) + ' = Z末/Z首 = ' + arr[arr.length - 1] + '/' + arr[0]);
      ro.set('输出转速', fmt(r.outputRpm, 2) + ' rpm');
      ro.set('输出转向', r.direction + '（' + (arr.length - 1) + ' 次外啮合）');
      ro.set('各级速比', r.stages.map((st) => 'Z' + (st.to + 1) + '/Z' + (st.from + 1) + '=' + fmt(st.ratio, 3)).join('  '));
    } else {
      const pl = out.r;
      const cy = Math.round(H * 0.52);
      const cx = W / 2;
      const Rs = clamp(s.Zs * 1.4, 24, 90);
      const Rr = Math.min(Rs * (s.Zr / s.Zs), (W / 2) - 26);
      const Rp = (Rr - Rs) / 2;
      /* 齿圈 */
      ctx.strokeStyle = C.series(3);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, Rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 48; i += 1) {
        const a = (i / 48) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Rr * Math.cos(a), cy + Rr * Math.sin(a));
        ctx.lineTo(cx + (Rr - 6) * Math.cos(a), cy + (Rr - 6) * Math.sin(a));
        ctx.stroke();
      }
      /* 太阳轮 */
      gear(ctx, cx, cy, Rs, s.Zs, s.ang, C.series(0));
      /* 行星轮：架转速 = 输出转速（架输出时） */
      const carrierAng = s.ang * (pl.outputRpm / s.rpm);
      for (let i = 0; i < 3; i += 1) {
        const a = carrierAng + (i / 3) * Math.PI * 2;
        const pxx = cx + (Rs + Rp) * Math.cos(a);
        const pyy = cy + (Rs + Rp) * Math.sin(a);
        gear(ctx, pxx, pyy, Rp, Math.round((s.Zr - s.Zs) / 2), -s.ang * (s.Zs / ((s.Zr - s.Zs) / 2)), C.accent);
        /* 行星架连杆 */
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pxx, pyy);
        ctx.stroke();
      }
      label(ctx, '太阳轮 Zs=' + s.Zs, cx, cy + Rs + 16, C.series(0), { align: 'center', size: 10 });
      label(ctx, '齿圈 Zr=' + s.Zr, cx, cy - Rr - 8, C.series(3), { align: 'center', size: 10 });
      label(ctx, '行星架（输出）', cx + 8, cy - 6, C.grid, { size: 10 });
      const fx = s.fixed === 'ring' ? '齿圈固定' : s.fixed === 'sun' ? '太阳轮固定' : '行星架固定';
      ro.set('总传动比', fmt(pl.ratio, 4) + '（k = Zr/Zs = ' + fmt(pl.k, 3) + '，' + fx + '）');
      ro.set('输出转速', fmt(pl.outputRpm, 2) + ' rpm（输入 ' + fmt(s.rpm, 0) + ' rpm）');
      ro.set('输出转向', s.fixed === 'carrier' ? '齿圈与太阳轮反向' : '与输入同向');
      ro.set('各级速比', s.fixed === 'ring' ? 'i = 1 + k（架输出）' : s.fixed === 'sun' ? 'i = 1 + 1/k（架输出）' : 'i = −k（齿圈输出，反向）');
    }
  }

  const controls = anim(host, {
    onTick(dt) { s.ang += dt * 1.6; draw(); },
    onReset() { s.ang = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rpm', label: '输入转速', min: 10, max: 600, step: 5, value: s.rpm, fmt: 0 },
        { name: 'stages', label: '齿轮个数', min: 2, max: 4, step: 1, value: s.stages, fmt: 0 },
        { name: 'z1', label: 'Z1（首轮）', min: 8, max: 100, step: 1, value: s.z1, fmt: 0 },
        { name: 'z2', label: 'Z2（惰轮）', min: 8, max: 100, step: 1, value: s.z2, fmt: 0 },
        { name: 'z3', label: 'Z3', min: 8, max: 100, step: 1, value: s.z3, fmt: 0 },
        { name: 'z4', label: 'Z4（末轮）', min: 8, max: 100, step: 1, value: s.z4, fmt: 0 },
        { name: 'Zs', label: '行星：太阳轮 Zs', min: 12, max: 60, step: 1, value: s.Zs, fmt: 0 },
        { name: 'Zr', label: '行星：齿圈 Zr', min: 36, max: 140, step: 1, value: s.Zr, fmt: 0 },
      ],
    },
    (st) => {
      s.rpm = st.rpm; s.stages = st.stages;
      s.z1 = st.z1; s.z2 = st.z2; s.z3 = st.z3; s.z4 = st.z4;
      s.Zs = st.Zs; s.Zr = st.Zr;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
