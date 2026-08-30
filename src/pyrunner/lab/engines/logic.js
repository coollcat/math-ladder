/* 数字逻辑引擎 —— 门级仿真 + 时序分析 + 组合电路构造。
   服务章节：72 数字系统与计算机组成；73 复用于缓存/页表演示。
   信号值：0 / 1 / -1（未定态 X）。 */

const X = -1;

/* ---------- 门级求值 ---------- */

const GATES = {
  and: (a) => (a.includes(0) ? 0 : a.includes(X) ? X : 1),
  nand: (a) => (a.includes(0) ? 1 : a.includes(X) ? X : 0),
  or: (a) => (a.includes(1) ? 1 : a.includes(X) ? X : 0),
  nor: (a) => (a.includes(1) ? 0 : a.includes(X) ? X : 1),
  not: (a) => (a[0] === X ? X : a[0] ^ 1),
  buf: (a) => a[0],
  xor: (a) => {
    if (a.includes(X)) return X;
    return a.reduce((s, v) => s ^ v, 0);
  },
  xnor: (a) => {
    if (a.includes(X)) return X;
    return a.reduce((s, v) => s ^ v, 0) ^ 1;
  },
};

const GATE_INPUTS = { not: 1, buf: 1 };

/* 真值表：给 n 输入门列出全部组合 */
function truthTable(type, n) {
  const rows = [];
  for (let m = 0; m < 2 ** n; m += 1) {
    const inputs = [];
    for (let i = n - 1; i >= 0; i -= 1) inputs.push((m >> i) & 1);
    rows.push({ inputs, out: GATES[type](inputs) });
  }
  return rows;
}

/* ---------- 组合网络求值 ----------
   net: { inputs:[name], outputs:[name], gates:[{id,type,in:[sig],out:sig}] }
   迭代到稳定为止（组合环会震荡，故设上限；时序电路靠 DFF 打断环）。 */

function evalCombinational(net, values, maxIter = 200) {
  let changed = true;
  let iter = 0;
  while (changed && iter < maxIter) {
    changed = false;
    iter += 1;
    net.gates.forEach((g) => {
      if (g.type === 'dff' || g.type === 'latch') return;
      const fn = GATES[g.type];
      if (!fn) return;
      const args = g.in.map((s) => values[s] === undefined ? X : values[s]);
      const out = fn(args);
      if (values[g.out] !== out) {
        values[g.out] = out;
        changed = true;
      }
    });
  }
  return { stable: iter < maxIter, iterations: iter };
}

/* ---------- 时序仿真 ---------- */

/* 上升沿 D 触发器：clk 从 0→1 时把 D 采到 Q */
function createSim(net, opts = {}) {
  const values = Object.assign({}, opts.initial || {});
  (net.inputs || []).forEach((n) => {
    if (values[n] === undefined) values[n] = 0;
  });
  let prevClk = 0;
  let cycle = 0;

  const ffs = net.gates.filter((g) => g.type === 'dff');
  ffs.forEach((g) => {
    if (values[g.out] === undefined) values[g.out] = g.reset !== undefined ? g.reset : 0;
    if (g.qn && values[g.qn] === undefined) values[g.qn] = values[g.out] ^ 1;
  });

  function settle() {
    return evalCombinational(net, values);
  }

  /* 推进一个时钟周期：clk=0 → 置输入 → clk=1 采样 → 稳定 */
  function tick(inputs = {}, clkEdge = 'rise') {
    Object.keys(inputs).forEach((k) => { values[k] = inputs[k]; });
    values.clk = 0;
    settle();
    values.clk = 1;
    settle();
    /* 边沿采样：所有 DFF 必须「先同时读 D，再统一写 Q」。
       若在同一个循环里边读边写，后级会读到前级刚更新的新值，
       整条移位链会在一个周期内穿透（典型竞争错误）。 */
    const sampled = ffs.map((g) => {
      const d = values[g.in[0]];
      return d === undefined ? X : d;
    });
    ffs.forEach((g, i) => {
      values[g.out] = sampled[i];
      if (g.qn) values[g.qn] = sampled[i] ^ 1;
    });
    settle();
    cycle += 1;
    prevClk = 1;
    void clkEdge;
    return snapshot();
  }

  function snapshot() {
    const s = { cycle };
    (net.inputs || []).forEach((n) => { s[n] = values[n]; });
    (net.outputs || []).forEach((n) => { s[n] = values[n]; });
    net.gates.filter((g) => g.type === 'dff').forEach((g) => { s[g.out] = values[g.out]; });
    return s;
  }

  return {
    values,
    tick,
    settle,
    snapshot,
    get cycle() { return cycle; },
    set(sig, v) { values[sig] = v; return settle(); },
    get(sig) { return values[sig]; },
    _prevClk: () => prevClk,
  };
}

