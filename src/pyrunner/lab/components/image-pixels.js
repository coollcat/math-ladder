/* =========================================================================
 * lab 组件：image-pixels（图像 = 二元函数 f(x, y)）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "image-pixels",
 *     "title": "把图放大到能看见单个像素"
 *   }
 *   ```
 *
 * 演示什么：
 *   左半边把一块区域放大到能看见单个像素，鼠标移过去读出 (x, y) 与灰度值；
 *   右半边把同一块区域画成三维柱状地形——**灰度就是高度**。
 *   「图像是一个二元函数 f(x, y) = 灰度」这句话由此变成看得见的东西。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   src     内置示例图，默认 'scene'。
 *           'scene'   程序化生成的风景：天空渐变 / 太阳 / 两道山脊 /
 *                     规则竖条栅栏 / 右下角高频棋盘（不依赖任何外部图片）
 *           'rings' | 'checker' | 'stripes' | 'gradient'  直接调 media.synth
 *   zoom    放大倍数 1..16，默认 4（倍数越大，视野里的像素越少、格子越大）
 *   height  三维柱高夸张系数 0.2..1.2，默认 0.6
 *   az      三维方位角（度），默认 35
 *   el      三维仰角（度），默认 34
 *
 * 能拖什么：
 *   - 在左半边拖动：平移放大窗口，整张图的任意角落都能看
 *   - 在右半边拖动：左右改方位角，上下改仰角
 *   - 鼠标悬停在方格上：实时读出该像素的 (x, y)、灰度（0–255）、高度
 *   - 底部滑块是拖拽的备用入口（放大倍数 / 柱高 / 方位角 / 仰角）
 *
 * 用到的引擎函数：media.synth（checker / rings / stripes / gradient 四种图案）
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, bindPointer, label,
  clamp, fmt, grayCanvas, blit,
  sceneGray,
  clearBg,
} from '../core.js';
import { synth } from '../engines/media.js';

const W0 = 160;
const H0 = 120;
const AR = W0 / H0;

/* 程序化生成的内置示例图：不依赖任何外部图片资源。
   刻意塞进四类结构，供后续各组件反复使用——
   大块平滑渐变（看量化台阶）、规则竖条栅栏（看混叠）、
   高频棋盘（看采样极限）、清晰的斜边与圆弧（看边缘与频谱方向）。 */

/* Float64Array(0..1) → 离屏 canvas。放大时配合 imageSmoothingEnabled=false，
   像素是硬边方块，而不是插值糊成一片——这正是本组件要给人看的东西。 */

function frame(ctx, p, C) {
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
}

function cropOf(img, n, ox, oy) {
  const out = new Float64Array(n * n);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) out[j * n + i] = img[(oy + j) * W0 + ox + i];
  }
  return out;
}

