/* =========================================================================
 * lab 组件：code-nearest-neighbor —— 最近邻译码的决策区与平票现场
 * -------------------------------------------------------------------------
 * 用法（第 35 章《最近邻译码》动手实验）：
 *   { "type": "code-nearest-neighbor", "title": "…" }
 * 字段（都可省）：code 码本（0/1 数组的数组，默认偶校验码三例）；
 *   received 初始接收串；height 画布高度（默认 520）。
 *
 * 3 位二元空间的八个串画成一只立方体的八个角（相邻角只差一位），
 * 把码字点亮成「灯塔」，其余角就按「离谁最近」分区染色：
 *   · 唯一最近 → 染成那座灯塔的颜色；
 *   · 并列最近 → 灰底，标「平票」。
 * 拖动可以转动立方体（左右转 yaw、上下转 pitch），点击任意角把接收串搬过去；
 * 右侧列出每个码字到接收串的距离，并在平票时说明「谁也没赢」。
 * 点「换码本」在三套码之间切换，立刻看到同一片空间被切成几块。
 *
 * 取舍：立方体只有 3 位，所以 8 个角就是全部可能；n>3 时本组件不画（
 *   四维空间没法诚实投影），改为提示。距离表始终按真实码本算，不预设结论。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildSegmented, buildReadout,
  bindPointer, mkBtn, label, clearBg, clamp, polyline,
} from '../core.js';

const CODEBOOKS = [
  { id: 'even', name: '偶校验码 {000,011,101,110}', words: ['000', '011', '101', '110'] },
  { id: 'rep', name: '重复码 {000,111}', words: ['000', '111'] },
  { id: 'single', name: '单个码字 {000}', words: ['000'] },
  { id: 'seven', name: 'Hamming(7,4) 摘录（投影到 3 位）', words: ['000', '011', '101', '110'] },
];

const toBits = (s) => s.split('').map((c) => (c === '1' ? 1 : 0));
const fromBits = (b) => b.join('');

function ham(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) d += 1;
  return d;
}

export default function render(host, spec) {
  const words = [];
  for (let k = 0; k < 8; k += 1) words.push([(k >> 2) & 1, (k >> 1) & 1, k & 1]);

  let book = CODEBOOKS.find((b) => b.id === (spec.book || 'even')) || CODEBOOKS[0];
  let code = book.words.map(toBits);
  /* 课文里那个「001 三方平票」的例子就是这个默认值 */
  let received = Array.isArray(spec.received) && spec.received.length === 3
    ? spec.received.map((b) => (Number(b) ? 1 : 0))
    : [0, 0, 1];

  let yaw = 0.62;
  let pitch = 0.42;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    接收串: '—',
    最近距离: '—',
    候选: '—',
    判决: '—',
    '球半径 t': '—',
  });
  host.appendChild(ro.box);

  const bTie = mkBtn('跳到平票点（001）');
  const bReset = mkBtn('重置视角');
  host.appendChild(buildToolbar(bTie, bReset));
  host.appendChild(buildSegmented(
    CODEBOOKS.map((b) => ({ label: b.name, value: b.id })),
    book.id,
    (v) => {
      book = CODEBOOKS.find((b) => b.id === v) || CODEBOOKS[0];
      code = book.words.map(toBits);
      draw();
    },
  ));

  const geo = { cx: 0, cy: 0, s: 0, panelX: 0, panelW: 0, panelY: 0, W: 0, H: 0 };

  function layout(W, H) {
    const wide = W >= 620;
    geo.W = W;
    geo.H = H;
    if (wide) {
      geo.cx = Math.min(W * 0.34, 240);
      geo.cy = H * 0.5 - 6;
      geo.s = Math.min(W * 0.19, H * 0.28);
      geo.panelX = Math.min(W * 0.62, geo.cx + geo.s * 2.4);
      geo.panelY = 54;
      geo.panelW = W - geo.panelX - 14;
    } else {
      geo.cx = W / 2;
      geo.cy = 168;
      geo.s = Math.min(W * 0.24, 96);
      geo.panelX = 16;
      geo.panelY = 300;
      geo.panelW = W - 32;
    }
  }

  function project(bits) {
    const x0 = bits[0] ? 1 : -1;
    const y0 = bits[1] ? 1 : -1;
    const z0 = bits[2] ? 1 : -1;
    const cyaw = Math.cos(yaw);
    const syaw = Math.sin(yaw);
    const x1 = x0 * cyaw + z0 * syaw;
    const z1 = -x0 * syaw + z0 * cyaw;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y1 = y0 * cp - z1 * sp;
    const z2 = y0 * sp + z1 * cp;
    const persp = 1 / (2.5 - z2 * 0.28);
    const k = geo.s * 1.12 * persp;
    return { x: geo.cx + x1 * k, y: geo.cy + y1 * k, z: z2 };
  }

  /* 每个角判给谁：唯一最近给码字下标；并列给 -1 */
  function decision() {
    const out = [];
    for (let i = 0; i < 8; i += 1) {
      let best = 9;
      let win = [];
      code.forEach((c, ci) => {
        const d = ham(words[i], c);
        if (d < best) { best = d; win = [ci]; } else if (d === best) win.push(ci);
      });
      out.push({ idx: i, best, winners: win, unique: win.length === 1 ? win[0] : -1 });
    }
    return out;
  }

  const CODE_COLORS = ['blue', 'orange', 'green', 'purple'];

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);
    const dec = decision();

    label(ctx, '3 位二元空间：八个角，棱连接只差一位的串', 16, 24, C.fg, { size: 12, weight: 700 });
    label(ctx, '拖动可旋转　点角 = 收到这个串', 16, 42, C.axis, { size: 10.5 });
    if (spec.n && spec.n > 3) label(ctx, '（n > 3 时无法诚实投影到屏幕，这里仍画 3 位切片）', 16, 58, C.bad, { size: 10 });

    /* ---- 棱：只差一位的两个角 ---- */
    const pts = words.map(project);
    for (let i = 0; i < 8; i += 1) {
      for (let j = i + 1; j < 8; j += 1) {
        if (ham(words[i], words[j]) !== 1) continue;
        polyline(ctx, [[pts[i].x, pts[i].y], [pts[j].x, pts[j].y]], C.grid, 1.2);
      }
    }

    /* ---- 角：按最近的灯塔染色 ---- */
    const order = dec.slice().sort((a, b) => pts[a.idx].z - pts[b.idx].z);
    order.forEach((d) => {
      const p = pts[d.idx];
      const isReceived = fromBits(words[d.idx]) === fromBits(received);
      const r = 11 + p.z * 2;
      ctx.save();
      if (d.unique >= 0) {
        ctx.fillStyle = C.named(CODE_COLORS[d.unique % CODE_COLORS.length]);
        ctx.globalAlpha = 0.92;
      } else {
        ctx.fillStyle = C.named('gray');
        ctx.globalAlpha = 0.45;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = isReceived ? 3.2 : 1.2;
      ctx.strokeStyle = isReceived ? C.fg : C.bg;
      ctx.stroke();
      if (d.winners.some((w) => fromBits(code[w]) === fromBits(words[d.idx]))) {
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = C.ok;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      label(ctx, fromBits(words[d.idx]), p.x, p.y + r + 13, isReceived ? C.fg : C.axis,
        { size: 10.5, align: 'center', weight: isReceived ? 700 : 400 });
      if (!d.winners.some((w) => fromBits(code[w]) === fromBits(words[d.idx])) && d.unique < 0) {
        label(ctx, '平票', p.x, p.y - r - 6, C.bad, { size: 9.5, align: 'center' });
      }
    });

    /* ---- 右（下）侧距离表 ---- */
    let py = geo.panelY;
    const px = geo.panelX;
    const pw = geo.panelW;
    label(ctx, '接收串 r = ' + fromBits(received), px, py, C.fg, { size: 13, weight: 700 });
    py += 20;
    const rows = code.map((c, i) => ({ c, i, d: ham(received, c) })).sort((a, b) => a.d - b.d);
    let bestD = rows.length ? rows[0].d : 9;
    const winners = rows.filter((r2) => r2.d === bestD);
    rows.forEach((row) => {
      const isWin = row.d === bestD;
      const isTie = isWin && winners.length > 1;
      ctx.save();
      ctx.fillStyle = isWin ? C.named(CODE_COLORS[row.i % CODE_COLORS.length]) : C.soft;
      ctx.globalAlpha = isWin ? 0.16 : 0.5;
      ctx.fillRect(px, py - 12, Math.min(pw, 260), 20);
      ctx.globalAlpha = 1;
      ctx.restore();
      label(ctx, 'c' + (row.i + 1) + ' = ' + fromBits(row.c), px + 6, py + 2, C.fg,
        { size: 11, weight: isWin ? 700 : 400 });
      label(ctx, 'd = ' + row.d, px + 140, py + 2, isWin ? C.accent : C.axis,
        { size: 11, weight: isWin ? 700 : 400 });
      if (isWin) label(ctx, isTie ? '平票' : '← 最近', px + 200, py + 2, isTie ? C.bad : C.ok, { size: 11, weight: 700 });
      py += 24;
    });

    py += 8;
    if (winners.length === 1) {
      label(ctx, '唯一最近：判给 ' + fromBits(winners[0].c), px, py, C.ok, { size: 12, weight: 700 });
      label(ctx, '代价 = 翻转 ' + bestD + ' 位', px, py + 17, C.axis, { size: 10.5 });
    } else {
      label(ctx, winners.length + ' 个码字并列最近：不能安全判决', px, py, C.bad, { size: 12, weight: 700 });
      label(ctx, '除非系统另有约定，应报告平票或请求重传', px, py + 17, C.axis, { size: 10.5 });
    }

    /* 码本的最小距离与纠错半径：解释「为什么这里总是平票」 */
    let dmin = 99;
    for (let i = 0; i < code.length; i += 1) {
      for (let j = i + 1; j < code.length; j += 1) dmin = Math.min(dmin, ham(code[i], code[j]));
    }
    const t = code.length > 1 ? Math.floor((dmin - 1) / 2) : 0;
    label(ctx, '本码本 d_min = ' + (code.length > 1 ? dmin : '—') + '，纠错半径 t = ' + t
      + (t === 0 ? '（只检不纠）' : ''), px, py + (geo.W >= 620 ? 46 : 46), C.fg, { size: 11 });

    ro.set('接收串', fromBits(received));
    ro.set('最近距离', String(bestD));
    ro.set('候选', winners.map((w) => fromBits(w.c)).join('、'));
    ro.set('判决', winners.length === 1 ? fromBits(winners[0].c) : '平票（' + winners.length + ' 方）');
    ro.set('球半径 t', String(t));
  }

  const hitVertex = (x0, y0) => {
    let best = -1;
    let bd = 999;
    words.forEach((w, i) => {
      const p = project(w);
      const d = Math.hypot(p.x - x0, p.y - y0);
      if (d < bd && d < 26) { bd = d; best = i; }
    });
    return best;
  };

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hitVertex(x0, y0) >= 0 ? 'vertex' : 'rotate'; },
    hover(x0, y0) {
      cv.canvas.style.cursor = hitVertex(x0, y0) >= 0 ? 'pointer' : 'grab';
    },
    down(id, x0, y0) {
      if (id === 'vertex') {
        const v = hitVertex(x0, y0);
        if (v >= 0) { received = words[v].slice(); draw(); }
        return;
      }
      dragging = true;
      cv.canvas.style.cursor = 'grabbing';
      dragX = x0;
      dragY = y0;
    },
    move(id, x0, y0) {
      if (!dragging) return;
      yaw += (x0 - dragX) * 0.01;
      pitch = clamp(pitch + (y0 - dragY) * 0.01, -1.2, 1.2);
      dragX = x0;
      dragY = y0;
      draw();
    },
    up() { dragging = false; cv.canvas.style.cursor = 'grab'; },
    leave() { dragging = false; },
  });

  bTie.addEventListener('click', () => { received = [0, 0, 1]; draw(); });
  bReset.addEventListener('click', () => { yaw = 0.62; pitch = 0.42; draw(); });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
