/* =========================================================================
 * lab 组件：angle-addition-lens —— 单位圆接力：和角/倍角公式的每一项怎么长出来
 * -------------------------------------------------------------------------
 * 用法（第 40 课「和角公式」与第 42 课「倍角公式」的 lab 围栏）：
 *
 *   { "type": "angle-addition-lens", "mode": "sum",    "title": "…" }
 *   { "type": "angle-addition-lens", "mode": "double", "title": "…" }
 *
 * 字段：mode  "sum"（默认；拖 a 臂与 a+b 臂，b 取差值）
 *             "double"（拖 a 臂与 2a 臂，b 锁成 a）
 *       a、b  初始角（度）：sum 默认 30° 与 45°（合起来正好 75°）
 *
 * 分幕（sum）：转 a → 接着转 b → 在 a 方向上量 cos b、直角拐 sin b →
 * 竖直投影叠成 sin a·cos b + cos a·sin b → 水平投影相减成
 * cos a·cos b − sin a·sin b。分幕（double）：同一个角转两次 → 两个相同项
 * 合并成 2 sin a·cos a → 同名项相减 cos²a − sin²a，再倒读出降幂公式。
 * ========================================================================= */

import {
  clamp, fmt, buildSliders, mergeSpec, setSliderRow, buildReadout,
  label, polyline, bindPointer,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE_SUM = [
  { name: 'a', label: '角 a（度）', min: 10, max: 170, step: 1, value: 30 },
  { name: 'b', label: '角 b（度）', min: -75, max: 75, step: 1, value: 45 },
];
const BASE_DOUBLE = [
  { name: 'a', label: '角 a（度）', min: 5, max: 100, step: 1, value: 30 },
];

/* 带底色的短标签：画在圆上时不至于被网格/圆弧糊住 */
function tag(ctx, text, x, y, color, C, opts = {}) {
  const size = opts.size || 10.5;
  const align = opts.align || 'left';
  ctx.save();
  ctx.font = `${opts.weight || 600} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const w = ctx.measureText(text).width;
  const ax = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = C.bg;
  ctx.fillRect(ax - 3, y - size - 1, w + 6, size + 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(text, ax, y + 2);
  ctx.restore();
}

function chipsWidth(ctx, size, chips) {
  let w = 0;
  chips.forEach((c) => {
    ctx.save();
    ctx.font = `${c.bold ? 700 : 500} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    w += ctx.measureText(c.text).width;
    ctx.restore();
  });
  return w;
}

