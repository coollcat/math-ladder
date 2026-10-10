/* =========================================================================
 * lab 组件：algebra-intersection —— 交点就是方程组的解（3B1B 式分幕）
 * -------------------------------------------------------------------------
 * 用法（第 35 课课文 lab 围栏）：
 *
 *   { "type": "algebra-intersection", "title": "两条小票，一个交点" }
 *
 * 六幕动画（文具店双票：3x + 2y = 19 与 x + y = 7，交点在 (5, 2)）：
 *   1. 第一张小票画成一条蓝线
 *   2. 第二张小票画成一条橙线
 *   3. 交点现身：两个动点分别沿两条线滑向同一点
 *   4. 代入消元：动点沿橙线滑行，读数追到 x = 5
 *   5. 相减消元：新方程 x = 5 是一条竖直线，它同样过交点——解集没变
 *   6. 答案 (5, 2)：代回两张票全部归零
 *
 * 可拖：拖红色试探点 T 在平面上任意移动，读数条实时显示它离「喂饱两张票」
 *       还差多少——两个读数同时归零的地方，正是两条线的交点。
 * ========================================================================= */

import {
  themeColors, buildReadout, bindPointer, label, fmt, polyline, clamp,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const EQ1 = { a: 3, b: 2, c: 19 };  /* 3x + 2y = 19 */
const EQ2 = { a: 1, b: 1, c: 7 };   /* x + y = 7 */
const SOL = { x: 5, y: 2 };

export default function render(host, spec) {
  const ro = buildReadout({
    '试探点 T': '—',
    '票① 3x+2y': '—',
    '票② x+y': '—',
  });
  let T = { x: 1.5, y: 3.5 };      /* 红色试探点 */
  const G = { cx: 0, cy: 0, s: 1, panelX: 0 };

  /* 方格保持等比（角度不能骗人）；右侧留 150px 给信息面板，
     面板里放两式、当前操作与交点——空白处必须长内容，不能白着。 */
  function fit(W, H) {
    const span = 8.4;
    const panelW = Math.min(150, W * 0.26);
    G.panelX = W - panelW - 8;
    G.s = Math.min((G.panelX - 62) / span, (H - 64) / span);
    G.cx = 40;
    G.cy = H - 44;
  }
  const X = (v) => G.cx + v * G.s;
  const Y = (v) => G.cy - v * G.s;
  const y1 = (x) => (19 - 3 * x) / 2;
  const y2 = (x) => 7 - x;

  function grid(ctx, W, H, C) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let v = 0; v <= 8; v += 1) {
      ctx.moveTo(X(v) + 0.5, Y(0));
      ctx.lineTo(X(v) + 0.5, Y(8));
      ctx.moveTo(X(0), Y(v) + 0.5);
      ctx.lineTo(X(8), Y(v) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
    polyline(ctx, [[X(0), Y(0)], [X(8.3), Y(0)]], C.axis, 1.6);
    polyline(ctx, [[X(0), Y(0)], [X(0), Y(8.3)]], C.axis, 1.6);
    label(ctx, '笔 x（元）', X(8) + 4, Y(0) + 16, C.axis, { size: 11 });
    label(ctx, '本子 y（元）', X(0) + 6, Y(8) - 4, C.axis, { size: 11 });
    for (let v = 1; v <= 8; v += 1) {
      label(ctx, String(v), X(v), Y(0) + 16, C.axis, { size: 10, align: 'center' });
      label(ctx, String(v), X(0) - 6, Y(v) + 4, C.axis, { size: 10, align: 'right' });
    }
  }

  function drawLine(ctx, C, color, f, upto) {
    const seg = [];
    for (let x = 0; x <= upto + 1e-9; x += 0.1) {
      if (x > upto) break;
      seg.push([X(x), Y(f(x))]);
    }
    polyline(ctx, seg, color, 2.4);
  }

  function dot(ctx, C, x, y, color, r) {
    ctx.beginPath();
    ctx.arc(X(x), Y(y), r || 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const st = makeStage(host, {
    height: 320,
    aspect: 9 / 16,
    scenes: [
      { caption: '第 1 幕：第一张小票「3 支笔 2 本子 19 元」——满足它的价格组合铺成一条蓝线。', dur: 3 },
      { caption: '第 2 幕：第二张小票「1 支笔 1 本子 7 元」——铺成一条橙线。单看一条，答案有无数种。', dur: 3 },
      { caption: '第 3 幕：两条线只有一个共同落点——交点 (5, 2)。一个方程给一条线，方程组给一个点。', dur: 3.6 },
      { caption: '第 4 幕·代入：既然橙线把 y 绑成 7 − x，就让它整个滑行去找喂饱蓝线的位置——滑到 x = 5 停。', dur: 4.4 },
      { caption: '第 5 幕·相减：两式相减消去 y，得到新方程 x = 5——一条竖直线。它照样过交点：解集一毫米都没动。', dur: 4.4 },
      { caption: '第 6 幕：答案 (5, 2)。代回两张票：3×5+2×2 = 19 ✓，5+2 = 7 ✓。', dur: 3.6 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      fit(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      grid(ctx, W, H, C);
      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      /* 幕 1/2：两条线依次描出（之后一直保留） */
      const a1 = appear(0);
      if (a1 > 0) drawLine(ctx, C, C.named('blue'), y1, 7.4 * a1);
      const a2 = appear(1);
      if (a2 > 0) drawLine(ctx, C, C.named('orange'), y2, 7 * a2);
      if (a1 > 0.5) label(ctx, '3x + 2y = 19', X(7.6), Y(y1(7.4)) + 16, C.named('blue'), { size: 12, weight: 600 });
      if (a2 > 0.5) label(ctx, 'x + y = 7', X(7.2), Y(y2(7)) - 10, C.named('orange'), { size: 12, weight: 600 });

      /* 幕 3：交点 + 双动点向它汇合 */
      const a3 = appear(2);
      if (a3 > 0) {
        const e = clamp(a3 * 1.2, 0, 1);
        const bx = 1 + (SOL.x - 1) * e;         /* 蓝线上滑来的点 */
        const ox = 7 - (7 - SOL.x) * e;         /* 橙线上滑来的点 */
        if (e < 1) {
          dot(ctx, C, bx, y1(bx), C.named('blue'), 5);
          dot(ctx, C, ox, y2(ox), C.named('orange'), 5);
        }
      }

      /* 幕 4：沿橙线滑行 + 代入读数 */
      const a4 = appear(3);
      if (a4 > 0) {
        const sx = 0.5 + (SOL.x - 0.5) * clamp(a4 * 1.1, 0, 1);
        dot(ctx, C, sx, y2(sx), C.named('purple'), 6);
        ctx.save();
        ctx.globalAlpha = 0.9;
        label(ctx, '代入 y = 7 − x：3x + 2(7 − x) = 19 → x = ' + fmt(sx, 1), X(4.4), Y(6.6), C.named('purple'), { size: 12, weight: 600 });
        ctx.restore();
      }

      /* 幕 5：竖直线 x = 5 */
      const a5 = appear(4);
      if (a5 > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * a5;
        ctx.strokeStyle = C.named('green');
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(X(SOL.x), Y(0.2));
        ctx.lineTo(X(SOL.x), Y(6.4 * a5));
        ctx.stroke();
        ctx.restore();
        label(ctx, 'x = 5（相减得到的新直线）', X(SOL.x) + 10, Y(5.6), C.named('green'), { size: 12, weight: 600 });
      }

      /* 幕 6：验算 */
      const a6 = appear(5);
      if (a6 > 0) {
        label(ctx, '3×5 + 2×2 = 19 ✓    5 + 2 = 7 ✓', X(1.2), Y(6.9), C.ok, { size: 12.5, weight: 700 });
      }

      /* 交点（第 3 幕起常驻） */
      if (a3 > 0) {
        dot(ctx, C, SOL.x, SOL.y, C.named('purple'), 7);
        label(ctx, '(5, 2)', X(SOL.x) + 12, Y(SOL.y) - 10, C.named('purple'), { size: 13, weight: 700 });
      }

      /* 右侧信息面板：随幕递进的操作说明 + 两式 + 交点 */
      {
        const px0 = G.panelX;
        const pw = W - px0 - 8;
        ctx.save();
        ctx.fillStyle = C.soft;
        ctx.fillRect(px0, 26, pw, H - 92);
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(px0, 26, pw, H - 92);
        const line = (txt, yy, col, size, weight) => label(ctx, txt, px0 + 10, yy, col || C.fg, { size: size || 11.5, weight: weight || 400 });
        line('两张小票', 44, C.axis, 11);
        line('3x + 2y = 19', 66, C.named('blue'), 13);
        line('x + y = 7', 88, C.named('orange'), 13);
        line('——', 108, C.grid, 11.5, 400);
        if (a3 > 0) {
          line('同时喂饱两票的点', 128, C.axis, 11);
          line('交点 (5, 2)', 150, C.named('purple'), 13);
        }
        if (a4 > 0) line('代入：y = 7 − x', 174, C.named('purple'), 12);
        if (a5 > 0) line('相减：x = 5', 196, C.named('green'), 12);
        if (a6 > 0) line('3·5 + 2·2 = 19 ✓', 220, C.ok, 12);
        if (a6 > 0) line('5 + 2 = 7 ✓', 242, C.ok, 12);
        ctx.restore();
      }

      /* 红色试探点 T（始终可拖） */
      dot(ctx, C, T.x, T.y, C.named('red'), 6);
      label(ctx, 'T', X(T.x) + 10, Y(T.y) - 8, C.named('red'), { size: 11, weight: 700 });
      ro.set('试探点 T', '(' + fmt(T.x, 1) + ', ' + fmt(T.y, 1) + ')');
      ro.set('票① 3x+2y', fmt(3 * T.x + 2 * T.y, 1) + '（目标 19）');
      ro.set('票② x+y', fmt(T.x + T.y, 1) + '（目标 7）');
    },
  });

  /* 拖 T：整个画布都能抓（读数实时显示离两张票还差多少） */
  const pickAndMove = (x0, y0) => {
    T.x = clamp(Math.round(((x0 - G.cx) / G.s) * 2) / 2, 0, 8);
    T.y = clamp(Math.round(((G.cy - y0) / G.s) * 2) / 2, 0, 8);
    st.redraw();
  };
  bindPointer(st.cv.canvas, {
    down: (id, x0, y0) => pickAndMove(x0, y0),
    move: (id, x0, y0) => pickAndMove(x0, y0),
  });
  st.cv.canvas.style.cursor = 'crosshair';

  host.appendChild(ro.box);
  return { destroy: st.stop };
}
