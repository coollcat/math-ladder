/* =========================================================================
 * cat-cone-shaper —— 锥的观测台 / 余锥的焊接件（第 67 章 · 极限与余极限）
 * -------------------------------------------------------------------------
 * 图案取最简单的「余角形」：X —f→ Z ←g— Y。两个模式是同一张图案的两面。
 *
 * mode="limit"（极限 · 观测台）
 *   在图案上方造一座观测台 W，向 X、Y 各引一支下山道 p、q。
 *   合格的锥必须让方形闭合：f∘p = g∘q。
 *   机器一共能造 9 座候选台（p 有 3 个落点、q 有 3 个落点），
 *   逐座审：闭合的收进「合法锥名册」，破了的当场红叉并说出
 *   f(p) 与 g(q) 各是哪个底座元素。
 *   审完 9 座，名册大小恰等于 Σ_z |f⁻¹(z)|·|g⁻¹(z)| —— 这就是拉回的
 *   分柜清点公式，也是本课 Python 实验里那个 4。
 *
 * mode="colimit"（余极限 · 焊接件）
 *   把 X⊔Y 的 6 个成员摊在桌上，按图上箭头一处处粘死（f(x)=g(y) 就去粘）。
 *   一条规则一条规则地打开/关掉：没粘够时方形不闭合，压根不是余锥；
 *   全粘上之后等价类收敛到「每个底座元素一类」，任何别的焊法都只能
 *   唯一地经这些类继续加工——这就是初始性。
 *   额外给一条「图上没有箭头支持」的越权粘合，用来演示焊过头：
 *   两个本该分开的加工路线被焊死，名册当场塌陷。
 *
 * 口径诚实声明：这是有限玩具模型上的逐项核对，全绿只说明这个模型里
 * 没找到反例；真正的极限/余极限要对「所有锥」说唯一接驳。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "cat-cone-shaper", "mode": "limit" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, arrow, clamp, buildToolbar, buildSegmented,
  buildReadout, mkBtn, clearBg,
} from '../core.js';

/* ---------- 图案：X —f→ Z ←g— Y ----------
   底课的四步例题用的正是这份数据（f 送两位去 z1、一位去 z2；
   g 送一位去 z1、两位去 z2），所以拉回大小是 2×1 + 1×2 = 4。 */
const X_SET = ['x1', 'x2', 'x3'];
const Y_SET = ['y1', 'y2', 'y3'];
const Z_SET = ['z1', 'z2'];
const F_MAP = { x1: 'z1', x2: 'z1', x3: 'z2' };
const G_MAP = { y1: 'z1', y2: 'z2', y3: 'z2' };

/* 9 座候选锥：p 的落点 × q 的落点，按「先扫 X 再扫 Y」排定顺序，
   与课文的逐对枚举同序，回退/播放时顺序可预期。 */
const CANDS = [];
X_SET.forEach((p) => {
  Y_SET.forEach((q) => {
    CANDS.push({ p, q, ok: F_MAP[p] === G_MAP[q] });
  });
});

/* 余极限模式的粘合规则。
   r1..r4 是图上箭头**强制**的（f 与 g 落到同一个 z，必须粘）；
   r5 是人为越权粘合，图上没有任何箭头支持它。 */
const RULES = [
  { id: 'r1', a: 'x1', b: 'y1', forced: true, why: 'f(x1) = g(y1) = z1' },
  { id: 'r2', a: 'x2', b: 'y1', forced: true, why: 'f(x2) = g(y1) = z1' },
  { id: 'r3', a: 'x3', b: 'y2', forced: true, why: 'f(x3) = g(y2) = z2' },
  { id: 'r4', a: 'x3', b: 'y3', forced: true, why: 'f(x3) = g(y3) = z2' },
  { id: 'r5', a: 'x1', b: 'x3', forced: false, why: '图上没有箭头支持，纯属人为越权' },
];

