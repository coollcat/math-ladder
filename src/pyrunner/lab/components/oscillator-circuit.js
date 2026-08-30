/* 振荡器与起振条件。
   巴克豪森判据就两条：环路增益 |Aβ| > 1，且环路总相移 = 360°（即 0°）。
   本组件用经典的三级 RC 移相振荡器：反相放大器出 180°，三级 RC 再凑 180°，
   凑齐的那个频率上 |β| = 1/8，所以 A 必须大于 8 才起振。
   极坐标图里看得最清楚——轨迹穿过正实轴的那个点若落在单位圆之外，电路就不稳定。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildReadout, polyline, label, clamp, fmt,
} from '../core.js';

const VSAT = 10;

export default function render(host, spec) {
  let C = themeColors();
  const s = { A: spec.A ?? 12, u: spec.u ?? 1 }; // u = f/f0
  let amp = 0.05;
  let theta = 0;

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '环路增益 |Aβ|': '—', 环路相移: '—', 起振判定: '—', 输出幅度: '—' });
  host.appendChild(ro.box);

  /* 三级 RC 移相网络（忽略级间负载）：每级 H = jx/(1+jx) */
  function loop(u, A) {
    const x = u / Math.sqrt(3);
    const mag = A * (x / Math.hypot(1, x)) ** 3;
    const phase = 180 + 3 * (90 - (Math.atan(x) * 180) / Math.PI);
    return { x, mag, phase: ((phase % 360) + 360) % 360 };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const L = loop(s.u, s.A);
    const gainAt360 = s.A / 8;          // f0 处（相移恰为 360°）的环路增益
    const osc = gainAt360 > 1;
    const phErr = Math.min(Math.abs(L.phase - 360), Math.abs(L.phase));
    const onAxis = phErr < 12;

    /* ---------- 左上：极坐标 / Nyquist ---------- */
    const cx = 118;
    const cy = 96;
    const rMax = Math.max(s.A * 1.05, 1.6);
    const rr = 62 / rMax;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy); ctx.lineTo(cx + 70, cy);
    ctx.moveTo(cx, cy + 62); ctx.lineTo(cx, cy - 62);
    ctx.stroke();
    /* 单位圆 */
    ctx.strokeStyle = C.named('green');
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, '单位圆 |Aβ|=1', cx + rr + 4, cy - 8, C.named('green'), { size: 9 });
    /* 临界点 (1, 0) */
    ctx.fillStyle = osc ? C.bad : C.ok;
    ctx.beginPath();
    ctx.arc(cx + rr, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '临界点 +1', cx + rr + 4, cy + 12, osc ? C.bad : C.ok, { size: 9 });
    /* Aβ 轨迹（ω 从 0.05 到 20 倍） */
    const locus = [];
    for (let k = 0; k <= 260; k += 1) {
      const u = 0.05 * (400) ** (k / 260);
      const q = loop(u, s.A);
      const a = (q.phase * Math.PI) / 180;
      locus.push([cx + Math.cos(a) * q.mag * rr, cy - Math.sin(a) * q.mag * rr]);
    }
    polyline(ctx, locus, C.accent, 1.8);
    /* 当前工作点 */
    const la = (L.phase * Math.PI) / 180;
    const pxp = cx + Math.cos(la) * L.mag * rr;
    const pyp = cy - Math.sin(la) * L.mag * rr;
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(pxp, pyp);
    ctx.stroke();
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(pxp, pyp, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'Aβ 轨迹（ω↑）', 20, 24, C.accent, { size: 10 });
    label(ctx, '|Aβ| = ' + fmt(L.mag, 3) + '　∠' + fmt(L.phase, 1) + '°', 20, 176, C.named('amber'), { size: 10 });

    /* ---------- 右上：环路框图 ---------- */
    const bx = 226;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(bx, 40, 76, 40);
    ctx.strokeRect(bx, 116, 76, 40);
    label(ctx, '放大器 A', bx + 38, 64, C.fg, { align: 'center', size: 11, weight: 600 });
    label(ctx, '反相 → 180°', bx + 38, 78, C.fg, { align: 'center', size: 9 });
    label(ctx, '移相网络 β', bx + 38, 140, C.fg, { align: 'center', size: 11, weight: 600 });
    label(ctx, '三级 RC → ' + fmt(3 * (90 - (Math.atan(L.x) * 180) / Math.PI), 1) + '°', bx + 38, 154, C.fg,
      { align: 'center', size: 9 });
    ctx.beginPath();
    ctx.moveTo(bx + 76, 60); ctx.lineTo(W - 14, 60); ctx.lineTo(W - 14, 136); ctx.lineTo(bx + 76, 136);
    ctx.stroke();
    label(ctx, '环', W - 26, 100, C.named('purple'), { align: 'center', size: 10 });
    ctx.beginPath();
    ctx.moveTo(bx, 136); ctx.lineTo(bx - 30, 136); ctx.lineTo(bx - 30, 60); ctx.lineTo(bx, 60);
    ctx.stroke();

    /* ---------- 下：起振与限幅 ---------- */
    const wy = 232;
    const wh = 76;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, wy); ctx.lineTo(W - 14, wy);
    ctx.stroke();
    ctx.save();
    ctx.strokeStyle = C.bad;
    ctx.setLineDash([4, 3]);
    [VSAT, -VSAT].forEach((v) => {
      const y = wy - (v / (VSAT * 1.25)) * (wh / 2);
      ctx.beginPath();
      ctx.moveTo(20, y); ctx.lineTo(W - 14, y);
      ctx.stroke();
    });
    ctx.restore();
    label(ctx, '±Vsat（限幅）', 22, wy - (VSAT / (VSAT * 1.25)) * (wh / 2) - 4, C.bad, { size: 9 });
    const wpts = [];
    for (let i = 0; i <= 300; i += 1) {
      const th = theta - (i / 300) * 5 * Math.PI;
      wpts.push([20 + (i / 300) * (W - 34), wy - (VSAT * Math.tanh((amp * Math.sin(th)) / VSAT) / (VSAT * 1.25)) * (wh / 2)]);
    }
    polyline(ctx, wpts, osc && onAxis ? C.named('green') : C.named('gray'), 2.2);
    label(ctx, '输出波形（点「播放」看幅度爬升 → 撞上限幅 → 稳幅）', 20, 206, C.fg, { size: 10 });

    ro.set('环路增益 |Aβ|', fmt(L.mag, 4) + '　在 f₀ 处（相移恰 360°）|Aβ| = A/8 = ' + fmt(gainAt360, 3));
    ro.set('环路相移', fmt(L.phase, 2) + '°　（需要 360°，即回到 0°；当前偏差 ' + fmt(phErr, 1) + '°）');
    ro.set('起振判定', osc
      ? '|Aβ| > 1：满足幅值条件，' + (onAxis ? '相位也凑齐 → 起振！' : '但相位没凑齐，振荡会停在 f₀ 而非当前频率')
      : '|Aβ| < 1：扰动会逐次衰减，电路稳定。把 A 调到 8 以上试试');
    ro.set('输出幅度', fmt(amp, 3) + ' V' + (amp > VSAT * 0.98 ? '　已限幅（增益自动降到 1，形成稳定振荡）' : ''));
  }

  const controls = anim(host, {
    onTick(dt) {
      const g = s.A / 8;
      const L = loop(s.u, s.A);
      const phErr = Math.min(Math.abs(L.phase - 360), Math.abs(L.phase));
      const grow = g > 1 && phErr < 12;
      const rate = grow ? (g - 1) * 2.2 : (1 - Math.min(g, 0.99)) * 2.2;
      amp = clamp(amp * (1 + (grow ? rate : -rate) * dt), 1e-3, VSAT);
      theta += dt * 6 * s.u;
      draw();
    },
    onReset() { amp = 0.05; theta = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'A', label: '放大器增益 A', min: 1, max: 30, step: 0.1, value: s.A, fmt: 1 },
        { name: 'u', label: '频率 f / f₀', min: 0.2, max: 5, step: 0.01, value: s.u, fmt: 2 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  /* 自动起播：本组件的结论全在时间演化里，静态图看不出来。
     尊重「减少动效」偏好，那边由 anim 自己把播放键禁用。 */
  if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    controls.toggle(true);
  }
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