export default function render(host, spec) {
  const s = {
    src: spec.src || 'scene',
    zoom: spec.zoom ?? 4,
    height: spec.height ?? 0.6,
    az: spec.az ?? 35,
    el: spec.el ?? 34,
  };
  const loadImg = (mode) => (mode === 'scene' ? sceneGray(W0, H0) : synth(W0, H0, mode));
  let img = loadImg(s.src);
  let full = null;
  let cx = W0 / 2;
  let cy = H0 / 2;
  let hov = null;
  let geo = null;      // 当前布局（命中测试用）

  const cv = setupCanvas(host, 360);

  const seg = buildSegmented(
    [
      { label: '风景', value: 'scene' },
      { label: '圆环', value: 'rings' },
      { label: '棋盘', value: 'checker' },
      { label: '条纹', value: 'stripes' },
      { label: '渐变', value: 'gradient' },
    ],
    s.src,
    (v) => {
      s.src = v;
      img = loadImg(v);
      full = null;
      hov = null;
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({ 坐标: '—', 灰度: '—', 高度: '—', 视野: '—' });
  host.appendChild(ro.box);

  /* ---- 右半边：灰度当高度的三维柱状地形 ---- */
  function draw3d(ctx, p, crop, n, C) {
    const ccx = p.x + p.w / 2;
    const ccy = p.y + p.h / 2 + 4;
    const S = Math.min(p.w - 26, p.h - 46) / 1.5;
    const az = (s.az * Math.PI) / 180;
    const el = (s.el * Math.PI) / 180;
    const ca = Math.cos(az);
    const sa = Math.sin(az);
    const se = Math.sin(el);
    const ce = Math.cos(el);

    const bars = [];
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const g = clamp(crop[j * n + i], 0, 1);
        const X = n > 1 ? i / (n - 1) - 0.5 : 0;
        const Y = n > 1 ? j / (n - 1) - 0.5 : 0;
        const Z = g * s.height;
        const xr = X * ca - Y * sa;
        const yr = X * sa + Y * ca;
        const yb = ccy + yr * se * S;
        bars.push({
          d: yr * ce + Z * se,
          x: ccx + xr * S,
          yb,
          yt: yb - Z * ce * S,
          g, i, j,
        });
      }
    }
    /* 画家算法：远的先画 */
    bars.sort((a, b) => a.d - b.d);

    const bw = Math.max(1.2, (S / (n - 0.2)) * 0.8);
    const capH = bw * 0.5 * se;
    bars.forEach((b) => {
      const v = Math.round(b.g * 255);
      const sideV = Math.round(v * 0.5);
      /* 柱身 */
      ctx.fillStyle = `rgb(${sideV},${sideV},${Math.round(sideV * 1.08)})`;
      ctx.fillRect(b.x - bw / 2, b.yt, bw, Math.max(0.6, b.yb - b.yt));
      /* 顶面：这一面是真实的灰度值 */
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.moveTo(b.x - bw / 2, b.yt);
      ctx.lineTo(b.x, b.yt - capH);
      ctx.lineTo(b.x + bw / 2, b.yt);
      ctx.lineTo(b.x, b.yt + capH);
      ctx.closePath();
      ctx.fill();
      if (bw > 2.5) {
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      if (hov && hov.i === b.i && hov.j === b.j) {
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    label(ctx, '灰度 = 高度（拖动旋转视角）', p.x + 8, p.y + 15, C.fg, { size: 11 });
    label(ctx, `视角 方位 ${fmt(s.az, 0)}° · 仰角 ${fmt(s.el, 0)}°`,
      p.x + 8, p.y + p.h - 8, C.fg, { size: 11 });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const pad = 8;
    const pw = (W - pad * 3) / 2;
    const ph = H - pad * 2;
    const L = { x: pad, y: pad, w: pw, h: ph };
    const R = { x: pad * 2 + pw, y: pad, w: pw, h: ph };
    frame(ctx, L, C);
    frame(ctx, R, C);

    const N = Math.max(2, Math.round(40 / s.zoom));
    const ox = Math.round(clamp(cx - N / 2, 0, W0 - N));
    const oy = Math.round(clamp(cy - N / 2, 0, H0 - N));
    const crop = cropOf(img, N, ox, oy);

    /* ---------- 左：放大视图 ---------- */
    label(ctx, '放大视图：每个小方格 = 一个像素（拖动平移）', L.x + 8, L.y + 15, C.fg, { size: 11 });
    const thumbW = Math.min(L.w - 16, 96);
    const thumbH = thumbW / AR;
    const side = Math.max(60, Math.min(L.w - 16, L.h - 30 - thumbH - 24));
    const gx = L.x + (L.w - side) / 2;
    const gy = L.y + 24;
    const cell = side / N;

    for (let j = 0; j < N; j += 1) {
      for (let i = 0; i < N; i += 1) {
        const v = Math.round(clamp(crop[j * N + i], 0, 1) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(gx + i * cell, gy + j * cell, cell + 0.6, cell + 0.6);
      }
    }
    if (cell > 6) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= N; k += 1) {
        ctx.moveTo(gx + k * cell + 0.5, gy);
        ctx.lineTo(gx + k * cell + 0.5, gy + side);
        ctx.moveTo(gx, gy + k * cell + 0.5);
        ctx.lineTo(gx + side, gy + k * cell + 0.5);
      }
      ctx.stroke();
    }
    if (cell > 28) {
      ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let j = 0; j < N; j += 1) {
        for (let i = 0; i < N; i += 1) {
          const g = clamp(crop[j * N + i], 0, 1);
          ctx.fillStyle = g > 0.5 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.8)';
          ctx.fillText(String(Math.round(g * 255)), gx + (i + 0.5) * cell, gy + (j + 0.5) * cell);
        }
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    if (hov && hov.i >= 0 && hov.i < N && hov.j >= 0 && hov.j < N) {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + hov.i * cell, gy + hov.j * cell, cell, cell);
    }

    /* 缩略图 + 当前窗口 + 读数 */
    if (!full) full = grayCanvas(img, W0, H0);
    const tx = L.x + 8;
    const ty = gy + side + 12;
    blit(ctx, full, tx, ty, thumbW, thumbH);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx + 0.5, ty + 0.5, thumbW, thumbH);
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      tx + (ox / W0) * thumbW, ty + (oy / H0) * thumbH,
      Math.max(2, (N / W0) * thumbW), Math.max(2, (N / H0) * thumbH),
    );
    const rx = tx + thumbW + 12;
    label(ctx, `视野 ${N} × ${N} 像素，共 ${N * N} 个`, rx, ty + 13, C.fg, { size: 11 });
    if (hov) {
      const g = crop[hov.j * N + hov.i];
      label(ctx, `f(${ox + hov.i}, ${oy + hov.j}) = ${fmt(g, 3)}`, rx, ty + 31, C.accent, { size: 11 });
      label(ctx, `灰度 ${Math.round(clamp(g, 0, 1) * 255)} / 255`, rx, ty + 47, C.fg, { size: 11 });
      ro.set('坐标', `(${ox + hov.i}, ${oy + hov.j})`);
      ro.set('灰度', `${Math.round(clamp(g, 0, 1) * 255)} / 255`);
      ro.set('高度', fmt(clamp(g, 0, 1), 3));
    } else {
      label(ctx, '把鼠标移到方格上读像素', rx, ty + 31, C.fg, { size: 11 });
      ro.set('坐标', '—');
      ro.set('灰度', '—');
      ro.set('高度', '—');
    }
    ro.set('视野', `${N} × ${N}`);

    /* ---------- 右：三维地形 ---------- */
    draw3d(ctx, R, crop, N, C);

    geo = { L, R, gx, gy, side, cell, N, ox, oy };
  }

  /* ---- 指针：左半边平移窗口，右半边旋转视角 ---- */
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      const p = geo;
      if (x >= p.gx && x <= p.gx + p.side && y >= p.gy && y <= p.gy + p.side) return 'pan';
      if (x >= p.R.x && x <= p.R.x + p.R.w && y >= p.R.y && y <= p.R.y + p.R.h) return 'rot';
      return null;
    },
    down(id, x, y) {
      drag = { id, x0: x, y0: y, cx0: cx, cy0: cy, az0: s.az, el0: s.el };
    },
    move(id, x, y) {
      if (!drag) return;
      if (id === 'pan') {
        const c = geo.cell;
        cx = clamp(drag.cx0 - (x - drag.x0) / c, geo.N / 2, W0 - geo.N / 2);
        cy = clamp(drag.cy0 - (y - drag.y0) / c, geo.N / 2, H0 - geo.N / 2);
      } else {
        s.az = ((drag.az0 + (x - drag.x0) * 0.35 + 540) % 360) - 180;
        s.el = clamp(drag.el0 - (y - drag.y0) * 0.25, 6, 84);
        sl.sync({ az: s.az, el: s.el });
      }
      hov = null;
      draw();
    },
    up() { drag = null; },
    hover(x, y, activeId) {
      if (activeId || !geo) return;
      const p = geo;
      if (x >= p.gx && x <= p.gx + p.side && y >= p.gy && y <= p.gy + p.side) {
        const i = Math.min(p.N - 1, Math.floor((x - p.gx) / p.cell));
        const j = Math.min(p.N - 1, Math.floor((y - p.gy) / p.cell));
        if (!hov || hov.i !== i || hov.j !== j) {
          hov = { i, j };
          draw();
        }
      } else if (hov) {
        hov = null;
        draw();
      }
    },
    leave() {
      if (hov) {
        hov = null;
        draw();
      }
    },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'zoom', label: '放大倍数', min: 1, max: 16, step: 1, value: s.zoom },
        { name: 'height', label: '柱高（灰度放大）', min: 0.2, max: 1.2, step: 0.05, value: s.height },
        { name: 'az', label: '方位角', min: -180, max: 180, step: 1, value: s.az },
        { name: 'el', label: '仰角', min: 6, max: 84, step: 1, value: s.el },
      ],
    },
    (st) => {
      s.zoom = st.zoom;
      s.height = st.height;
      s.az = st.az;
      s.el = st.el;
      hov = null;
      draw();
    },
  );
  /* 拖拽改变视角后，把滑块把手同步过去 */
  sl.sync = (st) => {
    const rows = sl.box.querySelectorAll('.ml-slider');
    const set = (idx, v) => {
      const r = rows[idx];
      if (!r) return;
      const range = r.querySelector('input');
      const span = r.querySelector('.ml-slider__val');
      if (range) range.value = String(Math.round(v));
      if (span) span.textContent = String(Math.round(v));
    };
    set(2, st.az);
    set(3, st.el);
  };

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sl.box,
    destroy() { /* 无动画、无音频，无需清理 */ },
  };
}
