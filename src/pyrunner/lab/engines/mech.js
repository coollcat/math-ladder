/* 机械引擎 —— 静力学、材料力学、机构运动学。纯函数，SI 单位。
   服务章节：74 机械工程；75 机电复用电机轴系与振动部分。
   单位约定：长度 m，力 N，力矩 N·m，应力 Pa（输出时课程自行换算 MPa），角度 rad。 */

/* 复化梯形累积积分：out[i] = ∫₀^{xᵢ} f ds，out[0] = 0 */
function cumTrapz(f, dx) {
  const out = new Float64Array(f.length);
  for (let i = 1; i < f.length; i += 1) out[i] = out[i - 1] + ((f[i] + f[i - 1]) * dx) / 2;
  return out;
}

/* ---------- 通用：三对角方程组（Thomas 算法） ---------- */

function tridiag(a, b, c, d) {
  const n = d.length;
  const cp = new Float64Array(n);
  const dp = new Float64Array(n);
  cp[0] = c[0] / b[0];
  dp[0] = d[0] / b[0];
  for (let i = 1; i < n; i += 1) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = c[i] / m;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Float64Array(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i -= 1) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

/* ---------- 截面性质 ---------- */

const sectionRect = (b, h) => ({
  A: b * h,
  I: (b * h ** 3) / 12,        // 绕水平中性轴
  Iy: (h * b ** 3) / 12,
  c: h / 2,
  J: 0.229 * b * h ** 3 * (h >= b ? 1 : (b / h) ), // 近似扭转常数（矩形，h≥b）
});

const sectionCircle = (d) => ({
  A: (Math.PI * d ** 2) / 4,
  I: (Math.PI * d ** 4) / 64,
  c: d / 2,
  J: (Math.PI * d ** 4) / 32,
});

const sectionTube = (do_, di) => ({
  A: (Math.PI * (do_ ** 2 - di ** 2)) / 4,
  I: (Math.PI * (do_ ** 4 - di ** 4)) / 64,
  c: do_ / 2,
  J: (Math.PI * (do_ ** 4 - di ** 4)) / 32,
});

/* ---------- 应力 ---------- */

const axialStress = (F, A) => F / A;
const bendingStress = (M, y, I) => (M * y) / I;
const torsionShear = (T, r, J) => (T * r) / J;
const shearStressAvg = (V, A) => V / A;

/* 冯·米塞斯等效应力：平面应力 (σx, σy, τxy) */
function vonMises(sx, sy, txy) {
  return Math.sqrt(sx * sx - sx * sy + sy * sy + 3 * txy * txy);
}

/* 莫尔圆：给 σx, σy, τxy 返回主应力与最大剪应力 */
function mohrCircle(sx, sy, txy) {
  const avg = (sx + sy) / 2;
  const R = Math.hypot((sx - sy) / 2, txy);
  return {
    center: avg,
    radius: R,
    s1: avg + R,
    s2: avg - R,
    tauMax: R,
    thetaP: 0.5 * Math.atan2(2 * txy, sx - sy),
  };
}

/* ---------- 梁：剪力图、弯矩图、挠度 ----------
   loads: [{ type:'point', P, x } | { type:'udl', w, x0, x1 }]
   support: 'simply' | 'cantilever'                             */

function beamAnalysis({ L, EI, loads = [], support = 'simply', n = 200 }) {
  const dx = L / (n - 1);
  const x = new Float64Array(n);
  const V = new Float64Array(n);
  const M = new Float64Array(n);
  for (let i = 0; i < n; i += 1) x[i] = i * dx;

  /* 支座反力：先把分布载荷折算成集中力 */
  const equiv = loads.map((l) => {
    if (l.type === 'point') return { P: l.P, x: l.x };
    const P = l.w * (l.x1 - l.x0);
    return { P, x: (l.x0 + l.x1) / 2 };
  });
  const total = equiv.reduce((s, e) => s + e.P, 0);
  const momentAbout0 = equiv.reduce((s, e) => s + e.P * e.x, 0);

  let R0 = 0;
  let RL = 0;
  if (support === 'simply') {
    /* ΣM(0)=0 → RL·L = ΣP·x ; ΣF=0 → R0 + RL = ΣP */
    RL = momentAbout0 / L;
    R0 = total - RL;
  } else {
    R0 = total; // 悬臂：固定端承担全部竖向力
  }

  /* 截面法：V(x) = R0 − 左侧载荷之和；M(x) 由「左侧所有力对截面取矩」得到。
     简支：M = R0·x − Σ P(x−xᵢ)（下挠为正，跨中为正弯矩）
     悬臂：固定端在 x=0，只有截面右侧的载荷产生弯矩，M = −Σ P(xᵢ−x)（负弯矩） */
  for (let i = 0; i < n; i += 1) {
    const xi = x[i];
    let v = R0;
    let m = support === 'cantilever' ? 0 : R0 * xi;
    loads.forEach((l) => {
      if (l.type === 'point') {
        if (support === 'cantilever') {
          if (l.x > xi) m -= l.P * (l.x - xi);
          if (l.x <= xi) v -= l.P;
        } else {
          if (l.x <= xi) {
            v -= l.P;
            m -= l.P * (xi - l.x);
          }
        }
      } else if (l.type === 'udl') {
        if (support === 'cantilever') {
          const xs = Math.max(l.x0, xi);
          const len = Math.max(0, l.x1 - xs);
          if (len > 0) m -= l.w * len * ((xs + l.x1) / 2 - xi);
          if (l.x1 <= xi) v -= l.w * (l.x1 - l.x0);
          else if (l.x0 <= xi) v -= l.w * (xi - l.x0);
        } else {
          const xe = Math.min(l.x1, xi);
          const len = Math.max(0, xe - l.x0);
          v -= l.w * len;
          m -= l.w * len * (xi - l.x0 - len / 2);
        }
      }
    });
    V[i] = v;
    M[i] = m;
  }

  /* 挠度：对曲率 M/EI 做两次累积积分（复化梯形），再由边界条件定常数。
     y(x) = y(0) + θ(0)·x + ∫∫(M/EI)
     悬臂：y(0)=0, θ(0)=0 → y 就是二重积分
     简支：y(0)=y(L)=0 → θ(0) = −yRel(L)/L */
  const q = new Float64Array(n);
  for (let i = 0; i < n; i += 1) q[i] = M[i] / EI;
  const theta = cumTrapz(q, dx);
  const yRel = cumTrapz(theta, dx);
  const y = new Float64Array(n);
  if (support === 'cantilever') {
    for (let i = 0; i < n; i += 1) y[i] = yRel[i];
  } else {
    const theta0 = -yRel[n - 1] / L;
    for (let i = 0; i < n; i += 1) y[i] = yRel[i] + theta0 * x[i];
  }

  let maxDefl = 0;
  let maxAt = 0;
  for (let i = 0; i < n; i += 1) {
    if (Math.abs(y[i]) > Math.abs(maxDefl)) {
      maxDefl = y[i];
      maxAt = x[i];
    }
  }

  return {
    x: Array.from(x),
    V: Array.from(V),
    M: Array.from(M),
    y: Array.from(y),
    reactions: { R0, RL },
    maxDeflection: maxDefl,
    maxDeflectionAt: maxAt,
    maxMoment: Math.max(...Array.from(M).map(Math.abs)),
  };
}

/* 简支梁中点集中载荷的解析挠度，用于与数值解对照 */
const simplySupportedMidDeflection = (P, L, EI) => (P * L ** 3) / (48 * EI);
const cantileverTipDeflection = (P, L, EI) => (P * L ** 3) / (3 * EI);

/* ---------- 压杆稳定 ---------- */

/* 欧拉临界载荷。K 为有效长度系数：两端铰 1.0 / 一端固定一端自由 2.0 /
   两端固定 0.5 / 一端固定一端铰 0.7 */
function eulerPcr(E, I, L, K = 1) {
  return (Math.PI ** 2 * E * I) / (K * L) ** 2;
}

/* 长细比与临界应力（判断是否适用欧拉公式） */
function columnCheck(E, sigmaY, I, A, L, K = 1) {
  const r = Math.sqrt(I / A);
  const lambda = (K * L) / r;
  const sigmaCr = (Math.PI ** 2 * E) / lambda ** 2;
  /* 欧拉公式只在临界应力低于比例极限（近似取屈服强度）时成立 */
  const lambdaP = Math.PI * Math.sqrt(E / sigmaY);
  return {
    r,
    slenderness: lambda,
    sigmaCr,
    Pcr: sigmaCr * A,
    eulerValid: lambda >= lambdaP,
    transitionSlenderness: lambdaP,
  };
}

/* ---------- 平面机构：四连杆 ---------- */

/* 圆-圆交点：返回两个解（或 null 表示无解，即机构卡死） */
function circleCircle(p0, r0, p1, r1) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return null;
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = r0 * r0 - a * a;
  const h = Math.sqrt(Math.max(0, h2));
  const xm = p0.x + (a * dx) / d;
  const ym = p0.y + (a * dy) / d;
  return [
    { x: xm + (h * dy) / d, y: ym - (h * dx) / d },
    { x: xm - (h * dy) / d, y: ym + (h * dx) / d },
  ];
}

