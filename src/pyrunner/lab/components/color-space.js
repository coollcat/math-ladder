/* =========================================================================
 * lab 组件：color-space（色彩空间与色度子采样）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "color-space",
 *     "title": "把颜色拆成亮度与色度，再看看能扔掉多少"
 *   }
 *   ```
 *
 * 演示什么：
 *   【通道拆分】RGB 三通道并排看：红通道在红屋顶处最亮、蓝通道在天空处最亮，
 *   三个通道长得都很像——**它们高度相关**，这就是可以换一种表示法的理由。
 *   下面一行换成 YUV：Y 是亮度（几乎就是黑白照片，细节全在这儿），
 *   U / V 是色度（大片大片、糊得看不出细节）。
 *   【色度子采样】把 U / V 降分辨率：4:4:4（不降）/ 4:2:2（横向减半）/
 *   4:2:0（横竖各减半），再用 yuvToRgb 重建。三张图**肉眼几乎看不出差别**——
 *   因为人眼对亮度细节敏感、对色度细节迟钝。放大裁切 + 差值增益能把那点
 *   差别逼出来：颜色只在边缘渗出一点点。
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   mode    'split'（默认，通道拆分）或 'sub'（色度子采样）
 *   zoom    放大裁切的倍数 1..8，默认 3（越大，裁切窗口里的像素越少）
 *   gain    差值增益 1..16，默认 6（把色度损失放大到看得见）
 *
 * 能拖什么：
 *   - 在任意一张子采样图上拖动：移动底部放大裁切的窗口（挑最花的边缘看）
 *   - 底部滑块：放大倍数、差值增益
 *   - 顶部开关：模式、子采样格式对照（三张图始终并排，不用切）
 *
 * 用到的引擎函数：media.rgbToYuv（RGB→YUV）/ yuvToRgb（重建）/
 *   chromaSubsample420（4:2:0）。4:2:2 引擎未提供，就地做横向两点均值，
 *   与 4:2:0 同一口径。
 *
 * 内置示例图：程序化生成（天空渐变 / 太阳 / 两道山脊 / 红顶小屋 / 白色栅栏 /
 *   红白高频棋盘），刻意布置了大量**饱和色的硬边缘**，色度子采样的渗色
 *   只有在这些边缘上才看得见。不依赖任何外部图片资源。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildSegmented, buildReadout, bindPointer, label,
  clamp, fmt, blit,
  clearBg,
} from '../core.js';
import { rgbToYuv, yuvToRgb, chromaSubsample420 } from '../engines/media.js';

const W0 = 160;
const H0 = 120;
const AR = W0 / H0;

/* ---------- 内置示例图（程序化生成，不依赖外部图片） ---------- */
function sceneRGB(w, h) {
  const r = new Float64Array(w * h);
  const g = new Float64Array(w * h);
  const b = new Float64Array(w * h);
  const ar = w / h;
  const HZ = 0.58;
  const bump = (u, c, s) => Math.exp(-((u - c) * (u - c)) / (2 * s * s));
  for (let y = 0; y < h; y += 1) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x += 1) {
      const u = x / (w - 1);
      const rA = HZ - 0.26 * bump(u, 0.26, 0.13) - 0.17 * bump(u, 0.68, 0.08);
      const rB = HZ - 0.10 * bump(u, 0.5, 0.22);
      const far = Math.min(rA, rB);
      const near = Math.max(rA, rB);
      let R; let G; let B;
      if (v < far) {
        const t = clamp(v / HZ, 0, 1);
        R = 0.16 + 0.56 * t;
        G = 0.34 + 0.52 * t;
        B = 0.72 + 0.24 * t;
        const sd = Math.hypot((u - 0.78) * ar, v - 0.16);
        if (sd < 0.07) { R = 1.0; G = 0.95; B = 0.55; }
        else if (sd < 0.15) {
          const k = 0.25 * (1 - (sd - 0.07) / 0.08);
          R += k; G += k * 0.8; B += k * 0.3;
        }
      } else if (v < near) {
        R = 0.34; G = 0.42; B = 0.56;
      } else if (v < HZ) {
        const t = 0.46 + 0.10 * Math.sin(u * 46);
        R = 0.20 * t * 2.0; G = 0.46 * t * 1.9; B = 0.28 * t * 2.0;
      } else {
        const t = (v - HZ) / (1 - HZ);
        R = 0.32 - 0.14 * t; G = 0.55 - 0.20 * t; B = 0.24 - 0.10 * t;
      }
      /* 红顶小屋：饱和色的硬边缘，色度子采样渗色的最佳观察点 */
      if (v > 0.34 && v < 0.58 && u > 0.07 && u < 0.23) {
        const roofT = (v - 0.34) / 0.10;
        const half = (v - 0.34) * 1.6;
        if (v < 0.44 && Math.abs(u - 0.15) < 0.09 - half * 0.4) { R = 0.80; G = 0.15; B = 0.13; }
        else if (v >= 0.44) {
          if (u > 0.125 && u < 0.175 && v > 0.50) { R = 0.24; G = 0.17; B = 0.13; }
          else { R = 0.93; G = 0.87; B = 0.72; }
        }
      }
      /* 白色栅栏：规则的饱和边缘 */
      if (v > 0.63 && v < 0.79 && u > 0.30 && u < 0.62) {
        if (Math.floor(x / 3) % 2) { R = 0.96; G = 0.95; B = 0.90; }
        else { R = 0.14; G = 0.13; B = 0.12; }
      }
      /* 红白高频棋盘：色度采样的极限压力测试 */
      if (v > 0.82 && u > 0.66) {
        if ((Math.floor(x / 3) + Math.floor(y / 3)) % 2) { R = 0.98; G = 0.97; B = 0.94; }
        else { R = 0.95; G = 0.10; B = 0.12; }
      }
      const i = y * w + x;
      r[i] = clamp(R, 0, 1);
      g[i] = clamp(G, 0, 1);
      b[i] = clamp(B, 0, 1);
    }
  }
  return { r, g, b };
}

