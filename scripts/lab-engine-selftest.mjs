/* 引擎数值体检：跑一次确认六个引擎的数学正确性。
   用法：node scripts/lab-engine-selftest.mjs */
import * as D from '../src/pyrunner/lab/engines/dsp.js';
import * as C from '../src/pyrunner/lab/engines/circuit.js';
import * as L from '../src/pyrunner/lab/engines/logic.js';
import * as M from '../src/pyrunner/lab/engines/mech.js';
import * as V from '../src/pyrunner/lab/engines/media.js';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) pass += 1; else fail += 1;
  console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra ? '   ' + extra : ''));
}

/* 1. FFT 峰值定位：440Hz @ 44100, N=1024 */
{
  const N = 1024; const fs = 44100; const f = 440;
  const x = new Float64Array(N);
  for (let i = 0; i < N; i += 1) x[i] = Math.sin((2 * Math.PI * f * i) / fs);
  const r = D.rfft(x);
  let bi = 0;
  for (let k = 1; k < r.mag.length; k += 1) if (r.mag[k] > r.mag[bi]) bi = k;
  const want = Math.round((f * N) / fs);
  ok('dsp.rfft 峰值定位', Math.abs(bi - want) <= 1, 'bin=' + bi + ' 期望≈' + want);
}

/* 2. 双二阶低通频响 */
{
  const c = D.biquad('lowpass', 1000, 0.707, 0, 48000);
  const r = D.biquadResponse(c, [100, 1000, 10000], 48000);
  ok('dsp.biquad 通带 0dB', Math.abs(r.magDb[0]) < 0.5, r.magDb[0].toFixed(2) + 'dB');
  ok('dsp.biquad 截止 -3dB', Math.abs(r.magDb[1] + 3) < 0.6, r.magDb[1].toFixed(2) + 'dB');
  ok('dsp.biquad 阻带衰减', r.magDb[2] < -35, r.magDb[2].toFixed(2) + 'dB');
}

/* 3. 基频检测 */
{
  const fs = 16000; const N = 2048;
  const x = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    x[i] = Math.sin((2 * Math.PI * 220 * i) / fs) + 0.3 * Math.sin((2 * Math.PI * 440 * i) / fs);
  }
  const p = D.detectPitch(x, fs, 70, 400);
  ok('dsp.detectPitch', Math.abs(p.f0 - 220) < 6, p.f0.toFixed(2) + 'Hz');
}

/* 4. MFCC 形状 */
{
  const fs = 16000;
  const x = new Float64Array(fs * 0.1);
  for (let i = 0; i < x.length; i += 1) x[i] = Math.sin((2 * Math.PI * 300 * i) / fs) * 0.5;
  const cc = D.mfcc(x, { fs, frameLen: 400, hop: 160, nFilters: 26, nCeps: 13 });
  /* 0.1s / hop 160 / frameLen 400 → floor((1600-400)/160)+1 = 8 帧 */
  ok('dsp.mfcc 帧数与维度', cc.length === 8 && cc[0].length === 13, cc.length + ' 帧 × ' + cc[0].length + ' 维');
}

/* 5. LPC 谱包络 */
{
  const fs = 16000; const N = 512;
  const x = new Float64Array(N);
  for (let i = 0; i < N; i += 1) x[i] = Math.sin((2 * Math.PI * 400 * i) / fs);
  const r = D.lpc(x, 12);
  ok('dsp.lpc 系数稳定', r.a.length === 13 && isFinite(r.gain), 'gain=' + r.gain.toExponential(2));
}

/* 6. RC 瞬态 vs 解析解 */
{
  const R = 1000; const Cc = 1e-6;
  const net = C.netRC(R, Cc, 5);
  const r = C.transient(net, { dt: 2e-5, tEnd: 0.005, probe: (v, idx) => v[idx.get('out')] });
  ok('circuit.transient 收敛', r.ok, r.reason || '');
  const mid = r.samples[Math.floor(r.samples.length / 2)];
  const expect = C.rcStepAnalytic(mid.t, R, Cc, 5);
  ok('circuit RC 阶跃 vs 解析解', Math.abs(mid.value - expect) < 0.06,
    '数值=' + mid.value.toFixed(4) + ' 解析=' + expect.toFixed(4));
}

/* 7. 运放反相放大 */
{
  const net = C.netInvertingAmp(1000, 4700, 1);
  const r = C.dc(net);
  ok('circuit 反相放大求解', r.ok, r.reason || ('iter=' + r.iterations));
  if (r.ok) {
    const vout = r.v[r.nodeIdx.get('out')];
    ok('circuit 增益 -4.7', Math.abs(vout + 4.7) < 0.05, 'vout=' + vout.toFixed(4));
  }
}

