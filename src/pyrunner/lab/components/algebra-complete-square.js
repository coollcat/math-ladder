/* =========================================================================
 * lab 组件：algebra-complete-square —— 配方法的几何动画（3B1B 式分幕演示）
 * -------------------------------------------------------------------------
 * 用法（第 50 课课文 lab 围栏，fence 语言写 lab）：
 *
 *   { "type": "algebra-complete-square", "title": "配方法：补上那个角",
 *     "b": 2, "c": 24 }
 *
 * 字段：b  一次项系数（x^2 + bx = c 的 b），0..8，默认 2
 *       c  等号右边的常数（x^2 + bx = c 的 c），0..24，默认 24
 *
 * 六幕动画：
 *   1. 一块边长 x 的正方形（面积 x^2）
 *   2. 右边、下边各贴一条宽 b/2 的窄臂（面积 bx）
 *   3. 右下角缺了一块 (b/2)^2 —— 这就是要补的角
 *   4. 绿色小块飞入补角（对应代数里「两边同加 (b/2)^2」）
 *   5. 散件整装成大正方形：(x + b/2)^2 = c + (b/2)^2
 *   6. 开方：x + b/2 = ±√(c + (b/2)^2)，求根公式浮现
 *
 * 可拖：拖右臂的右边缘直接改 b（同步滑块）；也可以直接拖两个滑块。
 * ========================================================================= */

import {
  themeColors, buildSliders, mergeSpec, setSliderRow, bindPointer, label, fmt, clamp,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'b', label: '一次项系数 b', min: 0, max: 8, step: 1, value: 2 },
  { name: 'c', label: '右边常数 c', min: 0, max: 24, step: 1, value: 24 },
];

