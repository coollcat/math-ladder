/* 中间表示与优化：同一段三地址码，开关四个经典优化，看 IR 怎么变短、指令数怎么掉。
   所有变换都是真的算出来的（常量折叠、CSE、活跃变量死代码删除、循环不变量外提）。 */
import { themeColors, buildToolbar, buildReadout, el, mkBtn, fmt } from '../core.js';

const IR0 = [
  { dst: 't1', op: '*', a: '4', b: '2' },
  { dst: 't2', op: '+', a: 'a', b: 'b' },
  { dst: 't3', op: '+', a: 'a', b: 'b' },
  { dst: 't4', op: '*', a: 't1', b: 'x' },
  { dst: 't5', op: '*', a: 't2', b: '2' },
  { dst: 't6', op: '*', a: 't2', b: '2' },
  { dst: 't7', op: '*', a: 't6', b: '0' },
  { dst: 'y', op: '+', a: 't4', b: 't3' },
  { dst: 'z', op: '+', a: 't5', b: 't6' },
  { dst: 't9', op: '*', a: 'k', b: '4', loop: true },
  { dst: 't10', op: '[]', a: 'arr', b: 't9', loop: true },
  { dst: 's', op: '+', a: 's', b: 't10', loop: true },
  { dst: 'i', op: '+', a: 'i', b: '1', loop: true },
];
const EXIT_LIVE = ['y', 'z', 's', 'i'];
const isNum = (v) => /^-?\d+(\.\d+)?$/.test(v);
const OPS = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };
const text = (ins) => (ins.op === '[]' ? `${ins.dst} = ${ins.a}[${ins.b}]` : `${ins.dst} = ${ins.a} ${ins.op} ${ins.b}`);

/* ① 常量折叠 + 代数化简：能算的当场算，x*0、x*1、x+0 直接消掉 */
function foldPass(ir) {
  return ir.map((ins) => {
    if (ins.op === '[]') return ins;
    if (isNum(ins.a) && isNum(ins.b)) {
      const v = OPS[ins.op](parseFloat(ins.a), parseFloat(ins.b));
      return { ...ins, op: '=', a: String(v), b: '', note: '常量折叠' };
    }
    if (ins.op === '*' && (ins.a === '0' || ins.b === '0')) return { ...ins, op: '=', a: '0', b: '', note: '代数化简 x·0=0' };
    if (ins.op === '*' && (ins.a === '1' || ins.b === '1')) return { ...ins, op: '=', a: ins.a === '1' ? ins.b : ins.a, b: '', note: '代数化简 x·1=x' };
    if (ins.op === '+' && (ins.a === '0' || ins.b === '0')) return { ...ins, op: '=', a: ins.a === '0' ? ins.b : ins.a, b: '', note: '代数化简 x+0=x' };
    return ins;
  });
}

/* ② 公共子表达式消除：同一表达式第二次出现就直接复用；操作数被重定义则失效 */
function csePass(ir) {
  const seen = {};
  const out = ir.map((ins) => {
    const key = `${ins.op}|${ins.a}|${ins.b}`;
    const hit = seen[key];
    Object.keys(seen).forEach((k) => {
      const p = k.split('|');
      if (p[1] === ins.dst || p[2] === ins.dst) delete seen[k];
    });
    if (!hit) {
      seen[key] = ins.dst;
      return ins;
    }
    return { ...ins, op: '=', a: hit, b: '', note: '公共子表达式消除' };
  });
  return out;
}

/* ③ 死代码删除：从出口活跃变量倒着推，算了没人用的直接删 */
function deadPass(ir) {
  const live = new Set(EXIT_LIVE);
  const keep = ir.map(() => true);
  for (let i = ir.length - 1; i >= 0; i -= 1) {
    const ins = ir[i];
    if (!live.has(ins.dst)) {
      keep[i] = false;
      continue;
    }
    live.delete(ins.dst);
    if (ins.a) live.add(ins.a);
    if (ins.b) live.add(ins.b);
  }
  return ir.filter((_, i) => keep[i]);
}

