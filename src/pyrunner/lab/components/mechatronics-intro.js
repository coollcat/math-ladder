/* 机电系统概貌：机 + 电 + 控的闭环。点任一环节看它吃什么、吐什么、典型参数多大；
   切开环 / 闭环，同一个负载扰动下的稳态误差差出一个数量级——这就是反馈的价值。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  bindPointer, polyline, label, clamp, fmt,
} from '../core.js';

const BLOCKS = [
  { id: 'ctrl', name: '控制器', io: '偏差 e → 控制量 u', par: 'Kp/Ki/Kd，控制周期 1–10 ms', tool: 'MCU / PLC：PID、轨迹规划' },
  { id: 'drv', name: '驱动器', io: '控制量 u → 电压 V、电流 I', par: '母线 24–48 V，PWM 10–20 kHz', tool: 'H 桥 / 三相逆变器 + 栅极驱动' },
  { id: 'mtr', name: '电机', io: '电能 V·I → 转矩 T、转速 ω', par: 'Kt、Ke、R、L、J', tool: '有刷 / 无刷 / 步进 / 伺服' },
  { id: 'load', name: '机械负载', io: '转矩 T → 位移 x、转速 n', par: '惯量 J、阻尼 B、传动比 i', tool: '丝杠 / 同步带 / 减速机' },
  { id: 'sen', name: '传感器', io: 'x、n、I → 电信号', par: '分辨率、带宽、延迟', tool: '编码器 / 霍尔 / 采样电阻' },
];

const KM = 1;      // 被控对象增益（控制量 → 输出）
const TAU = 0.4;   // 机械惯性时间常数
const T_END = 4;   // 示波器一屏 4 秒

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    mode: spec.mode || 'closed',
    Kp: spec.Kp ?? 6,
    Td: spec.Td ?? 0.5,     // 负载扰动（折算到输出侧）
    sel: 'mtr',
  };
  const st = { t: 0, y: 0, hist: [] };
  const cv = setupCanvas(host, 340);

  const ro = buildReadout({
    环节: '—', 输入: '—', 输出: '—', 典型参数: '—', 稳态误差: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '闭环（有反馈）', value: 'closed' }, { label: '开环（无反馈）', value: 'open' }],
    s.mode,
    (v) => { s.mode = v; resetSim(); },
  ));

  /* 定步长显式欧拉（5 ms），与帧率无关 */
  function simStep(h) {
    const u = s.mode === 'closed' ? s.Kp * (1 - st.y) : 1;
    const d = st.t > 1.5 ? s.Td : 0;
    st.y += (h * ((u * KM - d) - st.y)) / TAU;
    st.t += h;
    const last = st.hist[st.hist.length - 1];
    if (!last || st.t - last[0] >= 0.02) st.hist.push([st.t, st.y]);
    if (st.hist.length > 1000) st.hist.shift();
  }

  function resetSim() {
    st.t = 0;
    st.y = 0;
    st.hist = [];
    draw();
  }

  /* 稳态输出：开环 y = Km·r − Td；闭环 y = (Kp·Km·r − Td)/(1 + Kp·Km) */
  const steadyY = () => (s.mode === 'closed' ? (s.Kp * KM - s.Td) / (1 + s.Kp * KM) : KM - s.Td);

  function layout(W) {
    const bw = (W - 96) / 5;
    const bh = 44;
    const y0 = 30;
    const rects = BLOCKS.map((b, i) => ({ ...b, x: 58 + i * (bw + 8), y: y0, w: bw, h: bh }));
    return { rects, bw, y0, bh };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const { rects } = layout(W);

    label(ctx, s.mode === 'closed' ? '闭环：偏差被反复修正，扰动被压住' : '开环：扰动无人为它买单，全落在输出上',
      8, 14, s.mode === 'closed' ? C.ok : C.named('red'), { size: 11, weight: 600 });

    /* 求和点 */
    const sumX = 30;
    const sumY = rects[0].y + rects[0].h / 2;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sumX, sumY, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sumX - 5, sumY);
    ctx.lineTo(sumX + 5, sumY);
    ctx.moveTo(sumX, sumY - 5);
    ctx.lineTo(sumX, sumY + 5);
    ctx.stroke();
    label(ctx, '−', sumX + 12, sumY - 6, C.fg, { size: 11 });
    label(ctx, '设定值 r=1', 6, sumY - 16, C.fg, { size: 10 });

    /* 环节方块 + 连线 */
    rects.forEach((b, i) => {
      const on = b.id === s.sel;
      ctx.fillStyle = on ? C.soft : C.bg;
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 2.4 : 1.4;
      ctx.beginPath();
      ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.stroke();
      label(ctx, b.name, b.x + b.w / 2, b.y + 19, on ? C.accent : C.fg, { align: 'center', size: 12, weight: 600 });
      label(ctx, b.id === 'load' ? 'T（含扰动）' : b.io.split('→')[1].trim(), b.x + b.w / 2, b.y + 35,
        C.fg, { align: 'center', size: 10 });
      /* 前向箭头 */
      const px = i === 0 ? sumX + 9 : rects[i - 1].x + rects[i - 1].w;
      const x0 = i === 0 ? px + 3 : px + 4;
      const x1 = b.x - 4;
      if (x1 > x0) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, sumY);
        ctx.lineTo(x1, sumY);
        ctx.moveTo(x1 - 6, sumY - 4);
        ctx.lineTo(x1, sumY);
        ctx.lineTo(x1 - 6, sumY + 4);
        ctx.stroke();
      }
    });

    /* 反馈支路：传感器 → 求和点 */
    const fy = rects[0].y + rects[0].h + 26;
    ctx.strokeStyle = s.mode === 'closed' ? C.named('green') : C.grid;
    ctx.lineWidth = 1.8;
    ctx.setLineDash(s.mode === 'closed' ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(rects[4].x + rects[4].w / 2, rects[4].y + rects[4].h);
    ctx.lineTo(rects[4].x + rects[4].w / 2, fy);
    ctx.lineTo(sumX, fy);
    ctx.lineTo(sumX, sumY + 9);
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.mode === 'closed') {
      ctx.beginPath();
      ctx.moveTo(sumX, sumY + 9);
      ctx.lineTo(sumX - 4, sumY + 16);
      ctx.lineTo(sumX + 4, sumY + 16);
      ctx.closePath();
      ctx.fillStyle = C.named('green');
      ctx.fill();
    }
    label(ctx, s.mode === 'closed' ? '反馈 y' : '反馈断开（开环）', (rects[4].x + sumX) / 2 + 20, fy - 5,
      s.mode === 'closed' ? C.named('green') : C.grid, { align: 'center', size: 10 });

    /* 输出响应示波器 */
    const pTop = fy + 20;
    const pH = H - pTop - 16;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(20.5, pTop + 0.5, W - 30, pH);
    const yOf = (v) => pTop + pH - ((clamp(v, -0.5, 1.6) + 0.5) / 2.1) * pH;
    /* 目标 1.0 */
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(20, yOf(1));
    ctx.lineTo(W - 10, yOf(1));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '目标 1', 22, yOf(1) - 4, C.fg, { size: 10 });

    const t0 = Math.max(0, st.t - T_END);
    const xOf = (t) => 20 + ((t - t0) / T_END) * (W - 30);
    /* 扰动投入时刻 */
    if (st.t > 1.5) {
      const xd = xOf(Math.max(1.5, t0));
      ctx.strokeStyle = C.named('red');
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(xd, pTop);
      ctx.lineTo(xd, pTop + pH);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '扰动投入', xd + 3, pTop + 12, C.named('red'), { size: 10 });
    }
    const pts = st.hist.filter((p) => p[0] >= t0).map((p) => [xOf(p[0]), yOf(p[1])]);
    polyline(ctx, pts, C.accent, 2);
    if (pts.length) {
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, '输出 y（一阶惯性对象 τ=0.4 s）', 22, pTop - 5, C.fg, { size: 10 });

    const b = BLOCKS.find((x) => x.id === s.sel) || BLOCKS[0];
    ro.set('环节', b.name);
    ro.set('输入', b.io.split('→')[0].trim());
    ro.set('输出', b.io.split('→')[1].trim());
    ro.set('典型参数', b.par);
    ro.set('稳态误差', fmt(1 - steadyY(), 3) + '（' + (s.mode === 'closed' ? '闭环 ≈ Td/(1+Kp)' : '开环 = Td') + '）');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const { rects } = layout(cv.W);
      const hit = rects.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      return hit ? hit.id : null;
    },
    down(id) {
      s.sel = id;
      draw();
    },
    move() {},
  });

  const controls = anim(host, {
    onTick(dt) {
      const n = Math.min(Math.ceil(dt / 0.005), 20);
      for (let i = 0; i < n; i += 1) simStep(0.005);
      if (st.t > 12) resetSim();
      draw();
    },
    onReset: resetSim,
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Kp', label: '控制器增益 Kp', min: 0.5, max: 20, step: 0.5, value: s.Kp, fmt: 1 },
        { name: 'Td', label: '负载扰动 Td', min: 0, max: 1, step: 0.05, value: s.Td, fmt: 2 },
      ],
    },
    (v) => { s.Kp = v.Kp; s.Td = v.Td; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
