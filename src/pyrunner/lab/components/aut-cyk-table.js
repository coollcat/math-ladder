/* =========================================================================
 * lab 组件：aut-cyk-table —— CYK 三角表的填表过程（第 31 章 · 85 课）
 * -------------------------------------------------------------------------
 * 演示什么：把 CNF 文法 S → AB | SS、A → a、B → b 作用在串 "abab" 上，一张
 * 三角表从斜边往顶上填。第 (i, j) 格存的是「子串 a_i…a_j 能由哪些变量推导」。
 * 每按一次「单步」只算一格：枚举切点 k，把左半 T[i,k] 与右半 T[k+1,j] 里
 * 的变量两两配对，查二元规则表，命中的左边变量就是这一格的答案。
 *
 * 顶部那句话是 CYK 的全部结论：**S 出现在覆盖全串的顶格 ⟺ 串属于文法**。
 *
 * 用法（课文 lab 围栏）：
 *   { "type": "aut-cyk-table",
 *     "title": "对 abab 填 CYK 三角表：顶格有 S 就接受",
 *     "input": "abab" }
 *
 * 字段（都可省）：
 *   input    只保留 a / b；滤空或未给就用 "abab"（若长度超过 8，超出部分忽略）
 *   height   画布高度，默认 470
 *   step     初始步数（默认 0）
 *
 * 能玩什么：
 *   - 「单步」填一格（先填所有长度 1，再长度 2、3……）；「回退」擦掉上一格
 *   - 悬停（手机点按）任意一格，读数条列出这一格的每条命中：哪个切点、哪两个变量、哪条规则
 *   - 换输入串看看哪些串能生成、哪些不能
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, clearBg, bindPointer,
  buildToolbar, buildReadout, buildSegmented, anim, mkBtn,
} from '../core.js';

const SINGLE = { a: ['A'], b: ['B'] };
const PAIRS = [
  { from: ['A', 'B'], to: 'S' },
  { from: ['S', 'S'], to: 'S' },
];

/* 预设标签里的接受/拒绝都是按本课文法实算过的（见报告里的核对输出），不许写猜的 */
const PRESETS = [
  { label: 'abab·接受', value: 'abab' },
  { label: 'ab·接受', value: 'ab' },
  { label: 'abb·拒绝', value: 'abb' },
  { label: 'ba·拒绝', value: 'ba' },
];

function clean(raw) {
  const s = typeof raw === 'string' ? raw : '';
  let o = '';
  for (let i = 0; i < s.length && o.length < 8; i += 1) if (s[i] === 'a' || s[i] === 'b') o += s[i];
  return o;
}

const key = (i, j) => i + ',' + j;

/* 逐格计算：返回 framed 的填表序列（每一步只多一格） */
function schedule(input) {
  const n = input.length;
  const cells = [];
  for (let span = 1; span <= n; span += 1) {
    for (let i = 0; i + span - 1 < n; i += 1) cells.push({ i, j: i + span - 1, span });
  }
  return cells;
}

/* 算一格：返回 { vars, hits }，hits 记每条命中来源 */
function computeCell(input, table, i, j) {
  if (i === j) {
    const vs = SINGLE[input[i]] || [];
    return { vars: vs.slice(), hits: vs.map((v) => ({ rule: v + ' → ' + input[i], from: '终结符规则' })) };
  }
  const vars = [];
  const hits = [];
  for (let k = i; k < j; k += 1) {
    const L = (table[key(i, k)] || {}).vars || [];
    const R = (table[key(k + 1, j)] || {}).vars || [];
    L.forEach((b) => {
      R.forEach((c) => {
        PAIRS.forEach((p) => {
          if (p.from[0] === b && p.from[1] === c && vars.indexOf(p.to) < 0) {
            vars.push(p.to);
            hits.push({ rule: p.to + ' → ' + b + c, from: '切在 ' + (k + 1) + ' 与 ' + (k + 2) + ' 之间' });
          } else if (p.from[0] === b && p.from[1] === c) {
            hits.push({ rule: p.to + ' → ' + b + c, from: '切在 ' + (k + 1) + ' 与 ' + (k + 2) + ' 之间（重复）' });
          }
        });
      });
    });
  }
  return { vars, hits };
}

