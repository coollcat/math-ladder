/* =========================================================================
 * lab 组件：poset-hasse —— 哈斯图只画「直接覆盖」的那几条边
 *                        （第 18 章「偏序关系与良序」）
 * -------------------------------------------------------------------------
 * 演示什么：偏序集的层级结构；「覆盖关系」与「传递闭包」的区别；
 *   极大元 / 最大元、可比 / 不可比这两对最容易混淆的概念。
 *
 * 用法：
 *   { "type": "poset-hasse",
 *     "title": "同一张偏序集，两种画法",
 *     "preset": "div6" }
 *
 * 字段：preset 可选，初始预设
 *       "div6"   整除关系，元素 {2,3,4,6}（默认：极大元两个，最大元没有）
 *       "div12"  整除关系，元素 {1,2,3,4,6,12}
 *       "powerset" {a,b,c} 的 8 个子集按包含关系
 *       "chain"  1<2<3<4，全序（对照用）
 *       all 可选，初始是否画全部可比对（传递闭包），默认 false
 *
 * 交互（完美教具五问）：
 *   1. 动手量：点任意两个元素做比较；按预设换一张偏序集；
 *      按「全部可比对」在覆盖边与传递闭包之间切换。
 *   2. 即时后果：点在元素上，它的可比链当场点亮；
 *      切到「全部可比对」时边数暴涨——哈斯图省略的是什么，一眼就懂。
 *   3. 读数：元素数 / 极大元 / 极小元 / 最大元 / 是否全序 / 当前对比，
 *      全部按定义直接算出，与正文的三条性质一一对得上。
 *   4. 啊哈预设：div6 默认选中 4 与 6，读数当场写「不可比（同层）」
 *      —— 极大元有两个而最大元一个也没有。
 *   5. 默认状态：div6 + 选中 4、6，读者不点任何东西也能看到本课要点。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clearBg,
} from '../core.js';

/* 每个预设给：元素 id 表、读者看到的标签、偏序判据 le(a,b) 表示 a ⪯ b */
const PRESETS = {
  div6: {
    ids: [2, 3, 4, 6],
    text: (v) => String(v),
    le: (a, b) => b % a === 0,
    hint: '整除关系 |，元素 {2, 3, 4, 6}',
  },
  div12: {
    ids: [1, 2, 3, 4, 6, 12],
    text: (v) => String(v),
    le: (a, b) => b % a === 0,
    hint: '整除关系 |，元素 {1, 2, 3, 4, 6, 12}',
  },
  powerset: {
    ids: [0, 1, 2, 3, 4, 5, 6, 7],
    text: (v) => ['∅', 'a', 'b', 'c', 'ab', 'ac', 'bc', 'abc'][v],
    le: (a, b) => (a & b) === a,
    hint: '包含关系 ⊆，{a,b,c} 的全部 8 个子集',
  },
  chain: {
    ids: [1, 2, 3, 4],
    text: (v) => String(v),
    le: (a, b) => a <= b,
    hint: '自然数全序 ≤，元素 {1, 2, 3, 4}',
  },
};

