/* 电路求解引擎 —— 改进节点分析（MNA）。纯函数，可 node 单测。
   支持元件：
     R 电阻 / C 电容 / L 电感 / V 电压源 / I 电流源
     D 二极管（Shockley，Newton-Raphson 迭代）
     VCVS 受控电压源 / opamp 理想运放（虚短约束）
   分析模式：
     dc()      直流工作点（非线性用 Newton-Raphson）
     transient() 后向欧拉瞬态（C/L 走伴随模型）
     ac()      频域扫频（复数 MNA，出 Bode 数据）
   符号约定：节点 '0' 为地。电流正方向定义为「从 a 流向 b」。
   节点方程写作「流出节点的电流之和 = 注入节点的电流」，故电流源 I(a→b) 的
   右端项贡献为 z[a] -= I, z[b] += I。 */

/* ---------- 线性代数 ---------- */

function zeros(n, m) {
  const A = [];
  for (let i = 0; i < n; i += 1) A.push(new Float64Array(m));
  return A;
}

/* 高斯消元（部分选主元）。A 会被就地修改，z 返回解向量 */
function solve(A, z) {
  const n = z.length;
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    }
    if (Math.abs(A[piv][col]) < 1e-18) return null; // 奇异：悬空节点或未接地
    if (piv !== col) {
      const t = A[piv]; A[piv] = A[col]; A[col] = t;
      const s = z[piv]; z[piv] = z[col]; z[col] = s;
    }
    const d = A[col][col];
    for (let r = col + 1; r < n; r += 1) {
      const f = A[r][col] / d;
      if (!f) continue;
      for (let c = col; c < n; c += 1) A[r][c] -= f * A[col][c];
      z[r] -= f * z[col];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = z[r];
    for (let c = r + 1; c < n; c += 1) s -= A[r][c] * x[c];
    x[r] = s / A[r][r];
  }
  return x;
}

/* 复数 MNA 求解：输入实部/虚部两个矩阵与向量 */
function solveComplex(Ar, Ai, zr, zi) {
  const n = zr.length;
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    let best = 0;
    for (let r = col; r < n; r += 1) {
      const m = Math.hypot(Ar[r][col], Ai[r][col]);
      if (m > best) { best = m; piv = r; }
    }
    if (best < 1e-18) return null;
    if (piv !== col) {
      let t = Ar[piv]; Ar[piv] = Ar[col]; Ar[col] = t;
      t = Ai[piv]; Ai[piv] = Ai[col]; Ai[col] = t;
      let s = zr[piv]; zr[piv] = zr[col]; zr[col] = s;
      s = zi[piv]; zi[piv] = zi[col]; zi[col] = s;
    }
    const dr = Ar[col][col];
    const di = Ai[col][col];
    const dm = dr * dr + di * di;
    for (let r = col + 1; r < n; r += 1) {
      const nr = Ar[r][col];
      const ni = Ai[r][col];
      /* f = (nr + j ni) / (dr + j di) */
      const fr = (nr * dr + ni * di) / dm;
      const fi = (ni * dr - nr * di) / dm;
      if (!fr && !fi) continue;
      for (let c = col; c < n; c += 1) {
        Ar[r][c] -= fr * Ar[col][c] - fi * Ai[col][c];
        Ai[r][c] -= fr * Ai[col][c] + fi * Ar[col][c];
      }
      zr[r] -= fr * zr[col] - fi * zi[col];
      zi[r] -= fr * zi[col] + fi * zr[col];
    }
  }
  const xr = new Float64Array(n);
  const xi = new Float64Array(n);
  for (let r = n - 1; r >= 0; r -= 1) {
    let sr = zr[r];
    let si = zi[r];
    for (let c = r + 1; c < n; c += 1) {
      sr -= Ar[r][c] * xr[c] - Ai[r][c] * xi[c];
      si -= Ar[r][c] * xi[c] + Ai[r][c] * xr[c];
    }
    const dr = Ar[r][r];
    const di = Ai[r][r];
    const dm = dr * dr + di * di;
    xr[r] = (sr * dr + si * di) / dm;
    xi[r] = (si * dr - sr * di) / dm;
  }
  return { re: xr, im: xi };
}

/* ---------- 网表索引 ---------- */

/* 统计需要额外未知量（支路电流）的元件：V / VCVS / opamp */
function extraIndexOf(el) {
  return el.type === 'V' || el.type === 'VCVS' || el.type === 'opamp';
}

