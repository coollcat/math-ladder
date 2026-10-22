/* =========================================================================
 * lab 组件：code-method-map —— 编码方法地图：四根轴上的取舍
 * -------------------------------------------------------------------------
 * 用法（第 35 章《编码理论方法地图》动手实验）：
 *   { "type": "code-method-map", "title": "…" }
 * 字段（都可省）：height 画布高度（默认 520）。
 *
 * 左边是一张「需求 → 方法」的对照板，右边是四条相互拉扯的轴：
 *   码率 R、最小距离 d_min、延迟、译码复杂度。拖任意一根滑块，八种代表码的
 *   位置与得分都会重排；选中的码会被点亮，并给出「它为什么排在这里」。
 * 这不是排行榜：把权重完全反过来，冠军会换人——正是课文那句
 *   「没有单一最优码，只有在具体约束下的合适码」。
 *
 * 取舍：所有方法参数是教学用的相对值（1–5 的量级），不冒充真实标准参数；
 *   加权和只在画面上用于排序，公式也一并写出来，方便质疑与修改。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, setSliderRow, buildToolbar, buildReadout,
  mkBtn, label, clearBg,
} from '../core.js';

/* rate 用真实码率的量级；strength / latency / complexity 是 1–5 的相对刻度 */
const METHODS = [
  { name: '奇偶校验', full: 'parity', rate: 0.95, strength: 1, latency: 1, complexity: 1, note: '一位警报：检错便宜，几乎不纠错' },
  { name: '重复码', full: 'repetition', rate: 0.33, strength: 1, latency: 1, complexity: 1, note: '把同一个位说三遍，边界在“错不超过一半”' },
  { name: 'Hamming(7,4)', full: 'hamming', rate: 0.57, strength: 2, latency: 2, complexity: 2, note: '门牌号定位：纠 1 位，硬件极省' },
  { name: 'BCH / RS', full: 'bch-rs', rate: 0.70, strength: 4, latency: 3, complexity: 4, note: '代数码，擅长成串突发错；要交织配合' },
  { name: '卷积码 + 维特比', full: 'conv', rate: 0.50, strength: 3, latency: 3, complexity: 3, note: '带记忆、边流边译，深空的老班底' },
  { name: 'Turbo 码', full: 'turbo', rate: 0.50, strength: 5, latency: 4, complexity: 4, note: '两个分量码互相喂软信息，逼近极限' },
  { name: 'LDPC', full: 'ldpc', rate: 0.75, strength: 4, latency: 4, complexity: 4, note: '稀疏图消息传递：Wi-Fi 与 5G 的主力' },
  { name: 'Polar 码', full: 'polar', rate: 0.60, strength: 5, latency: 3, complexity: 4, note: '信道极化：5G 控制信道的选择' },
];

