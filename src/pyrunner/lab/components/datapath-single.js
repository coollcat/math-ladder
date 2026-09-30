/* =========================================================================
 * lab 组件：datapath-single（单周期数据通路）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "datapath-single", "title": "一条 add 指令是怎么走过数据通路的" }
 *   ```
 *
 * 可选字段（都有默认值，最小 spec 只写 type + title 就能跑）：
 *   program   16 条以内的指令表，默认五条（add → sw → lw → sub → beq 构成的死循环）。
 *             每条写成 { "op": "add", "rs": 1, "rt": 2, "val": 3 }：
 *               op ∈ add | sub | and | or | lw | sw | beq
 *               R 型（add/sub/and/or）val 取低 3 位当目的寄存器 rd
 *               访存型（lw/sw）      val 是地址偏移，0..15
 *               beq                 val ≥ 8 表示负数（val − 16），即 −8..+7
 *   regs      8 个寄存器初值（0..15），默认 [0,3,5,0,0,0,0,0]
 *   mem       16 个内存字初值（0..15），默认全 0
 *   height    画布高度，默认 370
 *
 * 能玩什么：
 *   · 「单步」推进一拍，「连跑」自动推进：取指 → 译码 → 执行 → 访存 → 写回，
 *     五拍循环；每一拍高亮当拍用到的部件与总线，小圆点沿总线流动表示数据在走。
 *   · 拖底部五段节拍条：直接拖到任意一拍，来回滚着看。
 *   · 上下拖寄存器格（$0..$7）/ 内存格（0..15）：改数值，松手即生效。
 *   · 分段按钮换操作码 + 滑块改 rs / rt / rd·imm：改的是 IM[pc]，等于现场改程序；
 *     单周期跑到底会自动把 pc 推进到 nextPC，beq 命中时能看到它跳回去。
 *
 * 取舍：教学用 4 位字长（直接复用 logic.js 的 alu4），8 个寄存器、16 字内存、
 * 16 位指令（op4 / rs3 / rt3 / val6）。字长窄是故意的——所有数值都能一眼看全、
 * 手算核对；换成 32 位会挤成一团，反而看不清数据在怎么流。原理图的部件与
 * 连线和真实的 MIPS 单周期数据通路一一对应，只是窄了。
 * ========================================================================= */

import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildToolbar,
  buildReadout, bindPointer, mkBtn, label, clamp,
  clearBg,
} from '../core.js';
import { alu4, toBits, bitsToInt } from '../engines/logic.js';

const MASK = 15;
const NREG = 8;
const NMEM = 16;
const NIM = 16;
const BEATSEC = 0.55;

const OPS = {
  add: { code: 0, alu: 2, kind: 'r', sym: '+' },
  sub: { code: 1, alu: 3, kind: 'r', sym: '−' },
  and: { code: 2, alu: 0, kind: 'r', sym: '&' },
  or: { code: 3, alu: 1, kind: 'r', sym: '|' },
  lw: { code: 4, alu: 2, kind: 'mem', sym: '+' },
  sw: { code: 5, alu: 2, kind: 'mem', sym: '+' },
  beq: { code: 6, alu: 3, kind: 'br', sym: '−' },
};
const OPKEYS = Object.keys(OPS);

/* 默认程序：算出 3+5=8，存进内存再取回来，减一下，然后 beq 跳回开头 */
const DEFAULT_PROGRAM = [
  { op: 'add', rs: 1, rt: 2, val: 3 },
  { op: 'sw', rs: 0, rt: 3, val: 4 },
  { op: 'lw', rs: 0, rt: 4, val: 4 },
  { op: 'sub', rs: 4, rt: 1, val: 5 },
  { op: 'beq', rs: 5, rt: 5, val: 11 },
];

