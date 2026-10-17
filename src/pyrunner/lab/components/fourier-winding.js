/* 傅里叶旋转探针：把信号乘上反向旋转的复指数，看“卷起来以后的重心”。

   契约：
   { "type": "fourier-winding", "freq": 1, "components": [[1, 1], [3, 0.4]] }

   五幕按“看见问题 → 改变探针 → 命中频率 → 扫描全谱”推进。候选频率是
   真交互：拖滑块即可在非整频、命中频与邻近频之间来回比较。 */

import {
  themeColors, buildSliders, mergeSpec, label, polyline, fmt,
  clamp, buildReadout,
} from '../core.js';
import { makeStage } from './algebra-stage.js';

const BASE = [
  { name: 'freq', label: '探针频率 p', min: 0, max: 6, step: 0.05, value: 1 },
];

function normalizeComponents(spec) {
  const src = Array.isArray(spec.components) && spec.components.length
    ? spec.components
    : [[1, 1], [3, 0.38], [5, 0.2]];
  return src.map((item) => {
    if (Array.isArray(item)) {
      return { f: clamp(Number(item[0]) || 1, 0.1, 6), a: Number(item[1]) || 0 };
    }
    return {
      f: clamp(Number(item && item.f) || 1, 0.1, 6),
      a: Number(item && item.a) || 0,
    };
  }).slice(0, 5);
}

function windingValue(components, p, t) {
  let v = 0;
  for (const c of components) v += c.a * Math.cos(2 * Math.PI * c.f * t);
  const ang = -2 * Math.PI * p * t;
  return {
    signal: v,
    x: v * Math.cos(ang),
    y: v * Math.sin(ang),
  };
}