export default function render(host, spec) {
  const cv = setupCanvas(host, spec.height || 540);

  const sliders = buildSliders({
    sliders: [
      { name: 'wRate', label: '看重码率', min: 0, max: 1, step: 0.05, value: 0.2 },
      { name: 'wStrength', label: '看重纠错力', min: 0, max: 1, step: 0.05, value: 0.6 },
      { name: 'wLatency', label: '看重低延迟', min: 0, max: 1, step: 0.05, value: 0.1 },
      { name: 'wComplexity', label: '看重低复杂度', min: 0, max: 1, step: 0.05, value: 0.1 },
    ],
  }, () => draw());
  const ro = buildReadout({
    当前冠军: '—',
    得分公式: '—',
    最低延迟: '—',
    最高码率: '—',
  });
  host.appendChild(ro.box);
  const bZero = mkBtn('清空权重');
  const bHard = mkBtn('可靠性优先');
  const bCheap = mkBtn('低成本优先');
  host.appendChild(buildToolbar(bZero, bHard, bCheap));

  const geo = { W: 0, H: 0, x0: 0, y0: 0, chartW: 0, chartH: 0, listY: 0 };

  /* 归一化到 0..1：码率直接用；其余 (v-1)/4 */
  const norm = (m) => ({
    rate: m.rate,
    strength: (m.strength - 1) / 4,
    latency: (m.latency - 1) / 4,
    complexity: (m.complexity - 1) / 4,
  });

  function scores() {
    const w = sliders.state;
    /* 延迟与复杂度都是「越低越好」，所以进分时取负号 */
    return METHODS.map((m) => {
      const v = norm(m);
      const s = w.wRate * v.rate
        + w.wStrength * v.strength
        - w.wLatency * v.latency
        - w.wComplexity * v.complexity;
      return { m, v, s };
    }).sort((a, b) => b.s - a.s);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const wide = W >= 660;
    geo.W = W;
    geo.H = H;
    geo.x0 = 20;
    geo.y0 = 70;
    geo.chartW = wide ? Math.min(W * 0.42, 320) : W - 40;
    geo.chartH = Math.min(H - 200, 300);

    const rows = scores();
    label(ctx, '八种代表码在同一张选取图上：拖动下面四根权重，看冠军换人', 20, 26, C.fg,
      { size: 12.5, weight: 700 });
    label(ctx, '得分 = w_码率·R + w_纠错·强度 − w_延迟·延迟 − w_复杂·复杂度（归一化到 0–1）',
      20, 46, C.axis, { size: 10.5 });

    /* ---- 散点：横轴码率，纵轴纠错强度 ---- */
    const cx = geo.x0;
    const cy = geo.y0;
    const cw = geo.chartW;
    const ch = geo.chartH;
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.restore();
    label(ctx, '码率 R →', cx + cw / 2, cy + ch + 22, C.axis, { size: 10, align: 'center' });
    ctx.save();
    ctx.translate(cx - 14, cy + ch / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, '纠错强度 →', 0, 0, C.axis, { size: 10, align: 'center' });
    ctx.restore();

    rows.forEach((row, i) => {
      const px = cx + 10 + row.v.rate * (cw - 26);
      const py = cy + ch - 12 - row.v.strength * (ch - 26);
      const isTop = i === 0;
      const rad = isTop ? 7 : 5;
      ctx.save();
      ctx.fillStyle = isTop ? C.named('green') : C.accent;
      ctx.globalAlpha = isTop ? 1 : 0.65;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, row.m.name, px + 9, py + 4, isTop ? C.fg : C.axis,
        { size: isTop ? 10.5 : 9.5, weight: isTop ? 700 : 400 });
    });

    /* ---- 排名条（右侧） ---- */
    const lx = wide ? cx + cw + 26 : 20;
    let ly = wide ? cy : cy + ch + 52;
    const lw = wide ? W - lx - 20 : W - 40;
    if (wide) {
      label(ctx, '按当前权重的排序', lx, ly - 12, C.fg, { size: 11.5, weight: 700 });
      const maxS = Math.max(...rows.map((r) => r.s), 0.001);
      rows.forEach((row, i) => {
        const y = ly + i * 27;
        label(ctx, String(i + 1), lx, y, i === 0 ? C.named('green') : C.axis,
          { size: 10.5, weight: i === 0 ? 700 : 400 });
        label(ctx, row.m.name, lx + 14, y, i === 0 ? C.fg : C.axis,
          { size: 10.5, weight: i === 0 ? 700 : 400 });
        const bw2 = Math.max(2, (Math.max(row.s, 0) / maxS) * (lw - 150));
        ctx.save();
        ctx.fillStyle = i === 0 ? C.named('green') : C.accent;
        ctx.globalAlpha = i === 0 ? 0.9 : 0.35;
        ctx.fillRect(lx + 92, y - 8, bw2, 10);
        ctx.restore();
        label(ctx, row.s.toFixed(2), lx + lw - 4, y, C.axis, { size: 9.5, align: 'right' });
      });
      ly += rows.length * 27 + 14;
      label(ctx, '★ ' + rows[0].m.name + '：' + rows[0].m.note, lx, ly, C.named('green'),
        { size: 10.5, weight: 700 });
    } else {
      rows.forEach((row, i) => {
        label(ctx, (i + 1) + '. ' + row.m.name + '　' + row.s.toFixed(2), lx,
          ly + i * 16, i === 0 ? C.named('green') : C.axis, { size: 10, weight: i === 0 ? 700 : 400 });
      });
    }

    ro.set('当前冠军', rows[0].m.name);
    ro.set('得分公式', rows[0].s.toFixed(2) + ' / 满分约 1.0');
    const lowestLat = METHODS.slice().sort((a, b) => a.latency - b.latency)[0];
    ro.set('最低延迟', lowestLat.name);
    const bestRate = METHODS.slice().sort((a, b) => b.rate - a.rate)[0];
    ro.set('最高码率', bestRate.name + '（R=' + bestRate.rate.toFixed(2) + '）');
  }

  /* 预设：按行序回写四根滑块（wRate/wStrength/wLatency/wComplexity） */
  function preset(vals) {
    const names = ['wRate', 'wStrength', 'wLatency', 'wComplexity'];
    vals.forEach((v, i) => setSliderRow(sliders, i, v, 2, names[i]));
    draw();
  }
  bZero.addEventListener('click', () => preset([0, 0, 0, 0]));
  bHard.addEventListener('click', () => preset([0.2, 1, 0, 0]));
  bCheap.addEventListener('click', () => preset([0.3, 0, 0.5, 1]));

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() {} };
}
