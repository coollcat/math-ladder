/* =========================================================================
 * lab 组件：code-conv-trellis —— 带记忆的编码器走成一张网格图
 * -------------------------------------------------------------------------
 * 用法（第 35 章《卷积码直观预告》动手实验）：
 *   { "type": "code-conv-trellis", "title": "…" }
 * 字段（都可省）：bits 初始输入序列（0/1 数组，默认 1,0,1）；
 *   maxLen 最长输入位数（默认 9）；height 画布高度（默认 520）。
 *
 * 本课的编码器只有 1 位记忆：c1 = u，c2 = u ⊕ 上一位。于是一列列往下排：
 *   横轴 = 时间步，纵轴 = 状态（0 表示「上一位是 0」，1 表示「上一位是 1」）。
 * 每个状态在每个时刻都伸出两条边，分别对应输入 0 与输入 1，边上写着
 *   「输入/输出两位」。点任一列的输入位就能改这一拍的输入，加粗的绿线
 *   始终是当前输入序列真实走过的那条路径。
 * 关键要看的东西：同样输入 1，从状态 0 出发给 11、从状态 1 出发给 10——
 *   同一个格子从左、从右进来，输出可以不同，这就是「记忆」的现场。
 *
 * 取舍：只画 2 状态系统（课文例题），不开放改生成多项式；边上的两位
 *   输出全部现算，不查表。输入长度上限 9，再长画布就挤不下边标签。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, bindPointer,
  mkBtn, label, clearBg, clamp, polyline,
} from '../core.js';

const MAX = 9;

export default function render(host, spec) {
  const maxLen = clamp(Math.round(spec.maxLen || MAX), 3, MAX);
  let bits = Array.isArray(spec.bits) && spec.bits.length
    ? spec.bits.slice(0, maxLen).map((b) => (Number(b) ? 1 : 0))
    : [1, 0, 1];

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    输入: '—',
    输出: '—',
    末状态: '—',
    步数: '—',
    '同样的 1，两种输出': '—',
  });
  host.appendChild(ro.box);

  const bAdd = mkBtn('加一位（随机）');
  const bDel = mkBtn('删一位');
  const bTerm = mkBtn('补一个终止位 0');
  const bReset = mkBtn('重置为 101');
  host.appendChild(buildToolbar(bAdd, bDel, bTerm, bReset));

  let seed = 2026;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  /* 按课文口径推进：先用旧的 previous 算第二个输出，再更新状态 */
  function encode(seq) {
    const out = [];
    let prev = 0;
    const steps = [];
    seq.forEach((u) => {
      const c1 = u;
      const c2 = (u + prev) % 2;
      steps.push({ u, prev, c1, c2 });
      out.push(c1, c2);
      prev = u;
    });
    return { out, steps, finalState: prev };
  }

  const geo = { x0: 0, y0: 0, colW: 0, rowH: 0, W: 0, H: 0, hitY: 0 };

  function layout(W, H) {
    const pad = 20;
    geo.W = W;
    geo.H = H;
    const left = 62;
    geo.colW = clamp((W - left - pad) / (bits.length + 1), 34, 96);
    geo.x0 = left;
    geo.rowH = clamp(H * 0.16, 52, 92);
    geo.y0 = 120;
  }

  const nodeX = (t) => geo.x0 + t * geo.colW;
  const nodeY = (st) => geo.y0 + st * geo.rowH;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    const { out, steps, finalState } = encode(bits);
    const L = bits.length;

    label(ctx, '网格图（trellis）：横轴时间、纵轴状态；边上的写法是「输入 / 输出两位」', 16, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, 'c1 = u，c2 = u ⊕ 上一位　——　状态记的就是「上一位」', 16, 46, C.axis, { size: 10.5 });

    /* ---- 全部边 ---- */
    const showLabels = geo.colW >= 56;
    for (let t = 0; t < L; t += 1) {
      for (let prev = 0; prev < 2; prev += 1) {
        for (let u = 0; u < 2; u += 1) {
          const x1 = nodeX(t);
          const y1 = nodeY(prev);
          const x2 = nodeX(t + 1);
          const y2 = nodeY(u);
          const isPath = steps[t].u === u && steps[t].prev === prev;
          polyline(ctx, [[x1, y1], [x2, y2]],
            isPath ? C.ok : C.grid, isPath ? 3.4 : 1.3);
          if (isPath) {
            /* 路径上的边加一枚小箭头，强调方向 */
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const ang = Math.atan2(y2 - y1, x2 - x1);
            ctx.save();
            ctx.fillStyle = C.ok;
            ctx.beginPath();
            ctx.moveTo(mx + 6 * Math.cos(ang), my + 6 * Math.sin(ang));
            ctx.lineTo(mx + 13 * Math.cos(ang + 2.5), my + 13 * Math.sin(ang + 2.5));
            ctx.lineTo(mx + 13 * Math.cos(ang - 2.5), my + 13 * Math.sin(ang - 2.5));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          if (showLabels) {
            const c1 = u;
            const c2 = (u + prev) % 2;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const off = prev === 0 && u === 0 ? -9 : (prev === 1 && u === 1 ? 15 : -4);
            label(ctx, u + '/' + c1 + c2, mx, my + off, isPath ? C.ok : C.axis,
              { size: 9.5, align: 'center', weight: isPath ? 700 : 400 });
          }
        }
      }
    }

    /* ---- 状态节点 ---- */
    for (let t = 0; t <= L; t += 1) {
      for (let st = 0; st < 2; st += 1) {
        const x = nodeX(t);
        const y = nodeY(st);
        const onPath = (t === 0 && st === 0) || (t > 0 && (t === L ? finalState : steps[t].prev) === st);
        ctx.save();
        ctx.fillStyle = onPath ? C.ok : C.soft;
        ctx.globalAlpha = onPath ? 0.95 : 0.85;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, 't' + t, nodeX(t), geo.y0 - 34, C.axis, { size: 9.5, align: 'center' });
    }
    label(ctx, '状态 0', geo.x0 - 26, nodeY(0) + 4, C.fg, { size: 11, align: 'right', weight: 700 });
    label(ctx, '状态 1', geo.x0 - 26, nodeY(1) + 4, C.fg, { size: 11, align: 'right', weight: 700 });
    label(ctx, '（上一位 = 0）', geo.x0 - 26, nodeY(0) + 19, C.axis, { size: 9.5, align: 'right' });
    label(ctx, '（上一位 = 1）', geo.x0 - 26, nodeY(1) + 19, C.axis, { size: 9.5, align: 'right' });

    /* ---- 输入位带（点一下翻转该步输入） ---- */
    const by = geo.y0 + geo.rowH * 2 + 46;
    label(ctx, '输入序列（点任一格翻转该拍的输入）', geo.x0 - 40, by - 12, C.fg, { size: 11.5, weight: 700 });
    bits.forEach((b, i) => {
      const x = nodeX(i) + geo.colW * 0.18;
      const wCell = geo.colW * 0.64;
      ctx.save();
      ctx.fillStyle = b ? C.named('orange') : C.soft;
      ctx.globalAlpha = b ? 0.9 : 0.7;
      ctx.fillRect(x, by, wCell, 26);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x + 0.5, by + 0.5, wCell - 1, 25);
      ctx.restore();
      label(ctx, String(b), x + wCell / 2, by + 18, b ? C.bg : C.fg,
        { size: 13, align: 'center', weight: 700 });
    });

    /* ---- 输出位带 ---- */
    const oy = by + 44;
    label(ctx, '编码输出（每拍两位，共 ' + (2 * L) + ' 位）', geo.x0 - 40, oy - 12, C.fg, { size: 11.5, weight: 700 });
    out.forEach((b, i) => {
      const step = Math.floor(i / 2);
      const k2 = i % 2;
      const x = nodeX(step) + geo.colW * (0.08 + k2 * 0.44);
      const wCell = geo.colW * 0.36;
      ctx.save();
      ctx.fillStyle = b ? C.named('teal') : C.soft;
      ctx.globalAlpha = b ? 0.85 : 0.6;
      ctx.fillRect(x, oy, wCell, 22);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x + 0.5, oy + 0.5, wCell - 1, 21);
      ctx.restore();
      label(ctx, String(b), x + wCell / 2, oy + 16, b ? C.bg : C.fg,
        { size: 11.5, align: 'center', weight: 700 });
    });
    label(ctx, '"' + out.join('') + '"', geo.x0 - 40, oy + 40, C.fg, { size: 11, weight: 700 });

    /* ---- 逐拍表（宽屏时放在右下，窄屏放下方） ---- */
    if (geo.W >= 680) {
      const px = geo.x0 + (L + 1) * geo.colW + 8;
      if (px < geo.W - 150) {
        let py = 118;
        label(ctx, '逐拍记录', px, py, C.fg, { size: 11.5, weight: 700 });
        py += 16;
        label(ctx, '步　上一位　输入　输出', px, py, C.axis, { size: 9.5 });
        py += 14;
        steps.forEach((s, i) => {
          label(ctx, (i + 1) + '　　' + s.prev + '　　　' + s.u + '　　' + s.c1 + s.c2,
            px, py, C.fg, { size: 10 });
          py += 14;
        });
        py += 6;
        label(ctx, '末状态 = ' + finalState, px, py, C.named('green'), { size: 10.5, weight: 700 });
      }
    }

    /* 「同一个 1，两种输出」的现场对拍：找一对 (prev=0,u=1) 与 (prev=1,u=1) */
    const has0 = steps.some((s) => s.u === 1 && s.prev === 0);
    const has1 = steps.some((s) => s.u === 1 && s.prev === 1);
    const pairText = has0 && has1 ? '都出现过（11 与 10）' : (has0 ? '见过 11，还没见过 10' : (has1 ? '见过 10，还没见过 11' : '还没出现过输入 1'));

    ro.set('输入', bits.join(''));
    ro.set('输出', out.join(''));
    ro.set('末状态', String(finalState));
    ro.set('步数', L + ' 拍 / ' + (2 * L) + ' 位');
    ro.set('同样的 1，两种输出', pairText);
  }

  /* 命中：输入位带 */
  function hit(x0, y0) {
    const by = geo.y0 + geo.rowH * 2 + 46;
    if (y0 < by || y0 > by + 26) return -1;
    for (let i = 0; i < bits.length; i += 1) {
      const x = nodeX(i) + geo.colW * 0.18;
      if (x0 >= x && x0 <= x + geo.colW * 0.64) return i;
    }
    return -1;
  }

  bindPointer(cv.canvas, {
    pick(x0, y0) { return hit(x0, y0) >= 0 ? 'bit' : null; },
    hover(x0, y0) { cv.canvas.style.cursor = hit(x0, y0) >= 0 ? 'pointer' : 'default'; },
    down(id, x0, y0) {
      const i = hit(x0, y0);
      if (i < 0) return;
      bits[i] = 1 - bits[i];
      draw();
    },
    move() {},
    up() {},
    leave() { cv.canvas.style.cursor = 'default'; },
  });

  bAdd.addEventListener('click', () => {
    if (bits.length >= maxLen) return;
    bits = bits.concat([rnd() < 0.5 ? 0 : 1]);
    draw();
  });
  bDel.addEventListener('click', () => {
    if (bits.length <= 1) return;
    bits = bits.slice(0, -1);
    draw();
  });
  bTerm.addEventListener('click', () => {
    if (bits.length >= maxLen) return;
    bits = bits.concat([0]);
    draw();
  });
  bReset.addEventListener('click', () => { bits = [1, 0, 1]; draw(); });

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