export default function render(host, spec) {
  const H = Number.isFinite(spec.height) ? clamp(spec.height, 300, 760) : 470;
  const init = clean(spec.input) || 'abab';
  let input = init;
  let order = schedule(input);
  let step = Number.isFinite(spec.step) ? clamp(Math.round(spec.step), 0, order.length) : 0;
  let hover = null;

  const ro = buildReadout({
    这一格: '—',
    命中的规则: '—',
    填入的变量: '—',
    '顶格结论': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(PRESETS, init, (v) => {
    input = v;
    order = schedule(input);
    step = 0;
    hover = null;
    draw();
  }));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 回退');
  const bAll = mkBtn('一键填满');
  host.appendChild(buildToolbar(bStep, bBack, bAll));

  const cv = setupCanvas(host, H);
  const geo = { x: 0, y: 0, cell: 0, narrow: false, n: 0, gridX: 0, gridY: 0 };

  function table(upTo) {
    const t = {};
    for (let k = 0; k < upTo; k += 1) {
      const c = order[k];
      if (c.i === c.j) t[key(c.i, c.j)] = computeCell(input, t, c.i, c.j);
      else t[key(c.i, c.j)] = computeCell(input, t, c.i, c.j);
    }
    return t;
  }

  function layout() {
    const W = cv.W;
    const Hh = cv.H;
    const n = input.length;
    geo.n = n;
    geo.narrow = W < 620;
    geo.cell = Math.min((W - 130) / Math.max(n, 1), (Hh - 180) / Math.max(n, 1), 62);
    geo.gridX = 46;
    geo.gridY = 74;
    geo.x = geo.gridX;
    geo.y = geo.gridY;
  }

  /* 标准画法：最下一行是长度 1 的对角线（a₁a₂…aₙ 依次排开），
     往上每行长度 +1，最顶上一行只剩覆盖全串的那一格。 */
  const cellAt = (i, j) => ({
    x: geo.gridX + i * geo.cell,
    y: geo.gridY + (geo.n - 1 - (j - i)) * geo.cell,
  });

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    clearBg(ctx, cv.W, cv.H, C);
    layout();
    const t = table(step);
    const cur = step > 0 ? order[step - 1] : null;
    const done = step >= order.length;
    const top = t[key(0, input.length - 1)];
    const accept = !!top && top.vars.indexOf('S') >= 0;

    label(ctx, 'CNF：S → AB | SS　A → a　B → b　输入 ' + input,
      geo.gridX, 18, C.fg, { size: geo.narrow ? 10.5 : 11.5, weight: 700 });
    label(ctx, '第 (i,j) 格 = 子串 aᵢ…aⱼ 能推出的全部变量；填法：枚举切点，把左右两格的变量两两配对',
      geo.gridX, 36, C.grid, { size: 10 });

    /* 格子 */
    for (let span = 1; span <= geo.n; span += 1) {
      for (let i = 0; i + span - 1 < geo.n; i += 1) {
        const j = i + span - 1;
        const p = cellAt(i, j);
        const cell = t[key(i, j)];
        const isCur = cur && cur.i === i && cur.j === j;
        const isHover = hover && hover.i === i && hover.j === j;
        const isTop = i === 0 && j === geo.n - 1;
        ctx.save();
        ctx.fillStyle = cell ? (isCur ? C.accent2 : C.soft) : C.bg;
        ctx.globalAlpha = isCur ? 0.26 : (cell ? 0.85 : 1);
        ctx.fillRect(p.x + 1, p.y + 1, geo.cell - 2, geo.cell - 2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isCur ? C.accent2 : (isHover ? C.accent : (cell ? C.axis : C.grid));
        ctx.lineWidth = isCur ? 2.2 : (isHover ? 1.8 : 1);
        ctx.strokeRect(p.x + 1.5, p.y + 1.5, geo.cell - 3, geo.cell - 3);
        ctx.restore();
        const txt = cell ? (cell.vars.length ? cell.vars.join('') : '∅') : '';
        if (txt) {
          label(ctx, txt, p.x + geo.cell / 2, p.y + geo.cell * 0.58 + 4,
            isCur ? C.accent2 : (cell.vars.length ? C.fg : C.grid),
            { size: Math.min(15, geo.cell * 0.34), align: 'center', weight: 700 });
        }
        if (isTop) {
          /* 顶格加个角标，方便一眼找到「决定接受与否」的那一格 */
          ctx.save();
          ctx.fillStyle = C.accent;
          ctx.beginPath();
          ctx.arc(p.x + geo.cell - 7, p.y + 7, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    /* 斜边上的输入字符 + 列号 */
    for (let i = 0; i < geo.n; i += 1) {
      const p = cellAt(i, i);
      label(ctx, input[i], geo.gridX - 16, p.y + geo.cell * 0.62, C.named('teal'),
        { size: 12, align: 'center', weight: 700 });
      label(ctx, String(i + 1), p.x + geo.cell / 2, geo.gridY + geo.n * geo.cell + 16,
        C.axis, { size: 9.5, align: 'center' });
    }
    label(ctx, '最顶上那格 (1,' + geo.n + ') 覆盖全串——S 在里面就接受',
      geo.gridX + geo.cell * Math.max(geo.n - 1, 0) + 12, geo.gridY + 4, C.axis, { size: 10, align: 'left' });

    /* 结论条 */
    const by = geo.gridY + geo.n * geo.cell + 34;
    if (done) {
      const txt = accept
        ? '接受：顶格 ' + (top ? '{' + top.vars.join(', ') + '}' : '∅') + ' 含 S，整个串由文法生成'
        : '拒绝：顶格不含 S，这个串推不出来';
      label(ctx, txt, geo.gridX, by, accept ? C.ok : C.bad, { size: 12, weight: 700 });
    } else {
      label(ctx, '已填 ' + step + ' / ' + order.length + ' 格'
        + (cur ? '　当前格 (' + (cur.i + 1) + ',' + (cur.j + 1) + ')，长度 ' + cur.span : ''),
      geo.gridX, by, C.axis, { size: 11 });
    }

    label(ctx, '长度 1 的格子只查 A → a / B → b；长度 ≥ 2 的格子必须靠左右两格拼出来',
      geo.gridX, cv.H - 10, C.grid, { size: 10 });

    /* 读数 */
    const show = (hover && t[key(hover.i, hover.j)]) ? hover : cur;
    const shown = show ? t[key(show.i, show.j)] : null;
    if (show) {
      ro.set('这一格', '(' + (show.i + 1) + ',' + (show.j + 1) + ') = 子串 "'
        + input.slice(show.i, show.j + 1) + '"（长度 ' + (show.j - show.i + 1) + '）');
      const hits = shown ? shown.hits : [];
      ro.set('命中的规则', hits.length
        ? hits.slice(0, 3).map((h) => h.rule + '（' + h.from + '）').join('；')
          + (hits.length > 3 ? ' …共 ' + hits.length + ' 条' : '')
        : '没有命中任何规则');
      ro.set('填入的变量', shown ? (shown.vars.length ? '{' + shown.vars.join(', ') + '}' : '∅（空格）') : '还没算');
    } else {
      ro.set('这一格', '按下「单步」开始填第一格');
      ro.set('命中的规则', '—');
      ro.set('填入的变量', '—');
    }
    ro.set('顶格结论', top
      ? (accept ? '含 S → 接受' : '不含 S → 拒绝')
      : '还没填到顶格');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const c = hitCell(x, y);
      if (!c) return null;
      hover = c;
      draw();
      return null;
    },
    hover(x, y) {
      const c = hitCell(x, y);
      const same = (c && hover && c.i === hover.i && c.j === hover.j) || (!c && !hover);
      hover = c;
      cv.canvas.style.cursor = c ? 'pointer' : 'default';
      if (!same) draw();
    },
    leave() { if (hover) { hover = null; draw(); } },
    down(id, x, y) {
      const c = hitCell(x, y);
      if (c) { hover = c; draw(); }
    },
    move() {},
    up() {},
  });

  function hitCell(x, y) {
    const i = Math.floor((x - geo.gridX) / geo.cell);
    const row = Math.floor((y - geo.gridY) / geo.cell);
    if (i < 0 || i >= geo.n || row < 0 || row >= geo.n) return null;
    /* 行号从下往上数：最底行是长度 1 的对角线 */
    const j = geo.n - 1 - row + i;
    if (j < i || j >= geo.n) return null;
    return { i, j };
  }

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.5) return;
      acc = 0;
      step = step >= order.length ? 0 : step + 1;
      draw();
    },
    onReset() { acc = 0; step = 0; draw(); },
  });

  bStep.addEventListener('click', () => {
    controls.stop();
    step = Math.min(step + 1, order.length);
    draw();
  });
  bBack.addEventListener('click', () => {
    controls.stop();
    step = Math.max(step - 1, 0);
    draw();
  });
  bAll.addEventListener('click', () => {
    controls.stop();
    step = order.length;
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); cv.redraw = null; } };
}
