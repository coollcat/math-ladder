/* =========================================================================
 * lab 组件：algebra-dots-to-curve —— 折线加密成曲线（3B1B 式分幕）
 * -------------------------------------------------------------------------
 * 用法（第 12 课课文 lab 围栏）：
 *
 *   { "type": "algebra-dots-to-curve", "title": "体温单：从四个点到一条曲线" }
 *
 * 五幕动画：
 *   1. 四颗钉子：体温单的四个数对 (8,36.7) (12,37.4) (16,38.2) (20,37.0)
 *   2. 连成折线：相邻点用线段串起——折线是「助读桥」
 *   3. 加密测量：2 小时一次 → 1 小时一次 → 一刻钟一次，折线一路变密
 *   4. 棱角消失：折线贴住一条光滑的曲线
 *   5. 那条曲线：加密到极限，助读桥变成体温的「真面目」
 *
 * 可拖：拖最后一个测量点（20 点那颗）上下移动——换一张记录单，看曲线怎么变形。
 * ========================================================================= */

import { themeColors, bindPointer, label, fmt, clamp, polyline } from '../core.js';
import { makeStage } from './algebra-stage.js';

const P0 = 36.7;                    /* 8 点的基准体温 */
const V12 = 37.4;                   /* 12 点与 16 点的读数（固定；拖 20 点只换末端） */
const V16 = 38.2;
let w = 37.0;                        /* 20 点的体温（可拖） */
/* 真曲线口径：f(u) = P0 + A1·sin(πu) + A2·sin(2πu) + D·u，
   A1/A2/D 由四个读数实时解出——拖动 20 点后曲线仍严丝合缝过全部四个点：
   u=1/3 给 37.4、u=2/3 给 38.2、u=1 给 w。 sin(π/3) 在两处取值相同，
   于是 A1+A2、A1−A2 各自可解。 */
const S3 = Math.sin(Math.PI / 3);
function coeffs() {
  const D = w - P0;
  const p = (V12 - P0) - D / 3;
  const q = (V16 - P0) - (2 * D) / 3;
  return { A1: (p + q) / (2 * S3), A2: (p - q) / (2 * S3), D };
}
const f = (u) => {
  const { A1, A2, D } = coeffs();
  return P0 + A1 * Math.sin(Math.PI * u) + A2 * Math.sin(2 * Math.PI * u) + D * u;
};
const hour = (tt) => (tt - 8) / 12;  /* 时刻 → u */

