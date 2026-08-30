/* 从需求到样机的设计闭环：需求 → 指标分解 → 方案 → 建模 → 仿真 → 样机 → 测试 → 迭代，
   最后一环回到第一环。点任一步看它的输入输出与常用工具；下面用「响应速度 vs 功耗」
   这条帕累托前沿演示指标冲突时怎么妥协——没有最优解，只有权重下的最合理解。 */
import {
  themeColors, setupCanvas, buildReadout, buildSliders, bindPointer,
  polyline, label, clamp, fmt,
} from '../core.js';

const STEPS = [
  { n: '需求', in: '用户/市场需求', out: '需求规格（功能 + 约束）', tool: '访谈、KANO、竞品拆解' },
  { n: '指标分解', in: '需求规格', out: '可验证的量化指标', tool: 'QFD 质量屋、指标树' },
  { n: '方案', in: '量化指标', out: '候选架构与关键选型', tool: '形态学矩阵、权衡研究' },
  { n: '建模', in: '选定架构', out: '数学模型 / 状态方程', tool: '机理建模、系统辨识' },
  { n: '仿真', in: '模型 + 工况', out: '预测性能、参数敏感度', tool: 'Simulink、SPICE、FEM' },
  { n: '样机', in: '仿真确认的参数', out: '可测试的物理样机', tool: 'PCB/结构设计、DFM' },
  { n: '测试', in: '样机 + 测试大纲', out: '实测数据、偏差清单', tool: '示波器、测功机、环境试验' },
  { n: '迭代', in: '实测 vs 指标的偏差', out: '改设计 / 改模型 / 改指标', tool: '根因分析、DOE、版本管理' },
];

/* 权衡模型：控制频率 f 越高响应越快，但计算与开关损耗线性上升 */
const trOf = (f) => 3500 / f;              // 上升时间 ms（带宽 ≈ f/10）
const pOf = (f) => 20 + 0.08 * f;          // 平均功耗 mW
const F_MIN = 10;
const F_MAX = 1000;

