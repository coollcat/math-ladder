/* =========================================================================
 * lab 组件：pipeline-hazard（五级流水线与冒险）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "pipeline-hazard", "title": "相邻两条指令读同一个寄存器会怎样" }
 *   ```
 *
 * 可选字段（都有默认值，最小 spec 只写 type + title 就能跑）：
 *   program  指令表，默认七条（lw → add → add → sw → beq → add → add）。
 *            每条 { "t": "add $2, $1, $1", "dst": 2, "src": [1, 1], "kind": "alu" }，
 *            kind ∈ alu | load | store | branch，dst = -1 表示不写寄存器。
 *            beq 固定跳到「自己下标 + 2」，即跳过紧跟着的一条。
 *   m        mem[0] 的初值（0..15），默认 4。第一条 lw 把它读进 $1。
 *   k        $6 的初值（0..15），默认 4。beq $1, $6 在 m === k 时转移成立。
 *   mode     "stall"（无转发，全停顿）/ "fwd"（转发）/ "pred"（转发 + 预测不转移），
 *            默认 "fwd"。
 *   height   画布高度，默认 300
 *
 * 能玩什么：
 *   · 时空图：横轴是时钟周期，纵轴是指令，每格写它这一拍在 IF/ID/EX/MEM/WB 哪一段。
 *     空白的虚线格就是气泡（白白空转的一拍），橙边格子是「卡在这一段没动」，
 *     红色小三角标出卡住的原因。
 *   · 拖指令行（在图上按住上下拖）：重排指令顺序。这正是编译器干的事——
 *     把不相关的指令塞进两条相关指令中间，气泡就消掉了，总拍数当场变少。
 *   · 三种模式对比：无转发要停 2 拍；开了转发，ALU 结果直接从上一条的 EX/MEM
 *     交界处绕过来（绿色虚线箭头），只有 lw 后面紧跟着用它的那条还得停 1 拍
 *     （load-use，绕不过去）；分支再开「预测不转移」，不转移时零开销，
 *     转移了才把已取的两条冲掉（画叉的那几格）。
 *   · 拖 m / k 滑块：让 beq 成立或不成立，看预测错的代价。
 *
 * 取舍：模型是经典五级流水（IF/ID/EX/MEM/WB），分支在 EX 末出结果，
 * 写回在 WB 前半拍、读寄存器在 ID 后半拍（所以「同一拍一写一读」不算冒险）。
 * 只做 RAW（写后读）数据冒险与分支控制冒险——WAR/WAW 在这种定长流水里不会发生；
 * 结构冒险用「每一段每拍只许一条指令」自动体现。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSegmented, buildSliders, buildReadout,
  bindPointer, label, clamp,
  clearBg,
} from '../core.js';

const STAGE = ['IF', 'ID', 'EX', 'MEM', 'WB'];

const PROG0 = [
  { t: 'lw  $1, 0($0)', dst: 1, src: [0], kind: 'load' },
  { t: 'add $2, $1, $1', dst: 2, src: [1, 1], kind: 'alu' },
  { t: 'add $3, $2, $1', dst: 3, src: [2, 1], kind: 'alu' },
  { t: 'sw  $3, 4($0)', dst: -1, src: [3, 0], kind: 'store' },
  { t: 'beq $1, $6, +1', dst: -1, src: [1, 6], kind: 'branch' },
  { t: 'add $4, $4, $1', dst: 4, src: [4, 1], kind: 'alu' },
  { t: 'add $5, $4, $3', dst: 5, src: [4, 3], kind: 'alu' },
];

/* ---------- 流水线模拟：返回时空图网格 + 统计 ---------- */
function simulate(prog, mode, taken) {
  const n = prog.length;
  const fwd = mode !== 'stall';
  const pred = mode === 'pred';
  const MAXC = 44;
  const grid = [];
  for (let c = 0; c <= MAXC + 2; c += 1) grid.push(new Array(5).fill(null));
  const stage = new Array(n).fill(-1);        // -1 未取指 / 0..4 / 5 退休 / 6 被冲掉
  const tp = Array.from({ length: n }, () => new Array(5).fill(-1));
  const entry = Array.from({ length: n }, () => new Array(5).fill(-1));
  const flushed = new Array(n).fill(false);
  const stallMark = [];
  const fwdArc = [];
  const bi = prog.findIndex((p) => p.kind === 'branch');
  let pc = 0;
  let last = 0;

  for (let c = 1; c <= MAXC; c += 1) {
    /* 1. 取指：IF 段空着，且没被分支卡住 */
    const ifBusy = stage.some((s) => s === 0);
    const hold = !pred && bi >= 0 && (stage[bi] === 1 || stage[bi] === 2);
    if (pc < n && !ifBusy && !hold) {
      stage[pc] = 0;
      pc = (bi >= 0 && pc === bi) ? (taken ? bi + 2 : bi + 1) : pc + 1;
    }
    /* 2. 占格（entry 只记第一次进入某段的周期，后面重复的格子就是停顿） */
    let any = false;
    for (let i = 0; i < n; i += 1) {
      if (stage[i] >= 0 && stage[i] <= 4) {
        if (entry[i][stage[i]] < 0) entry[i][stage[i]] = c;
        tp[i][stage[i]] = c;
        grid[c][stage[i]] = { i };
        any = true;
      }
    }
    if (any) last = c;
    /* 3. 推进（升序：前面的指令先让出段） */
    const moved = [];
    for (let i = 0; i < n; i += 1) {
      const s = stage[i];
      if (s < 0 || s > 4) continue;
      if (s === 4) { stage[i] = 5; moved.push(i); continue; }
      let ok = true;
      let haz = -1;
      if (s === 1) {
        /* RAW：找比它早、写它要读的寄存器的那些指令 */
        for (let j = 0; j < i; j += 1) {
          if (flushed[j] || prog[j].dst < 0) continue;
          if (prog[i].src.indexOf(prog[j].dst) < 0) continue;
          const isLoad = prog[j].kind === 'load';
          /* 结果什么时候拿到手：写回？还是 EX 末 / MEM 末？ */
          const avail = !fwd ? tp[j][4] : (isLoad ? tp[j][3] : tp[j][2]);
          if (!(avail >= 0 && avail <= c)) { ok = false; haz = j; break; }
          if (fwd && !(tp[j][4] >= 0 && tp[j][4] <= c)) {
            fwdArc.push({ j, cj: avail, i, reg: prog[j].dst });
          }
        }
      }
      if (ok && i > 0 && stage[i - 1] === s + 1) ok = false;   // 前一条还占着下一段
      if (ok) { stage[i] = s + 1; moved.push(i); } else if (haz >= 0) {
        stallMark.push({ i, c, j: haz, reg: prog[haz].dst });
      }
    }
    /* 4. 分支在 EX 末出结果 */
    moved.forEach((i) => {
      if (prog[i].kind !== 'branch' || stage[i] !== 3 || tp[i][2] !== c) return;
      if (taken) {
        if (pred) {
          for (let q = i + 1; q < n; q += 1) {
            if (stage[q] === 0 || stage[q] === 1) { stage[q] = 6; flushed[q] = true; }
          }
        }
        pc = i + 2;
      }
    });
    if (pc >= n && !stage.some((s) => s >= 0 && s <= 4)) break;
  }

  const executed = stage.filter((s) => s === 5).length;
  return {
    grid, tp, entry, flushed, total: last, stage, executed,
    stalls: stallMark, fwdArc, n,
  };
}