/* ---------- 画布小工具 ---------- */
function rgbCanvas(r, g, b, w, h, map) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c2 = cv.getContext('2d');
  const im = c2.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    let R = r[i]; let G = g === null ? r[i] : g[i]; let B = b === null ? r[i] : b[i];
    if (map) {
      const o = map(R, G, B, i);
      R = o[0]; G = o[1]; B = o[2];
    }
    im.data[i * 4] = Math.round(clamp(R, 0, 1) * 255);
    im.data[i * 4 + 1] = Math.round(clamp(G, 0, 1) * 255);
    im.data[i * 4 + 2] = Math.round(clamp(B, 0, 1) * 255);
    im.data[i * 4 + 3] = 255;
  }
  c2.putImageData(im, 0, 0);
  return cv;
}

function box(ctx, p, C) {
  ctx.strokeStyle = C.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w, p.h);
}

/* 色度平面上采样（最近邻），与子采样时的均值口径对应 */
function upChroma(c, cw, ch, w, h) {
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const sy = Math.min(ch - 1, Math.floor((y * ch) / h));
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(cw - 1, Math.floor((x * cw) / w));
      out[y * w + x] = c[sy * cw + sx];
    }
  }
  return out;
}

/* 4:2:2：只对横向减半（引擎只提供 4:2:0，这里就地做横向两点均值，同一口径） */
function chromaSubsample422(w, h, u, v) {
  const cw = Math.ceil(w / 2);
  const su = new Float64Array(cw * h);
  const sv = new Float64Array(cw * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const i0 = y * w + x * 2;
      const i1 = y * w + Math.min(w - 1, x * 2 + 1);
      su[y * cw + x] = (u[i0] + u[i1]) / 2;
      sv[y * cw + x] = (v[i0] + v[i1]) / 2;
    }
  }
  return { u: su, v: sv, cw, ch: h };
}

