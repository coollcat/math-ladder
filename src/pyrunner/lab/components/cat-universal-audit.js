/* =========================================================================
 * cat-universal-audit —— 泛性质资格年审台（第 67 章 · 泛性质：不构造也能定义）
 * -------------------------------------------------------------------------
 * 一台「逐项年检」的审查机器：把一份泛性质条款拆成一张体检表，
 * 一行一个探针 X，一列一个候选对象 T，格子里是 |Hom(X, T)| 或 |Hom(T, X)|。
 *
 *   mode="terminal"（终对象）：格子 = 从探针打进来的箭头数 k^n
 *   mode="initial"（初始对象）：格子 = 从候选派出去的箭头数 n^k
 *
 * 每按一次「单步」，只揭开一行（一个探针的账），逐行累计结论：
 * 某一格不等于 1 即当场否证；全部恰好为 1 才盖章合格。这对应课文那句
 * 「资格审计是对全类的无限条款」——有限模型全绿只是抽查，不是证明。
 *
 * world="set" 给有限集世界（k^n 的指数形态），world="order" 给偏序世界
 * （Hom 只有 0 或 1，终对象 = 最大元，初始对象 = 最小元）。两个世界的
 * 候选名单不同，但审查流程是同一台机器。
 *
 * 底部「同构条款」对照区：当有两个候选同时合格时，画出自 T 到 T' 与
 * T' 到 T 的唯一箭头，并说明两条复合都只能是恒等——这就是「承认即同一」
 * 的机器版；只有一个候选合格时，如实写明本世界里没有第二个终对象可对照。
 *
 * 契约（```lab 围栏里的 JSON，字段都可省）：
 *   { "type": "cat-universal-audit", "mode": "terminal", "world": "set" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, label, arrow, clamp, el,
  buildSegmented, buildToolbar, buildReadout, mkBtn, clearBg, anim,
} from '../core.js';

/* ---------- 两个世界的候选与探针 ----------
   cell() 返回 { n, why }：n 是箭头总数，why 是一句可读的取值理由。
   两个世界的「箭头数」并不是同一个公式（一个是幂，一个是 0/1），
   所以统一收进 cell()，绘制层只管取数。 */

const WORLDS = {
  set: {
    name: 'Set 世界',
    probes: [
      { key: 'p1', label: '1 元探针', size: 1 },
      { key: 'p2', label: '2 元探针', size: 2 },
      { key: 'p3', label: '3 元探针', size: 3 },
    ],
    cands: [
      { key: 'a', label: '单点 {a}', size: 1 },
      { key: 'b', label: '单点 {b}', size: 1 },
      { key: 'two', label: '双格 {0,1}', size: 2 },
      { key: 'zero', label: '零格', size: 0 },
    ],
    cell(mode, probe, cand) {
      /* 映射的个数：从 n 元集到 k 元集，每位独立挑落脚点，共 k 的 n 次方。
         终对象看「打进来」（定义域是探针），初始对象看「派出去」（定义域是候选）。 */
      const n = mode === 'terminal' ? cand.size ** probe.size : probe.size ** cand.size;
      const why = mode === 'terminal'
        ? 'k^n = ' + cand.size + '^' + probe.size + '（每位移送独立选择）'
        : 'n^k = ' + probe.size + '^' + cand.size + '（每位独立挑选落脚点）';
      return { n, why };
    },
    emptyNote: '空集到空集只有一支空映射（1^0），这正是它会以 1,1,1 通过初始审查的原因。',
  },
  order: {
    name: '偏序世界',
    probes: [
      { key: 'o0', label: '探针 0', idx: 0 },
      { key: 'o1', label: '探针 1', idx: 1 },
      { key: 'o2', label: '探针 2', idx: 2 },
      { key: 'o3', label: '探针 3', idx: 3 },
    ],
    cands: [
      { key: 'o0', label: '0', idx: 0 },
      { key: 'o1', label: '1', idx: 1 },
      { key: 'o2', label: '2', idx: 2 },
      { key: 'o3', label: '3', idx: 3 },
    ],
    cell(mode, probe, cand) {
      /* 偏序范畴里 Hom 至多一个元素：x ≤ y 时有一支箭头，否则一支也没有。
         终对象要求「每个探针到它都恰有一支」，恰好由最大元满足。 */
      const has = mode === 'terminal' ? probe.idx <= cand.idx : cand.idx <= probe.idx;
      const why = mode === 'terminal'
        ? (has ? '探针 ' + probe.idx + ' ≤ 候选 ' + cand.idx + '，恰一支' : '探针 ' + probe.idx + ' 不 ≤ 候选 ' + cand.idx + '，零支')
        : (has ? '候选 ' + cand.idx + ' ≤ 探针 ' + probe.idx + '，恰一支' : '候选 ' + cand.idx + ' 不 ≤ 探针 ' + probe.idx + '，零支');
      return { n: has ? 1 : 0, why };
    },
    emptyNote: '偏序世界的终对象是最大元、初始对象是最小元；夹在中间的元素两头都不合格，正是「不能胜任的候选」。',
  },
};

