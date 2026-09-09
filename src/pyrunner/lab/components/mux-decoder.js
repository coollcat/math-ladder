/* =========================================================================
 * lab 组件：mux-decoder（多路选择器 + 译码器：同一棵与门树的两半）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "mux-decoder",
 *     "title": "选到第几路，译码器就点亮第几根线",
 *     "sel": 2,
 *     "s": 1,
 *     "d": [1, 0, 1, 0],
 *     "en": 1
 *   }
 *   ```
 *
 * 字段（全部可省略）：
 *   sel  选择线位数，2（默认，4 选 1）或 3（8 选 1）
 *   s    选择线的初值（十进制），默认 1
 *   d    各路数据输入的初值数组，默认 [1,0,1,0]（8 路时补 0）
 *   en   使能端初值，默认 1
 *
 * 演示什么：
 *   左边是 N 选 1 的多路选择器：N 路数据挤在一起，选择线说「要第几路」，
 *   只有那一路的值能通到输出 Y。右边是译码器：k 位选择线进去，2^k 根输出线
 *   里**恰好一根**变高。
 *   关键点是它们是同一件事的两半：译码器第 i 根输出其实就是选择线的第 i 个
 *   最小项 m_i（比如 S1=0,S0=1 → m1 = S̄1·S0），而 MUX 只不过是把这 2^k 个
 *   最小项分别和 D_i 相与、再全部或起来：
 *       Y = D0·m0 + D1·m1 + D2·m2 + D3·m3
 *   所以「选择」不是魔法，是一棵与门树 + 一个或门。
 *   把使能端 E 拉低：译码器一根线都不亮，MUX 输出恒 0——这就是片选。
 *
 * 能拖什么：
 *   · 点 D0..D_{N-1} 的方块 → 翻转这一路的数据；按住上下拖 → 刷一片
 *   · 点选择线的某一位 → 翻转；按住左右拖 → 刷出想要的二进制数
 *   · 点右边译码器的任意一根输出线（或按住上下拖着扫）→ 选择线直接切到那一路
 *   · 点 E 方块 → 切换使能
 *   分段切换：2 位选择线（4 路）/ 3 位（8 路）
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildSegmented,
  label, clamp,
} from '../core.js';
import { evalCombinational } from '../engines/logic.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    k: spec.sel === 3 ? 3 : 2,          // 选择线位数
    sv: clamp(Math.round(spec.s ?? 1), 0, 2 ** (spec.sel === 3 ? 3 : 2) - 1), // 选择值
    en: spec.en === 0 ? 0 : 1,
    d: (spec.d || [1, 0, 1, 0]).slice(),
  };
  const N = () => 2 ** s.k;
  while (s.d.length < 8) s.d.push(0);
  s.d = s.d.slice(0, 8).map((v) => (v ? 1 : 0));

  let paint = null; // {kind:'d'|'s', val}

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    '选择 S': '—', '数据 D': '—', 'MUX 输出 Y': '—',
    '译码输出': '—', '展开式': '—', '门数': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '2 位选择线（4 选 1）', value: 2 }, { label: '3 位（8 选 1）', value: 3 }],
    s.k,
    (v) => {
      s.k = v;
      s.sv = Math.min(s.sv, 2 ** v - 1);
      draw();
    },
  ));

  /* ---------- 网表（MUX + 译码器合成一张网，交给引擎求值） ---------- */
  function buildNet() {
    const k = s.k;
    const n = 2 ** k;
    const gates = [];
    const inputs = [];
    for (let j = 0; j < k; j += 1) {
      inputs.push('s' + j);
      gates.push({ id: 'not' + j, type: 'not', in: ['s' + j], out: 'ns' + j });
    }
    inputs.push('en');
    for (let i = 0; i < n; i += 1) {
      inputs.push('d' + i);
      const lit = [];
      for (let j = 0; j < k; j += 1) lit.push(((i >> (k - 1 - j)) & 1) ? 's' + j : 'ns' + j);
      gates.push({ id: 'm' + i, type: 'and', in: ['d' + i, 'en'].concat(lit), out: 'p' + i });
      gates.push({ id: 'o' + i, type: 'and', in: ['en'].concat(lit), out: 'q' + i });
    }
    gates.push({ id: 'orall', type: 'or', in: Array.from({ length: n }, (z, i) => 'p' + i), out: 'Y' });
    return { inputs, outputs: ['Y'], gates };
  }

  function solve() {
    const k = s.k;
    const n = 2 ** k;
    const values = {};
    for (let j = 0; j < k; j += 1) values['s' + j] = (s.sv >> (k - 1 - j)) & 1;
    values.en = s.en;
    for (let i = 0; i < n; i += 1) values['d' + i] = s.d[i];
    evalCombinational(buildNet(), values, 100);
    return { values, n, k };
  }

  /* 第 i 路的最小项文字，例如 S1′·S0 */
  function mintermText(i) {
    const k = s.k;
    const lits = [];
    for (let j = 0; j < k; j += 1) {
      const b = (i >> (k - 1 - j)) & 1;
      lits.push('S' + j + (b ? '' : '′'));
    }
    return lits.join('·');
  }

  /* ---------- 几何 ---------- */
  function geo() {
    const W = cv.W;
    const n = N();
    const top = 92;
    const rowH = clamp(Math.min(26, 210 / n), 13, 26);
    const cwD = clamp(W * 0.13, 40, 74);
    const cwC = clamp(W * 0.14, 52, 96);
    return {
      W,
      n,
      top,
      rowH,
      dX: 8,
      cwD,
      chipX: 8 + cwD + 34,
      cwC,
      yX: 8 + cwD + 34 + cwC + 30,
      decX: W * 0.56,
      oX: W - cwD - 10,
      rowY: (i) => top + i * rowH + rowH / 2,
    };
  }
  function hitTest(x, y) {
    const g = geo();
    /* 选择线位 */
    const sbw = 34;
    const sbx = g.W / 2 - (s.k * sbw) / 2;
    if (y >= 44 && y <= 70) {
      for (let j = 0; j < s.k; j += 1) {
        if (x >= sbx + j * sbw && x <= sbx + (j + 1) * sbw - 4) return 's:' + j;
      }
      if (x >= sbx + s.k * sbw + 44 && x <= sbx + s.k * sbw + 76) return 'en';
    }
    /* MUX 数据列 */
    if (y >= g.top && y <= g.top + g.n * g.rowH) {
      if (x >= g.dX && x <= g.dX + g.cwD) {
        const i = Math.floor((y - g.top) / g.rowH);
        if (i >= 0 && i < g.n) return 'd:' + i;
      }
      /* 译码器输出列 */
      if (x >= g.oX && x <= g.oX + g.cwD) {
        const i = Math.floor((y - g.top) / g.rowH);
        if (i >= 0 && i < g.n) return 'o:' + i;
      }
    }
    return null;
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const g = geo();
    const R = solve();
    const V = R.values;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* ---------- 选择线 ---------- */
    const sbw = 34;
    const sbx = W / 2 - (s.k * sbw) / 2;
    label(ctx, '选择线 S（决定要走哪一路）', sbx, 34, C.fg, { size: 11, weight: 600 });
    for (let j = 0; j < s.k; j += 1) {
      const v = (s.sv >> (s.k - 1 - j)) & 1;
      const x = sbx + j * sbw;
      ctx.fillStyle = v ? C.accent : C.soft;
      ctx.fillRect(x, 46, sbw - 4, 24);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 46, sbw - 4, 24);
      label(ctx, 'S' + j + '=' + v, x + (sbw - 4) / 2, 63, v ? C.bg : C.fg,
        { align: 'center', size: 10, weight: 700 });
    }
    label(ctx, '= ' + s.sv, sbx + s.k * sbw + 4, 63, C.accent2, { size: 11, weight: 700 });
    /* 使能 */
    const ex = sbx + s.k * sbw + 44;
    ctx.fillStyle = s.en ? C.named('green') : C.soft;
    ctx.fillRect(ex, 46, 32, 24);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex, 46, 32, 24);
    label(ctx, 'E=' + s.en, ex + 16, 63, s.en ? C.bg : C.fg,
      { align: 'center', size: 10, weight: 700 });

    /* ---------- 左：MUX ---------- */
    label(ctx, '多路选择器 MUX：' + g.n + ' 路 → 1 路', 8, g.top - 22, C.fg,
      { size: 11, weight: 600 });
    const chipTop = g.top + 6;
    const chipBot = g.top + g.n * g.rowH - 6;
    for (let i = 0; i < g.n; i += 1) {
      const y = g.rowY(i);
      const on = i === s.sv && s.en === 1;
      const dv = s.d[i];
      /* 数据方块 */
      ctx.fillStyle = dv ? C.series(i) : C.bg;
      ctx.fillRect(g.dX, y - g.rowH / 2 + 2, g.cwD, g.rowH - 4);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(g.dX, y - g.rowH / 2 + 2, g.cwD, g.rowH - 4);
      label(ctx, 'D' + i + '=' + dv, g.dX + g.cwD / 2, y + 4, dv ? C.bg : C.fg,
        { align: 'center', size: 10, weight: 700 });
      /* 连线 */
      ctx.strokeStyle = on ? (dv ? C.named('green') : C.accent2) : C.grid;
      ctx.lineWidth = on ? 2.6 : 1;
      ctx.beginPath();
      ctx.moveTo(g.dX + g.cwD, y);
      ctx.lineTo(g.chipX - 2, y);
      ctx.stroke();
      if (on) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(g.chipX, y);
        ctx.lineTo(g.chipX + g.cwC, g.top + g.n * g.rowH / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    /* MUX 芯片外形（梯形） */
    ctx.fillStyle = C.bg;
    ctx.beginPath();
    ctx.moveTo(g.chipX, chipTop);
    ctx.lineTo(g.chipX + g.cwC, chipTop + 16);
    ctx.lineTo(g.chipX + g.cwC, chipBot - 16);
    ctx.lineTo(g.chipX, chipBot);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    label(ctx, 'MUX', g.chipX + g.cwC / 2, g.top + g.n * g.rowH / 2 + 4, C.fg,
      { align: 'center', size: 12, weight: 700 });
    /* 输出 Y */
    const yv = s.en ? V.Y : 0;
    const ycy = g.top + g.n * g.rowH / 2;
    ctx.strokeStyle = yv ? C.named('green') : C.axis;
    ctx.lineWidth = yv ? 2.6 : 1.2;
    ctx.beginPath();
    ctx.moveTo(g.chipX + g.cwC, ycy);
    ctx.lineTo(g.yX, ycy);
    ctx.stroke();
    ctx.fillStyle = yv ? C.named('green') : C.soft;
    ctx.beginPath();
    ctx.arc(g.yX + 14, ycy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    label(ctx, String(yv), g.yX + 14, ycy + 5, yv ? C.bg : C.fg,
      { align: 'center', size: 13, weight: 700 });
    label(ctx, 'Y', g.yX + 14, ycy - 18, C.fg, { align: 'center', size: 10, weight: 700 });

    /* ---------- 右：译码器 ---------- */
    label(ctx, '译码器 DEC：' + s.k + ' 位 → ' + g.n + ' 根线，恰好一根有效',
      g.decX, g.top - 22, C.fg, { size: 11, weight: 600 });
    ctx.fillStyle = C.bg;
    ctx.beginPath();
    ctx.moveTo(g.decX + g.cwC, chipTop);
    ctx.lineTo(g.decX, chipTop + 16);
    ctx.lineTo(g.decX, chipBot - 16);
    ctx.lineTo(g.decX + g.cwC, chipBot);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    label(ctx, 'DEC', g.decX + g.cwC / 2, ycy + 4, C.fg,
      { align: 'center', size: 12, weight: 700 });
    for (let i = 0; i < g.n; i += 1) {
      const y = g.rowY(i);
      const ov = V['q' + i];
      const on = ov === 1;
      ctx.strokeStyle = on ? C.named('red') : C.grid;
      ctx.lineWidth = on ? 2.6 : 1;
      ctx.beginPath();
      ctx.moveTo(g.decX + g.cwC, y);
      ctx.lineTo(g.oX, y);
      ctx.stroke();
      ctx.fillStyle = on ? C.named('red') : C.bg;
      ctx.fillRect(g.oX, y - g.rowH / 2 + 2, g.cwD, g.rowH - 4);
      ctx.strokeStyle = on ? C.named('red') : C.axis;
      ctx.lineWidth = on ? 1.8 : 1;
      ctx.strokeRect(g.oX, y - g.rowH / 2 + 2, g.cwD, g.rowH - 4);
      label(ctx, 'O' + i + '=' + (on ? 1 : 0), g.oX + g.cwD / 2, y + 4,
        on ? C.bg : C.fg, { align: 'center', size: 10, weight: 700 });
    }
    /* 选择线接到两个芯片 */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(sbx, 70);
    ctx.lineTo(sbx, 82);
    ctx.lineTo(g.chipX + g.cwC / 2, 82);
    ctx.lineTo(g.chipX + g.cwC / 2, chipTop);
    ctx.moveTo(sbx + s.k * sbw - 4, 70);
    ctx.lineTo(sbx + s.k * sbw - 4, 82);
    ctx.lineTo(g.decX + g.cwC / 2, 82);
    ctx.lineTo(g.decX + g.cwC / 2, chipTop);
    ctx.stroke();
    label(ctx, '同一组选择线喂给两边', sbx + s.k * sbw + 4, 86, C.accent2, { size: 9 });

    /* ---------- 展开式 ---------- */
    const fy = Math.min(H - 62, g.top + g.n * g.rowH + 30);
    label(ctx, '把「选择」拆开看：译码器第 i 根线 = 选择线的第 i 个最小项 m'
      + s.sv + ' = ' + mintermText(s.sv), 8, fy, C.fg, { size: 10 });
    const terms = [];
    for (let i = 0; i < g.n; i += 1) terms.push('D' + i + '·' + mintermText(i));
    ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = C.accent;
    ctx.fillText('Y = ' + terms.join(' + '), 8, fy + 18);
    ctx.font = '400 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    label(ctx, s.en ? '（' + g.n + ' 个与门把 D_i 和 m_i 相乘，一个或门把结果并起来）'
      : '（E = 0：所有最小项都被与门掐断，Y 恒为 0，译码器一根线都不亮）',
      8, fy + 34, s.en ? C.grid : C.named('red'), { size: 10 });

    /* ---------- 读数 ---------- */
    const sbits = [];
    for (let j = 0; j < s.k; j += 1) sbits.push((s.sv >> (s.k - 1 - j)) & 1);
    ro.set('选择 S', sbits.join('') + '₂ = ' + s.sv + '　→ 选中第 ' + s.sv
      + ' 路（点下面的输出线也能改）');
    ro.set('数据 D', s.d.slice(0, g.n).map((v, i) => 'D' + i + '=' + v).join('　'));
    ro.set('MUX 输出 Y', yv + '　= D' + s.sv + ' = ' + s.d[s.sv]
      + (s.en ? '' : '　（E=0，输出被封死）'));
    const active = [];
    for (let i = 0; i < g.n; i += 1) if (V['q' + i] === 1) active.push(i);
    ro.set('译码输出', active.length === 1
      ? 'O' + active[0] + ' = 1，其余全 0（独热 one-hot）'
      : '一根都不亮（E = 0）');
    ro.set('展开式', 'Y = ' + terms.join(' + '));
    ro.set('门数', s.k + ' 个非门（产生 S 的反）+ ' + (2 * g.n) + ' 个与门（MUX '
      + g.n + ' 个 + 译码器 ' + g.n + ' 个）+ 1 个 ' + g.n
      + ' 输入或门　= ' + (s.k + 2 * g.n + 1) + ' 个门');
  }

  /* ---------- 交互 ---------- */
  bindPointer(cv.canvas, {
    pick: (x, y) => hitTest(x, y),
    down(id, x, y) {
      void x; void y;
      const p = id.split(':');
      if (p[0] === 's') {
        const j = +p[1];
        const bit = s.k - 1 - j;
        s.sv ^= 1 << bit;
        paint = { kind: 's', val: (s.sv >> bit) & 1 };
        draw();
        return;
      }
      if (p[0] === 'en') {
        s.en = s.en ? 0 : 1;
        draw();
        return;
      }
      if (p[0] === 'd') {
        const i = +p[1];
        s.d[i] = s.d[i] ? 0 : 1;
        paint = { kind: 'd', val: s.d[i] };
        draw();
        return;
      }
      if (p[0] === 'o') {
        s.sv = +p[1];
        paint = { kind: 'o' };
        draw();
      }
    },
    move(id, x, y) {
      void id;
      if (!paint) return;
      const h = hitTest(x, y);
      if (!h) return;
      const p = h.split(':');
      if (paint.kind === 'd' && p[0] === 'd') {
        const i = +p[1];
        if (s.d[i] !== paint.val) { s.d[i] = paint.val; draw(); }
      } else if (paint.kind === 's' && p[0] === 's') {
        const j = +p[1];
        const bit = s.k - 1 - j;
        if (((s.sv >> bit) & 1) !== paint.val) {
          s.sv = paint.val ? s.sv | (1 << bit) : s.sv & ~(1 << bit);
          draw();
        }
      } else if (paint.kind === 'o' && p[0] === 'o') {
        if (s.sv !== +p[1]) { s.sv = +p[1]; draw(); }
      }
    },
    up() { paint = null; },
  });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
