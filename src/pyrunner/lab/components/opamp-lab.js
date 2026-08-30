/* 运放：虚短与负反馈。理想运放只有两条规则：v+ = v−（虚短）、输入不取电流（虚断）。
   负反馈把输出「拧」到恰好让两输入端相等的值，于是增益完全由电阻比决定，与运放自身无关。
   四种拓扑全部交给 circuit.dc 真解，并把 v+ 与 v− 摆出来让你当场验证虚短。 */
import {
  themeColors, setupCanvas, buildSegmented, buildSliders, buildReadout, polyline, label, engine, clamp, fmt,
} from '../core.js';

/* 网表小工具，避免每种拓扑都堆一大坨字面量 */
const R = (id, a, b, value) => ({ type: 'R', id, a, b, value });
const V = (id, a, b, dc) => ({ type: 'V', id, a, b, dc, ac: 1 });
const OA = (ip, im, out) => ({ type: 'opamp', id: 'U1', ip, im, out });

/* 每种拓扑：造网表 + 指出 v+/v− 节点 + 理论增益 */
const TOPO = {
  inv: {
    name: '反相放大', vp: null, vn: 'n', formula: 'Av = −R2/R1',
    net: (R1, R2, v1) => ({ nodes: ['0', 'in', 'n', 'out'], elements: [
      V('V1', 'in', '0', v1), R('R1', 'in', 'n', R1), R('R2', 'n', 'out', R2), OA('0', 'n', 'out')] }),
    gain: (R1, R2) => -R2 / R1,
  },
  non: {
    name: '同相放大', vp: 'in', vn: 'n', formula: 'Av = 1 + R2/R1',
    net: (R1, R2, v1) => ({ nodes: ['0', 'in', 'n', 'out'], elements: [
      V('V1', 'in', '0', v1), R('R1', 'n', '0', R1), R('R2', 'n', 'out', R2), OA('in', 'n', 'out')] }),
    gain: (R1, R2) => 1 + R2 / R1,
  },
  buf: {
    name: '电压跟随器', vp: 'in', vn: 'out', formula: 'Av = 1（阻抗隔离）',
    net: (R1, R2, v1) => ({ nodes: ['0', 'in', 'out'], elements: [V('V1', 'in', '0', v1), OA('in', 'out', 'out')] }),
    gain: () => 1,
  },
  diff: {
    name: '差分放大', vp: 'p', vn: 'n', formula: 'Vout = (R2/R1)(V2 − V1)',
    net: (R1, R2, v1, v2) => ({ nodes: ['0', 'va', 'vb', 'p', 'n', 'out'], elements: [
      V('V1', 'va', '0', v1), V('V2', 'vb', '0', v2), R('R1', 'va', 'n', R1), R('R2', 'n', 'out', R2),
      R('R3', 'vb', 'p', R1), R('R4', 'p', '0', R2), OA('p', 'n', 'out')] }),
    gain: (R1, R2) => R2 / R1,
  },
};

