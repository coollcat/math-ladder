/* =========================================================================
 * lab 组件：karnaugh（卡诺图：点格子、看圈、得最简式）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "karnaugh",
 *     "title": "点几个格子，看化简器怎么圈",
 *     "vars": 3,
 *     "ones": [1, 3, 5, 7],
 *     "dcs": []
 *   }
 *   ```
 *
 * 字段（全部可省略）：
 *   vars  变量个数，3（默认）或 4
 *   ones  初始为 1 的最小项编号数组，默认 [1,3,5,7]（3 变量下恰好化简成 F = C）
 *   dcs   无关项（don't care）编号数组，默认 []
 *   注意：vars 切到 4 时格子数变成 16，ones/dcs 里 ≥16 的编号自动丢弃。
 *
 * 演示什么：
 *   卡诺图的魔力全在「相邻」两个字上——相邻格只差一个变量，所以圈住 2^k 个
 *   相邻的 1，就能消掉 k 个变量。圈越大消得越多。四个角是相邻的、左右边缘是
 *   相邻的（格雷码排列），所以圈可以「翻出去」绕到另一边。
 *   组件自动做三件事：找出全部质蕴涵项 → 挑出本质质蕴涵项 → 贪心补齐最小覆盖，
 *   最后给出最简与或式，并和「把最小项直接加起来」比一比门数。
 *   点成棋盘格（奇偶校验）时一个圈都圈不出来——这是「有些函数天生化简不了」的
 *   最好反例。
 *
 * 能拖什么：
 *   · 点格子 → 0 → 1 → X（无关项）→ 0 循环
 *   · 按住拖过去 → 把一路上的格子刷成同一个值（铺一片 1 或一片 X 特别快）
 *   · 变量数 3/4 分段切换；预设按钮：清空 / 全 1 / 奇偶校验 / 多数表决
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildSegmented,
  buildToolbar, mkBtn, label, clamp, fmt,
  clearBg,
} from '../core.js';
import { kmapGrid, kmapGroups, GRAY } from '../engines/logic.js';

const VNAMES = ['A', 'B', 'C', 'D'];

export default function render(host, spec) {
  let C = themeColors();
  const vars = spec.vars === 4 ? 4 : 3;
  const nCell = 2 ** vars;

  /* 单元格值：0 / 1 / 2(X 无关项) */
  const vals = new Array(nCell).fill(0);
  (spec.ones || (vars === 3 ? [1, 3, 5, 7] : [1, 3, 5, 7, 9, 11, 13, 15])).forEach((m) => {
    if (m >= 0 && m < nCell) vals[m] = 1;
  });
  (spec.dcs || []).forEach((m) => { if (m >= 0 && m < nCell) vals[m] = 2; });

  let nv = vars;
  let paint = null;

  const cv = setupCanvas(host, 420);
  const ro = buildReadout({
    'Σ 最小项': '—', '无关项': '—', '质蕴涵项': '—',
    '最简与或式': '—', '门数对比': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '3 变量（8 格）', value: 3 }, { label: '4 变量（16 格）', value: 4 }],
    nv,
    (v) => {
      const next = 2 ** v;
      const old = vals.slice();
      vals.length = 0;
      for (let i = 0; i < next; i += 1) vals.push(i < old.length ? old[i] : 0);
      nv = v;
      draw();
    },
  ));

  const mkPreset = (name, fn) => {
    const b = mkBtn(name);
    b.addEventListener('click', () => {
      for (let i = 0; i < vals.length; i += 1) vals[i] = fn(i);
      draw();
    });
    return b;
  };
  const popcount = (m) => {
    let c = 0;
    for (let b = 0; b < nv; b += 1) if ((m >> b) & 1) c += 1;
    return c;
  };
  host.appendChild(buildToolbar(
    mkPreset('清空', () => 0),
    mkPreset('全 1', () => 1),
    mkPreset('奇偶校验（异或）', (m) => popcount(m) & 1),
    mkPreset('多数表决（≥2 个 1）', (m) => (popcount(m) >= 2 ? 1 : 0)),
  ));

  /* ---------- 化简：格子集合 → 圈 → 项 ---------- */
  const shiftBits = () => Math.floor(nv / 2);

  function idxAt(r, c) {
    return (GRAY(r) << shiftBits()) | GRAY(c);
  }

  function groupsOf() {
    const { rows, cols } = kmapGrid(nv, []);
    const minterms = [];
    const dcs = [];
    vals.forEach((v, i) => {
      if (v === 1) minterms.push(i);
      if (v === 2) dcs.push(i);
    });
    const pool = minterms.concat(dcs);
    const raw = kmapGroups(nv, pool);
    const out = [];
    raw.forEach((gp) => {
      let mask = 0;
      let hasOne = false;
      gp.cells.forEach((idx) => {
        mask |= 1 << idx;
        if (vals[idx] === 1) hasOne = true;
      });
      if (!hasOne) return; // 全是无关项的圈没有意义
      /* 反推左上角：枚举起点，生成的集合与 cells 一致者即原点 */
      let origin = null;
      for (let r = 0; r < rows && !origin; r += 1) {
        for (let c = 0; c < cols && !origin; c += 1) {
          let m = 0;
          for (let dr = 0; dr < gp.h; dr += 1) {
            for (let dc = 0; dc < gp.w; dc += 1) {
              m |= 1 << idxAt((r + dr) % rows, (c + dc) % cols);
            }
          }
          if (m === mask) origin = { r, c };
        }
      }
      if (!origin) return;
      out.push({ h: gp.h, w: gp.w, r0: origin.r, c0: origin.c, mask, cells: gp.cells.slice() });
    });
    return { rows, cols, groups: out, minterms, dcs };
  }

  /* 圈 → 乘积项：逐变量看这一圈里该位是否恒定 */
  function termOf(gp) {
    const lits = [];
    for (let k = 0; k < nv; k += 1) {
      const bit = nv - 1 - k;
      let allOne = true;
      let allZero = true;
      gp.cells.forEach((idx) => {
        if ((idx >> bit) & 1) allZero = false;
        else allOne = false;
      });
      if (allOne) lits.push(VNAMES[k]);
      else if (allZero) lits.push(VNAMES[k] + '′');
    }
    return { text: lits.length ? lits.join('·') : '1', lits: lits.length };
  }

  function analyze() {
    const info = groupsOf();
    /* 质蕴涵项：不被更大的圈包含的圈 */
    const primes = info.groups.filter((gp) => !info.groups.some((o) => o !== gp
      && (o.mask & gp.mask) === gp.mask && o.mask !== gp.mask));
    primes.forEach((gp) => { gp.term = termOf(gp); });
    /* 本质质蕴涵项：覆盖了「只有它能盖住的」最小项 */
    const coverCount = new Map();
    info.minterms.forEach((m) => {
      const covering = primes.filter((p) => (p.mask >> m) & 1);
      coverCount.set(m, covering);
    });
    primes.forEach((p) => { p.essential = false; });
    info.minterms.forEach((m) => {
      const cvg = coverCount.get(m) || [];
      if (cvg.length === 1) cvg[0].essential = true;
    });
    /* 贪心补齐：先放本质的，剩下的按「新增覆盖最多」挑 */
    const chosen = primes.filter((p) => p.essential);
    let covered = chosen.reduce((s, p) => s | p.mask, 0);
    const minMask = info.minterms.reduce((s, m) => s | (1 << m), 0);
    let guard = 0;
    while ((covered & minMask) !== minMask && guard < 40) {
      guard += 1;
      let best = null;
      let bestGain = 0;
      primes.forEach((p) => {
        if (chosen.indexOf(p) >= 0) return;
        let gain = 0;
        info.minterms.forEach((m) => {
          if (((p.mask >> m) & 1) && !((covered >> m) & 1)) gain += 1;
        });
        if (gain > bestGain || (gain === bestGain && best && p.term.lits < best.term.lits)) {
          best = p;
          bestGain = gain;
        }
      });
      if (!best) break;
      chosen.push(best);
      covered |= best.mask;
    }
    return {
      rows: info.rows,
      cols: info.cols,
      primes,
      chosen,
      minterms: info.minterms,
      dcs: info.dcs,
    };
  }

  /* ---------- 几何 ---------- */
  let geo = { x0: 0, y0: 0, cell: 40, rows: 4, cols: 2 };
  function computeGeo(rows, cols) {
    const W = cv.W;
    const cell = clamp(Math.min((W - 96) / cols, 56, 232 / rows), 30, 56);
    geo = { x0: 60, y0: 62, cell, rows, cols };
  }
  function cellAt(x, y) {
    const cx = Math.floor((x - geo.x0) / geo.cell);
    const cy = Math.floor((y - geo.y0) / geo.cell);
    if (cx < 0 || cy < 0 || cx >= geo.cols || cy >= geo.rows) return null;
    const r = cy;
    const c = cx;
    return idxAt(r, c);
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const A = analyze();
    computeGeo(A.rows, A.cols);
    const { x0, y0, cell, rows, cols } = geo;

    label(ctx, '点格子：0 → 1 → X（无关项）→ 0　·　按住拖过去可以刷一整片',
      8, 15, C.grid, { size: 10 });

    /* 行列头（格雷码，所以相邻只差一位） */
    const rBits = Math.ceil(nv / 2);
    const cBits = Math.floor(nv / 2);
    const bin = (v, n) => {
      let s = '';
      for (let b = n - 1; b >= 0; b -= 1) s += String((v >> b) & 1);
      return s;
    };
    label(ctx, VNAMES.slice(0, rBits).join('') + '\\' + VNAMES.slice(rBits, nv).join(''),
      x0 - 6, y0 - 8, C.fg, { align: 'right', size: 10, weight: 700 });
    for (let c = 0; c < cols; c += 1) {
      label(ctx, bin(GRAY(c), cBits), x0 + c * cell + cell / 2, y0 - 8, C.fg,
        { align: 'center', size: 10, weight: 700 });
    }
    for (let r = 0; r < rows; r += 1) {
      label(ctx, bin(GRAY(r), rBits), x0 - 6, y0 + r * cell + cell / 2 + 4, C.fg,
        { align: 'right', size: 10, weight: 700 });
    }
    /* 变量分隔折角线 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, y0 - 2);
    ctx.lineTo(x0 - 26, y0 - 26);
    ctx.lineTo(x0 - 26 + cell * cols, y0 - 26);
    ctx.stroke();

    /* 格子 */
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const idx = idxAt(r, c);
        const v = vals[idx];
        const x = x0 + c * cell;
        const y = y0 + r * cell;
        ctx.fillStyle = v === 1 ? C.soft : C.bg;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cell, cell);
        label(ctx, v === 1 ? '1' : v === 2 ? 'X' : '0', x + cell / 2, y + cell / 2 + 7,
          v === 1 ? C.fg : v === 2 ? C.named('purple') : C.grid,
          { align: 'center', size: 17, weight: 700 });
        label(ctx, 'm' + idx, x + cell - 3, y + cell - 4, C.grid, { align: 'right', size: 8 });
      }
    }

    /* 圈：只把选中的画实线，质蕴涵项里没被选中的画灰虚线 */
    /* 起止区间（环绕时拆成两段） */
    const segs = (start, len, total) => (start + len <= total
      ? [[start, start + len - 1]]
      : [[start, total - 1], [0, start + len - 1 - total]]);
    const drawLoop = (gp, color, on, dashed) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = on ? 2.6 : 1.2;
      if (dashed) ctx.setLineDash([4, 3]);
      segs(gp.r0, gp.h, rows).forEach((rs) => {
        segs(gp.c0, gp.w, cols).forEach((cs) => {
          const x = x0 + cs[0] * cell + 3;
          const y = y0 + rs[0] * cell + 3;
          const w = (cs[1] - cs[0] + 1) * cell - 6;
          const h = (rs[1] - rs[0] + 1) * cell - 6;
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.stroke();
          if (on) {
            ctx.globalAlpha = 0.10;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1;
          }
        });
      });
      ctx.restore();
    };
    A.primes.forEach((p) => {
      if (A.chosen.indexOf(p) < 0) drawLoop(p, C.grid, false, true);
    });
    A.chosen.forEach((p, i) => drawLoop(p, C.series(i), true, false));

    /* ---------- 结果区 ---------- */
    const gy2 = y0 + rows * cell + 26;
    const expr = A.chosen.length
      ? A.chosen.map((p) => p.term.text).join(' + ')
      : (A.minterms.length ? '（圈不出来）' : '0');
    label(ctx, '最简与或式', 8, gy2, C.fg, { size: 11, weight: 600 });
    ctx.font = '700 17px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = C.accent;
    ctx.fillText('F = ' + expr, 8, gy2 + 22);
    ctx.font = '400 12px system-ui, -apple-system, "Segoe UI", sans-serif';

    /* 圈清单 */
    let ly = gy2 + 44;
    label(ctx, '圈出来的 ' + A.chosen.length + ' 项（共 ' + A.primes.length
      + ' 个质蕴涵项，' + A.primes.filter((p) => p.essential).length + ' 个是本质的）',
      8, ly, C.fg, { size: 11, weight: 600 });
    ly += 16;
    A.chosen.forEach((p, i) => {
      const col = C.series(i);
      ctx.fillStyle = col;
      ctx.fillRect(8, ly - 9, 10, 10);
      label(ctx, (p.h * p.w) + ' 格 → 消掉 ' + Math.round(Math.log2(p.h * p.w))
        + ' 个变量　' + p.term.text
        + (p.essential ? '　【本质：有格子只有它能盖】' : '　（贪心补齐）')
        + '　覆盖 m' + p.cells.join(',m'),
        24, ly, C.fg, { size: 10 });
      ly += 14;
    });
    if (ly < H - 4) {
      label(ctx, '灰虚线圈 = 质蕴涵项里没被选中的（存在更优的组合时会有这种情况）',
        8, Math.min(ly + 4, H - 6), C.grid, { size: 9 });
    }

    /* ---------- 读数 ---------- */
    ro.set('Σ 最小项', A.minterms.length
      ? 'Σm(' + A.minterms.join(',') + ')　共 ' + A.minterms.length + ' 项'
      : '（没有 1，F = 0）');
    ro.set('无关项', A.dcs.length ? 'Σd(' + A.dcs.join(',') + ')　共 ' + A.dcs.length
      + ' 项（可当 1 用，也可当 0 甩掉）' : '无');
    ro.set('质蕴涵项', A.primes.length + ' 个，其中本质质蕴涵项 '
      + A.primes.filter((p) => p.essential).length + ' 个；最小覆盖用了 ' + A.chosen.length + ' 个');
    ro.set('最简与或式', 'F = ' + expr);
    const litMin = A.chosen.reduce((s, p) => s + p.term.lits, 0);
    const litRaw = A.minterms.length * nv;
    ro.set('门数对比', '直接把最小项加起来：' + A.minterms.length + ' 个 ' + nv + ' 输入与门 + '
      + A.minterms.length + ' 输入或门（' + litRaw + ' 个门输入）　→　最简式：'
      + A.chosen.length + ' 个与门 + ' + A.chosen.length + ' 输入或门（' + litMin
      + ' 个门输入）　省掉 ' + fmt(Math.max(0, 100 - (litMin / Math.max(litRaw, 1)) * 100), 0) + '%');
  }

  /* ---------- 交互 ---------- */
  const nextVal = (v) => (v === 0 ? 1 : v === 1 ? 2 : 0);
  bindPointer(cv.canvas, {
    pick: (x, y) => (cellAt(x, y) === null ? null : 'cell'),
    down(id, x, y) {
      void id;
      const idx = cellAt(x, y);
      if (idx === null) return;
      paint = nextVal(vals[idx]);
      vals[idx] = paint;
      draw();
    },
    move(id, x, y) {
      void id;
      if (paint === null) return;
      const idx = cellAt(x, y);
      if (idx === null || vals[idx] === paint) return;
      vals[idx] = paint;
      draw();
    },
    up() { paint = null; },
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
