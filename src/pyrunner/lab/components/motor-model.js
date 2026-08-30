/* 电机的传递函数模型：把 dc-motor 的两条代数式补上储能元件，就变成一组微分方程
     J·dω/dt = Kt·I − B·ω − T_load，L·dI/dt = V − R·I − Ke·ω
   左边是用 RK4 自己积分出来的阶跃响应，右边是同一模型的 Bode 幅频（解析式直接算）。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

const N = 420;          // 阶跃响应采样点数
const RAD2RPM = 60 / (2 * Math.PI);

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    order: spec.order || 'second',
    J: spec.J ?? 5e-5,      // 转动惯量 kg·m²
    B: spec.B ?? 2e-4,      // 粘性阻尼 N·m·s
    R: spec.R ?? 2,         // 电枢电阻 Ω
    L: spec.L ?? 2e-3,      // 电枢电感 H
    V: spec.V ?? 12,        // 阶跃电压 V
    Tl: spec.Tl ?? 0.02,    // 负载转矩 N·m
  };
  const Kt = 0.05;
  const Ke = 0.05;
  let resp = null;   // { t[], w[], I[], tEnd }
  let cursor = 0;    // 播放游标（0–1）

  const cv = setupCanvas(host, 320);
  const ro = buildReadout({
    '机械时间常数': '—', '电气时间常数': '—', '稳态转速': '—', '上升时间': '—', '超调': '—', '−3dB 带宽': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '二阶（含电感 L）', value: 'second' }, { label: '一阶（忽略 L）', value: 'first' }],
    s.order,
    (v) => { s.order = v; simulate(); draw(); },
  ));

  /* ---- 自己的 RK4，定步长，与帧率无关 ---- */
  /* 一阶模型：电感忽略，电流瞬时跟随 */
  function rk4First(w, h) {
    const f = (wv) => (Kt * ((s.V - Ke * wv) / s.R) - s.B * wv - s.Tl) / s.J;
    const k1 = f(w);
    const k2 = f(w + (h / 2) * k1);
    const k3 = f(w + (h / 2) * k2);
    const k4 = f(w + h * k3);
    const wn = w + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    return [wn, (s.V - Ke * wn) / s.R];
  }

  /* 二阶模型：电气时间常数可以比机械的小几个数量级（L 很小时方程组很刚），
     显式 RK4 会直接炸掉。这里把电气方程「冻结 ω 后解析积分」——
     I(t+dt) = Is + (I − Is)·e^(−dt·R/L)，对任意步长都稳定；机械方程仍用 RK4。 */
  function rk4Second(w, I, h) {
    const tauE = s.L / s.R;
    const iAt = (wv, iv, dt) => {
      const Is = (s.V - Ke * wv) / s.R;
      return Is + (iv - Is) * Math.exp(-dt / tauE);
    };
    const f = (wv, iv, dt) => (Kt * iAt(wv, iv, dt) - s.B * wv - s.Tl) / s.J;
    const k1 = f(w, I, 0);
    const k2 = f(w + (h / 2) * k1, I, h / 2);
    const k3 = f(w + (h / 2) * k2, I, h / 2);
    const k4 = f(w + h * k3, I, h);
    const wn = w + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    const Is = (s.V - Ke * w) / s.R;
    return [wn, Is + (I - Is) * Math.exp(-h / tauE)];
  }

  /* 一步：按当前模型选型分派 */
  function rk4(w, I, h) {
    return s.order === 'first' ? rk4First(w, h) : rk4Second(w, I, h);
  }

  function simulate() {
    const tauM = (s.J * s.R) / (Kt * Ke + s.B * s.R);   // 机械时间常数
    const tauE = s.L / s.R;                              // 电气时间常数
    const tEnd = clamp(tauM * 6, 0.005, 2.5);
    /* 步长只由机械时间常数决定：电气部分已被解析积分，不再限制步长 */
    const h0 = tEnd / N;
    const sub = clamp(Math.ceil(h0 / (tauM / 40)), 1, 40);
    const h = h0 / sub;
    const t = [];
    const w = [];
    const ia = [];
    let cw = 0;
    let ci = 0;
    for (let i = 0; i <= N; i += 1) {
      t.push(i * h0);
      w.push(cw);
      ia.push(ci);
      for (let k = 0; k < sub; k += 1) {
        const r = rk4(cw, ci, h);
        cw = r[0];
        ci = r[1];
      }
    }
    /* 稳态与指标（负载超过堵转转矩时转不起来，钳到 0） */
    const wss = Math.max(0, (Kt * s.V - s.R * s.Tl) / (Kt * Ke + s.B * s.R));
    let wMax = 0;
    w.forEach((v) => { if (v > wMax) wMax = v; });
    const cross = (frac) => {
      for (let i = 1; i < w.length; i += 1) if (w[i] >= frac * wss) return t[i - 1] + (frac * wss - w[i - 1]) * h0 / (w[i] - w[i - 1] || 1e-12);
      return NaN;
    };
    resp = {
      t, w, ia, tEnd, tauM, tauE, wss,
      overshoot: wss > 1e-9 ? Math.max(0, ((wMax - wss) / wss) * 100) : 0,
      rise: isFinite(cross(0.9)) && isFinite(cross(0.1)) ? cross(0.9) - cross(0.1) : NaN,
    };
  }

  /* 解析 Bode：H(s) = Kt / ((Js+B)(Ls+R) + Kt·Ke) */
  function bodeMag(f) {
    const W2 = 2 * Math.PI * f;
    const L = s.order === 'first' ? 0 : s.L;
    const re = s.B * s.R - W2 * W2 * s.J * L + Kt * Ke;
    const im = W2 * (s.J * s.R + L * s.B);
    return Kt / Math.hypot(re, im);
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!resp) return;
    const midX = Math.round(W * 0.5);
    const pad = 34;

    /* ---- 左：阶跃响应 ω(t) ---- */
    const g1 = { x: pad, y: 30, w: midX - pad - 14, h: H - 30 - 34 };
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(g1.x, g1.y);
    ctx.lineTo(g1.x, g1.y + g1.h);
    ctx.lineTo(g1.x + g1.w, g1.y + g1.h);
    ctx.stroke();
    const wTop = Math.max(resp.wss * 1.35, Math.max(...resp.w) * 1.1, 1);
    const X1 = (t) => g1.x + (t / resp.tEnd) * g1.w;
    const Y1 = (v) => g1.y + g1.h - (clamp(v, -wTop * 0.2, wTop) + wTop * 0.2) / (wTop * 1.2) * g1.h;
    /* 稳态线 */
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(g1.x, Y1(resp.wss));
    ctx.lineTo(g1.x + g1.w, Y1(resp.wss));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'ω∞ = ' + fmt(resp.wss * RAD2RPM, 0) + ' rpm', g1.x + 4, Y1(resp.wss) - 4, C.fg, { size: 10 });
    /* 只画到游标处，做出「随时间展开」的动画 */
    const nVis = Math.max(2, Math.round(resp.t.length * cursor));
    polyline(ctx, resp.t.slice(0, nVis).map((t, i) => [X1(t), Y1(resp.w[i])]), C.accent, 2.2);
    if (nVis > 1) {
      const xc = X1(resp.t[nVis - 1]);
      const yc = Y1(resp.w[nVis - 1]);
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(xc, yc, 3.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, fmt(resp.w[nVis - 1] * RAD2RPM, 0) + ' rpm', xc + 6, yc - 4, C.accent, { size: 10 });
    }
    label(ctx, '阶跃响应（V: 0 → ' + fmt(s.V, 1) + ' V）', g1.x, g1.y - 8, C.fg, { size: 10 });
    label(ctx, 't', g1.x + g1.w, g1.y + g1.h + 14, C.fg, { align: 'right', size: 10 });

    /* ---- 右：Bode 幅频（对数频率轴） ---- */
    const g2 = { x: midX + 20, y: 30, w: W - midX - 20 - 16, h: H - 30 - 34 };
    const fMin = 1;
    const fMax = 1e5;
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(g2.x, g2.y);
    ctx.lineTo(g2.x, g2.y + g2.h);
    ctx.lineTo(g2.x + g2.w, g2.y + g2.h);
    ctx.stroke();
    const db0 = 20 * Math.log10(Math.max(bodeMag(0.01), 1e-9));
    const dbSpan = 70;
    const X2 = (f) => g2.x + (Math.log(f / fMin) / Math.log(fMax / fMin)) * g2.w;
    const Y2 = (db) => g2.y + g2.h - clamp((db - (db0 - dbSpan)) / dbSpan, 0, 1) * g2.h;
    [10, 100, 1000, 10000].forEach((f) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(X2(f), g2.y);
      ctx.lineTo(X2(f), g2.y + g2.h);
      ctx.stroke();
      label(ctx, f >= 1000 ? f / 1000 + 'k' : String(f), X2(f), g2.y + g2.h + 14, C.fg, { align: 'center', size: 9 });
    });
    const pts = [];
    for (let i = 0; i <= 160; i += 1) {
      const f = fMin * (fMax / fMin) ** (i / 160);
      pts.push([X2(f), Y2(20 * Math.log10(Math.max(bodeMag(f), 1e-9)))]);
    }
    polyline(ctx, pts, C.accent2, 2.2);
    /* 极点标注 */
    [[1 / (2 * Math.PI * resp.tauM), '机械极点', C.named('green')],
      [1 / (2 * Math.PI * resp.tauE), '电气极点', C.named('purple')]].forEach(([f, name, col]) => {
      if (f < fMin || f > fMax) return;
      ctx.strokeStyle = col;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(X2(f), g2.y);
      ctx.lineTo(X2(f), g2.y + g2.h);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, name, X2(f) + 3, g2.y + 10, col, { size: 9 });
    });
    label(ctx, '|ω/V| Bode 幅频（dB）', g2.x, g2.y - 8, C.fg, { size: 10 });
    label(ctx, fmt(db0, 0) + ' dB', g2.x - 4, g2.y + 8, C.fg, { align: 'right', size: 9 });
    label(ctx, fmt(db0 - dbSpan, 0) + ' dB', g2.x - 4, g2.y + g2.h, C.fg, { align: 'right', size: 9 });

    /* 带宽：找到幅值掉到直流的 1/√2 的频率 */
    let bw = NaN;
    const target = bodeMag(0.01) / Math.SQRT2;
    for (let f = 1; f < 1e6; f *= 1.02) if (bodeMag(f) < target) { bw = f; break; }

    ro.set('机械时间常数', fmt(resp.tauM * 1000, 2) + ' ms');
    ro.set('电气时间常数', fmt(resp.tauE * 1000, 3) + ' ms' + (s.order === 'first' ? '（已忽略）' : ''));
    ro.set('稳态转速', fmt(resp.wss * RAD2RPM, 0) + ' rpm（' + fmt(resp.wss, 1) + ' rad/s）');
    ro.set('上升时间', isFinite(resp.rise) ? fmt(resp.rise * 1000, 1) + ' ms（10–90%）' : '—');
    ro.set('超调', fmt(resp.overshoot, 1) + ' %');
    ro.set('−3dB 带宽', isFinite(bw) ? fmt(bw, 1) + ' Hz' : '> 1 MHz');
  }

  const controls = anim(host, {
    onTick() {
      cursor += 0.006;
      if (cursor > 1.06) cursor = 0.02;
      draw();
    },
    onReset() { cursor = 0.02; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'J', label: '转动惯量 J (10⁻⁵ kg·m²)', min: 1, max: 40, step: 1, value: Math.round(s.J * 1e5), fmt: 0 },
        { name: 'B', label: '阻尼 B (10⁻⁴ N·m·s)', min: 0, max: 20, step: 0.5, value: s.B * 1e4, fmt: 1 },
        { name: 'R', label: '电枢电阻 R (Ω)', min: 0.2, max: 10, step: 0.1, value: s.R, fmt: 1 },
        { name: 'L', label: '电枢电感 L (mH)', min: 0.05, max: 20, step: 0.05, value: s.L * 1e3, fmt: 2 },
        { name: 'V', label: '阶跃电压 V (V)', min: 2, max: 48, step: 0.5, value: s.V, fmt: 1 },
        { name: 'Tl', label: '负载转矩 (N·m)', min: 0, max: 0.15, step: 0.005, value: s.Tl, fmt: 3 },
      ],
    },
    (v) => {
      s.J = v.J * 1e-5;
      s.B = v.B * 1e-4;
      s.R = v.R;
      s.L = v.L * 1e-3;
      s.V = v.V;
      s.Tl = v.Tl;
      simulate();
      draw();
    },
  );

  simulate();
  cursor = 0.02;
  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
