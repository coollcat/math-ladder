/* =========================================================================
 * lab 组件：latent-chord —— 潜在空间插值：弦穿空地的那一段有多空
 * -------------------------------------------------------------------------
 * 演示什么：两片薄弧上各撒一串样本（对应"同类数据沿弯曲的薄壳聚集"）。
 *   一条滑块把 t 从 0 扫到 1，插值点 z(t) 沿两端的连线匀速前进；
 *   读数同时报出"最近样本还有多远"。中段那一下的读数最大——
 *   那就是"弦穿空地"的量化版本：越往中间越四不像。
 *   切到"单位圆上的 slerp"还会看到：同样的 t，线性插值把点拉到圆内，
 *   模长掉到 0.7071 而球面插值始终停在 1。
 *
 * 用法（第 48 章《潜在空间插值与向量算术》动手实验）：
 *   { "type": "latent-chord",
 *     "title": "扫 t，看插值点离最近的样本有多远",
 *     "hint": "拖滑块扫 t；虚线是两端连线，橙点是插值点",
 *     "mode": "arcs" }
 *
 * 字段（都可省）：mode 初值 'arcs' | 'circle' / height 画布高度（默认 330）。
 *
 * 五问：
 *   1. 动手量：拖 t —— 它就是插值公式里唯一的自由参数，也是"两步之间走多远"的钟表。
 *   2. 即时后果：橙点沿弦滑动、到最近样本的连线段与读数同帧更新。
 *   3. 读数：‖z(t)‖ 与"最近样本距离"两个数，前者在圆模式里直接暴露线性插值
 *      掉出球面的量（Θ=90° 时中点只剩 0.7071），后者在弧模式里报出空巷宽度
 *      （默认停在最空旷的 t=0.32，最近样本 1.2810）。
 *   4. 啊哈预设：「弦的中点」直接跳到 t=0.5；「换到单位圆」切到 slerp 对照。
 *   5. 默认状态：t=0.32、弧模式，一打开就是最空旷的那一帧，最近样本 1.2810；
 *      这一帧插值点离两片薄壳都超过一个身位，正是"四不像"的量化版本。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout,
  label, polyline, clamp, fmt, clearBg,
} from '../core.js';

/* 两片薄弧：与课文实验 2 的 ptsA / ptsB 完全同一组坐标，
   这样组件里的"最近样本 1.8478"与 Python 打印的中点四舍五入能互相印证。 */
const PTS_A = [[-2.0, 0.2], [-1.6, 0.85], [-1.0, 1.35], [-0.3, 1.62], [0.5, 1.58],
  [1.2, 1.25], [1.65, 0.7], [1.95, 0.15], [2.0, -0.35]];
const PTS_B = [[-2.0, 0.0], [-1.5, -0.5], [-0.9, -0.95], [-0.2, -1.3], [0.5, -1.5],
  [1.2, -1.55], [1.7, -1.35], [2.0, -1.0]];