/* 跑 n 个周期，inputFn(cycle) 返回本周期输入；返回波形数组 */
function run(net, cycles, inputFn, opts = {}) {
  const sim = createSim(net, opts);
  const wave = [sim.snapshot()];
  for (let c = 0; c < cycles; c += 1) {
    wave.push(sim.tick(inputFn ? inputFn(c) : {}, opts.clkEdge));
  }
  return wave;
}

/* ---------- 组合电路构造 ---------- */

/* 纹波进位加法器：返回门网表。
   位序与 toBits/bitsToInt 一致：索引 0 是最高位（MSB），索引 bits-1 是最低位，
   进位从最低位向最高位传播。 */
function rippleAdder(bits = 4) {
  const gates = [];
  const inputs = [];
  const outputs = [];
  let carry = null;
  for (let k = 0; k < bits; k += 1) {
    const i = bits - 1 - k; // 从最低位往最高位走
    const a = 'a' + i;
    const b = 'b' + i;
    const s = 's' + i;
    inputs.push(a, b);
    outputs.push(s);
    if (k === 0) {
      /* 最低位无低位进位，半加器即可 */
      gates.push({ id: 'ha_x' + i, type: 'xor', in: [a, b], out: 'x' + i });
      gates.push({ id: 'ha_s' + i, type: 'buf', in: ['x' + i], out: s });
      gates.push({ id: 'ha_c' + i, type: 'and', in: [a, b], out: 'c' + i });
      carry = 'c' + i;
    } else {
      gates.push({ id: 'fa_x' + i, type: 'xor', in: [a, b], out: 'x' + i });
      gates.push({ id: 'fa_s' + i, type: 'xor', in: ['x' + i, carry], out: s });
      gates.push({ id: 'fa_m1_' + i, type: 'and', in: [a, b], out: 'm1_' + i });
      gates.push({ id: 'fa_m2_' + i, type: 'and', in: ['x' + i, carry], out: 'm2_' + i });
      gates.push({ id: 'fa_c' + i, type: 'or', in: ['m1_' + i, 'm2_' + i], out: 'c' + i });
      carry = 'c' + i;
    }
  }
  outputs.push('cout');
  /* 最高位产生的进位就是整个加法器的进位输出 */
  gates.push({ id: 'cout_buf', type: 'buf', in: [carry], out: 'cout' });
  return { inputs, outputs, gates };
}

/* 4 位 ALU：op 由 3 位选择（000 and / 001 or / 010 add / 011 sub / 100 xor / 101 not A / 110 shl / 111 cmp） */
function alu4(a, b, op) {
  const r = new Array(4).fill(0);
  let carry = 0;
  let zero = 1;
  switch (op) {
    case 0: // AND
      for (let i = 0; i < 4; i += 1) r[i] = a[i] & b[i];
      break;
    case 1: // OR
      for (let i = 0; i < 4; i += 1) r[i] = a[i] | b[i];
      break;
    case 2: // ADD
      for (let i = 3; i >= 0; i -= 1) {
        const s = a[i] + b[i] + carry;
        r[i] = s & 1;
        carry = s > 1 ? 1 : 0;
      }
      break;
    case 3: { // SUB: a + (~b) + 1
      const nb = b.map((v) => v ^ 1);
      let c = 1;
      for (let i = 3; i >= 0; i -= 1) {
        const s = a[i] + nb[i] + c;
        r[i] = s & 1;
        c = s > 1 ? 1 : 0;
      }
      carry = c;
      break;
    }
    case 4:
      for (let i = 0; i < 4; i += 1) r[i] = a[i] ^ b[i];
      break;
    case 5:
      for (let i = 0; i < 4; i += 1) r[i] = a[i] ^ 1;
      break;
    case 6: // 逻辑左移
      for (let i = 0; i < 3; i += 1) r[i] = a[i + 1];
      r[3] = 0;
      carry = a[0];
      break;
    case 7: { // 比较：a - b
      const nb = b.map((v) => v ^ 1);
      let c = 1;
      for (let i = 3; i >= 0; i -= 1) {
        const s = a[i] + nb[i] + c;
        r[i] = s & 1;
        c = s > 1 ? 1 : 0;
      }
      carry = c;
      break;
    }
    default:
      break;
  }
  for (let i = 0; i < 4; i += 1) if (r[i]) zero = 0;
  return { out: r, carry, zero };
}

/* ---------- 数制 ---------- */

const toBits = (n, bits) => {
  const out = new Array(bits).fill(0);
  for (let i = bits - 1; i >= 0; i -= 1) {
    out[i] = n & 1;
    n >>= 1;
  }
  return out;
};

const bitsToInt = (a) => a.reduce((s, v, i) => s + v * 2 ** (a.length - 1 - i), 0);

