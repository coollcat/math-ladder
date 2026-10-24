/* =========================================================================
 * lab 组件：great-circle-lab —— 球面三角与大圆航线（拖两点，看最短路径）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "great-circle-lab",
 *     "title": "北京到纽约：为什么拐进北冰洋",
 *     "mode": "route",
 *     "a": [116.4, 39.9],
 *     "b": [-74.0, 40.7]
 *   }
 *   ```
 *
 * 字段（都有默认值，只写 type + title 也能渲染）：
 *   mode   "route"（两点航线，默认）| "triangle"（球面三角形，多一个 C 点）
 *          | "parallel"（纬线对照：同一纬度上两点，大圆 vs 纬线，附测地曲率）
 *          工具条按钮会顺带切到自己的模式（北极三直角 → triangle，同纬度两点 → parallel）。
 *   a / b  [经度, 纬度]（度），默认北京与纽约
 *   c      [经度, 纬度]，只有 triangle 模式用，默认赤道与本初子午线交点
 *   lon0 / lat0  初始视角中心经/纬度，默认 (-20, 25)
 *
 * 「完美教具」五问：
 *   1. 动手量：直接拖球面上的 A、B（triangle 模式还多一个 C）——拖的就是
 *      "这两座城市在哪"这个自由参数；拖空白处转地球（x/y 两轴各管经度与纬度）。
 *   2. 即时后果：同一帧里大圆弧重算重画，读数条同步刷新。
 *   3. 读数：中心角 σ、大圆距离 R·σ、初始方位角；triangle 模式加内角和与角盈。
 *      数字与正文公式一一对应：σ = arccos(sinφ₁sinφ₂ + cosφ₁cosφ₂cosΔλ)，
 *      角盈 E = A + B + C − π（按度显示时平面三角形恒为 180°）。
 *   4. 啊哈预设：「北京→纽约」一键回到那个反直觉画面——弧线甩到北纬 60° 以上；
 *      「赤道对径」给 σ = 180° 的极端（在 parallel 模式下顺带把 tan φ 归零）；
 *      「北极三直角」一键摆出 A=B=C=90°、角盈 90° ↔ 面积 πR²/2；
 *      「同纬度两点」切到 parallel 并给出 φ=60° 的 3336 vs 3220 km。
 *   5. 默认状态讲对故事：默认就是北京—纽约，两座城市纬度几乎相同（39.9° 与 40.7°），
 *      而弧线明显鼓向北——"同纬度不等于沿纬线走"这件事不点任何按钮也看得见。
 *
 * 口径：地球按正球体 R = 6371 km；投影是正交投影（不是墨卡托），
 * 背面的经纬网与弧段自动淡化，避免"把背面当正面"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildSegmented, buildToolbar,
  mkBtn, label, polyline, fmt, clamp, clearBg,
} from '../core.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const EARTH = 6371;

function vec(lon, lat) {
  const p = lat * D2R;
  const l = lon * D2R;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}
function toLonLat(v) {
  return [Math.atan2(v[1], v[0]) * R2D, Math.asin(clamp(v[2], -1, 1)) * R2D];
}
/* 中心角：atan2(|v1×v2|, v1·v2) 在小角度处比 arccos 稳 */
function angleOf(v1, v2) {
  const cx = v1[1] * v2[2] - v1[2] * v2[1];
  const cy = v1[2] * v2[0] - v1[0] * v2[2];
  const cz = v1[0] * v2[1] - v1[1] * v2[0];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  return Math.atan2(Math.hypot(cx, cy, cz), dot);
}
function slerp(v1, v2, t) {
  const om = angleOf(v1, v2);
  if (om < 1e-9) return v1.slice();
  const s = Math.sin(om);
  const w1 = Math.sin((1 - t) * om) / s;
  const w2 = Math.sin(t * om) / s;
  return [v1[0] * w1 + v2[0] * w2, v1[1] * w1 + v2[1] * w2, v1[2] * w1 + v2[2] * w2];
}
function bearingOf(lon1, lat1, lon2, lat2) {
  const dl = (lon2 - lon1) * D2R;
  const p1 = lat1 * D2R;
  const p2 = lat2 * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * R2D + 360) % 360;
}
/* 球面三角形内角：cos A = (cos a − cos b cos c) / (sin b sin c)，a,b,c 是三条边对应的中心角 */
function interiorAngle(a, b, c) {
  const den = Math.sin(b) * Math.sin(c);
  if (Math.abs(den) < 1e-12) return 0;
  return Math.acos(clamp((Math.cos(a) - Math.cos(b) * Math.cos(c)) / den, -1, 1));
}