export default function render(host, spec) {
  const cv = setupCanvas(host, 380);
  const cfg = {
    preset: PRESETS[spec.preset] ? spec.preset : 'div6',
    all: !!spec.all,
    sel: [],
  };
  const hover = { id: null };
  let geom = null;   // { nodes: [{id,x,y}], byId }
  let board = null;  // 画布上的板面矩形（留给 pick 用）

  /* ---------- 偏序集计算 ---------- */

  function analyze(key) {
    const P = PRESETS[key];
    const ids = P.ids;
    const n = ids.length;
    const less = (a, b) => a !== b && P.le(a, b);
    /* 覆盖：a ⪯ b 且中间没有第三个元素 —— 哈斯图只画这些边 */
    const covers = [];
    for (const a of ids) {
      for (const b of ids) {
        if (!less(a, b)) continue;
        let direct = true;
        for (const c of ids) {
          if (c !== a && c !== b && P.le(a, c) && P.le(c, b)) { direct = false; break; }
        }
        if (direct) covers.push([a, b]);
      }
    }
    /* 全部可比对（传递闭包）：等于把覆盖边一路「补齐」 */
    const closure = [];
    for (const a of ids) for (const b of ids) if (less(a, b)) closure.push([a, b]);
    /* 层级 = 从最小元往上数的最长链长 */
    const level = {};
    const findLevel = (v) => {
      if (level[v] !== undefined) return level[v];
      let lv = 0;
      for (const u of ids) if (less(u, v)) lv = Math.max(lv, findLevel(u) + 1);
      level[v] = lv;
      return lv;
    };
    ids.forEach(findLevel);
    const maximal = ids.filter((a) => !ids.some((b) => less(a, b)));
    const minimal = ids.filter((a) => !ids.some((b) => less(b, a)));
    const maximum = ids.filter((a) => ids.every((b) => P.le(b, a)));
    const total = ids.every((a) => ids.every((b) => a === b || P.le(a, b) || P.le(b, a)));
    return { ids, P, covers, closure, level, maximal, minimal, maximum, total, less, le: P.le, n };
  }

  let D = analyze(cfg.preset);

  /* ---------- 布局 ---------- */

  function layout(W, H) {
    const L = Math.max(...D.ids.map((v) => D.level[v])) + 1;
    const padX = 34;
    const padTop = 30;
    const padBottom = 40;
    const rows = [];
    for (let lv = 0; lv < L; lv += 1) rows.push(D.ids.filter((v) => D.level[v] === lv));
    const h = Math.max(1, H - padTop - padBottom);
    const dy = L > 1 ? h / (L - 1) : 0;
    const nodes = [];
    rows.forEach((row, lv) => {
      const n = row.length;
      const w = W - padX * 2;
      row.forEach((v, i) => {
        const x = n === 1 ? W / 2 : padX + (w * i) / (n - 1);
        const y = H - padBottom - lv * dy;
        nodes.push({ id: v, x, y });
      });
    });
    const byId = {};
    nodes.forEach((p) => { byId[p.id] = p; });
    return { nodes, byId };
  }

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    geom = layout(W, H);
    board = { x: 0, y: 0, w: W, h: H };

    const selA = cfg.sel[0];
    const selB = cfg.sel[1];
    const edges = cfg.all ? D.closure : D.covers;

    /* 边：默认画覆盖关系（哈斯图），切到闭包后补的影子用虚线 */
    edges.forEach(([a, b]) => {
      const p = geom.byId[a];
      const q = geom.byId[b];
      if (!p || !q) return;
      const hot = (a === selA && b === selB) || (a === selB && b === selA);
      const near = selA !== undefined && (a === selA || b === selA || a === selB || b === selB);
      ctx.save();
      ctx.strokeStyle = hot ? C.ok : (cfg.all ? C.grid : (near ? C.accent : C.axis));
      ctx.lineWidth = hot ? 3 : (cfg.all ? 1 : (near ? 2 : 1.4));
      ctx.globalAlpha = hot ? 1 : (cfg.all ? 0.55 : 0.9);
      if (cfg.all) ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.restore();
    });

    /* 节点 */
    geom.nodes.forEach((p) => {
      const v = p.id;
      const isMax = D.maximal.includes(v);
      const isMin = D.minimal.includes(v);
      const picked = cfg.sel.includes(v);
      const isHover = hover.id === v;
      const stroke = picked ? C.ok : (isMax && isMin ? C.accent : (isMax ? C.accent : (isMin ? C.accent2 : C.axis)));
      ctx.save();
      ctx.fillStyle = picked ? C.ok : (isHover ? C.soft : C.bg);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = picked || isMax || isMin ? 2.6 : 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      label(ctx, D.P.text(v), p.x, p.y + 4, picked ? C.bg : C.fg, { align: 'center', size: 12, weight: 700 });
      if (isMax) label(ctx, '极大', p.x, p.y - 22, C.accent, { align: 'center', size: 9 });
      if (isMin) label(ctx, '极小', p.x, p.y + 30, C.accent2, { align: 'center', size: 9 });
    });

    /* 顶部标题与底部提示 */
    label(ctx, D.P.hint, 12, 16, C.fg, { size: 11, weight: 700 });
    label(ctx,
      cfg.all ? '虚线 = 全部可比对（传递闭包）：哈斯图把它们全省了'
        : '实线 = 覆盖关系：中间没有第三个元素的那些对，只有它们配进哈斯图',
      12, H - 10, cfg.all ? C.bad : C.grid, { size: 10 });
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({
    元素: '—', 极大元: '—', 极小元: '—', 最大元: '—', 全序: '—', 当前对比: '—',
  });
  host.appendChild(ro.box);

  const presetBtns = Object.keys(PRESETS).map((k) => {
    const b = mkBtn({ div6: '整除 {2,3,4,6}', div12: '整除 12 的因子', powerset: '幂集 ⊆', chain: '全序 1..4' }[k]);
    b.addEventListener('click', () => {
      cfg.preset = k;
      cfg.sel = k === 'div6' ? [4, 6] : [];
      D = analyze(k);
      refresh();
    });
    return b;
  });
  host.appendChild(buildToolbar(...presetBtns));

  const btnAll = mkBtn('全部可比对');
  const btnClear = mkBtn('清空选择');
  host.appendChild(buildToolbar(btnAll, btnClear));

  function refresh() {
    const names = (list) => (list.length ? list.map((v) => D.P.text(v)).join('、') : '无');
    ro.set('元素', String(D.n));
    ro.set('极大元', names(D.maximal));
    ro.set('极小元', names(D.minimal));
    ro.set('最大元', D.maximum.length ? names(D.maximum) : '没有');
    ro.set('全序', D.total ? '是（任意两元素可比）' : '否（存在不可比的对）');
    if (cfg.sel.length === 2) {
      const [a, b] = cfg.sel;
      const ta = D.P.text(a);
      const tb = D.P.text(b);
      if (D.le(a, b) && a !== b) ro.set('当前对比', ta + ' ⪯ ' + tb + '（可比）');
      else if (D.le(b, a)) ro.set('当前对比', tb + ' ⪯ ' + ta + '（可比）');
      else ro.set('当前对比', ta + ' 与 ' + tb + ' 不可比（同层，谁也到不了谁）');
    } else if (cfg.sel.length === 1) {
      ro.set('当前对比', '已选 ' + D.P.text(cfg.sel[0]) + '，再点一个元素来比较');
    } else {
      ro.set('当前对比', '点两个元素，看它们是否可比');
    }
    btnAll.textContent = cfg.all ? '只看覆盖边' : '全部可比对';
    presetBtns.forEach((b, i) => {
      b.style.borderColor = Object.keys(PRESETS)[i] === cfg.preset ? themeColors().ok : '';
    });
    draw();
  }

  btnAll.addEventListener('click', () => { cfg.all = !cfg.all; refresh(); });
  btnClear.addEventListener('click', () => { cfg.sel = []; refresh(); });

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      if (!geom) return null;
      for (const p of geom.nodes) {
        if (Math.hypot(px - p.x, py - p.y) <= 20) return { kind: 'node', id: p.id };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'node') {
        const at = cfg.sel.indexOf(id.id);
        if (at >= 0) cfg.sel.splice(at, 1);
        else if (cfg.sel.length >= 2) cfg.sel = [id.id];
        else cfg.sel.push(id.id);
      }
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      let next = null;
      if (geom) {
        for (const p of geom.nodes) {
          if (Math.hypot(px - p.x, py - p.y) <= 20) { next = p.id; break; }
        }
      }
      if (next !== hover.id) { hover.id = next; draw(); }
    },
    leave() {
      if (hover.id !== null) { hover.id = null; draw(); }
    },
  });

  cfg.sel = cfg.preset === 'div6' ? [4, 6] : [];
  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}
