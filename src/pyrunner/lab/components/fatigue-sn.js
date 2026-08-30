/* 疲劳与 S-N 曲线：左半屏是双对数 S-N 曲线（Basquin 关系 S = Sf·Nᵇ），
   右半屏是 Goodman 图。要点：疲劳不是「力太大」，而是「反复」——
   静载下安全到离谱的应力幅，循环几万次照样断；平均应力还会偷走裕度。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

const MATS = {
  steel: { label: '合金钢', Sf: 1400e6, b: -0.085, Se: 280e6, Sut: 800e6 },
  alu: { label: '铝合金', Sf: 500e6, b: -0.11, Se: 90e6, Sut: 320e6 },
  cast: { label: '铸铁', Sf: 700e6, b: -0.10, Se: 120e6, Sut: 300e6 },
};

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mat: spec.mat || 'steel',
    sa: spec.sa ?? 220,   // 应力幅 MPa
    sm: spec.sm ?? 100,   // 平均应力 MPa
  };

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '疲劳寿命 N': '—', 'Goodman 比值': '—', '许用应力幅': '—', '安全裕度': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MATS).map((k) => ({ label: MATS[k].label, value: k })),
    s.mat,
    (v) => { s.mat = v; draw(); },
  ));

  let mech = null;
  let out = null;

  function compute() {
    if (!mech) return;
    const m = MATS[s.mat];
    const sa = s.sa * 1e6;
    const sm = s.sm * 1e6;
    /* Basquin 只按应力幅算寿命；低于疲劳极限视为无限寿命 */
    const infinite = sa <= m.Se;
    const N = infinite ? Infinity : mech.basquinN(sa, m.Sf, m.b);
    const g = mech.goodman(sa, sm, m.Se, m.Sut);
    const saAllow = m.Se * Math.max(0, 1 - sm / m.Sut);
    out = { m, sa, sm, N, infinite, g, saAllow };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    compute();
    if (!out) {
      label(ctx, '正在载入 mech 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }
    const { m, sa, sm, N, infinite, g, saAllow } = out;

    const halfW = W / 2 - 6;
    const top = 34;
    const bot = H - 34;

    /* ================= 左：S-N 双对数曲线 ================= */
    const lx0 = 48;
    const lw = halfW - lx0 - 12;
    const N0 = 1e3;
    const N1 = 1e9;
    const S0 = 40e6;
    const S1 = 1600e6;
    const nx = (v) => lx0 + (Math.log10(clamp(v, N0, N1)) - Math.log10(N0)) / (Math.log10(N1) - Math.log10(N0)) * lw;
    const syv = (v) => bot - (Math.log10(clamp(v, S0, S1)) - Math.log10(S0)) / (Math.log10(S1) - Math.log10(S0)) * (bot - top);

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx0, top);
    ctx.lineTo(lx0, bot);
    ctx.lineTo(lx0 + lw, bot);
    ctx.stroke();
    [1e3, 1e5, 1e7, 1e9].forEach((v) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(nx(v), top);
      ctx.lineTo(nx(v), bot);
      ctx.stroke();
      label(ctx, v >= 1e6 ? '1e' + Math.log10(v) : String(v), nx(v), bot + 13, C.fg, { align: 'center', size: 9 });
    });
    [1e8, 1e9].forEach((v) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(lx0, syv(v));
      ctx.lineTo(lx0 + lw, syv(v));
      ctx.stroke();
      label(ctx, fmt(v / 1e6, 0) + ' MPa', lx0 - 4, syv(v) + 3, C.fg, { align: 'right', size: 9 });
    });
    label(ctx, '循环次数 N（对数）', lx0 + lw / 2, bot + 26, C.fg, { align: 'center', size: 10 });
    label(ctx, 'S-N 曲线（双对数）', lx0, top - 12, C.fg, { size: 11, weight: 600 });

    /* Basquin 直线 */
    const pts = [];
    for (let i = 0; i <= 120; i += 1) {
      const n = 10 ** (Math.log10(N0) + (i / 120) * (Math.log10(N1) - Math.log10(N0)));
      pts.push([nx(n), syv(mech.basquinS(n, m.Sf, m.b))]);
    }
    polyline(ctx, pts, C.accent, 2.4);

    /* 疲劳极限与循环基数 */
    ctx.save();
    ctx.strokeStyle = C.ok;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(lx0, syv(m.Se));
    ctx.lineTo(lx0 + lw, syv(m.Se));
    ctx.moveTo(nx(1e7), top);
    ctx.lineTo(nx(1e7), bot);
    ctx.stroke();
    ctx.restore();
    label(ctx, '疲劳极限 Se = ' + fmt(m.Se / 1e6, 0) + ' MPa', lx0 + lw - 2, syv(m.Se) - 5, C.ok, { align: 'right', size: 9 });
    label(ctx, '1e7 循环基数', nx(1e7) + 3, top + 10, C.fg, { size: 9 });

    /* 当前工作点 */
    const cy = syv(sa);
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(lx0, cy);
    ctx.lineTo(lx0 + lw, cy);
    ctx.stroke();
    ctx.restore();
    const cx = infinite ? nx(N1) : nx(N);
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'σa = ' + fmt(s.sa, 0) + ' MPa', lx0 + 4, cy - 6, C.named('amber'), { size: 10, weight: 600 });

    /* ================= 右：Goodman 图 ================= */
    const rx0 = halfW + 46;
    const rw = W - rx0 - 16;
    const smMax = m.Sut * 1.1;
    const saMax = Math.max(m.Se, saAllow, sa) * 1.25;
    const gx = (v) => rx0 + (clamp(v, 0, smMax) / smMax) * rw;
    const gy = (v) => bot - (clamp(v, 0, saMax) / saMax) * (bot - top);

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx0, top);
    ctx.lineTo(rx0, bot);
    ctx.lineTo(rx0 + rw, bot);
    ctx.stroke();
    label(ctx, 'Goodman 判据', rx0, top - 12, C.fg, { size: 11, weight: 600 });
    label(ctx, '平均应力 σm', rx0 + rw / 2, bot + 26, C.fg, { align: 'center', size: 10 });
    label(ctx, 'σa', rx0 - 6, top + 8, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Sut = ' + fmt(m.Sut / 1e6, 0), rx0 + rw, bot + 13, C.fg, { align: 'center', size: 9 });

    /* 安全区填充 + Goodman 直线 */
    ctx.beginPath();
    ctx.moveTo(rx0, gy(0));
    ctx.lineTo(rx0, gy(m.Se));
    ctx.lineTo(gx(m.Sut), gy(0));
    ctx.closePath();
    ctx.fillStyle = C.ok;
    ctx.globalAlpha = 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
    polyline(ctx, [[gx(0), gy(m.Se)], [gx(m.Sut), gy(0)]], C.ok, 2.4);
    label(ctx, '安全', rx0 + 10, gy(m.Se * 0.28), C.ok, { size: 10 });
    label(ctx, '失效', rx0 + rw - 10, gy(saMax * 0.86), C.bad, { align: 'right', size: 10 });

    /* 当前点 */
    const px2 = gx(sm);
    const py2 = gy(sa);
    ctx.strokeStyle = C.fg;
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(px2, bot);
    ctx.lineTo(px2, py2);
    ctx.lineTo(rx0, py2);
    ctx.stroke();
    ctx.restore();
    /* 该 σm 下允许的 σa */
    polyline(ctx, [[px2, gy(0)], [px2, gy(saAllow)]], C.named('purple'), 2);
    ctx.fillStyle = g.safe ? C.named('amber') : C.bad;
    ctx.beginPath();
    ctx.arc(px2, py2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, fmt(saAllow / 1e6, 0) + ' MPa', px2 + 5, gy(saAllow) - 4, C.named('purple'), { size: 9 });

    ro.set('疲劳寿命 N', infinite ? '无限寿命（σa < Se）' : fmt(N, 0) + ' 次循环');
    ro.set('Goodman 比值', fmt(g.ratio, 3) + (g.safe ? ' ≤ 1' : ' > 1'));
    ro.set('许用应力幅', fmt(saAllow / 1e6, 1) + ' MPa（当前 σm 下）');
    ro.set('安全裕度', g.safe ? fmt(g.margin * 100, 1) + '%　判定：安全' : '超裕度 ' + fmt(-g.margin * 100, 1) + '%　判定：会疲劳失效');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'sa', label: '应力幅 σa', min: 10, max: 700, step: 5, value: s.sa, fmt: 0 },
        { name: 'sm', label: '平均应力 σm', min: 0, max: 600, step: 5, value: s.sm, fmt: 0 },
      ],
    },
    (st) => { s.sa = st.sa; s.sm = st.sm; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m2) => { mech = m2; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
