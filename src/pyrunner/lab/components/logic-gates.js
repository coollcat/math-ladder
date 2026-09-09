/* =========================================================================
 * lab 组件：logic-gates（拖门、拉线、看真值表）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "logic-gates",
 *     "title": "把与门和或门接起来，看真值表怎么长出来",
 *     "inputs": 3
 *   }
 *   ```
 *
 * 字段（全部可省略）：
 *   inputs   输入端（开关）个数，默认 3，范围 2–4。默认电路是
 *            F = (A·B) + C̄：AND(A,B) 与 NOT(C) 汇入一个 OR。
 *
 * 演示什么：
 *   门不是符号，是「输入端按一下、输出端就跟着动」的小机器。左列开关给值，
 *   中间是自己搭的门网络，右边灯泡是结果。下方实时列出**整张电路的真值表**
 *   （不是某个门的，是把门接起来之后整张网的），当前开关组合那行会高亮。
 *   悬空的输入按未定态 X 处理：灯泡会变红显示 X——这是真实电路的常态，
 *   不是 bug。自己把输出绕回输入会形成组合环，状态栏会报「振荡」。
 *
 * 能拖什么：
 *   · 拖门中间的方块 —— 搬动门的位置
 *   · 从门的**右侧输出点**拖到另一门的**左侧输入点** —— 拉一根线
 *     也可以拖到最右边的灯泡上，把它设为整张电路的输出
 *   · 点输入端已连好的线 —— 删掉这根线
 *   · 点开关 —— 拨 0/1
 *   · 点门 —— 选中（虚线框），再点下方类型按钮就把这个门改成那种类型
 *   工具条：AND / OR / NOT / XOR / NAND / NOR / XNOR（选中了门就改类型，
 *   没选中就新增一个）、删除所选、清空连线。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildToolbar, mkBtn,
  label, clamp,
} from '../core.js';
import { truthTable, evalCombinational, X } from '../engines/logic.js';

const INPUT_NAMES = ['A', 'B', 'C', 'D'];
const FLOAT = '__float__'; // 悬空信号：values 里查不到 → 引擎按 X 处理

const TYPES = [
  { id: 'and', name: 'AND', cn: '与' },
  { id: 'or', name: 'OR', cn: '或' },
  { id: 'not', name: 'NOT', cn: '非' },
  { id: 'xor', name: 'XOR', cn: '异或' },
  { id: 'nand', name: 'NAND', cn: '与非' },
  { id: 'nor', name: 'NOR', cn: '或非' },
  { id: 'xnor', name: 'XNOR', cn: '同或' },
];
const typeName = (t) => (TYPES.find((x) => x.id === t) || TYPES[0]).name;
const nPins = (t) => (t === 'not' ? 1 : 2);

export default function render(host, spec) {
  let C = themeColors();
  const nIn = clamp(Math.round(spec.inputs ?? 3), 2, 4);

  /* ---------- 电路模型 ---------- */
  let nextId = 3;
  const model = {
    sw: new Array(nIn).fill(0),
    gates: [
      { id: 0, type: 'and', x: 152, y: 48, in: [{ kind: 'in', name: 'A' }, { kind: 'in', name: 'B' }] },
      { id: 1, type: 'not', x: 152, y: 150, in: [{ kind: 'in', name: 'C' }] },
      { id: 2, type: 'or', x: 300, y: 96, in: [{ kind: 'gate', id: 0 }, { kind: 'gate', id: 1 }] },
    ],
    out: { kind: 'gate', id: 2 },
  };
  if (nIn === 2) model.gates[1].in = [{ kind: 'in', name: 'B' }];

  let sel = 2;          // 选中的门（数组下标）
  let drag = null;      // 拖拽状态
  let hoverPin = null;  // 拖拽时高亮的落点

  const cv = setupCanvas(host, 430);
  const ro = buildReadout({
    '当前输入': '—', '输出 F': '—', '所选门': '—', '门真值表': '—',
    '门数 / 连线': '—', '状态': '—',
  });
  host.appendChild(ro.box);

  /* ---------- 几何 ---------- */
  const TOP = 34;
  const BOT = 258;            // 电路区上下边界
  const GW = 76;
  const GH = 46;
  const SW_X = 26;
  const SW_W = 42;
  const SW_H = 26;

  const swY = (i) => TOP + 18 + i * ((BOT - TOP - 40) / Math.max(nIn - 1, 1));
  const gateBox = (g) => ({ x: g.x, y: g.y, w: GW, h: GH });
  const outPin = (g) => ({ x: g.x + GW, y: g.y + GH / 2 });
  const inPin = (g, i) => ({ x: g.x, y: g.y + (GH * (i + 1)) / (nPins(g.type) + 1) });
  const nodeBox = () => ({ x: cv.W - 74, y: TOP + 84, w: 56, h: 40 });
  const srcPos = (src) => {
    if (!src) return null;
    if (src.kind === 'in') {
      const i = INPUT_NAMES.indexOf(src.name);
      if (i < 0 || i >= nIn) return null;
      return { x: SW_X + SW_W, y: swY(i) };
    }
    const g = model.gates.find((q) => q.id === src.id);
    return g ? outPin(g) : null;
  };

  /* ---------- 求值：交给引擎 ---------- */
  function sigName(src) {
    if (!src) return FLOAT;
    if (src.kind === 'in') return src.name;
    return 'n' + src.id;
  }
  function buildNet() {
    const gates = model.gates.map((g) => ({
      id: 'g' + g.id,
      type: g.type,
      in: g.in.slice(0, nPins(g.type)).map(sigName),
      out: 'n' + g.id,
    }));
    gates.push({ id: 'outbuf', type: 'buf', in: [sigName(model.out)], out: 'F' });
    return { inputs: INPUT_NAMES.slice(0, nIn), outputs: ['F'], gates };
  }
  function evaluate(swValues) {
    const values = {};
    (swValues || model.sw).forEach((v, i) => { values[INPUT_NAMES[i]] = v; });
    const res = evalCombinational(buildNet(), values, 300);
    return { values, stable: res.stable, iterations: res.iterations };
  }

  /* ---------- 连线路径（三次贝塞尔，画与命中用同一条） ---------- */
  function pathPts(p0, p1, n) {
    const dx = Math.max(34, Math.abs(p1.x - p0.x) * 0.5);
    const c0 = { x: p0.x + dx, y: p0.y };
    const c1 = { x: p1.x - dx, y: p1.y };
    const pts = [];
    for (let k = 0; k <= n; k += 1) {
      const t = k / n;
      const u = 1 - t;
      pts.push({
        x: u * u * u * p0.x + 3 * u * u * t * c0.x + 3 * u * t * t * c1.x + t * t * t * p1.x,
        y: u * u * u * p0.y + 3 * u * u * t * c0.y + 3 * u * t * t * c1.y + t * t * t * p1.y,
      });
    }
    return pts;
  }
  function drawWire(ctx, p0, p1, val) {
    const pts = pathPts(p0, p1, 28);
    ctx.save();
    ctx.strokeStyle = val === X ? C.named('red') : val === 1 ? C.ok : C.axis;
    ctx.lineWidth = val === 1 ? 2.6 : 1.8;
    if (val === X) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }
  function nearPath(x, y, p0, p1) {
    return pathPts(p0, p1, 22).some((p) => Math.hypot(p.x - x, p.y - y) < 6);
  }

  /* ---------- 命中测试 ---------- */
  function hit(x, y) {
    for (let i = 0; i < model.gates.length; i += 1) {
      const p = outPin(model.gates[i]);
      if (Math.hypot(p.x - x, p.y - y) < 9) return 'out:' + i;
    }
    for (let i = 0; i < model.gates.length; i += 1) {
      const g = model.gates[i];
      for (let k = 0; k < nPins(g.type); k += 1) {
        const p = inPin(g, k);
        if (Math.hypot(p.x - x, p.y - y) < 9) return 'in:' + i + ':' + k;
      }
    }
    const nb = nodeBox();
    if (x >= nb.x - 26 && x <= nb.x + nb.w && y >= nb.y - 6 && y <= nb.y + nb.h + 6) return 'node';
    for (let i = model.gates.length - 1; i >= 0; i -= 1) {
      const b = gateBox(model.gates[i]);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return 'gate:' + i;
    }
    for (let i = 0; i < nIn; i += 1) {
      if (x >= SW_X && x <= SW_X + SW_W && y >= swY(i) - SW_H / 2 && y <= swY(i) + SW_H / 2) {
        return 'sw:' + i;
      }
    }
    for (let i = 0; i < model.gates.length; i += 1) {
      const g = model.gates[i];
      for (let k = 0; k < nPins(g.type); k += 1) {
        if (!g.in[k]) continue;
        const p0 = srcPos(g.in[k]);
        if (p0 && nearPath(x, y, p0, inPin(g, k))) return 'wire:' + i + ':' + k;
      }
    }
    return null;
  }

  /* ---------- 工具条 ---------- */
  const typeBtns = TYPES.map((t) => {
    const b = mkBtn(t.name);
    b.addEventListener('click', () => {
      if (sel >= 0 && model.gates[sel]) {
        const g = model.gates[sel];
        g.type = t.id;
        g.in = g.in.slice(0, nPins(t.id));
        /* 换类型后可能留下指向自己的连线？环路允许，状态栏会报振荡 */
      } else {
        const n = model.gates.length;
        model.gates.push({
          id: nextId,
          type: t.id,
          x: clamp(150 + (n % 2) * 130, 96, Math.max(100, cv.W - 200)),
          y: clamp(TOP + 10 + (n % 3) * 66, TOP, BOT - GH),
          in: [],
        });
        nextId += 1;
        sel = model.gates.length - 1;
      }
      draw();
    });
    return b;
  });
  const delBtn = mkBtn('删除所选');
  const clearBtn = mkBtn('清空连线');
  delBtn.addEventListener('click', () => {
    if (sel < 0 || !model.gates[sel]) return;
    const id = model.gates[sel].id;
    model.gates.splice(sel, 1);
    model.gates.forEach((g) => {
      g.in = g.in.map((s) => (s && s.kind === 'gate' && s.id === id ? null : s));
    });
    if (model.out && model.out.kind === 'gate' && model.out.id === id) model.out = null;
    sel = -1;
    draw();
  });
  clearBtn.addEventListener('click', () => {
    model.gates.forEach((g) => { g.in = g.in.map(() => null); });
    model.out = null;
    draw();
  });
  host.appendChild(buildToolbar(...typeBtns, delBtn, clearBtn));

  /* ---------- 绘制 ---------- */
  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const ev = evaluate();
    const V = ev.values;
    const val = (src) => {
      if (!src) return X;
      const n = sigName(src);
      return V[n] === undefined ? X : V[n];
    };
    const fVal = V.F === undefined ? X : V.F;

    label(ctx, '拖门搬家 · 从右侧○拖到左侧●连线 · 点开关拨 0/1 · 点线删线',
      8, 16, C.grid, { size: 10 });

    /* 输入开关 */
    for (let i = 0; i < nIn; i += 1) {
      const v = model.sw[i];
      const x = SW_X;
      const y = swY(i) - SW_H / 2;
      ctx.fillStyle = v ? C.named('green') : C.soft;
      ctx.fillRect(x, y, SW_W, SW_H);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, SW_W, SW_H);
      label(ctx, INPUT_NAMES[i] + '=' + v, x + SW_W / 2, y + 18,
        v ? C.bg : C.fg, { align: 'center', size: 11, weight: 700 });
      ctx.fillStyle = v ? C.named('green') : C.axis;
      ctx.beginPath();
      ctx.arc(x + SW_W, swY(i), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 连线 */
    model.gates.forEach((g) => {
      g.in.forEach((src, k) => {
        if (!src) return;
        const p0 = srcPos(src);
        if (!p0) return;
        drawWire(ctx, p0, inPin(g, k), val(src));
      });
    });
    const op = srcPos(model.out);
    const nb = nodeBox();
    if (op) drawWire(ctx, op, { x: nb.x, y: nb.y + nb.h / 2 }, fVal);

    /* 橡皮筋 */
    if (drag && drag.kind === 'wire') {
      const p0 = drag.fromPos;
      ctx.save();
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(drag.x, drag.y);
      ctx.stroke();
      ctx.restore();
    }

    /* 门 */
    model.gates.forEach((g, i) => {
      const b = gateBox(g);
      const v = val({ kind: 'gate', id: g.id });
      ctx.fillStyle = C.bg;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = i === sel ? C.accent2 : C.axis;
      ctx.lineWidth = i === sel ? 2.4 : 1.4;
      if (i === sel) ctx.setLineDash([5, 3]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
      label(ctx, typeName(g.type), b.x + b.w / 2, b.y + b.h / 2 + 1,
        C.fg, { align: 'center', size: 13, weight: 700 });
      label(ctx, '第 ' + (i + 1) + ' 个门', b.x + b.w / 2, b.y + b.h - 5,
        C.grid, { align: 'center', size: 9 });
      /* 输出值徽标 */
      ctx.fillStyle = v === 1 ? C.ok : v === X ? C.named('red') : C.soft;
      ctx.beginPath();
      ctx.arc(b.x + b.w, b.y + b.h / 2, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.stroke();
      label(ctx, v === X ? 'X' : String(v), b.x + b.w, b.y + b.h / 2 + 4,
        v === 1 ? C.bg : v === X ? C.bg : C.fg,
        { align: 'center', size: 9, weight: 700 });
      /* 输入引脚 */
      for (let k = 0; k < nPins(g.type); k += 1) {
        const p = inPin(g, k);
        const pv = val(g.in[k]);
        ctx.fillStyle = g.in[k] ? (pv === 1 ? C.ok : pv === X ? C.named('red') : C.axis) : C.bg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      /* 悬空输入提示 */
      if (g.in.slice(0, nPins(g.type)).some((s) => !s)) {
        label(ctx, '悬空', b.x - 4, b.y - 4, C.named('red'), { align: 'right', size: 9 });
      }
    });

    /* 输出灯泡 */
    ctx.fillStyle = fVal === 1 ? C.named('amber') : fVal === X ? C.named('red') : C.soft;
    ctx.beginPath();
    ctx.arc(nb.x + nb.w / 2, nb.y + nb.h / 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    label(ctx, fVal === X ? 'X' : String(fVal), nb.x + nb.w / 2, nb.y + nb.h / 2 + 5,
      fVal === 0 ? C.fg : C.bg, { align: 'center', size: 15, weight: 700 });
    label(ctx, '输出 F', nb.x + nb.w / 2, nb.y + nb.h + 14, C.fg, { align: 'center', size: 10 });
    if (!model.out) label(ctx, '（没接线）', nb.x + nb.w / 2, nb.y - 6, C.named('red'),
      { align: 'center', size: 9 });

    /* 拖拽落点高亮 */
    if (hoverPin) {
      let hp = null;
      if (hoverPin.kind === 'node') hp = { x: nb.x, y: nb.y + nb.h / 2, r: 22 };
      else if (hoverPin.kind === 'in') {
        if (hoverPin.g !== undefined) hp = Object.assign(inPin(model.gates[hoverPin.g], hoverPin.k), { r: 10 });
        else {
          const i = INPUT_NAMES.indexOf(hoverPin.name);
          if (i >= 0) hp = { x: SW_X + SW_W, y: swY(i), r: 10 };
        }
      } else if (hoverPin.kind === 'gate') {
        const gg = model.gates.find((q) => q.id === hoverPin.id);
        if (gg) hp = Object.assign(outPin(gg), { r: 11 });
      }
      if (hp) {
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, hp.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    /* ---------- 整张电路的真值表 ---------- */
    const rows = 2 ** nIn;
    const tTop = BOT + 34;
    const rowH = Math.min(17, Math.max(9, (H - tTop - 12) / (rows + 1)));
    const colW = Math.min(52, (W - 40) / (nIn + 1));
    const tX = 14;
    label(ctx, '整张电路的真值表（' + rows + ' 行 = 2^' + nIn + ' 种输入组合，高亮行 = 当前开关）',
      tX, tTop - 10, C.fg, { size: 11, weight: 600 });
    const cur = model.sw.reduce((acc, v, i) => acc + v * 2 ** (nIn - 1 - i), 0);
    for (let k = 0; k < nIn; k += 1) {
      label(ctx, INPUT_NAMES[k], tX + colW * k + colW / 2, tTop + rowH - 3,
        C.grid, { align: 'center', size: 10, weight: 700 });
    }
    label(ctx, 'F', tX + colW * nIn + colW / 2, tTop + rowH - 3,
      C.grid, { align: 'center', size: 10, weight: 700 });
    for (let m = 0; m < rows; m += 1) {
      const y = tTop + (m + 1) * rowH;
      if (m === cur) {
        ctx.fillStyle = C.soft;
        ctx.fillRect(tX - 4, y - rowH + 2, colW * (nIn + 1) + 8, rowH - 1);
      }
      for (let k = 0; k < nIn; k += 1) {
        const b = (m >> (nIn - 1 - k)) & 1;
        label(ctx, String(b), tX + colW * k + colW / 2, y + rowH - 4,
          b ? C.fg : C.grid, { align: 'center', size: 10 });
      }
      const sv = [];
      for (let k = 0; k < nIn; k += 1) sv.push((m >> (nIn - 1 - k)) & 1);
      const out = evaluate(sv).values.F;
      const ov = out === undefined ? X : out;
      label(ctx, ov === X ? 'X' : String(ov), tX + colW * nIn + colW / 2, y + rowH - 4,
        ov === 1 ? C.ok : ov === X ? C.named('red') : C.grid,
        { align: 'center', size: 10, weight: 700 });
    }

    /* ---------- 读数 ---------- */
    const g = model.gates[sel];
    ro.set('当前输入', model.sw.map((v, i) => INPUT_NAMES[i] + '=' + v).join('　')
      + '　（= ' + cur + '）');
    ro.set('输出 F', fVal === X ? 'X（未定：有悬空输入或组合环）'
      : fVal === 1 ? '1（灯亮）' : '0（灯灭）');
    ro.set('所选门', g ? '第 ' + (sel + 1) + ' 个 · ' + typeName(g.type)
      + '（' + (TYPES.find((t) => t.id === g.type) || {}).cn + '门）　→ 输出 ' + (val({ kind: 'gate', id: g.id }) === X ? 'X' : val({ kind: 'gate', id: g.id }))
      : '（未选中，点一个门）');
    if (g) {
      const tt = truthTable(g.type, nPins(g.type));
      ro.set('门真值表', tt.map((r) => r.inputs.join('') + '→'
        + (r.out === X ? 'X' : r.out)).join('　'));
    } else {
      ro.set('门真值表', '—');
    }
    let nw = 0;
    model.gates.forEach((q) => { q.in.forEach((s2) => { if (s2) nw += 1; }); });
    ro.set('门数 / 连线', model.gates.length + ' 个门 / ' + nw + ' 根线（+ 1 根输出线）');
    ro.set('状态', ev.stable
      ? (fVal === X
        ? '有悬空输入：该处按未定态 X 处理（' + ev.iterations + ' 轮迭代收敛）'
        : '稳态　' + ev.iterations + ' 轮迭代后不再变化')
      : '⚠ 振荡：你接出了组合环（输出绕回输入），' + ev.iterations + ' 轮仍不收敛');
  }

  /* ---------- 指针交互 ---------- */
  function dropTarget(x, y) {
    for (let i = 0; i < model.gates.length; i += 1) {
      const g = model.gates[i];
      for (let k = 0; k < nPins(g.type); k += 1) {
        const p = inPin(g, k);
        if (Math.hypot(p.x - x, p.y - y) < 14) return { kind: 'in', g: i, k };
      }
    }
    const nb = nodeBox();
    if (x >= nb.x - 24 && x <= nb.x + nb.w && y >= nb.y - 8 && y <= nb.y + nb.h + 8) {
      return { kind: 'node' };
    }
    return null;
  }
  function dropSource(x, y) {
    for (let i = 0; i < model.gates.length; i += 1) {
      const p = outPin(model.gates[i]);
      if (Math.hypot(p.x - x, p.y - y) < 14) return { kind: 'gate', id: model.gates[i].id };
    }
    for (let i = 0; i < nIn; i += 1) {
      if (x >= SW_X && x <= SW_X + SW_W + 12 && Math.abs(y - swY(i)) < 14) {
        return { kind: 'in', name: INPUT_NAMES[i] };
      }
    }
    return null;
  }

  bindPointer(cv.canvas, {
    pick: (x, y) => hit(x, y),
    down(id, x, y) {
      const p = id.split(':');
      if (p[0] === 'sw') {
        const i = +p[1];
        model.sw[i] = model.sw[i] ? 0 : 1;
        draw();
        drag = null;
        return;
      }
      if (p[0] === 'out') {
        const g = model.gates[+p[1]];
        drag = { kind: 'wire', from: { kind: 'gate', id: g.id }, fromPos: outPin(g), x, y };
        return;
      }
      if (p[0] === 'in') {
        const g = model.gates[+p[1]];
        const k = +p[2];
        drag = { kind: 'rev', target: { g: +p[1], k }, x, y, moved: false };
        sel = +p[1];
        void g;
        draw();
        return;
      }
      if (p[0] === 'node') {
        drag = { kind: 'rev', target: { node: true }, x, y, moved: false };
        draw();
        return;
      }
      if (p[0] === 'gate') {
        const i = +p[1];
        sel = i;
        const g = model.gates[i];
        drag = { kind: 'gate', i, dx: x - g.x, dy: y - g.y, moved: false };
        draw();
        return;
      }
      if (p[0] === 'wire') {
        drag = { kind: 'cut', g: +p[1], k: +p[2] };
        return;
      }
      sel = -1;
      drag = null;
      draw();
    },
    move(id, x, y) {
      if (!drag) return;
      void id;
      drag.moved = true;
      if (drag.kind === 'gate') {
        const g = model.gates[drag.i];
        g.x = clamp(x - drag.dx, 92, Math.max(96, cv.W - GW - 92));
        g.y = clamp(y - drag.dy, TOP, BOT - GH);
      } else if (drag.kind === 'wire') {
        drag.x = x;
        drag.y = y;
        hoverPin = dropTarget(x, y);
      } else if (drag.kind === 'rev') {
        drag.x = x;
        drag.y = y;
        hoverPin = dropSource(x, y);
      }
      draw();
    },
    up(id, x, y) {
      void id;
      if (!drag) return;
      if (drag.kind === 'wire') {
        const t = dropTarget(x, y);
        if (t && t.kind === 'in') model.gates[t.g].in[t.k] = drag.from;
        else if (t && t.kind === 'node') model.out = drag.from;
      } else if (drag.kind === 'rev') {
        if (!drag.moved) {
          /* 原地一点 = 删掉这根线 */
          if (drag.target.node) model.out = null;
          else model.gates[drag.target.g].in[drag.target.k] = null;
        } else {
          const src = dropSource(x, y);
          if (src) {
            if (drag.target.node) model.out = src;
            else model.gates[drag.target.g].in[drag.target.k] = src;
          }
        }
      } else if (drag.kind === 'cut' && !drag.moved) {
        model.gates[drag.g].in[drag.k] = null;
      }
      drag = null;
      hoverPin = null;
      draw();
    },
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