/* 四连杆位置解：机架 d（A→D 沿 +x），输入杆 a（A→B，角 theta），连杆 b，输出杆 c（D→C）。
   branch=+1/-1 选装配分支（开式/交叉式）。 */
function fourBar({ a, b, c, d, theta, branch = 1 }) {
  const A = { x: 0, y: 0 };
  const D = { x: d, y: 0 };
  const B = { x: a * Math.cos(theta), y: a * Math.sin(theta) };
  const sol = circleCircle(B, b, D, c);
  if (!sol) return { ok: false, reason: '此位置无解：连杆长度不满足装配条件' };
  /* 取与上一分支一致的解：用 branch 决定取哪个交点 */
  const C = branch >= 0 ? sol[0] : sol[1];
  return {
    ok: true,
    A, B, C, D,
    theta3: Math.atan2(C.y - B.y, C.x - B.x),
    theta4: Math.atan2(C.y - D.y, C.x - D.x),
    transmissionAngle: (() => {
      /* 传动角：连杆与输出杆的夹角，越接近 90° 传力越好 */
      const v1 = { x: C.x - B.x, y: C.y - B.y };
      const v2 = { x: C.x - D.x, y: C.y - D.y };
      const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
      return Math.acos(Math.max(-1, Math.min(1, cos)));
    })(),
  };
}

