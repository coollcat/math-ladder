/* =========================================================================
 * cat-hom-table —— Hom 集合表 / 外景档案 / 伴随对拍（第 67 章 · Yoneda 与伴随）
 * -------------------------------------------------------------------------
 * 三个模式共用一张「箭头清点」的底账：
 *
 * mode="table"（Hom 表）
 *   3×3 的格子，行是探针 A（1/2/3 元），列是目标 B（1/2/3 元），
 *   格子里是 |Hom(A,B)| = |B|^|A|。点一格，下方把那几支函数真的枚举出来
 *   （超过 8 支就报总数并只列前 8 支）——「底数是接收方、指数是探针」
 *   这句话在这里是可以逐格核对的，而不是背下来的口诀。
 *
 * mode="profile"（Yoneda 外景档案）
 *   固定一个目标对象 C，把探针 1/2/3 元逐个问一遍：「有多少支箭头指向 C？」
 *   得到的三个数就是 C 的档案。换一个候选对象再读一份，两页逐项比对：
 *   页页相同即可断同构（Yoneda 嵌入的完全忠实性）；不同则当场不是同构。
 *   「重命名」按钮把 C 的成员换套标签，档案纹丝不动——这就是
 *   「内部构造整个可以遗忘，档案却把你钉死」的机器版。
 *
 * mode="adjunction"（伴随对拍）
 *   左边问「词世界的保乘法映射 Free(X) → M」，右边问「字母世界的普通函数
 *   X → U(M)」。两侧逐条对齐：每支指派唯一决定一支同态，反之亦然。
 *   点一条右侧指派，左边对应的同态当场点亮，并给出两个词的像作证据。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "cat-hom-table", "mode": "table" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, label, clamp,
  buildSegmented, buildToolbar, buildReadout, mkBtn, clearBg,
} from '../core.js';

const SETS = {
  1: ['a'],
  2: ['a', 'b'],
  3: ['a', 'b', 'c'],
};

/* 从 dom 到 cod 的全部函数：逐位独立挑落脚点，共 |cod|^|dom| 支。
   这里真的枚举出来（不是只算个数），供「点一格看实物」用。 */
function allMaps(dom, cod) {
  let acc = [[]];
  dom.forEach(() => {
    const next = [];
    acc.forEach((m) => {
      cod.forEach((v) => { next.push(m.concat([v])); });
    });
    acc = next;
  });
  return acc;
}