export default function render(host, spec) {
  const P = {
    a: Array.isArray(spec.a) ? [Number(spec.a[0]), Number(spec.a[1])] : [116.4, 39.9],
    b: Array.isArray(spec.b) ? [Number(spec.b[0]), Number(spec.b[1])] : [-74.0, 40.7],
    c: Array.isArray(spec.c) ? [Number(spec.c[0]), Number(spec.c[1])] : [0, 0],
  };
  /* 纬线对照模式自带一对"同纬度"的默认点；给了 a/b 就照给的来（纬度取 A 的）。 */
  if (spec.mode === 'parallel') {
    if (!Array.isArray(spec.a)) P.a = [-30, 60];
    if (!Array.isArray(spec.b)) P.b = [30, 60];
    P.b = [P.b[0], P.a[1]];
  }
  let mode = spec.mode === 'triangle' ? 'triangle'
    : spec.mode === 'parallel' ? 'parallel' : 'route';
  let lon0 = Number.isFinite(spec.lon0) ? spec.lon0 : -20;
  let lat0 = Number.isFinite(spec.lat0) ? spec.lat0 : 25;

  const cv = setupCanvas(host, 380);
  cv.canvas.classList.add('ml-drag');
  const ro = buildReadout({ 中心角: '—', 距离: '—', 初始方位: '—', 内角和: '—', 角盈: '—' });
  host.appendChild(ro.box);
  /* 纬线对照模式读的是另一套量，键名必须跟着换——否则「中心角」下面写着公里数。 */
  const KEYS = {
    geo: ['中心角', '距离', '初始方位', '内角和', '角盈'],
    par: ['纬度 φ', '纬线圈半径', '沿纬线走', '沿大圆走', '测地曲率 k_g（单位球）'],
  };
  let keySet = 'geo';
  function useKeys(which) {
    if (which === keySet) return;
    const from = KEYS[keySet];
    const to = KEYS[which];
    for (let i = 0; i < from.length; i += 1) ro.setKey(from[i], to[i]);
    keySet = which;
  }

  const geo = { cx: 0, cy: 0, R: 1 };
  function project(lon, lat) {
    const p = lat * D2R;
    const dl = (lon - lon0) * D2R;
    const p0 = lat0 * D2R;
    const cp = Math.cos(p);
    return {
      x: geo.cx + geo.R * cp * Math.sin(dl),
      y: geo.cy - geo.R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cp * Math.cos(dl)),
      z: Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cp * Math.cos(dl),
    };
  }
  function unproject(px, py) {
    let x = (px - geo.cx) / geo.R;
    let y = (geo.cy - py) / geo.R;
    const r = Math.hypot(x, y);
    if (r > 0.999) { x = (x / r) * 0.999; y = (y / r) * 0.999; }
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    const p0 = lat0 * D2R;
    const lat = Math.asin(clamp(z * Math.sin(p0) + y * Math.cos(p0), -1, 1));
    const lon = lon0 * D2R + Math.atan2(x, z * Math.cos(p0) - y * Math.sin(p0));
    return [(((lon * R2D + 540) % 360) - 180), lat * R2D];
  }
  function shown() {
    return mode === 'triangle' ? [P.a, P.b, P.c] : [P.a, P.b];
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    geo.cx = W / 2;
    geo.cy = H / 2 + 4;
    geo.R = Math.min(W, H) * 0.43;

    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(geo.cx, geo.cy, geo.R, 0, Math.PI * 2);
    ctx.stroke();

    /* 经纬网：按 z 的正负拆成正面实线 / 背面虚线 */
    for (let lon = -180; lon < 180; lon += 30) {
      const front = [];
      const back = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        const q = project(lon, lat);
        (q.z >= 0 ? front : back).push([q.x, q.y]);
      }
      polyline(ctx, back, C.grid, 1, [3, 4]);
      polyline(ctx, front, C.grid, 1);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const front = [];
      const back = [];
      for (let lon = -180; lon <= 180; lon += 3) {
        const q = project(lon, lat);
        (q.z >= 0 ? front : back).push([q.x, q.y]);
      }
      const strong = lat === 0;
      polyline(ctx, back, C.grid, strong ? 1.2 : 1, [3, 4]);
      polyline(ctx, front, strong ? C.axis : C.grid, strong ? 1.2 : 1);
    }

    /* 大圆弧：逐段按 z 拆分，正面的亮、背面的淡 */
    const pts = shown().map((q) => vec(q[0], q[1]));
    const pairs = mode === 'triangle' ? [[0, 1], [1, 2], [2, 0]] : [[0, 1]];
    for (const pr of pairs) {
      const v1 = pts[pr[0]];
      const v2 = pts[pr[1]];
      let cur = [];
      let curFront = null;
      for (let k = 0; k <= 120; k += 1) {
        const ll = toLonLat(slerp(v1, v2, k / 120));
        const q = project(ll[0], ll[1]);
        const front = q.z >= 0;
        if (curFront === null) curFront = front;
        if (front !== curFront && cur.length) {
          polyline(ctx, cur, curFront ? C.accent : 'rgba(59,116,214,0.35)', curFront ? 2.6 : 2,
            curFront ? null : [5, 4]);
          cur = [];
          curFront = front;
        }
        cur.push([q.x, q.y]);
      }
      if (cur.length) {
        polyline(ctx, cur, curFront ? C.accent : 'rgba(59,116,214,0.35)', curFront ? 2.6 : 2,
          curFront ? null : [5, 4]);
      }
    }

    /* 纬线对照模式：把「同一纬度上那条纬线」画成虚线，与上面那条大圆弧同屏比 */
    if (mode === 'parallel') {
      const phi = P.a[1];
      const loop = [];
      for (let lon = -180; lon <= 180; lon += 3) {
        const q = project(lon, phi);
        loop.push([q.x, q.y, q.z]);
      }
      let run = [];
      let runFront = loop[0][2] >= 0;
      for (const q of loop) {
        const front = q[2] >= 0;
        if (front !== runFront && run.length) {
          polyline(ctx, run, runFront ? C.accent2 : 'rgba(232,135,30,0.35)', runFront ? 2.2 : 1.6,
            runFront ? [7, 4] : [4, 5]);
          run = [];
          runFront = front;
        }
        run.push([q[0], q[1]]);
      }
      if (run.length) {
        polyline(ctx, run, runFront ? C.accent2 : 'rgba(232,135,30,0.35)', runFront ? 2.2 : 1.6,
          runFront ? [7, 4] : [4, 5]);
      }
    }

    /* 顶点：两个（或三个）可拖圆点 */
    const names = mode === 'triangle' ? ['A', 'B', 'C'] : ['A', 'B'];
    const colors = [C.accent2, C.ok, C.bad];
    shown().forEach((q, i) => {
      const s = project(q[0], q[1]);
      const front = s.z >= 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = front ? colors[i] : C.soft;
      ctx.fill();
      ctx.strokeStyle = front ? colors[i] : C.axis;
      ctx.lineWidth = 2;
      ctx.stroke();
      label(ctx, names[i], s.x + 10, s.y - 7, C.fg, { size: 12, weight: 700 });
      label(ctx, fmt(q[0], 0) + '°, ' + fmt(q[1], 0) + '°', s.x + 10, s.y + 7, C.axis, { size: 10 });
    });

    label(ctx, '拖 A/B' + (mode === 'triangle' ? '/C' : '') + ' 换位置 · 拖空白处转地球', 10, 16, C.axis, { size: 11 });
    label(ctx,
      mode === 'triangle' ? '三段大圆弧围出球面三角形'
        : mode === 'parallel' ? '橙虚线 = 纬线 · 蓝实线 = 大圆（真最短）'
          : '大圆航线（球面最短路径）',
      W - 10, 16, C.accent, { size: 11, align: 'right' });

    /* ---- 读数：全部照正文公式 ---- */
    const vA = vec(P.a[0], P.a[1]);
    const vB = vec(P.b[0], P.b[1]);
    const sig = angleOf(vA, vB);

    if (mode === 'parallel') {
      /* 纬线对照：A 定纬度 φ，B 与 A 同纬度、经度差 Δλ；两条路线的账直接并列 */
      useKeys('par');
      const phi = P.a[1] * D2R;
      const dlam = Math.abs(((P.b[0] - P.a[0] + 540) % 360) - 180) * D2R;
      const latLen = 2 * Math.PI * EARTH * Math.cos(phi) * dlam / (2 * Math.PI);
      ro.set('纬度 φ', fmt(P.a[1], 1) + '°（A、B 同纬度，经度差 ' +
        fmt(dlam * R2D, 1) + '°）');
      ro.set('纬线圈半径', 'R·cos φ = ' + fmt(EARTH * Math.cos(phi), 1) + ' km（赤道 6371）');
      ro.set('沿纬线走', fmt(latLen, 0) + ' km（= R cos φ · Δλ）');
      ro.set('沿大圆走', fmt(EARTH * sig, 0) + ' km（中心角 ' + fmt(sig * R2D, 2) + '°）');
      /* 与 50 课 python 的实测口径对齐：单位球上的 k_g 恰为 tan φ（0 / 0.5774 / 1.7321）。
         真实地球再除以 R 才是"每公里拐多少"。 */
      ro.set('测地曲率 k_g（单位球）', Math.abs(P.a[1]) < 1e-6
        ? 'tan φ = 0 —— 赤道本身就是大圆，纬线即测地线'
        : 'tan φ = ' + fmt(Math.tan(phi), 4) + '（对照 python）· 除 R 得 '
          + fmt(Math.tan(phi) / EARTH, 6) + ' /km');
      return;
    }

    useKeys('geo');
    ro.set('中心角', fmt(sig * R2D, 2) + '° = ' + fmt(sig, 4) + ' rad');
    ro.set('距离', fmt(EARTH * sig, 0) + ' km（R = 6371 km）');
    ro.set('初始方位', fmt(bearingOf(P.a[0], P.a[1], P.b[0], P.b[1]), 1) + '°（从正北顺时针）');
    if (mode === 'triangle') {
      const vC = vec(P.c[0], P.c[1]);
      const sa = angleOf(vB, vC);
      const sb = angleOf(vA, vC);
      const sc = sig;
      const A1 = interiorAngle(sa, sb, sc);
      const B1 = interiorAngle(sb, sc, sa);
      const C1 = interiorAngle(sc, sa, sb);
      const sumDeg = (A1 + B1 + C1) * R2D;
      ro.set('内角和', fmt(sumDeg, 2) + '°（平面三角形恒为 180°）');
      ro.set('角盈', fmt(sumDeg - 180, 2) + '° ↔ 面积 ' +
        fmt(((sumDeg - 180) * D2R) * EARTH * EARTH / 1e6, 2) + ' 百万 km²');
    } else {
      ro.set('内角和', '—（切到球面三角形模式）');
      ro.set('角盈', '—');
    }
  }
  draw();
  cv.redraw = draw;

  const seg = buildSegmented(
    [
      { label: '两点航线', value: 'route' },
      { label: '球面三角形', value: 'triangle' },
      { label: '纬线对照', value: 'parallel' },
    ],
    mode,
    (v) => { mode = v; draw(); },
  );
  host.appendChild(seg);

  /* 工具条上的预设按钮会切换模式，而 buildSegmented 只在它自己被点时才同步高亮。
     这里补一个本地 setMode：改状态的同时手动点亮对应的分段按钮，避免"模式变了、
     高亮还留在上一格"的错位。 */
  const MODE_ORDER = ['route', 'triangle', 'parallel'];
  function setMode(m) {
    mode = m;
    Array.prototype.forEach.call(seg.children, (b, i) => {
      b.classList.toggle('is-active', MODE_ORDER[i] === m);
    });
  }

  function btn(text, fn) {
    const b = mkBtn(text);
    b.addEventListener('click', fn);
    return b;
  }
  const bar = buildToolbar(
    btn('北京→纽约', () => {
      P.a = [116.4, 39.9];
      P.b = [-74.0, 40.7];
      lon0 = -20;
      lat0 = 25;
      draw();
    }),
    btn('赤道对径', () => {
      P.a = [0, 0];
      P.b = [180, 0];
      lon0 = -90;
      lat0 = 10;
      draw();
    }),
    btn('同纬度两点（φ = 60°）', () => {
      P.a = [-30, 60];
      P.b = [30, 60];
      lon0 = 0;
      lat0 = 42;
      setMode('parallel');
      draw();
    }),
    btn('北极三直角', () => {
      P.a = [0, 0];
      P.b = [90, 0];
      P.c = [0, 90];
      lon0 = -45;
      lat0 = 45;
      setMode('triangle');
      draw();
    }),
    btn('重置视角', () => { lon0 = -20; lat0 = 25; draw(); }),
  );
  host.appendChild(bar);

  let drag = null;
  bindPointer(cv.canvas, {
    pick(px, py) {
      const list = shown();
      for (let i = 0; i < list.length; i += 1) {
        const s = project(list[i][0], list[i][1]);
        if (Math.hypot(s.x - px, s.y - py) <= 16) return { kind: 'point', idx: i };
      }
      return { kind: 'rot' };
    },
    move(id, px, py) {
      if (id && id.kind === 'point') {
        const ll = unproject(px, py);
        if (mode === 'parallel') {
          /* 纬线对照里纬度是共享的那一个参数：拖哪一点都改 φ，经度各自走 */
          P.a = [id.idx === 1 ? P.a[0] : ll[0], ll[1]];
          P.b = [id.idx === 1 ? ll[0] : P.b[0], ll[1]];
          draw();
          return;
        }
        if (id.idx === 0) P.a = ll;
        else if (id.idx === 1) P.b = ll;
        else P.c = ll;
        draw();
        return;
      }
      if (!drag) { drag = { px: px, py: py }; return; }
      const dx = px - drag.px;
      const dy = py - drag.py;
      drag.px = px;
      drag.py = py;
      lon0 = (((lon0 - dx * 0.35) + 540) % 360) - 180;
      lat0 = clamp(lat0 + dy * 0.25, -85, 85);
      draw();
    },
    up() { drag = null; },
  });

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}