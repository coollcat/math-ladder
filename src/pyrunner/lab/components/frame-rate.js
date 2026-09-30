/* =========================================================================
 * lab 组件：frame-rate —— 视频是图像序列，帧率就是时间轴上的采样率
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "frame-rate",
 *     "title": "把帧率拖到 6 fps，看运动怎么变成幻灯片",
 *     "fps": 8,
 *     "speed": 0.35
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：fps 默认 8，速度默认 0.35 周期/秒。
 *
 * 字段：
 *   fps    初始帧率 2..60，默认 8（故意从「看得见的卡」起步）
 *   speed  运动速度，每秒跑多少个来回周期，0.1..1.5，默认 0.35
 *
 * 能拖什么：
 *   帧率滑块 / 速度滑块（点「播放」后一边播一边拖，卡顿感当场变）；
 *   在下方时间轴上左右拖动 = 手动拖时间（ scrub ），两幅画面与所有采样点跟着走。
 *
 * 看什么：
 *   上排两幅画面：左边是 60 fps 参考（跟着真实时间连续走），右边是选定帧率
 *   （时间被量化到 1/fps 的格子上）。下面是「时间轴上的采样点」：一条正弦是
 *   小球真实的连续轨迹，圆点是各帧率采到的位置 —— 采样越稀，点连成的折线
 *   离真实轨迹越远，画面上就是一顿一顿的跳。再往下是 6 / 12 / 24 / 60 四行
 *   固定对照，一眼看出「24 fps 是电影的妥协、60 fps 才是流畅」这句话的形状。
 *
 * 用的引擎函数：synth（'moving-ball' 与 'stripes' 两种模式合成场景）
 * 画面来源：synth 程序化生成，不依赖外部视频或图片。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, anim, buildReadout, label, polyline,
  fmt, clamp, toCanvas,
  clearBg,
} from '../core.js';
import { synth } from '../engines/media.js';

const IW = 96;
const IH = 72;
const LANES = [6, 12, 24, 60];

/* 场景：一个小球沿正弦轨迹左右跑，背景是缓慢横移的条纹（顺带展示时间混叠）。
   tc 以「周期」为单位，posAt 就是时间轴那张图里的连续轨迹。 */
function posAt(tc) {
  return 0.5 + 0.35 * Math.sin(2 * Math.PI * tc);
}

function sceneAt(tc) {
  const pos = posAt(tc);
  /* 复用引擎的 moving-ball：它内部是 cx = 0.2 + 0.6 * ((t/60) % 1)，
     把 pos 反解成它要的 t，就能让小球停在任意指定位置。 */
  const ball = synth(IW, IH, 'moving-ball', ((pos - 0.2) / 0.6) * 60);
  const stripes = synth(IW, IH, 'stripes', 2 * Math.PI * tc);
  const img = new Float64Array(IW * IH);
  for (let i = 0; i < img.length; i += 1) {
    img[i] = clamp(0.28 * stripes[i] + 0.72 * ball[i], 0, 1);
  }
  return img;
}