/* 8. AC 扫频截止点 */
{
  const net = C.netRC(1000, 1e-6, 1);
  const s = C.acSweep(net, { fStart: 1, fStop: 1e6, points: 600, probeOut: 'out', probeIn: 'in' });
  const at = s.find((p) => p.f > 150 && p.f < 170);
  ok('circuit acSweep -3dB 截止', at && Math.abs(at.magDb + 3) < 0.8,
    at ? 'f=' + at.f.toFixed(0) + 'Hz ' + at.magDb.toFixed(2) + 'dB' : 'n/a');
}

/* 9. RLC 阻尼类型 */
{
  const p = C.rlcParams(100, 1e-3, 1e-6);
  ok('circuit rlcParams', p.zeta > 0 && isFinite(p.wn), 'zeta=' + p.zeta.toFixed(3) + ' ' + p.type);
}

/* 10. 纹波加法器 */
{
  const net = L.rippleAdder(4);
  const sim = L.createSim(net);
  const a = L.toBits(7, 4); const b = L.toBits(5, 4);
  net.inputs.forEach((n) => {
    const i = Number(n.slice(1));
    if (n.startsWith('a')) sim.set(n, a[i]);
    if (n.startsWith('b')) sim.set(n, b[i]);
  });
  sim.settle();
  const out = [0, 1, 2, 3].map((i) => sim.get('s' + i));
  ok('logic 纹波加法器 7+5=12', L.bitsToInt(out) === 12, '得到 ' + L.bitsToInt(out) + ' (' + out.join('') + ')');
}

/* 11. ALU */
{
  const r = L.alu4(L.toBits(9, 4), L.toBits(3, 4), 3);
  ok('logic ALU 9-3=6', L.bitsToInt(r.out) === 6, String(L.bitsToInt(r.out)));
}

/* 12. D 触发器移位 */
{
  const net = {
    inputs: ['din'],
    outputs: ['q2'],
    gates: [
      { id: 'f0', type: 'dff', in: ['din'], out: 'q0' },
      { id: 'f1', type: 'dff', in: ['q0'], out: 'q1' },
      { id: 'f2', type: 'dff', in: ['q1'], out: 'q2' },
    ],
  };
  /* din 在第 0 周期置 1，之后每周期右移一级：第 2 周期末抵达 q2。
     同时检查第 0 周期 q1 仍为 0——若 DFF 边读边写会当场穿透整条链。 */
  const wave = L.run(net, 3, (c) => ({ din: c === 0 ? 1 : 0 }));
  const last = wave[wave.length - 1];
  const first = wave[1];
  ok('logic 移位寄存器无竞争穿透', first.q0 === 1 && first.q1 === 0 && first.q2 === 0,
    '第0周期 q0=' + first.q0 + ' q1=' + first.q1 + ' q2=' + first.q2);
  ok('logic 三级移位 1 抵达 q2', last.q2 === 1, 'q2=' + last.q2);
}

/* 13. 缓存三种失效 */
{
  const r = L.cacheSim({ accesses: [0, 4, 0, 4, 0, 4], capacity: 2, blockSize: 1, assoc: 1 });
  ok('logic cacheSim 冲突失效', r.conflictMiss > 0,
    '命中=' + r.hits + ' 冷=' + r.coldMiss + ' 冲突=' + r.conflictMiss);
}

/* 14. 简支梁挠度 vs 解析解 */
{
  const r = M.beamAnalysis({ L: 1, EI: 1e4, loads: [{ type: 'point', P: 1000, x: 0.5 }], support: 'simply', n: 201 });
  const analytic = M.simplySupportedMidDeflection(1000, 1, 1e4);
  const numeric = Math.min(...r.y);
  ok('mech 简支梁挠度 vs 解析解',
    Math.abs(Math.abs(numeric) - Math.abs(analytic)) / Math.abs(analytic) < 0.06,
    '数值=' + numeric.toExponential(3) + ' 解析=' + analytic.toExponential(3));
}

/* 15. 悬臂梁 */
{
  const r = M.beamAnalysis({ L: 1, EI: 1e4, loads: [{ type: 'point', P: 1000, x: 1.0 }], support: 'cantilever', n: 201 });
  const analytic = M.cantileverTipDeflection(1000, 1, 1e4);
  ok('mech 悬臂梁端部挠度',
    Math.abs(Math.abs(r.y[r.y.length - 1]) - Math.abs(analytic)) / Math.abs(analytic) < 0.12,
    '数值=' + r.y[r.y.length - 1].toExponential(3) + ' 解析=' + analytic.toExponential(3));
}

/* 16. 四连杆位置与速度 */
{
  const f = M.fourBar({ a: 1, b: 2.2, c: 2, d: 2.5, theta: Math.PI / 3, branch: 1 });
  ok('mech 四连杆位置解', f.ok, f.reason || '');
  if (f.ok) {
    const v = M.fourBarVelocity(f, 1);
    ok('mech 四连杆速度解', v.ok && isFinite(v.omega4), v.ok ? 'w4=' + v.omega4.toFixed(3) : v.reason);
  }
  const g = M.grashof(1, 2.2, 2, 2.5);
  ok('mech Grashof 判定', g.satisfied, g.type);
}

