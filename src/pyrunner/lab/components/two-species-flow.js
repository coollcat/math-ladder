/* =========================================================================
 * lab 组件：two-species-flow —— 两个仓室互相喂饭：疫情账本与捕食者-猎物的圆舞曲
 * -------------------------------------------------------------------------
 * 演示什么：把「一个仓室被另一个仓室按比例吃掉」的两套经典模型放进同一个相平面，
 * 让读者用手拖初值，一眼看出「阈值熄火」和「守恒闭环」是两种完全不同的命运。
 *
 * 用法（第 57 课课文 lab 围栏）：
 *
 *   { "type": "two-species-flow", "title": "拖起点：疫情冲顶，还是关进环里" }
 *
 * 字段：
 *   system  "sir"（三仓室传染病）／"lv"（捕食者-猎物），默认 sir
 *   a       第一个参数：sir 下是 beta，lv 下是 alpha
 *   b       第二个参数：sir 下是 gamma，lv 下是 q
 *   x0, y0  起点：sir 下是 (S0, I0)，lv 下是（猎物, 捕食者）
 *
 * 完美教具五问：
 *   1 动手量：右图那个黑色十字就是初值——拖它等于换一座城市的开局（初始感染比例）
 *     或换一片草场的开局（几只兔子几只狐狸）。两个滑块是两个关键参数。
 *   2 即时后果：松手那一帧，左边的时间曲线和右边的整条轨道一起重算，不用点按钮。
 *   3 读数：sir 读 R0 = beta/gamma、感染峰值与峰值时刻、六十天后仍未被感染的比例；
 *     lv 读正平衡点 (q/eta, alpha/delta) 与轨道框住的猎物/捕食者范围——都能和课文的
 *     公式逐项核对。
 *   4 啊哈预设：sir 模式下把 gamma 拧到 0.5（R0 = 0.8 < 1），曲线当场变成单调下滑，
 *     「疫情根本没起来」比任何文字都清楚；lv 模式下无论把起点拖到哪里，轨道都关进
 *     同一族闭合环里，拖到平衡点 (2, 2) 上则原地不动。
 *   5 默认状态：sir、beta = 0.4、gamma = 0.2、起点 (0.99, 0.01) → R0 = 2.00，
 *     感染在第 21.9 天冲到 15.85%，六十天后仍有 20.3% 的人没被感染。正文照此读数写。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, buildReadout, buildSegmented,
  bindPointer, polyline, label, clamp, anim, mergeSpec, clearBg,
} from '../core.js';

/* sir：60 天，步长 0.02（3000 步）；lv：40 个时间单位，步长 0.005（与课文同参数） */
const SIR_N = 3000;
const SIR_H = 0.02;
const LV_N = 8000;
const LV_H = 0.005;
const SEEK = 380;              /* 动画速度：每秒推进多少步 */
const REC = 0.5;               /* 相遇/转化系数：lv 里 delta = eta = 0.5（固定，正文说明） */

const BASE = [
  { name: 'a', label: 'a（sir: beta ／ lv: alpha）', min: 0.1, max: 1.5, step: 0.05, value: 0.4, fmt: 2 },
  { name: 'b', label: 'b（sir: gamma ／ lv: q）', min: 0.05, max: 1.2, step: 0.05, value: 0.2, fmt: 2 },
];

/* 两种模式各自记住上一组参数与起点，来回切换不跳变 */
const KEEP = {
  sir: { a: 0.4, b: 0.2, x0: 0.99, y0: 0.01 },
  lv: { a: 1, b: 1, x0: 3, y0: 1 },
};

