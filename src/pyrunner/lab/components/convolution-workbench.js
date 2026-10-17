/* =========================================================================
 * lab 组件：convolution-workbench —— 卷积翻转滑动台
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "convolution-workbench",
 *     "title": "翻转、滑动、逐位乘、求和",
 *     "x": [3, 2], "h": [1, 2]
 *   }
 *   ```
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   x     输入序列，2~8 个数，默认 [3, 2]
 *   h     冲激响应，2~8 个数，默认 [1, 2]
 *   mode  'conv'（卷积，默认）| 'corr'（相关：h 不翻转，纯对照）
 *   n     初始位置，默认 0
 *
 * 四行共用一根横轴（输出位置 n）：
 *   ① x[k]            —— 输入序列；在画布上直接拖动就能改数值
 *   ② h[n-k] / h[n+k] —— 冲激响应。卷积模式下它是「翻转后」的形态；
 *                        切到相关模式，h 不再翻转，滑动的方向反过来
 *   ③ 逐位乘积        —— 两行对应格相乘
 *   ④ 输出 y[n]       —— 完整输出条形图，当前列高亮；y[n] = 第三行这一列的和
 *
 * 能拖什么：
 *   - 在 ① / ② 行上拖动：改那一个 tap 的数值（0.5 一档）
 *   - 位置 n 滑块 + 播放/暂停/重置：自动扫过每个输出位置（离屏自动暂停，
 *     减少动效时播放按钮停用，仍可手动拖滑块）
 *
 * 读什么数：当前 n / y[n] / 完整输出 / 乘积账 / 说明
 * 一节不依赖引擎：纯数组乘加，口径与课文定义式 y[n] = Σ x[k]h[n-k] 一致。
 * ========================================================================= */

import {
  themeColors, setupCanvas, anim, buildSliders, buildSegmented, buildReadout,
  bindPointer, setSliderRow, label, fmt, clamp,
  clearBg,
} from '../core.js';

const V_MAX = 4;      /* 拖动编辑的数值上限（正负都到 4） */

function normSeq(v, fallback) {
  const arr = Array.isArray(v)
    ? v.map((t) => Number(t)).filter((t) => isFinite(t))
    : [];
  const use = arr.length >= 2 ? arr.slice(0, 8) : fallback.slice();
  return use.map((t) => clamp(Math.round(t * 2) / 2, -V_MAX, V_MAX));
}