function buildIndex(net) {
  /* 地节点 '0' 不建方程：只有非地节点才分配索引，漏掉这一步会让地
     被当成未知节点，矩阵必然奇异。 */
  const nodeIdx = new Map();
  let k = 0;
  net.nodes.forEach((n) => {
    if (n === '0') return;
    nodeIdx.set(n, k);
    k += 1;
  });
  const nNodes = k;
  let extra = 0;
  net.elements.forEach((el) => {
    if (extraIndexOf(el)) {
      el._row = nNodes + extra;
      extra += 1;
    }
  });
  return { nodeIdx, nNodes, total: nNodes + extra };
}

const idxOf = (map, name) => (name === '0' || name === undefined ? -1 : (map.has(name) ? map.get(name) : -1));

/* ---------- 导纳/电流印记 ---------- */

function stampG(G, a, b, g) {
  if (a >= 0) G[a][a] += g;
  if (b >= 0) G[b][b] += g;
  if (a >= 0 && b >= 0) {
    G[a][b] -= g;
    G[b][a] -= g;
  }
}

/* 注入：电流 I 从 a 流向 b */
function stampI(z, a, b, I) {
  if (a >= 0) z[a] -= I;
  if (b >= 0) z[b] += I;
}

/* ---------- 二极管（Shockley） ---------- */

const VT = 0.02585; // 室温热电压

function diodeCurrent(v, Is = 1e-12, n = 1, vt = VT) {
  return Is * (Math.exp(v / (n * vt)) - 1);
}

function diodeConductance(v, Is = 1e-12, n = 1, vt = VT) {
  return (Is / (n * vt)) * Math.exp(v / (n * vt));
}

/* ---------- 直流工作点 ---------- */

function dc(net, opts = {}) {
  const { nodeIdx, nNodes, total } = buildIndex(net);
  const V = new Float64Array(total);
  let converged = false;
  let iter = 0;
  const maxIter = opts.maxIter || 100;

  for (; iter < maxIter; iter += 1) {
    const G = zeros(total, total);
    const z = new Float64Array(total);
    net.elements.forEach((el) => {
      const a = idxOf(nodeIdx, el.a);
      const b = idxOf(nodeIdx, el.b);
      const va = a >= 0 ? V[a] : 0;
      const vb = b >= 0 ? V[b] : 0;
      const vab = va - vb;
      switch (el.type) {
        case 'R':
          stampG(G, a, b, 1 / el.value);
          break;
        case 'I':
          stampI(z, a, b, el.dc || 0);
          break;
        case 'V': {
          const k = el._row;
          if (a >= 0) G[a][k] += 1;
          if (b >= 0) G[b][k] -= 1;
          if (a >= 0) G[k][a] += 1;
          if (b >= 0) G[k][b] -= 1;
          z[k] = el.dc || 0;
          break;
        }
        case 'D': {
          /* Newton-Raphson：把非线性元件在上一轮工作点线性化 */
          const Is = el.Is || 1e-12;
          const nEm = el.n || 1;
          const id = diodeCurrent(vab, Is, nEm, el.vt || VT);
          const gd = diodeConductance(vab, Is, nEm, el.vt || VT);
          const ieq = id - gd * vab;
          stampG(G, a, b, gd);
          stampI(z, a, b, ieq);
          break;
        }
        case 'VCVS': {
          const k = el._row;
          const cp = idxOf(nodeIdx, el.cp);
          const cn = idxOf(nodeIdx, el.cn);
          if (a >= 0) G[a][k] += 1;
          if (b >= 0) G[b][k] -= 1;
          if (a >= 0) G[k][a] += 1;
          if (b >= 0) G[k][b] -= 1;
          if (cp >= 0) G[k][cp] -= el.gain;
          if (cn >= 0) G[k][cn] += el.gain;
          z[k] = 0;
          break;
        }
        case 'opamp': {
          /* 理想运放：v+ = v-，输出支路电流作为额外未知量 */
          const k = el._row;
          const io = idxOf(nodeIdx, el.out);
          const ip = idxOf(nodeIdx, el.ip);
          const im = idxOf(nodeIdx, el.im);
          if (io >= 0) G[io][k] += 1;
          if (ip >= 0) G[k][ip] += 1;
          if (im >= 0) G[k][im] -= 1;
          z[k] = 0;
          break;
        }
        default:
          break;
      }
    });

    const x = solve(G, z);
    if (!x) return { ok: false, reason: '矩阵奇异：请检查是否有悬空节点或缺少接地路径' };
    let maxDiff = 0;
    for (let i = 0; i < total; i += 1) {
      /* 限幅：二极管指数项容易在迭代初期发散，逐步夹紧保证收敛 */
      const step = x[i] - V[i];
      const clamped = Math.max(-0.5, Math.min(0.5, step));
      V[i] += clamped;
      maxDiff = Math.max(maxDiff, Math.abs(clamped));
    }
    if (maxDiff < 1e-9) {
      converged = true;
      break;
    }
  }

  return { ok: converged, v: V, nodeIdx, nNodes, total, iterations: iter + 1 };
}

