/* =========================================================================
 * 交换图实验室：复合 / 函子 / 自然方块（第 67 章）
 * -------------------------------------------------------------------------
 * 三个模式共用一台「一次核对一个元素」的步进状态机：
 *   mode="source"  —— 源图两条路径：h 与 g∘f 逐元素对账
 *   mode="functor" —— 函子保复合：F(h) 与 F(g)∘F(f)（G 也一并抽查）
 *   mode="natural" —— 自然方块：G(f)∘α_A 与 α_B∘F(f)、G(g)∘α_B 与 α_C∘F(g)
 * 每按一次「单步」：① ② 两枚小圆点同时出发，沿两条路径走到终点，落点
 * 相同记 ✓，不同记 ✗ 并给出具体反例元素。箭头上的小牌可以点着改写去向，
 * 改完审计作废、重新逐点核对——这就是「可编辑的小范畴」。
 *
 * 纪律：全部 ✓ 只说明这个有限模型里没找到反例，**不等于证明**；红叉才是
 * 确定的否证（并附一个具体元素）。文案里、画布上、图例里都写这一点。
 *
 * 交互：单步 / 回退 / 播放 / 重置；节点可拖动；reduced-motion 下禁用自动
 * 播放，单步直接给终态；滚出视口自动暂停。
 *
 * 契约（```lab 围栏里的 JSON）：
 *   { "type": "category-diagram-lab", "mode": "functor" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, label, arrow, clamp, el,
  buildSegmented, buildToolbar, buildReadout, mkBtn, onScreen,
} from '../core.js';

const STEP_DUR = 1.1;
const HOLD_DUR = 0.6;
const TAU = Math.PI * 2;

const easeInOut = (t) => {
  const u = clamp(t, 0, 1);
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
};

function defaultModel() {
  return {
    C: {
      sets: { A: ['a1', 'a2'], B: ['b1', 'b2', 'b3'], C: ['c1', 'c2'] },
      arrows: {
        f: { from: 'A', to: 'B', map: { a1: 'b1', a2: 'b2' } },
        g: { from: 'B', to: 'C', map: { b1: 'c1', b2: 'c1', b3: 'c2' } },
        h: { from: 'A', to: 'C', map: { a1: 'c1', a2: 'c1' }, editable: true },
      },
    },
    D: {
      sets: { P: ['p1', 'p2'], Q: ['q1', 'q2', 'q3'], R: ['r1', 'r2'] },
      arrows: {
        Ff: { from: 'P', to: 'Q', map: { p1: 'q1', p2: 'q2' } },
        Fg: { from: 'Q', to: 'R', map: { q1: 'r1', q2: 'r1', q3: 'r2' } },
        Fh: { from: 'P', to: 'R', map: { p1: 'r1', p2: 'r1' }, editable: true },
        Gf: { from: 'P', to: 'Q', map: { p1: 'q1', p2: 'q1' } },
        Gg: { from: 'Q', to: 'R', map: { q1: 'r1', q2: 'r2', q3: 'r2' } },
        Gh: { from: 'P', to: 'R', map: { p1: 'r1', p2: 'r1' }, editable: true },
      },
    },
    alpha: {
      A: { from: 'P', to: 'P', map: { p1: 'p1', p2: 'p2' }, editable: true },
      /* 默认给一个「不都取恒等」的分量：q2 并到 q1，正是自然性仍能闭合的示范 */
      B: { from: 'Q', to: 'Q', map: { q1: 'q1', q2: 'q1', q3: 'q3' }, editable: true },
      C: { from: 'R', to: 'R', map: { r1: 'r1', r2: 'r2' }, editable: true },
    },
  };
}

/* ---------- 小范畴的数据小工具 ---------- */

function mapOf(model, op) {
  if (op.kind === 'alpha') return model.alpha[op.id].map;
  return model[op.cat].arrows[op.id].map;
}

function metaOf(model, op) {
  if (op.kind === 'alpha') return model.alpha[op.id];
  return model[op.cat].arrows[op.id];
}

function codomainOf(model, op) {
  const meta = metaOf(model, op);
  const cat = op.kind === 'alpha' ? 'D' : op.cat;
  return model[cat].sets[meta.to];
}

function applyOp(model, x, op) {
  return mapOf(model, op)[x];
}