/* 速度分析：已知输入角速度 ω2，解连杆与输出杆角速度。
   v_C = v_B + ω3 × r_CB = ω4 × r_CD → 2 方程 2 未知 */
function fourBarVelocity(pos, omega2) {
  const { B, C, D } = pos;
  const vB = { x: -omega2 * B.y, y: omega2 * B.x };
  const rCB = { x: C.x - B.x, y: C.y - B.y };
  const rCD = { x: C.x - D.x, y: C.y - D.y };
  /* [ -rCB.y  rCD.y ] [ω3]   [ vB.x ]
     [  rCB.x -rCD.x ] [ω4] = [ vB.y ] （移项后求解） */
  const a11 = -rCB.y; const a12 = rCD.y;
  const a21 = rCB.x; const a22 = -rCD.x;
  const det = a11 * a22 - a12 * a21;
  if (Math.abs(det) < 1e-12) return { ok: false, reason: '速度奇异（机构处于死点）' };
  const w3 = (vB.x * a22 - a12 * vB.y) / det;
  const w4 = (a11 * vB.y - vB.x * a21) / det;
  return { ok: true, omega3: w3, omega4: w4, vB };
}

/* 曲柄存在条件（Grashof）：最短杆 + 最长杆 ≤ 其余两杆之和时存在整周回转曲柄 */
function grashof(a, b, c, d) {
  const arr = [a, b, c, d].slice().sort((x, y) => x - y);
  const s = arr[0];
  const l = arr[3];
  const p = arr[1];
  const q = arr[2];
  const sum = s + l;
  const other = p + q;
  return {
    satisfied: sum <= other,
    margin: other - sum,
    type: sum > other ? '双摇杆（无整周回转杆）'
      : s === a ? '曲柄摇杆'
        : s === d ? '双曲柄' : '摇杆曲柄',
  };
}

/* ---------- 齿轮与传动 ---------- */

