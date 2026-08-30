/* 平面机构与自由度：Grübler 公式 F = 3(n−1) − 2j₁ − j₂。
   n 含机架，j₁ 是低副（转动副/移动副，吃掉 2 个自由度），j₂ 是高副（齿轮啮合/凸轮接触，吃掉 1 个）。
   逐个机构把构件数和运动副数标在图上，公式就不只是背诵了。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  label, clamp, fmt,
} from '../core.js';

const MECHS = {
  fourbar: { label: '铰链四杆', n: 4, j1: 4, j2: 0 },
  slider: { label: '曲柄滑块', n: 4, j1: 4, j2: 0 },
  cam: { label: '凸轮从动件', n: 3, j1: 2, j2: 1 },
  gear: { label: '齿轮副', n: 3, j1: 2, j2: 1 },
  fivebar: { label: '五杆机构', n: 5, j1: 5, j2: 0 },
  custom: { label: '自定义', n: 5, j1: 6, j2: 0 },
};

function joint(ctx, x, y, C, no) {
  ctx.fillStyle = C.bg;
  ctx.strokeStyle = C.named('amber');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (no !== undefined) label(ctx, String(no), x + 8, y - 6, C.named('amber'), { size: 10, weight: 600 });
}

function ground(ctx, x, y, C) {
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 11, y);
  ctx.lineTo(x + 11, y);
  ctx.stroke();
  for (let k = -1; k <= 1; k += 1) {
    ctx.beginPath();
    ctx.moveTo(x + k * 8, y);
    ctx.lineTo(x + k * 8 - 5, y + 7);
    ctx.stroke();
  }
}

export default function render(host, spec) {
  const C = themeColors();
  const s = { key: spec.key || 'fourbar', n: 5, j1: 6, j2: 0 };

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ '构件数 n': '—', '低副 j₁': '—', '高副 j₂': '—', '自由度 F': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MECHS).map((k) => ({ label: MECHS[k].label, value: k })),
    s.key,
    (v) => { s.key = v; syncSliders(); draw(); },
  ));

  let sliders = null;
  /* 只有「自定义」模式才能让 n/j₁/j₂ 生效，其余机构的副数是固定的 */
  function syncSliders() {
    if (!sliders) return;
    sliders.box.querySelectorAll('input[type=range]').forEach((inp) => {
      inp.disabled = s.key !== 'custom';
    });
  }

  function counts() {
    if (s.key === 'custom') return { n: s.n, j1: s.j1, j2: s.j2 };
    const m = MECHS[s.key];
    return { n: m.n, j1: m.j1, j2: m.j2 };
  }

  /* ---- 各机构的平面示意图 ---- */
  function drawMechanism(ctx, W, H) {
    const cx = W / 2;
    const cy = H * 0.52;
    const u = Math.min(W / 12, H / 8); // 单位长度
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    if (s.key === 'fourbar') {
      const A = [cx - 3 * u, cy + u];
      const D = [cx + 2.2 * u, cy + u];
      const B = [A[0] + 1.1 * u, A[1] - 1.9 * u];
      const Cc = [D[0] - 0.5 * u, D[1] - 2.0 * u];
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(D[0], D[1]);
      ctx.stroke();
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(Cc[0], Cc[1]);
      ctx.stroke();
      ctx.strokeStyle = C.series(0);
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      ctx.strokeStyle = C.series(3);
      ctx.beginPath();
      ctx.moveTo(Cc[0], Cc[1]);
      ctx.lineTo(D[0], D[1]);
      ctx.stroke();
      [A, B, Cc, D].forEach((p, i) => joint(ctx, p[0], p[1], C, i + 1));
      ground(ctx, A[0], A[1] + 10, C);
      ground(ctx, D[0], D[1] + 10, C);
      label(ctx, '机架 1', (A[0] + D[0]) / 2, cy + u + 24, C.grid, { align: 'center', size: 10 });
      label(ctx, '连杆 3（耦合杆）', (B[0] + Cc[0]) / 2, (B[1] + Cc[1]) / 2 - 8, C.accent, { align: 'center', size: 10 });
    } else if (s.key === 'slider') {
      const A = [cx - 3 * u, cy];
      const B = [A[0] + 0.9 * u, A[1] - 1.6 * u];
      const S = [cx + 3 * u, A[1]];
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + 0.6 * u, A[1] + 12);
      ctx.lineTo(cx + 4.4 * u, A[1] + 12);
      ctx.stroke();
      ctx.strokeStyle = C.series(0);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      ctx.strokeStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(S[0] - 0.6 * u, S[1]);
      ctx.stroke();
      /* 滑块 */
      ctx.fillStyle = C.series(3);
      ctx.strokeStyle = C.series(3);
      ctx.beginPath();
      ctx.rect(S[0] - 0.6 * u, S[1] - 14, 1.3 * u, 28);
      ctx.fill();
      joint(ctx, A[0], A[1], C, 1);
      joint(ctx, B[0], B[1], C, 2);
      joint(ctx, S[0] - 0.6 * u, S[1], C, 3);
      label(ctx, '移动副 4', S[0] + 0.2 * u, S[1] + 28, C.named('amber'), { size: 10 });
      ground(ctx, A[0], A[1] + 12, C);
      label(ctx, '机架 1 → 曲柄 2 → 连杆 3 → 滑块 4', cx - 3 * u, cy - 2.6 * u, C.fg, { size: 10 });
    } else if (s.key === 'cam') {
      const O = [cx - 1.2 * u, cy];
      const R = 1.5 * u;
      ctx.strokeStyle = C.series(0);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let i = 0; i <= 90; i += 1) {
        const a = (i / 90) * Math.PI * 2;
        const r = R * (1 + 0.28 * Math.cos(a));
        const X = O[0] + r * Math.cos(a);
        const Y = O[1] + r * Math.sin(a);
        if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      ctx.closePath();
      ctx.stroke();
      /* 从动件 */
      const fx = O[0] + R * 1.28;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, cy - 3.4 * u);
      ctx.lineTo(fx, cy - 0.2 * u);
      ctx.stroke();
      /* 导路（移动副） */
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(fx - 9, cy - 3.6 * u, 18, 2.0 * u);
      ctx.stroke();
      joint(ctx, O[0], O[1], C, 1);
      ctx.fillStyle = C.named('amber');
      ctx.beginPath();
      ctx.arc(fx, cy - 0.2 * u, 5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, '高副（点接触）', fx + 12, cy + 4, C.named('amber'), { size: 10 });
      label(ctx, '低副（转动+移动）各 1', fx + 12, cy + 18, C.named('amber'), { size: 10 });
      ground(ctx, O[0], O[1] + 10, C);
    } else if (s.key === 'gear') {
      const R1 = 1.1 * u;
      const R2 = 1.9 * u;
      const O1 = [cx - 1.6 * u, cy];
      const O2 = [O1[0] + R1 + R2, cy - 0.2 * u];
      [[O1, R1, 14, 0], [O2, R2, 24, 3]].forEach(([O, R, Z, ci]) => {
        ctx.strokeStyle = C.series(ci);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(O[0], O[1], R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        for (let i = 0; i < Z; i += 1) {
          const a = (i / Z) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(O[0] + R * Math.cos(a), O[1] + R * Math.sin(a));
          ctx.lineTo(O[0] + (R + 7) * Math.cos(a), O[1] + (R + 7) * Math.sin(a));
          ctx.stroke();
        }
      });
      joint(ctx, O1[0], O1[1], C, 1);
      joint(ctx, O2[0], O2[1], C, 2);
      ground(ctx, O1[0], O1[1] + 12, C);
      ground(ctx, O2[0], O2[1] + 12, C);
      ctx.fillStyle = C.named('amber');
      ctx.beginPath();
      ctx.arc((O1[0] + O2[0]) / 2 + 4, (O1[1] + O2[1]) / 2 + 4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, '高副：齿面啮合（约束 1 个自由度）', (O1[0] + O2[0]) / 2, cy + 2.6 * u, C.named('amber'), { align: 'center', size: 10 });
    } else if (s.key === 'fivebar') {
      const A = [cx - 3 * u, cy + 1.4 * u];
      const E = [cx + 3 * u, cy + 1.4 * u];
      const B = [A[0] + 0.8 * u, A[1] - 2 * u];
      const D = [E[0] - 0.8 * u, E[1] - 2 * u];
      const Cc = [cx, cy - 2.8 * u];
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(E[0], E[1]);
      ctx.stroke();
      ctx.strokeStyle = C.series(0);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      ctx.strokeStyle = C.series(3);
      ctx.beginPath();
      ctx.moveTo(E[0], E[1]);
      ctx.lineTo(D[0], D[1]);
      ctx.stroke();
      ctx.strokeStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(Cc[0], Cc[1]);
      ctx.lineTo(D[0], D[1]);
      ctx.stroke();
      [A, B, Cc, D, E].forEach((p, i) => joint(ctx, p[0], p[1], C, i + 1));
      ground(ctx, A[0], A[1] + 10, C);
      ground(ctx, E[0], E[1] + 10, C);
      label(ctx, 'F = 2：需要两个原动件才有确定运动', cx, cy + 3.2 * u, C.named('red'), { align: 'center', size: 11, weight: 600 });
    } else {
      /* 自定义：只画示意图——n 个构件串成一条开链 */
      const N = clamp(s.n, 2, 9);
      const j1 = clamp(s.j1, 0, 12);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 3;
      const step = Math.min((W - 60) / N, 46);
      const x0 = cx - (N - 1) * step / 2;
      ctx.beginPath();
      for (let i = 0; i < N; i += 1) {
        const X = x0 + i * step;
        const Y = cy + Math.sin(i * 1.1) * 12;
        if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      ctx.stroke();
      for (let i = 0; i < N; i += 1) {
        const X = x0 + i * step;
        const Y = cy + Math.sin(i * 1.1) * 12;
        joint(ctx, X, Y, C, i + 1);
      }
      ground(ctx, x0, cy + 26, C);
      label(ctx, '构件 ' + N + ' 个（含机架）· 低副 ' + j1 + ' · 高副 ' + s.j2, cx, cy + 3.0 * u, C.fg, { align: 'center', size: 10 });
    }
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const { n, j1, j2 } = counts();
    const F = 3 * (n - 1) - 2 * j1 - j2;
    drawMechanism(ctx, W, H);

    label(ctx, 'F = 3(n−1) − 2j₁ − j₂ = 3×' + (n - 1) + ' − 2×' + j1 + ' − ' + j2 + ' = ' + F, 10, 16, C.fg, { size: 12, weight: 600 });
    label(ctx, 'n 含机架 · j₁ 低副（转动/移动，各约束 2）· j₂ 高副（点线接触，各约束 1）', 10, 32, C.fg, { size: 10 });

    ro.set('构件数 n', n + '（机架 + ' + (n - 1) + ' 活动构件）');
    ro.set('低副 j₁', j1 + ' 个');
    ro.set('高副 j₂', j2 + ' 个');
    ro.set('自由度 F', F + '　→ ' + (F === 1 ? '一个原动件即可确定运动（最常见）'
      : F <= 0 ? 'F ≤ 0：不是机构，是静定/超静定桁架'
        : F + ' 个原动件才能有确定运动'));
  }

  sliders = buildSliders(
    {
      sliders: [
        { name: 'n', label: '构件数 n（含机架）', min: 2, max: 9, step: 1, value: s.n, fmt: 0 },
        { name: 'j1', label: '低副数 j₁', min: 0, max: 14, step: 1, value: s.j1, fmt: 0 },
        { name: 'j2', label: '高副数 j₂', min: 0, max: 5, step: 1, value: s.j2, fmt: 0 },
      ],
    },
    (st) => { s.n = st.n; s.j1 = st.j1; s.j2 = st.j2; draw(); },
  );
  syncSliders();

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
