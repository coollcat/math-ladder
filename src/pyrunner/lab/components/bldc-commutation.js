/* 无刷直流的电子换向：没有电刷，就靠六个开关状态轮流给三相绕组通电，让定子磁场
   每次跳 60°，拖着转子磁极走。转子跟不上（转矩角超过 90°）就会失步。 */
import {
  themeColors, setupCanvas, anim, buildReadout, buildSliders, buildToolbar,
  mkBtn, label, clamp, fmt,
} from '../core.js';

/* 六步换向表（A/B/C 三相，+1 电流流入，−1 流出，0 悬空）。
   每步合成磁场跳 60°，走完六步正好一圈电角度。 */
const TABLE = [
  { ph: [1, -1, 0], name: 'A+ B−' },
  { ph: [1, 0, -1], name: 'A+ C−' },
  { ph: [0, 1, -1], name: 'B+ C−' },
  { ph: [-1, 1, 0], name: 'B+ A−' },
  { ph: [-1, 0, 1], name: 'C+ A−' },
  { ph: [0, -1, 1], name: 'C+ B−' },
];
const PHASE_ANG = [Math.PI / 2, (Math.PI / 2) + (2 * Math.PI) / 3, (Math.PI / 2) - (2 * Math.PI) / 3];

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    stepIdx: 0,
    rate: spec.rate ?? 12,   // 换向频率（步/秒）
    Tl: spec.Tl ?? 0.03,     // 负载转矩 N·m
  };
  /* J 转子惯量 / B 粘性阻尼 / D 反电动势等效阻尼（≈ Kt·Ke/R，失步后就是它把滑差兜住，
     没有这一项电机会算出「越转越快」的荒唐结果）/ Tmax 最大磁转矩 */
  const P = { J: 2e-5, B: 5e-5, D: 3e-3, Tmax: 0.12 };
  const st = { w: 0, th: 0, acc: 0 };
  const cv = setupCanvas(host, 330);
  const ro = buildReadout({
    当前步: '—', 导通相: '—', 定子磁场: '—', 转子角: '—', 转矩角: '—', 转速: '—',
  });
  host.appendChild(ro.box);

  const stepBtn = mkBtn('单步换向 →');
  stepBtn.addEventListener('click', () => {
    s.stepIdx = (s.stepIdx + 1) % 6;
    draw();
  });
  host.appendChild(buildToolbar(stepBtn));

  /* 定子合成磁场矢量：各导通相按其轴线方向矢量叠加 */
  function fieldVec() {
    const v = TABLE[s.stepIdx].ph;
    let x = 0;
    let y = 0;
    v.forEach((c, k) => {
      x += c * Math.cos(PHASE_ANG[k]);
      y += c * Math.sin(PHASE_ANG[k]);
    });
    return Math.atan2(y, x);
  }

  /* 转子动力学：J·dω/dt = Tmax·sin(θf − θr) − (B+D)·ω − Tl，RK4 */
  function f(th, w, thF) {
    return [w, (P.Tmax * Math.sin(thF - th) - (P.B + P.D) * w - s.Tl) / P.J];
  }
  function rk4(thF, h) {
    const k1 = f(st.th, st.w, thF);
    const k2 = f(st.th + (h / 2) * k1[0], st.w + (h / 2) * k1[1], thF);
    const k3 = f(st.th + (h / 2) * k2[0], st.w + (h / 2) * k2[1], thF);
    const k4 = f(st.th + h * k3[0], st.w + h * k3[1], thF);
    st.th += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    st.w += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  }

  function norm(a) {
    let v = a % (2 * Math.PI);
    if (v > Math.PI) v -= 2 * Math.PI;
    if (v < -Math.PI) v += 2 * Math.PI;
    return v;
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const cx = Math.round(W * 0.42);
    const cy = Math.round(H * 0.52);
    const R = Math.min(W * 0.42, H * 0.52) - 26;
    const thF = fieldVec();

    /* 定子三相绕组：轴线 + 电流方向箭头 */
    TABLE[s.stepIdx].ph.forEach((cur, k) => {
      const a = PHASE_ANG[k];
      const ex = cx + R * Math.cos(a);
      const ey = cy + R * Math.sin(a);
      const col = cur === 0 ? C.grid : C.series(k);
      ctx.strokeStyle = col;
      ctx.lineWidth = cur === 0 ? 1.4 : 3.4;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.34 * Math.cos(a), cy + R * 0.34 * Math.sin(a));
      ctx.lineTo(ex, ey);
      ctx.stroke();
      /* 绕组线圈：三个小半圆 */
      for (let i = 0; i < 3; i += 1) {
        const rr = R * (0.5 + i * 0.16);
        ctx.beginPath();
        ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 5, a - Math.PI / 2, a + Math.PI / 2);
        ctx.stroke();
      }
      const tag = ['A', 'B', 'C'][k];
      label(ctx, tag + (cur > 0 ? ' ⊙进' : cur < 0 ? ' ⊗出' : ' 悬空'),
        cx + (R + 16) * Math.cos(a), cy + (R + 16) * Math.sin(a), col, { align: 'center', size: 11, weight: 600 });
    });

    /* 定子合成磁场矢量（虚线） */
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 2.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * 0.8 * Math.cos(thF), cy + R * 0.8 * Math.sin(thF));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '定子磁场', cx + R * 0.8 * Math.cos(thF) + 6, cy + R * 0.8 * Math.sin(thF) - 4,
      C.named('purple'), { size: 10 });

    /* 转子永磁体（N→S 的实心条） */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(st.th);
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.62);
    ctx.lineTo(R * 0.17, -R * 0.28);
    ctx.lineTo(-R * 0.17, -R * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.named('blue');
    ctx.beginPath();
    ctx.moveTo(0, R * 0.62);
    ctx.lineTo(R * 0.17, R * 0.28);
    ctx.lineTo(-R * 0.17, R * 0.28);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'N', 0, -R * 0.42, C.bg, { align: 'center', size: 10, weight: 700 });
    ctx.restore();

    /* 转矩角扇形：定子磁场与转子 N 极的夹角，90° 时转矩最大 */
    const lag = norm(thF - st.th);
    ctx.strokeStyle = Math.abs(lag) > Math.PI / 2 ? C.bad : C.named('green');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.42, Math.min(st.th, thF), Math.max(st.th, thF));
    ctx.stroke();

    /* 右侧：三相电流方波条 */
    const bx = W - 76;
    TABLE.forEach((row, i) => {
      const yy = 24 + i * 22;
      row.ph.forEach((c, k) => {
        ctx.fillStyle = c === 0 ? C.grid : c > 0 ? C.series(k) : C.bg;
        ctx.strokeStyle = c < 0 ? C.series(k) : C.grid;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.rect(bx + k * 20, yy, 16, 16);
        ctx.fill();
        ctx.stroke();
        label(ctx, c > 0 ? '+' : c < 0 ? '−' : '·', bx + k * 20 + 8, yy + 12,
          c === 0 ? C.fg : c > 0 ? C.bg : C.series(k), { align: 'center', size: 10, weight: 700 });
      });
      if (i === s.stepIdx) {
        ctx.strokeStyle = C.named('amber');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(bx - 4, yy - 3, 68, 22);
        ctx.stroke();
      }
    });
    label(ctx, '六步换向表', bx, 14, C.fg, { size: 10 });

    /* 底部：转矩 T = Tmax·sin(转矩角) 指示条 */
    const tw = W - 40;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(20.5, H - 26.5, tw, 12);
    const frac = clamp(Math.sin(Math.abs(lag)), 0, 1);
    ctx.fillStyle = Math.abs(lag) > Math.PI / 2 ? C.bad : C.ok;
    ctx.fillRect(21, H - 25, (tw - 2) * frac, 10);
    label(ctx, '电磁转矩 T = Tmax·sin(转矩角) = ' + fmt(P.Tmax * Math.sin(lag), 3) + ' N·m',
      20, H - 32, C.fg, { size: 10 });

    const rpm = (st.w * 60) / (2 * Math.PI);
    ro.set('当前步', (s.stepIdx + 1) + ' / 6');
    ro.set('导通相', TABLE[s.stepIdx].name);
    ro.set('定子磁场', fmt((thF * 180) / Math.PI, 0) + '°（每步跳 60°）');
    ro.set('转子角', fmt((norm(st.th) * 180) / Math.PI, 0) + '°');
    ro.set('转矩角', fmt((lag * 180) / Math.PI, 0) + '°' + (Math.abs(lag) > Math.PI / 2 ? '  ⚠ 失步' : '（90° 最大）'));
    ro.set('转速', fmt(rpm, 0) + ' rpm');
  }

  const controls = anim(host, {
    onTick(dt) {
      /* 换向定时器：到点就推进一步（rate = 步/秒） */
      st.acc += dt * s.rate;
      while (st.acc >= 1) {
        st.acc -= 1;
        s.stepIdx = (s.stepIdx + 1) % 6;
      }
      /* 定步长积分：每帧固定切 400 µs 的小步，与帧率无关 */
      const h = 4e-4;
      const n = clamp(Math.ceil(dt / h), 1, 200);
      const hh = dt / n;
      for (let i = 0; i < n; i += 1) rk4(fieldVec(), hh);
      draw();
    },
    onReset() {
      st.w = 0;
      st.th = 0;
      st.acc = 0;
      s.stepIdx = 0;
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rate', label: '换向频率（步/秒）', min: 1, max: 120, step: 1, value: s.rate, fmt: 0 },
        { name: 'Tl', label: '负载转矩（N·m）', min: 0, max: 0.1, step: 0.005, value: s.Tl, fmt: 3 },
      ],
    },
    (v) => { s.rate = v.rate; s.Tl = v.Tl; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
