/* =========================================================================
 * lab 组件：bezier-casteljau —— de Casteljau 套娃：Bezier 曲线为什么可控
 * -------------------------------------------------------------------------
 * 用法（第 64 章 Bezier 课 lab 围栏）：
 *
 *   { "type": "bezier-casteljau", "title": "de Casteljau：反复取点的套娃" }
 *
 * 字段：degree  2 = 二次（3 个控制点）或 3 = 三次（4 个控制点），默认 3
 *       t       初始参数，0..1，默认 0.35（可用 spec.sliders 覆盖量程/初值）
 *
 * 五幕（3Blue1Brown 式分幕，字幕在画布下方）：
 *   1. 控制点 + 控制多边形 + 凸包：曲线被关在笼子里
 *   2. 第一层：每根线段上按同一个 t 取一个点
 *   3. 第二层：把新点连起来，再取一次 t 点（套娃开始收缩）
 *   4. 最后一层：收缩成一个点——让 t 从 0 滑到 1，这个点扫出的轨迹就是曲线
 *   5. 可控性：直接把控制点拖走，端点纹丝不动、曲线平滑跟随；峰值够不到最高控制点
 *
 * 设计取舍：
 *   - 参数 t 只有一个源头（slider）。播放第 2–4 幕时由幕进度驱动并把值写回
 *     滑块行（setSliderRow）；用户一旦拖滑块就切到手动值，直到换幕才交还。
 *   - 拖动控制点用 bindPointer + st.toLogical() 反演 trim 缩放（见 algebra-stage
 *     头部注释的「看得见抓不起」坑）；trim 开启让窄屏也能自动放大内容。
 *   - 减少动效用户由 makeStage 直接给终态（t=1），并禁用播放按钮。
 * ========================================================================= */

import {
  buildSliders, mergeSpec, setSliderRow, buildSegmented, bindPointer,
  buildReadout, label, fmt, clamp, polyline,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 't', label: '参数 t', min: 0, max: 1, step: 0.01, value: 0.35 },
];

/* 控制点预设：画布归一化坐标，y 向上（1 = 画布顶）。曲线都是上拱的拱形。 */
const PRESETS = {
  2: [[0.10, 0.22], [0.50, 0.90], [0.90, 0.22]],
  3: [[0.06, 0.20], [0.30, 0.92], [0.70, 0.92], [0.94, 0.20]],
};

const lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* de Casteljau 全套：返回每一层的点表（layers[0] = 控制点，最后一层只剩 1 个点） */
function dcLayers(pts, t) {
  const layers = [pts.map((p) => [p[0], p[1]])];
  let cur = layers[0];
  while (cur.length > 1) {
    const nxt = [];
    for (let k = 0; k < cur.length - 1; k += 1) nxt.push(lerpPt(cur[k], cur[k + 1], t));
    layers.push(nxt);
    cur = nxt;
  }
  return layers;
}