function drawChips(ctx, x, y, size, alpha, chips) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  let pen = x;
  chips.forEach((c) => {
    ctx.font = `${c.bold ? 700 : 500} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = c.color;
    ctx.textAlign = 'left';
    ctx.fillText(c.text, pen, y);
    pen += ctx.measureText(c.text).width;
  });
  ctx.restore();
}

/* 行内缩字号，保证窄屏（约 280px）也不横向溢出 */
function fitSize(ctx, base, chips, maxW) {
  let size = base;
  while (size > 8.5 && chipsWidth(ctx, size, chips) > maxW) size -= 0.5;
  return size;
}

export default function render(host, spec) {
  const sp = spec || {};
  const doubleMode = sp.mode === 'double';
  const sliders = buildSliders({ sliders: mergeSpec(doubleMode ? BASE_DOUBLE : BASE_SUM, sp) }, () => st.redraw());

  const ro = buildReadout(doubleMode
    ? { '角 a': '—', '角 2a': '—', 'sin 2a': '—', 'cos 2a': '—' }
    : { '角 a': '—', '角 b': '—', 'sin(a+b)': '—', 'cos(a+b)': '—' });

  const scenes = doubleMode
    ? [
      { caption: '第 1 幕：令 b = a——同一个角连着转两次，终点落在 2a。', dur: 3 },
      { caption: '第 2 幕：两个一模一样的异名乘积对叠在竖直投影上：sin 2a = sin a·cos a + cos a·sin a = 2 sin a·cos a。', dur: 3.4 },
      { caption: '第 3 幕：水平投影是同一份横坐标减它自己：cos 2a = cos²a − sin²a；换两副面孔、倒着读，就是降幂公式。', dur: 3.4 },
    ]
    : [
      { caption: '第 1 幕：先把 a 臂转到位，再沿圆接着转 b——终点就是 a+b。', dur: 3 },
      { caption: '第 2 幕：在 a 臂上量出 cos b，再直角拐弯走 sin b：这条折线的落点仍是 a+b。', dur: 3.4 },
      { caption: '第 3 幕：两条腿竖直方向的投影叠起来——sin a·cos b + cos a·sin b 正好是终点的纵坐标 sin(a+b)。', dur: 3.6 },
      { caption: '第 4 幕：横方向的投影相减——cos a·cos b − sin a·sin b 落成 cos(a+b)。拖着两臂自己验。', dur: 3.6 },
    ];

  const G = { ready: false, cx: 0, cy: 0, a: [0, 0], q: [0, 0] };

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    trim: false,
    scenes,
    draw({ ctx, W, H, C, i, t }) {
      const aDeg = sliders.state.a;
      const bDeg = doubleMode ? sliders.state.a : sliders.state.b;
      const a = (aDeg * Math.PI) / 180;
      const bb = (bDeg * Math.PI) / 180;
      const total = doubleMode ? 2 * a : a + bb;
      const appear = (n) => (i > n ? 1 : (i < n ? 0 : t));

      const cA = Math.cos(a);
      const sA = Math.sin(a);
      const cB = Math.cos(bb);
      const sB = Math.sin(bb);
      const y1 = sA * cB;
      const y2 = cA * sB;
      const x1 = cA * cB;
      const x2 = -sA * sB;
      const sinT = appear(doubleMode ? 1 : 2);
      const cosT = appear(doubleMode ? 2 : 3);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      /* ---- 布局：宽屏左右双栏，窄屏圆在上、账本在下 ---- */
      const pad = 10;
      const titleH = 20;
      const wide = W >= 640;
      let cb;
      let lb;
      if (wide) {
        const size = Math.min(H - pad * 2 - titleH, (W - pad * 3) * 0.5);
        cb = { x: pad, y: pad + titleH, w: size, h: size };
        lb = { x: pad + size + 10, y: pad + titleH, w: W - (pad + size + 10) - pad, h: size };
      } else {
        const size = Math.min(W - pad * 2, Math.max(150, (H - pad * 2) * 0.5));
        cb = { x: (W - size) / 2, y: pad + titleH, w: size, h: size };
        const ly = cb.y + size + 8;
        lb = { x: pad, y: ly, w: W - pad * 2, h: Math.max(64, H - pad - ly) };
      }

      label(
        ctx,
        doubleMode ? '单位圆：同一个角转两次（b = a）' : '单位圆：先转 a，再接着转 b',
        pad, pad + 13, C.axis, { size: 12, weight: 700 },
      );

      const cx = cb.x + cb.w / 2;
      const cy = cb.y + cb.h / 2 + 4;
      const R = Math.min(cb.w, cb.h) * 0.32;

      /* ---- 圆与坐标轴 ---- */
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.3, cy);
      ctx.lineTo(cx + R * 1.3, cy);
      ctx.moveTo(cx, cy - R * 1.3);
      ctx.lineTo(cx, cy + R * 1.3);
      ctx.stroke();
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      label(ctx, '1', cx + R + 4, cy + 12, C.axis, { size: 9.5 });
      label(ctx, '1', cx + 5, cy - R + 3, C.axis, { size: 9.5 });

      /* ---- 第 1 幕：转 a，再接着转 b（b = a 时就是同一个角） ---- */
      const sweep = i === 0 ? a + (total - a) * t : total;
      const arcAng = (from, to, radius, color, w, dash) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, -from, -to, to > from);
        ctx.stroke();
        ctx.restore();
      };
      arcAng(a, sweep, R * 0.6, C.named('orange'), 2, i === 0 ? [5, 4] : null);
      polyline(ctx, [[cx, cy], [cx + R * cA, cy - R * sA]], C.named('blue'), 2.8);
      polyline(
        ctx,
        [[cx, cy], [cx + R * Math.cos(sweep), cy - R * Math.sin(sweep)]],
        C.named('orange'), i === 0 ? 2 : 2.6,
      );
      ctx.beginPath();
      ctx.arc(cx + R * cA, cy - R * sA, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = C.named('blue');
      ctx.fill();
      tag(
        ctx, 'P',
        cx + R * cA + (cA >= 0 ? 7 : -7), cy - R * sA - 6,
        C.named('blue'), C, { align: cA >= 0 ? 'left' : 'right', size: 11 },
      );
      const qx = cx + R * Math.cos(total);
      const qy = cy - R * Math.sin(total);
      if (i > 0) {
        ctx.beginPath();
        ctx.arc(qx, qy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = C.named('orange');
        ctx.fill();
      }
      const mid = (a + sweep) / 2;
      if (Math.abs(sweep - a) > 0.12) {
        tag(
          ctx, doubleMode ? '2a' : 'b',
          cx + R * 0.78 * Math.cos(mid), cy - R * 0.78 * Math.sin(mid) + 4,
          C.named('orange'), C, { align: 'center', size: 11 },
        );
      }

      /* ---- 第 2 幕：在 a 方向上量 cos b，再直角拐弯走 sin b ---- */
      const ctor = appear(1);
      const rx = cx + R * cB * cA;
      const ry = cy - R * cB * sA;
      if (ctor > 0) {
        polyline(ctx, [[cx, cy], [cx + (rx - cx) * ctor, cy + (ry - cy) * ctor]], C.named('blue'), 5);
        polyline(ctx, [[rx, ry], [rx + (qx - rx) * ctor, ry + (qy - ry) * ctor]], C.named('orange'), 5);
        const m = 9;
        polyline(ctx, [
          [rx + cA * m, ry - sA * m],
          [rx + cA * m - sA * m, ry - sA * m - cA * m],
          [rx - sA * m, ry - cA * m],
        ], C.axis, 1.2);
        if (ctor > 0.6) {
          if (Math.abs(cB) * R > 34) {
            tag(
              ctx, doubleMode ? 'cos a' : 'cos b',
              (cx + rx) / 2 - 4, (cy + ry) / 2 + 4,
              C.named('blue'), C, { align: 'right', size: 10.5 },
            );
          }
          if (Math.abs(sB) * R > 34) {
            tag(
              ctx, doubleMode ? 'sin a' : 'sin b',
              (rx + qx) / 2 + 6, (ry + qy) / 2 + 4,
              C.named('orange'), C, { size: 10.5 },
            );
          }
        }
      }

      /* ---- 竖直账本：两条腿在 y 轴上的投影叠成 sin(a+b) ---- */
      if (sinT > 0) {
        const barX = cx - 9;
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.lineWidth = 7;
        ctx.strokeStyle = C.named('blue');
        ctx.beginPath();
        ctx.moveTo(barX, cy);
        ctx.lineTo(barX, cy - R * y1 * sinT);
        ctx.stroke();
        ctx.strokeStyle = C.named('orange');
        ctx.beginPath();
        ctx.moveTo(barX, cy - R * y1 * sinT);
        ctx.lineTo(barX, cy - R * (y1 + y2) * sinT);
        ctx.stroke();
        ctx.restore();
        polyline(ctx, [[barX, cy - R * y1], [rx, ry]], C.grid, 1, [4, 4]);
        polyline(ctx, [[barX, cy - R * (y1 + y2)], [qx, qy]], C.grid, 1, [4, 4]);
        if (sinT > 0.6) {
          tag(
            ctx, doubleMode ? 'sin a·cos a' : 'sin a·cos b',
            barX - 6, cy - R * y1 * 0.5 + 4,
            C.named('blue'), C, { align: 'right' },
          );
          tag(
            ctx, doubleMode ? 'cos a·sin a' : 'cos a·sin b',
            barX - 6, cy - R * (y1 + y2 * 0.5) + 4,
            C.named('orange'), C, { align: 'right' },
          );
        }
        tag(ctx, doubleMode ? 'sin 2a' : 'sin(a+b)', qx + 8, qy - 6, C.fg, C, { size: 11 });
      }

      /* ---- 水平账本：x 轴上的两段一前一后，落成 cos(a+b) ---- */
      if (cosT > 0) {
        const barY = cy + 9;
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.lineWidth = 7;
        ctx.strokeStyle = C.named('blue');
        ctx.beginPath();
        ctx.moveTo(cx, barY);
        ctx.lineTo(cx + R * x1 * cosT, barY);
        ctx.stroke();
        ctx.strokeStyle = C.named('orange');
        ctx.beginPath();
        ctx.moveTo(cx + R * x1 * cosT, barY);
        ctx.lineTo(cx + R * (x1 + x2) * cosT, barY);
        ctx.stroke();
        ctx.restore();
        polyline(ctx, [[rx, ry], [rx, barY + 12]], C.grid, 1, [4, 4]);
        polyline(ctx, [[qx, qy], [qx, barY + 12]], C.grid, 1, [4, 4]);
        if (cosT > 0.6) {
          tag(
            ctx, doubleMode ? 'cos²a' : 'cos a·cos b',
            cx + R * x1 * 0.5, barY + 22,
            C.named('blue'), C, { align: 'center' },
          );
          tag(
            ctx, doubleMode ? '− sin²a' : '− sin a·sin b',
            cx + R * (x1 + x2 * 0.5), barY + 22,
            C.named('orange'), C, { align: 'center' },
          );
        }
        tag(
          ctx, doubleMode ? 'cos 2a' : 'cos(a+b)',
          qx + (qx >= cx ? 6 : -6), barY + 40,
          C.fg, C, { size: 11, align: qx >= cx ? 'left' : 'right' },
        );
      }

      /* ---- 账本：把圆上的长度抄成公式 ---- */
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = C.soft;
      ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
      ctx.restore();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(lb.x + 0.5, lb.y + 0.5, lb.w - 1, lb.h - 1);
      label(ctx, '把投影抄成公式', lb.x + 8, lb.y + 18, C.axis, { size: wide ? 12 : 11, weight: 700 });

      const rows = doubleMode
        ? [
          {
            alpha: sinT,
            chips: [
              { text: 'y 轴 ', color: C.axis },
              { text: 'sin a·cos a', color: C.named('blue') },
              { text: ' ＋ ', color: C.fg },
              { text: 'cos a·sin a', color: C.named('orange') },
              { text: ' ＝ ', color: C.fg },
              { text: '2 sin a·cos a', color: C.fg, bold: true },
            ],
          },
          {
            alpha: cosT,
            chips: [
              { text: 'x 轴 ', color: C.axis },
              { text: 'cos²a', color: C.named('blue') },
              { text: ' − ', color: C.fg },
              { text: 'sin²a', color: C.named('orange') },
              { text: ' ＝ ', color: C.fg },
              { text: 'cos 2a', color: C.fg, bold: true },
            ],
          },
          {
            alpha: cosT,
            chips: [
              { text: '换脸：', color: C.axis },
              { text: 'cos 2a = 2cos²a − 1 = 1 − 2sin²a', color: C.fg },
            ],
          },
          {
            alpha: cosT,
            chips: [
              { text: '倒读：', color: C.axis },
              { text: 'sin²a = (1 − cos 2a) / 2', color: C.fg },
            ],
          },
        ]
        : [
          {
            alpha: sinT,
            chips: [
              { text: 'y 轴 ', color: C.axis },
              { text: 'sin a·cos b', color: C.named('blue') },
              { text: ' ＋ ', color: C.fg },
              { text: 'cos a·sin b', color: C.named('orange') },
              { text: ' ＝ ', color: C.fg },
              { text: 'sin(a+b)', color: C.fg, bold: true },
            ],
          },
          {
            alpha: cosT,
            chips: [
              { text: 'x 轴 ', color: C.axis },
              { text: 'cos a·cos b', color: C.named('blue') },
              { text: ' − ', color: C.fg },
              { text: 'sin a·sin b', color: C.named('orange') },
              { text: ' ＝ ', color: C.fg },
              { text: 'cos(a+b)', color: C.fg, bold: true },
            ],
          },
        ];
      const rowH = Math.max(22, Math.min(30, (lb.h - 40) / rows.length));
      rows.forEach((row, ri) => {
        const size = fitSize(ctx, wide ? 12 : 10.5, row.chips, lb.w - 16);
        drawChips(ctx, lb.x + 8, lb.y + 42 + ri * rowH, size, row.alpha, row.chips);
      });

      /* ---- 读数 + 拖拽热区 ---- */
      if (doubleMode) {
        ro.set('角 a', fmt(aDeg, 0) + '°');
        ro.set('角 2a', fmt((2 * aDeg) % 360, 0) + '°');
        ro.set('sin 2a', fmt(Math.sin(2 * a), 3));
        ro.set('cos 2a', fmt(Math.cos(2 * a), 3));
      } else {
        ro.set('角 a', fmt(aDeg, 0) + '°');
        ro.set('角 b', fmt(bDeg, 0) + '°');
        ro.set('sin(a+b)', fmt(Math.sin(total), 3));
        ro.set('cos(a+b)', fmt(Math.cos(total), 3));
      }
      G.ready = true;
      G.cx = cx;
      G.cy = cy;
      G.a = [cx + R * cA, cy - R * sA];
      G.q = [qx, qy];
    },
  });

  host.appendChild(ro.box);
  st.cv.canvas.style.touchAction = 'none';

  bindPointer(st.cv.canvas, {
    pick(x, y) {
      if (!G.ready) return null;
      const [lx, ly] = st.toLogical(x, y);
      const da = Math.hypot(lx - G.a[0], ly - G.a[1]);
      const dq = Math.hypot(lx - G.q[0], ly - G.q[1]);
      if (dq <= 26 && dq <= da) return 'q';
      return da <= 26 ? 'a' : null;
    },
    move(id, x, y) {
      if (!G.ready) return;
      const [lx, ly] = st.toLogical(x, y);
      const deg = (Math.atan2(G.cy - ly, lx - G.cx) * 180) / Math.PI;
      st.play(false);
      if (id === 'a') {
        sliders.state.a = clamp(Math.round(deg), doubleMode ? 5 : 10, doubleMode ? 100 : 170);
        setSliderRow(sliders, 0, sliders.state.a, 0, 'a');
      } else if (id === 'q') {
        if (doubleMode) {
          sliders.state.a = clamp(Math.round(deg / 2), 5, 100);
          setSliderRow(sliders, 0, sliders.state.a, 0, 'a');
        } else {
          sliders.state.b = clamp(Math.round(deg - sliders.state.a), -75, 75);
          setSliderRow(sliders, 1, sliders.state.b, 0, 'b');
        }
      }
      st.redraw();
    },
  });

  return { slidersBox: sliders.box, destroy: st.stop };
}
