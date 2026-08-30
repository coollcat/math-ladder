/* PWM 与 H 桥：四个开关管把母线电压切成方波，占空比决定平均电压（也就是转速），
   电感把方波电流磨成带纹波的直流。开关频率越高纹波越小，但开关损耗越大。
   电瞬态用显式欧拉自己积分（L·dI/dt = Vab − R·I − E），转速按稳态解算。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  polyline, label, fmt,
} from '../core.js';

const VBUS = 24;     // 母线电压
const R = 2;         // 电枢电阻 Ω
const KE = 0.05;     // Kt = Ke
const B = 5e-5;      // 粘性阻尼
const N_PER = 160;   // 每周期积分步数

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mode: spec.mode || 'fwd',
    duty: spec.duty ?? 60,     // 占空比 %
    fsw: spec.fsw ?? 20,       // 开关频率 kHz
    L: spec.L ?? 1,            // 电枢电感 mH
    Tl: spec.Tl ?? 0.03,       // 负载转矩 N·m
    phase: 0,
  };
  const cv = setupCanvas(host, 350);
  const ro = buildReadout({
    平均电压: '—', 电流均值: '—', 电流纹波: '—', 转速: '—', 转矩: '—', 提示: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '正转', value: 'fwd' }, { label: '反转', value: 'rev' },
      { label: '制动', value: 'brake' }, { label: '滑行', value: 'coast' }],
    s.mode,
    (v) => { s.mode = v; draw(); },
  ));

  /* 电动稳态转速（正转取正，反转取负）：ω = (Vavg − R·Tl/Ke)/(Ke + R·B/Ke) */
  function omega0() {
    const Vavg = s.mode === 'rev' ? -VBUS * (s.duty / 100) : VBUS * (s.duty / 100);
    return (Vavg - (R * s.Tl) / KE) / (KE + (R * B) / KE);
  }

  /* 端电压 Vab：正/反转是 PWM 方波；制动短接为 0；滑行时电感把电流灌回母线（反压） */
  function vabOf(on, I, E) {
    if (s.mode === 'fwd') return on ? VBUS : 0;
    if (s.mode === 'rev') return on ? -VBUS : 0;
    if (s.mode === 'brake') return 0;
    return Math.abs(I) > 1e-7 ? -VBUS * Math.sign(I) : E;
  }

  /* 显式欧拉积分三个 PWM 周期，取最后一个周期作为周期稳态 */
  function ripple(E) {
    const T = 1 / (s.fsw * 1000);
    const h = T / N_PER;
    const L = s.L * 1e-3;
    let I = 0;
    let last = null;
    for (let p = 0; p < 4; p += 1) {
      const arr = new Float64Array(N_PER);
      for (let i = 0; i < N_PER; i += 1) {
        const on = i / N_PER < s.duty / 100;
        I += (h * (vabOf(on, I, E) - R * I - E)) / L;
        arr[i] = I;
      }
      last = arr;
    }
    let mn = Infinity;
    let mx = -Infinity;
    let sum = 0;
    for (let i = 0; i < N_PER; i += 1) {
      mn = Math.min(mn, last[i]);
      mx = Math.max(mx, last[i]);
      sum += last[i];
    }
    return { wave: last, min: mn, max: mx, avg: sum / N_PER, pp: mx - mn, T };
  }

  /* H 桥：一条腿两个开关，电机横在中间 */
  function bridge(ctx, x0, x1, yTop, yBot, on, I) {
    const yMid = (yTop + yBot) / 2;
    const path = C.named('red');
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yTop);
    ctx.lineTo(x1, yTop);
    ctx.moveTo(x0, yBot);
    ctx.lineTo(x1, yBot);
    ctx.stroke();
    label(ctx, '+' + VBUS + 'V', (x0 + x1) / 2, yTop - 6, C.fg, { align: 'center', size: 10 });
    label(ctx, 'GND', (x0 + x1) / 2, yBot + 14, C.fg, { align: 'center', size: 10 });

    const draw1 = (x, y, state, name) => {
      const w = 32;
      const h = 16;
      ctx.fillStyle = state ? C.ok : C.bg;
      ctx.strokeStyle = state ? C.ok : C.axis;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(x - w / 2, y - h / 2, w, h);
      ctx.fill();
      ctx.stroke();
      label(ctx, name, x, y + 4, state ? C.bg : C.fg, { align: 'center', size: 9, weight: 600 });
      /* 反并联二极管 */
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 22, y - 7);
      ctx.lineTo(x + 22, y + 7);
      ctx.lineTo(x + 30, y);
      ctx.closePath();
      ctx.stroke();
    };
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.6;
    [x0, x1].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBot);
      ctx.stroke();
    });
    draw1(x0, yTop + 26, on.q1, 'Q1');
    draw1(x0, yBot - 26, on.q2, 'Q2');
    draw1(x1, yTop + 26, on.q3, 'Q3');
    draw1(x1, yBot - 26, on.q4, 'Q4');
    /* 电机 */
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(x0, yMid);
    ctx.lineTo((x0 + x1) / 2 - 26, yMid);
    ctx.moveTo((x0 + x1) / 2 + 26, yMid);
    ctx.lineTo(x1, yMid);
    ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc((x0 + x1) / 2, yMid, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, 'M', (x0 + x1) / 2, yMid + 5, C.accent, { align: 'center', size: 13, weight: 700 });
    /* 电流方向箭头（沿电机） */
    const dir = I >= 0 ? 1 : -1;
    ctx.strokeStyle = Math.abs(I) > 1e-4 ? path : C.grid;
    ctx.lineWidth = Math.abs(I) > 1e-4 ? 2.6 : 1.4;
    const ax = (x0 + x1) / 2 + dir * 36;
    ctx.beginPath();
    ctx.moveTo(ax - dir * 18, yMid - 16);
    ctx.lineTo(ax + dir * 18, yMid - 16);
    ctx.lineTo(ax + dir * 18 - dir * 7, yMid - 21);
    ctx.moveTo(ax + dir * 18, yMid - 16);
    ctx.lineTo(ax + dir * 18 - dir * 7, yMid - 11);
    ctx.stroke();
    label(ctx, 'I = ' + fmt(I, 2) + ' A', (x0 + x1) / 2, yMid - 24, Math.abs(I) > 1e-4 ? path : C.grid,
      { align: 'center', size: 10 });
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const w0 = omega0();
    const E = KE * w0;
    const rp = ripple(E);
    const on = s.phase < s.duty / 100;
    /* 各模式的开关状态：正转 Q1 斩波 + Q4 常通；反转 Q3 斩波 + Q2 常通；
       制动 Q2+Q4（两端短接）；滑行全关，靠二极管续流 */
    const st = s.mode === 'fwd' ? { q1: on, q2: false, q3: false, q4: true }
      : s.mode === 'rev' ? { q1: false, q2: true, q3: on, q4: false }
        : s.mode === 'brake' ? { q1: false, q2: true, q3: false, q4: true }
          : { q1: false, q2: false, q3: false, q4: false };
    const Iinst = rp.wave[Math.min(N_PER - 1, Math.floor((s.phase % 1) * N_PER))];

    bridge(ctx, 46, W - 76, 34, 152, st, Iinst);

    /* ---- 波形区 ---- */
    const gy = 186;
    const gh = H - gy - 26;
    const gx = 40;
    const gw = W - gx - 16;
    const periods = 2.5;
    const X = (u) => gx + (u / periods) * gw;   // u：周期数 0..2.5
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();

    /* Vab 方波 */
    const vTop = gy + 8;
    const vH = gh * 0.32;
    const Yv = (v) => vTop + vH / 2 - (v / VBUS) * (vH / 2) * 0.9;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Yv(0));
    ctx.lineTo(gx + gw, Yv(0));
    ctx.stroke();
    const vpts = [];
    for (let i = 0; i <= 400; i += 1) {
      const u = (i / 400) * periods;
      vpts.push([X(u), Yv(vabOf(u % 1 < s.duty / 100, Iinst, E))]);
    }
    polyline(ctx, vpts, C.accent2, 1.8);
    label(ctx, 'Vab 端电压（' + fmt(VBUS, 0) + 'V 方波）', gx, vTop - 2, C.accent2, { size: 10 });

    /* 电流：三角/指数纹波 */
    const iTop = gy + gh * 0.44;
    const iH = gh * 0.5;
    const span = Math.max(Math.abs(rp.max), Math.abs(rp.min), 0.05) * 1.15;
    const Yi = (v) => iTop + iH / 2 - (v / span) * (iH / 2);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(gx, Yi(0));
    ctx.lineTo(gx + gw, Yi(0));
    ctx.stroke();
    const ipts = [];
    for (let i = 0; i <= 300; i += 1) {
      const u = (i / 300) * periods;
      ipts.push([X(u), Yi(rp.wave[Math.min(N_PER - 1, Math.floor((u % 1) * N_PER))])]);
    }
    polyline(ctx, ipts, C.accent, 2);
    /* 平均值与纹波带 */
    ctx.strokeStyle = C.named('green');
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, Yi(rp.avg));
    ctx.lineTo(gx + gw, Yi(rp.avg));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'Iavg=' + fmt(rp.avg, 2) + ' A', gx + gw - 2, Yi(rp.avg) - 4, C.named('green'), { align: 'right', size: 10 });
    label(ctx, '电枢电流（ΔIpp = ' + fmt(rp.pp, 3) + ' A）', gx, iTop - 4, C.accent, { size: 10 });

    /* 播放头 */
    const ph = X(((s.phase % 1) + 1) % 1);
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ph, gy);
    ctx.lineTo(ph, gy + gh);
    ctx.stroke();

    const rpm = (w0 * 60) / (2 * Math.PI);
    const torque = KE * rp.avg;
    let tip = '—';
    if (s.fsw < 20) tip = 'fsw < 20 kHz：落在人耳可听段，电机会啸叫';
    else if (Math.abs(rp.avg) > 1e-3 && rp.pp / Math.abs(rp.avg) > 0.4) tip = '纹波率 > 40%：提高 fsw 或加大电感';
    else tip = '开关频率与纹波都合适';
    if (s.mode === 'brake') tip = '两端短接：动能全烧在绕组电阻上，制动转矩最大';
    if (s.mode === 'coast') tip = '桥臂全关：电流经二极管灌回母线后归零，无转矩，靠惯性滑行';

    ro.set('平均电压', fmt(rp.avg * R + E, 2) + ' V（= E + I·R）');
    ro.set('电流均值', fmt(rp.avg, 3) + ' A');
    ro.set('电流纹波', fmt(rp.pp, 3) + ' A（' + (Math.abs(rp.avg) > 1e-3 ? fmt((rp.pp / Math.abs(rp.avg)) * 100, 1) + ' %' : '—') + '）');
    ro.set('转速', fmt(rpm, 0) + ' rpm（' + (s.mode === 'brake' || s.mode === 'coast' ? '切换瞬间视为不变' : '稳态') + '）');
    ro.set('转矩', fmt(torque, 3) + ' N·m' + (s.mode === 'brake' ? '（制动）' : s.mode === 'coast' ? '（≈0）' : ''));
    ro.set('提示', tip);
  }

  const controls = anim(host, {
    onTick(dt) {
      /* 每秒走 4 个 PWM 周期，方便肉眼看清斩波与换流 */
      s.phase = (s.phase + dt * 4) % 1;
      draw();
    },
    onReset() { s.phase = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'duty', label: '占空比 D (%)', min: 0, max: 100, step: 1, value: s.duty, fmt: 0 },
        { name: 'fsw', label: '开关频率 (kHz)', min: 1, max: 60, step: 1, value: s.fsw, fmt: 0 },
        { name: 'L', label: '电枢电感 (mH)', min: 0.1, max: 5, step: 0.1, value: s.L, fmt: 1 },
        { name: 'Tl', label: '负载转矩 (N·m)', min: 0, max: 0.2, step: 0.005, value: s.Tl, fmt: 3 },
      ],
    },
    (v) => { s.duty = v.duty; s.fsw = v.fsw; s.L = v.L; s.Tl = v.Tl; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
