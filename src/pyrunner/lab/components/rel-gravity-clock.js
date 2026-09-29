/* =========================================================================
 * lab 组件：rel-gravity-clock —— 高度 vs 钟速：GPS 那 38 微秒是怎么来的
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "rel-gravity-clock", "title": "拖高度看两个效应怎么打架", "h": 20200 }
 *   ```
 *
 * 字段：h  轨道高度（km，地面以上），0..40000，默认 20200（GPS 卫星的高度）
 *
 * 能拖什么：
 *   ① 画布上的竖直游标 —— 左右拖，看三条曲线上的读数一起变；
 *   ② 高度滑块。鼠标悬停在图上还会显示"如果钟在这个高度"的三个数。
 *
 * 看什么：
 *   蓝线是引力红移（越高钟越快），橙线是运动时间膨胀（飞得越快钟越慢），
 *   绿线是两者之和 —— 真实卫星钟走的速率。绿线在 h ≈ 3186 km（r = 1.5 R⊕）穿过零：
 *   那个高度的圆轨道上，两个效应对消。GPS 在 20200 km，绿线落在 +38.5 μs/天，
 *   不做修正的话，地面定位每天会漂 11 公里以上。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  polyline, label, fmt, clamp,
} from '../core.js';

const GM = 3.986004418e14;    /* 地球引力常数 GM（m³/s²） */
const RE = 6.371e6;           /* 地球平均半径（m） */
const CC = 299792458;         /* 光速（m/s） */
const GMc2 = GM / (CC * CC);  /* GM/c²，单位是米 */
const H_MAX = 40000;          /* 横轴：地面以上高度 0..40000 km */
const V_MIN = -35;            /* 纵轴：μs/天 */
const V_MAX = 65;
const DAY = 86400;

/* 三项速率，单位 μs/天 */
function rates(hkm) {
  const r = RE + hkm * 1000;
  const gr = GMc2 * (1 / RE - 1 / r) * DAY * 1e6;   /* 引力：钟在高处走得快 */
  const sr = -(GM / r) / (2 * CC * CC) * DAY * 1e6; /* 速度：圆轨道 v = √(GM/r) */
  return { gr, sr, net: gr + sr, r };
}

function pickSlider(spec, name, def) {
  const s = (spec.sliders || []).find((it) => it && it.name === name);
  return s ? { name, label: s.label || def.label, min: s.min, max: s.max, step: s.step, value: s.value } : def;
}