const ALL_ELEMS = X_SET.concat(Y_SET);

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = safe.mode === 'colimit' ? 'colimit' : 'limit';

  /* ---------- 极限模式的审计状态 ---------- */
  let done = 0;                       /* 已审到第几座候选锥（0..CANDS.length） */

  /* ---------- 余极限模式的粘合状态 ---------- */
  /* glueStep：已粘了几条**强制**规则（0..4）——「一条一条粘死」就是单步的语义。
     over：那条图上没有箭头支持的越权粘合（r5）是否打开。 */
  let glueStep = 0;
  let over = false;

  /* ---------- 并查集：把粘合规则闭包成等价类 ---------- */
  function classes(includeOver) {
    const parent = {};
    ALL_ELEMS.forEach((k) => { parent[k] = k; });
    const find = (k) => {
      let cur = k;
      while (parent[cur] !== cur) cur = parent[cur];
      return cur;
    };
    const union = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    RULES.forEach((r, i) => {
      const active = r.forced ? i < glueStep : includeOver;
      if (active) union(r.a, r.b);
    });
    const groups = {};
    ALL_ELEMS.forEach((k) => {
      const root = find(k);
      if (!groups[root]) groups[root] = [];
      groups[root].push(k);
    });
    return Object.keys(groups).map((k) => groups[k]);
  }

  function gluedCount() {
    return clamp(glueStep, 0, RULES.filter((r) => r.forced).length);
  }

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    '模式': '—',
    '当前候选': '—',
    '\'方形 f(p) ?= g(q)\'': '—',
    '合格名册': '—',
    '等价类': '—',
    '结论': '—',});
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [{ label: '极限：锥的观测台', value: 'limit' }, { label: '余极限：焊接件', value: 'colimit' }],
    mode,
    (v) => {
      mode = v;
      sync();
      draw();
    },
  ));

  const bStep = mkBtn('单步：审一座锥');
  const bBack = mkBtn('回退一步');
  const bAll = mkBtn('全部审完');
  const bGlue = mkBtn('切换越权粘合 r5');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bStep, bBack, bAll));
  host.appendChild(buildToolbar(bGlue, bReset));

  const cv = setupCanvas(host, 440);

  /* ctx 提到 render 作用域：drawRosterLimit / drawColimit / drawRosterColimit 是与
     drawLimit 平级的兄弟函数，拿不到 drawLimit 函数体里的 const ctx（曾因此整块
     抛 ReferenceError → ctx is not defined，两种模式首绘全塌）。 */
  const ctx = cv.ctx;
  /* ---------- 布局 ---------- */

  const geo = { W: 0, H: 0, dTop: 0, dBottom: 0, narrow: false };

  function layout(W, H) {
    const narrow = W < 620;
    geo.W = W;
    geo.H = H;
    geo.narrow = narrow;
    geo.dTop = 34;
    geo.dBottom = H - (narrow ? 150 : 132);
  }

  /* 图案三个点的坐标：X 左、Y 右、Z 中下；锥顶 W 在其正上方 */
  function patternPos() {
    const W = geo.W;
    const top = geo.dTop;
    const bot = geo.dBottom;
    const midY = top + (bot - top) * 0.66;
    return {
      X: { x: 46 + W * 0.10, y: midY },
      Y: { x: W - 46 - W * 0.10, y: midY },
      Z: { x: W / 2, y: bot - 6 },
      W: { x: W / 2, y: top + 22 },
    };
  }

  function box(ctx, C, p, text, color, w, h, size) {
    const bw = w || 58;
    const bh = h || 26;
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(p.x - bw / 2, p.y - bh / 2, bw, bh, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeRect(p.x - bw / 2, p.y - bh / 2, bw, bh);
    }
    ctx.restore();
    label(ctx, text, p.x, p.y + 4, color, { size: size || 11, align: 'center', weight: 700 });
  }

  /* ---------- 极限模式 ---------- */

  function drawLimit(C) {
    const pos = patternPos();
    const W = geo.W;

    /* 底座图案箭头（蓝 = 图案自带的箭头） */
    const pat = C.named('blue');
    arrow(ctx, pos.X.x + 40, pos.X.y + 4, pos.Z.x - 40, pos.Z.y - 10, pat, 2, 8);
    arrow(ctx, pos.Y.x - 40, pos.Y.y + 4, pos.Z.x + 40, pos.Z.y - 10, pat, 2, 8);
    label(ctx, 'f', (pos.X.x + pos.Z.x) / 2 - 10, (pos.X.y + pos.Z.y) / 2 - 6, pat, { size: 11, weight: 700 });
    label(ctx, 'g', (pos.Y.x + pos.Z.x) / 2 + 10, (pos.Y.y + pos.Z.y) / 2 - 6, pat, { size: 11, weight: 700 });

    /* 已审的最后一座锥：画出它的两支投影并标注闭合与否 */
    const idx = clamp(done - 1, 0, CANDS.length - 1);
    const cur = done > 0 ? CANDS[idx] : null;
    if (cur) {
      const col = cur.ok ? C.ok : C.bad;
      arrow(ctx, pos.W.x - 16, pos.W.y + 14, pos.X.x + 16, pos.X.y - 18, col, 2.2, 8);
      arrow(ctx, pos.W.x + 16, pos.W.y + 14, pos.Y.x - 16, pos.Y.y - 18, col, 2.2, 8);
      label(ctx, 'p→' + cur.p, (pos.W.x + pos.X.x) / 2 - 16, (pos.W.y + pos.X.y) / 2, col, { size: 10.5, weight: 700 });
      label(ctx, 'q→' + cur.q, (pos.W.x + pos.Y.x) / 2 + 10, (pos.W.y + pos.Y.y) / 2, col, { size: 10.5, weight: 700 });
    }

    box(ctx, C, pos.W, 'W 观测台', cur ? (cur.ok ? C.ok : C.bad) : C.axis, 92, 28, 11.5);
    box(ctx, C, pos.X, 'X', pat, 44, 26, 12);
    box(ctx, C, pos.Y, 'Y', pat, 44, 26, 12);
    box(ctx, C, pos.Z, 'Z 底座', pat, 76, 26, 11.5);

    /* 三堆元素：X 的成员、Y 的成员、底座元素 */
    const tagY = pos.X.y + 26;
    label(ctx, X_SET.join(' '), pos.X.x, tagY + 12, C.axis, { size: 10, align: 'center' });
    label(ctx, Y_SET.join(' '), pos.Y.x, tagY + 12, C.axis, { size: 10, align: 'center' });
    label(ctx, Z_SET.join('  '), pos.Z.x, pos.Z.y + 22, C.axis, { size: 10, align: 'center' });

    /* 判定卡 */
    const bx = 10;
    const by = pos.W.y + 22;
    if (cur) {
      const lhs = F_MAP[cur.p];
      const rhs = G_MAP[cur.q];
      label(ctx, '方形条件：f∘p = g∘q', bx, by + 8, C.fg, { size: 10.5, weight: 700 });
      label(ctx, 'f(' + cur.p + ') = ' + lhs + '　　g(' + cur.q + ') = ' + rhs, bx, by + 24,
        cur.ok ? C.ok : C.bad, { size: 10.5, weight: 600 });
      label(ctx, cur.ok ? '两路落到同一个底座元素 —— 这是一座合法的锥。'
        : '两路落点不同 —— 方形没闭合，连锥都算不上，进不了候选台。',
      bx, by + 40, cur.ok ? C.ok : C.bad, { size: 10 });
    } else {
      label(ctx, '还没开始审。按「单步」逐座检查这 9 座候选锥。', bx, by + 12, C.axis, { size: 10.5 });
    }

    /* 名册条 */
    drawRosterLimit(C, 10, geo.dBottom + 4, W - 20);

    void ctx;
  }

  function drawRosterLimit(C, x, y, w) {
    const okList = CANDS.filter((c, i) => i < done && c.ok);
    label(ctx, '合法锥名册（' + okList.length + ' / ' + CANDS.length + ' 座候选）：', x, y + 10, C.fg,
      { size: 10.5, weight: 700 });
    const perRow = geo.narrow ? 3 : 6;
    const cw = w / perRow;
    CANDS.forEach((c, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const cx = x + col * cw;
      const cy = y + 26 + row * 17;
      const seen = i < done;
      const txt = '(' + c.p + ',' + c.q + ')' + (seen ? (c.ok ? ' ✓' : ' ✗') : ' …');
      label(ctx, txt, cx, cy, !seen ? C.axis : (c.ok ? C.ok : C.bad),
        { size: 10, weight: seen && c.ok ? 700 : 400 });
    });
    const rows = Math.ceil(CANDS.length / perRow);
    const sumY = y + 26 + rows * 17 + 6;
    label(ctx, '分柜清点：Σ over z of |f⁻¹(z)|·|g⁻¹(z)| = 2×1 + 1×2 = 4 —— 与名册大小对齐',
      x, sumY, C.axis, { size: 10 });
    if (done >= CANDS.length) {
      label(ctx, '9 座全审完：名册恰好 4 座。这 4 座就是拉回的元素，也是所有合格锥里最瘦的那一族。',
        x, sumY + 16, C.ok, { size: 10 });
    }
  }

  /* ---------- 余极限模式 ---------- */

  function drawColimit(C) {
    const cls = classes(over);
    const W = geo.W;
    const lay = {};
    const top = 74;
    const gapX = Math.min(96, (W - 120) / 2.4);
    X_SET.forEach((k, i) => { lay[k] = { x: W / 2 - gapX, y: top + i * 38 }; });
    Y_SET.forEach((k, i) => { lay[k] = { x: W / 2 + gapX, y: top + i * 38 }; });

    /* 同类的元素之间画虚线 = 已被粘死 */
    cls.forEach((g, gi) => {
      const col = C.series(gi);
      g.forEach((k, i) => {
        g.slice(i + 1).forEach((k2) => {
          const a = lay[k];
          const b = lay[k2];
          ctx_line(C, col, a, b);
        });
      });
    });

    /* 元素盒 */
    ALL_ELEMS.forEach((k) => {
      const gi = cls.findIndex((g) => g.indexOf(k) >= 0);
      box(cv.ctx, C, lay[k], k, C.series(Math.max(0, gi)), 46, 26, 11);
    });

    /* 左右两列标题 */
    label(ctx, 'X 的成员', lay.x1.x, top - 22, C.named('blue'), { size: 10.5, align: 'center', weight: 700 });
    label(ctx, 'Y 的成员', lay.y1.x, top - 22, C.named('green'), { size: 10.5, align: 'center', weight: 700 });

    /* 底座与箭头：说明粘合规则的来源 */
    const zy = top + 3 * 38 + 6;
    box(cv.ctx, C, { x: W / 2, y: zy + 14 }, 'Z 底座：' + Z_SET.join(' '), C.named('blue'), 150, 26, 11);
    label(ctx, 'f 与 g 落到同一个 z 的两处，就是必须粘死的两处；r5 没有任何 z 支持。',
      10, zy + 42, C.axis, { size: 10 });

    drawRosterColimit(C, 10, zy + 54, W - 20, cls);

    function ctx_line(CC, col, a, b) {
      const c = cv.ctx;
      c.save();
      c.strokeStyle = col;
      c.lineWidth = 1.4;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
      c.restore();
    }
  }

  function drawRosterColimit(C, x, y, w, cls) {
    const forcedOn = gluedCount();
    label(ctx, '粘合规则（' + forcedOn + ' / 4 条强制规则已打开' + (over ? '，外加 1 条越权 r5' : '') + '）：',
      x, y + 10, C.fg, { size: 10.5, weight: 700 });
    RULES.forEach((r, i) => {
      const col = x + (i % 3) * (w / 3);
      const row = y + 26 + Math.floor(i / 3) * 16;
      const active = r.forced ? i < glueStep : over;
      const mark = active ? '■' : '□';
      label(ctx, mark + ' ' + r.id + ' ' + r.a + '~' + r.b, col, row,
        active ? (r.forced ? C.ok : C.bad) : C.axis, { size: 10 });
    });
    const baseY = y + 26 + Math.ceil(RULES.length / 3) * 16 + 8;
    label(ctx, '等价类盘点：' + cls.length + ' 类　' + cls.map((g, i) => '第 ' + (i + 1) + ' 类 {' + g.join(',') + '}').join('　'),
      x, baseY, C.fg, { size: 10 });
    let msg;
    if (forcedOn < RULES.filter((r) => r.forced).length) {
      msg = '强制规则没粘全：方形不闭合，这还不是余锥——任何别的焊法都不能从它继续加工。';
    } else if (over) {
      msg = '越权 r5 把 x1 与 x3 焊成一类：本该分开的两条加工路线被焊死，商集从 2 类塌成 1 类。';
    } else {
      msg = '4 条强制规则全开：等价类恰好每个底座元素一类。任何别的焊法只能唯一地经这两类继续加工——这就是初始性。';
    }
    label(ctx, msg, x, baseY + 18, over && forcedOn === 4 ? C.bad : (forcedOn === 4 ? C.ok : C.axis),
      { size: 10 });
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const head = mode === 'limit'
      ? '极限：在图案上方造观测台 W，两支投影要让方形 f∘p = g∘q 闭合'
      : '余极限：把 6 个成员按箭头认亲粘死，最省料的焊接件就是余极限';
    label(ctx, head, 10, 18, C.fg, { size: 11.5, weight: 700 });

    if (mode === 'limit') drawLimit(C);
    else drawColimit(C);
  }

  /* ---------- 读数 ---------- */

  function sync() {
    const okList = CANDS.filter((c, i) => i < done && c.ok);
    const idx = clamp(done - 1, 0, CANDS.length - 1);
    const cur = done > 0 ? CANDS[idx] : null;
    const cls = classes(over);
    const forcedOn = gluedCount();

    ro.set('模式', mode === 'limit' ? '极限：锥的观测台' : '余极限：焊接件');

    if (mode === 'limit') {
      ro.set('当前候选', cur ? '(' + cur.p + ', ' + cur.q + ')' : '未开始');
      ro.set('方形 f(p) ?= g(q)', cur ? (cur.ok ? '闭合' : '破裂') : '—');
      ro.set('合格名册', okList.length + ' 座（已审 ' + done + ' / ' + CANDS.length + '）');
      ro.set('等价类', '—（本模式不看粘合）');
      ro.set('结论', done === 0 ? '按「单步」开始逐座审查'
        : (done >= CANDS.length ? '审完：名册 4 座 = 拉回的分柜清点结果' : '审查中'));
    } else {
      ro.set('当前候选', '—（本模式不看投影）');
      ro.set('方形 f(p) ?= g(q)', forcedOn === 4 ? '闭合' : '未闭合');
      ro.set('合格名册', '—（本模式看粘合）');
      ro.set('等价类', cls.length + ' 类（强制 ' + forcedOn + '/4' + (over ? ' + 越权 r5' : '') + '）');
      ro.set('结论', forcedOn < 4 ? '粘合不足：还不是余锥'
        : over ? '越权粘合：焊过头，商集塌成 1 类'
          : '粘合到位：等价类与底座元素一一对应');
    }

    bGlue.disabled = mode !== 'colimit';
    bStep.disabled = false;
    bBack.disabled = false;
    bAll.disabled = mode !== 'limit';
  }

  /* ---------- 交互 ---------- */

  bStep.addEventListener('click', () => {
    if (mode === 'limit') {
      done = Math.min(done + 1, CANDS.length);
    } else {
      glueStep = Math.min(glueStep + 1, RULES.filter((r) => r.forced).length);
    }
    sync();
    draw();
  });
  bBack.addEventListener('click', () => {
    if (mode === 'limit') {
      done = Math.max(done - 1, 0);
    } else {
      glueStep = Math.max(glueStep - 1, 0);
    }
    sync();
    draw();
  });
  bAll.addEventListener('click', () => {
    if (mode !== 'limit') return;
    done = CANDS.length;
    sync();
    draw();
  });
  bGlue.addEventListener('click', () => {
    if (mode !== 'colimit') return;
    over = !over;
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    done = 0;
    over = false;
    glueStep = 0;
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    destroy() { cv.redraw = null; },
  };
}