/* =========================================================================
 * lab 组件：algebra-zero-hunt —— 解方程 = 等直线穿过海平面（3B1B 式分幕）
 * -------------------------------------------------------------------------
 * 用法（第 30 课课文 lab 围栏）：
 *
 *   { "type": "algebra-zero-hunt", "title": "2x + b = 0：直线什么时候归零" }
 *
 * 字段：b  常数项（方程 2x + b = 0 的 b），−8..8，默认 −6
 *
 * 四幕动画：
 *   1. 画出记录仪的直线 y = 2x + b，喂进去的每个 x 都吐出一个高度
 *   2. 一个光点沿直线滑行，读数实时变化——它要找高度恰为 0 的位置
 *   3. 光点停在直线上：那里就是零点，x = −b/2
 *   4. 回看代数：移项后的 2x + b = 0 问的就是「y 什么时候为 0」
 *
 * 可拖：直接拖直线上的截距点 (0, b) 上下移动（同步滑块）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, mergeSpec, setSliderRow, buildReadout,
  bindPointer, label, fmt, clamp, polyline,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [{ name: 'b', label: '常数项 b', min: -8, max: 8, step: 1, value: -6 }];

export default function render(host, spec) {
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => st.redraw());
  const B = () => sliders.state.b;
  const ro = buildReadout({ '光点 x': '—', '直线高度 y': '—', 零点: '—' });

  const G = { cx: 0, cy: 0, sx: 1, sy: 1, x0: -5, x1: 5, y0: 0, y1: 0 };

  /* 二维独立比例：这是「高度记录仪」的函数图而非几何图，横纵各自填满画布，
     不浪费一丝空间（3B1B 的函数图也同样拉满）。 */
  function fit(W, H) {
    const b = B();
    G.x0 = -5;
    G.x1 = 5;
    G.y0 = Math.min(0, 2 * G.x0 + b) - 1;
    G.y1 = Math.max(0, 2 * G.x1 + b) + 1;
    const m = 46;
    const top = 30;
    const bot = 56;
    G.sx = (W - m) / (G.x1 - G.x0);
    G.sy = (H - top - bot) / (G.y1 - G.y0);
    G.cx = m + (W - m) / 2;
    G.cy = top + (H - top - bot) / 2;
  }
  const X = (v) => G.cx + v * G.sx;
  const Y = (v) => G.cy - v * G.sy;

  const st = makeStage(host, {
    height: 320,
    aspect: 9 / 16,
    scenes: [
      { caption: '第 1 幕：把方程左边当成一台「高度记录仪」——喂一个 x 进去，直线 y = 2x + b 就吐出一个高度。', dur: 3.4 },
      { caption: '第 2 幕：一个光点沿直线滑行，高度一路变化。它要找的，是高度恰为 0 的那个 x。', dur: 4.2 },
      { caption: '第 3 幕：光点停住了——直线在这里穿过海平面（y = 0），这个 x 就是方程的解。', dur: 3.4 },
      { caption: '第 4 幕：代数一句话说完——移项后的 2x + b = 0，问的就是「高度什么时候等于 0」。', dur: 3.6 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const b = B();
      fit(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      /* 网格 */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = Math.ceil(G.x0); v <= G.x1; v += 1) {
        ctx.moveTo(X(v) + 0.5, 20);
        ctx.lineTo(X(v) + 0.5, H - 34);
      }
      const ys = [];
      for (let v = Math.ceil(G.y0 / 2) * 2; v <= G.y1; v += 2) ys.push(v);
      ys.forEach((v) => {
        if (v === 0) return;
        ctx.moveTo(40, Y(v) + 0.5);
        ctx.lineTo(W - 20, Y(v) + 0.5);
      });
      ctx.stroke();
      ctx.restore();

      /* 坐标轴 + 海平面 */
      polyline(ctx, [[X(G.x0), Y(0)], [X(G.x1), Y(0)]], C.accent, 2.4);
      polyline(ctx, [[X(0), Y(G.y0)], [X(0), Y(G.y1)]], C.axis, 1.6);
      label(ctx, '海平面 y = 0', X(G.x1) - 4, Y(0) - 8, C.accent, { size: 11.5, weight: 600, align: 'right' });
      label(ctx, 'x', X(G.x1) - 6, Y(0) + 16, C.axis, { size: 11, align: 'right' });
      label(ctx, 'y', X(0) + 6, Y(G.y1) + 12, C.axis, { size: 11 });
      ys.forEach((v) => label(ctx, String(v), X(0) - 6, Y(v) + 4, C.axis, { size: 10, align: 'right' }));

      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      /* 幕 1：直线从左端描出 */
      const a1 = appear(0);
      if (a1 > 0) {
        const seg = [];
        const n = 60;
        const upto = G.x0 + (G.x1 - G.x0) * a1;
        for (let k = 0; k <= n; k += 1) {
          const v = G.x0 + ((upto - G.x0) * k) / n;
          seg.push([X(v), Y(2 * v + b)]);
        }
        polyline(ctx, seg, C.fg, 2.2);
      }

      /* 幕 2：光点沿直线滑向零点 */
      const a2 = appear(1);
      const zeroX = -b / 2;
      let dotX = G.x0;
      if (a2 > 0) {
        dotX = G.x0 + (zeroX - G.x0) * Math.min(a2 * 1.15, 1);
        const dotY = 2 * dotX + b;
        ctx.save();
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(X(dotX), Y(0));
        ctx.lineTo(X(dotX), Y(dotY));
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(X(dotX), Y(dotY), 7, 0, Math.PI * 2);
        ctx.fillStyle = C.accent2;
        ctx.fill();
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        label(ctx, 'x = ' + fmt(dotX, 2) + '，y = ' + fmt(dotY, 2), X(dotX) + 12, Y(dotY) - 8, C.accent2, { size: 12, weight: 600 });
        ro.set('光点 x', fmt(dotX, 2));
        ro.set('直线高度 y', fmt(dotY, 2));
      }

      /* 幕 3：交点钉住 */
      const a3 = appear(2);
      if (a3 > 0) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.6 * a3;
        ctx.strokeStyle = C.ok;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(X(zeroX), Y(0));
        ctx.lineTo(X(zeroX), Y(G.y0));
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(X(zeroX), Y(0), 9 * (1 + 0.25 * (1 - a3)), 0, Math.PI * 2);
        ctx.fillStyle = C.ok;
        ctx.fill();
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        label(ctx, '解：x = ' + fmt(zeroX, 2), X(zeroX) + 14, Y(0) + 18, C.ok, { size: 13, weight: 700 });
        label(ctx, '验算 2×' + fmt(zeroX, 1) + ' + (' + fmt(b, 0) + ') = 0', X(zeroX) + 14, Y(0) + 36, C.ok, { size: 11.5 });
        ro.set('零点', fmt(zeroX, 2));
      } else if (a2 > 0) {
        ro.set('零点', '…还没穿过');
      }

      /* 截距小手柄：(0, b) 画出来，pick 区才不是幽灵 */
      {
        ctx.save();
        ctx.fillStyle = C.accent2;
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(0), Y(b), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        label(ctx, '拖我改 b', X(0) + 12, Y(b) - 10, C.accent2, { size: 11, weight: 600 });
      }

      /* 幕 4：代数收尾 */
      const a4 = appear(3);
      if (a4 > 0) {
        ctx.save();
        ctx.globalAlpha = a4;
        ctx.fillStyle = C.soft;
        ctx.fillRect(W * 0.5 - 150, H - 62, 300, 30);
        label(ctx, '2x + (' + fmt(b, 0) + ') = 0   ⇒   x = −b/2 = ' + fmt(zeroX, 2), W / 2, H - 42, C.fg, { size: 13.5, weight: 700, align: 'center' });
        ctx.restore();
      }

      /* 顶部方程 */
      label(ctx, 'y = 2x + (' + fmt(b, 0) + ')', 46, 24, C.fg, { size: 12, weight: 600 });

      /* 失焦时读数归位 */
      if (a2 <= 0) {
        ro.set('光点 x', '—');
        ro.set('直线高度 y', '—');
      }
      if (a3 <= 0) ro.set('零点', '—');
    },
  });

  /* 拖截距点 (0, b) → 改 b。坐标经 st.toLogical 反演 trim；
     避开幕 2 滑行光点的位置，免得光点路过时被误抓改 b。 */
  st.cv.canvas.style.cursor = 'default';
  bindPointer(st.cv.canvas, {
    pick(x0, y0) {
      const [lx, ly] = st.toLogical(x0, y0);
      if (Math.hypot(lx - X(0), ly - Y(B())) > 14) return null;
      /* 幕 2 光点正在滑行：与它保持 24px 距离，不抢 */
      if (st.scene === 1) {
        const zeroX = -B() / 2;
        const dotX = G.x0 + (zeroX - G.x0) * Math.min(st.t * 1.15, 1);
        if (Math.hypot(lx - X(dotX), ly - Y(2 * dotX + B())) < 24) return null;
      }
      return 'pt';
    },
    hover(x0, y0) {
      const [lx, ly] = st.toLogical(x0, y0);
      st.cv.canvas.style.cursor = Math.hypot(lx - X(0), ly - Y(B())) < 14 ? 'ns-resize' : 'default';
    },
    leave() { st.cv.canvas.style.cursor = 'default'; },
    move(id, x0, y0) {
      if (id !== 'pt') return;
      const [, ly] = st.toLogical(x0, y0);
      const nb = clamp(Math.round((G.cy - ly) / G.sy), -8, 8);
      if (nb !== B()) {
        setSliderRow(sliders, 0, nb, 0, 'b');
        st.redraw();
      }
    },
  });

  const wrap = host;
  wrap.appendChild(ro.box);
  return { slidersBox: sliders.box, destroy: st.stop };
}