/* ④ 循环不变量外提：操作数在循环里不会被改写的，提到循环前面只算一次 */
function licmPass(ir) {
  const modified = new Set(ir.filter((x) => x.loop).map((x) => x.dst));
  const hoist = [];
  const rest = [];
  ir.forEach((ins) => {
    if (ins.loop && ins.op !== '[]' && !modified.has(ins.a) && !modified.has(ins.b)) {
      hoist.push({ ...ins, loop: false, note: '循环不变量外提' });
    } else rest.push(ins);
  });
  if (!hoist.length) return ir;
  const at = rest.findIndex((x) => x.loop);
  return [...rest.slice(0, at), ...hoist, ...rest.slice(at)];
}

export default function render(host) {
  const C0 = themeColors();
  const on = { fold: false, cse: false, dead: false, licm: false };

  const ro = buildReadout({ 指令数: '—', 变化: '—', 注释: '—' });
  const wrap = el('div');
  wrap.style.cssText = 'display:flex;gap:0;flex-wrap:wrap;border-top:1px dashed ' + C0.grid;
  const left = el('div');
  const right = el('div');
  [left, right].forEach((d) => {
    d.style.cssText = `flex:1 1 240px;min-width:220px;padding:0.5rem 0.85rem;
      font:12px/1.65 var(--pyr-mono,monospace);white-space:pre;overflow-x:auto`;
  });
  wrap.append(left, right);

  const bar = buildToolbar();
  host.append(bar, ro.box, wrap);

  function toggle(label, key) {
    const b = mkBtn(label);
    const sync = () => {
      const C = themeColors();
      b.style.background = on[key] ? C.accent : '';
      b.style.color = on[key] ? C.bg : '';
      b.style.borderColor = on[key] ? C.accent : '';
    };
    b.addEventListener('click', () => {
      on[key] = !on[key];
      sync();
      apply();
    });
    bar.appendChild(b);
    sync();
    return { sync };
  }
  const btns = [toggle('常量折叠', 'fold'), toggle('公共子表达式', 'cse'), toggle('死代码删除', 'dead'), toggle('循环不变量外提', 'licm')];
  const allBtn = mkBtn('全开 / 全关');
  bar.appendChild(allBtn);
  allBtn.addEventListener('click', () => {
    const anyOn = Object.keys(on).some((k) => on[k]);
    Object.keys(on).forEach((k) => { on[k] = !anyOn; });
    btns.forEach((b) => b.sync());
    apply();
  });

  function apply() {
    const C = themeColors();
    let ir = IR0.map((x) => ({ ...x }));
    if (on.fold) ir = foldPass(ir);
    if (on.cse) ir = csePass(ir);
    if (on.dead) ir = deadPass(ir);
    if (on.licm) ir = licmPass(ir);

    let changed = 0;
    let del = 0;
    let moved = 0;
    left.textContent = '';
    right.textContent = '';
    left.appendChild(line('优化前（13 条三地址码）', C.fg, true));
    right.appendChild(line(`优化后（${ir.length} 条）`, C.fg, true));

    IR0.forEach((orig) => {
      left.appendChild(line((orig.loop ? 'L1:  ' : '     ') + text(orig), C.fg));
      const now = ir.find((x) => x.dst === orig.dst);
      if (!now) {
        del += 1;
        const d = line('     ' + text(orig) + '   ← 已删除', C.bad);
        d.style.textDecoration = 'line-through';
        right.appendChild(d);
        return;
      }
      const pre = now.loop ? 'L1:  ' : now.note === '循环不变量外提' ? ' ↑   ' : '     ';
      const newText = text(now);
      const diff = newText !== text(orig);
      if (diff) changed += 1;
      if (now.note === '循环不变量外提') moved += 1;
      const d = line(pre + newText + (now.note && diff ? `   ← ${now.note}` : ''), diff ? C.accent2 : C.fg);
      right.appendChild(d);
    });

    ro.set('指令数', `${IR0.length} → ${ir.length}`);
    ro.set('变化', `改写 ${changed} 条 / 删除 ${del} 条 / 外提 ${moved} 条`);
    ro.set('注释', `减少 ${fmt(((IR0.length - ir.length) / IR0.length) * 100, 1)}%`);
  }

  function line(t, color, bold) {
    const d = el('div', null, t);
    d.style.color = color;
    if (bold) d.style.fontWeight = '700';
    return d;
  }

  apply();
  return { destroy() {} };
}
