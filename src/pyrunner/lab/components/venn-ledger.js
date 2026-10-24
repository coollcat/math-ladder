/* =========================================================================
 * lab 组件：venn-ledger —— 七个区域，每人被数几次
 * -------------------------------------------------------------------------
 * 用法（第 28 章《容斥原理》动手实验）：
 *   { "type": "venn-ledger", "title": "…" }
 * 字段（都可省）：a / b / c 三个单集合大小（默认 60 / 80 / 50）；
 *   ab / ac / bc 两两交集（默认 25 / 20 / 15）；abc 三重交集（默认 10）；
 *   total 总人数（默认 160）；height 画布高度（默认 520）。
 *
 * 演示什么：容斥不是「见重叠就减」，而是一套按区域发工资的会计制度。
 *   · 三圈画出七块地皮，每块地皮标出「被几个集合包含」；
 *   · 右侧账本对每块地皮算净系数：+1×（含它的单集数）−1×（含它的两两交集数）
 *     +1×（含它的三重交集）——七块地皮净系数全是 1，这才是「多加的要减回去、
 *     减过头的要加回来」的全部内容；
 *   · 按钮「只减不加」把 +|A∩B∩C| 撕掉，中心地皮净系数立刻变 0，
 *     并集随之少掉 10 人——三圈以上只减不加的经典事故现场。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：五个滑块＝三对交集 + 三重交集 + 总人数，全是课文例题里的量。
 *   2. 即时后果：七块地皮的数字、并集、「都不选」同时重算；地皮变成负数会在
 *      图上标红——这正是例题里 $100 - 140 < 0$ 那条警报的来源。
 *   3. 读数：并集算式、并集、都不选、状态四行，与正文第 4 节逐步算例一一对应。
 *   4. 啊哈预设：「只减不加」一键看到中心归零；总人数拖到 100 一键看到负数警报。
 *   5. 默认状态即课文例题：60/80/50、25/20/15、10、160 → 并集 140、都不选 20。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, clearBg, clamp,
} from '../core.js';

/* 三圆的 Venn 几何：半径 1，圆心按经典布局摆放，标签坐标同单位 */
const CEN = [[0, 0.5], [-0.866, -0.5], [0.866, -0.5]];
const SPOT = {
  a: [0, 0.85], b: [-0.85, -0.62], c: [0.85, -0.62],
  ab: [-0.43, 0.25], ac: [0.43, 0.25], bc: [0, -0.72],
  abc: [0, -0.06],
};

