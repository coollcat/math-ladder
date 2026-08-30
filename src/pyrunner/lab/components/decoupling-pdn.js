/* 电源完整性与去耦：芯片要的是「动态电流一来电压不许塌」，也就是 PDN 阻抗在很宽的
   频率范围内都得低于目标阻抗 Z = ΔV/ΔI。大电容管低频、小电容管高频，两者之间
   还会顶出一个反谐振峰——阻抗曲线用 circuit 引擎的交流扫频算（Z = V/I）。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  engine, polyline, label, clamp, fmt,
} from '../core.js';

const RSRC = 1000;   // 虚拟电流源内阻：1 V 源串 1 kΩ ≈ 1 mA 电流激励

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    C: spec.C ?? 100,        // 单个 MLCC 容量 nF
    n: spec.n ?? 3,          // 并联个数
    esr: spec.esr ?? 20,     // 等效串联电阻 mΩ
    esl: spec.esl ?? 3,      // 等效串联电感 nH（走线/过孔都算在里面）
    dv: spec.dv ?? 50,       // 允许纹波 mV
    di: spec.di ?? 2,        // 动态电流 A
    bulk: spec.bulk || '10u',
  };
  let circuit = null;
  let sweep = null;
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    目标阻抗: '—', 峰值阻抗: '—', 自谐振频率: '—', 有效带宽: '—', 判定: '—', 提示: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '无大电容', value: 'none' }, { label: '并 10 µF', value: '10u' }, { label: '并 100 µF', value: '100u' }],
    s.bulk,
    (v) => { s.bulk = v; recompute(); },
  ));

  /* 网表：1 V 交流源串 1 kΩ 注入 → pdn；VRM 支路（L+R 到地）；若干去耦支路（ESL+ESR+C） */
  function netOf() {
    const nodes = ['0', 'in', 'pdn', 'vr'];
    const elements = [
      { type: 'V', id: 'V1', a: 'in', b: '0', ac: 1 },
      { type: 'R', id: 'Rsrc', a: 'in', b: 'pdn', value: RSRC },
      { type: 'L', id: 'Lvrm', a: 'pdn', b: 'vr', value: 60e-9 },
      { type: 'R', id: 'Rvrm', a: 'vr', b: '0', value: 0.03 },
    ];
    if (s.bulk !== 'none') {
      nodes.push('bk', 'bk2');
      elements.push({ type: 'L', id: 'Lbk', a: 'pdn', b: 'bk', value: 25e-9 });
      elements.push({ type: 'R', id: 'Rbk', a: 'bk', b: 'bk2', value: 0.08 });
      elements.push({ type: 'C', id: 'Cbk', a: 'bk2', b: '0', value: s.bulk === '10u' ? 10e-6 : 100e-6 });
    }
    for (let i = 0; i < s.n; i += 1) {
      nodes.push('a' + i, 'b' + i);
      elements.push({ type: 'L', id: 'Lesl' + i, a: 'pdn', b: 'a' + i, value: s.esl * 1e-9 });
      elements.push({ type: 'R', id: 'Resr' + i, a: 'a' + i, b: 'b' + i, value: s.esr * 1e-3 });
      elements.push({ type: 'C', id: 'Cc' + i, a: 'b' + i, b: '0', value: s.C * 1e-9 });
    }
    return { nodes, elements };
  }

  /* Z = Vpdn / I，I = (Vin − Vpdn)/1kΩ → Z = 1000·H/(1−H)（复数除法） */
  function zFrom(h) {
    const hr = h.re;
    const hi = h.im;
    const cr = 1 - hr;
    const ci = -hi;
    const den = cr * cr + ci * ci || 1e-30;
    const zr = (hr * cr - hi * ci) / den;
    const zi = (hi * cr - hr * ci) / den;
    return RSRC * Math.hypot(zr, zi);
  }

  function recompute() {
    if (!circuit) return;
    const raw = circuit.acSweep(netOf(), {
      fStart: 1e4, fStop: 1e9, points: 180, log: true,
      probeOut: 'pdn', probeIn: 'in', srcId: 'V1',
    });
    sweep = raw.map((p) => ({ f: p.f, z: zFrom({ re: p.vOut.re - 0, im: p.vOut.im }) }));
    draw();
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const gx = 48;
    const gy = 26;
    const gw = W - gx - 14;
    const gh = H - gy - 74;
    const fMin = 1e4;
    const fMax = 1e9;
    const zMin = 1e-3;
    const zMax = 100;
    const X = (f) => gx + (Math.log(clamp(f, fMin, fMax) / fMin) / Math.log(fMax / fMin)) * gw;
    const Y = (z) => gy + gh - (Math.log(clamp(z, zMin, zMax) / zMin) / Math.log(zMax / zMin)) * gh;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    [1e5, 1e6, 1e7, 1e8].forEach((f) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(X(f), gy);
      ctx.lineTo(X(f), gy + gh);
      ctx.stroke();
      label(ctx, f >= 1e6 ? f / 1e6 + 'M' : f / 1e3 + 'k', X(f), gy + gh + 14, C.fg, { align: 'center', size: 9 });
    });
    [0.01, 1, 100].forEach((z) => {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(gx, Y(z));
      ctx.lineTo(gx + gw, Y(z));
      ctx.stroke();
      label(ctx, z < 1 ? z * 1000 + 'mΩ' : z + 'Ω', gx - 4, Y(z) + 3, C.fg, { align: 'right', size: 9 });
    });
    label(ctx, 'PDN 阻抗 |Z| vs 频率（双对数）', gx, gy - 8, C.fg, { size: 10 });

    if (!circuit || !sweep) {
      label(ctx, '正在载入 circuit 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    const zTarget = (s.dv / 1000) / s.di;
    /* 超目标区域 */
    ctx.fillStyle = C.bad;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(gx, gy, gw, Y(zTarget) - gy);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(gx, Y(zTarget));
    ctx.lineTo(gx + gw, Y(zTarget));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, '目标阻抗 ' + fmt(zTarget * 1000, 1) + ' mΩ', gx + 4, Y(zTarget) - 4, C.named('red'), { size: 10 });

    const pts = sweep.map((p) => [X(p.f), Y(p.z)]);
    polyline(ctx, pts, C.accent, 2.2);

    /* 找内部的反谐振峰（大电容的 L 与小电容的 C 并联顶出来的那个尖） */
    let pk = -1;
    for (let i = 1; i < sweep.length - 1; i += 1) {
      if (sweep[i].z >= sweep[i - 1].z && sweep[i].z >= sweep[i + 1].z
        && (pk < 0 || sweep[i].z > sweep[pk].z)) pk = i;
    }
    if (pk < 0) {
      pk = 0;
      sweep.forEach((p, i) => { if (p.z > sweep[pk].z) pk = i; });
    }
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(X(sweep[pk].f), Y(sweep[pk].z), 4.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '反谐振峰 ' + fmt(sweep[pk].z * 1000, 0) + ' mΩ @ ' + (sweep[pk].f >= 1e6 ? fmt(sweep[pk].f / 1e6, 2) + ' MHz' : fmt(sweep[pk].f / 1e3, 0) + ' kHz'),
      X(sweep[pk].f) + 6, Y(sweep[pk].z) - 4, C.named('amber'), { size: 10, weight: 600 });

    /* 底部：并联电容示意 */
    const by = gy + gh + 30;
    label(ctx, s.n + ' × ' + fmt(s.C, 0) + ' nF（ESR ' + fmt(s.esr, 0) + ' mΩ，ESL ' + fmt(s.esl, 1) + ' nH）'
      + (s.bulk === 'none' ? '，无大电容' : '，并 ' + s.bulk.replace('u', ' µF')),
      gx, by, C.fg, { size: 10 });
    const capX = gx;
    for (let i = 0; i < Math.min(s.n, 8); i += 1) {
      const x = capX + i * 26;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, by + 12);
      ctx.lineTo(x, by + 22);
      ctx.moveTo(x + 14, by + 12);
      ctx.lineTo(x + 14, by + 22);
      ctx.moveTo(x - 5, by + 22);
      ctx.lineTo(x + 19, by + 22);
      ctx.moveTo(x - 5, by + 28);
      ctx.lineTo(x + 19, by + 28);
      ctx.stroke();
    }

    const okCount = sweep.filter((p) => p.z <= zTarget).length;
    const srf = 1 / (2 * Math.PI * Math.sqrt(s.C * 1e-9 * s.esl * 1e-9));
    ro.set('目标阻抗', fmt(zTarget * 1000, 1) + ' mΩ（ΔV ' + fmt(s.dv, 0) + ' mV / ΔI ' + fmt(s.di, 2) + ' A）');
    ro.set('峰值阻抗', fmt(sweep[pk].z * 1000, 0) + ' mΩ @ ' + fmt(sweep[pk].f / 1e6, 2) + ' MHz（反谐振）');
    ro.set('自谐振频率', fmt(srf / 1e6, 2) + ' MHz（低于此频率呈容性，高于则呈感性）');
    ro.set('有效带宽', fmt((okCount / sweep.length) * 100, 0) + ' % 的频段满足目标阻抗');
    ro.set('判定', sweep[pk].z > zTarget ? '⚠ 反谐振峰超过目标阻抗：峰上补电容、加阻尼或降 ESL' : '反谐振峰低于目标阻抗');
    ro.set('提示', s.esl > 8 ? 'ESL 太大：电容离芯片电源脚太远（走线/过孔电感）' : 'ESL 越小高频越好：贴近电源脚、短而宽的过孔');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'C', label: '单个 MLCC (nF)', min: 1, max: 1000, step: 1, value: s.C, fmt: 0 },
        { name: 'n', label: '并联个数', min: 1, max: 8, step: 1, value: s.n, fmt: 0 },
        { name: 'esr', label: 'ESR (mΩ)', min: 1, max: 200, step: 1, value: s.esr, fmt: 0 },
        { name: 'esl', label: 'ESL / 走线电感 (nH)', min: 0.5, max: 20, step: 0.5, value: s.esl, fmt: 1 },
        { name: 'dv', label: '允许纹波 (mV)', min: 5, max: 150, step: 5, value: s.dv, fmt: 0 },
        { name: 'di', label: '动态电流 (A)', min: 0.1, max: 5, step: 0.1, value: s.di, fmt: 1 },
      ],
    },
    (v) => {
      s.C = v.C; s.n = v.n; s.esr = v.esr; s.esl = v.esl; s.dv = v.dv; s.di = v.di;
      recompute();
    },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => {
    circuit = m;
    recompute();
  }).catch(() => { void 0; });

  return { slidersBox: sliders.box, destroy() { /* 静态图，无动画 */ } };
}