/* 定轴轮系：teeth 为各齿轮齿数，返回各级传动比与总传动比（惰轮只改向不改比） */
function gearTrain(teeth, inputRpm = 100) {
  const stages = [];
  let rpm = inputRpm;
  let sign = 1;
  for (let i = 0; i < teeth.length - 1; i += 1) {
    const ratio = teeth[i + 1] / teeth[i];
    rpm /= ratio;
    sign = -sign;
    stages.push({ from: i, to: i + 1, ratio, rpmOut: rpm, direction: sign > 0 ? '同向' : '反向' });
  }
  return {
    stages,
    totalRatio: teeth[teeth.length - 1] / teeth[0] * (teeth.length > 2 ? 1 : 1),
    outputRpm: rpm,
    direction: sign > 0 ? '同向' : '反向',
  };
}

/* 行星轮系（简单单排行星）：太阳轮 Zs、齿圈 Zr、行星架 C */
function planetary(Zs, Zr, inputRpm = 100, fixed = 'ring') {
  const k = Zr / Zs;
  let out;
  if (fixed === 'ring') out = inputRpm / (1 + k);          // 齿圈固定，架输出
  else if (fixed === 'sun') out = inputRpm / (1 + 1 / k);  // 太阳固定
  else out = inputRpm;                                     // 架固定：齿圈反向
  return { k, outputRpm: out, ratio: inputRpm / (out || 1e-12) };
}

/* ---------- 振动与隔振 ---------- */

/* 单自由度受迫振动的位移传递率（基础激励） */
function transmissibility(r, zeta) {
  const num = Math.sqrt(1 + (2 * zeta * r) ** 2);
  const den = Math.hypot(1 - r * r, 2 * zeta * r);
  return num / Math.max(den, 1e-12);
}

const naturalFreq = (k, m) => Math.sqrt(k / m) / (2 * Math.PI);
const criticalDamping = (k, m) => 2 * Math.sqrt(k * m);

/* ---------- 疲劳 ---------- */

/* Basquin 关系：S = Sf · N^b（双对数坐标上是一条直线） */
const basquinS = (N, Sf, b) => Sf * N ** b;
const basquinN = (S, Sf, b) => (S / Sf) ** (1 / b);

/* Goodman 修正：给定平均应力 σm、应力幅 σa，判断是否安全 */
function goodman(sa, sm, Se, Sut) {
  const lhs = sa / Se + sm / Sut;
  return { ratio: lhs, safe: lhs <= 1, margin: 1 - lhs };
}

/* Miner 线性累积损伤：cycles 为各应力水平下的循环数 */
function minerDamage(levels) {
  return levels.reduce((s, l) => s + l.n / basquinN(l.S, l.Sf, l.b), 0);
}

/* ---------- 公差 ---------- */

/* 尺寸链：worst 为极值法，rss 为统计法（假设各环独立正态） */
function toleranceStack(tols, method = 'worst') {
  if (method === 'rss') {
    const sum = Math.sqrt(tols.reduce((s, t) => s + t * t, 0));
    return { total: sum, method };
  }
  return { total: tols.reduce((s, t) => s + Math.abs(t), 0), method };
}

/* ---------- 桁架（平面，节点法） ----------
   nodes: [{id, x, y}]  members: [{id, a, b}]
   supports: [{node, type:'pin'|'roller-x'|'roller-y'}]
   loads: [{node, fx, fy}]                                  */

/* 节点法：未知量 = 杆力（拉为正）+ 支座反力，每个节点列 ΣFx=0 与 ΣFy=0。
   静定条件 m + r = 2j：不满足时明确回报「机构」或「超静定」，
   而不是像早期版本那样用 1e12 惩罚项去顶替反力——那会把平衡方程本身冲掉。 */