/* ---------- 瞬态（后向欧拉） ---------- */

/* 状态：节点电压历史 + 电感支路电流历史 */
function createTransient(net, dt) {
  const { nodeIdx, nNodes, total } = buildIndex(net);
  const vPrev = new Float64Array(total);
  const iInd = new Map();
  net.elements.forEach((el) => {
    if (el.type === 'L') iInd.set(el.id, 0);
  });
  return { net, dt, nodeIdx, nNodes, total, v: vPrev, iInd, t: 0 };
}

/* 推进一步，返回本步解 */
function step(st, sourceFn) {
  const { net, dt, nodeIdx, total } = st;
  const G = zeros(total, total);
  const z = new Float64Array(total);
  const V = st.v;

  net.elements.forEach((el) => {
    const a = idxOf(nodeIdx, el.a);
    const b = idxOf(nodeIdx, el.b);
    const va = a >= 0 ? V[a] : 0;
    const vb = b >= 0 ? V[b] : 0;
    switch (el.type) {
      case 'R':
        stampG(G, a, b, 1 / el.value);
        break;
      case 'C': {
        /* 后向欧拉伴随模型：Geq = C/dt，等效电流源 = -Geq·v_prev */
        const geq = el.value / dt;
        stampG(G, a, b, geq);
        stampI(z, a, b, -geq * (va - vb));
        break;
      }
      case 'L': {
        /* 后向欧拉：i(t) = i(t-dt) + (dt/L)·v(t) */
        const geq = dt / el.value;
        const iprev = st.iInd.get(el.id) || 0;
        stampG(G, a, b, geq);
        stampI(z, a, b, iprev);
        break;
      }
      case 'V': {
        const k = el._row;
        const val = sourceFn ? sourceFn(el, st.t) : (el.dc || 0);
        if (a >= 0) G[a][k] += 1;
        if (b >= 0) G[b][k] -= 1;
        if (a >= 0) G[k][a] += 1;
        if (b >= 0) G[k][b] -= 1;
        z[k] = val;
        break;
      }
      case 'I': {
        const val = sourceFn ? sourceFn(el, st.t) : (el.dc || 0);
        stampI(z, a, b, val);
        break;
      }
      case 'D': {
        const Is = el.Is || 1e-12;
        const nEm = el.n || 1;
        let vab = va - vb;
        /* 阻尼迭代：二极管指数项在瞬态里更容易飞，先限压再线性化 */
        vab = Math.max(-1, Math.min(1, vab));
        const id = diodeCurrent(vab, Is, nEm, el.vt || VT);
        const gd = diodeConductance(vab, Is, nEm, el.vt || VT);
        const ieq = id - gd * vab;
        stampG(G, a, b, gd);
        stampI(z, a, b, ieq);
        break;
      }
      case 'VCVS': {
        const k = el._row;
        const cp = idxOf(nodeIdx, el.cp);
        const cn = idxOf(nodeIdx, el.cn);
        if (a >= 0) G[a][k] += 1;
        if (b >= 0) G[b][k] -= 1;
        if (a >= 0) G[k][a] += 1;
        if (b >= 0) G[k][b] -= 1;
        if (cp >= 0) G[k][cp] -= el.gain;
        if (cn >= 0) G[k][cn] += el.gain;
        break;
      }
      case 'opamp': {
        const k = el._row;
        const io = idxOf(nodeIdx, el.out);
        const ip = idxOf(nodeIdx, el.ip);
        const im = idxOf(nodeIdx, el.im);
        if (io >= 0) G[io][k] += 1;
        if (ip >= 0) G[k][ip] += 1;
        if (im >= 0) G[k][im] -= 1;
        break;
      }
      default:
        break;
    }
  });

  const x = solve(G, z);
  if (!x) return { ok: false, reason: '矩阵奇异' };

  /* 更新电感电流历史：i(t) = i(t-dt) + (dt/L)·v_L(t) */
  net.elements.forEach((el) => {
    if (el.type !== 'L') return;
    const a = idxOf(nodeIdx, el.a);
    const b = idxOf(nodeIdx, el.b);
    const va = a >= 0 ? x[a] : 0;
    const vb = b >= 0 ? x[b] : 0;
    st.iInd.set(el.id, (st.iInd.get(el.id) || 0) + (dt / el.value) * (va - vb));
  });

  st.v = x;
  st.t += dt;
  return { ok: true, v: x, nodeIdx, t: st.t };
}

