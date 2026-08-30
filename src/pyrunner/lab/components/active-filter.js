/* 有源滤波器设计。
   运放把无源 RC 从「带负载就变样」里解放出来：
   一阶低通用反相放大器 + 反馈电容，增益 20 dB/dec 往下掉；
   二阶用 Sallen-Key（单位增益缓冲 + 两级 RC），斜率翻倍到 40 dB/dec，
   Q 决定截止点附近是平坦（Butterworth Q=0.707）、过冲还是尖峰。
   曲线由 circuit.acSweep 逐点真解，虚线是理论公式，两条应当重合。 */
import {
  themeColors, setupCanvas, buildSegmented, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

const RIN = 10000;  // 反相放大器输入电阻
const C2 = 1e-8;    // Sallen-Key 的 C2 固定 10 nF

export default function render(host, spec) {
  let C = themeColors();
  const s = { lf: spec.lf ?? 3, Q: spec.Q ?? 0.707 }; // lf = log10(fc)
  let order = 'lp1';
  let circ = null;
  let fail = '';
  let sweep = null;

  const cv = setupCanvas(host, 320);
  host.appendChild(buildSegmented(
    [{ label: '一阶有源低通 (−20 dB/dec)', value: 'lp1' }, { label: '二阶 Sallen-Key (−40 dB/dec)', value: 'lp2' }],
    order,
    (v) => { order = v; draw(); },
  ));
  const ro = buildReadout({ 截止频率: '—', '−3dB 实测': '—', 高频斜率: '—', 元件取值: '—' });
  host.appendChild(ro.box);

  const fc = () => 10 ** s.lf;

  function build() {
    if (order === 'lp1') {
      const Cf = 1 / (2 * Math.PI * fc() * RIN);
      return {
        net: {
          nodes: ['0', 'in', 'n', 'out'],
          elements: [
            { type: 'V', id: 'V1', a: 'in', b: '0', dc: 1, ac: 1 },
            { type: 'R', id: 'R1', a: 'in', b: 'n', value: RIN },
            { type: 'R', id: 'Rf', a: 'n', b: 'out', value: RIN },
            { type: 'C', id: 'Cf', a: 'n', b: 'out', value: Cf },
            { type: 'opamp', id: 'U1', ip: '0', im: 'n', out: 'out' },
          ],
        },
        desc: 'R1 = Rf = 10 kΩ（直流增益 1），Cf = ' + fmt(Cf * 1e9, 2) + ' nF',
        theory: (f) => 1 / Math.hypot(1, f / fc()),
      };
    }
    const m = 4 * s.Q * s.Q;
    const R = 1 / (4 * Math.PI * fc() * C2 * s.Q);
    return {
      net: {
        nodes: ['0', 'in', 'a', 'b', 'out'],
        elements: [
          { type: 'V', id: 'V1', a: 'in', b: '0', dc: 1, ac: 1 },
          { type: 'R', id: 'R1', a: 'in', b: 'a', value: R },
          { type: 'R', id: 'R2', a: 'a', b: 'b', value: R },
          { type: 'C', id: 'C1', a: 'a', b: 'out', value: m * C2 },
          { type: 'C', id: 'C2', a: 'b', b: '0', value: C2 },
          { type: 'opamp', id: 'U1', ip: 'b', im: 'out', out: 'out' },
        ],
      },
      desc: 'R1 = R2 = ' + fmt(R, 0) + ' Ω，C1 = ' + fmt(m * C2 * 1e9, 2) + ' nF，C2 = '
        + fmt(C2 * 1e9, 0) + ' nF',
      theory: (f) => {
        const u = f / fc();
        return 1 / Math.hypot(1 - u * u, u / s.Q);
      },
    };
  }

  function compute() {
    if (!circ) return null;
    const b = build();
    const data = circ.acSweep(b.net, {
      fStart: fc() / 100, fStop: fc() * 100, points: 260,
      probeOut: 'out', probeIn: 'in',
    });
    if (!data.every((p) => isFinite(p.magDb))) { fail = '扫频出现非有限值：请检查元件取值'; return null; }
    fail = '';
    return { data, b };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    if (!circ) { label(ctx, '正在载入 circuit 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 }); return; }
    sweep = compute();
    if (!sweep) { label(ctx, '求解失败：' + fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 }); return; }
    const { data, b } = sweep;

    const gx = 48;
    const gw = W - gx - 20;
    const gy = H - 40;
    const gh = gy - 34;
    const dbTop = 20;
    const dbBot = -60;
    const fLo = fc() / 100;
    const fHi = fc() * 100;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    label(ctx, 'dB', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(ctx, '频率（对数）', gx + gw / 2, gy + 16, C.fg, { align: 'center', size: 10 });
    const FX = (f) => gx + (Math.log(clamp(f, fLo, fHi) / fLo) / Math.log(fHi / fLo)) * gw;
    const DY = (db) => gy - ((clamp(db, dbBot, dbTop) - dbBot) / (dbTop - dbBot)) * gh;
    /* 网格：每个十倍频 + 每 20 dB */
    ctx.strokeStyle = C.grid;
    for (let k = 1; k < 4; k += 1) {
      const f = fLo * 10 ** k;
      ctx.beginPath();
      ctx.moveTo(FX(f), gy - gh); ctx.lineTo(FX(f), gy);
      ctx.stroke();
      label(ctx, fmt(f / 1000, 2) + 'k', FX(f), gy + 14, C.fg, { align: 'center', size: 9 });
    }
    for (let d = dbTop; d >= dbBot; d -= 20) {
      ctx.beginPath();
      ctx.moveTo(gx, DY(d)); ctx.lineTo(gx + gw, DY(d));
      ctx.stroke();
      label(ctx, String(d), gx - 6, DY(d) + 4, C.fg, { align: 'right', size: 9 });
    }
    /* 理论曲线 */
    const th = [];
    for (let k = 0; k <= 200; k += 1) {
      const f = fLo * (fHi / fLo) ** (k / 200);
      th.push([FX(f), DY(20 * Math.log10(Math.max(b.theory(f), 1e-6)))]);
    }
    polyline(ctx, th, C.named('gray'), 1.4, [5, 4]);
    /* 真解曲线 */
    polyline(ctx, data.map((p) => [FX(p.f), DY(p.magDb)]), C.accent, 2.6);
    /* fc 与 −3dB */
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.setLineDash([4, 3]);
    [FX(fc()), DY(-3)].forEach((v, k) => {
      ctx.beginPath();
      if (k === 0) { ctx.moveTo(v, gy); ctx.lineTo(v, gy - gh); } else { ctx.moveTo(gx, v); ctx.lineTo(gx + gw, v); }
      ctx.stroke();
    });
    ctx.restore();
    label(ctx, 'fc', FX(fc()) + 4, gy - 6, C.named('purple'), { size: 10 });
    label(ctx, '−3 dB', gx + 4, DY(-3) - 4, C.named('purple'), { size: 10 });
    label(ctx, '── acSweep 真解', gx + 8, 26, C.accent, { size: 10 });
    label(ctx, '┄ 理论公式', gx + 8, 42, C.named('gray'), { size: 10 });

    /* 实测 −3dB 点 */
    let f3 = null;
    for (let k = 1; k < data.length; k += 1) {
      if (data[k - 1].magDb >= -3 && data[k].magDb < -3) { f3 = data[k].f; break; }
    }
    const hi = data[data.length - 1];
    const mid = data[Math.floor(data.length * 0.75)];
    const slope = (hi.magDb - mid.magDb) / (Math.log10(hi.f) - Math.log10(mid.f));
    ro.set('截止频率', fmt(fc(), 1) + ' Hz　（' + fmt(fc() / 1000, 3) + ' kHz，设计目标）');
    ro.set('−3dB 实测', (f3 ? fmt(f3, 1) + ' Hz' : '未在扫频范围内')
      + '　（Q≠0.707 时 −3dB 点本就不等于 fc：Q 越大峰越高，−3dB 点越往右移）');
    ro.set('高频斜率', fmt(slope, 1) + ' dB/dec　（一阶 −20，二阶 −40）');
    ro.set('元件取值', b.desc + (order === 'lp2'
      ? '　Q = ' + fmt(s.Q, 3) + '（0.707 = Butterworth 最平坦；>0.707 截止点会鼓包）'
      : '　Cf 由 fc = 1/(2π·Rf·Cf) 反解'));
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'lf', label: '截止频率 log₁₀fc', min: 1, max: 5, step: 0.01, value: s.lf, fmt: 2 },
        { name: 'Q', label: '品质因数 Q（二阶）', min: 0.3, max: 5, step: 0.01, value: s.Q, fmt: 2 },
      ],
    },
    (stt) => { Object.assign(s, stt); draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() {} };
}