export default function render(host, spec) {
  const G = { cx: 0, cy: 0, s: 1 };
  const T0 = 8, T1 = 20;
  function fit(W, H) {
    G.s = Math.min((W - 84) / (T1 - T0), (H - 96) / 2.4);
    G.cx = 62;
    G.cy = H - 58;
  }
  const X = (v) => G.cx + (v - T0) * G.s;
  const Y = (v) => G.cy - (v - 36.4) * G.s;

  const st = makeStage(host, {
    height: 320,
    aspect: 16 / 9,
    scenes: [
      { caption: '第 1 幕：护士的体温单——四组读数钉成四颗钉子：(8点,36.7) (12点,37.4) (16点,38.2) (20点,37.0)。', dur: 3.6 },
      { caption: '第 2 幕：相邻的钉子用线段串起来——折线是表格与图像之间的「助读桥」。', dur: 3.2 },
      { caption: '第 3 幕：加密测量：两小时一次 → 一小时一次 → 一刻钟一次，钉子越来越密。', dur: 4.2 },
      { caption: '第 4 幕：棱角消失了——再密的折线也认得出同一条光滑曲线。', dur: 3.2 },
      { caption: '第 5 幕：加密到极限，助读桥变成了那条曲线：体温随时刻的连续变化。', dur: 3.4 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      fit(W, H);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      /* 坐标轴与网格 */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let tt = T0; tt <= T1; tt += 2) {
        ctx.moveTo(X(tt) + 0.5, Y(36.4));
        ctx.lineTo(X(tt) + 0.5, Y(38.8));
      }
      for (let g = 36.6; g <= 38.6; g += 0.4) {
        ctx.moveTo(X(T0), Y(g) + 0.5);
        ctx.lineTo(X(T1), Y(g) + 0.5);
      }
      ctx.stroke();
      ctx.restore();
      polyline(ctx, [[X(T0), Y(36.4)], [X(T1), Y(36.4)]], C.axis, 1.4);
      polyline(ctx, [[X(T0), Y(36.4)], [X(T0), Y(38.8)]], C.axis, 1.4);
      for (let tt = T0; tt <= T1; tt += 2) {
        label(ctx, tt + ' 点', X(tt), Y(36.4) + 16, C.axis, { size: 10.5, align: 'center' });
      }
      for (let g = 36.8; g <= 38.4; g += 0.4) {
        label(ctx, g.toFixed(1), X(T0) - 6, Y(g) + 4, C.axis, { size: 10.5, align: 'right' });
      }
      label(ctx, '时刻 →', X(T1) + 2, Y(36.4) + 16, C.axis, { size: 10.5 });
      label(ctx, '体温', X(T0) - 4, Y(38.8) - 8, C.axis, { size: 10.5 });

      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      /* 幕 1：依次钉出四个点 */
      const a1 = appear(0);
      const count = a1 <= 0 ? 0 : Math.max(Math.round(a1 * 4), 1);
      const pts = [];
      for (let k = 0; k < count; k += 1) {
        const tt = [8, 12, 16, 20][k];
        pts.push([X(tt), Y(f(hour(tt)))]);
      }
      if (a1 > 0) {
        pts.forEach((p, k) => {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 5.5, 0, Math.PI * 2);
          ctx.fillStyle = C.named('blue');
          ctx.fill();
          ctx.strokeStyle = C.bg;
          ctx.lineWidth = 2;
          ctx.stroke();
          const tt = [8, 12, 16, 20][k];
          label(ctx, '(' + tt + ', ' + fmt(f(hour(tt)), 1) + ')', p[0] + 9, p[1] - 7, C.named('blue'), { size: 11, weight: 600 });
        });
      }

      /* 幕 2：折线（原始 4 点） */
      const a2 = appear(1);
      if (a2 > 0) {
        const four = [0, 1, 2, 3].map((k) => {
          const tt = [8, 12, 16, 20][k];
          return [X(tt), Y(f(hour(tt)))];
        });
        const upto = clamp(a2 * 3, 0, 3);
        const full = Math.floor(upto);
        const seg = [];
        for (let k = 0; k <= full && k < 4; k += 1) seg.push(four[k]);
        if (full < 3) {
          const q0 = four[full];
          const q1 = four[full + 1];
          seg.push([q0[0] + (q1[0] - q0[0]) * (upto - full), q0[1] + (q1[1] - q0[1]) * (upto - full)]);
        }
        polyline(ctx, seg, C.accent2, 2.2);
      }

      /* 幕 3：加密动画（4 → 8 → 21 次测量） */
      const a3 = appear(2);
      let n = 4;
      if (a3 > 0) {
        const phase = clamp(a3 * 1.05, 0, 1);
        const nReal = phase < 0.5 ? Math.round(4 + (8 - 4) * (phase / 0.5)) : Math.round(8 + (13) * ((phase - 0.5) / 0.5));
        n = nReal;
        const seg = [];
        for (let k = 0; k < n; k += 1) {
          const tt = T0 + ((T1 - T0) * k) / (n - 1);
          seg.push([X(tt), Y(f(hour(tt)))]);
        }
        /* 测量点本身仍在线段顶点（加密 = 多钉几颗钉子） */
        polyline(ctx, seg, C.accent2, 1.8);
        seg.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
          ctx.fillStyle = C.accent2;
          ctx.fill();
        });
        label(ctx, '已测 ' + n + ' 次', W - 76, 30, C.fg, { size: 12.5, weight: 700 });
      }

      /* 幕 4/5：真曲线显形 */
      const a45 = appear(3);
      if (a45 > 0) {
        const curve = [];
        for (let k = 0; k <= 120; k += 1) {
          const tt = T0 + ((T1 - T0) * k) / 120;
          curve.push([X(tt), Y(f(hour(tt)))]);
        }
        polyline(ctx, curve, C.named('blue'), 3, i >= 4 ? undefined : [1, 0]);
        if (i >= 4) {
          label(ctx, '体温曲线：连续的变化', X(T0) + 8, Y(38.55), C.named('blue'), { size: 12, weight: 600 });
        }
      }

      /* 可拖的第 4 个点：高亮圈 + 提示 */
      const p4 = [X(20), Y(f(hour(20)))];
      ctx.save();
      ctx.strokeStyle = C.named('red');
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(p4[0], p4[1], 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      label(ctx, '拖我改数据', p4[0] - 96, p4[1] - 14, C.named('red'), { size: 11, weight: 600 });
      if (i >= 4) {
        label(ctx, '钉子无穷密 → 折线就是这条曲线', X(T0) + 8, 20, C.fg, { size: 12, weight: 700 });
      }
    },
  });

  /* 拖第 4 个测量点（20 点的体温） */
  bindPointer(st.cv.canvas, {
    pick(x0, y0) {
      const p4 = [X(20), Y(f(hour(20)))];
      return Math.hypot(x0 - p4[0], y0 - p4[1]) < 18 ? 'p4' : null;
    },
    move(id, x0, y0) {
      if (id !== 'p4') return;
      w = clamp(Math.round((36.4 + (G.cy - y0) / G.s) * 10) / 10, 36.5, 38.6);
      st.redraw();
    },
  });

  return { destroy: st.stop };
}
