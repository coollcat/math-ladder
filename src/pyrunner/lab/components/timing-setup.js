/* =========================================================================
 * lab 组件：timing-setup（建立与保持时间）
 * -------------------------------------------------------------------------
 * 演示什么：两级触发器之间的一段路径。FF1 在时钟沿后 tCQ 把新数据放上 Q，
 *   再走 tPD 的组合逻辑到达 FF2 的 D 端。FF2 在同一个沿上采样，所以：
 *     - 新数据不能来得太晚：必须在下一个沿之前 tSU 就稳定 → 建立时间
 *     - 新数据也不能来得太早：必须在本次沿之后 tH 才允许变 → 保持时间
 *   把数据沿拖进窗口里，立刻报警（亚稳态）。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "timing-setup",
 *     "title": "把数据沿拖进橙色窗口，看看什么叫建立时间违规",
 *     "T": 10,
 *     "tSU": 2,
 *     "tH": 1,
 *     "tCQ": 1,
 *     "tPD": 3
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   T    时钟周期 ns，2–40，默认 10
 *   tSU  FF2 的建立时间 ns，0–6，默认 2
 *   tH   FF2 的保持时间 ns，0–6，默认 1
 *   tCQ  时钟沿到 FF1.Q 更新的延迟 ns，0.2–6，默认 1
 *   tPD  组合逻辑延迟 ns，0–30，默认 3（就是那个能拖的数据沿）
 *
 * 能玩什么：
 *   - 拖 FF2.D 那条虚线（数据沿）→ 直接改 tPD，看它什么时候撞进窗口
 *   - 拖 CLK 行上的三角（t = T 那个捕获沿）→ 直接改时钟周期
 *   - 拖橙色窗口的左边界 → 改 tSU；拖紫色窗口的右边界 → 改 tH
 *   - 时钟周期还有单独的滑块；拖完窗口/沿，滑块数值会跟着同步
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildReadout, buildToolbar,
  buildSliders, mkBtn, label, clamp, fmt,
} from '../core.js';

const TMAX = 40;          // 时间轴的固定满量程 ns（拖 T 时轴不动）
const TOP = 44;
const ROWH = 52;
const PLOT_BOT = TOP + ROWH * 3;

export default function render(host, spec) {
  const s = {
    T: clamp(spec.T ?? 10, 2, TMAX),
    tSU: clamp(spec.tSU ?? 2, 0, 6),
    tH: clamp(spec.tH ?? 1, 0, 6),
    tCQ: clamp(spec.tCQ ?? 1, 0.2, 6),
    tPD: clamp(spec.tPD ?? 3, 0, 30),
  };

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({
    数据到达: '—', 建立裕量: '—', 保持裕量: '—',
    最小时钟周期: '—', 最高频率: '—', 判定: '—',
  });
  host.appendChild(ro.box);

  const bFit = mkBtn('拉到临界（刚好满足建立时间）');
  const bBad = mkBtn('制造一次保持违规');
  host.appendChild(buildToolbar(bFit, bBad));
  bFit.addEventListener('click', () => {
    s.tPD = clamp(s.T - s.tSU - s.tCQ, 0, 30);
    syncSliders();
    draw();
  });
  bBad.addEventListener('click', () => {
    s.tPD = clamp(s.tH * 0.4, 0, 30);
    syncSliders();
    draw();
  });

  const tData = () => s.tCQ + s.tPD;

  function geom() {
    const x0 = 66;
    const x1 = cv.W - 16;
    return { x0, x1, X: (t) => x0 + (clamp(t, 0, TMAX) / TMAX) * (x1 - x0), invX: (px) => ((px - x0) / (x1 - x0)) * TMAX };
  }

  function drawWave(ctx, X, g, yHi, yLo, segs, color, width, dash) {
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let prev = segs[0].v;
    ctx.moveTo(X(segs[0].t), prev ? yHi : yLo);
    for (let i = 1; i < segs.length; i += 1) {
      const x = X(segs[i].t);
      ctx.lineTo(x, prev ? yHi : yLo);
      ctx.lineTo(x, segs[i].v ? yHi : yLo);
      prev = segs[i].v;
    }
    ctx.lineTo(X(TMAX), prev ? yHi : yLo);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const g = geom();
    const td = tData();
    const suSlack = (s.T - s.tSU) - td;
    const hSlack = td - s.tH;
    const badSU = suSlack < 0;
    const badH = hSlack < 0;

    label(ctx, '建立时间 tSU = ' + fmt(s.tSU, 1) + ' ns　保持时间 tH = ' + fmt(s.tH, 1)
      + ' ns　时钟周期 T = ' + fmt(s.T, 1) + ' ns', 10, 16, C.fg, { size: 12, weight: 600 });
    label(ctx, '拖虚线改数据到达时刻 · 拖 CLK 三角改周期 · 拖窗口边界改 tSU / tH', 10, 30, C.grid, { size: 10 });

    /* ---- 两个窗口（背景） ---- */
    const wx0 = g.X(s.T - s.tSU);
    const wx1 = g.X(s.T);
    const hx0 = g.X(0);
    const hx1 = g.X(s.tH);
    ctx.fillStyle = badSU ? C.bad : C.named('orange');
    ctx.globalAlpha = badSU ? 0.26 : 0.16;
    ctx.fillRect(wx0, TOP - 4, Math.max(1, wx1 - wx0), PLOT_BOT - TOP + 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = badH ? C.bad : C.named('purple');
    ctx.globalAlpha = badH ? 0.26 : 0.16;
    ctx.fillRect(hx0, TOP - 4, Math.max(1, hx1 - hx0), PLOT_BOT - TOP + 8);
    ctx.globalAlpha = 1;

    label(ctx, '建立窗 tSU', (wx0 + wx1) / 2, TOP - 8, badSU ? C.bad : C.named('orange'),
      { align: 'center', size: 9, weight: 600 });
    label(ctx, '保持窗 tH', (hx0 + hx1) / 2, TOP - 8, badH ? C.bad : C.named('purple'),
      { align: 'center', size: 9, weight: 600 });

    /* 窗口边界（可拖） */
    [[wx0, badSU ? C.bad : C.named('orange')], [hx1, badH ? C.bad : C.named('purple')]].forEach(([x, col]) => {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, TOP - 4);
      ctx.lineTo(x, PLOT_BOT + 4);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, PLOT_BOT + 4);
      ctx.lineTo(x - 5, PLOT_BOT + 11);
      ctx.lineTo(x + 5, PLOT_BOT + 11);
      ctx.closePath();
      ctx.fill();
    });

    /* ---- 三条波形 ---- */
    const rows = [
      { name: 'CLK', y: TOP, segs: [{ t: 0, v: 0 }, { t: 0, v: 1 }, { t: 0.5 * s.T, v: 0 }, { t: s.T, v: 1 }, { t: 1.5 * s.T, v: 0 }], color: C.named('amber'), w: 2 },
      { name: 'FF1.Q', y: TOP + ROWH, segs: [{ t: 0, v: 0 }, { t: s.tCQ, v: 1 }, { t: s.tCQ + s.T, v: 0 }], color: C.series(0), w: 2 },
      { name: 'FF2.D', y: TOP + ROWH * 2, segs: [{ t: 0, v: 0 }, { t: td, v: 1 }], color: C.series(3), w: 2.4 },
    ];
    rows.forEach((r) => {
      const yHi = r.y + 14;
      const yLo = r.y + 40;
      ctx.fillStyle = C.soft;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(g.x0, r.y + 4, g.x1 - g.x0, ROWH - 8);
      ctx.globalAlpha = 1;
      label(ctx, r.name, g.x0 - 8, r.y + 32, r.color, { align: 'right', size: 11, weight: 600 });
      drawWave(ctx, g.X, g, yHi, yLo, r.segs, r.color, r.w);
    });

    /* ---- 捕获沿标记 ---- */
    [0, s.T].forEach((tc, i) => {
      const x = g.X(tc);
      ctx.strokeStyle = C.named('amber');
      ctx.lineWidth = 1.2;
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, TOP - 4);
      ctx.lineTo(x, PLOT_BOT + 4);
      ctx.stroke();
      ctx.restore();
      if (i === 1) {
        ctx.fillStyle = C.named('amber');
        ctx.beginPath();
        ctx.moveTo(x, TOP + 2);
        ctx.lineTo(x - 6, TOP - 8);
        ctx.lineTo(x + 6, TOP - 8);
        ctx.closePath();
        ctx.fill();
        label(ctx, '捕获沿', x + 8, TOP - 8, C.named('amber'), { size: 9 });
      }
    });

    /* ---- 数据沿（可拖） ---- */
    const dx = g.X(td);
    ctx.strokeStyle = C.series(3);
    ctx.lineWidth = 1.6;
    ctx.save();
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(dx, TOP - 4);
    ctx.lineTo(dx, PLOT_BOT + 4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = C.series(3);
    ctx.fillRect(dx - 9, TOP + ROWH * 2 + 6, 18, 14);
    label(ctx, '⇔', dx, TOP + ROWH * 2 + 17, C.bg, { align: 'center', size: 10, weight: 700 });
    label(ctx, 'tCQ + tPD = ' + fmt(td, 2) + ' ns', dx + 12, TOP + ROWH * 2 + 17, C.series(3), { size: 9 });

    /* ---- 时间轴 ---- */
    const ay = PLOT_BOT + 20;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x0, ay);
    ctx.lineTo(g.x1, ay);
    ctx.stroke();
    for (let t = 0; t <= TMAX; t += 5) {
      ctx.beginPath();
      ctx.moveTo(g.X(t), ay);
      ctx.lineTo(g.X(t), ay + 4);
      ctx.stroke();
      label(ctx, t + '', g.X(t), ay + 15, C.fg, { align: 'center', size: 9 });
    }
    label(ctx, 'ns', g.x1 + 2, ay + 15, C.grid, { size: 9 });

    /* ---- 底部结论 ---- */
    let ty = PLOT_BOT + 40;
    label(ctx, '建立：数据到达 ' + fmt(td, 2) + ' ns ≤ T − tSU = ' + fmt(s.T - s.tSU, 2)
      + ' ns　→　裕量 ' + fmt(suSlack, 2) + ' ns', 10, ty, badSU ? C.bad : C.ok, { size: 10, weight: 600 });
    ty += 15;
    label(ctx, '保持：数据到达 ' + fmt(td, 2) + ' ns ≥ tH = ' + fmt(s.tH, 2)
      + ' ns　→　裕量 ' + fmt(hSlack, 2) + ' ns', 10, ty, badH ? C.bad : C.ok, { size: 10, weight: 600 });
    ty += 15;
    const Tmin = td + s.tSU;
    label(ctx, '这段路径要求 T ≥ tCQ + tPD + tSU = ' + fmt(Tmin, 2) + ' ns，即 f ≤ '
      + fmt(1000 / Tmin, 1) + ' MHz（当前 ' + fmt(1000 / s.T, 1) + ' MHz）', 10, ty, C.fg, { size: 10 });
    ty += 16;
    if (badSU || badH) {
      ctx.fillStyle = C.bad;
      ctx.fillRect(8, ty - 11, W - 16, 17);
      label(ctx, '⚠ ' + (badH ? '保持时间违规：新数据把 FF2 刚要采的旧值冲掉了' : '')
        + (badSU && badH ? '　且　' : '') + (badSU ? '建立时间违规：捕获沿到来时数据还没稳，FF2 可能进入亚稳态' : ''),
      12, ty + 2, C.bg, { size: 10, weight: 700 });
    } else {
      label(ctx, '✔ 建立与保持都满足，这一段路径在当前频率下是安全的', 10, ty, C.ok, { size: 10 });
    }

    ro.set('数据到达', 'tCQ ' + fmt(s.tCQ, 2) + ' + tPD ' + fmt(s.tPD, 2) + ' = ' + fmt(td, 2) + ' ns');
    ro.set('建立裕量', fmt(suSlack, 2) + ' ns（(T − tSU) − 数据到达）');
    ro.set('保持裕量', fmt(hSlack, 2) + ' ns（数据到达 − tH）');
    ro.set('最小时钟周期', fmt(Tmin, 2) + ' ns（只算建立；保持违规加减缓冲也救不回来）');
    ro.set('最高频率', fmt(1000 / Tmin, 1) + ' MHz');
    ro.set('判定', badSU || badH ? '⚠ 时序违规' : '✔ 时序收敛');
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const g = geom();
      const dx = g.X(tData());
      if (Math.abs(px - dx) <= 9 && py >= TOP && py <= PLOT_BOT + 12) return 'data';
      const cx = g.X(s.T);
      if (Math.abs(px - cx) <= 9 && py >= TOP - 12 && py <= TOP + ROWH) return 'clk';
      const sux = g.X(s.T - s.tSU);
      if (Math.abs(px - sux) <= 6 && py >= TOP - 6 && py <= PLOT_BOT + 12) return 'su';
      const hx = g.X(s.tH);
      if (Math.abs(px - hx) <= 6 && py >= TOP - 6 && py <= PLOT_BOT + 12) return 'h';
      return null;
    },
    down(id, px) { move(id, px); },
    move(id, px) {
      const g = geom();
      const t = g.invX(px);
      if (id === 'data') {
        s.tPD = clamp(t - s.tCQ, 0, 30);
        syncSliders();
      } else if (id === 'clk') {
        s.T = clamp(t, 2, TMAX);
        syncSliders();
      } else if (id === 'su') {
        s.tSU = clamp(s.T - t, 0, 6);
        syncSliders();
      } else if (id === 'h') {
        s.tH = clamp(t, 0, 6);
        syncSliders();
      } else {
        return;
      }
      draw();
    },
    up() { },
  });

  let sliders = null;
  let syncEls = null;
  function syncSliders() {
    if (!syncEls) return;
    syncEls.T.value = String(s.T);
    syncEls.TVal.textContent = fmt(s.T, 1);
    syncEls.tSU.value = String(s.tSU);
    syncEls.tSUVal.textContent = fmt(s.tSU, 1);
    syncEls.tH.value = String(s.tH);
    syncEls.tHVal.textContent = fmt(s.tH, 1);
    syncEls.tPD.value = String(s.tPD);
    syncEls.tPDVal.textContent = fmt(s.tPD, 1);
  }

  sliders = buildSliders(
    {
      sliders: [
        { name: 'T', label: '时钟周期 T (ns)', min: 2, max: TMAX, step: 0.1, value: s.T, fmt: 1 },
        { name: 'tSU', label: '建立时间 tSU (ns)', min: 0, max: 6, step: 0.1, value: s.tSU, fmt: 1 },
        { name: 'tH', label: '保持时间 tH (ns)', min: 0, max: 6, step: 0.1, value: s.tH, fmt: 1 },
        { name: 'tCQ', label: '时钟到输出 tCQ (ns)', min: 0.2, max: 6, step: 0.1, value: s.tCQ, fmt: 1 },
        { name: 'tPD', label: '组合逻辑延迟 tPD (ns)', min: 0, max: 30, step: 0.1, value: s.tPD, fmt: 1 },
      ],
    },
    (v) => {
      s.T = v.T;
      s.tSU = v.tSU;
      s.tH = v.tH;
      s.tCQ = v.tCQ;
      s.tPD = v.tPD;
      draw();
    },
  );
  const sIn = sliders.box.querySelectorAll('input');
  const sVal = sliders.box.querySelectorAll('.ml-slider__val');
  syncEls = {
    T: sIn[0], TVal: sVal[0],
    tSU: sIn[1], tSUVal: sVal[1],
    tH: sIn[2], tHVal: sVal[2],
    tPD: sIn[4], tPDVal: sVal[4],
  };

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box };
}