const MODES = [
  { label: '终对象：入站箭头', value: 'terminal' },
  { label: '初始对象：出站箭头', value: 'initial' },
];

export default function render(host, spec) {
  const safeSpec = spec && typeof spec === 'object' ? spec : {};
  let world = safeSpec.world === 'order' ? 'order' : 'set';
  let mode = safeSpec.mode === 'initial' ? 'initial' : 'terminal';
  let sel = 0;                       /* 当前选中的候选列号 */
  /* progress[world:mode:candKey] = 已揭开的探针行数 */
  const progress = {};

  const keyOf = (cand) => world + ':' + mode + ':' + cand.key;
  const auditedOf = (cand) => progress[keyOf(cand)] || 0;
  const probesNow = () => WORLDS[world].probes;
  const candsNow = () => WORLDS[world].cands;

  function candidates() {
    const w = WORLDS[world];
    return w.cands;
  }

  function countOf(probe, cand) {
    return WORLDS[world].cell(mode, probe, cand);
  }

  function passes(cand) {
    return probesNow().every((p) => countOf(p, cand).n === 1);
  }

  function passingCands() {
    return candidates().filter(passes);
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    世界: WORLDS[world].name,
    '条款': '—',
    '候选': '—',
    '已审查': '—',
    '结论': '—',
    '悬停': '把指针移到表格里的格子上（手机点按看读数）',});
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(MODES, mode, (v) => {
    mode = v;
    sel = 0;
    sync();
    draw();
  }));

  host.appendChild(buildSegmented(
    [{ label: 'Set 世界', value: 'set' }, { label: '偏序世界', value: 'order' }],
    world,
    (v) => {
      world = v;
      sel = 0;
      sync();
      draw();
    },
  ));

  const bStep = mkBtn('单步：审一行');
  const bBack = mkBtn('回退一行');
  const bAll = mkBtn('全部揭开');
  host.appendChild(buildToolbar(bStep, bBack, bAll));

  const cv = setupCanvas(host, 440);

  let hover = null;               /* { row, col } */
  let playAcc = 0;

  /* ---------- 布局 ---------- */

  const geo = { x0: 0, y0: 0, colW: 0, rowH: 34, headH: 30, W: 0, H: 0 };

  function layout(W, H) {
    const pad = 10;
    geo.x0 = pad + 82;                       /* 左边留给探针名 */
    geo.headH = 34;
    geo.rowH = W < 560 ? 30 : 34;
    geo.colW = (W - pad - geo.x0) / candidates().length;
    geo.y0 = 62;
    geo.W = W;
    geo.H = H;
  }

  function cellRect(row, col) {
    return {
      x: geo.x0 + col * geo.colW,
      y: geo.y0 + geo.headH + row * geo.rowH,
      w: geo.colW,
      h: geo.rowH,
    };
  }

  function cellAt(x, y) {
    const rows = probesNow().length;
    const cols = candidates().length;
    if (x < geo.x0 || y < geo.y0 + geo.headH) return null;
    const col = Math.floor((x - geo.x0) / geo.colW);
    const row = Math.floor((y - geo.y0 - geo.headH) / geo.rowH);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  }

  function headAt(x, y) {
    if (y < geo.y0 || y > geo.y0 + geo.headH) return null;
    if (x < geo.x0) return null;
    const col = Math.floor((x - geo.x0) / geo.colW);
    if (col >= 0 && col < candidates().length) return col;
    return null;
  }

  /* ---------- 绘制 ---------- */

  function drawTable(ctx, C) {
    const probes = probesNow();
    const cands = candidates();

    /* 表头：候选名 + 合格徽章 */
    cands.forEach((cand, col) => {
      const cx = geo.x0 + col * geo.colW + geo.colW / 2;
      const hot = col === sel;
      label(ctx, cand.label, cx, geo.y0 + 2, hot ? C.accent2 : C.fg, {
        size: geo.W < 560 ? 10 : 11, align: 'center', weight: hot ? 700 : 400,
      });
      const tag = passes(cand) ? '合格' : '不合格';
      label(ctx, tag, cx, geo.y0 + 17, passes(cand) ? C.ok : C.bad, {
        size: 9.5, align: 'center', weight: 600,
      });
      if (hot) {
        ctx.save();
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(geo.x0 + col * geo.colW + 2, geo.y0 - 12, geo.colW - 4, geo.headH + 20);
        ctx.restore();
      }
    });

    const note = mode === 'terminal'
      ? '每一格 = 从该行探针打向该列候选的箭头总数'
      : '每一格 = 从该列候选派向该行探针的箭头总数';
    label(ctx, note, geo.x0, geo.y0 - 18, C.axis, { size: 10 });

    probes.forEach((probe, row) => {
      const ry = geo.y0 + geo.headH + row * geo.rowH;
      label(ctx, probe.label, geo.x0 - 8, ry + geo.rowH / 2 + 4, C.fg, {
        size: 10.5, align: 'right',
      });
      cands.forEach((cand, col) => {
        const r = cellRect(row, col);
        const audited = row < auditedOf(cand);
        const { n } = countOf(probe, cand);
        const isHover = hover && hover.row === row && hover.col === col;
        ctx.save();
        ctx.fillStyle = !audited ? C.soft : (n === 1 ? C.ok : C.bad);
        ctx.globalAlpha = audited ? 0.16 : 0.35;
        ctx.fillRect(r.x + 2, r.y + 1, r.w - 4, r.h - 2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isHover ? C.fg : C.grid;
        ctx.lineWidth = isHover ? 1.8 : 1;
        ctx.strokeRect(r.x + 2.5, r.y + 1.5, r.w - 5, r.h - 3);
        ctx.restore();
        const cx = r.x + r.w / 2;
        if (!audited) {
          label(ctx, '待审', cx, r.y + r.h / 2 + 4, C.axis, { size: 10, align: 'center' });
        } else {
          label(ctx, String(n), cx, r.y + r.h / 2 + 4, n === 1 ? C.ok : C.bad, {
            size: 12, align: 'center', weight: 700,
          });
          label(ctx, n === 1 ? '✓ 恰一支' : '✗ ' + (n === 0 ? '缺席' : '多余'),
            cx, r.y + r.h / 2 + 15, n === 1 ? C.ok : C.bad, { size: 8.5, align: 'center' });
        }
      });
    });

    const tableBottom = geo.y0 + geo.headH + probes.length * geo.rowH;
    return tableBottom;
  }

  function drawVerdict(ctx, C, y) {
    const cand = candidates()[clamp(sel, 0, candidates().length - 1)];
    if (!cand) return y;
    const done = auditedOf(cand);
    const total = probesNow().length;
    const all = done >= total;
    let msg;
    if (!all) {
      msg = '已审 ' + done + ' / ' + total + ' 个探针。条款要求「每一个探针都恰好一支」，差一个都不算数。';
      label(ctx, msg, 10, y + 14, C.fg, { size: 10.5 });
      return y + 26;
    }
    const badRow = probesNow().findIndex((p) => countOf(p, cand).n !== 1);
    if (badRow >= 0) {
      const p = probesNow()[badRow];
      const { n, why } = countOf(p, cand);
      msg = '否证：' + cand.label + ' 在' + p.label + '处得到 ' + n + ' 支（' + why + '），唯一条款当场破产。';
      label(ctx, msg, 10, y + 14, C.bad, { size: 10.5 });
    } else {
      msg = '全部 ' + total + ' 个探针恰好一支：' + cand.label + ' 通过' +
        (mode === 'terminal' ? '终对象' : '初始对象') + '资格审查。';
      label(ctx, msg, 10, y + 14, C.ok, { size: 10.5, weight: 700 });
    }
    return y + 26;
  }

  function drawIso(ctx, C, y) {
    const H = geo.H;
    const boxH = H - y - 14;
    if (boxH < 70) return;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(8, y, geo.W - 16, boxH, 8);
      ctx.stroke();
    } else {
      ctx.strokeRect(8, y, geo.W - 16, boxH);
    }
    ctx.restore();
    label(ctx, '同构条款：两个候选都合格时，它们之间只能有唯一一支互逆的箭头', 18, y + 18, C.fg,
      { size: 10.5, weight: 700 });

    const ok = passingCands();
    if (ok.length === 0) {
      label(ctx, '眼下没有任何候选通过审查——先让它合格，才谈得上「承认即同一」。', 18, y + 40, C.bad, { size: 10.5 });
      return;
    }
    if (ok.length === 1) {
      label(ctx, '本世界只有 ' + ok[0].label + ' 一个候选合格，没有第二个合格者可与它对照；', 18, y + 40, C.axis, { size: 10.5 });
      label(ctx, '但换个同样合格的候选（例如给单点集合改个名字）来审，结论会一模一样——档案相同即同构。',
        18, y + 58, C.axis, { size: 10.5 });
      return;
    }

    const t1 = ok[0];
    const t2 = ok[1];
    const cy = y + 44;
    const bx = 30;
    const bw = 96;
    const bh = 34;
    const gap = Math.min(220, geo.W - 2 * bx - 2 * bw - 40);
    const x1 = bx;
    const x2 = bx + bw + Math.max(90, gap);
    const drawBox = (x, text, col) => {
      ctx.save();
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, cy, bw, bh, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeRect(x, cy, bw, bh);
      }
      ctx.restore();
      label(ctx, text, x + bw / 2, cy + bh / 2 + 4, col, { size: 11, align: 'center', weight: 700 });
    };
    drawBox(x1, 'T = ' + t1.label, C.accent);
    drawBox(x2, "T' = " + t2.label, C.accent2);
    arrow(ctx, x1 + bw + 4, cy + 10, x2 - 6, cy + 10, C.ok, 1.8, 7);
    arrow(ctx, x2 - 6, cy + bh - 10, x1 + bw + 4, cy + bh - 10, C.ok, 1.8, 7);
    label(ctx, 'α', (x1 + bw + x2) / 2, cy + 4, C.ok, { size: 10, align: 'center', weight: 700 });
    label(ctx, 'β', (x1 + bw + x2) / 2, cy + bh + 2, C.ok, { size: 10, align: 'center', weight: 700 });
    label(ctx, '每支都声称「全世界只有我这一支」——于是 β∘α 与 id 只能相等，', 18, cy + bh + 30, C.fg, { size: 10.5 });
    label(ctx, 'α∘β 与 id 同理：两个终对象必然同构。整套推理没用过它们内部的任何构造。',
      18, cy + bh + 46, C.fg, { size: 10.5 });
    if (WORLDS[world].emptyNote) {
      label(ctx, WORLDS[world].emptyNote, 18, cy + bh + 64, C.axis, { size: 10 });
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const head = mode === 'terminal'
      ? '终对象年检：给每个探针数「打向候选」的箭头，必须恰好一支'
      : '初始对象年检：给每个探针数「候选派出去」的箭头，必须恰好一支';
    label(ctx, head, 10, 18, C.fg, { size: 11.5, weight: 700 });
    label(ctx, '点表头选中候选，点「单步」揭开下一行账；格子里的数就是箭头总数。',
      10, 36, C.axis, { size: 10 });

    const tb = drawTable(ctx, C);
    const after = drawVerdict(ctx, C, tb + 8);
    drawIso(ctx, C, after + 6);
  }

  /* ---------- 读数与状态 ---------- */

  function sync() {
    const cand = candidates()[clamp(sel, 0, candidates().length - 1)];
    if (!cand) return;
    const done = Math.min(auditedOf(cand), probesNow().length);
    const total = probesNow().length;
    ro.set('世界', WORLDS[world].name);
    ro.set('条款', mode === 'terminal' ? '∀X, |Hom(X,T)| = 1' : '∀X, |Hom(I,X)| = 1');
    ro.set('候选', cand.label + '（列 ' + (sel + 1) + '）');
    ro.set('已审查', done + ' / ' + total + ' 个探针');
    const all = done >= total;
    if (!all) ro.set('结论', '审查中');
    else ro.set('结论', passes(cand) ? '合格：恰好一支' : '不合格：有格子不是 1');
  }

  function setHoverText() {
    if (!hover) {
      ro.set('悬停', '把指针移到表格里的格子上（手机点按看读数）');
      return;
    }
    const probe = probesNow()[hover.row];
    const cand = candidates()[hover.col];
    if (!probe || !cand) return;
    const { n, why } = countOf(probe, cand);
    const audited = hover.row < auditedOf(cand);
    ro.set('悬停', (audited ? '' : '（未揭开）') + probe.label + ' → ' + cand.label
      + '：' + n + ' 支　' + why);
  }

  function auditNext() {
    const cand = candidates()[clamp(sel, 0, candidates().length - 1)];
    if (!cand) return false;
    const k = keyOf(cand);
    const cur = progress[k] || 0;
    if (cur >= probesNow().length) return false;
    progress[k] = cur + 1;
    return true;
  }

  function auditBack() {
    const cand = candidates()[clamp(sel, 0, candidates().length - 1)];
    if (!cand) return;
    const k = keyOf(cand);
    const cur = progress[k] || 0;
    if (cur > 0) progress[k] = cur - 1;
  }

  function revealAll() {
    const cand = candidates()[clamp(sel, 0, candidates().length - 1)];
    if (!cand) return;
    progress[keyOf(cand)] = probesNow().length;
  }

  function resetAll() {
    Object.keys(progress).forEach((k) => { delete progress[k]; });
    playAcc = 0;
  }

  /* ---------- 交互 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      const head = headAt(x, y);
      if (head !== null) return { kind: 'head', col: head };
      const c = cellAt(x, y);
      if (c) return { kind: 'cell', row: c.row, col: c.col };
      return null;
    },
    down(id) {
      if (id.kind === 'head') {
        sel = id.col;
        sync();
        draw();
        return;
      }
      /* 点某一格：先选中该列；若点的正是下一个待审行，顺手揭开它 */
      if (id.col !== sel) sel = id.col;
      const cand = candidates()[sel];
      if (cand && id.row === auditedOf(cand)) auditNext();
      sync();
      draw();
    },
    hover(x, y) {
      const c = cellAt(x, y);
      const next = c && (c.row !== (hover && hover.row) || c.col !== (hover && hover.col)) ? c : hover;
      if (c === null && hover === null) return;
      hover = c;
      cv.canvas.style.cursor = c ? 'pointer' : 'default';
      setHoverText();
      draw();
      void next;
    },
    leave() {
      hover = null;
      cv.canvas.style.cursor = 'default';
      setHoverText();
      draw();
    },
  });

  bStep.addEventListener('click', () => {
    auditNext();
    sync();
    draw();
  });
  bBack.addEventListener('click', () => {
    auditBack();
    sync();
    draw();
  });
  bAll.addEventListener('click', () => {
    revealAll();
    sync();
    draw();
  });

  const controls = anim(host, {
    onTick(dt) {
      playAcc += dt;
      if (playAcc < 0.55) return;
      playAcc = 0;
      if (!auditNext()) {
        controls.stop();
        return;
      }
      sync();
      draw();
    },
    onReset() {
      resetAll();
      sync();
      draw();
    },
  });

  sync();
  draw();
  cv.redraw = draw;

  return {
    destroy() {
      controls.stop();
      cv.redraw = null;
    },
  };
}