export default function render(host, spec) {
  const C = themeColors();
  const s = { w: spec.w ?? 0.5, sel: 0 };
  const cv = setupCanvas(host, 350);
  const ro = buildReadout({
    当前环节: '—', 输入: '—', 输出: '—', 常用工具: '—', 权衡建议: '—', 综合评分: '—',
  });
  host.appendChild(ro.box);

  function nodePos(i, W) {
    const cx = W / 2;
    const cy = 104;
    const R = Math.min(W * 0.42, 108);
    const a = -Math.PI / 2 + (i / STEPS.length) * Math.PI * 2;
    return { x: cx + R * Math.cos(a), y: cy + R * 0.62 * Math.sin(a), cx, cy, R };
  }

  /* 权重下的最优点：把两项代价归一后加权求和，扫一遍取最小 */
  function best() {
    const trMax = trOf(F_MIN);
    const pMax = pOf(F_MAX);
    let bf = F_MIN;
    let bc = Infinity;
    for (let f = F_MIN; f <= F_MAX; f *= 1.03) {
      const cost = s.w * (trOf(f) / trMax) + (1 - s.w) * (pOf(f) / pMax);
      if (cost < bc) {
        bc = cost;
        bf = f;
      }
    }
    return { f: bf, cost: bc, tr: trOf(bf), p: pOf(bf) };
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    /* 闭环箭头：连到下一步，最后一步绕回需求 */
    for (let i = 0; i < STEPS.length; i += 1) {
      const a = nodePos(i, W);
      const b = nodePos((i + 1) % STEPS.length, W);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const r = 26;
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x + ux * r, a.y + uy * r);
      ctx.lineTo(b.x - ux * (r + 4), b.y - uy * (r + 4));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.x - ux * (r + 4), b.y - uy * (r + 4));
      ctx.lineTo(b.x - ux * (r + 4) - ux * 7 - uy * 4, b.y - uy * (r + 4) - uy * 7 + ux * 4);
      ctx.lineTo(b.x - ux * (r + 4) - ux * 7 + uy * 4, b.y - uy * (r + 4) - uy * 7 - ux * 4);
      ctx.closePath();
      ctx.fillStyle = C.grid;
      ctx.fill();
    }

    STEPS.forEach((st, i) => {
      const p = nodePos(i, W);
      const on = i === s.sel;
      ctx.fillStyle = on ? C.accent : C.bg;
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(ctx, String(i + 1), p.x, p.y - 2, on ? C.bg : C.grid, { align: 'center', size: 9 });
      label(ctx, st.n, p.x, p.y + 9, on ? C.bg : C.fg, { align: 'center', size: 10, weight: 600 });
    });
    label(ctx, '点圆点看该步的输入 / 输出 / 常用工具', 8, 14, C.fg, { size: 10 });

    /* ---- 帕累托前沿：响应速度 vs 功耗 ---- */
    const gy = 232;
    const gh = H - gy - 26;
    const gx = 52;
    const gw = W - gx - 20;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx, gy + gh);
    ctx.lineTo(gx + gw, gy + gh);
    ctx.stroke();
    const trMax = trOf(F_MIN);
    const pMax = pOf(F_MAX);
    const X = (tr) => gx + (clamp(tr, 0, trMax) / trMax) * gw;
    const Y = (p) => gy + gh - (clamp(p, 0, pMax) / pMax) * gh;
    const curve = [];
    for (let f = F_MIN; f <= F_MAX; f *= 1.02) curve.push([X(trOf(f)), Y(pOf(f))]);
    polyline(ctx, curve, C.accent2, 2);
    const b = best();
    ctx.fillStyle = C.named('amber');
    ctx.beginPath();
    ctx.arc(X(b.tr), Y(b.p), 5.5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'f = ' + fmt(b.f, 0) + ' Hz', X(b.tr) + 8, Y(b.p) - 4, C.named('amber'), { size: 10, weight: 600 });
    label(ctx, '帕累托前沿：上升时间 (ms) ↔ 平均功耗 (mW)', gx, gy - 8, C.fg, { size: 10 });
    label(ctx, fmt(trMax, 0) + ' ms', gx + gw, gy + gh + 16, C.fg, { align: 'right', size: 9 });
    label(ctx, '快 →', gx + 4, gy + gh + 16, C.fg, { size: 9 });
    label(ctx, fmt(pMax, 0) + ' mW', gx - 4, gy + 8, C.fg, { align: 'right', size: 9 });

    /* 权重条：放在帕累托图正上方，别压到上面的流程环 */
    const wy = gy - 26;
    ctx.fillStyle = C.accent;
    ctx.fillRect(gx, wy, gw * s.w, 8);
    ctx.fillStyle = C.accent2;
    ctx.fillRect(gx + gw * s.w, wy, gw * (1 - s.w), 8);
    label(ctx, '响应速度权重 ' + fmt(s.w, 2), gx, wy - 4, C.accent, { size: 9 });
    label(ctx, '功耗权重 ' + fmt(1 - s.w, 2), gx + gw, wy - 4, C.accent2, { align: 'right', size: 9 });

    const st = STEPS[s.sel];
    ro.set('当前环节', (s.sel + 1) + '. ' + st.n);
    ro.set('输入', st.in);
    ro.set('输出', st.out);
    ro.set('常用工具', st.tool);
    ro.set('权衡建议', '控制频率 ' + fmt(b.f, 0) + ' Hz（带宽 ≈ ' + fmt(b.f / 10, 1) + ' Hz）');
    ro.set('综合评分', '上升 ' + fmt(b.tr, 1) + ' ms / 功耗 ' + fmt(b.p, 1) + ' mW / 代价 ' + fmt(b.cost, 3));
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      for (let i = 0; i < STEPS.length; i += 1) {
        const p = nodePos(i, cv.W);
        if (Math.hypot(x - p.x, y - p.y) <= 26) return i;
      }
      return null;
    },
    down(i) {
      s.sel = i;
      draw();
    },
    move() {},
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'w', label: '响应速度权重（0=只看功耗）', min: 0, max: 1, step: 0.02, value: s.w, fmt: 2 },
      ],
    },
    (v) => { s.w = v.w; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { /* 静态图，无动画 */ } };
}
