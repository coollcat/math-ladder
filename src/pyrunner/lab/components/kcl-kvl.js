/* 基尔霍夫定律与节点分析。
   KCL 说：任一节点流进 = 流出；KVL 说：任一回路电压降代数和为零。
   节点电压由 circuit.dc 真解——MNA 的每一行就是一个 KCL 方程。 */
import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, label, engine, clamp, fmt,
} from '../core.js';

/* 三节点电路：V1 供电，R1 跨 1-2，R2/电源 落地，R3 与电源并联 */
const POS = { 1: [64, 62], 2: [196, 62], 0: [130, 214] };

export default function render(host, spec) {
  let C = themeColors();
  const s = { Vs: spec.Vs ?? 12, R2: spec.R2 ?? 200 };
  const R1 = 100;
  const R3 = 300;
  let sel = '1';
  let circ = null;
  let fail = '';
  let sol = null;

  const cv = setupCanvas(host, 330);
  const ro = buildReadout({ '节点电压': '—', '选中节点': '—', 'Σ 流出电流': '—', 'KVL 校验': '—' });
  host.appendChild(ro.box);

  function solve() {
    if (!circ) return;
    const net = {
      nodes: ['0', '1', '2'],
      elements: [
        { type: 'V', id: 'V1', a: '1', b: '0', dc: s.Vs },
        { type: 'R', id: 'R1', a: '1', b: '2', value: R1 },
        { type: 'R', id: 'R2', a: '2', b: '0', value: s.R2 },
        { type: 'R', id: 'R3', a: '1', b: '0', value: R3 },
      ],
    };
    const r = circ.dc(net);
    if (!r.ok) { fail = r.reason || '求解失败'; sol = null; return; }
    fail = '';
    const v1 = r.v[r.nodeIdx.get('1')];
    const v2 = r.v[r.nodeIdx.get('2')];
    /* 电源支路电流：MNA 额外行的符号是「从节点 1 流向地」 */
    const iSrc = r.v[r.total - 1];
    sol = {
      v1, v2, iSrc,
      iR1: (v1 - v2) / R1,
      iR2: v2 / s.R2,
      iR3: v1 / R3,
      iterations: r.iterations,
    };
  }

  /* 选中节点上每条支路的「流出电流」 */
  function branches(node) {
    if (!sol) return [];
    const v = node === '1' ? sol.v1 : node === '2' ? sol.v2 : 0;
    if (node === '1') {
      return [
        { name: 'V1（电源）', i: sol.iSrc, to: '地' },
        { name: 'R1', i: (v - sol.v2) / R1, to: '节点 2' },
        { name: 'R3', i: v / R3, to: '地' },
      ];
    }
    if (node === '2') {
      return [
        { name: 'R1', i: (v - sol.v1) / R1, to: '节点 1' },
        { name: 'R2', i: v / s.R2, to: '地' },
      ];
    }
    return [
      { name: 'V1（电源）', i: -sol.iSrc, to: '节点 1' },
      { name: 'R2', i: -sol.v2 / s.R2, to: '节点 2' },
      { name: 'R3', i: -sol.v1 / R3, to: '节点 1' },
    ];
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
    solve();
    if (!sol) { label(ctx, '求解失败：' + fail, W / 2, H / 2, C.bad, { align: 'center', size: 12 }); return; }

    const line = (a, b) => {
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(POS[a][0], POS[a][1]);
      ctx.lineTo(POS[b][0], POS[b][1]);
      ctx.stroke();
    };
    /* 1→2、2→地 直连；1→地 有两条支路（电源 V1 与 R3），分别绕开画 */
    line('1', '2'); line('2', '0');
    const mid = (a, b) => [(POS[a][0] + POS[b][0]) / 2, (POS[a][1] + POS[b][1]) / 2];
    const mR1 = mid('1', '2');
    const mR2 = mid('2', '0');
    const mV = [POS['1'][0] - 30, mid('1', '0')[1]];
    const mR3 = [POS['1'][0] + 30, mid('1', '0')[1]];
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(POS['1'][0], POS['1'][1]); ctx.lineTo(mV[0], mV[1]);
    ctx.lineTo(POS['0'][0], POS['0'][1]);
    ctx.moveTo(POS['1'][0], POS['1'][1]); ctx.lineTo(mR3[0], mR3[1]);
    ctx.lineTo(POS['0'][0], POS['0'][1]);
    ctx.stroke();
    ctx.fillStyle = C.bg;
    [[mR1, 'R1\n100Ω'], [mR2, 'R2\n' + fmt(s.R2, 0) + 'Ω'], [mR3, 'R3\n300Ω'], [mV, 'V1\n' + fmt(s.Vs, 1) + 'V']]
      .forEach(([p, tx]) => {
        ctx.fillRect(p[0] - 22, p[1] - 14, 44, 28);
        tx.split('\n').forEach((ln, k) => label(ctx, ln, p[0], p[1] - 3 + k * 12, C.fg,
          { align: 'center', size: 10 }));
      });
    /* 节点 */
    Object.keys(POS).forEach((n) => {
      const [x, y] = POS[n];
      ctx.fillStyle = n === sel ? C.named('amber') : C.accent;
      ctx.beginPath();
      ctx.arc(x, y, n === sel ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, n === '0' ? '地' : '节点 ' + n, x, y - 14, C.fg, { align: 'center', size: 11, weight: 600 });
    });

    /* ---------- 右：进出电流条 ---------- */
    const bs = branches(sel);
    const bx = W - 168;
    const bw = W - bx - 12;
    let y = 44;
    const scale = 46 / Math.max(0.02, ...bs.map((b) => Math.abs(b.i)));
    label(ctx, '节点 ' + (sel === '0' ? '地' : sel) + ' 的支路电流（流出为正）', bx, 26, C.fg, { size: 11, weight: 600 });
    bs.forEach((b) => {
      const lab = b.name + ' → ' + b.to;
      label(ctx, lab, bx, y + 10, C.fg, { size: 10 });
      const cx = bx + 96;
      const w = clamp(b.i * scale, -46, 46);
      ctx.fillStyle = b.i >= 0 ? C.named('red') : C.accent;
      ctx.fillRect(cx + Math.min(0, w), y + 2, Math.abs(w), 11);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, y - 2); ctx.lineTo(cx, y + 16);
      ctx.stroke();
      label(ctx, fmt(b.i * 1000, 1) + ' mA', bx + bw, y + 10, C.fg, { align: 'right', size: 10 });
      y += 24;
    });
    const sum = bs.reduce((a, b) => a + b.i, 0);
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    ctx.moveTo(bx, y + 4); ctx.lineTo(W - 12, y + 4);
    ctx.stroke();
    label(ctx, 'Σ 流出 ' + fmt(sum * 1000, 3) + ' mA ≈ 0', bx, y + 22, Math.abs(sum) < 1e-9 ? C.ok : C.bad,
      { size: 11, weight: 600 });

    /* KVL：V1 → R1 → R2 → 回地 */
    const kvl = s.Vs - sol.iR1 * R1 - sol.iR2 * s.R2;
    ro.set('节点电压', 'v1 = ' + fmt(sol.v1, 3) + ' V　v2 = ' + fmt(sol.v2, 3) + ' V（' + sol.iterations + ' 次迭代）');
    ro.set('选中节点', sel === '0' ? '地（参考点 0 V）' : '节点 ' + sel + '　点画布上的节点可切换');
    ro.set('Σ 流出电流', fmt(sum * 1000, 3) + ' mA（KCL：应为 0，非零说明手算错了）');
    ro.set('KVL 校验', 'Vs − i₁·R1 − i₂·R2 = ' + fmt(kvl, 4) + ' V（沿 V1→R1→R2→地 一圈）');
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      let best = null;
      let bd = 22;
      Object.keys(POS).forEach((n) => {
        const d = Math.hypot(px - POS[n][0], py - POS[n][1]);
        if (d < bd) { bd = d; best = n; }
      });
      return best;
    },
    down(id) { sel = id; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Vs', label: '电源电压 Vs', min: 0, max: 24, step: 0.5, value: s.Vs, fmt: 1 },
        { name: 'R2', label: '电阻 R2', min: 50, max: 600, step: 10, value: s.R2, fmt: 0 },
      ],
    },
    (st) => { s.Vs = st.Vs; s.R2 = st.R2; draw(); },
  );

  draw();
  cv.redraw = draw;
  engine('circuit').then((m) => { circ = m; draw(); }).catch((e) => {
    fail = '引擎加载失败：' + (e && e.message ? e.message : e);
    draw();
  });
  return { slidersBox: sliders.box, destroy() {} };
}
