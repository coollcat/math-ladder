/* 直流电机：T = Kt·I 把电流变转矩，E = Ke·ω 把转速变反电动势，两条式子加一个
   V = E + I·R 就锁定了工作点。左边看转子在磁场里怎么受力，右边看 n–T 曲线上的落点。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders, polyline, label, clamp, fmt,
} from '../core.js';

const RAD2RPM = 60 / (2 * Math.PI);

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    V: spec.V ?? 12,        // 电枢电压 V
    Tl: spec.Tl ?? 0.08,    // 负载转矩 N·m
    R: spec.R ?? 2,         // 电枢电阻 Ω
    Ke: spec.Ke ?? 0.05,    // 反电动势常数 V·s/rad
    ang: 0,
  };
  const cv = setupCanvas(host, 330);
  const ro = buildReadout({
    转速: '—', 电流: '—', 反电动势: '—', 输出功率: '—', 效率: '—', 堵转转矩: '—',
  });
  host.appendChild(ro.box);

  /* 稳态工作点：I = Tl/Kt；ω = (V − I·R)/Ke（转速被负载拉低，直到电流够顶住负载） */
  function point() {
    const Kt = s.Ke;
    const I = s.Tl / Kt;
    const w = Math.max(0, (s.V - I * s.R) / s.Ke);
    const n = w * RAD2RPM;
    const Tstall = (Kt * s.V) / s.R;          // 堵转：ω=0 → I = V/R
    const n0 = (s.V / s.Ke) * RAD2RPM;        // 理想空载
    const eff = s.V * I > 1e-9 ? (s.Tl * w) / (s.V * I) : 0;
    return { Kt, I, w, n, Tstall, n0, eff, E: s.Ke * w, stalled: I * s.R >= s.V };
  }

  /* 画磁场：一对磁极 + 若干条由 N 指向 S 的场线 */
  function field(ctx, cx, cy, R) {
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k += 1) {
      const y = cy + k * R * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.32, y);
      ctx.lineTo(cx + R * 1.32, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + R * 1.32 - 6, y - 3);
      ctx.lineTo(cx + R * 1.32, y);
      ctx.lineTo(cx + R * 1.32 - 6, y + 3);
      ctx.strokeStyle = C.grid;
      ctx.stroke();
    }
    label(ctx, 'N', cx - R * 1.5, cy + 5, C.named('red'), { size: 15, weight: 700 });
    label(ctx, 'S', cx + R * 1.36, cy + 5, C.accent, { size: 15, weight: 700 });
    label(ctx, 'B →', cx, cy - R * 1.28, C.grid, { align: 'center', size: 11 });
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const p = point();
    const splitX = Math.round(W * 0.46);
    const cx = splitX / 2;
    const cy = Math.round(H * 0.52);
    const R = Math.min(splitX, H) * 0.27;

    /* ---- 左：转子受力（左手定则：B 向右、电流向里 → 力向上） ---- */
    field(ctx, cx, cy, R);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.ang);
    const coilW = R * 0.62;
    const coilH = R * 0.95;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(-coilW, -coilH, coilW * 2, coilH * 2);
    ctx.stroke();
    [-1, 1].forEach((sgn) => {
      /* 导体电流方向：一侧⊗进纸面，一侧⊙出纸面 */
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sgn * coilW, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (sgn * p.I >= 0) {
        ctx.beginPath();
        ctx.moveTo(sgn * coilW - 4, -4);
        ctx.lineTo(sgn * coilW + 4, 4);
        ctx.moveTo(sgn * coilW + 4, -4);
        ctx.lineTo(sgn * coilW - 4, 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sgn * coilW, 0, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      /* 受力 F = B·I·L， torque = 2·F·r */
      const fLen = clamp(Math.abs(p.I) * 26, 6, 46);
      const dir = sgn * (p.I >= 0 ? 1 : -1);
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sgn * coilW, 0);
      ctx.lineTo(sgn * coilW, -dir * fLen);
      ctx.lineTo(sgn * coilW - 4, -dir * fLen + dir * 7);
      ctx.moveTo(sgn * coilW, -dir * fLen);
      ctx.lineTo(sgn * coilW + 4, -dir * fLen + dir * 7);
      ctx.stroke();
    });
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -coilH);
    ctx.lineTo(0, coilH);
    ctx.stroke();
    ctx.restore();

    /* 转向弧箭头 */
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.62, -1.1, -0.2);
    ctx.stroke();
    label(ctx, 'ω', cx + R * 1.62 * Math.cos(-0.62), cy + R * 1.62 * Math.sin(-0.62) - 6, C.fg, { size: 11 });
    label(ctx, 'F = B·I·L（左手定则）', 8, H - 22, C.named('green'), { size: 10 });
    label(ctx, 'T = Kt·I = ' + fmt(s.Tl, 3) + ' N·m', 8, H - 8, C.fg, { size: 10 });

    /* ---- 右：n–T 机械特性 ---- */
    const gx = splitX + 34;
    const gy = 34;
    const gw = W - gx - 14;
    const gh = H - gy - 34;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    const Tmax = Math.max(p.Tstall * 1.1, 0.05);
    const nMax = Math.max(p.n0 * 1.1, 100);
    const px = (T) => gx + (T / Tmax) * gw;
    const py = (n) => gy + gh - (n / nMax) * gh;
    label(ctx, '转速 n (rpm)', gx, gy - 8, C.fg, { size: 10 });
    label(ctx, '转矩 T (N·m)', gx + gw - 46, gy + gh + 24, C.fg, { size: 10 });
    label(ctx, fmt(nMax, 0), gx - 4, gy + 8, C.fg, { align: 'right', size: 9 });
    label(ctx, fmt(Tmax, 3), gx + gw - 2, gy + gh + 12, C.fg, { align: 'right', size: 9 });

    /* 特性线：n = n0 − R·T/(Ke·Kt)·RAD2RPM */
    const nOfT = (T) => Math.max(0, (s.V / s.Ke - (s.R * T) / (s.Ke * s.Ke)) * RAD2RPM);
    polyline(ctx, [[px(0), py(nOfT(0))], [px(Tmax), py(nOfT(Tmax))]], C.accent, 2.2);
    label(ctx, 'n–T 机械特性', gx + 6, py(nOfT(Tmax * 0.55)) - 6, C.accent, { size: 10 });

    /* 空载与堵转刻度 */
    ctx.fillStyle = C.grid;
    ctx.beginPath();
    ctx.arc(px(0), py(nOfT(0)), 3, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '空载 n₀=' + fmt(p.n0, 0), px(0) + 5, py(nOfT(0)) - 5, C.fg, { size: 10 });
    label(ctx, '堵转 T=' + fmt(p.Tstall, 3), px(p.Tstall) - 4, gy + gh + 12, C.fg, { align: 'center', size: 10 });

    /* 工作点 */
    const wx = px(Math.min(s.Tl, Tmax));
    const wy = py(Math.min(p.n, nMax));
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, wy);
    ctx.lineTo(wx, wy);
    ctx.lineTo(wx, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(wx, wy, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '工作点', wx + 7, wy - 6, C.named('red'), { size: 10, weight: 600 });

    ro.set('转速', fmt(p.n, 0) + ' rpm');
    ro.set('电流', fmt(p.I, 3) + ' A');
    ro.set('反电动势', fmt(p.E, 2) + ' V（占电压 ' + fmt(s.V > 0 ? (p.E / s.V) * 100 : 0, 0) + '%）');
    ro.set('输出功率', fmt(s.Tl * p.w, 2) + ' W（输入 ' + fmt(s.V * p.I, 2) + ' W）');
    ro.set('效率', fmt(p.eff * 100, 1) + ' %');
    ro.set('堵转转矩', fmt(p.Tstall, 3) + ' N·m' + (p.stalled ? '  ⚠ 已堵转' : ''));
  }

  const controls = anim(host, {
    onTick(dt) {
      /* 转速越高转得越快（画面缩放，免得糊成一片） */
      s.ang += dt * point().w * 0.12;
      draw();
    },
    onReset() { s.ang = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'V', label: '电枢电压 V', min: 0, max: 48, step: 0.5, value: s.V, fmt: 1 },
        { name: 'Tl', label: '负载转矩', min: 0, max: 0.4, step: 0.005, value: s.Tl, fmt: 3 },
        { name: 'R', label: '电枢电阻 R', min: 0.2, max: 8, step: 0.1, value: s.R, fmt: 1 },
        { name: 'Ke', label: '电机常数 Ke=Kt', min: 0.01, max: 0.2, step: 0.005, value: s.Ke, fmt: 3 },
      ],
    },
    (v) => { s.V = v.V; s.Tl = v.Tl; s.R = v.R; s.Ke = v.Ke; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