export default function render(host, spec) {
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => st.redraw());
  const B = () => sliders.state.b;
  const C = () => sliders.state.c;
  /* 几何量：x 取正根（负根在第 6 幕给出） */
  const X = () => {
    const b = B();
    const c = C();
    return (-b + Math.sqrt(b * b + 4 * c)) / 2;
  };

  const L = { ox: 0, oy: 0, s: 1 };

  /* 几何块占左侧（约 46%），右侧留给代数账本；纵向尽量撑满又不贴底
     （底两行要放两根答案）。scale 有上限，防止 b=c=0 附近冒出巨块。 */
  function layout(W, H) {
    const x = Math.max(X(), 0.001);
    const sq = x + B() / 2;
    L.s = Math.min((W * 0.46 - 30) / Math.max(sq, 1), (H - 118) / Math.max(sq, 1), 88);
    L.ox = 26;
    L.oy = 42;
  }
  const px = (v) => L.ox + v * L.s;
  const py = (v) => L.oy + v * L.s;

  function fillRect(ctx, x, y, w, h, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  const st = makeStage(host, {
    height: 320,
    aspect: 9 / 16,
    scenes: [
      { caption: '第 1 幕：解方程 x² + bx = c。先在纸上画一块边长 x 的正方形——它的面积是 x²。', dur: 3 },
      { caption: '第 2 幕：bx 这条「臂」分成两半：一半竖贴在右边，一半横贴在下边，各宽 b/2。', dur: 3.4 },
      { caption: '第 3 幕：右下角空出一块 (b/2)² 的缺口——这个角不补上，图形就合不拢。', dur: 3 },
      { caption: '第 4 幕：把绿色小块补进缺口。对应到代数，就是「两边同加 (b/2)²」——天平两边加同量的砝码。', dur: 3.6 },
      { caption: '第 5 幕：散件整装了！三块拼成一个大正方形，边长 x + b/2，面积 (x + b/2)²。', dur: 3.6 },
      { caption: '第 6 幕：整装的正方形可以直接开方：x + b/2 = ±√(c + (b/2)²)。求根公式，到手。', dur: 4.2 },
    ],
    draw({ ctx, W, H, C: TC, i, t }) {
      const C0 = themeColors();
      const b = B();
      const c = C();
      const x = Math.max(X(), 0);
      const half = b / 2;
      const gap = half * half;
      const root = Math.sqrt(c + gap);
      layout(W, H);
      const sq = x + half;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = TC.bg;
      ctx.fillRect(0, 0, W, H);

      label(ctx, '第 ' + (i + 1) + ' / 6 幕', W - 10, 20, TC.axis, { size: 11, align: 'right' });

      /* ---- 代数账本（右侧，逐行淡入） ---- */
      const ax = px(sq) + 30;
      let ay = 60;
      const lines = [];
      lines.push({ e: 0, txt: '方程 x² + ' + fmt(b, 0) + 'x = ' + fmt(c, 0) });
      if (i >= 0) lines.push({ e: 0, txt: '正方形 x² = ' + fmt(x * x, 1) });
      if (i >= 1) lines.push({ e: 1, txt: '两臂 bx = ' + fmt(b * x, 1) });
      if (i >= 1) lines.push({ e: 1, txt: '合计 = ' + fmt(c, 1) + '（就是 c）' });
      if (i >= 2) lines.push({ e: 2, txt: '缺口 (b/2)² = ' + fmt(gap, 1) });
      if (i >= 3) lines.push({ e: 3, txt: '两边同加 (b/2)²' });
      if (i >= 4) lines.push({ e: 4, txt: '(x + b/2)² = c + (b/2)²' });
      if (i >= 4) lines.push({ e: 4, txt: '= ' + fmt(c, 0) + ' + ' + fmt(gap, 1) + ' = ' + fmt(c + gap, 1) });
      if (i >= 5) lines.push({ e: 5, txt: 'x + b/2 = ±√' + fmt(c + gap, 1) });
      if (i >= 5) lines.push({ e: 5, txt: 'x₁ = -b/2 + √ = ' + fmt(-half + root, 1) });
      if (i >= 5) lines.push({ e: 5, txt: 'x₂ = -b/2 - √ = ' + fmt(-half - root, 1) });
      lines.forEach((ln) => {
        const tt = i > ln.e ? 1 : (i < ln.e ? 0 : t);
        if (tt <= 0) return;
        label(ctx, ln.txt, ax, ay, C0.fg, { size: 12.5, weight: i === ln.e ? 600 : 400 });
        ay += 21;
      });

      /* 账本下方补「配方法三步」卡：右上那块空白长内容，不长白 */
      if (i >= 1) {
        label(ctx, '配方法三步', ax, ay + 12, C0.axis, { size: 11, weight: 600 });
        label(ctx, '① 移项：常数挪到等号右边', ax, ay + 32, C0.fg, { size: 11.5 });
        label(ctx, '② 补角：两边同加 (b/2)²', ax, ay + 52, C0.fg, { size: 11.5 });
        label(ctx, '③ 收方开方：一个式子出两根', ax, ay + 72, C0.fg, { size: 11.5 });
      }

      /* ---- 几何主体 ---- */
      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      /* 1. 正方形 x×x（从中心生长） */
      const a1 = appear(0);
      ctx.save();
      const gx = px(x / 2);
      const gy = py(x / 2);
      const k = Math.max(a1, 0.0001);
      ctx.translate(gx, gy);
      ctx.scale(k, k);
      ctx.translate(-gx, -gy);
      fillRect(ctx, px(0), py(0), x * L.s, x * L.s, C0.named('blue'), 0.85);
      ctx.strokeStyle = C0.bg;
      ctx.lineWidth = 2;
      ctx.strokeRect(px(0), py(0), x * L.s, x * L.s);
      ctx.restore();
      if (a1 > 0.3) {
        label(ctx, 'x', gx, gy + 5, 'C0.bg', { size: 16, weight: 700, align: 'center' });
        label(ctx, 'x² = ' + fmt(x * x, 1), gx, gy + 24, C0.bg, { size: 12, align: 'center' });
      }
      label(ctx, 'x', px(0) - 10, py(x / 2) + 4, C0.fg, { size: 12, align: 'right' });

      /* 2. 两条窄臂（各宽 b/2） */
      const a2 = appear(1);
      if (b > 0 && a2 > 0) {
        const w = half * a2 * L.s;
        fillRect(ctx, px(x), py(0), w, x * L.s, C0.named('orange'), 0.8);
        ctx.strokeStyle = C0.bg;
        ctx.lineWidth = 2;
        ctx.strokeRect(px(x), py(0), w, x * L.s);
        fillRect(ctx, px(0), py(x), x * L.s, w, C0.named('orange'), 0.8);
        ctx.strokeRect(px(0), py(x), x * L.s, w);
        if (a2 > 0.55) {
          label(ctx, 'b/2', px(x) + w / 2, py(x) - 6, C0.bg, { size: 11, weight: 700, align: 'center' });
          label(ctx, 'bx', px(x / 2), py(x + half / 2) + 4, C0.bg, { size: 12, weight: 700, align: 'center' });
        }
      }

      /* 3. 缺口虚线框 */
      const a3 = appear(2);
      if (a3 > 0 && half > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.65 * a3;
        ctx.strokeStyle = C0.named('red');
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(px(x), py(x), half * L.s, half * L.s);
        ctx.restore();
        if (a3 > 0.5) {
          label(ctx, '?', px(x + half / 2), py(x + half / 2) + 7, C0.named('red'), { size: 20, weight: 700, align: 'center' });
        }
      }

      /* 4. 绿色补角从左侧飞入 */
      const a4 = appear(3);
      if (a4 > 0 && half > 0) {
        const from = px(0) - half * L.s * 1.8;
        const gx2 = from + (px(x) - from) * a4;
        fillRect(ctx, gx2, py(x), half * L.s, half * L.s, C0.named('green'), 0.85);
        ctx.strokeStyle = C0.bg;
        ctx.lineWidth = 2;
        ctx.strokeRect(gx2, py(x), half * L.s, half * L.s);
        if (a4 > 0.6) {
          label(ctx, '(b/2)²', px(x + half / 2), py(x + half / 2) + 5, C0.bg, { size: 12, weight: 700, align: 'center' });
        }
      }

      /* 5. 大正方形外框描出 */
      const a5 = appear(4);
      if (a5 > 0) {
        ctx.save();
        ctx.strokeStyle = C0.fg;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -(1 - a5) * 48;
        ctx.strokeRect(px(0), py(0), sq * L.s, sq * L.s);
        ctx.restore();
        if (a5 > 0.6) {
          label(ctx, '(x + b/2)² = ' + fmt(c + gap, 1), px(sq / 2), Math.min(py(sq) + 22, H - 62), C0.fg, { size: 13, weight: 700, align: 'center' });
        }
      }

      /* 6. 开方与两根 */
      const a6 = appear(5);
      if (a6 > 0) {
        ctx.save();
        ctx.strokeStyle = C0.named('purple');
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px(sq) + 8, py(0));
        ctx.lineTo(px(sq) + 8, py(sq));
        ctx.stroke();
        ctx.restore();
        label(ctx, '√' + fmt(c + gap, 1) + ' = ' + fmt(root, 1), px(sq) + 14, py(sq / 2) + 4, C0.named('purple'), { size: 12, weight: 600 });
        label(ctx, 'x₁ = ' + fmt(-half + root, 1) + '（就是几何里这块正方形的边长）', L.ox, H - 46, C0.ok, { size: 12.5, weight: 600 });
        label(ctx, 'x₂ = ' + fmt(-half - root, 1) + '（负根：求根公式的减分支）', L.ox, H - 24, C0.named('gray'), { size: 12.5, weight: 600 });
      }

      label(ctx, 'b = ' + fmt(b, 0) + '，c = ' + fmt(c, 0) + '  →  x² + ' + fmt(b, 0) + 'x − ' + fmt(c, 0) + ' = 0', L.ox, H - 12, C0.axis, { size: 11.5 });
    },
  });

  /* 拖右臂右边缘 → 改 b（能拖的就要能拖） */
  bindPointer(st.cv.canvas, {
    pick(x0, y0) {
      const x = X();
      const edge = px(x + Math.max(B() / 2, 0));
      if (Math.abs(x0 - edge) < 14 && y0 > py(0) - 8 && y0 < py(x) + 8) return 'arm';
      return null;
    },
    move(id, x0) {
      if (id !== 'arm') return;
      const w = (x0 - L.ox) / L.s - X();
      const nb = clamp(Math.round(2 * w), 0, 8);
      if (nb !== B()) {
        setSliderRow(sliders, 0, nb, 0, 'b');
        st.redraw();
      }
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}