/* 补码：把有符号整数装进 bits 位，返回 { bits, value, sign } */
function twosComplement(n, bits = 8) {
  const mod = 2 ** bits;
  const v = ((n % mod) + mod) % mod;
  const b = toBits(v, bits);
  return { bits: b, value: v, signed: b[0] ? v - mod : v, sign: b[0] };
}

/* ---------- 布尔化简辅助 ---------- */

/* 二进制权重：给定最小项列表，返回卡诺图格子（格雷码序） */
const GRAY = (n) => n ^ (n >> 1);

function kmapGrid(nVars, minterms) {
  const rows = nVars <= 2 ? 1 : 2 ** Math.ceil(nVars / 2);
  const cols = nVars <= 2 ? 2 ** nVars : 2 ** Math.floor(nVars / 2);
  const set = new Set(minterms);
  const grid = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      /* 行列索引都用格雷码，保证相邻格只差一位 */
      const idx = (GRAY(r) << Math.floor(nVars / 2)) | GRAY(c);
      row.push({ r, c, idx, value: set.has(idx) ? 1 : 0 });
    }
    grid.push(row);
  }
  return { grid, rows, cols };
}

/* 找出所有大小为 2^k 的合法矩形合并块（1/2/4/8…），返回可合并组 */
function kmapGroups(nVars, minterms) {
  const { rows, cols } = kmapGrid(nVars, minterms);
  const set = new Set(minterms);
  const groups = [];
  const sizes = [1, 2, 4, 8, 16];
  const heights = [1, 2, 4];
  const widths = [1, 2, 4];
  heights.forEach((hh) => {
    widths.forEach((ww) => {
      if (hh * ww > 16 || !sizes.includes(hh * ww)) return;
      for (let r = 0; r + hh <= rows; r += 1) {
        for (let c = 0; c + ww <= cols; c += 1) {
          const cells = [];
          let all = true;
          for (let dr = 0; dr < hh; dr += 1) {
            for (let dc = 0; dc < ww; dc += 1) {
              const rr = (r + dr) % rows;
              const cc = (c + dc) % cols;
              const idx = (GRAY(rr) << Math.floor(nVars / 2)) | GRAY(cc);
              if (!set.has(idx)) { all = false; break; }
              cells.push(idx);
            }
            if (!all) break;
          }
          if (all && cells.length) groups.push({ h: hh, w: ww, cells });
        }
      }
    });
  });
  return groups;
}

/* ---------- 缓存（73 章复用） ---------- */

/* 直接映射缓存：返回命中/冲突/容量三类失效的统计 */
function cacheSim({ accesses = [], capacity = 4, blockSize = 1, assoc = 1, policy = 'lru' } = {}) {
  const sets = Math.max(1, Math.floor(capacity / (blockSize * assoc)));
  const store = Array.from({ length: sets }, () => []);
  const log = [];
  let hits = 0;
  let coldMiss = 0;
  let conflictMiss = 0;
  let capacityMiss = 0;
  const touched = new Array(sets).fill(0);

  accesses.forEach((addr, i) => {
    const block = Math.floor(addr / blockSize);
    const setIdx = block % sets;
    const tag = Math.floor(block / sets);
    const set = store[setIdx];
    const hit = set.find((e) => e.tag === tag);
    if (hit) {
      hits += 1;
      hit.stamp = i;
      log.push({ i, addr, set: setIdx, tag, result: 'hit' });
      return;
    }
    let kind = 'cold';
    if (set.length >= assoc) {
      /* 区分冲突失效与容量失效：若其他组还有空位则是冲突，否则容量 */
      const hasRoom = store.some((s, si) => si !== setIdx && s.length < assoc);
      kind = hasRoom ? 'conflict' : 'capacity';
      if (kind === 'conflict') conflictMiss += 1;
      else capacityMiss += 1;
      if (policy === 'lru') {
        let oldest = 0;
        set.forEach((e, j) => { if (e.stamp < set[oldest].stamp) oldest = j; });
        set.splice(oldest, 1);
      } else {
        set.shift();
      }
    } else {
      coldMiss += 1;
    }
    set.push({ tag, stamp: i });
    touched[setIdx] += 1;
    log.push({ i, addr, set: setIdx, tag, result: kind });
  });

  const total = accesses.length;
  return {
    log,
    hits,
    misses: total - hits,
    hitRate: total ? hits / total : 0,
    coldMiss,
    conflictMiss,
    capacityMiss,
    sets,
    store,
  };
}

export {
  X,
  GATES,
  truthTable,
  evalCombinational,
  createSim,
  run,
  rippleAdder,
  alu4,
  toBits,
  bitsToInt,
  twosComplement,
  kmapGrid,
  kmapGroups,
  GRAY,
  cacheSim,
};
