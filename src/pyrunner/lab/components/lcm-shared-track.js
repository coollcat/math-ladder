/* =========================================================================
 * lab 组件：lcm-shared-track —— 同一把尺子上的两列倍数（第 10 章 · 最小公倍数）
 * -------------------------------------------------------------------------
 * 用法（第 32 课课文 lab 围栏）：
 *
 *   { "type": "lcm-shared-track", "title": "同一把尺子上的两列倍数" }
 *
 * 字段：a、b  两条轨道的周期（2..18，默认 4 与 6）
 *
 * 两条轨道共用同一根数轴（同一刻度、同一缩放）——横坐标相同才可比，
 * 第一次重合就是 lcm，往后每 lcm 格再撞一次；最后一幕把
 * gcd × lcm = a × b 对上账。旧版两张各自缩放的柱图会被这里的共享刻度取代。
 * ========================================================================= */

import {
  fmt, buildSliders, mergeSpec, buildReadout, label, polyline,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'a', label: '甲的周期 a', min: 2, max: 18, step: 1, value: 4 },
  { name: 'b', label: '乙的周期 b', min: 2, max: 18, step: 1, value: 6 },
];

function gcdOf(x, y) {
  let p = x;
  let q = y;
  while (q) {
    const r = p % q;
    p = q;
    q = r;
  }
  return p;
}

/* 刻度间隔：1 / 2 / 5 / 10 / 20…，控制在十条刻度附近 */
function niceStep(limit) {
  const raw = Math.max(limit / 10, 1e-3);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  const k = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return k * pow;
}

export default function render(host, spec) {
  const sliders = buildSliders({ sliders: mergeSpec(BASE, spec) }, () => st.redraw());
  const ro = buildReadout({
    a: '—',
    b: '—',
    'gcd(a, b)': '—',
    'lcm(a, b)': '—',
    '第一次重逢': '—',
    '全部重逢点': '—',
  });

  const st = makeStage(host, {
    height: 320,
    aspect: null,
    trim: false,
    scenes: [
      { caption: '第 1 幕：两列倍数排在同一把尺子上——同一横坐标才可比。', dur: 4 },
      { caption: '第 2 幕：第一次踩到同一格——那就是最小公倍数，两列倍数的重逢节拍器。', dur: 3.2 },
      { caption: '第 3 幕：此后每 lcm 格再撞一次；公倍数全体由 lcm 管完，gcd × lcm = a × b。', dur: 3.4 },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const a = Math.max(2, Math.round(sliders.state.a));
      const b = Math.max(2, Math.round(sliders.state.b));
      const g = gcdOf(a, b);
      const l = (a * b) / g;
      const limit = Math.min(360, Math.max(24, l * 3));
      const step = niceStep(limit);
      const na = Math.floor(limit / a);
      const nb = Math.floor(limit / b);
      const nc = Math.floor(limit / l);
      const shown = (n) => (i > 0 ? n : Math.max(1, Math.ceil(n * t)));

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      const pad = 12;
      const x0 = pad + 58;          /* 左侧留给轨道名 */
      const x1 = W - pad;
      const span = Math.max(x1 - x0, 40);
      const X = (v) => x0 + (v / limit) * span;

      const axisY = H - 46;
      const rb = axisY - 46;
      const ra = rb - 48;
      const pxPerUnit = span / limit;

      label(ctx, '同一把尺子：两轨刻度可比', pad, 18, C.axis, { size: 12, weight: 700 });

      /* ---- 第 3 幕：恒等式对上账 ---- */
      if (i >= 2) {
        const alpha = i > 2 ? 1 : t;
        const text = `gcd(${a}, ${b}) = ${g} · lcm = ${l}：${g} × ${l} = ${g * l} = ${a} × ${b}`;
        let size = 12;
        ctx.save();
        ctx.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        while (size > 8.5 && ctx.measureText(text).width > W - pad * 2) {
          size -= 0.5;
          ctx.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        }
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = alpha;
        label(ctx, text, (x0 + x1) / 2, 40, C.fg, { size, weight: 700, align: 'center' });
        ctx.restore();
      }

      /* ---- 两条轨道 ---- */
      const rails = [
        { y: ra, period: a, count: na, shown: shown(na), color: C.named('blue'), name: `a = ${a} 的倍数` },
        { y: rb, period: b, count: nb, shown: shown(nb), color: C.named('orange'), name: `b = ${b} 的倍数` },
      ];
      rails.forEach((r) => {
        polyline(ctx, [[X(0), r.y], [X(limit), r.y]], C.axis, 1.6);
        label(ctx, r.name, x0 - 8, r.y + 4, r.color, { size: 10.5, align: 'right' });
        const rad = Math.min(5, Math.max(2.2, r.period * pxPerUnit * 0.42));
        for (let k = 1; k <= r.count && k <= r.shown; k += 1) {
          const v = k * r.period;
          if (v > limit) break;
          ctx.beginPath();
          ctx.arc(X(v), r.y, rad, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.fill();
        }
      });

      /* ---- 重合点：第一次单独强调，随后全部标出 ---- */
      const firstShown = i >= 1;
      const allShown = i >= 2;
      for (let j = 1; j <= nc; j += 1) {
        const v = j * l;
        if (v > limit) break;
        if (!firstShown) break;
        if (j > 1 && !allShown) break;
        const px = X(v);
        polyline(ctx, [[px, ra - 24], [px, axisY + 6]], C.ok, j === 1 ? 1.8 : 1, [5, 4]);
        [ra, rb].forEach((y) => {
          ctx.beginPath();
          ctx.arc(px, y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = C.ok;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
      if (firstShown) {
        const px = X(l);
        const lx = Math.min(Math.max(px, x0 + 56), x1 - 56);
        if (lx !== px) polyline(ctx, [[px, ra - 42], [lx, ra - 42]], C.ok, 1);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = C.bg;
        ctx.fillRect(lx - 54, ra - 50, 108, 18);
        ctx.restore();
        label(ctx, `第一次重逢：${l}`, lx, ra - 37, C.ok, { size: 11.5, weight: 700, align: 'center' });
      }
      if (allShown) {
        for (let j = 2; j <= nc; j += 1) {
          const v = j * l;
          if (v > limit) break;
          const px = X(v);
          label(ctx, String(v), px, ra - 32, C.ok, { size: 10, align: px > x1 - 18 ? 'right' : 'center' });
        }
      }

      /* ---- 共用数轴 ---- */
      polyline(ctx, [[x0, axisY], [x1, axisY]], C.axis, 1.4);
      const nTicks = Math.floor(limit / step + 1e-9);
      for (let k = 0; k <= nTicks; k += 1) {
        const v = k * step;
        const px = X(v);
        polyline(ctx, [[px, axisY - 4], [px, axisY + 4]], C.axis, 1.2);
        label(
          ctx, fmt(v, 0), px, axisY + 17, C.axis,
          { size: 10, align: k === nTicks ? 'right' : 'center' },
        );
      }

      /* ---- 读数 ---- */
      const beats = [];
      for (let j = 1; j <= nc && beats.length < 6; j += 1) beats.push(j * l);
      ro.set('a', String(a));
      ro.set('b', String(b));
      ro.set('gcd(a, b)', String(g));
      ro.set('lcm(a, b)', firstShown ? String(l) : '待揭晓');
      ro.set('第一次重逢', firstShown ? String(l) : '待揭晓');
      ro.set('全部重逢点', beats.join(', '));
    },
  });

  host.appendChild(ro.box);
  return { slidersBox: sliders.box, destroy: st.stop };
}