function evalPath(model, start, ops) {
  let cur = start;
  ops.forEach((op) => { cur = applyOp(model, cur, op); });
  return cur;
}

function buildWitnesses(model, mode) {
  const A = (cat, id) => ({ kind: 'arrow', cat, id });
  const AL = (id) => ({ kind: 'alpha', id });
  if (mode === 'source') {
    return model.C.sets.A.map((x) => ({
      start: x,
      path1: [A('C', 'h')],
      path2: [A('C', 'f'), A('C', 'g')],
      title: 'h 与 g∘f',
    }));
  }
  if (mode === 'functor') {
    const out = [];
    model.D.sets.P.forEach((p) => {
      out.push({
        start: p,
        path1: [A('D', 'Fh')],
        path2: [A('D', 'Ff'), A('D', 'Fg')],
        title: 'F(h) 与 F(g)∘F(f)',
      });
    });
    model.D.sets.P.forEach((p) => {
      out.push({
        start: p,
        path1: [A('D', 'Gh')],
        path2: [A('D', 'Gf'), A('D', 'Gg')],
        title: 'G(h) 与 G(g)∘G(f)',
      });
    });
    return out;
  }
  const out = [];
  model.D.sets.P.forEach((p) => {
    out.push({
      start: p,
      path1: [AL('A'), A('D', 'Gf')],
      path2: [A('D', 'Ff'), AL('B')],
      title: 'G(f)∘α_A 与 α_B∘F(f)',
    });
  });
  model.D.sets.Q.forEach((q) => {
    out.push({
      start: q,
      path1: [AL('B'), A('D', 'Gg')],
      path2: [A('D', 'Fg'), AL('C')],
      title: 'G(g)∘α_B 与 α_C∘F(g)',
    });
  });
  return out;
}

