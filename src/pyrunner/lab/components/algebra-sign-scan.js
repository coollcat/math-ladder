/* =========================================================================
 * lab 组件：algebra-sign-scan —— 抛物线符号扫描（3B1B 式分幕）
 * -------------------------------------------------------------------------
 * 用法（第 55 课课文 lab 围栏）：
 *
 *   { "type": "algebra-sign-scan", "title": "一根扫描线，读完整条抛物线" }
 *
 * 字段：b  x² + bx + c 的一次项系数，−6..6，默认 −1
 *       c  常数项，−6..6，默认 −6
 *
 * 四幕动画（默认 y = x² − x − 6，两根 −2 与 3）：
 *   1. 抛物线：开口向上的碗
 *   2. 求根：两根是边界——「方程管边界」
 *   3. 扫描：竖直光标从左扫到右，数轴带逐段染色（海平面以上 = 正 = 橙色）
 *   4. 抄答案：>0 取两根之外（两段），<0 取两根之间（一段）——「不等式管地皮」
 *
 * 可拖：拖扫描光标左右移动；拖 b / c 滑块换一条抛物线（Δ < 0 时整条在轴上方，
 *       扫描线交不到负号地带）。
 * ========================================================================= */

import {
  themeColors, buildSliders, mergeSpec, bindPointer, buildReadout, label, fmt, clamp, polyline,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'b', label: '一次项系数 b', min: -6, max: 6, step: 1, value: -1 },
  { name: 'c', label: '常数项 c', min: -6, max: 6, step: 1, value: -6 },
];

