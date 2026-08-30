/* 词法与语法：一串字符先被切成 token（词法），再按文法长成一棵树（语法）。
   拖「解析步」可以看树是怎么一步步长出来的——这正是自底向上/递归下降的思路。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders,
  buildReadout, el, label, clamp,
} from '../core.js';

const SAMPLES = {
  a: '3 + 4 * 5',
  b: '(a + b) * (c - 2)',
  c: 'x = 1 + 2 * 3',
};
const KIND_COLOR = { num: 0, id: 2, op: 1, paren: 4, assign: 6 };

/* ---- 词法分析：最长匹配的正则扫描 ---- */
function lex(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    let m = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (m) { out.push({ kind: 'num', text: m[0], i }); i += m[0].length; continue; }
    m = /^[A-Za-z_]\w*/.exec(src.slice(i));
    if (m) { out.push({ kind: 'id', text: m[0], i }); i += m[0].length; continue; }
    if ('+-*/'.includes(ch)) { out.push({ kind: 'op', text: ch, i }); i += 1; continue; }
    if (ch === '=') { out.push({ kind: 'assign', text: ch, i }); i += 1; continue; }
    if ('()'.includes(ch)) { out.push({ kind: 'paren', text: ch, i }); i += 1; continue; }
    out.push({ kind: 'op', text: ch, i });
    i += 1;
  }
  return out;
}

/* ---- 语法分析：递归下降，文法 assign → ID = expr | expr；expr → term (('+'|'-') term)* ---- */
function parse(toks) {
  let p = 0;
  const peek = () => toks[p];
  const node = (label, kind, tok, children) => ({ label, kind, tok, children: children || [] });
  function factor() {
    const t = peek();
    if (!t) throw new Error('意外结束');
    if (t.text === '(') {
      p += 1;
      const e = expr();
      if (peek() && peek().text === ')') p += 1;
      return e;
    }
    p += 1;
    return node(t.text, t.kind, p - 1);
  }
  function term() {
    let left = factor();
    while (peek() && '*/'.includes(peek().text)) {
      const op = peek();
      p += 1;
      left = node(op.text, 'op', p - 1, [left, factor()]);
    }
    return left;
  }
  function expr() {
    let left = term();
    while (peek() && '+-'.includes(peek().text)) {
      const op = peek();
      p += 1;
      left = node(op.text, 'op', p - 1, [left, term()]);
    }
    return left;
  }
  if (toks[1] && toks[0].kind === 'id' && toks[1].text === '=') {
    const id = node(toks[0].text, 'id', 0);
    p = 2;
    const rhs = expr();
    return node('=', 'assign', 1, [id, rhs]);
  }
  return expr();
}

export default function render(host) {
  let key = 'a';
  let toks = lex(SAMPLES[key]);
  let tree = null;
  let step = toks.length;
  let leaves = 1;

  const cv = setupCanvas(host, 250);
  host.appendChild(buildSegmented(
    Object.keys(SAMPLES).map((k) => ({ label: SAMPLES[k], value: k })),
    key, (v) => { key = v; rebuild(); },
  ));

  const chips = el('div');
  chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:0.45rem 0.85rem;align-items:center';
  host.appendChild(chips);
  const ro = buildReadout({ 'token 数': '—', 当前: '—', 树高: '—' });
  host.appendChild(ro.box);

  function depth(n) {
    return 1 + n.children.reduce((a, c) => Math.max(a, depth(c)), 0);
  }
  function layout(n, d, st) {
    n.d = d;
    if (!n.children.length) {
      n.x = st.i;
      st.i += 1;
      return;
    }
    n.children.forEach((c) => layout(c, d + 1, st));
    n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
  }

  function rebuild() {
    toks = lex(SAMPLES[key]);
    try {
      tree = parse(toks);
    } catch (e) {
      tree = { label: '?', kind: 'op', tok: 0, children: [] };
    }
    const st = { i: 0 };
    layout(tree, 0, st);
    leaves = Math.max(st.i, 1);
    step = toks.length;
    sync();
    draw();
  }

  function sync() {
    chips.textContent = '';
    const C = themeColors();
    toks.forEach((t, i) => {
      const sp = el('span', null, t.text);
      const col = C.series(KIND_COLOR[t.kind]);
      sp.style.cssText = `font:12px var(--pyr-mono,monospace);padding:2px 8px;border-radius:4px;
        border:1px solid ${col};color:${i <= step ? C.bg : C.axis};background:${i <= step ? col : 'transparent'};
        opacity:${i <= step ? 1 : 0.45}`;
      chips.appendChild(sp);
    });
    ro.set('token 数', String(toks.length));
    ro.set('当前', step < toks.length ? `第 ${step + 1} 个：${toks[step].text}` : '全部扫描完毕');
    ro.set('树高', String(depth(tree)));
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const padX = 26;
    const sx = (W - padX * 2) / leaves;
    const dy = Math.min(52, (H - 46) / Math.max(depth(tree) - 1, 1));
    const px = (n) => padX + (n.x + 0.5) * sx;
    const py = (n) => 30 + n.d * dy;

    const walk = (n) => {
      const on = n.tok <= step;
      const col = on ? C.series(KIND_COLOR[n.kind] ?? 1) : C.grid;
      n.children.forEach((c) => {
        ctx.strokeStyle = on && c.tok <= step ? C.axis : C.grid;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px(n), py(n));
        ctx.lineTo(px(c), py(c));
        ctx.stroke();
        walk(c);
      });
      ctx.beginPath();
      ctx.arc(px(n), py(n), 15, 0, Math.PI * 2);
      ctx.fillStyle = on ? col : C.soft;
      ctx.globalAlpha = on ? 0.9 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = on ? col : C.grid;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      label(ctx, n.label, px(n), py(n) + 4, on ? C.bg : C.axis, { align: 'center', size: 12, weight: 700 });
    };
    walk(tree);

    label(ctx, '语法分析树（叶子 = 运算对象，内部节点 = 运算符）', 8, 14, C.fg, { size: 11 });
    label(ctx, step < toks.length ? `已读入 ${step + 1}/${toks.length} 个 token` : '归约完成：整棵表达式树',
      8, H - 6, step < toks.length ? C.accent2 : C.ok, { size: 11 });
  }

  const sliders = buildSliders(
    { sliders: [{ name: 'step', label: '解析步', min: 0, max: 20, step: 1, value: step }] },
    (st) => { step = clamp(st.step, 0, toks.length); sync(); draw(); },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc > 0.5) {
        acc = 0;
        step = (step + 1) % (toks.length + 1);
        sync();
        draw();
      }
    },
    onReset() { step = toks.length; sync(); draw(); },
  });

  rebuild();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
