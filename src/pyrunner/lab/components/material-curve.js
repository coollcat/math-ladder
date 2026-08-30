/* 材料本构与弹性模量：画完整的工程应力-应变曲线，拖当前应变走到任意阶段，
   再从该点「卸载」——弹性回复沿 E 的斜率走回去，走不到原点的那一段就是残余变形。
   这是「为什么弯过的回形针掰不直」的定量答案。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

const MATS = {
  steel: {
    label: '低碳钢', E: 200e9, sy: 235e6, su: 400e6, eu: 0.26,
    plat: true, elastic: false, note: '有明显屈服平台，塑性极好',
  },
  alu: {
    label: '铝合金', E: 69e9, sy: 240e6, su: 300e6, eu: 0.12,
    plat: false, elastic: false, note: '无明显屈服点，用 σ0.2 条件屈服',
  },
  iron: {
    label: '灰铸铁', E: 110e9, sy: 140e6, su: 200e6, eu: 0.006,
    plat: false, elastic: false, note: '脆性：几乎无塑性，断前看不到预兆',
  },
  rubber: {
    label: '橡胶', E: 50e6, sy: 5e6, su: 20e6, eu: 5.0,
    plat: false, elastic: true, note: '超弹性：可拉到 500% 且完全回复',
  },
};

/* 给定材料与应变，返回工程应力（Pa）。返回 null 表示已断裂。 */
function sigmaAt(m, e) {
  if (e <= 0) return 0;
  if (e >= m.eu) return null;
  if (m.elastic) return m.su * Math.tanh((m.E * e) / m.su);
  const ey = m.sy / m.E;
  if (e <= ey) return m.E * e;
  const esh = m.plat ? Math.max(ey * 8, 0.014) : ey;
  if (m.plat && e <= esh) return m.sy;
  const t0 = m.plat ? esh : ey;
  let s = m.sy + (m.su - m.sy) * Math.pow(clamp((e - t0) / (m.eu - t0), 0, 1), 0.45);
  if (m.plat && e > m.eu * 0.82) {
    const u = (e - m.eu * 0.82) / (m.eu * 0.18);
    s *= 1 - 0.18 * u * u; // 颈缩：工程应力反而下降
  }
  return s;
}