/* ---------- 原理图：380 × 150 的虚拟坐标，绘制时整体缩放 ---------- */
const VW = 380;
const BOX = {
  ctrl: { x: 140, y: 4, w: 82, h: 18, t: '控制' },
  sext: { x: 238, y: 8, w: 54, h: 22, t: '符号扩展' },
  pc: { x: 0, y: 30, w: 44, h: 22, t: 'PC' },
  im: { x: 58, y: 22, w: 68, h: 38, t: '指令存储器' },
  rf: { x: 140, y: 44, w: 82, h: 62, t: '寄存器堆' },
  alu: { x: 238, y: 48, w: 54, h: 50, t: 'ALU' },
  dm: { x: 308, y: 44, w: 66, h: 58, t: '数据存储器' },
  mux: { x: 238, y: 120, w: 62, h: 24, t: '写回 MUX' },
};
const WIRE = {
  pc_im: [[44, 41], [58, 41]],
  im_ctrl: [[126, 34], [133, 34], [133, 13], [140, 13]],
  im_rf: [[126, 44], [134, 44], [134, 60], [140, 60]],
  im_sext: [[126, 52], [137, 52], [137, 34], [232, 34], [232, 23], [238, 23]],
  sext_alu: [[292, 19], [300, 19], [300, 110], [265, 110], [265, 98]],
  rf_a: [[222, 60], [238, 60]],
  rf_b: [[222, 86], [238, 86]],
  alu_dm: [[292, 62], [308, 62]],
  alu_mux: [[250, 98], [250, 132], [238, 132]],
  dm_mux: [[330, 102], [330, 112], [285, 112], [285, 120]],
  mux_rf: [[238, 132], [128, 132], [128, 100], [140, 100]],
};

function normInstr(x) {
  const op = x && OPS[x.op] ? x.op : 'add';
  return {
    op,
    rs: clamp((x && x.rs) | 0, 0, NREG - 1),
    rt: clamp((x && x.rt) | 0, 0, NREG - 1),
    val: clamp((x && x.val) | 0, 0, 15),
  };
}

function initArr(src, def, n) {
  const out = (Array.isArray(src) && src.length ? src : def).map((v) => (v | 0) & MASK);
  while (out.length < n) out.push(0);
  return out.slice(0, n);
}

const hex4 = (w) => '0x' + (w >>> 0).toString(16).padStart(4, '0');

function encode(i) {
  return (((OPS[i.op].code << 12) | (i.rs << 9) | (i.rt << 6) | (i.val & 0x3f)) >>> 0);
}

function decode(word) {
  const code = (word >> 12) & 15;
  const op = OPKEYS.find((k) => OPS[k].code === code) || 'add';
  return { op, rs: (word >> 9) & 7, rt: (word >> 6) & 7, val: word & 0x3f };
}

function asmText(i) {
  if (OPS[i.op].kind === 'r') return `${i.op} $${i.val & 7}, $${i.rs}, $${i.rt}`;
  if (i.op === 'beq') return `beq $${i.rs}, $${i.rt}, ${i.val >= 8 ? i.val - 16 : i.val}`;
  return `${i.op} $${i.rt}, ${i.val}($${i.rs})`;
}