export default function render(host, spec) {
  let fps = clamp(Math.round(spec.fps ?? 8), 2, 60);
  let speed = clamp(spec.speed ?? 0.35, 0.1, 1.5);
  let tc = 0;             /* 连续时间（周期） */
  let curCache = { k: -1, cv: null };

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    帧率: '—', 参考位置: '—', 当前帧位置: '—', 时间量化误差: '—',
  });
  host.appendChild(ro.box);

  const geo = { padL: 52, padR: 14, t0y: 0, curY: 0, curH: 56, laneY: 0, laneH: 24, plotW: 0 };

  function curCanvas() {
    const k = Math.floor(tc * fps);
    if (curCache.k !== k) {
      curCache = { k, cv: toCanvas(sceneAt(k / fps), IW, IH) };
    }
    return curCache.cv;
  }

  function xOf(t) {
    return geo.padL + t * geo.plotW;
  }
  function yOfLane(p, y, h) {
    return y + h - 4 - p * (h - 12);   /* p∈[0,1] 位置 → 像素 y */
  }

  /* 画一条时间轴：连续轨迹 + 采样点（lollipop） */
  function drawLane(ctx, C, y, h, rate, opts) {
    const on = opts.highlight;
    label(ctx, `${rate} fps`, 8, y + h / 2 + 4, on ? C.accent : C.axis, { size: 11, weight: on ? 700 : 400 });

    /* 连续轨迹 */
    const curve = [];
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120;
      curve.push([xOf(t), yOfLane(posAt(t), y, h)]);
    }
    polyline(ctx, curve, on ? C.accent : C.grid, 1.2);

    /* 采样点 */
    const n = Math.max(1, Math.round(rate));
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      if (t > 1.0001) break;
      const px = xOf(t);
      const py = yOfLane(posAt(t), y, h);
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, y + h - 2);
      ctx.lineTo(px, py);
      ctx.stroke();
      const isNow = on && i === Math.floor(tc * rate) % Math.max(1, n);
      ctx.fillStyle = isNow ? C.accent2 : on ? C.accent : C.axis;
      ctx.beginPath();
      ctx.arc(px, py, isNow ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (isNow) {
        ctx.strokeStyle = C.bg;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const gap = 16;
    const pw = Math.min(180, (W - 20 - gap) / 2);
    const off = Math.max(10, (W - (pw * 2 + gap)) / 2);
    const ph = Math.round((pw * IH) / IW);
    const topY = 22;

    const ra = { x: off, y: topY, w: pw, h: ph };
    const rb = { x: off + pw + gap, y: topY, w: pw, h: ph };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(toCanvas(sceneAt(tc), IW, IH), ra.x, ra.y, ra.w, ra.h);
    ctx.drawImage(curCanvas(), rb.x, rb.y, rb.w, rb.h);
    ctx.restore();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(ra.x + 0.5, ra.y + 0.5, ra.w - 1, ra.h - 1);
    ctx.strokeRect(rb.x + 0.5, rb.y + 0.5, rb.w - 1, rb.h - 1);
    label(ctx, '参考：每个动画帧都重新采样（≈60 fps）', ra.x, ra.y - 6, C.fg, { size: 11, weight: 600 });
    label(ctx, `当前：${fps} fps，每 ${fmt(1000 / fps, 1)} ms 才换一张`, rb.x, rb.y - 6, C.accent,
      { size: 11, weight: 600 });

    /* 当前帧号角标 */
    const kNow = Math.floor(tc * fps);
    label(ctx, `第 ${kNow} 帧`, rb.x + rb.w - 4, rb.y + rb.h - 6, C.accent2, { size: 11, align: 'right' });

    /* ---- 时间轴 ---- */
    geo.plotW = W - geo.padL - geo.padR;
    const curY = topY + ph + 34;
    geo.curY = curY;
    geo.curH = 58;
    label(ctx, '时间轴：横轴是一个周期的时间，纵轴是小球的位置', 10, curY - 8, C.fg, { size: 11, weight: 600 });
    drawLane(ctx, C, curY, geo.curH, fps, { highlight: true });

    /* 播放头 */
    const pxNow = xOf(tc - Math.floor(tc));
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(pxNow, curY);
    ctx.lineTo(pxNow, curY + geo.curH);
    ctx.stroke();
    ctx.setLineDash([]);

    const laneY = curY + geo.curH + 26;
    geo.laneY = laneY;
    geo.laneH = 24;
    label(ctx, '对照：同样的运动，不同帧率采到的点', 10, laneY - 8, C.fg, { size: 11, weight: 600 });
    LANES.forEach((rate, i) => {
      drawLane(ctx, C, laneY + i * geo.laneH, geo.laneH, rate, { highlight: rate === fps });
    });

    /* 底边时间刻度 */
    const baseY = laneY + LANES.length * geo.laneH + 2;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(geo.padL, baseY + 0.5);
    ctx.lineTo(W - geo.padR, baseY + 0.5);
    ctx.stroke();
    for (let i = 0; i <= 4; i += 1) {
      const t = i / 4;
      label(ctx, `${fmt(t * (1 / speed) * 1000, 0)} ms`, xOf(t), baseY + 13, C.axis,
        { size: 10, align: 'center' });
    }

    label(ctx, '拖动时间轴 = 手动拖时间；点「播放」后拖帧率滑块，卡顿感当场变',
      10, H - 4, C.accent, { size: 11 });

    /* 数字：时间量化造成的空间误差 */
    const posTrue = posAt(tc);
    const posShown = posAt(Math.floor(tc * fps) / fps);
    ro.set('帧率', `${fps} fps（帧间隔 ${fmt(1000 / fps, 1)} ms，每周期 ${fps} 个采样点）`);
    ro.set('参考位置', fmt(posTrue, 3));
    ro.set('当前帧位置', fmt(posShown, 3));
    ro.set('时间量化误差', `${fmt(Math.abs(posTrue - posShown), 3)} ≈ ${fmt(Math.abs(posTrue - posShown) * IW, 1)} 像素的跳动`);
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y >= geo.curY - 14 && y <= geo.laneY + LANES.length * geo.laneH && geo.plotW > 0) return 'scrub';
      return null;
    },
    down(id, x) { scrub(x); },
    move(id, x) { scrub(x); },
  });

  function scrub(x) {
    const t = clamp((x - geo.padL) / geo.plotW, 0, 0.9999);
    tc = Math.floor(tc) + t;
    curCache = { k: -1, cv: null };
    draw();
  }

  const controls = anim(host, {
    onTick(dt) {
      tc += dt * speed;
      if (tc > 1e6) tc = 0;
      curCache.k = -1;
      draw();
    },
    onReset() {
      tc = 0;
      curCache = { k: -1, cv: null };
      draw();
    },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'fps', label: '帧率', min: 2, max: 60, step: 1, value: fps, fmt: 0 },
        { name: 'speed', label: '速度', min: 0.1, max: 1.5, step: 0.05, value: speed, fmt: 2 },
      ],
    },
    (st) => {
      fps = clamp(Math.round(st.fps ?? fps), 2, 60);
      speed = clamp(st.speed ?? speed, 0.1, 1.5);
      curCache = { k: -1, cv: null };
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { controls.stop(); } };
}