export default function render(host, spec) {
  const components = normalizeComponents(spec);
  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, spec) },
    () => st.redraw(),
  );
  const ro = buildReadout({
    '探针频率': '—',
    '重心 |F(p)|': '—',
    '同相 / 异相': '—',
  });
  host.appendChild(ro.box);

  const N = 320;
  const pGrid = [];
  const spectrum = [];
  for (let k = 0; k <= 240; k += 1) {
    const p = (k / 240) * 6;
    pGrid.push(p);
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i += 1) {
      const t = i / N;
      const v = windingValue(components, p, t);
      sx += v.x;
      sy += v.y;
    }
    spectrum.push(Math.hypot(sx, sy) / N);
  }

  function measure(p) {
    let sx = 0;
    let sy = 0;
    let positive = 0;
    let negative = 0;
    const points = [];
    const samples = [];
    for (let i = 0; i <= N; i += 1) {
      const t = i / N;
      const v = windingValue(components, p, t);
      if (i < N) {
        sx += v.x;
        sy += v.y;
        if (v.x >= 0) positive += v.x;
        else negative += -v.x;
      }
      points.push(v);
      samples.push([t, v.signal]);
    }
    return {
      points,
      samples,
      cx: sx / N,
      cy: sy / N,
      mag: Math.hypot(sx, sy) / N,
      positive,
      negative,
    };
  }

  const st = makeStage(host, {
    height: 360,
    aspect: null,
    scenes: [
      {
        caption: '第一幕：信号只是时间轴上的一条曲线。我们先不急着背公式，只问：怎样让某个频率显形？',
        dur: 3.2,
      },
      {
        caption: '第二幕：把信号乘上以频率 p 反向旋转的复指数，再把每个时刻画成平面上的点。频率不合拍时，图形绕圈，面积互相抵消。',
        dur: 4.0,
      },
      {
        caption: '第三幕：把探针拖到信号真实存在的频率，所有小箭头朝同一方向站稳，重心离开原点。重心就是该频率的复系数。',
        dur: 4.0,
      },
      {
        caption: '第四幕：让 p 从 0 扫到 6 Hz。每当探针命中一个真实成分，重心长度就出现一座峰——这就是频谱。',
        dur: 4.2,
      },
      {
        caption: '第五幕：F(p)=∫f(t)e^{-i2πpt}dt。积分不是新魔法，它只是把“所有时刻的小箭头”加起来。',
        dur: 3.6,
      },
    ],
    draw({ ctx, W, H, C, i, t }) {
      const TC = themeColors();
      const p = sliders.state.freq;
      const m = measure(p);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      const top = 30;
      const gap = 20;
      const leftW = W * 0.36;
      const rightX = leftW + gap;
      const rightW = W - rightX - 8;
      const windingH = Math.min(178, H * 0.45);
      const spectrumY = top + windingH + 48;
      const spectrumH = Math.max(74, H - spectrumY - 30);

      label(ctx, '① 原信号', 8, 16, C.fg, { size: 12, weight: 700 });
      label(ctx, '② 乘 e^{-i2πpt} 后的卷曲路径', rightX, 16, C.fg, { size: 12, weight: 700 });

      /* 左：时间信号。y 轴自适应，时间只取一个单位窗口。 */
      const sigX = (tt) => 8 + tt * (leftW - 16);
      let sigMax = 0.2;
      for (const s of m.samples) sigMax = Math.max(sigMax, Math.abs(s[1]));
      const sigMid = top + windingH / 2;
      const sigScale = (windingH * 0.42) / sigMax;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(8, sigMid);
      ctx.lineTo(leftW - 8, sigMid);
      ctx.stroke();
      polyline(
        ctx,
        m.samples.map(([tt, v]) => [sigX(tt), sigMid - v * sigScale]),
        C.accent,
        2.1,
      );
      label(ctx, 'f(t)', 10, sigMid - windingH * 0.42, C.accent, { size: 11, weight: 700 });
      label(ctx, 't = 0', 8, top + windingH + 16, C.axis, { size: 10 });
      label(ctx, 't = 1', leftW - 8, top + windingH + 16, C.axis, { size: 10, align: 'right' });

      /* 右：复平面中的卷曲路径与重心。 */
      const cx = rightX + rightW * 0.52;
      const cy = top + windingH * 0.53;
      let maxAbs = 0.2;
      for (const pt of m.points) maxAbs = Math.max(maxAbs, Math.abs(pt.x), Math.abs(pt.y));
      const rr = Math.min(rightW * 0.34, windingH * 0.40) / maxAbs;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(cx - rightW * 0.43, cy);
      ctx.lineTo(cx + rightW * 0.43, cy);
      ctx.moveTo(cx, cy - windingH * 0.48);
      ctx.lineTo(cx, cy + windingH * 0.48);
      ctx.stroke();

      const path = m.points.map((pt) => [cx + pt.x * rr, cy - pt.y * rr]);
      polyline(ctx, path, TC.named('purple'), 1.8);

      /* 每个时刻的小箭头：用稀疏点展示“方向是否同相”。 */
      const arrowAlpha = i >= 1 ? 0.35 + 0.35 * t : 0;
      if (arrowAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = arrowAlpha;
        for (let k = 0; k < N; k += 18) {
          const pt = m.points[k];
          ctx.strokeStyle = C.named('orange');
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + pt.x * rr, cy - pt.y * rr);
          ctx.stroke();
        }
        ctx.restore();
      }

      const gx = cx + m.cx * rr;
      const gy = cy - m.cy * rr;
      ctx.save();
      ctx.strokeStyle = C.named('red');
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.fillStyle = C.named('red');
      ctx.beginPath();
      ctx.arc(gx, gy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, '重心', gx + 8, gy - 7, C.named('red'), { size: 11, weight: 700 });

      /* 底部：完整频谱扫描。 */
      if (i >= 3) {
        label(ctx, '③ 逐频扫描：重心长度 |F(p)|', 8, spectrumY - 9, C.fg, { size: 12, weight: 700 });
        const sx = (f) => 32 + (f / 6) * (W - 48);
        const sy = (v) => spectrumY + spectrumH - (v / (Math.max(...spectrum) || 1)) * spectrumH;
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(32, spectrumY + spectrumH);
        ctx.lineTo(W - 16, spectrumY + spectrumH);
        ctx.stroke();
        polyline(
          ctx,
          pGrid.map((f, k) => [sx(f), sy(spectrum[k])]),
          C.accent2,
          2,
        );
        ctx.save();
        ctx.strokeStyle = C.named('red');
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx(p), spectrumY);
        ctx.lineTo(sx(p), spectrumY + spectrumH);
        ctx.stroke();
        ctx.restore();
        [0, 1, 2, 3, 4, 5, 6].forEach((f) => {
          label(ctx, String(f), sx(f), spectrumY + spectrumH + 14, C.axis, {
            size: 9.5,
            align: 'center',
          });
        });
        label(ctx, 'Hz', W - 18, spectrumY + spectrumH + 14, C.axis, { size: 9.5, align: 'right' });
      }

      ro.set('探针频率', fmt(p, 2) + ' Hz');
      ro.set('重心 |F(p)|', fmt(m.mag, 4));
      ro.set('同相 / 异相', fmt(m.positive, 2) + ' / ' + fmt(m.negative, 2));
    },
  });

  sliders.box.classList.add('is-visible');
  return { slidersBox: sliders.box, destroy: st.stop };
}