function homCount(a, b) {
  /* |Hom(A,B)|：底数是接收方 B 的大小，指数是探针 A 的大小 */
  return Math.pow(b, a);
}

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = ['table', 'profile', 'adjunction'].indexOf(safe.mode) >= 0 ? safe.mode : 'table';

  /* ---------- table / profile 共用的选择状态 ---------- */
  let cellA = 3;          /* 行：探针大小 */
  let cellB = 2;          /* 列：目标大小 */
  let profC = 2;          /* profile 模式的目标对象大小 */
  let profAlt = 2;        /* 对照对象大小 */
  let renamed = false;    /* 是否已把 C 的成员换了套标签 */

  /* ---------- adjunction 的状态 ---------- */
  const LETTERS = ['a', 'b'];
  const MONOID = [0, 1, 2];          /* Z/3：余数加法世界 */
  let adjPick = 0;                   /* 点中的右侧指派序号 */
  let adjRevealed = 0;               /* 逐条揭开的对齐行数 */

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    '模式': '—',
    '格子': '—',
    '箭头总数': '—',
    '档案': '—',
    '结论': '—',
    '提示': '点格子或按钮试试',});
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [
      { label: 'Hom 表', value: 'table' },
      { label: '外景档案', value: 'profile' },
      { label: '伴随对拍', value: 'adjunction' },
    ],
    mode,
    (v) => {
      mode = v;
      sync();
      draw();
    },
  ));

  const bStep = mkBtn('单步');
  const bBack = mkBtn('回退');
  const bRename = mkBtn('给成员换套名字');
  host.appendChild(buildToolbar(bStep, bBack, bRename));

  const cv = setupCanvas(host, 430);

  /* ---------- 布局 ---------- */

  const geo = { W: 0, H: 0, tableTop: 58, tableLeft: 78, cellW: 0, cellH: 0 };

  function layout(W, H) {
    geo.W = W;
    geo.H = H;
    geo.tableLeft = W < 560 ? 62 : 78;
    geo.tableTop = 52;
    geo.cellW = (W - geo.tableLeft - 14) / 3;
    geo.cellH = W < 560 ? 44 : 50;
  }

  function cellAt(x, y) {
    if (x < geo.tableLeft || y < geo.tableTop) return null;
    const col = Math.floor((x - geo.tableLeft) / geo.cellW);
    const row = Math.floor((y - geo.tableTop) / geo.cellH);
    if (col < 0 || col > 2 || row < 0 || row > 2) return null;
    return { row, col };
  }

  /* ---------- table 模式 ---------- */

  function drawTable(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    label(ctx, '每一格 = |Hom(A, B)| = |B|^|A|：底数是接收方，指数是探针', 10, 18, C.fg,
      { size: 11, weight: 700 });
    label(ctx, '点任一格，下方把那一格的函数真的枚举出来。', 10, 34, C.axis, { size: 10 });

    for (let col = 0; col < 3; col += 1) {
      const x = geo.tableLeft + col * geo.cellW + geo.cellW / 2;
      const size = col + 1;
      label(ctx, size + ' 元目标', x, geo.tableTop - 8, C.accent, { size: 10.5, align: 'center', weight: 700 });
    }
    for (let row = 0; row < 3; row += 1) {
      const y = geo.tableTop + row * geo.cellH + geo.cellH / 2 + 4;
      const size = row + 1;
      label(ctx, size + ' 元探针', geo.tableLeft - 8, y, C.fg, { size: 10.5, align: 'right' });
    }

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const a = row + 1;
        const b = col + 1;
        const x = geo.tableLeft + col * geo.cellW;
        const y = geo.tableTop + row * geo.cellH;
        const hot = (a === cellA && b === cellB);
        ctx.save();
        ctx.fillStyle = hot ? C.accent : C.soft;
        ctx.globalAlpha = hot ? 0.16 : 0.45;
        ctx.fillRect(x + 2, y + 2, geo.cellW - 4, geo.cellH - 4);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hot ? C.accent : C.grid;
        ctx.lineWidth = hot ? 2 : 1;
        ctx.strokeRect(x + 2.5, y + 2.5, geo.cellW - 5, geo.cellH - 5);
        ctx.restore();
        label(ctx, String(homCount(a, b)), x + geo.cellW / 2, y + geo.cellH / 2 + 5,
          hot ? C.accent : C.fg, { size: 16, align: 'center', weight: 700 });
        label(ctx, b + '^' + a, x + geo.cellW - 8, y + 14, C.axis, { size: 9, align: 'right' });
      }
    }

    /* 选中格的实物枚举 */
    let y0 = geo.tableTop + 3 * geo.cellH + 16;
    const dom = SETS[cellA];
    const cod = SETS[cellB];
    const maps = allMaps(dom, cod);
    label(ctx, 'Hom(' + cellA + ' 元, ' + cellB + ' 元) 的 ' + maps.length + ' 支函数：', 10, y0, C.fg,
      { size: 10.5, weight: 700 });
    y0 += 18;
    const show = maps.slice(0, 6);
    show.forEach((m, i) => {
      const txt = m.map((v, j) => dom[j] + '↦' + v).join('  ');
      label(ctx, (i + 1) + '. ' + txt, 16, y0 + i * 15, C.fg, { size: 10 });
    });
    if (maps.length > show.length) {
      label(ctx, '…… 还有 ' + (maps.length - show.length) + ' 支没画出来（逐位独立挑选，'
        + dom.length + ' 位 × 每位 ' + cod.length + ' 种选择 = ' + maps.length + '）',
        16, y0 + show.length * 15 + 2, C.axis, { size: 10 });
    }
    label(ctx, '注意方向：把探针和目标对调，格子里的数立刻换一个（8 与 9 是两道不同的账）。',
      10, geo.H - 12, C.axis, { size: 10 });
  }

  /* ---------- profile 模式 ---------- */

  function profileOf(size) {
    /* 外景档案：探针依次取 1、2、3 元，数各探针打向这个对象的箭头 */
    return [homCount(1, size), homCount(2, size), homCount(3, size)];
  }

  function labelsOf(size) {
    const base = ['a', 'b', 'c'].slice(0, size);
    return renamed ? base.map((ch) => String.fromCharCode(ch.charCodeAt(0) + 23)) : base;
  }

  function drawProfile(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    label(ctx, '外景档案：只问「别人怎么看它」，从不打开它的内部', 10, 18, C.fg,
      { size: 11, weight: 700 });

    const colW = (W - 40) / 2;
    const panel = (x, title, size, color, tag) => {
      const prof = profileOf(size);
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x, 30, colW - 10, 132);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x + 0.5, 30.5, colW - 10, 132);
      ctx.restore();
      label(ctx, title, x + 10, 50, color, { size: 11, weight: 700 });
      label(ctx, '成员 {' + labelsOf(size).join(', ') + '}（内部构造）', x + 10, 68, C.axis, { size: 10 });
      label(ctx, '档案 Hom(–, C)：', x + 10, 88, C.fg, { size: 10.5 });
      prof.forEach((v, i) => {
        label(ctx, '探针 ' + (i + 1) + ' 元 → ' + v + ' 支', x + 20, 106 + i * 16, color, { size: 10.5, weight: 600 });
      });
      label(ctx, tag, x + 10, 156, C.axis, { size: 9.5 });
      return prof;
    };

    const p1 = panel(14, '候选 C', profC, C.accent, '');
    const p2 = panel(14 + colW, "对照 C'", profAlt, C.accent2, '');

    /* 逐页比对 */
    let y0 = 186;
    label(ctx, '逐页比对：', 14, y0, C.fg, { size: 10.5, weight: 700 });
    y0 += 16;
    let allSame = true;
    for (let i = 0; i < 3; i += 1) {
      const same = p1[i] === p2[i];
      if (!same) allSame = false;
      label(ctx, '第 ' + (i + 1) + ' 页（' + (i + 1) + ' 元探针）：' + p1[i] + ' vs ' + p2[i]
        + (same ? '　页同' : '　页不同'), 20, y0 + i * 15, same ? C.ok : C.bad,
      { size: 10, weight: same ? 400 : 700 });
    }
    y0 += 3 * 15 + 6;
    if (allSame) {
      label(ctx, '三页全同 —— 档案相同即同构。注意：成员标签可以完全不同，内部构造无关紧要。',
        14, y0 + 10, C.ok, { size: 10.5, weight: 700 });
      label(ctx, '「给成员换套名字」按钮改的只是内部；档案纹丝不动，正是同构的样子。',
        14, y0 + 26, C.axis, { size: 10 });
    } else {
      label(ctx, '有页面不同 —— 这两个对象必然不同构：随便哪一页对不上，就足以把它们分开。',
        14, y0 + 10, C.bad, { size: 10.5, weight: 700 });
    }

    /* 候选滑块 */
    const ySel = geo.H - 58;
    label(ctx, '选候选大小（点按钮改）', 14, ySel, C.axis, { size: 10 });
    [1, 2, 3].forEach((s, i) => {
      const bx = 14 + i * 74;
      const hot = profC === s;
      ctx.save();
      ctx.fillStyle = hot ? C.accent : C.soft;
      ctx.globalAlpha = hot ? 0.2 : 0.5;
      ctx.fillRect(bx, ySel + 8, 64, 24);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hot ? C.accent : C.grid;
      ctx.strokeRect(bx + 0.5, ySel + 8.5, 64, 24);
      ctx.restore();
      label(ctx, 'C = ' + s + ' 元', bx + 32, ySel + 24, hot ? C.accent : C.fg,
        { size: 10.5, align: 'center', weight: hot ? 700 : 400 });
    });
    [1, 2, 3].forEach((s, i) => {
      const bx = 14 + W / 2 + i * 74;
      const hot = profAlt === s;
      ctx.save();
      ctx.fillStyle = hot ? C.accent2 : C.soft;
      ctx.globalAlpha = hot ? 0.2 : 0.5;
      ctx.fillRect(bx, ySel + 8, 64, 24);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hot ? C.accent2 : C.grid;
      ctx.strokeRect(bx + 0.5, ySel + 8.5, 64, 24);
      ctx.restore();
      label(ctx, "C' = " + s + ' 元', bx + 32, ySel + 24, hot ? C.accent2 : C.fg,
        { size: 10.5, align: 'center', weight: hot ? 700 : 400 });
    });
  }

  /* ---------- adjunction 模式 ---------- */

  function drawAdjunction(C) {
    const ctx = cv.ctx;
    const W = geo.W;
    const left = allMaps(LETTERS, MONOID);       /* 右侧账本：字母的普通指派 */
    label(ctx, '伴随 F ⊣ U：左边问保乘法映射 Free(X) → M，右边问普通函数 X → U(M)',
      10, 18, C.fg, { size: 11, weight: 700 });
    label(ctx, '两侧账本逐条对齐：每支指派唯一决定一支同态，不存在多一支也不存在少一支。',
      10, 34, C.axis, { size: 10 });

    label(ctx, 'Hom(X, U M)：字母的普通指派（M = Z/3）', 14, 56, C.accent2, { size: 10.5, weight: 700 });
    label(ctx, 'Hom(Free X, M)：保乘法同态', W / 2 + 8, 56, C.accent, { size: 10.5, weight: 700 });

    const rowH = 22;
    const top = 70;
    const maxRows = Math.floor((geo.H - top - 96) / rowH);
    const show = Math.min(left.length, Math.max(4, maxRows));
    for (let i = 0; i < show; i += 1) {
      const assign = left[i];
      const y = top + i * rowH;
      const hot = i === adjPick;
      const revealed = i < adjRevealed;
      if (hot) {
        ctx.save();
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(8, y - 13, W - 16, rowH - 4);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      label(ctx, 'f(' + LETTERS[0] + ')=' + assign[0] + ', f(' + LETTERS[1] + ')=' + assign[1],
        20, y, hot ? C.accent2 : C.fg, { size: 10.5, weight: hot ? 700 : 400 });
      if (revealed) {
        /* 同态由字母像唯一决定：词 ab 的像 = f(a) + f(b) mod 3 */
        const wa = (assign[0] + assign[1]) % 3;
        const wb = (assign[0] + assign[0] + assign[1]) % 3;
        label(ctx, '由字母像唯一决定：ab ↦ ' + wa + '，aab ↦ ' + wb,
          W / 2 + 8, y, hot ? C.accent : C.axis, { size: 10.5, weight: hot ? 700 : 400 });
      } else {
        label(ctx, '（未展开）', W / 2 + 8, y, C.grid, { size: 10 });
      }
    }
    if (left.length > show) {
      label(ctx, '…… 共 ' + left.length + ' 支，这里只列前 ' + show + ' 支', 20, top + show * rowH,
        C.axis, { size: 10 });
    }

    const ySum = geo.H - 62;
    label(ctx, '两侧各 ' + left.length + ' 支（3 的 2 次方 = 9）：账本对齐，不多不少。',
      14, ySum, C.ok, { size: 10.5, weight: 700 });
    label(ctx, '「先锁字母像、整座词海的像随之自动就位」——这就是伴随里那支同态的唯一性。',
      14, ySum + 16, C.axis, { size: 10 });
    label(ctx, '点左列任一条指派，右列对应的同态会点亮；每点一条就展开一条。',
      14, ySum + 32, C.axis, { size: 10 });
  }

  /* ---------- 主绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);
    if (mode === 'table') drawTable(C);
    else if (mode === 'profile') drawProfile(C);
    else drawAdjunction(C);
  }

  /* ---------- 读数 ---------- */

  function sync() {
    ro.set('模式', mode === 'table' ? 'Hom 表' : mode === 'profile' ? '外景档案' : '伴随对拍');
    if (mode === 'table') {
      ro.set('格子', cellA + ' 元探针 → ' + cellB + ' 元目标');
      ro.set('箭头总数', cellB + '^' + cellA + ' = ' + homCount(cellA, cellB) + ' 支');
      ro.set('档案', '—（切到「外景档案」看）');
      ro.set('结论', '函数就是箭头：Hom 里的成员不是元素，是从探针出发的函数');
      ro.set('提示', '点格子选另一组；注意 8 与 9 是方向不同的两道账');
    } else if (mode === 'profile') {
      const p1 = profileOf(profC);
      const p2 = profileOf(profAlt);
      const same = p1.every((v, i) => v === p2[i]);
      ro.set('格子', '—（本模式看档案）');
      ro.set('箭头总数', '—');
      ro.set('档案', 'C = [' + p1.join(', ') + ']　对照 C\' = [' + p2.join(', ') + ']');
      ro.set('结论', same ? '档案逐页相同：同构（内部标签可随意改）' : '有页面不同：必然不同构');
      ro.set('提示', renamed ? '已给 C 换了成员标签：档案没变' : '点「给成员换套名字」验证内部无关紧要');
    } else {
      ro.set('格子', '—（本模式看伴随）');
      ro.set('箭头总数', '两侧各 ' + allMaps(LETTERS, MONOID).length + ' 支');
      ro.set('档案', '—');
      ro.set('结论', 'Hom(Free(X), M) ≅ Hom(X, U(M))：两侧账本一样厚');
      ro.set('提示', '点左列任一条指派，右列对应的同态点亮');
    }
    bRename.disabled = mode !== 'profile';
    bStep.disabled = mode !== 'adjunction';
    bBack.disabled = mode !== 'adjunction';
  }

  /* ---------- 交互 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (mode === 'table') {
        const c = cellAt(x, y);
        return c ? { kind: 'cell', ...c } : null;
      }
      if (mode === 'profile') {
        const ySel = geo.H - 58;
        if (y >= ySel + 8 && y <= ySel + 32) {
          const i = Math.floor((x - 14) / 74);
          if (i >= 0 && i < 3) return { kind: 'setC', size: i + 1 };
          const j = Math.floor((x - 14 - geo.W / 2) / 74);
          if (j >= 0 && j < 3) return { kind: 'setAlt', size: j + 1 };
        }
        return null;
      }
      if (mode === 'adjunction') {
        const top = 70;
        const rowH = 22;
        if (x < geo.W / 2 && y > top - 13) {
          const i = Math.floor((y - top + 13) / rowH);
          if (i >= 0 && i < allMaps(LETTERS, MONOID).length) return { kind: 'adj', i };
        }
        return null;
      }
      return null;
    },
    down(id) {
      if (id.kind === 'cell') {
        cellA = id.row + 1;
        cellB = id.col + 1;
      } else if (id.kind === 'setC') {
        profC = id.size;
      } else if (id.kind === 'setAlt') {
        profAlt = id.size;
      } else if (id.kind === 'adj') {
        adjPick = id.i;
        adjRevealed = Math.max(adjRevealed, id.i + 1);
      }
      sync();
      draw();
    },
  });

  bStep.addEventListener('click', () => {
    if (mode !== 'adjunction') return;
    adjRevealed = Math.min(adjRevealed + 1, allMaps(LETTERS, MONOID).length);
    adjPick = Math.max(0, adjRevealed - 1);
    sync();
    draw();
  });
  bBack.addEventListener('click', () => {
    if (mode !== 'adjunction') return;
    adjRevealed = Math.max(adjRevealed - 1, 0);
    adjPick = Math.max(0, Math.min(adjPick, adjRevealed - 1));
    sync();
    draw();
  });
  bRename.addEventListener('click', () => {
    if (mode !== 'profile') return;
    renamed = !renamed;
    bRename.textContent = renamed ? '换回原来的名字' : '给成员换套名字';
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