/* ---------- 几何小工具 ---------- */
function wireLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i += 1) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
function pointAt(pts, t) {
  let d = t * wireLen(pts);
  for (let i = 1; i < pts.length; i += 1) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= seg || i === pts.length - 1) {
      const u = seg ? d / seg : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

export default function render(host, spec) {
  const H = spec.height || 370;
  let IM = (Array.isArray(spec.program) && spec.program.length ? spec.program : DEFAULT_PROGRAM).map(normInstr);
  while (IM.length < NIM) IM.push(normInstr(null));
  IM = IM.slice(0, NIM);
  let regs = initArr(spec.regs, [0, 3, 5, 0, 0, 0, 0, 0], NREG);
  let mem = initArr(spec.mem, [], NMEM);
  let pc = 0;
  let beatPos = 0;          // 0..5 连续，整数部分 = 当前拍
  let drag = null;
  const hits = [];          // 命中区，draw 时重建

  const cv = setupCanvas(host, H);
  const ro = buildReadout({
    当前指令: '—', 机器码: '—', PC: '—', 当前拍: '—', 写回: '—', 下一PC: '—', 说明: '—',
  });
  host.appendChild(ro.box);

  const OP_SEG = OPKEYS.map((k) => ({ label: k, value: k }));
  const seg = buildSegmented(OP_SEG, 'add', (v) => {
    IM[pc] = normInstr({ op: v, rs: IM[pc].rs, rt: IM[pc].rt, val: IM[pc].val });
    beatPos = 0;
    draw();
  });
  host.appendChild(seg);

  const bStep = mkBtn('单步 ▶');
  const bPrev = mkBtn('◀ 上一拍');
  const bPrevI = mkBtn('◀ 上一条指令');
  const bNextI = mkBtn('下一条指令 ▶');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bPrev, bPrevI, bNextI, bReset));

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'rs', label: 'rs', min: 0, max: 7, step: 1, value: 1 },
        { name: 'rt', label: 'rt', min: 0, max: 7, step: 1, value: 2 },
        { name: 'val', label: 'rd / imm', min: 0, max: 15, step: 1, value: 3 },
      ],
    },
    (stx) => {
      IM[pc] = normInstr({ op: IM[pc].op, rs: stx.rs, rt: stx.rt, val: stx.val });
      draw();
    },
  );

  /* ---------- 一拍一拍地把当前指令走完（纯函数，不改动状态） ---------- */
  function compute() {
    const i = IM[pc & 15];
    const o = OPS[i.op];
    const word = encode(i);
    const A = regs[i.rs] & MASK;
    const B = regs[i.rt] & MASK;
    const imm = i.val & MASK;
    const simm = i.val >= 8 ? i.val - 16 : i.val;
    let aluOut = 0;
    let zero = 0;
    let addr = 0;
    let mdr = null;
    let wbReg = -1;
    let wbVal = 0;
    if (o.kind === 'r') {
      const r = alu4(toBits(A, 4), toBits(B, 4), o.alu);
      aluOut = bitsToInt(r.out);
      zero = r.zero;
      wbReg = i.val & 7;
      wbVal = aluOut;
    } else if (o.kind === 'mem') {
      const r = alu4(toBits(A, 4), toBits(imm, 4), 2);
      addr = bitsToInt(r.out);
      zero = r.zero;
      if (i.op === 'lw') {
        mdr = mem[addr] & MASK;
        wbReg = i.rt;
        wbVal = mdr;
      }
    } else {
      const r = alu4(toBits(A, 4), toBits(B, 4), 3);
      aluOut = bitsToInt(r.out);
      zero = r.zero;
      addr = (pc + 1 + simm) & 15;
    }
    return {
      ins: i, o, word, A, B, imm, simm, aluOut, zero, addr, mdr, wbReg, wbVal,
      nextPc: o.kind === 'br' && zero ? addr : ((pc + 1) & 15),
    };
  }

  /* 每一拍：高亮哪些线 / 哪些部件 / 线上写什么 / 底部说明 */
  function beatsFor(st) {
    const { ins, o } = st;
    const isR = o.kind === 'r';
    const isMem = o.kind === 'mem';
    const isLw = ins.op === 'lw';
    const br = o.kind === 'br';
    return [
      {
        name: '取指 IF', wires: ['pc_im', 'im_ctrl', 'im_rf', 'im_sext'], boxes: ['pc', 'im'],
        vals: { pc_im: 'PC=' + pc, im_ctrl: hex4(st.word) },
        note: `PC=${pc} 送地址，取出 IM[${pc}]：${asmText(ins)}（${hex4(st.word)}），同时 PC+1`,
      },
      {
        name: '译码 ID', wires: ['im_rf', 'im_sext', 'rf_a', 'rf_b'], boxes: ['ctrl', 'rf', 'sext'],
        vals: { rf_a: 'A=' + st.A, rf_b: 'B=' + st.B, im_sext: 'imm=' + st.imm },
        note: `译出 rs=$${ins.rs}、rt=$${ins.rt}；读寄存器堆：A=$${ins.rs}=${st.A}，B=$${ins.rt}=${st.B}；立即数 ${st.imm} 符号扩展`,
      },
      {
        name: '执行 EX',
        wires: isR ? ['rf_a', 'rf_b', 'alu_mux'] : (isMem ? ['rf_a', 'sext_alu', 'alu_dm'] : ['rf_a', 'rf_b']),
        boxes: ['alu'],
        vals: isR ? { alu_mux: '=' + st.aluOut } : (isMem ? { alu_dm: '地址 ' + st.addr, sext_alu: 'imm ' + st.imm } : {}),
        note: isR ? `ALU 算 ${st.A} ${o.sym} ${st.B} = ${st.aluOut}`
          : (isMem ? `ALU 算地址 ${st.A} + ${st.imm} = ${st.addr}` : `ALU 比较 ${st.A} ${o.sym} ${st.B}，zero=${st.zero}`),
      },
      {
        name: '访存 MEM',
        wires: isLw ? ['alu_dm', 'dm_mux'] : (isMem ? ['alu_dm'] : []),
        boxes: isMem ? ['dm'] : [],
        vals: isLw ? { dm_mux: '读出 ' + st.mdr } : (ins.op === 'sw' ? { alu_dm: '写入 ' + st.B } : {}),
        note: isLw ? `按地址 ${st.addr} 读内存：mem[${st.addr}] = ${st.mdr}`
          : (ins.op === 'sw' ? `把 ${st.B} 写进 mem[${st.addr}]`
            : (br ? `分支 ${st.zero ? '成立' : '不成立'}，${st.zero ? '改写 PC = ' + st.addr : 'PC 保持 +1'}` : 'R 型指令不访存，这一拍空转')),
      },
      {
        name: '写回 WB',
        wires: st.wbReg >= 0 ? [(isLw ? 'dm_mux' : 'alu_mux'), 'mux_rf'] : [],
        boxes: st.wbReg >= 0 ? ['mux', 'rf'] : [],
        vals: st.wbReg >= 0 ? { mux_rf: '$' + st.wbReg + '←' + st.wbVal } : {},
        note: st.wbReg >= 0 ? `MUX 选${isLw ? '内存读出' : 'ALU 结果'}，把 ${st.wbVal} 写回 $${st.wbReg}` : '这条指令不写寄存器（sw / beq 没有写回）',
      },
    ];
  }

  /* ---------- 提交：一拍拍走完后真正改状态 ---------- */
  function commit() {
    const st = compute();
    if (st.wbReg >= 0) regs[st.wbReg] = st.wbVal & MASK;
    if (st.ins.op === 'sw') mem[st.addr] = st.B & MASK;
    pc = st.nextPc;
    beatPos = 0;
    syncControls();
  }

  function syncControls() {
    const i = IM[pc];
    Array.from(seg.children).forEach((b, k) => b.classList.toggle('is-active', OP_SEG[k].value === i.op));
    const inputs = sliders.box.querySelectorAll('input');
    const spans = sliders.box.querySelectorAll('.ml-slider__val');
    [['rs', i.rs], ['rt', i.rt], ['val', i.val]].forEach(([k, v], idx) => {
      sliders.state[k] = v;
      if (inputs[idx]) inputs[idx].value = String(v);
      if (spans[idx]) spans[idx].textContent = String(v);
    });
  }

  function sync() {
    const st = compute();
    const bs = beatsFor(st);
    const b = clamp(Math.floor(beatPos), 0, 4);
    ro.set('当前指令', `${String(pc).padStart(2, '0')}  ${asmText(st.ins)}`);
    ro.set('机器码', `${hex4(st.word)}　op=${OPS[st.ins.op].code} rs=${st.ins.rs} rt=${st.ins.rt} val=${st.ins.val}`);
    ro.set('PC', `${pc} → ${st.nextPc}`);
    ro.set('当前拍', `${bs[b].name}　[${b + 1}/5]`);
    ro.set('写回', st.wbReg >= 0 ? `$${st.wbReg} ← ${st.wbVal}` : '（无）');
    ro.set('下一PC', String(st.nextPc));
    ro.set('说明', bs[b].note);
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const st = compute();
    const bs = beatsFor(st);
    const beat = clamp(Math.floor(beatPos), 0, 4);
    const frac = clamp(beatPos - beat, 0, 1);
    const cur = bs[beat];
    hits.length = 0;

    /* --- 原理图 --- */
    const sc = Math.min(1.15, (W - 12) / VW);
    const ox = (W - VW * sc) / 2;
    const PX = (x) => ox + x * sc;
    const PY = (y) => 2 + y * sc;
    const fs = Math.max(7.5, 9 * sc);

    const isActiveBox = (k) => cur.boxes.indexOf(k) >= 0;
    const wireState = (k) => {
      const idx = cur.wires.indexOf(k);
      if (idx >= 0) return 2;                                  // 当拍在用
      for (let j = 0; j < beat; j += 1) if (bs[j].wires.indexOf(k) >= 0) return 1; // 已走过
      return 0;
    };

    /* 线 */
    Object.keys(WIRE).forEach((k) => {
      const stt = wireState(k);
      const pts = WIRE[k].map(([x, y]) => [PX(x), PY(y)]);
      ctx.strokeStyle = stt === 2 ? C.accent : (stt === 1 ? C.axis : C.grid);
      ctx.lineWidth = stt === 2 ? 2.2 * Math.max(0.6, sc) : 1.1;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      /* 箭头 */
      const a = pts[pts.length - 1];
      const b = pts[pts.length - 2];
      const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(a[0] - 5 * Math.cos(ang - 0.4), a[1] - 5 * Math.sin(ang - 0.4));
      ctx.lineTo(a[0] - 5 * Math.cos(ang + 0.4), a[1] - 5 * Math.sin(ang + 0.4));
      ctx.closePath();
      ctx.fill();
      /* 当拍：沿线跑的数据小圆点 */
      if (stt === 2) {
        const p = pointAt(WIRE[k], frac);
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(PX(p[0]), PY(p[1]), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      /* 线上的值 */
      const vt = cur.vals[k];
      if (vt) {
        const p = pointAt(WIRE[k], 0.55);
        label(ctx, vt, PX(p[0]), PY(p[1]) - 5, C.accent2, { align: 'center', size: fs + 0.5, weight: 700 });
      }
    });

    /* 部件 */
    Object.keys(BOX).forEach((k) => {
      const b = BOX[k];
      const on = isActiveBox(k);
      ctx.fillStyle = on ? C.accent : C.soft;
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 2.2 : 1.2;
      ctx.fillRect(PX(b.x), PY(b.y), b.w * sc, b.h * sc);
      ctx.strokeRect(PX(b.x) + 0.5, PY(b.y) + 0.5, b.w * sc - 1, b.h * sc - 1);
      label(ctx, b.t, PX(b.x + b.w / 2), PY(b.y + b.h / 2) + fs * 0.36, on ? C.bg : C.fg,
        { align: 'center', size: fs, weight: 600 });
      /* 部件里的动态内容 */
      let inner = '';
      if (k === 'pc') inner = String(pc);
      else if (k === 'im') inner = hex4(st.word);
      else if (k === 'alu') inner = OPS[st.ins.op].sym;
      else if (k === 'dm') inner = OPS[st.o.kind].kind === 'mem' ? String(st.addr) : '—';
      else if (k === 'sext') inner = OPS[st.o.kind].kind === 'mem' ? String(st.imm) : '—';
      if (inner) {
        label(ctx, inner, PX(b.x + b.w / 2), PY(b.y + b.h) - 4, on ? C.bg : C.accent2,
          { align: 'center', size: fs + 0.5, weight: 700 });
      }
    });

    const dh = 150 * sc + 6;

    /* --- 寄存器堆条（可上下拖） --- */
    const ry = dh + 12;
    label(ctx, '寄存器堆（上下拖动改值，0..15）', 8, ry - 3, C.fg, { size: 10 });
    const rw = (W - 16) / NREG;
    for (let i = 0; i < NREG; i += 1) {
      const x = 8 + i * rw;
      const y = ry;
      ctx.fillStyle = (st.wbReg === i && beat >= 4) ? C.accent : C.soft;
      ctx.strokeStyle = (st.ins.rs === i || st.ins.rt === i || (OPS[st.ins.op].kind === 'r' && (st.ins.val & 7) === i)) ? C.accent2 : C.grid;
      ctx.lineWidth = 1.3;
      ctx.fillRect(x + 1, y, rw - 3, 26);
      ctx.strokeRect(x + 1.5, y + 0.5, rw - 4, 25);
      label(ctx, '$' + i, x + rw / 2, y + 10, C.axis, { align: 'center', size: 8.5 });
      label(ctx, String(regs[i]), x + rw / 2, y + 22, (st.wbReg === i && beat >= 4) ? C.bg : C.fg,
        { align: 'center', size: 12, weight: 700 });
      hits.push({ x, y: y - 4, w: rw, h: 34, id: 'r' + i, base: regs[i] });
    }

    /* --- 内存条（可上下拖） --- */
    const my = ry + 44;
    label(ctx, '数据存储器（上下拖动改值）', 8, my - 3, C.fg, { size: 10 });
    const mw = (W - 16) / NMEM;
    for (let i = 0; i < NMEM; i += 1) {
      const x = 8 + i * mw;
      ctx.fillStyle = (OPS[st.o.kind].kind === 'mem' && st.addr === i && beat >= 2) ? C.accent : C.soft;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.fillRect(x + 1, my, mw - 2, 24);
      ctx.strokeRect(x + 1.5, my + 0.5, mw - 3, 23);
      label(ctx, String(i), x + mw / 2, my + 9, C.axis, { align: 'center', size: 7.5 });
      label(ctx, String(mem[i]), x + mw / 2, my + 21,
        (OPS[st.o.kind].kind === 'mem' && st.addr === i && beat >= 2) ? C.bg : C.fg,
        { align: 'center', size: 11, weight: 700 });
      hits.push({ x, y: my - 4, w: mw, h: 32, id: 'm' + i, base: mem[i] });
    }

    /* --- 节拍条（可拖） --- */
    const ty = my + 38;
    const tw = (W - 16) / 5;
    label(ctx, '五拍（拖动节拍条跳到任意一拍）', 8, ty - 3, C.fg, { size: 10 });
    for (let i = 0; i < 5; i += 1) {
      const x = 8 + i * tw;
      const done = i < beat;
      const on = i === beat;
      ctx.fillStyle = on ? C.accent : (done ? C.soft : C.soft);
      ctx.strokeStyle = on ? C.accent : (done ? C.axis : C.grid);
      ctx.lineWidth = on ? 2 : 1;
      ctx.fillRect(x + 1, ty, tw - 3, 24);
      ctx.strokeRect(x + 1.5, ty + 0.5, tw - 4, 23);
      label(ctx, bs[i].name, x + tw / 2, ty + 16, on ? C.bg : (done ? C.fg : C.axis),
        { align: 'center', size: 9.5, weight: on ? 700 : 400 });
      hits.push({ x, y: ty - 4, w: tw, h: 32, id: 'b' + i, base: 0 });
    }
    /* 进度游标 */
    const px = 8 + clamp(beatPos, 0, 5) / 5 * (W - 16);
    ctx.strokeStyle = C.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, ty - 4);
    ctx.lineTo(px, ty + 28);
    ctx.stroke();

    label(ctx, cur.note, 8, Hh - 6, C.accent2, { size: 11 });

    sync();
  }

  /* ---------- 拖拽 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      const h = hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      return h ? h.id : null;
    },
    down(id, x, y) {
      const h = hits.find((r) => r.id === id);
      drag = { id, y, base: h ? h.base : 0 };
      if (id[0] === 'b') {
        const tw = (cv.W - 16) / 5;
        beatPos = clamp((x - 8) / tw, 0, 4.999);
        draw();
      }
    },
    move(id, x, y) {
      if (!drag || drag.id !== id) return;
      if (id[0] === 'b') {
        const tw = (cv.W - 16) / 5;
        beatPos = clamp((x - 8) / tw, 0, 4.999);
      } else {
        const d = Math.round((drag.y - y) / 5);
        const v = ((drag.base + d) % 16 + 16) % 16;
        if (id[0] === 'r') regs[+id.slice(1)] = v;
        else mem[+id.slice(1)] = v;
      }
      draw();
    },
    up() { drag = null; },
  });

  /* ---------- 按钮 ---------- */
  bStep.addEventListener('click', () => {
    if (beatPos >= 4.999) commit();
    else beatPos = Math.floor(beatPos) + 1;
    draw();
  });
  bPrev.addEventListener('click', () => {
    beatPos = clamp(Math.ceil(beatPos) - 1, 0, 4);
    draw();
  });
  bPrevI.addEventListener('click', () => { pc = (pc - 1 + NIM) % NIM; beatPos = 0; syncControls(); draw(); });
  bNextI.addEventListener('click', () => { pc = (pc + 1) % NIM; beatPos = 0; syncControls(); draw(); });
  bReset.addEventListener('click', () => {
    IM = DEFAULT_PROGRAM.map(normInstr);
    while (IM.length < NIM) IM.push(normInstr(null));
    regs = initArr(spec.regs, [0, 3, 5, 0, 0, 0, 0, 0], NREG);
    mem = initArr(spec.mem, [], NMEM);
    pc = 0;
    beatPos = 0;
    syncControls();
    draw();
  });

  const controls = anim(host, {
    onTick(dt) {
      beatPos += dt / BEATSEC;
      if (beatPos >= 5) commit();
      draw();
    },
    onReset() { beatPos = 0; draw(); },
  });

  syncControls();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
