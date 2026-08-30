/* 梁的剪力图与弯矩图：载荷图 / V(x) / M(x) 三格上下对齐画。
   要验的命题只有一句：M 取极值的地方，V 一定过零（dM/dx = V）。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    support: spec.support || 'simply',
    L: spec.L ?? 6,
    P: spec.P ?? 20000,
    a: spec.a ?? 3,
    w: spec.w ?? 5000,
  };

  const cv = setupCanvas(host, 340);
  const ro = buildReadout({ '支座反力': '—', 'Vmax': '—', 'Mmax': '—', 'M 极值处 V': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '简支梁', value: 'simply' }, { label: '悬臂梁', value: 'cantilever' }],
    s.support,
    (v) => { s.support = v; draw(); },
  ));

  let mech = null;
  let res = null;

  function compute() {
    if (!mech) return;
    const loads = [{ type: 'udl', w: -s.w, x0: 0, x1: s.L }];
    if (s.P > 0) loads.push({ type: 'point', P: -s.P, x: clamp(s.a, 0.05, s.L - 0.05) });
    res = mech.beamAnalysis({ L: s.L, EI: 1e7, loads, support: s.support, n: 301 });
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!res) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const gx = 46;
    const gw = W - 74;
    const pad = 8;
    const rows = [
      { y: 40, h: 62, name: '载荷' },
      { y: 128, h: 76, name: '剪力 V' },
      { y: 230, h: 82, name: '弯矩 M' },
    ];
    const ex = (x) => gx + (x / s.L) * gw;
    const Vmax = Math.max(1, ...res.V.map(Math.abs));
    const Mmax = Math.max(1, ...res.M.map(Math.abs));

    rows.forEach((r) => {
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, r.y + r.h / 2);
      ctx.lineTo(gx + gw, r.y + r.h / 2);
      ctx.stroke();
      label(ctx, r.name, 6, r.y + r.h / 2 + 4, C.fg, { size: 11, weight: 600 });
    });

    /* --- 载荷图 --- */
    const r0 = rows[0];
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex(0), r0.y + r0.h / 2);
    ctx.lineTo(ex(s.L), r0.y + r0.h / 2);
    ctx.stroke();
    /* 分布载荷：一排小箭头 */
    const nArr = Math.max(4, Math.round(gw / 34));
    for (let i = 0; i <= nArr; i += 1) {
      const X = ex((i / nArr) * s.L);
      ctx.strokeStyle = C.named('teal');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X, r0.y + r0.h / 2 - 20);
      ctx.lineTo(X, r0.y + r0.h / 2 - 4);
      ctx.moveTo(X, r0.y + r0.h / 2 - 4);
      ctx.lineTo(X - 3.5, r0.y + r0.h / 2 - 11);
      ctx.lineTo(X + 3.5, r0.y + r0.h / 2 - 11);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = C.named('teal');
    ctx.beginPath();
    ctx.moveTo(ex(0), r0.y + r0.h / 2 - 20);
    ctx.lineTo(ex(s.L), r0.y + r0.h / 2 - 20);
    ctx.stroke();
    label(ctx, 'w = ' + fmt(s.w / 1000, 1) + ' kN/m', ex(s.L / 2), r0.y + r0.h / 2 - 26, C.named('teal'), { align: 'center', size: 10 });
    /* 集中力 */
    if (s.P > 0) {
      const X = ex(clamp(s.a, 0.05, s.L - 0.05));
      ctx.strokeStyle = C.named('red');
      ctx.fillStyle = C.named('red');
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(X, r0.y + r0.h / 2 - 46);
      ctx.lineTo(X, r0.y + r0.h / 2 - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X, r0.y + r0.h / 2 - 2);
      ctx.lineTo(X - 5, r0.y + r0.h / 2 - 12);
      ctx.lineTo(X + 5, r0.y + r0.h / 2 - 12);
      ctx.closePath();
      ctx.fill();
      label(ctx, 'P = ' + fmt(s.P / 1000, 1) + ' kN', X + 6, r0.y + r0.h / 2 - 40, C.named('red'), { size: 10, weight: 600 });
    }
    /* 支座符号 */
    const drawSup = (X, fixedEnd) => {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X, r0.y + r0.h / 2);
      ctx.lineTo(X - 9, r0.y + r0.h / 2 + 16);
      ctx.lineTo(X + 9, r0.y + r0.h / 2 + 16);
      ctx.closePath();
      ctx.stroke();
      if (fixedEnd) {
        ctx.beginPath();
        ctx.moveTo(X - 11, r0.y + r0.h / 2 - 12);
        ctx.lineTo(X - 11, r0.y + r0.h / 2 + 16);
        ctx.stroke();
        for (let k = 0; k < 3; k += 1) {
          ctx.beginPath();
          ctx.moveTo(X - 11, r0.y + r0.h / 2 - 8 + k * 9);
          ctx.lineTo(X - 21, r0.y + r0.h / 2 - 2 + k * 9);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(X - 5, r0.y + r0.h / 2 + 20, 4, 0, Math.PI * 2);
        ctx.moveTo(X + 10, r0.y + r0.h / 2 + 20);
        ctx.arc(X + 5, r0.y + r0.h / 2 + 20, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    if (s.support === 'simply') { drawSup(ex(0), false); drawSup(ex(s.L), false); }
    else drawSup(ex(0), true);

    /* --- 剪力图与弯矩图（填充） --- */
    const fill = (arr, max, row, color) => {
      const pts = arr.map((v, i) => [ex(res.x[i]), row.y + row.h / 2 - (v / max) * (row.h / 2 - pad)]);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], row.y + row.h / 2);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(pts[pts.length - 1][0], row.y + row.h / 2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      polyline(ctx, pts, color, 2);
    };
    fill(res.V, Vmax, rows[1], C.series(0));
    fill(res.M, Mmax, rows[2], C.series(3));

    /* --- 极值位置：验证 dM/dx = V --- */
    let iM = 0;
    res.M.forEach((v, i) => { if (Math.abs(v) > Math.abs(res.M[iM])) iM = i; });
    const xM = res.x[iM];
    rows.forEach((r, k) => {
      if (k === 0) return;
      ctx.save();
      ctx.strokeStyle = C.named('amber');
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex(xM), r.y);
      ctx.lineTo(ex(xM), r.y + r.h);
      ctx.stroke();
      ctx.restore();
    });
    label(ctx, 'M 极值 x = ' + fmt(xM, 2) + ' m', ex(xM) + 5, rows[2].y - 4, C.named('amber'), { size: 10 });

    label(ctx, 'Vmax = ' + fmt(Vmax / 1000, 2) + ' kN', gx + gw, rows[1].y + 10, C.series(0), { align: 'right', size: 10 });
    label(ctx, 'Mmax = ' + fmt(Mmax / 1000, 2) + ' kN·m', gx + gw, rows[2].y + 10, C.series(3), { align: 'right', size: 10 });

    ro.set('支座反力', s.support === 'simply'
      ? 'R左 ' + fmt(res.reactions.R0 / 1000, 2) + ' / R右 ' + fmt(res.reactions.RL / 1000, 2) + ' kN'
      : '固定端 ' + fmt(res.reactions.R0 / 1000, 2) + ' kN');
    ro.set('Vmax', fmt(Vmax / 1000, 2) + ' kN');
    ro.set('Mmax', fmt(Mmax / 1000, 2) + ' kN·m');
    ro.set('M 极值处 V', fmt(res.V[iM] / 1000, 3) + ' kN（应 ≈ 0，即 dM/dx = V）');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'L', label: '跨度 L', min: 2, max: 12, step: 0.1, value: s.L, fmt: 2 },
        { name: 'P', label: '集中力 P', min: 0, max: 60000, step: 500, value: s.P, fmt: 0 },
        { name: 'a', label: '集中力位置 a', min: 0.2, max: 11.8, step: 0.1, value: s.a, fmt: 2 },
        { name: 'w', label: '分布载荷 w', min: 0, max: 20000, step: 250, value: s.w, fmt: 0 },
      ],
    },
    (st) => { s.L = st.L; s.P = st.P; s.a = clamp(st.a, 0.2, st.L - 0.2); s.w = st.w; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