/* 跑一段瞬态，probeFn(res) 每步取关心的量 */
function transient(net, { dt = 1e-4, tEnd = 0.1, sourceFn = null, probe = null } = {}) {
  const st = createTransient(net, dt);
  const out = [];
  const nSteps = Math.max(1, Math.round(tEnd / dt));
  for (let i = 0; i < nSteps; i += 1) {
    const r = step(st, sourceFn);
    if (!r.ok) return { ok: false, reason: r.reason, samples: out };
    out.push({ t: st.t, v: r.v, value: probe ? probe(r.v, st.nodeIdx, st.t) : null });
  }
  return { ok: true, samples: out, nodeIdx: st.nodeIdx };
}

/* ---------- 交流扫频 ---------- */

function acAt(net, omega, srcId = null, srcMag = 1) {
  const { nodeIdx, total } = buildIndex(net);
  const Ar = zeros(total, total);
  const Ai = zeros(total, total);
  const zr = new Float64Array(total);
  const zi = new Float64Array(total);

  const stampY = (a, b, yr, yi) => {
    if (a >= 0) { Ar[a][a] += yr; Ai[a][a] += yi; }
    if (b >= 0) { Ar[b][b] += yr; Ai[b][b] += yi; }
    if (a >= 0 && b >= 0) {
      Ar[a][b] -= yr; Ai[a][b] -= yi;
      Ar[b][a] -= yr; Ai[b][a] -= yi;
    }
  };

  net.elements.forEach((el) => {
    const a = idxOf(nodeIdx, el.a);
    const b = idxOf(nodeIdx, el.b);
    switch (el.type) {
      case 'R':
        stampY(a, b, 1 / el.value, 0);
        break;
      case 'C':
        stampY(a, b, 0, omega * el.value);
        break;
      case 'L':
        /* Y = 1/(jωL) = -j/(ωL)，ω=0 时为短路（直流） */
        if (omega === 0) stampY(a, b, 1e12, 0);
        else stampY(a, b, 0, -1 / (omega * el.value));
        break;
      case 'V': {
        const k = el._row;
        const mag = srcId && el.id === srcId ? srcMag : (el.ac || 0);
        if (a >= 0) { Ar[a][k] += 1; }
        if (b >= 0) { Ar[b][k] -= 1; }
        if (a >= 0) { Ar[k][a] += 1; }
        if (b >= 0) { Ar[k][b] -= 1; }
        zr[k] = mag;
        break;
      }
      case 'VCVS': {
        const k = el._row;
        const cp = idxOf(nodeIdx, el.cp);
        const cn = idxOf(nodeIdx, el.cn);
        if (a >= 0) Ar[a][k] += 1;
        if (b >= 0) Ar[b][k] -= 1;
        if (a >= 0) Ar[k][a] += 1;
        if (b >= 0) Ar[k][b] -= 1;
        if (cp >= 0) Ar[k][cp] -= el.gain;
        if (cn >= 0) Ar[k][cn] += el.gain;
        break;
      }
      case 'opamp': {
        const k = el._row;
        const io = idxOf(nodeIdx, el.out);
        const ip = idxOf(nodeIdx, el.ip);
        const im = idxOf(nodeIdx, el.im);
        if (io >= 0) Ar[io][k] += 1;
        if (ip >= 0) Ar[k][ip] += 1;
        if (im >= 0) Ar[k][im] -= 1;
        break;
      }
      default:
        break;
    }
  });

  return solveComplex(Ar, Ai, zr, zi);
}

