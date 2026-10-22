/* =========================================================================
 * lab 组件：aut-cfg-derive —— 上下文无关文法的推导树生长（第 31 章 · 75 课）
 * -------------------------------------------------------------------------
 * 演示什么：文法 S → SS | (S) | ε 生成串 "(())()" 的**最左推导**。每一步都
 * 挑当前句型里最左边那个还能展开的 S，套一条产生式；树上就长出一层新孩子。
 * 最上面一行实时显示句型（sentential form）：从孤零零的 S 一路变到全是
 * 终结符，正好是课文第 4 节那四步的逐帧版。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-cfg-derive",
 *     "title": "(())() 是怎么被 S → SS | (S) | ε 一步步包出来的" }
 *
 * 字段（都可省）：
 *   height  画布高度，默认 500
 *   step    初始步数（默认 0），给个数可以直接跳到推导完的样子
 *
 * 能玩什么：
 *   - 「单步」套一条产生式；「回退」把上一步的树整棵取回
 *   - 橙框 = 下一步要被展开的那个 S；虚线框 = 这一步刚长出来的孩子
 *   - 底部列出三条产生式，并数出各用了几次
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg,
  buildToolbar, buildReadout, anim, mkBtn,
} from '../core.js';

const PRODS = [
  { lhs: 'S', rhs: ['S', 'S'], label: 'S → SS', note: '把一句拆成两句并排' },
  { lhs: 'S', rhs: ['(', 'S', ')'], label: 'S → (S)', note: '给内层套一对括号' },
  { lhs: 'S', rhs: ['ε'], label: 'S → ε', note: '收尾：这一支到此为止' },
];

/* 最左推导的剧本：每个数字是这一步要套的产生式下标 */
const SCRIPT = [0, 1, 1, 2, 1, 2];
const TARGET = '(())()';

function newNode(sym, parent) {
  return {
    sym, children: [], parent, parentRef: null, id: 0, fresh: false, depth: 0,
  };
}

/* 按前 n 步重建整棵树（节点数只有十几个，重建比增量改更不容易错） */
function buildTree(n) {
  const root = newNode('S', null);
  for (let k = 0; k < n; k += 1) {
    const target = leftmostVar(root);
    if (!target) break;
    const p = PRODS[SCRIPT[k] === undefined ? 2 : SCRIPT[k]];
    target.children = p.rhs.map((s) => {
      const c = newNode(s, target);
      c.parentRef = target;
      return c;
    });
  }
  return root;
}

function leftmostVar(node) {
  if (node.sym !== 'S') return null;
  if (!node.children.length) return node;
  for (let i = 0; i < node.children.length; i += 1) {
    const r = leftmostVar(node.children[i]);
    if (r) return r;
  }
  return null;
}

function frontier(root, out) {
  if (!root.children.length) { out.push(root.sym); return out; }
  root.children.forEach((c) => frontier(c, out));
  return out;
}