/* 凸包（Andrew 单调链）：控制点被拖进内部时也能给出正确的包，而不是硬连一圈 */
function convexHull(pts) {
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (p.length <= 2) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (arr) => {
    const st = [];
    arr.forEach((q) => {
      while (st.length >= 2 && cross(st[st.length - 2], st[st.length - 1], q) <= 0) st.pop();
      st.push(q);
    });
    return st;
  };
  const lower = half(p);
  const upper = half(p.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export default function render(host, spec) {
  const degree0 = spec.degree === 2 ? 2 : 3;
  let degree = degree0;
  let pts = PRESETS[degree].map((p) => p.slice());
  /* manualT = 用户拖滑块后的固定参数；null = 由当前幕的播放进度驱动 */
  let manualT = null;

  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, (stx) => {
    manualT = stx.t;
    st.redraw();
  });

  const ro = buildReadout({
    t: '—',
    '曲线上的点 B(t)': '—',
    '曲线峰值 y': '—',
    '层数': '—',
  });

  /* 画布内区域（逻辑像素）：世界坐标 [0,1]×[0,1] 映射进去，y 向上 */
  const PR = { x0: 0, y0: 0, w: 1, h: 1 };
  function layout(W, H) {
    const l = 32;
    const r = 26;
    const tp = 20;
    const b = 40;
    PR.x0 = l;
    PR.y0 = tp;
    PR.w = Math.max(W - l - r, 60);
    PR.h = Math.max(H - tp - b, 60);
  }
  const X = (x) => PR.x0 + x * PR.w;
  const Y = (y) => PR.y0 + (1 - y) * PR.h;

  /* 曲线采样（直接对最终层取点，等价于 Bernstein 求和） */
  function curvePoints(n) {
    const out = [];
    for (let i = 0; i <= n; i += 1) {
      const s = i / n;
      out.push(dcLayers(pts, s)[pts.length - 1][0]);
    }
    return out;
  }
  function peakY() {
    let best = pts[0][1];
    for (let i = 0; i <= 200; i += 1) {
      const p = dcLayers(pts, i / 200)[pts.length - 1][0];
      if (p[1] > best) best = p[1];
    }
    return best;
  }

  const st = makeStage(host, {
    height: 360,
    aspect: null,              /* 固定高度：窄屏横向铺满，不给 9/16 再压一层 */
    onScene: () => { manualT = null; },
    scenes: [
      { caption: '第 1 幕：几个控制点被折线串成「控制多边形」；虚线包出凸包——曲线永远被关在这个笼子里。', dur: 3.2 },
      { caption: '第 2 幕：第一层插值——每根线段上按同一个 t 取一个点（t=0 靠左端，t=1 靠右端）。', dur: 4 },
      { caption: '第 3 幕：第二层——把新点再连起来，继续按同一个 t 取点；套娃每套一层就少一个点。', dur: 4 },
      { caption: '第 4 幕：最后一层收缩成一个点。让 t 从 0 滑到 1，这个点扫出的轨迹就是 Bezier 曲线。', dur: 5 },
      { caption: '第 5 幕：直接拖控制点——端点纹丝不动，曲线平滑跟随；峰值也够不到最高控制点（中间点只按权重贡献）。', dur: 3.6 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      layout(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      const n = pts.length - 1;                 /* 曲线次数 */
      /* 参数 t 的唯一出处：手动优先，否则 1–3 幕由幕进度驱动 */
      let tau;
      if (manualT !== null) tau = manualT;
      else if (i >= 1 && i <= 3) tau = t;
      else tau = clamp(sliders.state.t, 0, 1);
      if (manualT === null && i >= 1 && i <= 3) setSliderRow(sliders, 0, Math.round(tau * 100) / 100, 2, 't');

      /* 背景网格（0.1 一格），同时给 trim 一个稳定的内容框 */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 10; k += 1) {
        ctx.moveTo(Math.round(X(k / 10)) + 0.5, Y(0));
        ctx.lineTo(Math.round(X(k / 10)) + 0.5, Y(1));
        ctx.moveTo(X(0), Math.round(Y(k / 10)) + 0.5);
        ctx.lineTo(X(1), Math.round(Y(k / 10)) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(X(0), Y(1), X(1) - X(0), Y(0) - Y(1));

      const appear = (k) => (i > k ? 1 : (i < k ? 0 : t));

      /* ---- 凸包（幕 1 起常驻，淡蓝填充） ---- */
      const aHull = appear(0);
      if (aHull > 0) {
        const hull = convexHull(pts);
        ctx.save();
        ctx.globalAlpha = 0.85 * aHull;
        ctx.beginPath();
        hull.forEach((p, k) => {
          if (k === 0) ctx.moveTo(X(p[0]), Y(p[1]));
          else ctx.lineTo(X(p[0]), Y(p[1]));
        });
        ctx.closePath();
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.10 * aHull;
        ctx.fill();
        ctx.globalAlpha = 0.85 * aHull;
        ctx.strokeStyle = C.accent;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
        label(ctx, '凸包', X(hull[0][0]) + 6, Y(hull[0][1]) + 14, C.accent, { size: 10.5 });
      }

      /* ---- 控制多边形（虚线） ---- */
      const poly = pts.map((p) => [X(p[0]), Y(p[1])]);
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * aHull;
      polyline(ctx, poly, C.named('gray'), 1.6, [6, 5]);
      ctx.restore();

      /* ---- 曲线：前期只给幽灵，第 4 幕起正式描出 ---- */
      const cp = curvePoints(160);
      const scr = cp.map((p) => [X(p[0]), Y(p[1])]);
      if (i >= 3) {
        /* 轨迹：t∈[0,τ] 的那一段加粗（点扫过的地方留下墨迹） */
        const upto = Math.max(2, Math.round(160 * clamp(tau, 0, 1)));
        polyline(ctx, scr.slice(0, upto + 1), C.accent2, 3);
        polyline(ctx, scr, C.accent2, 1.2);
      } else if (i >= 1) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        polyline(ctx, scr, C.accent2, 2);
        ctx.restore();
      }

      /* ---- 各层套娃 ---- */
      const layers = dcLayers(pts, tau);
      const maxLevel = i >= 3 ? n : Math.min(i, n);
      const levelColors = ['blue', 'purple', 'teal', 'orange'];
      for (let L = 1; L <= maxLevel; L += 1) {
        const row = layers[L];
        const color = C.named(levelColors[(L - 1) % levelColors.length]);
        const alpha = i === L ? t : 1;
        ctx.save();
        ctx.globalAlpha = 0.9 * (0.35 + 0.65 * alpha);
        if (row.length > 1) polyline(ctx, row.map((p) => [X(p[0]), Y(p[1])]), color, 1.8);
        row.forEach((p) => {
          ctx.beginPath();
          ctx.arc(X(p[0]), Y(p[1]), 3.6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        });
        ctx.restore();
        if (row.length > 1 && i >= L) {
          label(ctx, '第 ' + L + ' 层', X(row[0][0]) - 4, Y(row[0][1]) - 8, color,
            { size: 10, align: 'right' });
        }
      }

      /* ---- 当前 t 的落点（最后一个套娃点） ---- */
      const bp = layers[n][0];
      const showPoint = i >= Math.min(n, 2) || manualT !== null;
      if (showPoint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(X(bp[0]), Y(bp[1]), 9, 0, Math.PI * 2);
        ctx.fillStyle = C.bad;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(X(bp[0]), Y(bp[1]), 5.4, 0, Math.PI * 2);
        ctx.fillStyle = C.bad;
        ctx.fill();
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        label(ctx, 'B(t)', X(bp[0]) + 9, Y(bp[1]) - 8, C.bad, { size: 11, weight: 700 });
      }

      /* ---- 控制点（白心圆，可拖） ---- */
      pts.forEach((p, k) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(X(p[0]), Y(p[1]), 6.5, 0, Math.PI * 2);
        ctx.fillStyle = C.bg;
        ctx.fill();
        ctx.strokeStyle = i === 4 ? C.ok : C.fg;
        ctx.lineWidth = i === 4 ? 2.6 : 2;
        ctx.stroke();
        ctx.restore();
        label(ctx, 'P' + k, X(p[0]) + 9, Y(p[1]) + 4, C.fg, { size: 11, weight: 600 });
      });

      /* ---- 第 5 幕：峰值 vs 最高控制点 ---- */
      if (i >= 4) {
        const py = peakY();
        const topCtl = Math.max(...pts.map((p) => p[1]));
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = C.named('gray');
        ctx.beginPath();
        ctx.moveTo(X(0), Y(topCtl));
        ctx.lineTo(X(1), Y(topCtl));
        ctx.stroke();
        ctx.strokeStyle = C.ok;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(py));
        ctx.lineTo(X(1), Y(py));
        ctx.stroke();
        ctx.restore();
        label(ctx, '最高控制点 y = ' + fmt(topCtl, 2), X(0) + 4, Y(topCtl) - 5, C.named('gray'), { size: 10.5 });
        label(ctx, '曲线峰值 y = ' + fmt(py, 2), X(1) - 4, Y(py) + 14, C.ok, { size: 10.5, align: 'right', weight: 600 });
        label(ctx, '拖动白色控制点试试 →', X(0.5), Y(0) + 20, C.ok, { size: 11.5, align: 'center', weight: 600 });
      }

      /* ---- 读数 ---- */
      ro.set('t', fmt(tau, 2));
      ro.set('曲线上的点 B(t)', '(' + fmt(bp[0], 2) + ', ' + fmt(bp[1], 2) + ')');
      ro.set('曲线峰值 y', fmt(peakY(), 3));
      ro.set('层数', (n + 1) + ' 个控制点 → ' + n + ' 层插值');
      label(ctx, 't = ' + fmt(tau, 2) + '　' + (n + 1) + ' 个控制点 / ' + n + ' 层套娃',
        X(0), Y(0) + 14, C.axis, { size: 10.5 });
    },
  });

  /* 二次 / 三次切换：换一组预设控制点（拖乱的点不跨次数复用，避免越界） */
  const seg = buildSegmented(
    [
      { label: '二次（3 点）', value: 2 },
      { label: '三次（4 点）', value: 3 },
    ],
    degree,
    (v) => {
      degree = v;
      pts = PRESETS[degree].map((p) => p.slice());
      st.redraw();
    },
  );
  host.insertBefore(seg, st.box);

  /* ---- 拖控制点：pick 半径 15px，坐标经 st.toLogical 反演 trim ---- */
  st.cv.canvas.style.cursor = 'default';
  const pickPoint = (lx, ly) => {
    for (let k = 0; k < pts.length; k += 1) {
      if (Math.hypot(lx - X(pts[k][0]), ly - Y(pts[k][1])) < 15) return k;
    }
    return null;
  };
  bindPointer(st.cv.canvas, {
    pick(x, y) {
      const [lx, ly] = st.toLogical(x, y);
      return pickPoint(lx, ly);
    },
    hover(x, y) {
      const [lx, ly] = st.toLogical(x, y);
      st.cv.canvas.style.cursor = pickPoint(lx, ly) !== null ? 'grab' : 'default';
    },
    leave() { st.cv.canvas.style.cursor = 'default'; },
    move(id, x, y) {
      const [lx, ly] = st.toLogical(x, y);
      pts[id] = [
        clamp((lx - PR.x0) / PR.w, 0, 1),
        clamp(1 - (ly - PR.y0) / PR.h, 0, 1),
      ];
      st.cv.canvas.style.cursor = 'grabbing';
      st.redraw();
    },
    up() { st.cv.canvas.style.cursor = 'grab'; },
  });

  host.appendChild(ro.box);
  return { slidersBox: sliders.box, destroy: st.stop };
}