export default function render(host, spec) {
  const H = spec.height || 300;
  let prog = (Array.isArray(spec.program) && spec.program.length ? spec.program : PROG0)
    .map((p) => ({ t: String(p.t || ''), dst: p.dst | 0, src: (p.src || []).slice(), kind: p.kind || 'alu' }));
  let mode = ['stall', 'fwd', 'pred'].indexOf(spec.mode) >= 0 ? spec.mode : 'fwd';
  let m = clamp(spec.m === undefined ? 4 : (spec.m | 0), 0, 15);
  let k = clamp(spec.k === undefined ? 4 : (spec.k | 0), 0, 15);
  let dragRow = -1;
  let geo = { padL: 90, padT: 32, rh: 24, n: prog.length };
  let sim = simulate(prog, mode, m === k);

  const cv = setupCanvas(host, H);
  const ro = buildReadout({
    总拍数: '—', '理想拍数': '—', 额外开销: '—', 数据冒险: '—', 转发: '—', 分支: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented([
    { label: '无转发（全停顿）', value: 'stall' },
    { label: '转发', value: 'fwd' },
    { label: '转发 + 预测不转移', value: 'pred' },
  ], mode, (v) => { mode = v; recompute(); }));

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'm', label: 'mem[0]（第一条 lw 读进 $1）', min: 0, max: 15, step: 1, value: m },
        { name: 'k', label: '$6 初值（beq 拿它和 $1 比）', min: 0, max: 15, step: 1, value: k },
      ],
    },
    (stx) => { m = stx.m; k = stx.k; recompute(); },
  );

  function recompute() {
    sim = simulate(prog, mode, m === k);
    sync();
    draw();
  }

  function sync() {
    const exec = Math.max(sim.executed, 1);
    const ideal = exec + 4;                     // n 条指令理想只要 n+4 拍
    ro.set('总拍数', `${sim.total} 拍（执行了 ${sim.executed} 条，冲掉 ${sim.n - sim.executed} 条）`);
    ro.set('理想拍数', `${ideal} 拍`);
    ro.set('额外开销', `${Math.max(0, sim.total - ideal)} 拍`);
    ro.set('数据冒险', `${sim.stalls.length} 次停顿 / ${sim.fwdArc.length} 次靠转发躲过`);
    ro.set('转发', mode === 'stall' ? '关（只能干等到写回）' : '开（直接从段间寄存器绕过来）');
    ro.set('分支', m === k
      ? `成立 → ${mode === 'pred' ? '预测错了，冲掉已取的两条' : '等它出结果再取指'}`
      : `不成立 → ${mode === 'pred' ? '预测对了，零开销' : '还是白等了'}`);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const n = prog.length;
    const total = Math.max(sim.total, 1);
    const padL = Math.min(108, Math.max(56, W * 0.30));
    const padT = 34;
    const rh = Math.min(26, Math.max(14, (Hh - padT - 36) / n));
    const cw = (W - padL - 10) / total;
    geo = { padL, padT, rh, n };
    const cx = (c) => padL + (c - 1) * cw;
    const ry = (i) => padT + i * rh;

    /* 图例 */
    STAGE.forEach((s, i2) => {
      const x = 8 + i2 * Math.min(44, (W - 16) / 5);
      ctx.fillStyle = C.series(i2);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, 10, 12, 11);
      ctx.globalAlpha = 1;
      label(ctx, s, x + 15, 20, C.fg, { size: 10 });
    });
    label(ctx, '按住任意一行上下拖：重排指令', W - 8, 20, C.accent2, { size: 10, align: 'right' });

    /* 周期刻度 */
    for (let c = 1; c <= total; c += 1) {
      if (cw >= 15 || c % 2 === 1) {
        label(ctx, String(c), cx(c) + cw / 2, padT - 5, C.axis, { align: 'center', size: 9 });
      }
    }

    /* 气泡：这一列有指令、但该段空着 → 虚线格 */
    for (let c = 1; c <= total; c += 1) {
      let lo = 9;
      let hi = -1;
      for (let s = 0; s < 5; s += 1) if (sim.grid[c][s]) { lo = Math.min(lo, s); hi = Math.max(hi, s); }
      for (let s = lo; s <= hi; s += 1) {
        if (sim.grid[c][s]) continue;
        ctx.strokeStyle = C.axis;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(cx(c) + 0.5, padT + 1.5, cw - 1, n * rh - 4);
        ctx.setLineDash([]);
      }
    }

    /* 指令行 + 格子 */
    for (let i = 0; i < n; i += 1) {
      const y = ry(i);
      if (dragRow === i) {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(0, y, W, rh);
        ctx.globalAlpha = 1;
      }
      const txtSize = Math.min(11, Math.max(7.5, padL / 11));
      label(ctx, `${i} ${prog[i].t}`, 4, y + rh / 2 + 3.5,
        sim.flushed[i] ? C.bad : (dragRow === i ? C.accent : C.fg),
        { size: txtSize, weight: 600 });
      if (sim.flushed[i]) {
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(3, y + rh / 2 + 6.5);
        ctx.lineTo(padL - 6, y + rh / 2 + 6.5);
        ctx.stroke();
      }
      for (let c = 1; c <= total; c += 1) {
        for (let s = 0; s < 5; s += 1) {
          const cell = sim.grid[c] && sim.grid[c][s];
          if (!cell || cell.i !== i) continue;
          const x = cx(c);
          const killed = sim.flushed[i];
          const repeat = sim.entry[i][s] >= 0 && c > sim.entry[i][s];
          ctx.fillStyle = killed ? C.bad : (repeat ? C.accent2 : C.series(s));
          ctx.globalAlpha = killed ? 0.18 : (repeat ? 0.45 : 0.85);
          ctx.fillRect(x + 0.5, y + 1.5, cw - 1, rh - 4);
          ctx.globalAlpha = 1;
          if (killed) {
            ctx.strokeStyle = C.bad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 4);
            ctx.lineTo(x + cw - 3, y + rh - 5);
            ctx.moveTo(x + cw - 3, y + 4);
            ctx.lineTo(x + 3, y + rh - 5);
            ctx.stroke();
          } else if (cw >= 19) {
            label(ctx, STAGE[s], x + cw / 2, y + rh / 2 + 3.5, C.bg,
              { align: 'center', size: 9.5, weight: 700 });
          } else if (cw >= 11) {
            label(ctx, STAGE[s][0], x + cw / 2, y + rh / 2 + 3.5, C.bg,
              { align: 'center', size: 9, weight: 700 });
          }
        }
      }
    }

    /* 停顿原因标记 */
    sim.stalls.forEach((st) => {
      const x = cx(st.c);
      const y = ry(st.i);
      ctx.fillStyle = C.bad;
      ctx.beginPath();
      ctx.moveTo(x + cw - 2.5, y + 3);
      ctx.lineTo(x + cw - 2.5, y + 11);
      ctx.lineTo(x + cw - 9, y + 7);
      ctx.closePath();
      ctx.fill();
    });

    /* 转发弧 */
    sim.fwdArc.forEach((a) => {
      const ci = sim.tp[a.i][2];
      if (!(ci > 0)) return;
      const x0 = cx(a.cj) + cw;
      const y0 = ry(a.j) + rh / 2;
      const x1 = cx(ci);
      const y1 = ry(a.i) + rh / 2;
      ctx.strokeStyle = C.ok;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 12, x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ok;
      ctx.beginPath();
      ctx.arc(x1, y1, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });

    label(ctx, '虚线格 = 气泡（这一段这拍空转）　橙格 = 卡在这一段没动　红三角 = 被数据冒险卡住　绿虚线 = 转发',
      8, Hh - 17, C.accent2, { size: 10 });
    label(ctx, '按住任意一行上下拖可以重排指令——把无关的指令塞进两条相关指令中间，气泡就消了。',
      8, Hh - 4, C.fg, { size: 10 });
  }

  /* ---------- 拖行重排 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y < geo.padT || y > geo.padT + geo.n * geo.rh) return null;
      void x;
      return 'r' + clamp(Math.floor((y - geo.padT) / geo.rh), 0, geo.n - 1);
    },
    down(id) {
      dragRow = +id.slice(1);
      draw();
    },
    move(id, x, y) {
      if (dragRow < 0) return;
      void id;
      void x;
      const j = clamp(Math.floor((y - geo.padT) / geo.rh), 0, geo.n - 1);
      if (j === dragRow) return;
      const a = prog[dragRow];
      prog[dragRow] = prog[j];
      prog[j] = a;
      dragRow = j;
      sim = simulate(prog, mode, m === k);
      sync();
      draw();
    },
    up() { dragRow = -1; draw(); },
    leave() { if (dragRow >= 0) { dragRow = -1; draw(); } },
  });

  recompute();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
