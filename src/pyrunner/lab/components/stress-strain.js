/* 应力与应变：一根拉杆，拖力与截面积，看 σ = F/A 与 ε = σ/E 怎么联动。
   关键区分：载荷 F 是外因，应力 σ 才是材料真正「感受到」的强度量——
   同样 10 kN，粗杆安然无恙，细杆当场屈服。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  label, clamp, fmt,
} from '../core.js';

const MATS = {
  steel: { label: '结构钢', E: 200e9, sy: 250e6 },
  alu: { label: '铝合金', E: 69e9, sy: 200e6 },
  copper: { label: '紫铜', E: 110e9, sy: 70e6 },
  wood: { label: '木材（顺纹）', E: 11e9, sy: 40e6 },
};

function arrow(ctx, x0, y0, x1, y1, color, w, head) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w || 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (len > 5) {
    const h = head || 9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(ang - 0.42), y1 - h * Math.sin(ang - 0.42));
    ctx.lineTo(x1 - h * Math.cos(ang + 0.42), y1 - h * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mat: spec.mat || 'steel',
    F: spec.F ?? 40,     // kN
    b: spec.b ?? 30,     // mm
    h: spec.h ?? 20,     // mm
    L: spec.L ?? 1.5,    // m
  };

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({ '截面积 A': '—', '正应力 σ': '—', '应变 ε': '—', '伸长 ΔL': '—', '状态': '—' });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    Object.keys(MATS).map((k) => ({ label: MATS[k].label, value: k })),
    s.mat,
    (v) => { s.mat = v; draw(); },
  ));

  function state() {
    const m = MATS[s.mat];
    const A = (s.b / 1000) * (s.h / 1000);          // m²
    const F = s.F * 1000;                            // N
    const sigma = F / A;                             // Pa
    const eps = sigma / m.E;
    const dL = eps * s.L;
    return { m, A, F, sigma, eps, dL };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const st = state();
    const m = st.m;

    /* ---- 上半：拉杆与截面 ---- */
    const barY = Math.round(H * 0.30);
    const x0 = 52;
    const barW = W - 118;
    const th = clamp(6 + (s.h / 60) * 26, 6, 34);
    const elong = clamp(st.dL * 1000 * 26, 0, barW * 0.42); // 放大后的伸长量（px）

    /* 固定端墙 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 10, barY - th / 2 - 12);
    ctx.lineTo(x0 - 10, barY + th / 2 + 12);
    ctx.stroke();
    for (let k = 0; k < 5; k += 1) {
      ctx.beginPath();
      ctx.moveTo(x0 - 10, barY - th / 2 - 10 + k * ((th + 20) / 5));
      ctx.lineTo(x0 - 22, barY - th / 2 - 4 + k * ((th + 20) / 5));
      ctx.stroke();
    }

    /* 原始长度参考线 */
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + barW, barY - th / 2 - 14);
    ctx.lineTo(x0 + barW, barY + th / 2 + 14);
    ctx.stroke();
    ctx.restore();

    /* 应力色：越接近屈服越红 */
    const ratio = clamp(st.sigma / m.sy, 0, 1.5);
    const col = ratio >= 1 ? C.bad : ratio > 0.6 ? C.named('amber') : C.ok;
    ctx.fillStyle = C.soft;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x0, barY - th / 2, barW, th);
    ctx.fill();
    ctx.stroke();
    /* 伸长段用高亮色画 */
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.rect(x0 + barW, barY - th / 2, elong, th);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* 拉力箭头 */
    const ax = x0 + barW + elong;
    arrow(ctx, ax + 8, barY, ax + 48, barY, C.named('red'), 2.4, 10);
    label(ctx, 'F = ' + fmt(s.F, 1) + ' kN', ax + 52, barY + 4, C.named('red'), { size: 11, weight: 600 });
    label(ctx, 'L = ' + fmt(s.L, 2) + ' m', x0, barY - th / 2 - 20, C.fg, { size: 11 });
    label(ctx, 'ΔL = ' + fmt(st.dL * 1000, 3) + ' mm（放大显示）', x0 + barW + 4, barY + th / 2 + 22, col, { size: 10 });

    /* 截面小图 */
    const cx = W - 40;
    const cy = barY;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - 12, cy - th / 2, 24, th);
    ctx.stroke();
    label(ctx, 'b×h', cx, cy + th / 2 + 14, C.accent, { align: 'center', size: 10 });
    label(ctx, fmt(s.b, 0) + '×' + fmt(s.h, 0) + ' mm', cx, cy - th / 2 - 8, C.accent, { align: 'center', size: 10 });

    /* ---- 下半：σ-ε 直线 ---- */
    const gy = H - 26;
    const gx = 52;
    const gw = W - 92;
    const gh = H * 0.40;
    const eMax = Math.max((m.sy / m.E) * 1.6, st.eps * 1.25, 1e-5);
    const sMax = Math.max(m.sy * 1.25, st.sigma / 1e6 * 1.2);
    const ex = (e) => gx + (e / eMax) * gw;
    const sy2 = (v) => gy - (v / sMax) * gh;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'ε', gx + gw + 6, gy + 4, C.fg, { size: 11 });
    label(ctx, 'σ (MPa)', gx - 40, gy - gh + 8, C.fg, { size: 11 });

    /* 弹性直线 σ = E·ε */
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex(0), sy2(0));
    ctx.lineTo(ex(Math.min(eMax, sMax * 1e6 / m.E)), sy2(Math.min(sMax, (m.E * eMax) / 1e6)));
    ctx.stroke();

    /* 屈服线 */
    ctx.save();
    ctx.strokeStyle = C.bad;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, sy2(m.sy / 1e6));
    ctx.lineTo(gx + gw, sy2(m.sy / 1e6));
    ctx.stroke();
    ctx.restore();
    label(ctx, '屈服 σy = ' + fmt(m.sy / 1e6, 0) + ' MPa', gx + gw - 4, sy2(m.sy / 1e6) - 5, C.bad, { align: 'right', size: 10 });

    /* 当前工作点 */
    const cxp = ex(Math.min(st.eps, eMax));
    const cyp = sy2(Math.min(st.sigma / 1e6, sMax));
    ctx.strokeStyle = C.axis;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, cyp);
    ctx.lineTo(cxp, cyp);
    ctx.lineTo(cxp, gy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cxp, cyp, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'E = ' + fmt(m.E / 1e9, 0) + ' GPa（斜率）', gx + 8, gy - gh + 4, C.accent, { size: 10 });

    ro.set('截面积 A', fmt(st.A * 1e6, 1) + ' mm²');
    ro.set('正应力 σ', fmt(st.sigma / 1e6, 2) + ' MPa');
    ro.set('应变 ε', fmt(st.eps * 1e6, 1) + ' µε（' + fmt(st.eps * 100, 4) + '%）');
    ro.set('伸长 ΔL', fmt(st.dL * 1000, 3) + ' mm');
    ro.set('状态', st.sigma >= m.sy ? 'σ > σy：已屈服，卸载后留残余变形' : 'σ < σy：弹性范围内，卸载可完全恢复');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'F', label: '拉力 F', min: 0, max: 300, step: 1, value: s.F, fmt: 1 },
        { name: 'b', label: '截面宽 b', min: 5, max: 80, step: 1, value: s.b, fmt: 0 },
        { name: 'h', label: '截面厚 h', min: 2, max: 60, step: 1, value: s.h, fmt: 0 },
        { name: 'L', label: '杆长 L', min: 0.2, max: 5, step: 0.1, value: s.L, fmt: 2 },
      ],
    },
    (st) => { s.F = st.F; s.b = st.b; s.h = st.h; s.L = st.L; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