export default function render(host, spec) {
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const model = defaultModel();
  let mode = ['source', 'functor', 'natural'].indexOf(spec.mode) >= 0 ? spec.mode : 'source';
  let witnesses = buildWitnesses(model, mode);
  let results = witnesses.map(() => null);
  let cursor = 0;
  let segT = 0;
  let anim = false;
  let hold = 0;
  let playing = false;
  let visible = true;
  let raf = null;
  let last = 0;

  const pos = {};
  let posMode = '';
  let dragKey = null;
  let downInfo = null;
  let hoverChip = null;
  let chips = [];

  const ro = buildReadout({
    模式: '—', 已核对: '—', 反例: '—', 当前抽查: '—', 结论: '—',
  });
  host.appendChild(ro.box);

  const segMode = buildSegmented(
    [
      { label: '源图：h vs g∘f', value: 'source' },
      { label: '函子：保复合', value: 'functor' },
      { label: '自然方块', value: 'natural' },
    ],
    mode,
    (v) => {
      mode = v;
      witnesses = buildWitnesses(model, mode);
      resetAudit();
    },
  );
  host.appendChild(segMode);

  const btnStep = mkBtn('单步 ▶');
  const btnBack = mkBtn('回退一步');
  const btnPlay = mkBtn(reduced ? '减少动效' : '播放');
  const btnReset = mkBtn('重置');
  btnPlay.disabled = reduced;
  host.appendChild(buildToolbar(btnStep, btnBack));
  host.appendChild(buildToolbar(btnPlay, btnReset));

  const legend = el('div', 'ml-lab__legend');
  [
    ['① 路径一', '沿这条合成走到底'],
    ['② 路径二', '另一条合成，逐元素比对终点'],
    ['红叉', '确定的否证，会给出具体元素；全绿只是有限抽查，不等于证明'],
  ].forEach(([k, v]) => legend.appendChild(el('span', null, k + '：' + v)));
  host.appendChild(legend);

  const cv = setupCanvas(host, 440);

  /* ---------- 布局 ---------- */

  function layout() {
    const W = cv.W;
    const H = cv.H;
    const narrow = W < 620;
    const head = 26;
    const ledgerH = narrow ? 96 : 84;
    const diagram = {
      x: 8,
      y: head,
      w: W - 16,
      h: H - head - ledgerH - 26,
    };
    return {
      narrow,
      diagram,
      ledger: { x: 8, y: head + diagram.h + 10, w: W - 16, h: ledgerH },
    };
  }

  function modeKeys(m) {
    if (m === 'source') return ['A', 'B', 'C'];
    if (m === 'functor') return ['P', 'Q', 'R'];
    return ['FP', 'GP', 'FQ', 'GQ', 'FR', 'GR'];
  }

  function ensurePos(rect) {
    if (posMode === mode && Object.keys(pos).length === modeKeys(mode).length) return;
    posMode = mode;
    Object.keys(pos).forEach((k) => { delete pos[k]; });
    const at = (fx, fy) => ({ x: rect.x + fx * rect.w, y: rect.y + fy * rect.h });
    if (mode === 'source') {
      pos.A = at(0.2, 0.26);
      pos.B = at(0.76, 0.5);
      pos.C = at(0.2, 0.76);
    } else if (mode === 'functor') {
      pos.P = at(0.62, 0.24);
      pos.Q = at(0.92, 0.5);
      pos.R = at(0.62, 0.76);
    } else {
      pos.FP = at(0.24, 0.18);
      pos.GP = at(0.76, 0.18);
      pos.FQ = at(0.24, 0.5);
      pos.GQ = at(0.76, 0.5);
      pos.FR = at(0.24, 0.82);
      pos.GR = at(0.76, 0.82);
    }
  }

  /* 每种模式的箭头几何：a/b 是节点键，bend 是贝塞尔弯度 */
  function geoms() {
    if (mode === 'source') {
      return {
        'C:f': { a: 'A', b: 'B', bend: -0.16 },
        'C:g': { a: 'B', b: 'C', bend: 0.16 },
        'C:h': { a: 'A', b: 'C', bend: 0.42 },
      };
    }
    if (mode === 'functor') {
      return {
        'D:Ff': { a: 'P', b: 'Q', bend: 0.2 },
        'D:Fg': { a: 'Q', b: 'R', bend: -0.2 },
        'D:Fh': { a: 'P', b: 'R', bend: 0.46 },
        'D:Gf': { a: 'P', b: 'Q', bend: -0.2 },
        'D:Gg': { a: 'Q', b: 'R', bend: 0.2 },
        'D:Gh': { a: 'P', b: 'R', bend: 0.22 },
      };
    }
    return {
      'alpha:A': { a: 'FP', b: 'GP', bend: -0.16 },
      'alpha:B': { a: 'FQ', b: 'GQ', bend: -0.16 },
      'alpha:C': { a: 'FR', b: 'GR', bend: -0.16 },
      'D:Ff': { a: 'FP', b: 'FQ', bend: 0.18 },
      'D:Gf': { a: 'GP', b: 'GQ', bend: -0.18 },
      'D:Fg': { a: 'FQ', b: 'FR', bend: 0.18 },
      'D:Gg': { a: 'GQ', b: 'GR', bend: -0.18 },
    };
  }

  function opKey(op) {
    return op.kind === 'alpha' ? 'alpha:' + op.id : op.cat + ':' + op.id;
  }

  function curvePoint(g, s) {
    const a = pos[g.a];
    const b = pos[g.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const cx = (a.x + b.x) / 2 + (-dy / L) * g.bend * L;
    const cy = (a.y + b.y) / 2 + (dx / L) * g.bend * L;
    const u = 1 - s;
    return {
      x: u * u * a.x + 2 * u * s * cx + s * s * b.x,
      y: u * u * a.y + 2 * u * s * cy + s * s * b.y,
    };
  }

  function drawCurve(ctx, g, color, width, dash) {
    const steps = 18;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const p = curvePoint(g, i / steps);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
    /* 箭头头部画在 s = 0.86 处，避免和终点的小牌挤在一起 */
    const p1 = curvePoint(g, 0.84);
    const p2 = curvePoint(g, 0.9);
    arrow(ctx, p1.x, p1.y, p2.x, p2.y, color, width, 7);
  }

  function boxSize(key) {
    const set = objectElements(key);
    const w = mode === 'natural' || key.length > 1 ? 62 : 56;
    const h = 20 + set.length * 13;
    return { w, h, set };
  }

  function objectElements(key) {
    if (mode === 'source') return model.C.sets[key];
    if (mode === 'functor') return model.D.sets[key];
    /* natural 模式：F(P) 与 G(P) 的底集合相同 */
    return model.D.sets[key.slice(-1)];
  }

  function keyTitle(key) {
    if (mode === 'source') return key;
    if (mode === 'functor') return key;
    return key[0] + '(' + key.slice(1) + ')';
  }

  function drawObject(ctx, key, C, opts = {}) {
    const { w, h, set } = boxSize(key);
    const p = pos[key];
    const x = p.x - w / 2;
    const y = p.y - h / 2;
    const hot = opts.hot;
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = hot ? C.accent2 : C.axis;
    ctx.lineWidth = hot ? 2.4 : 1.4;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
    label(ctx, keyTitle(key), p.x, y + 13, hot ? C.accent2 : C.fg, { size: 10, weight: 700, align: 'center' });
    set.forEach((elId, i) => {
      label(ctx, elId, p.x, y + 26 + i * 13, C.axis, { size: 9, align: 'center' });
    });
    return { x, y, w, h };
  }

  /* ---------- 画布 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const rects = layout();
    ensurePos(rects.diagram);
    chips = [];

    const head = mode === 'source'
      ? '源图 C：h 与 g∘f 两条路径，逐元素核对'
      : mode === 'functor'
        ? '函子把 C 的箭头搬进 D：直接像 F(h) 与合成 F(g)∘F(f) 逐点对账'
        : '自然方块：G(f)∘α_A 与 α_B∘F(f)，以及 g 的那一块';
    label(ctx, head, 8, 17, C.fg, { size: 11, weight: 700 });

    const g = geoms();
    const opsOnWitness = activeOps();
    Object.keys(g).forEach((key) => {
      const op = keyToOp(key);
      const meta = metaOf(model, op);
      const onPath = opsOnWitness.has(key);
      const editable = !!meta.editable;
      /* 一族一色：F 的箭头蓝、G 的箭头绿、分量 α 紫；源图三支走中性色 */
      const fam = key.indexOf('alpha:') === 0 ? 'purple'
        : key.indexOf(':G') >= 0 ? 'green'
          : key.indexOf(':F') >= 0 ? 'blue' : null;
      const col = fam ? C.named(fam) : (editable ? C.accent2 : C.axis);
      drawCurve(ctx, g[key], col, onPath ? 3.2 : (editable ? 2.2 : 1.4), null);
      /* 小牌只在「可编辑」或「正被这条路径经过」时画，空闲时不堆满画布 */
      if (editable || onPath) chainChips(ctx, key, op, meta, C, g[key]);
    });

    if (mode === 'functor') drawFunctorInset(ctx, rects.diagram, C);
    modeKeys(mode).forEach((key) => {
      drawObject(ctx, key, C, { hot: dragKey === key });
    });

    drawWitnessOverlay(ctx, C, g);
    drawLedgerStrip(ctx, rects.ledger, C, rects.narrow);
    label(ctx, '有限模型逐点抽查 ≠ 证明：全绿只说明这个玩具例子里没找到反例；红叉是确定的否证。',
      8, H - 8, C.grid, { size: 10 });
    updateReadout();
  }

  function keyToOp(key) {
    if (key.indexOf('alpha:') === 0) return { kind: 'alpha', id: key.slice(6) };
    const i = key.indexOf(':');
    return { kind: 'arrow', cat: key.slice(0, i), id: key.slice(i + 1) };
  }

  function chainChips(ctx, key, op, meta, C, g) {
    const dom = op.kind === 'alpha'
      ? model.D.sets[meta.from]
      : model[op.cat].sets[meta.from];
    dom.forEach((x, i) => {
      const s = dom.length === 1 ? 0.5 : 0.34 + (i * 0.32) / Math.max(1, dom.length - 1);
      const p = curvePoint(g, s);
      const text = x + '→' + applyOp(model, x, op);
      const w = 8 + text.length * 6.1;
      const h = 16;
      const x0 = p.x - w / 2;
      const y0 = p.y - h / 2;
      const editable = !!meta.editable;
      const isHover = !!(hoverChip && hoverChip.key === key && hoverChip.el === x);
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = isHover ? C.bad : (editable ? C.accent2 : C.grid);
      ctx.lineWidth = isHover ? 2.4 : (editable ? 1.6 : 1);
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x0, y0, w, h, 5);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(x0, y0, w, h);
      }
      ctx.restore();
      label(ctx, text, p.x, p.y + 3.5, editable ? C.fg : C.axis, {
        size: 9, align: 'center', weight: editable ? 700 : 400,
      });
      chips.push({ key, op, x: x0, y: y0, w, h, editable, el: x, set: codomainOf(model, op) });
    });
  }

  function drawFunctorInset(ctx, rect, C) {
    /* 窄屏优先保目标图：源图缩成一行文字，不硬塞微缩图 */
    const narrow = rect.w < 520;
    if (narrow) {
      label(ctx, '源图 C：A —f→ B —g→ C，另有 h: A→C（上一模式核对）', 8, rect.y + rect.h + 16, C.axis, { size: 9.5 });
      return;
    }
    const at = (fx, fy) => ({ x: rect.x + fx * rect.w, y: rect.y + fy * rect.h });
    const ip = { A: at(0.1, 0.3), B: at(0.29, 0.5), C: at(0.1, 0.72) };
    const tiny = (key, p) => {
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.fillStyle = C.bg;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(p.x - 13, p.y - 11, 26, 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      label(ctx, key, p.x, p.y + 3.5, C.axis, { size: 10, align: 'center', weight: 700 });
    };
    arrow(ctx, ip.A.x + 14, ip.A.y, ip.B.x - 14, ip.B.y, C.axis, 1.2, 6);
    arrow(ctx, ip.B.x - 6, ip.B.y + 10, ip.C.x + 8, ip.C.y - 8, C.axis, 1.2, 6);
    arrow(ctx, ip.A.x, ip.A.y + 12, ip.C.x, ip.C.y - 12, C.axis, 1.2, 6);
    tiny('A', ip.A);
    tiny('B', ip.B);
    tiny('C', ip.C);
    label(ctx, 'C', ip.B.x, ip.B.y - 20, C.axis, { size: 10, align: 'center' });
    /* 对象层的搬迁线 */
    [['A', 'P'], ['B', 'Q'], ['C', 'R']].forEach(([srcKey, dstKey]) => {
      const a = ip[srcKey];
      const b = pos[dstKey];
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = C.named('purple');
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(a.x + 14, a.y);
      ctx.lineTo(b.x - 26, b.y);
      ctx.stroke();
      ctx.restore();
    });
    label(ctx, '虚线 = 对象层（F、G 相同）：A↦P，B↦Q，C↦R', rect.x + 4, rect.y + rect.h + 16, C.named('purple'), { size: 10 });
  }

  function drawWitnessOverlay(ctx, C, g) {
    const idx = Math.min(cursor, witnesses.length - 1);
    const w = witnesses[idx];
    if (!w) return;
    const t = anim ? easeInOut(segT) : 1;
    const showToken = anim;
    [[w.path1, C.named('blue'), '①'], [w.path2, C.named('orange'), '②']].forEach(([ops, col, tag]) => {
      ops.forEach((op) => {
        const geo = g[opKey(op)];
        if (geo) drawCurve(ctx, geo, col, 2.6, null);
      });
      if (!showToken) return;
      const n = ops.length;
      const u = t * n;
      const k = Math.min(Math.floor(u), n - 1);
      const local = clamp(u - k, 0, 1);
      const geo = g[opKey(ops[k])];
      if (!geo) return;
      const p = curvePoint(geo, local);
      ctx.save();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.fill();
      ctx.restore();
      label(ctx, tag, p.x, p.y + 3.5, C.bg, { size: 9.5, align: 'center', weight: 700 });
      label(ctx, w.start, p.x, p.y - 11, col, { size: 9, align: 'center', weight: 700 });
    });
    /* 已完成一格：把落点对照写在终点附近 */
    if (cursor > 0 && !anim) {
      const prev = witnesses[cursor - 1];
      const ok = results[cursor - 1];
      const end1 = evalPath(model, prev.start, prev.path1);
      const end2 = evalPath(model, prev.start, prev.path2);
      const anchor = pos[geoEnd(mode)];
      const msg = '上一步：' + prev.start + ' 走 ① 落 ' + end1 + '，走 ② 落 ' + end2;
      label(ctx, msg, anchor.x, anchor.y + 30, ok ? C.ok : C.bad, { size: 9.5, align: 'center', weight: 700 });
    }
  }

  function geoEnd(m) {
    if (m === 'source') return 'C';
    if (m === 'functor') return 'R';
    return 'GR';
  }

  function drawLedgerStrip(ctx, rect, C, narrow) {
    label(ctx, '审计账（' + witnesses.length + ' 项逐点抽查）', rect.x, rect.y - 4, C.fg, { size: 10, weight: 700 });
    const rowH = 24;
    const perRow = narrow ? 4 : 7;
    const cw = rect.w / perRow;
    witnesses.forEach((w, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = rect.x + col * cw;
      const y = rect.y + 8 + row * rowH;
      const st = results[i];
      const txt = (i + 1) + '. ' + w.start + (st === null ? ' …' : st ? ' ✓' : ' ✗');
      label(ctx, txt, x, y + 12, st === null ? C.axis : (st ? C.ok : C.bad), { size: 10, weight: 600 });
    });
    const doneCount = results.filter((r) => r !== null).length;
    const failCount = results.filter((r) => r === false).length;
    const sumY = rect.y + 8 + Math.ceil(witnesses.length / perRow) * rowH + 6;
    let summary;
    if (failCount > 0) {
      const firstBad = results.indexOf(false);
      const w = witnesses[firstBad];
      summary = '反例：' + w.start + ' 走 ① 落 ' + evalPath(model, w.start, w.path1)
        + '，走 ② 落 ' + evalPath(model, w.start, w.path2) + '（' + w.title + '）—— 确定的否证';
    } else if (doneCount === witnesses.length) {
      summary = '全部 ' + witnesses.length + ' 项通过 —— 这只是有限模型上的抽查，不等于证明（换成大模型或加箭头前，结论都靠证明背书）。';
    } else {
      summary = '已核对 ' + doneCount + ' / ' + witnesses.length + ' 项。点箭头上的小牌可以改写去向；改完审计会作废重来。';
    }
    label(ctx, summary, rect.x, sumY + 12, failCount > 0 ? C.bad : C.fg, { size: 10 });
  }

  function updateReadout() {
    const doneCount = results.filter((r) => r !== null).length;
    const failCount = results.filter((r) => r === false).length;
    const idx = Math.min(cursor, witnesses.length - 1);
    ro.set('模式', mode === 'source' ? '源图：h vs g∘f' : mode === 'functor' ? '函子：保复合' : '自然方块');
    ro.set('已核对', doneCount + ' / ' + witnesses.length + ' 项');
    ro.set('反例', failCount + ' 处');
    ro.set('当前抽查', witnesses[idx] ? witnesses[idx].start + '（' + witnesses[idx].title + '）' : '—');
    ro.set('结论', failCount > 0 ? '有确定的否证（红叉）' : doneCount === witnesses.length ? '本题面全绿：有限抽查通过' : '未查完');
  }

  /* ---------- 编辑 ---------- */

  function cycleChip(chip) {
    if (!chip.editable) return;
    const map = mapOf(model, chip.op);
    const set = chip.set;
    const curIdx = set.indexOf(map[chip.el]);
    map[chip.el] = set[(curIdx + 1) % set.length];
    resetAudit();
  }

  function resetAudit() {
    results = witnesses.map(() => null);
    cursor = 0;
    segT = 0;
    anim = false;
    hold = 0;
    stopPlayback();
    draw();
  }

  function chipAt(px, py) {
    for (let i = chips.length - 1; i >= 0; i -= 1) {
      const c = chips[i];
      if (px >= c.x - 4 && px <= c.x + c.w + 4 && py >= c.y - 4 && py <= c.y + c.h + 4) return c;
    }
    return null;
  }

  function nodeKeyAt(px, py) {
    const keys = modeKeys(mode);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const p = pos[key];
      const { w, h } = boxSize(key);
      if (px >= p.x - w / 2 - 4 && px <= p.x + w / 2 + 4 && py >= p.y - h / 2 - 4 && py <= p.y + h / 2 + 4) return key;
    }
    return null;
  }

  /* ---------- 步进状态机 ---------- */

  function startRaf() {
    if (raf == null && !reduced) raf = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  function beginStep() {
    if (anim || cursor >= witnesses.length) return false;
    if (reduced) {
      finishStep();
      return true;
    }
    anim = true;
    segT = 0;
    hold = 0;
    startRaf();
    return true;
  }

  function finishStep() {
    const w = witnesses[cursor];
    const ok = evalPath(model, w.start, w.path1) === evalPath(model, w.start, w.path2);
    results[cursor] = ok;
    cursor += 1;
    segT = 0;
    anim = false;
    hold = HOLD_DUR;
  }

  function advance(dt) {
    if (anim) {
      segT += dt / STEP_DUR;
      if (segT >= 1) finishStep();
      return;
    }
    if (!playing) return;
    if (hold > 0) {
      hold = Math.max(0, hold - dt);
      return;
    }
    if (cursor < witnesses.length) beginStep();
    else stopPlayback();
  }

  function tick(now) {
    raf = null;
    if (!host.isConnected) {
      stopPlayback();
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!visible) {
      stopRaf();
      return;
    }
    advance(dt);
    draw();
    if (playing || anim) startRaf();
  }

  function stopPlayback() {
    playing = false;
    btnPlay.textContent = reduced ? '减少动效' : '播放';
  }

  function activeOps() {
    const out = new Set();
    let w = null;
    if (anim || (playing && hold > 0)) w = witnesses[Math.min(cursor, witnesses.length - 1)] || null;
    else if (cursor > 0) w = witnesses[cursor - 1];
    if (!w) return out;
    w.path1.concat(w.path2).forEach((op) => { out.add(opKey(op)); });
    return out;
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const chip = chipAt(px, py);
      if (chip) return { kind: 'chip', chip };
      const key = nodeKeyAt(px, py);
      if (key) return { kind: 'node', key };
      return null;
    },
    down(id, px, py) {
      downInfo = { x: px, y: py, chip: id.kind === 'chip' ? id.chip : null };
      if (id.kind === 'node') dragKey = id.key;
    },
    move(id, px, py) {
      if (!dragKey) return;
      const rect = layout().diagram;
      const p = pos[dragKey];
      p.x = clamp(px, rect.x + 34, rect.x + rect.w - 34);
      p.y = clamp(py, rect.y + 26, rect.y + rect.h - 26);
      draw();
    },
    up(id, px, py) {
      if (!dragKey && downInfo && downInfo.chip
        && Math.hypot(px - downInfo.x, py - downInfo.y) < 8) {
        cycleChip(downInfo.chip);
      }
      dragKey = null;
      downInfo = null;
    },
    hover(px, py) {
      const chip = chipAt(px, py);
      const next = chip && chip.editable ? chip : null;
      if (next !== hoverChip) {
        hoverChip = next;
        draw();
      }
    },
    leave() {
      if (hoverChip) {
        hoverChip = null;
        draw();
      }
    },
  });

  btnStep.addEventListener('click', () => { beginStep(); draw(); });
  btnBack.addEventListener('click', () => {
    if (anim) {
      anim = false;
      segT = 0;
    } else if (cursor > 0) {
      cursor -= 1;
      results[cursor] = null;
    }
    hold = 0;
    stopPlayback();
    stopRaf();
    draw();
  });
  btnPlay.addEventListener('click', () => {
    if (reduced) return;
    playing = !playing;
    last = 0;
    if (playing && cursor >= witnesses.length && !anim) playing = false;
    btnPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
    if (playing) startRaf();
    else stopRaf();
    draw();
  });
  btnReset.addEventListener('click', () => {
    const fresh = defaultModel();
    Object.keys(model.C.arrows).forEach((k) => { model.C.arrows[k].map = fresh.C.arrows[k].map; });
    Object.keys(model.D.arrows).forEach((k) => { model.D.arrows[k].map = fresh.D.arrows[k].map; });
    Object.keys(model.alpha).forEach((k) => { model.alpha[k].map = fresh.alpha[k].map; });
    posMode = '';
    stopPlayback();
    stopRaf();
    resetAudit();
  });

  onScreen(host, (v) => {
    visible = v;
    if (!v) stopRaf();
    else if (playing || anim) startRaf();
  });

  draw();
  cv.redraw = draw;

  return {
    destroy() {
      stopPlayback();
      stopRaf();
      cv.redraw = null;
    },
  };
}