/* 叶子按从左到右编号，内部节点取孩子们的中点 */
function assignX(root) {
  let leaf = 0;
  (function walk(n, depth) {
    n.depth = depth;
    if (!n.children.length) {
      n.x = leaf;
      leaf += 1;
      return;
    }
    n.children.forEach((c) => walk(c, depth + 1));
    n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
  })(root, 0);
  return leaf;
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 300, 760) : 500;
  const total = SCRIPT.length;
  let step = Number.isFinite(spec.step) ? clamp(Math.round(spec.step), 0, total) : 0;

  const ro = buildReadout({
    步数: '—',
    当前句型: '—',
    这一步用的产生式: '—',
    距目标: '—',
  });
  host.appendChild(ro.box);

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  const bAll = mkBtn('一键推完');
  const bZero = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bBack, bAll, bZero));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, w: 0, h: 0, narrow: false };

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    geo.narrow = W < 620;
    geo.x = 12;
    geo.y = 64;
    geo.w = W - 24;
    geo.h = Math.max(Hh - 190, 120);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const root = buildTree(step);
    const form = frontier(root, []);
    const nLeaves = assignX(root);
    const nextVar = leftmostVar(root);
    const used = [0, 0, 0];
    /* 刚刚被展开的那个节点：它的孩子就是「新长出来的」 */
    const freshParent = step > 0 ? leftmostVar(buildTree(step - 1)) : null;
    (function mark(n) {
      n.fresh = !!(freshParent && n.parentRef === freshParent);
      n.children.forEach(mark);
    })(root);
    for (let k = 0; k < step; k += 1) used[SCRIPT[k]] += 1;

    label(ctx, '文法 S → SS | (S) | ε　目标串 ' + TARGET,
      geo.x + 2, 16, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });

    /* 句型 */
    label(ctx, '当前句型：' + form.join('').replace(/ε/g, ''),
      geo.x + 2, 34, C.accent, { size: geo.narrow ? 11 : 12.5, weight: 700 });
    label(ctx, '最左推导：每步只展开句型里最左边那个 S',
      geo.x + 2, 50, C.grid, { size: 10 });

    /* 树 */
    const pad = 26;
    const cellW = Math.min((geo.w - pad * 2) / Math.max(nLeaves, 1), 74);
    const maxDepth = (() => {
      let d = 0;
      (function walk(n) { d = Math.max(d, n.depth); n.children.forEach(walk); })(root, 0);
      return d;
    })();
    /* 把树的可用高度摊给各层（至少 34 像素一层，超出则整体下压） */
    const level = Math.max(Math.min(56, (geo.h - 30) / Math.max(maxDepth, 1)), 30);
    const ox = geo.x + geo.w / 2 - ((nLeaves - 1) * cellW) / 2;
    const oy = geo.y + 16;

    /* 先画边 */
    (function edgesOf(n) {
      n.children.forEach((c) => {
        const x1 = ox + n.x * cellW;
        const y1 = oy + n.depth * level;
        const x2 = ox + c.x * cellW;
        const y2 = oy + c.depth * level;
        ctx.save();
        ctx.strokeStyle = c.fresh ? C.accent2 : C.axis;
        ctx.lineWidth = c.fresh ? 1.8 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + 9);
        ctx.lineTo(x2, y2 - 11);
        ctx.stroke();
        ctx.restore();
        edgesOf(c);
      });
    })(root);

    /* 再画节点：变量画方框，终结符直接写字符 */
    const justApplied = step > 0 ? buildTree(step) : null;
    void justApplied;
    (function nodesOf(n) {
      const x = ox + n.x * cellW;
      const y = oy + n.depth * level;
      const isNext = nextVar === n;
      if (n.sym === 'S') {
        ctx.save();
        ctx.fillStyle = isNext ? C.accent2 : C.soft;
        ctx.globalAlpha = isNext ? 0.28 : 0.9;
        roundRect(ctx, x - 11, y - 9, 22, 18, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isNext ? C.accent2 : C.axis;
        ctx.lineWidth = isNext ? 2 : 1.1;
        roundRect(ctx, x - 11, y - 9, 22, 18, 5);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'S', x, y + 4, isNext ? C.accent2 : C.fg, { size: 11.5, align: 'center', weight: 700 });
      } else if (n.sym === 'ε') {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.named('gray');
        ctx.lineWidth = 1;
        roundRect(ctx, x - 10, y - 9, 20, 18, 4);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'ε', x, y + 4, C.named('gray'), { size: 11.5, align: 'center' });
      } else {
        label(ctx, n.sym, x, y + 4, C.named('teal'), { size: 12.5, align: 'center', weight: 700 });
      }
      n.children.forEach(nodesOf);
    })(root);

    /* 产生式清单 */
    const listY = cv.H - 96;
    label(ctx, '产生式（本推导中的使用次数）', geo.x + 2, listY, C.axis, { size: 10 });
    PRODS.forEach((p, i) => {
      const y = listY + 16 + i * 15;
      const isCur = step > 0 && SCRIPT[step - 1] === i;
      label(ctx, (isCur ? '▶ ' : '　 ') + p.label + '　×' + used[i] + '　— ' + p.note,
        geo.x + 6, y, isCur ? C.accent2 : C.fg,
        { size: 10, weight: isCur ? 700 : 400 });
    });

    label(ctx, '所有叶子拼起来就是生成的串；读树时从上往下是「替换」，从下往上是「归约」',
      geo.x + 2, cv.H - 8, C.grid, { size: 10 });

    /* 读数 */
    ro.set('步数', step + ' / ' + total);
    ro.set('当前句型', form.join(' ').replace(/ε/g, 'ε') + (nextVar ? '' : '　（已经全是终结符）'));
    ro.set('这一步用的产生式', step > 0
      ? PRODS[SCRIPT[step - 1]].label + '　（' + PRODS[SCRIPT[step - 1]].note + '）'
      : '还没开始：整棵树只有根 S');
    /* 比较前必须去掉 ε：frontier() 会把 ε 也当叶子推进 out，
       而 TARGET = '(())()' 里没有 ε。不去掉的话 form 永远等不到目标串，
       成功分支永远走不到，读数条会一直报「推导跑完，但生成的串是 ((ε))(ε)」，
       而同一帧的画布（下面 label 那行已 replace(/ε/g,'')）却显示 '(())()'。 */
    ro.set('距目标', form.join('').replace(/ε/g, '') === TARGET
      ? '已生成目标串 ' + TARGET
      : (step >= total ? '推导跑完，但生成的串是 ' + form.join('').replace(/ε/g, '')
        : '还差 ' + (total - step) + ' 步'));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.9) return;
      acc = 0;
      step = step >= total ? 0 : step + 1;
      draw();
    },
    onReset() { acc = 0; step = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    step = Math.min(step + 1, total);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    step = Math.max(step - 1, 0);
    draw();
  });
  bAll.addEventListener('click', () => {
    controls.stop();
    step = total;
    draw();
  });
  bZero.addEventListener('click', () => {
    controls.stop();
    step = 0;
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
