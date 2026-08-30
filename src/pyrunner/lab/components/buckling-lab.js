/* 压杆稳定与屈曲：拖杆长、截面与端部约束，看欧拉临界载荷 Pcr = π²EI/(KL)² 怎么塌。
   左边是 P-δ 分岔图（P<Pcr 时 δ 只能为 0，跨过 Pcr 才分出两条非零支路），
   右边是一阶屈曲模态 sin(πx/L)。判定长细比够不够格用欧拉公式。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

const MATS = {
  steel: { label: '钢', E: 210e9, sy: 250e6 },
  alu: { label: '铝', E: 69e9, sy: 200e6 },
  wood: { label: '木', E: 11e9, sy: 40e6 },
};
/* 端部约束的有效长度系数 K */
const ENDS = [
  { label: '两端铰 K=1.0', k: 1.0 },
  { label: '固-自由 K=2.0', k: 2.0 },
  { label: '两端固 K=0.5', k: 0.5 },
  { label: '固-铰 K=0.7', k: 0.7 },
];

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mat: spec.mat || 'steel',
    end: spec.end ?? 0,
    L: spec.L ?? 2,
    d: spec.d ?? 30,      // 圆截面直径 mm
    ratio: spec.ratio ?? 0.8, // P / Pcr
  };

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ 'Pcr（欧拉）': '—', '施加载荷 P': '—', '长细比 λ': '—', '欧拉公式': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MATS).map((k) => ({ label: MATS[k].label, value: k })),
    s.mat,
    (v) => { s.mat = v; draw(); },
  ));
  host.appendChild(buildSegmented(
    ENDS.map((e, i) => ({ label: e.label, value: String(i) })),
    String(s.end),
    (v) => { s.end = Number(v); draw(); },
  ));

  let mech = null;
  let out = null;

  function compute() {
    if (!mech) return;
    const m = MATS[s.mat];
    const sec = mech.sectionCircle(s.d / 1000);
    const K = ENDS[s.end].k;
    const Pcr = mech.eulerPcr(m.E, sec.I, s.L, K);
    const chk = mech.columnCheck(m.E, m.sy, sec.I, sec.A, s.L, K);
    out = { sec, K, Pcr, chk, P: s.ratio * Pcr };
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
    const { Pcr, chk, P } = out;

    /* ================= 左：压杆与一阶屈曲模态 ================= */
    const colX = 74;
    const colTop = 34;
    const colBot = H - 46;
    const colH = colBot - colTop;
    /* 分岔后的一阶模态幅值：δ ∝ sqrt(P/Pcr − 1) */
    const amp = P > Pcr ? clamp(Math.sqrt(P / Pcr - 1) * 26, 0, 34) : 1.2;
    const pts = [];
    for (let i = 0; i <= 60; i += 1) {
      const t = i / 60;
      pts.push([colX + Math.sin(Math.PI * t) * amp, colTop + t * colH]);
    }
    /* 未屈曲的直线位置 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(colX, colTop);
    ctx.lineTo(colX, colBot);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = P > Pcr ? C.bad : C.ok;
    ctx.lineWidth = 3 + clamp(s.d / 26, 1, 5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();

    /* 端部约束符号 */
    const endCap = (y, kind) => {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      if (kind === 'fixed') {
        ctx.beginPath();
        ctx.moveTo(colX - 16, y);
        ctx.lineTo(colX + 16, y);
        ctx.stroke();
        for (let k = -1; k <= 1; k += 1) {
          ctx.beginPath();
          ctx.moveTo(colX + k * 11, y);
          ctx.lineTo(colX + k * 11 - 6, y + (y < H / 2 ? -8 : 8));
          ctx.stroke();
        }
      } else if (kind === 'free') {
        ctx.beginPath();
        ctx.arc(colX, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(colX, y + (y < H / 2 ? 12 : -12));
        ctx.lineTo(colX - 10, y);
        ctx.lineTo(colX + 10, y);
        ctx.closePath();
        ctx.stroke();
      }
    };
    const kindTop = s.end === 1 ? 'fixed' : s.end === 2 ? 'fixed' : s.end === 3 ? 'fixed' : 'pin';
    const kindBot = s.end === 1 ? 'free' : s.end === 2 ? 'fixed' : 'pin';
    endCap(colTop, kindTop);
    endCap(colBot, kindBot);

    /* 轴向载荷箭头 */
    ctx.strokeStyle = C.named('red');
    ctx.fillStyle = C.named('red');
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(colX, colTop - 26);
    ctx.lineTo(colX, colTop - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(colX, colTop - 3);
    ctx.lineTo(colX - 5, colTop - 13);
    ctx.lineTo(colX + 5, colTop - 13);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'P = ' + fmt(P / 1000, 2) + ' kN', colX + 8, colTop - 18, C.named('red'), { size: 10, weight: 600 });
    label(ctx, 'L = ' + fmt(s.L, 2) + ' m', colX + 22, (colTop + colBot) / 2, C.fg, { size: 10 });

    /* ================= 右：P-δ 分岔图 ================= */
    const gx = 168;
    const gw = W - gx - 44;
    const gy = H - 46;
    const gh = H - 96;
    const dMax = 40;
    const pMax = Pcr * 2.2;
    const pxy = (v) => gy - (v / pMax) * gh;
    const dxx = (v) => gx + gw / 2 + (v / dMax) * (gw / 2);

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx + gw / 2, gy - gh);
    ctx.lineTo(gx + gw / 2, gy);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'δ →', gx + gw + 6, gy + 4, C.fg, { size: 10 });
    label(ctx, 'P', gx + gw / 2 - 16, gy - gh + 10, C.fg, { size: 11 });

    /* 稳定支路 δ=0 */
    polyline(ctx, [[gx + gw / 2, gy], [gx + gw / 2, pxy(Pcr)]], C.ok, 3);
    /* 不稳定：Pcr 以上同一支路用虚线 */
    polyline(ctx, [[gx + gw / 2, pxy(Pcr)], [gx + gw / 2, gy - gh]], C.bad, 2, [4, 3]);
    /* 分岔后两条支路 δ = ±δ0·sqrt(P/Pcr − 1) */
    const br1 = [];
    const br2 = [];
    for (let i = 0; i <= 60; i += 1) {
      const r = 1 + (i / 60) * (pMax / Pcr - 1);
      const dd = Math.min(dMax, Math.sqrt(r - 1) * 26);
      br1.push([dxx(dd), pxy(r * Pcr)]);
      br2.push([dxx(-dd), pxy(r * Pcr)]);
    }
    polyline(ctx, br1, C.named('purple'), 2.4);
    polyline(ctx, br2, C.named('purple'), 2.4);

    /* Pcr 水平线与分岔点 */
    ctx.save();
    ctx.strokeStyle = C.named('amber');
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, pxy(Pcr));
    ctx.lineTo(gx + gw, pxy(Pcr));
    ctx.stroke();
    ctx.restore();
    label(ctx, 'Pcr = ' + fmt(Pcr / 1000, 2) + ' kN', gx + 4, pxy(Pcr) - 6, C.named('amber'), { size: 10, weight: 600 });
    label(ctx, '分岔点', gx + gw / 2 + 8, pxy(Pcr) + 14, C.named('amber'), { size: 10 });

    /* 当前 P */
    const py = pxy(Math.min(P, pMax));
    polyline(ctx, [[gx, py], [gx + gw, py]], C.named('red'), 1.6, [3, 3]);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(P > Pcr ? dxx(P > Pcr ? Math.min(amp, dMax) : 0) : gx + gw / 2, py, 4.5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, 'δ=0 稳定', gx + gw / 2 + 6, gy - 6, C.ok, { size: 10 });
    label(ctx, '分岔后失稳', gx + gw - 4, gy - gh + 12, C.named('purple'), { align: 'right', size: 10 });

    ro.set('Pcr（欧拉）', fmt(Pcr / 1000, 2) + ' kN（K = ' + out.K + '）');
    ro.set('施加载荷 P', fmt(P / 1000, 2) + ' kN = ' + fmt(s.ratio, 2) + ' Pcr' + (P > Pcr ? '（已失稳）' : '（安全）'));
    ro.set('长细比 λ', fmt(chk.slenderness, 1) + '（转折长细比 λp = ' + fmt(chk.transitionSlenderness, 1) + '）');
    ro.set('欧拉公式', chk.eulerValid
      ? '适用：λ > λp，属弹性屈曲，σcr = ' + fmt(chk.sigmaCr / 1e6, 1) + ' MPa'
      : '不适用：λ < λp，屈曲前已屈服（σcr = ' + fmt(chk.sigmaCr / 1e6, 1) + ' MPa > σy），须用经验公式');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'ratio', label: 'P / Pcr', min: 0, max: 2, step: 0.02, value: s.ratio, fmt: 2 },
        { name: 'L', label: '杆长 L', min: 0.3, max: 6, step: 0.05, value: s.L, fmt: 2 },
        { name: 'd', label: '圆截面直径 d', min: 8, max: 120, step: 1, value: s.d, fmt: 0 },
      ],
    },
    (st) => { s.ratio = st.ratio; s.L = st.L; s.d = st.d; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('mech').then((m) => { mech = m; draw(); }).catch(() => { void 0; });
  return { slidersBox: sliders.box, destroy() {} };
}