/* 17. 欧拉临界载荷 */
{
  const s = M.sectionCircle(0.02);
  const Pcr = M.eulerPcr(2.1e11, s.I, 1, 1);
  ok('mech 欧拉临界载荷', Pcr > 0 && isFinite(Pcr), Pcr.toFixed(1) + ' N');
}

/* 17b. 桁架节点法：静定三角形桁架，顶点受竖向 1000 N
   A(0,0) 铰支座、B(4,0) 竖向辊支座、C(2,3)，三杆 AB/BC/CA。
   手算：Ay=By=500，AB=+333.33（拉），BC=CA=−600.93（压）。 */
{
  const nodes = [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 4, y: 0 }, { id: 'C', x: 2, y: 3 }];
  const members = [
    { id: 'AB', a: 'A', b: 'B' },
    { id: 'BC', a: 'B', b: 'C' },
    { id: 'CA', a: 'C', b: 'A' },
  ];
  const supports = [{ node: 'A', type: 'pin' }, { node: 'B', type: 'roller-y' }];
  const loads = [{ node: 'C', fx: 0, fy: -1000 }];
  const r = M.solveTruss(nodes, members, supports, loads);
  ok('mech 桁架求解成功', r.ok, r.reason || '');
  if (r.ok) {
    ok('mech 桁架下弦受拉 +333.3', Math.abs(r.forces.AB - 333.33) < 0.5, 'AB=' + r.forces.AB.toFixed(2));
    ok('mech 桁架上弦受压 −600.9', Math.abs(r.forces.BC + 600.93) < 0.5, 'BC=' + r.forces.BC.toFixed(2));
    ok('mech 桁架支座反力平衡',
      Math.abs(r.reactions.A.fy - 500) < 0.5 && Math.abs(r.reactions.B.fy - 500) < 0.5,
      'Ay=' + r.reactions.A.fy.toFixed(1) + ' By=' + r.reactions.B.fy.toFixed(1));
  }
}

/* 17c. 非静定桁架必须被识别出来，而不是给出一个看起来合理的错答案 */
{
  const nodes = [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 4, y: 0 }, { id: 'C', x: 2, y: 3 }];
  const members = [
    { id: 'AB', a: 'A', b: 'B' },
    { id: 'BC', a: 'B', b: 'C' },
    { id: 'CA', a: 'C', b: 'A' },
  ];
  const supports = [{ node: 'A', type: 'pin' }, { node: 'B', type: 'pin' }]; // 3 杆 + 4 反力 > 6 方程
  const r = M.solveTruss(nodes, members, supports, [{ node: 'C', fy: -1000 }]);
  ok('mech 桁架识别超静定', !r.ok && /超静定/.test(r.reason || ''), r.reason || '（本例不应求解成功）');
}

/* 18. 齿轮系 */
{
  const g = M.gearTrain([20, 40, 20, 60], 100);
  ok('mech 定轴轮系', Math.abs(g.outputRpm - 100 * (20 / 60)) < 1e-9, '输出 ' + g.outputRpm.toFixed(2) + ' rpm');
}

/* 19. DCT 往返 */
{
  const blk = new Float64Array(64);
  for (let i = 0; i < 64; i += 1) blk[i] = Math.sin(i * 0.3) * 0.5 + 0.5;
  const back = V.idct8x8(V.dct8x8(blk));
  let err = 0;
  for (let i = 0; i < 64; i += 1) err = Math.max(err, Math.abs(back[i] - blk[i]));
  ok('media DCT/IDCT 往返', err < 1e-9, 'maxErr=' + err.toExponential(2));
}

/* 20. 块匹配运动估计 */
{
  const w = 64; const h = 64;
  const r1 = V.synth(w, h, 'moving-ball', 0);
  const r2 = V.synth(w, h, 'moving-ball', 10);
  const bm = V.blockMatch(r1, r2, w, h, 16, 8);
  const mv = bm.vectors.find((v) => v.dx !== 0 || v.dy !== 0);
  ok('media 块匹配检出运动', !!mv, mv ? 'dx=' + mv.dx + ' dy=' + mv.dy : '未检出');
}

/* 21. PSNR 自比 */
{
  const a = V.synth(64, 64, 'rings');
  ok('media PSNR 自比无穷大', V.psnr(a, a) === Infinity);
}

/* 22. 量化后熵下降 */
{
  const a = V.synth(64, 64, 'rings');
  const q = V.quantize(a, 4);
  ok('media 量化降熵', V.entropy(q) < V.entropy(a) + 1e-9,
    V.entropy(a).toFixed(3) + ' → ' + V.entropy(q).toFixed(3));
}

console.log('\n' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