export default function render(host, spec) {
  const s = {
    mode: spec.mode === 'sub' ? 'sub' : 'split',
    zoom: spec.zoom ?? 3,
    gain: spec.gain ?? 6,
  };
  const src = sceneRGB(W0, H0);
  const Y = new Float64Array(W0 * H0);
  const U = new Float64Array(W0 * H0);
  const V = new Float64Array(W0 * H0);
  for (let i = 0; i < W0 * H0; i += 1) {
    const o = rgbToYuv(src.r[i], src.g[i], src.b[i]);
    Y[i] = o.y; U[i] = o.u; V[i] = o.v;
  }

  /* 三种子采样格式的重建结果，只算一次 */
  const s422 = chromaSubsample422(W0, H0, U, V);
  const s420 = chromaSubsample420(W0, H0, U, V);
  function rebuild(mode) {
    let uu = U; let vv = V;
    if (mode === '422') { uu = upChroma(s422.u, s422.cw, s422.ch, W0, H0); vv = upChroma(s422.v, s422.cw, s422.ch, W0, H0); }
    if (mode === '420') { uu = upChroma(s420.u, s420.cw, s420.ch, W0, H0); vv = upChroma(s420.v, s420.cw, s420.ch, W0, H0); }
    const r = new Float64Array(W0 * H0);
    const g = new Float64Array(W0 * H0);
    const b = new Float64Array(W0 * H0);
    for (let i = 0; i < W0 * H0; i += 1) {
      const o = yuvToRgb(Y[i], uu[i], vv[i]);
      r[i] = clamp(o.r, 0, 1); g[i] = clamp(o.g, 0, 1); b[i] = clamp(o.b, 0, 1);
    }
    return { r, g, b };
  }
  const rec = { p444: rebuild('444'), p422: rebuild('422'), p420: rebuild('420') };

  let cx = 0.30 * W0;      // 放大裁切窗口中心（默认压在房子与栅栏的边缘上）
  let cy = 0.52 * H0;
  let hov = null;
  const rects = [];          // 当前可命中的图像矩形（每帧重填）

  const cv = setupCanvas(host, 420);

  const seg = buildSegmented(
    [
      { label: '通道拆分', value: 'split' },
      { label: '色度子采样', value: 'sub' },
    ],
    s.mode,
    (v) => {
      s.mode = v;
      roA.box.style.display = v === 'split' ? '' : 'none';
      roB.box.style.display = v === 'sub' ? '' : 'none';
      draw();
    },
  );
  host.appendChild(seg);

  const roA = buildReadout({ 坐标: '—', 'R,G,B': '—', 'Y,U,V': '—' });
  const roB = buildReadout({
    码率: '—', '最大色差': '—', '平均色差': '—', 裁切: '—',
  });
  host.appendChild(roA.box);
  host.appendChild(roB.box);
  roA.box.style.display = s.mode === 'split' ? '' : 'none';
  roB.box.style.display = s.mode === 'sub' ? '' : 'none';

  /* ---------- 模式一：通道拆分 ---------- */
  function drawSplit(ctx, W, H, C) {
    const pad = 8;
    const rowH = (H - pad * 3) / 2;
    const cellW = (W - pad * 5) / 4;
    const imgH = rowH - 20;
    const imgW = Math.min(cellW - 6, imgH * AR);
    const hh = imgW / AR;

    const rows = [
      [
        { t: '原图 RGB', c: rgbCanvas(src.r, src.g, src.b, W0, H0) },
        { t: 'R 通道', c: rgbCanvas(src.r, null, null, W0, H0, (R) => [R, 0, 0]) },
        { t: 'G 通道', c: rgbCanvas(src.g, null, null, W0, H0, (R) => [0, R, 0]) },
        { t: 'B 通道', c: rgbCanvas(src.b, null, null, W0, H0, (R) => [0, 0, R]) },
      ],
      [
        { t: '原图（= YUV 合起来）', c: rgbCanvas(src.r, src.g, src.b, W0, H0) },
        { t: 'Y 亮度：细节全在这儿', c: rgbCanvas(Y, null, null, W0, H0, (R) => [R, R, R]) },
        { t: 'U 色度（蓝−黄）', c: rgbCanvas(U, V, null, W0, H0, (u1, v1) => [yuvToRgb(0.5, u1, 0.5).r, yuvToRgb(0.5, u1, 0.5).g, yuvToRgb(0.5, u1, 0.5).b]) },
        { t: 'V 色度（红−绿）', c: rgbCanvas(V, U, null, W0, H0, (v1) => [yuvToRgb(0.5, 0.5, v1).r, yuvToRgb(0.5, 0.5, v1).g, yuvToRgb(0.5, 0.5, v1).b]) },
      ],
    ];
    rows.forEach((row, ri) => {
      const y0 = pad + ri * (rowH + pad);
      row.forEach((it, ci) => {
        const x0 = pad + ci * (cellW + pad);
        label(ctx, it.t, x0 + 2, y0 + 12, C.fg, { size: 11 });
        const bx = x0 + (cellW - imgW) / 2;
        const by = y0 + 18;
        blit(ctx, it.c, bx, by, imgW, hh);
        box(ctx, { x: bx, y: by, w: imgW, h: hh }, C);
        if (ri === 0 && ci === 0) rects.push({ x: bx, y: by, w: imgW, h: hh, kind: 'split' });
      });
    });
    label(ctx, '三通道长得都很像 = 高度相关，这就是换一种表示法的理由；'
      + '换到 YUV 后细节全挤进 Y，U/V 大片平坦 —— 于是 U/V 可以降分辨率。',
      pad + 2, H - 6, C.fg, { size: 11 });

    if (hov) {
      const i = hov.j * W0 + hov.i;
      roA.set('坐标', `(${hov.i}, ${hov.j})`);
      roA.set('R,G,B', `${Math.round(src.r[i] * 255)}, ${Math.round(src.g[i] * 255)}, ${Math.round(src.b[i] * 255)}`);
      roA.set('Y,U,V', `${fmt(Y[i], 3)} / ${fmt(U[i], 3)} / ${fmt(V[i], 3)}`);
    } else {
      roA.set('坐标', '—');
      roA.set('R,G,B', '把鼠标移到原图上读像素');
      roA.set('Y,U,V', '—');
    }
  }

  /* ---------- 模式二：色度子采样 ---------- */
  function diffStats(a, b) {
    let mx = 0; let sum = 0;
    for (let i = 0; i < a.r.length; i += 1) {
      const d = Math.max(
        Math.abs(a.r[i] - b.r[i]), Math.abs(a.g[i] - b.g[i]), Math.abs(a.b[i] - b.b[i]),
      );
      sum += d;
      if (d > mx) mx = d;
    }
    return { mx, mean: sum / a.r.length };
  }

  function drawSub(ctx, W, H, C) {
    const pad = 8;
    const topH = Math.max(120, (H - pad * 3) * 0.5);
    const botH = H - pad * 3 - topH;
    const cellW = (W - pad * 4) / 3;
    const imgW = Math.min(cellW - 8, (topH - 20) * AR);
    const imgH = imgW / AR;

    const items = [
      { t: '4:4:4 不降色度（3 字节/像素）', im: rec.p444 },
      { t: '4:2:2 横向减半（2 字节/像素）', im: rec.p422 },
      { t: '4:2:0 横竖各减半（1.5 字节/像素）', im: rec.p420 },
    ];
    const n = Math.max(6, Math.round(56 / s.zoom));
    const ox = Math.round(clamp(cx - n / 2, 0, W0 - n));
    const oy = Math.round(clamp(cy - n / 2, 0, H0 - n));
    const diffs = {
      p422: diffStats(rec.p444, rec.p422),
      p420: diffStats(rec.p444, rec.p420),
    };

    items.forEach((it, ci) => {
      const x0 = pad + ci * (cellW + pad);
      label(ctx, it.t, x0 + 2, pad + 12, C.fg, { size: 11 });
      const bx = x0 + (cellW - imgW) / 2;
      const by = pad + 18;
      blit(ctx, rgbCanvas(it.im.r, it.im.g, it.im.b, W0, H0), bx, by, imgW, imgH);
      box(ctx, { x: bx, y: by, w: imgW, h: imgH }, C);
      /* 裁切窗口指示 */
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        bx + (ox / W0) * imgW, by + (oy / H0) * imgH,
        Math.max(3, (n / W0) * imgW), Math.max(3, (n / H0) * imgH),
      );
      rects.push({ x: bx, y: by, w: imgW, h: imgH, kind: 'crop', n, ox, oy });
    });

    /* 底部：放大裁切 + 差值放大 */
    const side = Math.min(cellW - 10, botH - 24);
    const crops = [
      { t: `4:4:4 放大 ${n}×${n}`, im: rec.p444 },
      { t: `4:2:0 放大 ${n}×${n}`, im: rec.p420 },
    ];
    function cropCv(im) {
      const r = new Float64Array(n * n);
      const g = new Float64Array(n * n);
      const b = new Float64Array(n * n);
      for (let j = 0; j < n; j += 1) {
        for (let i = 0; i < n; i += 1) {
          const k = (oy + j) * W0 + ox + i;
          r[j * n + i] = im.r[k]; g[j * n + i] = im.g[k]; b[j * n + i] = im.b[k];
        }
      }
      return rgbCanvas(r, g, b, n, n);
    }
    crops.forEach((it, ci) => {
      const x0 = pad + ci * (cellW + pad);
      const y0 = pad * 2 + topH;
      label(ctx, it.t, x0 + 2, y0 + 12, C.fg, { size: 11 });
      const bx = x0 + (cellW - side) / 2;
      const by = y0 + 18;
      blit(ctx, cropCv(it.im), bx, by, side, side);
      box(ctx, { x: bx, y: by, w: side, h: side }, C);
    });
    /* 第三格：差值放大 */
    const x0 = pad + 2 * (cellW + pad);
    const y0 = pad * 2 + topH;
    label(ctx, `色差 × ${Math.round(s.gain)}（放大后才看得见）`, x0 + 2, y0 + 12, C.fg, { size: 11 });
    const bx = x0 + (cellW - side) / 2;
    const by = y0 + 18;
    const dr = new Float64Array(n * n);
    const dg = new Float64Array(n * n);
    const db = new Float64Array(n * n);
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const k = (oy + j) * W0 + ox + i;
        dr[j * n + i] = Math.abs(rec.p444.r[k] - rec.p420.r[k]) * s.gain;
        dg[j * n + i] = Math.abs(rec.p444.g[k] - rec.p420.g[k]) * s.gain;
        db[j * n + i] = Math.abs(rec.p444.b[k] - rec.p420.b[k]) * s.gain;
      }
    }
    blit(ctx, rgbCanvas(dr, dg, db, n, n), bx, by, side, side);
    box(ctx, { x: bx, y: by, w: side, h: side }, C);

    roB.set('码率', '4:4:4 100% · 4:2:2 67% · 4:2:0 50%');
    roB.set('最大色差', `4:2:2 ${fmt(diffs.p422.mx * 255, 0)}/255 · 4:2:0 ${fmt(diffs.p420.mx * 255, 0)}/255`);
    roB.set('平均色差', `4:2:2 ${fmt(diffs.p422.mean * 255, 2)} · 4:2:0 ${fmt(diffs.p420.mean * 255, 2)}（单位 1/255）`);
    roB.set('裁切', `${n}×${n} @ (${ox}, ${oy})`);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    rects.length = 0;
    if (s.mode === 'split') drawSplit(ctx, W, H, C);
    else drawSub(ctx, W, H, C);
  }

  /* ---- 指针：拆分模式悬停读像素，子采样模式拖动裁切窗口 ---- */
  const hit = (x, y) => rects.find(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
  let drag = null;
  bindPointer(cv.canvas, {
    pick(x, y) {
      const r = hit(x, y);
      return r ? r.kind : null;
    },
    down(id, x, y) {
      const r = hit(x, y);
      if (id === 'crop' && r) drag = { x0: x, y0: y, cx0: cx, cy0: cy, r };
    },
    move(id, x, y) {
      if (id !== 'crop' || !drag) return;
      const r = drag.r;
      const sx = r.w / W0;
      const sy = r.h / H0;
      cx = clamp(drag.cx0 + (x - drag.x0) / sx, r.n / 2, W0 - r.n / 2);
      cy = clamp(drag.cy0 + (y - drag.y0) / sy, r.n / 2, H0 - r.n / 2);
      draw();
    },
    up() { drag = null; },
    hover(x, y, activeId) {
      if (activeId || s.mode !== 'split') return;
      const r = hit(x, y);
      if (r) {
        const i = clamp(Math.floor(((x - r.x) / r.w) * W0), 0, W0 - 1);
        const j = clamp(Math.floor(((y - r.y) / r.h) * H0), 0, H0 - 1);
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
      if (hov) { hov = null; draw(); }
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'zoom', label: '裁切放大', min: 1, max: 8, step: 1, value: s.zoom },
        { name: 'gain', label: '差值增益', min: 1, max: 16, step: 1, value: s.gain },
      ],
    },
    (st) => {
      s.zoom = st.zoom;
      s.gain = st.gain;
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return {
    slidersBox: sliders.box,
    destroy() { /* 无动画、无音频 */ },
  };
}