export default function render(host, spec) {
  let h = clamp(Number(spec.h ?? 20200), 0, H_MAX);
  let hover = null;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({ 高度: '—', 引力项: '—', 速度项: '—', 净效应: '—', 光标: '—' });
  host.appendChild(ro.box);

  const geo = { x0: 0, x1: 0, y0: 0, y1: 0 };
  const XH = (km) => geo.x0 + (km / H_MAX) * (geo.x1 - geo.x0);
  const YV = (v) => geo.y1 - ((v - V_MIN) / (V_MAX - V_MIN)) * (geo.y1 - geo.y0);
  const iXH = (px) => ((px - geo.x0) / (geo.x1 - geo.x0)) * H_MAX;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W, H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    geo.x0 = 62;
    geo.x1 = W - 18;
    geo.y0 = 34;
    geo.y1 = H - 44;

    /* 网格与坐标轴 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let km = 0; km <= H_MAX; km += 5000) {
      ctx.moveTo(XH(km) + 0.5, geo.y0);
      ctx.lineTo(XH(km) + 0.5, geo.y1);
    }
    for (let v = V_MIN; v <= V_MAX; v += 10) {
      ctx.moveTo(geo.x0, YV(v) + 0.5);
      ctx.lineTo(geo.x1, YV(v) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(geo.x0, YV(0) + 0.5);
    ctx.lineTo(geo.x1, YV(0) + 0.5);
    ctx.moveTo(geo.x0 + 0.5, geo.y0);
    ctx.lineTo(geo.x0 + 0.5, geo.y1);
    ctx.stroke();
    for (let km = 0; km <= H_MAX; km += 10000) {
      label(ctx, `${km / 1000}`, XH(km), geo.y1 + 16, C.axis, { size: 9, align: 'center' });
    }
    for (let v = V_MIN; v <= V_MAX; v += 20) {
      label(ctx, `${v}`, geo.x0 - 6, YV(v) + 3, C.axis, { size: 9, align: 'right' });
    }
    label(ctx, '轨道高度（千公里，地面以上）', geo.x1, geo.y1 + 32, C.axis,
      { size: 10, align: 'right' });
    label(ctx, '每天快多少（微秒/天）', geo.x0 - 56, geo.y0 - 12, C.fg,
      { size: 10, weight: 600 });

    /* 三条曲线 */
    const curve = (pick, col, w) => {
      const pts = [];
      for (let km = 0; km <= H_MAX; km += 250) pts.push([XH(km), YV(clamp(pick(km), V_MIN, V_MAX))]);
      polyline(ctx, pts, col, w);
    };
    curve((km) => rates(km).gr, C.named('blue'), 1.8);
    curve((km) => rates(km).sr, C.named('orange'), 1.8);
    curve((km) => rates(km).net, C.ok, 2.6);

    /* 零交叉：r = 1.5 R⊕ */
    const hZero = 1.5 * RE / 1000 - RE / 1000;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(XH(hZero) + 0.5, YV(0));
    ctx.lineTo(XH(hZero) + 0.5, geo.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `净效应为零：h ≈ ${fmt(hZero, 0)} km（r = 1.5 R⊕）`, XH(hZero) + 6, geo.y1 - 6,
      C.fg, { size: 10 });

    /* GPS 参考线 */
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(XH(20200) + 0.5, geo.y0);
    ctx.lineTo(XH(20200) + 0.5, geo.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    const gps = rates(20200);
    label(ctx, `GPS：${fmt(gps.net, 1)} μs/天`, XH(20200) - 6, geo.y0 + 12, C.accent2,
      { size: 10, align: 'right', weight: 600 });

    /* 曲线图例 */
    const legend = (i, col, txt) => {
      const yy = geo.y0 + 4 + i * 15;
      ctx.fillStyle = col;
      ctx.fillRect(geo.x0 + 10, yy - 5, 12, 3);
      label(ctx, txt, geo.x0 + 27, yy, col, { size: 10 });
    };
    legend(0, C.named('blue'), '引力红移（越高越快）');
    legend(1, C.named('orange'), '运动时间膨胀（越快越慢）');
    legend(2, C.ok, '净效应 = 两者之和');

    /* 悬停幽灵游标 */
    if (hover) {
      const hv = rates(clamp(iXH(hover.px), 0, H_MAX));
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hover.px + 0.5, geo.y0);
      ctx.lineTo(hover.px + 0.5, geo.y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hover.px, YV(clamp(hv.net, V_MIN, V_MAX)), 4, 0, Math.PI * 2);
      ctx.fillStyle = C.axis;
      ctx.fill();
    }

    /* 拖动游标 */
    const cur = rates(h);
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(XH(h) + 0.5, geo.y0);
    ctx.lineTo(XH(h) + 0.5, geo.y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(XH(h), YV(clamp(cur.net, V_MIN, V_MAX)), 7, 0, Math.PI * 2);
    ctx.fillStyle = C.ok;
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, `h = ${fmt(h, 0)} km`, XH(h) + 8, geo.y1 - 24, C.fg, { size: 11, weight: 700 });

    ro.set('高度', `h = ${fmt(h, 0)} km（地心距 r = ${fmt(cur.r / 1000, 0)} km = ${fmt(cur.r / RE, 2)} R⊕）`);
    ro.set('引力项', `+${fmt(cur.gr, 2)} μs/天（广义相对论：钟在高处走得快）`);
    ro.set('速度项', `${fmt(cur.sr, 2)} μs/天（狭义相对论：钟在动，走得慢）`);
    ro.set('净效应', `${cur.net > 0 ? '+' : ''}${fmt(cur.net, 2)} μs/天 → 一天差 ${fmt(Math.abs(cur.net), 2)} μs，一天定位漂 ${fmt(Math.abs(cur.net) * 1e-6 * CC / 1000, 2)} km`);
    ro.set('光标', hover ? `h = ${fmt(clamp(iXH(hover.px), 0, H_MAX), 0)} km → 净 ${fmt(rates(clamp(iXH(hover.px), 0, H_MAX)).net, 2)} μs/天` : '—');
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      return x >= geo.x0 && x <= geo.x1 && y >= geo.y0 && y <= geo.y1 ? 'h' : null;
    },
    move(id, x) {
      h = clamp(Math.round(iXH(x) / 50) * 50, 0, H_MAX);
      draw();
    },
    hover(x, y) {
      const inBox = x >= geo.x0 && x <= geo.x1 && y >= geo.y0 && y <= geo.y1;
      hover = inBox ? { px: x, py: y } : null;
      draw();
    },
    leave() { hover = null; draw(); },
  });
  cv.canvas.style.cursor = 'ew-resize';

  const sl = buildSliders({
    sliders: [pickSlider(spec, 'h', {
      name: 'h', label: '轨道高度 km', min: 0, max: H_MAX, step: 100, value: h,
    })],
  }, (st) => {
    h = clamp(st.h ?? h, 0, H_MAX);
    draw();
  });

  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box };
}
