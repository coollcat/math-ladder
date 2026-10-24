/* =========================================================================
 * lab 组件：divergence-cube —— 一只控制盒，两本账：散度定理与 Stokes 定理
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "divergence-cube", "title": "六个面的出账 vs 屋里的产热", "p": 1, "q": 0.6, "r": -0.4 }
 *   ```
 *
 * 字段（都有默认值，只写 type + title 也能渲染）：
 *   view  "flux"（默认，重点看六个面）| "curl"（重点看顶面的环量）| "both"
 *   p q r 场的自膨胀系数，默认 1 / 0.6 / −0.4
 *   a     旋涡强度，默认 0（拖大它就看"没有源也能打转"）
 *   s     沿 x 的常数平移，默认 0（只改两面分布，不改总账）
 *   yaw / pitch  初始视角（弧度），默认 0.6 / 1.0
 *
 * 全片只有一个场：
 *   F(x,y,z) = ( p·x + s − a·y ,  q·y + a·x ,  r·z )
 *   div F = p + q + r            curl F = (0, 0, 2a)
 * 于是两本账同一时刻都成立，切换只换"读哪一本"，不换数学。
 *
 * 「完美教具」五问：
 *   1. 动手量：拖空白处转盒子（背面三个面也有账）；四个滑块直接就是场里
 *      那些系数——"这屋里到底有没有源、有没有旋"这个自由参数。
 *   2. 即时后果：箭头当场改向改色、面的描边粗细随通量变、读数条同一帧刷新。
 *   3. 读数：∮F·n dS 与 ∭div F dV、∮F·dr 与 ∬(curl F)·n dS，外加六个面各一笔
 *      明细。盒子取 [−1,1]³（体积恒为 8），线性场用面心法则**精确**，
 *      所以两个数字不只是"接近"，是逐位相等，好让正文公式被当场对账。
 *   4. 啊哈预设：「纯旋涡」一键把 p、q、r 归零、a 拉到 1——div = 0、六个面
 *      总通量 0，可箭头全在打转；「常数平移 s = 2」把 ±x 两面拆成一出一进，
 *      而总和纹丝不动；「纯源 div = 3」让每个面都朝外冒。
 *   5. 默认状态讲对故事：默认 p=1、q=0.6、r=−0.4，div = 1.2 > 0，
 *      x 右面最亮、z 两面往里吸——不点任何按钮也看得出"出账减进账还有剩"。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, buildToolbar, mkBtn, label, arrow, fmt, clamp, clearBg,
} from '../core.js';

const FACE_LOOP = [
  [1, 5, 6, 2], [0, 3, 7, 4], [3, 2, 6, 7], [0, 4, 5, 1], [4, 7, 6, 5], [0, 1, 2, 3],
];
const FACES = [
  { n: [1, 0, 0], c: [1, 0, 0], tag: '+x' },
  { n: [-1, 0, 0], c: [-1, 0, 0], tag: '−x' },
  { n: [0, 1, 0], c: [0, 1, 0], tag: '+y' },
  { n: [0, -1, 0], c: [0, -1, 0], tag: '−y' },
  { n: [0, 0, 1], c: [0, 0, 1], tag: '+z' },
  { n: [0, 0, -1], c: [0, 0, -1], tag: '−z' },
];
const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function render(host, spec) {
  let view = spec.view === 'curl' ? 'curl' : spec.view === 'both' ? 'both' : 'flux';
  const G = {
    p: num(spec.p, 1), q: num(spec.q, 0.6), r: num(spec.r, -0.4),
    a: num(spec.a, 0), s: num(spec.s, 0),
  };
  let yaw = num(spec.yaw, 0.62);
  let pitch = num(spec.pitch, 1.02);

  const cv = setupCanvas(host, 400);
  cv.canvas.classList.add('ml-drag');
  const ro = buildReadout({
    通量: '—', '∭div dV': '—', 环量: '—', '∬curl·n dS': '—', 面账: '—', 采样点: '—',
  });
  host.appendChild(ro.box);

  function field(x, y, z) {
    return [G.p * x + G.s - G.a * y, G.q * y + G.a * x, G.r * z];
  }
  /* 顶面正方形 [−1,1]² 逆时针一圈，t ∈ [0,1] */
  function boundary(t) {
    const u = (((t % 1) + 1) % 1) * 4;
    if (u < 1) return [-1 + 2 * u, -1];
    if (u < 2) return [1, -1 + 2 * (u - 1)];
    if (u < 3) return [1 - 2 * (u - 2), 1];
    return [-1, 1 - 2 * (u - 3)];
  }

  const geo = { cx: 0, cy: 0, R: 1 };
  function proj(p) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ax = p[0] * cy - p[1] * sy;
    const ay = p[0] * sy + p[1] * cy;
    return {
      x: geo.cx + ax * geo.R,
      y: geo.cy - (p[2] * sp + ay * cp) * geo.R,
      d: p[2] * cp - ay * sp,
    };
  }

  let hover = null;

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    geo.cx = W / 2;
    geo.cy = H / 2 + 8;
    geo.R = Math.min(W, H) * 0.255;

    const flux = FACES.map((f) => {
      const v = field(f.c[0], f.c[1], f.c[2]);
      return (v[0] * f.n[0] + v[1] * f.n[1] + v[2] * f.n[2]) * 4;
    });
    const maxAbs = Math.max(0.3, ...flux.map((v) => Math.abs(v)));
    const fluxOn = view !== 'curl';
    const curlOn = view !== 'flux';

    /* 六个面：远的先画，背面的淡 */
    FACES.map((f, i) => ({ i, d: proj(f.c).d }))
      .sort((m, n) => m.d - n.d)
      .forEach(({ i }) => {
        const f = FACES[i];
        const near = proj(f.c).d > 0;
        const loop = FACE_LOOP[i].map((k) => proj(CORNERS[k]));
        ctx.beginPath();
        loop.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.closePath();
        ctx.globalAlpha = near ? 0.8 : 0.45;
        ctx.fillStyle = C.soft;
        ctx.fill();
        const tint = flux[i] > 0 ? C.accent2 : C.accent;
        ctx.strokeStyle = fluxOn ? tint : C.grid;
        ctx.lineWidth = fluxOn ? 1 + (Math.abs(flux[i]) / maxAbs) * 3.4 : 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (near && fluxOn && Math.abs(flux[i]) > 1e-9) {
          const m = proj([f.c[0] * 1.3, f.c[1] * 1.3, f.c[2] * 1.3]);
          label(ctx, fmt(flux[i], 2), m.x, m.y, tint, { size: 11, weight: 700, align: 'center' });
        }
      });

    EDGES.forEach((e) => {
      const a = proj(CORNERS[e[0]]);
      const b = proj(CORNERS[e[1]]);
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    /* 场箭头：盒内 3×3×3 采样 */
    for (let ix = -1; ix <= 1; ix += 1) {
      for (let iy = -1; iy <= 1; iy += 1) {
        for (let iz = -1; iz <= 1; iz += 1) {
          const x = ix * 0.68;
          const y = iy * 0.68;
          const z = iz * 0.68;
          const v = field(x, y, z);
          const mag = Math.hypot(v[0], v[1], v[2]);
          if (mag < 1e-9) continue;
          const base = proj([x, y, z]);
          const tip = proj([x + v[0] * 0.24, y + v[1] * 0.24, z + v[2] * 0.24]);
          arrow(ctx, base.x, base.y, tip.x, tip.y, C.named('purple'), 1.3, 5);
        }
      }
    }

    /* Stokes 用：顶面边界按右手绕向走一遍 */
    const loop = [0, 1, 2, 3].map((k) => proj(CORNERS[FACE_LOOP[4][k]]));
    ctx.strokeStyle = curlOn ? C.ok : C.grid;
    ctx.lineWidth = curlOn ? 2.6 : 1.2;
    ctx.beginPath();
    loop.forEach((q, k) => (k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    ctx.stroke();
    if (curlOn) {
      for (let k = 0; k < 4; k += 1) {
        const a = loop[k];
        const b = loop[(k + 1) % 4];
        arrow(ctx, (a.x * 3 + b.x) / 4, (a.y * 3 + b.y) / 4, (a.x + b.x) / 2, (a.y + b.y) / 2, C.ok, 2, 7);
      }
      const m = proj([0, 1.0, 1]);
      label(ctx, '∮F·dr 绕这一圈（右手绕向）', m.x, m.y - 10, C.ok,
        { size: 11, weight: 700, align: 'center' });
    }

    label(ctx, fluxOn ? '散度账：六个面通量之和 = 屋里的 div' : '只读 Stokes 账', 10, 16, C.accent, { size: 11 });
    label(ctx, '拖空白处转盒子 · 拖滑块改场', W - 10, 16, C.axis, { size: 11, align: 'right' });

    /* ---- 两本账：同一时刻都成立 ---- */
    let circ = 0;
    const NS = 240;
    for (let k = 0; k < NS; k += 1) {
      const P0 = boundary(k / NS);
      const P1 = boundary((k + 1) / NS);
      const v = field((P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2, 1);
      circ += v[0] * (P1[0] - P0[0]) + v[1] * (P1[1] - P0[1]);
    }
    const div = G.p + G.q + G.r;
    const curlZ = 2 * G.a;
    const total = flux.reduce((s, v) => s + v, 0);

    ro.set('通量', fluxOn ? '∮F·n dS = ' + fmt(total, 3) : '—（切到散度账）');
    ro.set('∭div dV', fluxOn
      ? 'div = p+q+r = ' + fmt(div, 2) + '，× 体积 8 = ' + fmt(div * 8, 3)
        + (Math.abs(total - div * 8) < 1e-9 ? '（相等 ✓）' : '（差 ' + fmt(Math.abs(total - div * 8), 4) + '）')
      : '—');
    ro.set('环量', curlOn ? '∮F·dr = ' + fmt(circ, 4) : '—（切到 Stokes 账）');
    ro.set('∬curl·n dS', curlOn
      ? 'curl_z = 2a = ' + fmt(curlZ, 2) + '，× 顶面面积 4 = ' + fmt(curlZ * 4, 4)
        + (Math.abs(circ - curlZ * 4) < 1e-6 ? '（相等 ✓）' : '')
      : '—');
    ro.set('面账', fluxOn ? FACES.map((f, i) => f.tag + ' ' + fmt(flux[i], 2)).join('｜') : '顶面 z = 1');
    ro.set('采样点', hover
      ? '最近采样点 F(' + fmt(hover[0], 2) + ', ' + fmt(hover[1], 2) + ', ' + fmt(hover[2], 2) + ') = ('
        + fmt(field(hover[0], hover[1], hover[2])[0], 2) + ', '
        + fmt(field(hover[0], hover[1], hover[2])[1], 2) + ', '
        + fmt(field(hover[0], hover[1], hover[2])[2], 2) + ')'
      : '把指针挪到盒内的采样点上');
  }
  draw();
  cv.redraw = draw;

  const seg = buildSegmented(
    [
      { label: '散度账', value: 'flux' },
      { label: 'Stokes 账', value: 'curl' },
      { label: '两本同看', value: 'both' },
    ],
    view,
    (v) => { view = v; draw(); },
  );
  host.appendChild(seg);

  /* 工具条上的预设按钮也会切 view，而 buildSegmented 只在它自己被点时才同步高亮，
     于是会出现「读数已经换成 Stokes 账、分段高亮还停在散度账」的错位（读者会以为
     按钮没生效）。这里统一走 setView：改状态的同时手动点亮对应那一格。
     同批的 great-circle-lab 用的是同一套写法，可对照。 */
  const VIEW_ORDER = ['flux', 'curl', 'both'];
  function setView(v) {
    view = v;
    Array.prototype.forEach.call(seg.children, (b, i) => {
      b.classList.toggle('is-active', VIEW_ORDER[i] === v);
    });
  }

  function btn(text, fn) {
    const b = mkBtn(text);
    b.addEventListener('click', fn);
    return b;
  }
  const bar = buildToolbar(
    btn('纯旋涡（div = 0）', () => {
      G.p = 0; G.q = 0; G.r = 0; G.a = 1; G.s = 0;
      setView('curl');
      draw();
    }),
    btn('纯源（div = 3）', () => {
      G.p = 1; G.q = 1; G.r = 1; G.a = 0; G.s = 0;
      setView('flux');
      draw();
    }),
    btn('常数平移 s = 2', () => { G.s = 2; G.a = 0; setView('both'); draw(); }),
    btn('复位', () => {
      G.p = 1; G.q = 0.6; G.r = -0.4; G.a = 0; G.s = 0;
      setView('flux');
      yaw = 0.62; pitch = 1.02;
      draw();
    }),
  );
  host.appendChild(bar);

  const sl = buildSliders({
    sliders: [
      { name: 'p', label: 'p（x 向膨胀）', min: -1.5, max: 1.5, step: 0.1, value: G.p },
      { name: 'q', label: 'q（y 向膨胀）', min: -1.5, max: 1.5, step: 0.1, value: G.q },
      { name: 'r', label: 'r（z 向膨胀）', min: -1.5, max: 1.5, step: 0.1, value: G.r },
      { name: 'a', label: 'a（旋涡强度）', min: -1.5, max: 1.5, step: 0.1, value: G.a },
    ],
  }, (st) => {
    G.p = st.p;
    G.q = st.q;
    G.r = st.r;
    G.a = st.a;
    draw();
  });
  host.appendChild(sl.box);

  let drag = null;
  bindPointer(cv.canvas, {
    pick() { return 'rot'; },
    hover(px, py) {
      /* 正交投影丢掉了深度这一维，反解不唯一；就报屏幕最近的采样点，
         读数条上写明"最近采样点"，不假装精确反解。 */
      let best = null;
      let bd = Infinity;
      for (let ix = -1; ix <= 1; ix += 1) {
        for (let iy = -1; iy <= 1; iy += 1) {
          for (let iz = -1; iz <= 1; iz += 1) {
            const p = [ix * 0.68, iy * 0.68, iz * 0.68];
            const q = proj(p);
            const d = Math.hypot(q.x - px, q.y - py);
            if (d < bd) { bd = d; best = p; }
          }
        }
      }
      hover = bd < 40 ? best : null;
      draw();
    },
    move(id, px, py) {
      if (!drag) { drag = { px: px, py: py }; return; }
      yaw += (px - drag.px) * 0.012;
      pitch = clamp(pitch - (py - drag.py) * 0.010, 0.14, Math.PI - 0.14);
      drag.px = px;
      drag.py = py;
      draw();
    },
    up() { drag = null; },
    leave() { hover = null; draw(); },
  });

  return {
    destroy() {
      cv.redraw = null;
    },
  };
}