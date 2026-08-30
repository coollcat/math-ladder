/* 公差配合与尺寸链：五个零件串成一条封闭尺寸链，拖各环公差，
   对比极值法（Σ|t|，保守到近乎浪费）与统计法 RSS（√(Σt²)，靠独立正态的抵消效应）。
   装配合格率说明为什么工程上敢用 RSS：100% 覆盖的代价是公差被压到极紧。 */
import {
  themeColors, setupCanvas, buildReadout, buildSliders, engine, label, fmt,
} from '../core.js';

/* 标准正态 CDF（Abramowitz-Stegun 7.1.26 近似） */
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

const LINKS = [
  { name: '环 1 壳体', t: 0.10 },
  { name: '环 2 垫片', t: 0.05 },
  { name: '环 3 齿轮', t: 0.12 },
  { name: '环 4 隔套', t: 0.08 },
  { name: '环 5 端盖', t: 0.06 },
];

export default function render(host, spec) {
  const C = themeColors();
  const s = { T0: spec.T0 ?? 0.35 };
  const links = LINKS.map((l) => ({ ...l }));

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '极值法合成': '—', '统计法 RSS': '—', 'RSS / 极值': '—', '装配合格率': '—' });
  host.appendChild(ro.box);

  let mech = null;
  let out = null;

  function compute() {
    const tols = links.map((l) => l.t);
    const worst = mech ? mech.toleranceStack(tols, 'worst').total : tols.reduce((a, t) => a + Math.abs(t), 0);
    const rss = mech ? mech.toleranceStack(tols, 'rss').total : Math.sqrt(tols.reduce((a, t) => a + t * t, 0));
    /* 各环按 ±3σ 覆盖，则装配环 σ = RSS/3；合格率 = P(|X| ≤ T0) */
    const sig = rss / 3;
    const pct = sig > 0 ? 2 * phi(s.T0 / sig) - 1 : 1;
    out = { worst, rss, sig, pct };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    const { worst, rss, sig, pct } = out;

    /* ================= 上：尺寸链堆叠条 ================= */
    const yTop = 40;
    const barH = 30;
    const x0 = 20;
    const totalW = W - 40;
    const sum = links.reduce((a, l) => a + l.t, 0);
    let cx = x0;
    label(ctx, '尺寸链各环公差（可拖下方滑块）', x0, yTop - 14, C.fg, { size: 11 });
    links.forEach((l, i) => {
      const w = (l.t / Math.max(sum, 1e-6)) * totalW;
      ctx.fillStyle = C.series(i);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.rect(cx, yTop, Math.max(w, 2), barH);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, yTop, Math.max(w, 2), barH);
      if (w > 40) label(ctx, '±' + fmt(l.t, 3), cx + w / 2, yTop + barH / 2 + 4, C.bg, { align: 'center', size: 10, weight: 600 });
      cx += Math.max(w, 2);
    });

    /* ================= 中：极值法 vs RSS 对比条 ================= */
    const yMid = yTop + barH + 34;
    const maxT = Math.max(worst, rss, s.T0) * 1.12;
    const bw = (v) => (v / maxT) * totalW;
    const rows = [
      { v: worst, c: C.named('red'), t: '极值法 Σ|t|' },
      { v: rss, c: C.named('green'), t: '统计法 √(Σt²)' },
    ];
    rows.forEach((r, i) => {
      const y = yMid + i * 30;
      label(ctx, r.t, x0, y + 4, C.fg, { size: 11 });
      const bx = x0 + 116;
      const wmax = W - 20 - bx - 62;
      ctx.fillStyle = r.c;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.rect(bx, y - 9, Math.max((r.v / maxT) * wmax, 2), 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      label(ctx, '±' + fmt(r.v, 4) + ' mm', bx + Math.max((r.v / maxT) * wmax, 2) + 6, y + 4, r.c, { size: 10, weight: 600 });
    });
    /* 允许的封闭环公差 T0 */
    const ty = yMid + 62;
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + 116 + (s.T0 / maxT) * (W - 20 - x0 - 116 - 62), yMid - 14);
    ctx.lineTo(x0 + 116 + (s.T0 / maxT) * (W - 20 - x0 - 116 - 62), ty + 6);
    ctx.stroke();
    ctx.restore();
    label(ctx, '允许封闭环公差 T0 = ±' + fmt(s.T0, 3) + ' mm', x0, ty + 4, C.named('amber'), { size: 10 });

    /* ================= 下：正态密度与合格率 ================= */
    const gy = H - 30;
    const gh = 56;
    const gx0 = x0 + 10;
    const gw = W - 40;
    const half = maxT * 1.15;
    const nx2 = (v) => gx0 + ((v + half) / (2 * half)) * gw;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx0, gy);
    ctx.lineTo(gx0 + gw, gy);
    ctx.stroke();

    const dens = [];
    for (let i = 0; i <= 200; i += 1) {
      const v = -half + (i / 200) * 2 * half;
      const d = Math.exp(-(v * v) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI));
      dens.push([nx2(v), gy - (d / (1 / (sig * Math.sqrt(2 * Math.PI)))) * gh]);
    }
    /* 落在 ±T0 内的部分染成安全色 */
    ctx.beginPath();
    ctx.moveTo(dens[0][0], gy);
    dens.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(dens[dens.length - 1][0], gy);
    ctx.closePath();
    ctx.fillStyle = C.named('green');
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    dens.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();

    /* ±T0 边界 */
    [-s.T0, s.T0].forEach((v) => {
      ctx.strokeStyle = C.named('amber');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(nx2(v), gy);
      ctx.lineTo(nx2(v), gy - gh - 4);
      ctx.stroke();
    });
    label(ctx, '装配误差分布（σ = RSS/3 = ' + fmt(sig, 4) + ' mm）', gx0, gy - gh - 8, C.fg, { size: 10 });
    label(ctx, fmt(pct * 100, 3) + '%', gx0 + gw / 2, gy - gh / 2, C.named('green'), { align: 'center', size: 13, weight: 700 });

    ro.set('极值法合成', '±' + fmt(worst, 4) + ' mm' + (worst <= s.T0 ? '（全部合格，但公差很紧）' : '（超差：极值法判废）'));
    ro.set('统计法 RSS', '±' + fmt(rss, 4) + ' mm');
    ro.set('RSS / 极值', fmt((rss / Math.max(worst, 1e-9)) * 100, 1) + '%（环数越多，RSS 省得越多）');
    ro.set('装配合格率', fmt(pct * 100, 4) + '%　' + (worst <= s.T0 ? '极值法：100%（保守）' : '极值法：判废，但统计法仍有 ' + fmt(pct * 100, 2) + '% 合格'));
  }

  const sliders = buildSliders(
    {
      sliders: links.map((l, i) => ({
        name: 't' + i, label: l.name + ' ±', min: 0.01, max: 0.30, step: 0.005, value: l.t, fmt: 3,
      })).concat([{ name: 'T0', label: '允许封闭环公差 T0', min: 0.05, max: 1.0, step: 0.01, value: s.T0, fmt: 3 }]),
    },
    (st) => {
      links.forEach((l, i) => { l.t = st['t' + i]; });
      s.T0 = st.T0;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