export default function render(host, spec) {
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => st.redraw());
  const ro = buildReadout({
    '光标 x': '—',
    '式子值 y': '—',
    'Δ': '—',
    '> 0 的解集': '—',
  });

  const G = { cx: 0, cy: 0, s: 1, x0: -5, x1: 7, panelX: 0 };
  let scanX = null;                 /* 用户拖动的光标位置（null = 跟随播放进度） */

  /* 抛物线必须等比（碗形不能骗人）；右侧留图例面板，
     色例 + 口诀 + Δ 状态都长在那里，空白处长内容。
     纵向区间按当前 b/c 动态取：顶点必须入画（碗要看得见），
     横向铺到 panelX——窄屏也不塌成一条线。 */
  function fit(W, H) {
    const panelW = Math.min(152, W * 0.27);
    G.panelX = W - panelW - 8;
    const b = sliders.state.b;
    const c = sliders.state.c;
    const vx = -b / 2;
    const vLow = Math.min(0, vx * vx + b * vx + c);   /* 含顶点的纵向下界 */
    const vHigh = Math.max(2, vx * vx + b * vx + c);
    const spanY = Math.max(vHigh - vLow + 2, 4);
    const top = 30;                 /* 顶部状态行 */
    const bot = H - 62;             /* 底部：解集带 + 根刻度 */
    G.s = Math.min((G.panelX - 62) / (G.x1 - G.x0), (bot - top) / spanY);
    G.cx = 48;
    G.cy = top + vHigh * G.s;       /* 域的高端贴顶，低端（顶点）必入画 */
  }
  const X = (v) => G.cx + (v - G.x0) * G.s;
  const Y = (v) => G.cy - v * G.s;
  const f = (x) => x * x + sliders.state.b * x + sliders.state.c;

  const roots = () => {
    const b = sliders.state.b;
    const c = sliders.state.c;
    const d = b * b - 4 * c;
    if (d < 0) return null;
    return [(-b - Math.sqrt(d)) / 2, (-b + Math.sqrt(d)) / 2];
  };

  function band(ctx, W, H, C, upto) {
    /* 底部数轴带：已扫过的部分按符号染色（正 = 橙，负 = 蓝） */
    const y0 = H - 44;
    const h = 16;
    const r = roots();
    ctx.save();
    ctx.fillStyle = C.grid;
    ctx.fillRect(X(G.x0), y0, X(G.x1) - X(G.x0), h);
    const xFrom = G.x0;
    const xTo = G.x0 + (G.x1 - G.x0) * clamp(upto, 0, 1);
    const step = 1 / 2;
    for (let x = xFrom; x < xTo; x += step) {
      const xm = Math.min(x + step / 2, xTo);
      const v = f(xm);
      ctx.fillStyle = v > 0 ? C.named('orange') : (v < 0 ? C.named('blue') : C.named('gray'));
      ctx.fillRect(X(x), y0, Math.max(X(xm) - X(x), 1), h);
    }
    ctx.restore();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(X(G.x0), y0, X(G.x1) - X(G.x0), h);
    /* 根刻度 */
    if (r) {
      [r[0], r[1]].forEach((rv) => {
        polyline(ctx, [[X(rv), y0 - 5], [X(rv), y0 + h + 5]], C.fg, 1.4);
        label(ctx, fmt(rv, 1), X(rv), y0 + h + 14, C.fg, { size: 10.5, align: 'center' });
      });
    }
    label(ctx, '解集带', X(G.x0) - 6, y0 + h + 14, C.axis, { size: 10, align: 'right' });
  }

  const st = makeStage(host, {
    height: 320,
    aspect: 9 / 16,
    onScene: () => { scanX = null; },
    scenes: [
      { caption: '第 1 幕：二次不等式 x² + bx + c > 0。先看它对应的抛物线——一只开口向上的碗。', dur: 3 },
      { caption: '第 2 幕：解方程找出两个根：它们把数轴切成三段，是解集的边界。「方程管边界」。', dur: 3.2 },
      { caption: '第 3 幕：一根竖直光标从左扫到右。经过的地方留下颜色——橙色是海平面以上（y > 0），蓝色是以下（y < 0）。', dur: 5 },
      { caption: '第 4 幕：抄答案：问 >0 取橙色两段（两根之外），问 <0 取蓝色中段（两根之间）。「不等式管地皮」。', dur: 4 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      fit(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      const r = roots();
      const delta = sliders.state.b * sliders.state.b - 4 * sliders.state.c;

      /* 网格 + 坐标轴 */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = Math.ceil(G.x0); v <= G.x1; v += 1) {
        ctx.moveTo(X(v) + 0.5, Y(9));
        ctx.lineTo(X(v) + 0.5, Y(-7));
      }
      for (let v = -6; v <= 8; v += 2) {
        ctx.moveTo(X(G.x0), Y(v) + 0.5);
        ctx.lineTo(X(G.x1), Y(v) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
      polyline(ctx, [[X(G.x0), Y(0)], [X(G.x1), Y(0)]], C.axis, 1.6);
      polyline(ctx, [[X(0), Y(9)], [X(0), Y(-7)]], C.axis, 1.6);
      label(ctx, 'y = 0（海平面）', X(G.x1) - 4, Y(0) - 7, C.axis, { size: 10.5, align: 'right' });
      for (let v = Math.ceil(G.x0); v <= G.x1; v += 1) {
        if (v !== 0) label(ctx, String(v), X(v), Y(0) + 15, C.axis, { size: 10, align: 'center' });
      }

      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      /* 幕 1：抛物线描出（之后保留） */
      const a1 = appear(0);
      if (a1 > 0) {
        const upto = G.x0 + (G.x1 - G.x0) * a1;
        const seg = [];
        for (let x = G.x0; x <= upto; x += 0.08) seg.push([X(x), Y(f(x))]);
        polyline(ctx, seg, C.accent, 2.4);
      }

      /* 幕 2：两根 */
      const a2 = appear(1);
      if (a2 > 0 && r) {
        [r[0], r[1]].forEach((rv) => {
          ctx.beginPath();
          ctx.arc(X(rv), Y(0), 6, 0, Math.PI * 2);
          ctx.fillStyle = C.ok;
          ctx.fill();
          ctx.strokeStyle = C.bg;
          ctx.lineWidth = 2;
          ctx.stroke();
          label(ctx, 'x = ' + fmt(rv, 1), X(rv), Y(0) - 14, C.ok, { size: 12, weight: 700, align: 'center' });
        });
      }

      /* 幕 3：扫描光标 */
      const a3 = appear(2);
      if (a3 > 0) band(ctx, W, H, C, a3);
      else if (i > 2) band(ctx, W, H, C, 1);

      if (a3 > 0 || i > 2) {
        let cxv = scanX;
        if (cxv === null) cxv = G.x0 + (G.x1 - G.x0) * clamp(i > 2 ? 1 : a3, 0, 1);
        const yv = f(cxv);
        ctx.save();
        ctx.strokeStyle = C.accent2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(cxv), Y(-7));
        ctx.lineTo(X(cxv), Y(9));
        ctx.stroke();
        ctx.restore();
        const sign = yv > 0 ? '正（在上）' : (yv < 0 ? '负（在下）' : '零（压线）');
        label(ctx, sign, X(cxv) + 8, Y(9) + 6, yv > 0 ? C.named('orange') : (yv < 0 ? C.named('blue') : C.named('gray')), { size: 11.5, weight: 700 });
        ctx.beginPath();
        ctx.arc(X(cxv), Y(yv), 5, 0, Math.PI * 2);
        ctx.fillStyle = C.accent2;
        ctx.fill();
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ro.set('光标 x', fmt(cxv, 1));
        ro.set('式子值 y', fmt(yv, 2));
      } else {
        ro.set('光标 x', '—');
        ro.set('式子值 y', '—');
      }
      ro.set('Δ', fmt(delta, 0) + (delta > 0 ? '（两根）' : (delta === 0 ? '（相切）' : '（无交点）')));

      /* 幕 4：解集文字 */
      const a4 = appear(3);
      if (a4 > 0) {
        ctx.save();
        ctx.globalAlpha = a4;
        ctx.fillStyle = C.soft;
        ctx.fillRect(X(G.x0), Y(9) + 14, X(G.x1) - X(G.x0), 26);
        let txt;
        if (r) {
          txt = '> 0：x < ' + fmt(r[0], 1) + ' 或 x > ' + fmt(r[1], 1)
            + '    |    < 0：' + fmt(r[0], 1) + ' < x < ' + fmt(r[1], 1);
        } else if (delta < 0) {
          txt = '整条抛物线在轴上方：> 0 恒成立（全体实数），< 0 无解';
        } else {
          txt = '相切：除切点外 > 0 恒成立';
        }
        label(ctx, txt, X(G.x0) + 10, Y(9) + 32, C.fg, { size: 12.5, weight: 700 });
        ctx.restore();
        ro.set('> 0 的解集', r ? 'x < ' + fmt(r[0], 1) + ' 或 x > ' + fmt(r[1], 1) : (delta < 0 ? '全体实数' : '除切点外全部'));
      }

      /* 右侧图例 / 口诀面板 */
      {
        const px0 = G.panelX;
        const pw = W - px0 - 8;
        ctx.save();
        ctx.fillStyle = C.soft;
        ctx.fillRect(px0, 22, pw, H - 88);
        ctx.strokeStyle = C.grid;
        ctx.strokeRect(px0, 22, pw, H - 88);
        const line = (txt, yy, col, size, weight) => label(ctx, txt, px0 + 10, yy, col || C.fg, { size: size || 11.5, weight: weight || 400 });
        line('色例', 40, C.axis, 11);
        line('■ 海平面以上（正）', 60, C.named('orange'), 11.5);
        line('■ 海平面以下（负）', 78, C.named('blue'), 11.5);
        line('■ 恰在根上（零）', 96, C.named('gray'), 11.5);
        line('——', 114, C.grid, 11.5);
        line('开口向上（a > 0）', 134, C.axis, 11);
        line('> 0 取两根之外', 154, C.fg, 12, 600);
        line('< 0 取两根之间', 174, C.fg, 12, 600);
        line('——', 192, C.grid, 11.5);
        if (r) {
          line('两根：' + fmt(r[0], 1) + ' 与 ' + fmt(r[1], 1), 212, C.ok, 11.5, 600);
        } else if (delta < 0) {
          line('Δ < 0：不穿轴', 212, C.named('purple'), 11.5, 600);
          line('> 0 恒成立', 232, C.named('purple'), 11.5, 600);
        } else {
          line('Δ = 0：骑在轴上', 212, C.named('purple'), 11.5, 600);
        }
        ctx.restore();
      }

      /* 拖拽提示 */
      if (a3 > 0 || i > 2) {
        label(ctx, '光标可拖', X(G.x1) + 6, Y(0) + 4, C.accent2, { size: 10.5 });
      }
    },
  });

  /* 拖扫描光标 */
  st.cv.canvas.style.cursor = 'default';
  bindPointer(st.cv.canvas, {
    pick(x0) {
      if (st.scene < 2) return null;
      const [lx] = st.toLogical(x0, 0);
      const cxv = scanX === null
        ? G.x0 + (G.x1 - G.x0) * clamp(st.scene > 2 ? 1 : st.t, 0, 1)
        : scanX;
      return Math.abs(lx - X(cxv)) < 16 ? 'cursor' : null;
    },
    move(id, x0) {
      if (id !== 'cursor') return;
      st.play(false);
      const [lx] = st.toLogical(x0, 0);
      scanX = clamp((lx - G.cx) / G.s + G.x0, G.x0, G.x1);
      st.redraw();
    },
  });

  host.appendChild(ro.box);
  return { slidersBox: sliders.box, destroy: st.stop };
}