export default function render(host, spec) {
  let C = themeColors();
  const s = { R1: spec.R1 ?? 1000, R2: spec.R2 ?? 4700, V1: spec.V1 ?? 1, V2: spec.V2 ?? 2.5 };
  const Vsat = spec.Vsat ?? 12;
  let topo = 'inv';
  let circ = null;
  let fail = '';
  let sol = null;
  let g = null; // 原理图小工具共用的 ctx

  const cv = setupCanvas(host, 320);
  host.appendChild(buildSegmented(
    Object.keys(TOPO).map((k) => ({ label: TOPO[k].name, value: k })),
    topo,
    (v) => { topo = v; draw(); },
  ));
  const ro = buildReadout({ 输出电压: '—', 增益: '—', 虚短校验: '—', 说明: '—' });
  host.appendChild(ro.box);

  function solve(vin) {
    const T = TOPO[topo];
    const r = circ.dc(T.net(s.R1, s.R2, vin, s.V2));
    if (!r.ok) { fail = r.reason || '求解失败'; return null; }
    fail = '';
    return {
      out: r.v[r.nodeIdx.get('out')],
      vp: T.vp ? r.v[r.nodeIdx.get(T.vp)] : 0,
      vn: r.v[r.nodeIdx.get(T.vn)],
    };
  }

  /* ---------- 原理图小工具 ---------- */
  const wire = (...c) => {
    g.strokeStyle = C.axis; g.lineWidth = 1.6; g.beginPath(); g.moveTo(c[0], c[1]);
    for (let i = 2; i < c.length; i += 2) g.lineTo(c[i], c[i + 1]);
    g.stroke();
  };
  const rbox = (x, y, tx) => {
    g.fillStyle = C.bg; g.fillRect(x - 16, y - 12, 32, 24);
    g.strokeStyle = C.accent2; g.lineWidth = 1.6; g.strokeRect(x - 16, y - 12, 32, 24);
    label(g, tx, x, y + 4, C.fg, { align: 'center', size: 10 });
  };
  const gnd = (x, y) => [[9, 0], [6, 4], [2, 8]].forEach(([d, dy]) => {
    g.strokeStyle = C.axis; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x - d, y + dy); g.lineTo(x + d, y + dy); g.stroke();
  });
  const vsrc = (x, y, tx) => {
    g.strokeStyle = C.accent; g.lineWidth = 1.8;
    g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.stroke();
    label(g, tx, x, y + 4, C.accent, { align: 'center', size: 9, weight: 600 });
  };

  function schematic() {
    g.strokeStyle = C.axis; g.lineWidth = 2;
    g.beginPath(); g.moveTo(118, 62); g.lineTo(118, 138); g.lineTo(186, 100); g.closePath(); g.stroke();
    label(g, '−', 128, 122, C.fg, { size: 13 });
    label(g, '+', 128, 86, C.fg, { size: 13 });
    wire(186, 100, 214, 100);
    label(g, 'out', 216, 104, C.named('green'), { size: 10, weight: 600 });
    if (topo === 'inv') {
      vsrc(32, 120, 'V1'); wire(44, 120, 56, 120); rbox(72, 120, 'R1'); wire(88, 120, 118, 120);
      wire(118, 82, 104, 82, 104, 190); gnd(104, 190);
    } else if (topo === 'non') {
      vsrc(32, 82, 'V1'); wire(44, 82, 118, 82);
      wire(118, 120, 104, 120, 104, 190); rbox(104, 155, 'R1'); gnd(104, 190);
    } else if (topo === 'buf') {
      vsrc(32, 82, 'V1'); wire(44, 82, 118, 82);
      wire(118, 120, 112, 120, 112, 166, 214, 166, 214, 100);
      label(g, '输出直接回到 − 端（全反馈）', 100, 182, C.fg, { size: 9 });
    } else {
      vsrc(32, 120, 'V1'); wire(44, 120, 56, 120); rbox(72, 120, 'R1'); wire(88, 120, 118, 120);
      vsrc(32, 76, 'V2'); wire(44, 76, 56, 76); rbox(72, 76, 'R3'); wire(88, 76, 118, 82);
      wire(118, 82, 104, 82, 104, 190); rbox(104, 148, 'R4'); gnd(104, 190);
    }
    /* 反馈支路 R2：− 端 → 下方 → 输出 */
    wire(112, 120, 112, 166, 128, 166);
    if (topo !== 'buf') rbox(146, 166, 'R2');
    wire(162, 166, 214, 166, 214, 100);
    label(g, topo === 'buf' ? '跟随器不使用电阻：R1/R2 不参与'
      : 'R1 = ' + fmt(s.R1 / 1000, 1) + ' kΩ　R2 = ' + fmt(s.R2 / 1000, 1) + ' kΩ', 20, 26,
      C.accent2, { size: 10 });
  }

  function draw() {
    C = themeColors();
    g = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.bg;
    g.fillRect(0, 0, W, H);
    if (!circ) { label(g, '正在载入 circuit 引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 }); return; }
    sol = solve(s.V1);
    if (!sol) { label(g, '求解失败：' + fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 }); return; }
    const T = TOPO[topo];
    schematic();

    /* ---------- 右：传输特性 ---------- */
    const gx = 250;
    const gw = W - gx - 20;
    const gy = H - 36;
    const gh = gy - 40;
    const vSpan = 5;
    const oSpan = Math.max(Vsat, 5);
    g.strokeStyle = C.axis; g.lineWidth = 1;
    g.beginPath(); g.moveTo(gx, gy - gh); g.lineTo(gx, gy); g.lineTo(gx + gw, gy); g.stroke();
    label(g, 'Vout', gx - 6, gy - gh + 4, C.fg, { align: 'right', size: 10 });
    label(g, 'Vin (V)', gx + gw, gy + 15, C.fg, { align: 'right', size: 10 });    g.save(); g.strokeStyle = C.bad; g.setLineDash([4, 3]);
    [Vsat, -Vsat].forEach((v) => {
      const y = gy - gh / 2 - (clamp(v, -oSpan, oSpan) / oSpan) * (gh / 2);
      g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + gw, y); g.stroke();
    });
    g.restore();
    label(g, '±Vsat：超出即削顶', gx + 4, gy - gh + 12, C.bad, { size: 9 });
    const GX = (v) => gx + ((clamp(v, -vSpan, vSpan) + vSpan) / (2 * vSpan)) * gw;
    const GY = (v) => gy - gh / 2 - (clamp(v, -oSpan, oSpan) / oSpan) * (gh / 2);
    const pts = [];
    for (let k = 0; k <= 40; k += 1) {
      const vin = -vSpan + (k / 40) * 2 * vSpan;
      const r = solve(vin);
      if (r) pts.push([GX(vin), GY(r.out)]);
    }
    polyline(g, pts, C.accent, 2.4);
    g.fillStyle = C.named('amber');
    g.beginPath(); g.arc(GX(s.V1), GY(sol.out), 5, 0, Math.PI * 2); g.fill();

    /* 差分的「输入」是 V2−V1，其余拓扑就是 Vin */
    const den = topo === 'diff' ? (s.V2 - s.V1) : s.V1;
    const th = T.gain(s.R1, s.R2);
    const meas = Math.abs(den) > 1e-6 ? sol.out / den : th;
    ro.set('输出电压', fmt(sol.out, 4) + ' V'
      + (Math.abs(sol.out) > Vsat ? '　⚠ 超出 ±Vsat，真实运放会削顶（本引擎为理想模型，不建模电源轨）' : ''));
    ro.set('增益', '实测 ' + fmt(meas, 4) + '　理论 ' + fmt(th, 4) + '　' + T.formula);
    ro.set('虚短校验', 'v+ = ' + fmt(sol.vp, 5) + ' V　v− = ' + fmt(sol.vn, 5) + ' V　差 '
      + fmt(Math.abs(sol.vp - sol.vn), 6) + ' V（→0 即虚短成立）');
    ro.set('说明', topo === 'buf' ? '跟随器增益恒为 1，价值在输入阻抗极高、输出阻抗极低——用来隔离前后级'
      : topo === 'diff' ? '只放大 V2−V1，共模被抵消，是仪表放大器与电桥测量的雏形'
        : '增益只由 R2/R1 决定，与运放开环增益无关——负反馈的威力就在这里');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'R1', label: 'R1', min: 1000, max: 100000, step: 1000, value: s.R1, fmt: 0 },
        { name: 'R2', label: 'R2（反馈）', min: 1000, max: 100000, step: 1000, value: s.R2, fmt: 0 },
        { name: 'V1', label: '输入 V1', min: -5, max: 5, step: 0.1, value: s.V1, fmt: 2 },
        { name: 'V2', label: '输入 V2（差分用）', min: -5, max: 5, step: 0.1, value: s.V2, fmt: 2 },
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