export default function render(host, spec) {
  const initX = normSeq(spec.x, [3, 2]);
  const initH = normSeq(spec.h, [1, 2]);
  let xs = initX.slice();
  let hs = initH.slice();
  const mode0 = spec.mode === 'corr' ? 'corr' : 'conv';
  let mode = mode0;
  let n = Math.max(0, Math.round(Number(spec.n) || 0));
  let layout = null;    /* 上一次绘制的几何，供指针换算 */

  const inLen = () => xs.length + hs.length - 1;
  n = clamp(n, 0, inLen() - 1);

  const seg = buildSegmented(
    [
      { label: '卷积（h 翻转）', value: 'conv' },
      { label: '相关（h 不翻转）', value: 'corr' },
    ],
    mode,
    (v) => {
      mode = v;
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    '当前 n': '—',
    'y[n]': '—',
    '完整输出': '—',
    '乘积账': '—',
    '输出长度': '—',
    '说明': '—',
  });
  host.appendChild(ro.box);

  const cv = setupCanvas(host, 336);

  /* 卷积：y[n] = Σ_k x[k]·h[n-k]；相关：y[n] = Σ_k x[k]·h[n+k]（h 不翻转）。 */
  function output() {
    const Lx = xs.length;
    const Lh = hs.length;
    const L = Lx + Lh - 1;
    const y = new Array(L).fill(0);
    for (let m = 0; m < L; m += 1) {
      let acc = 0;
      for (let k = 0; k < Lx; k += 1) {
        const j = mode === 'conv' ? m - k : m + k;
        if (j >= 0 && j < Lh) acc += xs[k] * hs[j];
      }
      y[m] = acc;
    }
    return y;
  }

  /* 第 k 列上，冲激响应此刻露出的值（不重叠就返回 null） */
  function hAt(k) {
    const j = mode === 'conv' ? n - k : n + k;
    return j >= 0 && j < hs.length ? hs[j] : null;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const L = inLen();
    const y = output();
    const padL = 34;
    const padR = 14;
    const plotW = W - padL - padR;
    const colW = plotW / L;
    const barW = Math.min(colW * 0.62, 24);
    const cx = (i) => padL + (i + 0.5) * colW;
    const base = [60, 122, 184, 262];
    const amp1 = 30;
    const amp4 = 32;

    /* 前三行用固定的刻度（拖动编辑时手感稳定），第四行按输出自动放大。 */
    const rowMax = V_MAX;
    let outMax = V_MAX;
    y.forEach((v) => { outMax = Math.max(outMax, Math.abs(v)); });

    /* 当前列高亮：贯穿四行的竖带 */
    ctx.fillStyle = C.soft;
    ctx.fillRect(padL + n * colW, 30, colW, H - 40);

    const rowLabel = (txt, yi, color) => label(ctx, txt, 8, yi - 34, color, { size: 11, weight: 700 });
    rowLabel('① 输入 x[k]（拖我改数）', base[0], C.accent);
    rowLabel(mode === 'conv' ? '② h[n−k]：翻转滑动（拖我改数）' : '② h[n+k]：不翻转（拖我改数）',
      base[1], C.named('purple'));
    rowLabel('③ 逐位乘积 x[k]·h[…]', base[2], C.accent2);
    rowLabel('④ 输出 y[n]：第 ③ 行这一列的和', base[3], C.named('red'));

    for (let r = 0; r < 3; r += 1) {
      ctx.strokeStyle = C.axis;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(padL, base[r] + 0.5);
      ctx.lineTo(padL + plotW, base[r] + 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ① x[k] */
    for (let k = 0; k < xs.length; k += 1) {
      const v = xs[k];
      const h = (v / rowMax) * amp1;
      ctx.fillStyle = C.accent;
      ctx.fillRect(cx(k) - barW / 2, base[0] - Math.max(h, 0), barW, Math.abs(h) || 1);
      if (barW >= 13) {
        label(ctx, fmt(v, 1), cx(k), base[0] - h - (v >= 0 ? 4 : -12), C.fg, { size: 10, align: 'center' });
      }
    }

    /* ② 冲激响应（当前对齐） */
    for (let k = 0; k < xs.length; k += 1) {
      const v = hAt(k);
      if (v === null) continue;
      const h = (v / rowMax) * amp1;
      ctx.fillStyle = C.named('purple');
      ctx.fillRect(cx(k) - barW / 2, base[1] - Math.max(h, 0), barW, Math.abs(h) || 1);
      if (barW >= 13) {
        label(ctx, fmt(v, 1), cx(k), base[1] - h - (v >= 0 ? 4 : -12), C.fg, { size: 10, align: 'center' });
      }
    }
    /* ③ 乘积 */
    const terms = [];
    for (let k = 0; k < xs.length; k += 1) {
      const hv = hAt(k);
      if (hv === null) continue;
      const p = xs[k] * hv;
      terms.push(`${fmt(xs[k], 1)}×${fmt(hv, 1)}`);
      const h = (p / rowMax) * amp1;
      ctx.fillStyle = p >= 0 ? C.accent2 : C.named('red');
      ctx.fillRect(cx(k) - barW / 2, base[2] - Math.max(h, 0), barW, Math.abs(h) || 1);
      if (barW >= 13 && p !== 0) {
        label(ctx, fmt(p, 1), cx(k), base[2] - h - (p >= 0 ? 4 : -12), C.fg, { size: 10, align: 'center' });
      }
    }

    /* ④ 输出 */
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(padL, base[3] + 0.5);
    ctx.lineTo(padL + plotW, base[3] + 0.5);
    ctx.stroke();
    for (let m = 0; m < L; m += 1) {
      const v = y[m];
      const h = (v / outMax) * amp4;
      const lit = m === n;
      ctx.fillStyle = lit ? C.named('red') : C.named('gray');
      ctx.fillRect(cx(m) - barW / 2, base[3] - Math.max(h, 0), barW, Math.abs(h) || 1);
      if (barW >= 13) {
        label(ctx, fmt(v, 1), cx(m), base[3] - h - (v >= 0 ? 4 : -12), lit ? C.named('red') : C.fg, {
          size: 10,
          align: 'center',
        });
      }
      if (lit) {
        ctx.strokeStyle = C.named('red');
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(cx(m) - colW / 2 + 1.5, 34, colW - 3, H - 46);
        ctx.setLineDash([]);
      }
    }

    label(ctx, `x 长度 ${xs.length} + h 长度 ${hs.length} − 1 = 输出长度 ${L}`,
      padL, H - 8, C.fg, { size: 10.5 });
    label(ctx, '当前输出列 = 上面这一列的乘积之和', padL + plotW, H - 8, C.axis, { size: 10, align: 'right' });

    layout = { padL, plotW, colW, base, amp1, rowMax };

    ro.set('当前 n', String(n));
    ro.set('y[n]', fmt(y[n], 2));
    ro.set('完整输出', '[' + y.map((v) => fmt(v, 1)).join(', ') + ']');
    ro.set('乘积账', terms.length ? terms.join(' + ') + ' = ' + fmt(y[n], 2) : '此刻没有重叠');
    ro.set('输出长度', `${xs.length} + ${hs.length} − 1 = ${L}`);
    ro.set('说明', mode === 'conv'
      ? 'h 先翻转再滑动：越早的敲击衰减越多，因果性写在公式里'
      : 'h 不翻转：同样的数字划出另一套读数——它只回答「两串数据像不像」');
  }

  /* 在 ① / ② 行拖动 = 改那一个 tap 的值 */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!layout) return null;
      const { padL, plotW, colW, base } = layout;
      if (x < padL - 6 || x > padL + plotW + 6) return null;
      const k = Math.floor((x - padL) / colW);
      if (k < 0 || k >= xs.length) return null;
      if (Math.abs(y - base[0]) <= 34) return { row: 'x', k };
      if (Math.abs(y - base[1]) <= 34 && y < base[2] - 20) return { row: 'h', k };
      return null;
    },
    down(id) { void id; },
    move(id, x, y) {
      if (!layout || !id || !id.row) return;
      const k = clamp(Math.round((x - layout.padL) / layout.colW - 0.5), 0, xs.length - 1);
      const vRaw = (layout.base[id.row === 'x' ? 0 : 1] - y) / layout.amp1 * layout.rowMax;
      const v = clamp(Math.round(vRaw * 2) / 2, -V_MAX, V_MAX);
      if (id.row === 'x') xs[k] = v;
      else if (k < hs.length) hs[k] = v;
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'n', label: '位置 n', min: 0, max: inLen() - 1, step: 1, value: n },
      ],
    },
    (st) => {
      n = Math.round(st.n);
      draw();
    },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 0.85) return;
      acc = 0;
      if (n < inLen() - 1) {
        n += 1;
        setSliderRow(sliders, 0, n, undefined, 'n');
        draw();
      } else {
        controls.toggle(false);
      }
    },
    onReset() {
      n = 0;
      xs = initX.slice();
      hs = initH.slice();
      setSliderRow(sliders, 0, 0, undefined, 'n');
      draw();
    },
  });

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