function solveTruss(nodes, members, supports, loads) {
  const idx = new Map();
  nodes.forEach((nd, i) => idx.set(nd.id, i));
  const nJ = nodes.length;
  const nM = members.length;

  /* 支座反力：pin 两个方向，roller-x 只水平，roller-y 只竖直 */
  const react = [];
  supports.forEach((sp) => {
    const i = idx.get(sp.node);
    if (i === undefined) return;
    if (sp.type === 'pin') react.push({ node: i, dir: 0 }, { node: i, dir: 1 });
    else if (sp.type === 'roller-x') react.push({ node: i, dir: 0 });
    else if (sp.type === 'roller-y') react.push({ node: i, dir: 1 });
  });

  const nU = nM + react.length;
  const nE = nJ * 2;
  if (nU !== nE) {
    return {
      ok: false,
      unknowns: nU,
      equations: nE,
      reason: nU < nE
        ? `结构可变（机构）：未知量 ${nU} < 平衡方程 ${nE}，缺少约束或杆件`
        : `超静定 ${nU - nE} 次：未知量 ${nU} > 平衡方程 ${nE}，静力平衡不够，需位移法`,
    };
  }

  const A = [];
  for (let i = 0; i < nE; i += 1) A.push(new Float64Array(nU));
  const z = new Float64Array(nE);

  members.forEach((m, k) => {
    const i = idx.get(m.a);
    const j = idx.get(m.b);
    if (i === undefined || j === undefined) return;
    const dx = nodes[j].x - nodes[i].x;
    const dy = nodes[j].y - nodes[i].y;
    const L = Math.hypot(dx, dy) || 1e-12;
    const cx = dx / L;
    const cy = dy / L;
    /* 杆力 N 拉为正：在 i 端沿 i→j 拉，在 j 端沿 j→i 拉 */
    A[i * 2][k] += cx;
    A[i * 2 + 1][k] += cy;
    A[j * 2][k] -= cx;
    A[j * 2 + 1][k] -= cy;
  });

  react.forEach((r, k) => {
    A[r.node * 2 + r.dir][nM + k] += 1;
  });

  /* ΣF = 0 → 内力 + 反力 = −外载 */
  loads.forEach((ld) => {
    const i = idx.get(ld.node);
    if (i === undefined) return;
    z[i * 2] -= ld.fx || 0;
    z[i * 2 + 1] -= ld.fy || 0;
  });

  const x = trussSolve(A, z);
  if (!x) return { ok: false, reason: '平衡方程组奇异：支座布置退化（如全部共线）' };

  const forces = {};
  const kinds = {};
  members.forEach((m, k) => {
    forces[m.id] = x[k];
    kinds[m.id] = x[k] >= 0 ? 'tension' : 'compression';
  });
  const reactions = {};
  react.forEach((r, k) => {
    const id = nodes[r.node].id;
    if (!reactions[id]) reactions[id] = { fx: 0, fy: 0 };
    if (r.dir === 0) reactions[id].fx += x[nM + k];
    else reactions[id].fy += x[nM + k];
  });
  return { ok: true, forces, kinds, reactions, determinate: true };
}

/* 内部高斯消元（避免与 circuit.js 的 solve 循环依赖） */
function trussSolve(A, z) {
  const n = z.length;
  const M = A.map((r) => Float64Array.from(r));
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    if (piv !== col) {
      const t = M[piv]; M[piv] = M[col]; M[col] = t;
      const s = z[piv]; z[piv] = z[col]; z[col] = s;
    }
    const d = M[col][col];
    for (let r = col + 1; r < n; r += 1) {
      const f = M[r][col] / d;
      if (!f) continue;
      for (let c = col; c < n; c += 1) M[r][c] -= f * M[col][c];
      z[r] -= f * z[col];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = z[r];
    for (let c = r + 1; c < n; c += 1) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}

/* 给构件的 _u 编号（未知量列索引） */
function indexMembers(members, nodes) {
  let u = nodes.length * 2;
  members.forEach((m) => { m._u = u; u += 1; });
  return u;
}

export {
  tridiag,
  sectionRect,
  sectionCircle,
  sectionTube,
  axialStress,
  bendingStress,
  torsionShear,
  shearStressAvg,
  vonMises,
  mohrCircle,
  beamAnalysis,
  simplySupportedMidDeflection,
  cantileverTipDeflection,
  eulerPcr,
  columnCheck,
  circleCircle,
  fourBar,
  fourBarVelocity,
  grashof,
  gearTrain,
  planetary,
  transmissibility,
  naturalFreq,
  criticalDamping,
  basquinS,
  basquinN,
  goodman,
  minerDamage,
  toleranceStack,
  solveTruss,
  indexMembers,
};