export default function render(host, spec) {
  const C = themeColors();
  const s = { mat: spec.mat || 'steel', t: spec.t ?? 0.5 };

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({ '当前应力 σ': '—', '弹性回复': '—', '残余应变': '—', '材料': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MATS).map((k) => ({ label: MATS[k].label, value: k })),
    s.mat,
    (v) => { s.mat = v; s.t = 0.5; draw(); },
  ));

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const m = MATS[s.mat];
    const eNow = s.t * m.eu * 0.999;
    const sNow = sigmaAt(m, eNow);

    const gx = 56;
    const gy = H - 30;
    const gw = W - 88;
    const gh = H - 78;
    const sMax = m.su * 1.18;
    const eMax = m.eu * 1.06;
    const ex = (e) => gx + (e / eMax) * gw;
    const sy = (v) => gy - (v / sMax) * gh;

    /* 坐标轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, '工程应变 ε', gx + gw - 4, gy + 16, C.fg, { align: 'right', size: 11 });
    label(ctx, 'σ (MPa)', gx - 46, gy - gh + 10, C.fg, { size: 11 });

    /* 曲线：采样直到断裂 */
    const pts = [];
    const N = 400;
    for (let i = 0; i <= N; i += 1) {
      const e = (i / N) * m.eu * 0.999;
      const v = sigmaAt(m, e);
      if (v === null) break;
      pts.push([ex(e), sy(v)]);
    }
    polyline(ctx, pts, C.accent, 2.4);

    /* 弹性段（延长线，用于看卸载斜率） */
    const ey = Math.min(m.sy / m.E, m.eu * 0.9);
    polyline(ctx, [[ex(0), sy(0)], [ex(ey * 1.9), sy((m.E * ey * 1.9) / 1)]], C.grid, 1.5, [4, 4]);

    /* 阶段标注 */
    const marks = m.elastic
      ? [{ e: m.eu * 0.35, t: '超弹性：模量随变形增大' }, { e: m.eu * 0.85, t: '趋于拉伸极限' }]
      : [
        { e: m.sy / m.E, t: '比例极限' },
        { e: m.plat ? Math.max((m.sy / m.E) * 8, 0.014) : m.sy / m.E, t: m.plat ? '屈服平台' : '条件屈服 σ0.2' },
        { e: m.eu * (m.plat ? 0.9 : 0.75), t: '强化' },
      ].concat(m.plat ? [{ e: m.eu * 0.94, t: '颈缩' }] : []);
    marks.forEach((mk, i) => {
      const v = sigmaAt(m, Math.min(mk.e, m.eu * 0.999));
      if (v === null) return;
      const X = ex(mk.e);
      const Y = sy(v);
      ctx.fillStyle = C.named('gray');
      ctx.beginPath();
      ctx.arc(X, Y, 3, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, mk.t, X + 4, Y - 4 - (i % 2) * 13, C.fg, { size: 10 });
    });

    /* 断裂点 */
    const Xb = ex(m.eu);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Xb, sy(sigmaAt(m, m.eu * 0.995) || 0));
    ctx.lineTo(Xb - 7, sy(sigmaAt(m, m.eu * 0.995) || 0) + 12);
    ctx.stroke();
    label(ctx, '断裂', Xb - 4, sy(sigmaAt(m, m.eu * 0.995) || 0) + 24, C.bad, { size: 10, align: 'right' });

    /* 当前点与卸载路径 */
    if (sNow !== null) {
      const cx = ex(eNow);
      const cy = sy(sNow);
      const residual = m.elastic ? 0 : Math.max(0, eNow - sNow / m.E);
      const ux = ex(residual);
      polyline(ctx, [[cx, cy], [ux, sy(0)]], C.accent2, 2.2, [6, 4]);
      ctx.fillStyle = C.accent2;
      ctx.beginPath();
      ctx.arc(ux, sy(0), 4, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, '卸载路径（斜率 ≈ E）', (cx + ux) / 2, (cy + sy(0)) / 2 - 8, C.accent2, { size: 10, align: 'center' });

      /* 弹性回复段与残余段的水平标尺 */
      const yy = gy + 14;
      polyline(ctx, [[ux, yy], [cx, yy]], C.ok, 2);
      polyline(ctx, [[ex(0), yy], [ux, yy]], C.bad, 2);
      label(ctx, '弹性回复 ' + fmt((eNow - residual) * 100, 3) + '%', (ux + cx) / 2, yy + 13, C.ok, { size: 10, align: 'center' });
      label(ctx, '残余 ' + fmt(residual * 100, 3) + '%', ux / 2 + gx / 2, yy + 13, C.bad, { size: 10, align: 'center' });

      ctx.fillStyle = C.named('amber');
      ctx.beginPath();
      ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, 'ε = ' + fmt(eNow * 100, 3) + '%', cx + 8, cy - 6, C.named('amber'), { size: 10, weight: 600 });

      ro.set('当前应力 σ', fmt(sNow / 1e6, 1) + ' MPa');
      ro.set('弹性回复', fmt((eNow - residual) * 100, 3) + '% 应变');
      ro.set('残余应变', fmt(residual * 100, 3) + '%');
    } else {
      ro.set('当前应力 σ', '已断裂');
      ro.set('弹性回复', '—');
      ro.set('残余应变', '—');
    }
    ro.set('材料', m.note + '（E = ' + fmt(m.E / 1e9, 2) + ' GPa）');
  }

  const sliders = buildSliders(
    { sliders: [{ name: 't', label: '当前应变（占断裂延伸率）', min: 0, max: 1, step: 0.005, value: s.t, fmt: 3 }] },
    (st) => { s.t = st.t; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