export default function render(host, spec) {
  const def = { a: 60, b: 80, c: 50, ab: 25, ac: 20, bc: 15, abc: 10, total: 160 };
  const st = {
    ab: clamp(Math.round(spec.ab ?? def.ab), 0, 40),
    ac: clamp(Math.round(spec.ac ?? def.ac), 0, 40),
    bc: clamp(Math.round(spec.bc ?? def.bc), 0, 40),
    abc: clamp(Math.round(spec.abc ?? def.abc), 0, 30),
    total: clamp(Math.round(spec.total ?? def.total), 100, 220),
  };
  const SA = clamp(Math.round(spec.a ?? def.a), 0, 99);   /* 单集合大小按课文锁定 */
  const SB = clamp(Math.round(spec.b ?? def.b), 0, 99);
  const SC = clamp(Math.round(spec.c ?? def.c), 0, 99);
  let dropTriple = false;

  const cv = setupCanvas(host, clamp(spec.height || 520, 380, 900));
  const ro = buildReadout({ 并集算式: '—', 并集: '—', 都不选: '—', 状态: '—' });
  host.appendChild(ro.box);

  const bDrop = mkBtn('只减不加（撕掉三重交集）');
  const bAlarm = mkBtn('总人数调到 100');
  const bReset = mkBtn('回到课文例题');
  host.appendChild(buildToolbar(bDrop, bAlarm, bReset));

  host.appendChild(buildSegmented(
    [{ label: '七区账本', value: 'ledger' }, { label: '并集与余量', value: 'union' }],
    'ledger',
    (v) => { st.view = v; draw(); },
  ));
  st.view = 'ledger';

  const sl = buildSliders({
    sliders: [
      { name: 'ab', label: '|语∩数|', min: 0, max: 40, step: 1, value: st.ab },
      { name: 'ac', label: '|语∩英|', min: 0, max: 40, step: 1, value: st.ac },
      { name: 'bc', label: '|数∩英|', min: 0, max: 40, step: 1, value: st.bc },
      { name: 'abc', label: '|三门全报|', min: 0, max: 30, step: 1, value: st.abc },
      { name: 'total', label: '总人数', min: 100, max: 220, step: 1, value: st.total },
    ],
  }, (s) => {
    st.ab = s.ab; st.ac = s.ac; st.bc = s.bc; st.abc = s.abc; st.total = s.total;
    dropTriple = false;
    draw();
  });
  host.appendChild(sl.box);

  /* 七块地皮大小：单集独有＝单集 − 两两 + 三重 */
  function regions() {
    const t = st.abc;
    return {
      abc: t,
      ab: st.ab - t, ac: st.ac - t, bc: st.bc - t,
      a: SA - st.ab - st.ac + t,
      b: SB - st.ab - st.bc + t,
      c: SC - st.ac - st.bc + t,
    };
  }

  /* 每块地皮的净系数：含它的单集 +1、两两 −1、三重 +1（可被「只减不加」撕掉） */
  const SETS = { a: ['a'], b: ['b'], c: ['c'], ab: ['a', 'b'], ac: ['a', 'c'], bc: ['b', 'c'], abc: ['a', 'b', 'c'] };
  function coef(key) {
    const inSets = SETS[key].length;
    const singles = inSets;                       /* +1 × 包含它的单集个数 */
    const pairs = inSets === 1 ? 0 : inSets === 2 ? 1 : 3;  /* −1 × 包含它的两两交集个数 */
    const triple = key === 'abc' && !dropTriple ? 1 : 0;
    return singles - pairs + triple;
  }

  function unionOf(useTriple) {
    return SA + SB + SC - st.ab - st.ac - st.bc + (useTriple ? st.abc : 0);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const R = regions();
    const union = unionOf(!dropTriple);
    const truth = R.a + R.b + R.c + R.ab + R.ac + R.bc + R.abc;
    const neither = st.total - union;

    /* 缩放：让三圆占据左半边（宽屏）或上半部（窄屏） */
    const wide = W >= 640;
    const cx = wide ? W * 0.30 : W / 2;
    const cy = wide ? H * 0.44 : H * 0.34;
    const scale = wide ? Math.min(W * 0.15, H * 0.29) : Math.min(W * 0.24, H * 0.20);

    const COL = [C.named('blue'), C.named('orange'), C.named('green')];
    label(ctx, '语文 60　数学 80　英语 50（单集大小按课文锁定）', 14, 20, C.axis, { size: 10.5 });

    /* 三圆 */
    CEN.forEach((p, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + p[0] * scale, cy + p[1] * scale, scale, 0, Math.PI * 2);
      ctx.fillStyle = COL[i];
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = COL[i];
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    });

    /* 七块地皮的数字；负值标红（数据自相矛盾） */
    Object.keys(SPOT).forEach((k) => {
      const p = SPOT[k];
      const x = cx + p[0] * scale;
      const y = cy + p[1] * scale;
      const v = R[k];
      const bad = v < 0;
      label(ctx, String(v), x, y + 4, bad ? C.bad : C.fg, { size: k === 'abc' ? 14 : 12, align: 'center', weight: 700 });
      const cf = coef(k);
      label(ctx, (cf >= 0 ? '+' : '−') + Math.abs(cf), x, y + 17, cf === 1 ? C.ok : C.bad, { size: 9.5, align: 'center' });
    });

    /* 右下账本 */
    const bx = wide ? W * 0.60 : 16;
    let y = wide ? 40 : H * 0.62;
    const stepY = wide ? 21 : 18;
    label(ctx, '账本：每块地皮的净系数', bx, y, C.fg, { size: 11.5, weight: 700 });
    y += stepY + 2;
    const NOTE = { a: '语只', b: '数只', c: '英只', ab: '语∩数', ac: '语∩英', bc: '数∩英', abc: '三门全报' };
    Object.keys(SPOT).forEach((k) => {
      label(ctx, NOTE[k] + ' = ' + R[k], bx, y, R[k] < 0 ? C.bad : C.fg, { size: 10.5 });
      const cf = coef(k);
      label(ctx, '× ' + cf + (cf === 1 ? ' ✓' : ' ✗'), bx + (wide ? 128 : 150), y, cf === 1 ? C.ok : C.bad, { size: 10.5, weight: 700 });
      y += stepY;
    });

    y += 4;
    label(ctx, '公式并集 = 60 + 80 + 50 − ' + st.ab + ' − ' + st.ac + ' − ' + st.bc
      + (dropTriple ? '' : ' + ' + st.abc) + ' = ' + union, bx, y, C.fg, { size: 10.5, weight: 700 });
    y += stepY;
    label(ctx, '按七块地皮真加 = ' + truth + (truth === union ? '（一致 ✓）' : '（差 ' + (truth - union) + ' ✗）'),
      bx, y, truth === union ? C.ok : C.bad, { size: 10.5 });
    y += stepY;
    label(ctx, st.total + ' 人里都不选 = ' + neither, bx, y, neither < 0 ? C.bad : C.fg, { size: 11, weight: 700 });
    y += stepY;
    if (neither < 0) label(ctx, '负数 = 数据自相矛盾，先查口径', bx, y, C.bad, { size: 10.5, weight: 700 });
    else if (dropTriple) label(ctx, '中心地皮净系数 0：这 10 人被抹掉了', bx, y, C.bad, { size: 10.5, weight: 700 });
    else label(ctx, '奇偶交替，七块地皮净系数全是 1', bx, y, C.ok, { size: 10.5 });

    if (st.view === 'union') {
      /* 余量条：并集 vs 不沾 */
      const bx0 = wide ? W * 0.06 : 16;
      const bw = W - bx0 * 2;
      const byy = H - 34;
      const u = clamp(union / st.total, 0, 1);
      ctx.save();
      ctx.fillStyle = C.named('blue');
      ctx.globalAlpha = 0.7;
      ctx.fillRect(bx0, byy, bw * u, 16);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.axis;
      ctx.strokeRect(bx0, byy, bw, 16);
      ctx.restore();
      label(ctx, '并集 ' + union, bx0 + 4, byy + 13, '#ffffff', { size: 10 });
      label(ctx, '都不选 ' + neither, bx0 + bw + 2, byy + 13, neither < 0 ? C.bad : C.axis, { size: 10 });
    }

    ro.set('并集算式', '60 + 80 + 50 − ' + st.ab + ' − ' + st.ac + ' − ' + st.bc
      + (dropTriple ? '（缺 +' + st.abc + '）' : ' + ' + st.abc));
    ro.set('并集', union + ' 人');
    ro.set('都不选', neither + ' 人');
    ro.set('状态', neither < 0 ? '警报：并集超过总人数，数据矛盾'
      : dropTriple ? '中心地皮被抹掉，并集少了 ' + st.abc + ' 人'
        : '七块地皮净系数全为 1');
  }

  bDrop.addEventListener('click', () => { dropTriple = !dropTriple; draw(); });
  bAlarm.addEventListener('click', () => {
    st.total = 100; dropTriple = false;
    const row = sl.box.children[4];
    if (row) { if (row.children[1]) row.children[1].value = '100'; if (row.children[2]) row.children[2].textContent = '100'; }
    sl.state.total = 100;
    draw();
  });
  bReset.addEventListener('click', () => {
    st.ab = def.ab; st.ac = def.ac; st.bc = def.bc; st.abc = def.abc; st.total = def.total;
    dropTriple = false;
    ['ab', 'ac', 'bc', 'abc', 'total'].forEach((k, i) => {
      const row = sl.box.children[i];
      if (!row) return;
      if (row.children[1]) row.children[1].value = String(def[k]);
      if (row.children[2]) row.children[2].textContent = String(def[k]);
      sl.state[k] = def[k];
    });
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { cv.redraw = null; } };
}