/* 扫频：返回 [{f, mag, phase, magDb}]，probe 指定输出/输入节点名 */
function acSweep(net, { fStart = 1, fStop = 1e6, points = 200, log = true, probeOut = null, probeIn = null, srcId = null } = {}) {
  const out = [];
  const { nodeIdx } = buildIndex(net);
  const iOut = probeOut !== null ? idxOf(nodeIdx, probeOut) : -1;
  const iIn = probeIn !== null ? idxOf(nodeIdx, probeIn) : -1;
  for (let i = 0; i < points; i += 1) {
    const t = points === 1 ? 0 : i / (points - 1);
    const f = log ? fStart * (fStop / fStart) ** t : fStart + (fStop - fStart) * t;
    const x = acAt(net, 2 * Math.PI * f, srcId);
    if (!x) {
      out.push({ f, mag: NaN, phase: NaN, magDb: NaN });
      continue;
    }
    const vo = iOut >= 0 ? { re: x.re[iOut], im: x.im[iOut] } : { re: 1, im: 0 };
    const vi = iIn >= 0 ? { re: x.re[iIn], im: x.im[iIn] } : { re: 1, im: 0 };
    /* 复数除法 H = Vo / Vi */
    const den = vi.re * vi.re + vi.im * vi.im || 1e-30;
    const hr = (vo.re * vi.re + vo.im * vi.im) / den;
    const hi = (vo.im * vi.re - vo.re * vi.im) / den;
    const mag = Math.hypot(hr, hi);
    out.push({
      f,
      mag,
      magDb: 20 * Math.log10(Math.max(mag, 1e-12)),
      phase: (Math.atan2(hi, hr) * 180) / Math.PI,
      vOut: vo,
      vIn: vi,
    });
  }
  return out;
}

/* ---------- 常用电路生成器（课程直接调用） ---------- */

/* RC 低通：用于阶跃响应与时间常数 */
function netRC(R, C, V) {
  return {
    nodes: ['0', 'in', 'out'],
    elements: [
      { type: 'R', id: 'R1', a: 'in', b: 'out', value: R },
      { type: 'C', id: 'C1', a: 'out', b: '0', value: C },
      { type: 'V', id: 'V1', a: 'in', b: '0', dc: V, ac: 1 },
    ],
  };
}

/* RLC 串联：阻尼振荡与品质因数 */
function netRLC(R, L, C, V) {
  return {
    nodes: ['0', 'in', 'mid', 'out'],
    elements: [
      { type: 'R', id: 'R1', a: 'in', b: 'mid', value: R },
      { type: 'L', id: 'L1', a: 'mid', b: 'out', value: L },
      { type: 'C', id: 'C1', a: 'out', b: '0', value: C },
      { type: 'V', id: 'V1', a: 'in', b: '0', dc: V, ac: 1 },
    ],
  };
}

/* 二极管半波整流 */
function netRectifier(R, C, V, f = 50) {
  return {
    nodes: ['0', 'in', 'out'],
    elements: [
      { type: 'V', id: 'V1', a: 'in', b: '0', dc: 0 },
      { type: 'D', id: 'D1', a: 'in', b: 'out' },
      { type: 'C', id: 'C1', a: 'out', b: '0', value: C },
      { type: 'R', id: 'R1', a: 'out', b: '0', value: R },
    ],
    _f: f,
    _amp: V,
  };
}

/* 反相放大器：虚短 + 负反馈，增益 = -Rf/Rin */
function netInvertingAmp(Rin, Rf, V) {
  return {
    nodes: ['0', 'in', 'n', 'out'],
    elements: [
      { type: 'V', id: 'V1', a: 'in', b: '0', dc: V, ac: 1 },
      { type: 'R', id: 'Rin', a: 'in', b: 'n', value: Rin },
      { type: 'R', id: 'Rf', a: 'n', b: 'out', value: Rf },
      { type: 'opamp', id: 'U1', ip: '0', im: 'n', out: 'out' },
    ],
  };
}

/* ---------- 解析参考解（与数值解对照，验证器与课程用） ---------- */

/* RC 阶跃解析解：v(t) = V(1 - e^{-t/RC}) */
const rcStepAnalytic = (t, R, C, V) => V * (1 - Math.exp(-t / (R * C)));

/* RLC 串联二阶：返回 { wn, zeta, type } */
function rlcParams(R, L, C) {
  const wn = 1 / Math.sqrt(L * C);
  const zeta = (R / 2) * Math.sqrt(C / L);
  let type = 'underdamped';
  if (zeta > 1) type = 'overdamped';
  else if (Math.abs(zeta - 1) < 1e-9) type = 'critical';
  return { wn, zeta, Q: 1 / (2 * zeta), type };
}

export {
  solve,
  solveComplex,
  buildIndex,
  diodeCurrent,
  diodeConductance,
  VT,
  dc,
  createTransient,
  step,
  transient,
  acAt,
  acSweep,
  netRC,
  netRLC,
  netRectifier,
  netInvertingAmp,
  rcStepAnalytic,
  rlcParams,
};