/* ---- 两个模型的 RK4（与课文 python 同参数同步长，读数才能逐项对上） ---- */
function sirRun(beta, gamma, S0, I0) {
  const s = new Float64Array(SIR_N + 1);
  const i = new Float64Array(SIR_N + 1);
  const r = new Float64Array(SIR_N + 1);
  let S = S0;
  let I = I0;
  s[0] = S; i[0] = I; r[0] = 1 - S - I;
  const f = (SS, II) => [-beta * SS * II, beta * SS * II - gamma * II];
  for (let k = 1; k <= SIR_N; k += 1) {
    const k1 = f(S, I);
    const k2 = f(S + 0.5 * SIR_H * k1[0], I + 0.5 * SIR_H * k1[1]);
    const k3 = f(S + 0.5 * SIR_H * k2[0], I + 0.5 * SIR_H * k2[1]);
    const k4 = f(S + SIR_H * k3[0], I + SIR_H * k3[1]);
    S += (SIR_H / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    I += (SIR_H / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (!isFinite(S) || !isFinite(I)) { return { s, i, r, n: k - 1, T: (k - 1) * SIR_H }; }
    s[k] = S; i[k] = I; r[k] = 1 - S - I;
  }
  return { s, i, r, n: SIR_N, T: SIR_N * SIR_H };
}

function lvRun(alpha, q, X0, Y0) {
  const x = new Float64Array(LV_N + 1);
  const y = new Float64Array(LV_N + 1);
  let X = X0;
  let Y = Y0;
  x[0] = X; y[0] = Y;
  const f = (XX, YY) => [alpha * XX - REC * XX * YY, REC * XX * YY - q * YY];
  for (let k = 1; k <= LV_N; k += 1) {
    const k1 = f(X, Y);
    const k2 = f(X + 0.5 * LV_H * k1[0], Y + 0.5 * LV_H * k1[1]);
    const k3 = f(X + 0.5 * LV_H * k2[0], Y + 0.5 * LV_H * k2[1]);
    const k4 = f(X + LV_H * k3[0], Y + LV_H * k3[1]);
    X += (LV_H / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    Y += (LV_H / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (!isFinite(X) || !isFinite(Y)) { return { x, y, n: k - 1, T: (k - 1) * LV_H }; }
    x[k] = X; y[k] = Y;
  }
  return { x, y, n: LV_N, T: LV_N * LV_H };
}

/* 相平面窗口量化到整齐刻度：拖动时窗口才不会跟着指针一起漂 */
function niceTop(v) {
  const steps = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40];
  for (const s of steps) if (v <= s) return s;
  return 40;
}

export default function render(host, spec) {
  let mode = spec.system === 'lv' ? 1 : 0;
  const cur = () => (mode === 0 ? KEEP.sir : KEEP.lv);
  ['sir', 'lv'].forEach((key) => {
    if (spec.system !== key) return;
    if (typeof spec.a === 'number') KEEP[key].a = spec.a;
    if (typeof spec.b === 'number') KEEP[key].b = spec.b;
    if (typeof spec.x0 === 'number') KEEP[key].x0 = spec.x0;
    if (typeof spec.y0 === 'number') KEEP[key].y0 = spec.y0;
  });

  const sliders = buildSliders(
    { sliders: mergeSpec(BASE, { a: { value: cur().a }, b: { value: cur().b } }) },
    (st) => {
      cur().a = st.a;
      cur().b = st.b;
      rebuild();
    },
  );
  const ro = buildReadout({
    起点: '—', 关键数: '—', 峰值或范围: '—', 结局: '—', 已演化: '—',
  });
  const cv = setupCanvas(host, 340);
  host.appendChild(ro.box);

  const g = { lx: 0, lw: 0, ly: 0, lh: 0, rx: 0, rw: 0, ry: 0, rh: 0 };
  let sim = null;
  let idx = 0;
  let frozen = null;           /* 拖动期间锁死相平面窗口，松手再重算 */

  function panes(W, H) {
    const pad = 12;
    const half = (W - pad * 3) / 2;
    g.lx = pad + 30;
    g.lw = Math.max(60, half - 30);
    g.rx = pad * 2 + half + 30;
    g.rw = Math.max(60, half - 30);
    g.ly = 26;
    g.lh = Math.max(80, H - 26 - 40);
    g.ry = 26;
    g.rh = g.lh;
  }

  /* sir 的相平面窗口固定 0..1（S 与 I 都是比例，且 S + I ≤ 1）；
     lv 的窗口按轨道实际范围量化，拖初值时冻结。 */
  function phaseWindow() {
    if (mode === 0) return { xmin: 0, xmax: 1, ymin: 0, ymax: 1 };
    if (frozen) return frozen;
    let xm = 1;
    let ym = 1;
    for (let k = 0; k <= sim.n; k += 4) {
      if (isFinite(sim.x[k])) xm = Math.max(xm, sim.x[k]);
      if (isFinite(sim.y[k])) ym = Math.max(ym, sim.y[k]);
    }
    /* 至少留 0..5：不然停在平衡点那一刻窗口缩成一格，一拖就卡死在原地 */
    const top = niceTop(Math.max(5, Math.min(xm, 40) * 1.12));
    return { xmin: 0, xmax: top, ymin: 0, ymax: top };
  }

  function rebuild() {
    const c = cur();
    if (mode === 0) {
      c.x0 = clamp(c.x0, 0.03, 0.999);
      c.y0 = clamp(c.y0, 0.001, 0.5);
      c.y0 = Math.min(c.y0, 1 - c.x0);
      sim = sirRun(c.a, c.b, c.x0, c.y0);
    } else {
      c.x0 = clamp(c.x0, 0.2, 8);
      c.y0 = clamp(c.y0, 0.2, 8);
      sim = lvRun(c.a, c.b, c.x0, c.y0);
    }
    idx = 0;
    draw();
  }

  function seriesOf() {
    if (mode === 0) {
      return [
        { arr: sim.s, color: themeColors().named('green'), name: 'S 易感' },
        { arr: sim.i, color: themeColors().named('red'), name: 'I 感染' },
        { arr: sim.r, color: themeColors().named('gray'), name: 'R 移除' },
      ];
    }
    return [
      { arr: sim.x, color: themeColors().named('blue'), name: 'x 猎物' },
      { arr: sim.y, color: themeColors().named('orange'), name: 'y 捕食者' },
    ];
  }

  function draw() {
    if (!sim) return;
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    panes(W, H);

    const c = cur();
    const isSir = mode === 0;
    const T = Math.max(sim.T, 1e-6);
    const nEnd = sim.n;
    const tOf = (k) => (k / Math.max(nEnd, 1)) * T;
    const ser = seriesOf();

    /* ---------- 左：时间序列 ---------- */
    let top = 1;
    if (!isSir) {
      /* 左栏按数据自身量程铺满，不跟相平面窗口绑定（否则窗口一大曲线就贴底） */
      top = 0.5;
      for (const se of ser) for (let k = 0; k <= nEnd; k += 4) if (isFinite(se.arr[k])) top = Math.max(top, se.arr[k]);
      top *= 1.06;
    }
    const LX = (t) => g.lx + (t / T) * g.lw;
    const LY = (v) => g.ly + g.lh - clamp(v / top, 0, 1) * g.lh;
    label(ctx, isSir ? '三个仓室的时间曲线' : '两只种群的时间曲线', g.lx, g.ly - 9, C.fg, { size: 12, weight: 600 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.lx, g.ly);
    ctx.lineTo(g.lx, g.ly + g.lh);
    ctx.lineTo(g.lx + g.lw, g.ly + g.lh);
    ctx.stroke();
    label(ctx, isSir ? '60 天' : '40 个时间单位', g.lx + g.lw - 4, g.ly + g.lh + 15, C.axis, { size: 10.5, align: 'right' });
    label(ctx, '0', g.lx - 4, g.ly + g.lh + 15, C.axis, { size: 10.5, align: 'right' });
    ser.forEach((se, si) => {
      const stepK = Math.max(1, Math.floor(nEnd / 300));
      const pts = [];
      for (let k = 0; k <= nEnd; k += stepK) {
        if (!isFinite(se.arr[k])) break;
        pts.push([LX(tOf(k)), LY(se.arr[k])]);
      }
      polyline(ctx, pts, se.color, 2);
      label(ctx, se.name, g.lx + 7, g.ly + 13 + si * 14, se.color, { size: 10.5, weight: 600 });
    });

    /* 当前时刻的竖直游标 */
    const kNow = Math.min(Math.round(idx), nEnd);
    const xNow = LX(tOf(kNow));
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xNow, g.ly);
    ctx.lineTo(xNow, g.ly + g.lh);
    ctx.stroke();
    ctx.restore();

    /* ---------- 右：相平面 ---------- */
    const w = phaseWindow();
    const PX = (v) => g.rx + ((v - w.xmin) / (w.xmax - w.xmin)) * g.rw;
    const PY = (v) => g.ry + g.rh - ((v - w.ymin) / (w.ymax - w.ymin)) * g.rh;
    label(ctx, isSir ? '相平面 (S, I)' : '相平面（猎物, 捕食者）', g.rx, g.ry - 9, C.fg, { size: 12, weight: 600 });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.rx, g.ry);
    ctx.lineTo(g.rx, g.ry + g.rh);
    ctx.lineTo(g.rx + g.rw, g.ry + g.rh);
    ctx.stroke();
    label(ctx, isSir ? 'S' : '猎物 x', g.rx + g.rw - 4, g.ry + g.rh + 15, C.axis, { size: 10.5, align: 'right' });
    label(ctx, isSir ? 'I' : '捕食者 y', g.rx + 4, g.ry + 11, C.axis, { size: 10.5 });

    if (isSir) {
      /* S + I = 1 这条斜线以上是「不存在的人口」——拖到那里会被拉回线上 */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(PX(0), PY(1));
      ctx.lineTo(PX(1), PY(0));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'S+I=1（往上是空人口）', PX(0.34), PY(0.50), C.axis, { size: 10 });
    } else {
      const ex = PX(c.b / REC);
      const ey = PY(c.a / REC);
      ctx.fillStyle = C.ok;
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, '平衡点', ex + 7, ey - 5, C.ok, { size: 10 });
    }

    const stepT = Math.max(1, Math.floor(nEnd / 400));
    const traj = [];
    for (let k = 0; k <= nEnd; k += stepT) {
      const a1 = isSir ? sim.s[k] : sim.x[k];
      const a2 = isSir ? sim.i[k] : sim.y[k];
      if (!isFinite(a1) || !isFinite(a2)) break;
      traj.push([PX(a1), PY(a2)]);
    }
    polyline(ctx, traj, C.accent, 1.8);

    /* 起点十字（可拖） */
    const sx = PX(c.x0);
    const sy = PY(c.y0);
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy);
    ctx.lineTo(sx + 6, sy);
    ctx.moveTo(sx, sy - 6);
    ctx.lineTo(sx, sy + 6);
    ctx.stroke();
    ctx.restore();

    label(ctx, '拖这个十字换起点', g.rx + g.rw - 4, g.ry + g.rh - 6, C.axis, { size: 10, align: 'right' });

    /* 当前相点 */
    const px = PX(isSir ? sim.s[kNow] : sim.x[kNow]);
    const py = PY(isSir ? sim.i[kNow] : sim.y[kNow]);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();

    /* ---------- 读数 ---------- */
    let peak = -Infinity;
    let peakK = 0;
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let k = 0; k <= nEnd; k += 1) {
      if (isSir) {
        if (sim.i[k] > peak) { peak = sim.i[k]; peakK = k; }
      } else {
        if (sim.x[k] < xmin) xmin = sim.x[k];
        if (sim.x[k] > xmax) xmax = sim.x[k];
        if (sim.y[k] < ymin) ymin = sim.y[k];
        if (sim.y[k] > ymax) ymax = sim.y[k];
      }
    }
    ro.set('起点', '(' + c.x0.toFixed(3) + ', ' + c.y0.toFixed(3) + ')');
    if (isSir) {
      const r0 = c.a / c.b;
      ro.set('关键数', 'R0 = ' + r0.toFixed(2) + (r0 > 1 ? ' > 1，会流行' : ' < 1，自行熄灭'));
      ro.set('峰值或范围', 'I 峰值 ' + (peak * 100).toFixed(2) + '% @ 第 ' + tOf(peakK).toFixed(1) + ' 天');
      ro.set('结局', 'S 剩 ' + (sim.s[nEnd] * 100).toFixed(1) + '% · R 累计 ' + (sim.r[nEnd] * 100).toFixed(1) + '%');
    } else {
      ro.set('关键数', '平衡点 (' + (c.b / REC).toFixed(2) + ', ' + (c.a / REC).toFixed(2) + ')');
      ro.set('峰值或范围', 'x ' + xmin.toFixed(2) + '–' + xmax.toFixed(2) + ' · y ' + ymin.toFixed(2) + '–' + ymax.toFixed(2));
      ro.set('结局', Math.hypot(c.x0 - c.b / REC, c.y0 - c.a / REC) < 1e-12
        ? '起点就是平衡点：原地不动'
        : '闭合轨道：谁多谁少，轮流坐庄');
    }
    ro.set('已演化', 't = ' + tOf(kNow).toFixed(1));
  }

  /* 从像素反推初值。sir 下把点投影回 S + I ≤ 1 的区域，拖到「空人口」也不会炸。 */
  function setStart(x, y) {
    const w = phaseWindow();
    const v1 = w.xmin + ((x - g.rx) / g.rw) * (w.xmax - w.xmin);
    const v2 = w.ymin + ((g.ry + g.rh - y) / g.rh) * (w.ymax - w.ymin);
    const c = cur();
    if (mode === 0) {
      c.x0 = clamp(v1, 0.03, 0.999);
      c.y0 = clamp(Math.min(v2, 1 - c.x0), 0.001, 0.5);
    } else {
      /* 拖到平衡点附近就吸附上去：中心平衡点「原地不动」这一课必须真能点到 */
      const ex = c.b / REC;
      const ey = c.a / REC;
      c.x0 = clamp(v1, 0.2, 8);
      c.y0 = clamp(v2, 0.2, 8);
      if (Math.hypot(c.x0 - ex, c.y0 - ey) < 0.09) { c.x0 = ex; c.y0 = ey; }
    }
    rebuild();
  }

  bindPointer(cv.canvas, {
    /* 判据放宽到整个右半栏：拖出坐标框也能抓，越界值由 clamp 顶住，
       否则读者一拖出框就「松手」，会以为组件卡了。 */
    pick(x, y) {
      const inside = x >= g.rx - 24 && y >= g.ry - 20 && y <= g.ry + g.rh + 24;
      return inside ? 'ic' : null;
    },
    down(id, x, y) {
      frozen = mode === 0 ? null : phaseWindow();
      setStart(x, y);
    },
    move(id, x, y) { setStart(x, y); },
    up() {
      if (frozen) { frozen = null; rebuild(); }
    },
  });

  const loop = anim(host, {
    onTick(dt) {
      if (!sim) return;
      idx += dt * SEEK;
      if (idx > sim.n) idx = 0;
      draw();
    },
    onReset() { idx = 0; draw(); },
  });

  const seg = buildSegmented(
    [{ value: 0, label: 'SIR 疫情' }, { value: 1, label: '捕食者-猎物' }],
    mode,
    (v) => {
      mode = v;
      frozen = null;
      const c = cur();
      setSliderRow(sliders, 0, c.a, 2, 'a');
      setSliderRow(sliders, 1, c.b, 2, 'b');
      rebuild();
    },
  );
  host.insertBefore(seg, ro.box);

  rebuild();
  cv.redraw = () => draw();
  return { slidersBox: sliders.box, destroy() { loop.stop(); cv.redraw = null; } };
}