export default function render(host, spec) {
  const st = {
    t: 0.32,
    mode: spec.mode === 'circle' ? 'circle' : 'arcs',
  };

  const cv = setupCanvas(host, spec.height || 330);
  const ro = buildReadout({
    '‖z(t)‖': '—',
    '最近样本距离': '—',
    '弦长 / 圆心角': '—',
    '这一帧的诊断': '—',
  });
  host.appendChild(ro.box);

  const za = PTS_A[PTS_A.length - 1];
  const zb = PTS_B[0];
  const chord = Math.hypot(zb[0] - za[0], zb[1] - za[1]);

  /* 单位圆模式：两端点落在 θ 与 θ+Θ 两条半径上 */
  const CIRC = { r: 1, th0: 0, span: Math.PI / 2 };

  const lerp2 = (u, v, t) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];

  function arcPoint(t) {
    /* 弧模式：沿弦线性插值 */
    return lerp2(za, zb, t);
  }

  function circPoint(t) {
    const a = CIRC.th0 + CIRC.span * t;
    return [CIRC.r * Math.cos(a), CIRC.r * Math.sin(a)];
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const padL = 26;
    const padR = 150;
    const padT = 20;
    const padB = 20;
    const isArc = st.mode === 'arcs';
    const box = isArc
      ? { x0: -2.6, x1: 2.6, y0: -2.1, y1: 2.1 }
      : { x0: -1.45, x1: 1.45, y0: -1.45, y1: 1.45 };
    const S = Math.min((W - padL - padR) / (box.x1 - box.x0), (H - padT - padB) / (box.y1 - box.y0));
    const cx = padL + ((box.x1 - box.x0) * S) / 2;
    const cy = padT + ((box.y1 - box.y0) * S) / 2;
    const X = (x) => cx + x * S;
    const Y = (y) => cy - y * S;

    /* 网格 + 原点十字 */
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = Math.ceil(box.x0); gx <= box.x1; gx += 1) {
      ctx.moveTo(X(gx), Y(box.y0));
      ctx.lineTo(X(gx), Y(box.y1));
    }
    for (let gy = Math.ceil(box.y0); gy <= box.y1; gy += 1) {
      ctx.moveTo(X(box.x0), Y(gy));
      ctx.lineTo(X(box.x1), Y(gy));
    }
    ctx.stroke();
    ctx.restore();

    if (isArc) {
      /* 两片薄弧的样本点 */
      polyline(ctx, PTS_A.map((p) => [X(p[0]), Y(p[1])]), C.named('blue'), 1.6);
      polyline(ctx, PTS_B.map((p) => [X(p[0]), Y(p[1])]), C.named('green'), 1.6);
      [PTS_A, PTS_B].forEach((pts, k) => {
        ctx.fillStyle = k === 0 ? C.named('blue') : C.named('green');
        pts.forEach((p) => {
          ctx.beginPath();
          ctx.arc(X(p[0]), Y(p[1]), 3.6, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      label(ctx, '上弧样本', X(PTS_A[3][0]) - 18, Y(PTS_A[3][1]) - 12, C.named('blue'), { size: 10 });
      label(ctx, '下弧样本', X(PTS_B[3][0]) - 18, Y(PTS_B[3][1]) + 18, C.named('green'), { size: 10 });
    } else {
      /* 单位圆 + 两端点 */
      ctx.save();
      ctx.strokeStyle = C.named('gray');
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(X(0), Y(0), CIRC.r * S, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      const pa = circPoint(0);
      const pb = circPoint(1);
      [pa, pb].forEach((p) => {
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(X(p[0]), Y(p[1]), 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
      label(ctx, 'θ₀', X(pa[0]) + 8, Y(pa[1]) + 4, C.fg, { size: 10 });
      label(ctx, 'θ₀+Θ', X(pb[0]) - 8, Y(pb[1]) + 16, C.fg, { size: 10, align: 'right' });
    }

    /* 两端点与整条弦（灰虚线） */
    const A0 = isArc ? za : circPoint(0);
    const B0 = isArc ? zb : circPoint(1);
    polyline(ctx, [[X(A0[0]), Y(A0[1])], [X(B0[0]), Y(B0[1])]], C.named('gray'), 1.8, [6, 4]);

    /* 球面插值参照（只在圆模式画）：始终贴着圆周走的那条弧 */
    if (!isArc) {
      const arcPts = [];
      for (let k = 0; k <= 80; k += 1) {
        const p = circPoint(k / 80);
        arcPts.push([X(p[0]), Y(p[1])]);
      }
      polyline(ctx, arcPts, C.named('purple'), 2.2);
    }

    /* 两种模式都用**线性**插值算 z(t)——这才是被检验的对象；
       圆模式额外画出球面插值的弧作参照，让"掉出球面多少"看得见。 */
    const z = isArc ? arcPoint(st.t) : lerp2(circPoint(0), circPoint(1), st.t);

    /* 最近样本（只在弧模式有意义；圆模式改报模长） */
    let near = Infinity;
    let nearPt = null;
    if (isArc) {
      [PTS_A, PTS_B].forEach((pts) => {
        pts.forEach((p) => {
          const d = Math.hypot(z[0] - p[0], z[1] - p[1]);
          if (d < near) { near = d; nearPt = p; }
        });
      });
      if (nearPt) {
        ctx.save();
        ctx.strokeStyle = C.bad;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(X(z[0]), Y(z[1]));
        ctx.lineTo(X(nearPt[0]), Y(nearPt[1]));
        ctx.stroke();
        ctx.restore();
        label(ctx, fmt(near, 3), (X(z[0]) + X(nearPt[0])) / 2 + 5,
          (Y(z[1]) + Y(nearPt[1])) / 2 - 5, C.bad, { size: 10 });
      }
    }

    /* 插值点：橙色 X（与课文实验 2 的 marker="X" 同一个记号） */
    const zx = X(z[0]);
    const zy = Y(z[1]);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(zx - 6, zy - 6);
    ctx.lineTo(zx + 6, zy + 6);
    ctx.moveTo(zx + 6, zy - 6);
    ctx.lineTo(zx - 6, zy + 6);
    ctx.stroke();
    label(ctx, 'z(t)', zx + 9, zy - 8, C.accent2, { size: 11, weight: 600 });

    if (spec.hint) label(ctx, String(spec.hint), padL, H - 5, C.grid, { size: 10 });

    /* ---- 读数 ---- */
    const znorm = Math.hypot(z[0], z[1]);
    ro.set('‖z(t)‖', znorm.toFixed(4));
    if (isArc) {
      ro.set('最近样本距离', near.toFixed(4) + (near > 1.2 ? '　← 没人管的地带' : ''));
      ro.set('弦长 / 圆心角', '弦长 ' + chord.toFixed(4) + '　t = ' + st.t.toFixed(2));
      ro.set('这一帧的诊断', near > 1.2
        ? '插值点悬在两片薄壳之间：最近的样本也隔着一个身位'
        : '插值点贴着某片薄壳：这一帧还算"有住户"');
    } else {
      const off = CIRC.r - znorm;
      ro.set('最近样本距离', '掉出球面 ' + off.toFixed(4) + '（球面插值处恒为 0）');
      ro.set('弦长 / 圆心角', 'Θ = ' + fmt((CIRC.span * 180) / Math.PI, 0) + '°　t = ' + st.t.toFixed(2));
      ro.set('这一帧的诊断', off < 1e-6
        ? '端点：线性插值与球面插值重合'
        : '线性插值掉进球内 ' + off.toFixed(4) + '，球面插值仍在球面上');
    }
  }

  const seg = buildSegmented(
    [
      { label: '两片薄弧', value: 'arcs' },
      { label: '单位圆（slerp 对照）', value: 'circle' },
    ],
    st.mode,
    (v) => { st.mode = v; draw(); },
  );
  host.appendChild(seg);

  const sliders = buildSliders(
    { sliders: [{ name: 't', label: '插值参数 t', min: 0, max: 1, step: 0.01, value: st.t, fmt: 2 }] },
    (state) => { st.t = state.t; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
