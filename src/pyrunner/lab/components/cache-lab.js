/* =========================================================================
 * lab 组件：cache-lab（存储层次与缓存）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "cache-lab", "title": "把容量翻倍，命中率为什么没变" }
 *   ```
 *
 * 可选字段（都有默认值，最小 spec 只写 type + title 就能跑）：
 *   seq       访问的地址序列，默认 16 个地址的小循环 [0,1,2,3,0,1,2,3,…]。
 *   capacity  缓存总容量（字），默认 8
 *   blockSize 块大小（字/块），默认 1
 *   assoc     每组几路，默认 1（1 = 直接映射）
 *   policy    替换策略 "lru" / "fifo" / "random"，默认 "lru"
 *   wpolicy   写策略 "wb"（写回）/ "wt"（写穿），默认 "wb"
 *   writeRate 写访问占比 0 / 0.25 / 0.5 / 1，默认 0.25
 *   axis      下方曲线的横轴 "capacity" / "block" / "assoc"，默认 "capacity"
 *   height    画布高度，默认 430
 *
 * 能玩什么：
 *   · 顶部一排地址：按「单步」逐个访问，看这次是命中（绿）还是缺失（红），
 *     落在第几组、替换掉了谁、脏块要不要写回。
 *   · 上下拖地址格：改这个地址，命中率当场变——想造冲突就把它改成差 8 的倍数。
 *   · 拖地址条下面的细进度条：来回滚着看某一次访问。
 *   · 「播放」自动走完整个序列。
 *   · 底下的曲线：命中率随容量 / 块大小 / 关联度怎么变，当前工作点用竖线标出来。
 *     三个横轴用分段按钮切——这就是「3C 失效」的直观版本：容量失效靠加容量，
 *     冲突失效靠加关联度，冷失效只能靠预取。
 *
 * 取舍：命中/缺失与 3C 分类（冷失效 / 冲突失效 / 容量失效）直接调
 * logic.js 的 cacheSim，索引口径完全一致（block = addr/blockSize，
 * set = block % sets，tag = block / sets）。逐次访问的逐步演示另写了一个
 * 步模拟器，为的是拿得到每次的「被踢掉的是谁、它脏不脏」——cacheSim 的
 * 日志里没有这些。随机替换用固定种子的线性同余，保证同一份配置反复重绘
 * 结果一致，不会闪。cacheSim 只认 lru / 非 lru（非 lru 走 FIFO），
 * 所以 3C 分类这一栏在 random 策略下按 FIFO 口径统计——3C 只取决于
 * 「组满没满、别的组还有没有空位」，与具体踢谁无关，所以这个口径是准的。
 * ========================================================================= */

import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildToolbar,
  buildReadout, bindPointer, mkBtn, label, polyline, clamp, fmt,
  clearBg,
  lcg,
} from '../core.js';
import { cacheSim } from '../engines/logic.js';

const PRESETS = {
  loop: { name: '小循环重用', seq: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3] },
  scan: { name: '顺序扫描', seq: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  ping: { name: '乒乓冲突', seq: [0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8] },
  stride: { name: '跨步访问', seq: [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15] },
};

/* 固定种子，保证随机替换可复现 */
function makeRnd() {
  return lcg(20240913, true);
}

/* 逐次访问的步模拟器：额外给出「被踢掉的是谁、它脏不脏」 */
function stepSim(cfg, seq, isWrite) {
  const sets = Math.max(1, Math.floor(cfg.capacity / (cfg.blockSize * cfg.assoc)));
  const store = Array.from({ length: sets }, () => []);
  const rnd = makeRnd();
  let hits = 0;
  let misses = 0;
  let wb = 0;
  let traffic = 0;
  const steps = [];

  seq.forEach((addr, i) => {
    const block = Math.floor(addr / cfg.blockSize);
    const setIdx = block % sets;
    const tag = Math.floor(block / sets);
    const set = store[setIdx];
    const w = isWrite(i);
    let kind = 'hit';
    let victim = null;

    const idx = set.findIndex((e) => e.tag === tag);
    if (idx >= 0) {
      hits += 1;
      set[idx].stamp = i;
      if (w && cfg.wpolicy === 'wb') set[idx].dirty = true;
      if (w && cfg.wpolicy === 'wt') traffic += 1;
    } else {
      misses += 1;
      traffic += cfg.blockSize;                       // 整块从内存读进来
      if (set.length >= cfg.assoc) {
        let vi = 0;
        if (cfg.policy === 'lru') set.forEach((e, j) => { if (e.stamp < set[vi].stamp) vi = j; });
        else if (cfg.policy === 'fifo') set.forEach((e, j) => { if (e.fifo < set[vi].fifo) vi = j; });
        else vi = Math.floor(rnd() * set.length) % set.length;
        victim = { tag: set[vi].tag, dirty: set[vi].dirty };
        if (victim.dirty) { traffic += cfg.blockSize; wb += 1; }   // 脏块被踢 → 写回整块
        set.splice(vi, 1);
      }
      set.push({ tag, stamp: i, fifo: i, dirty: !!(w && cfg.wpolicy === 'wb') });
      if (w && cfg.wpolicy === 'wt') traffic += 1;
      kind = victim ? 'conflict' : 'cold';
    }

    steps.push({
      i, addr, set: setIdx, tag, kind, victim, write: w,
      snap: store.map((s) => s.map((e) => ({ tag: e.tag, dirty: e.dirty }))),
      hits, misses, traffic, wb,
    });
  });

  return { steps, sets, hits, misses, wb, traffic, hitRate: seq.length ? hits / seq.length : 0 };
}

export default function render(host, spec) {
  const H = spec.height || 430;
  const cfg = {
    capacity: clamp(spec.capacity ?? 8, 2, 64),
    blockSize: clamp(spec.blockSize ?? 1, 1, 16),
    assoc: clamp(spec.assoc ?? 1, 1, 8),
    policy: ['lru', 'fifo', 'random'].indexOf(spec.policy) >= 0 ? spec.policy : 'lru',
    wpolicy: spec.wpolicy === 'wt' ? 'wt' : 'wb',
  };
  let seq = (Array.isArray(spec.seq) && spec.seq.length ? spec.seq : PRESETS.loop.seq)
    .map((v) => (v | 0) & 0xffff).slice(0, 24);
  let writeRate = clamp(spec.writeRate ?? 0.25, 0, 1);
  let axis = ['capacity', 'block', 'assoc'].indexOf(spec.axis) >= 0 ? spec.axis : 'capacity';
  let step = 0;
  let drag = null;
  let geo = { chipY: 18, chipH: 26, barY: 48, barH: 10, W: 0 };

  const isWrite = (i) => writeRate > 0 && (i % Math.max(1, Math.round(1 / writeRate))) === 0;
  let sim = stepSim(cfg, seq, isWrite);

  const cv = setupCanvas(host, H);
  const ro = buildReadout({
    本次: '—', 累计: '—', 命中率: '—', '3C 分类': '—', 访存字数: '—', 写回: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    Object.keys(PRESETS).map((k) => ({ label: PRESETS[k].name, value: k })),
    'loop',
    (v) => { seq = PRESETS[v].seq.slice(); recompute(); },
  ));
  host.appendChild(buildSegmented([
    { label: 'LRU', value: 'lru' }, { label: 'FIFO', value: 'fifo' }, { label: '随机', value: 'random' },
  ], cfg.policy, (v) => { cfg.policy = v; recompute(); }));
  host.appendChild(buildSegmented([
    { label: '写回（脏块才写）', value: 'wb' }, { label: '写穿（每次写都穿）', value: 'wt' },
  ], cfg.wpolicy, (v) => { cfg.wpolicy = v; recompute(); }));
  host.appendChild(buildSegmented([
    { label: '曲线横轴：容量', value: 'capacity' },
    { label: '块大小', value: 'block' },
    { label: '关联度', value: 'assoc' },
  ], axis, (v) => { axis = v; draw(); }));

  const bStep = mkBtn('单步 ▶');
  const bBack = mkBtn('◀ 上一步');
  host.appendChild(buildToolbar(bStep, bBack));

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'capacity', label: '容量（字）', min: 2, max: 32, step: 1, value: cfg.capacity },
        { name: 'blockSize', label: '块大小（字/块）', min: 1, max: 8, step: 1, value: cfg.blockSize },
        { name: 'assoc', label: '每组路数', min: 1, max: 4, step: 1, value: cfg.assoc },
        { name: 'writeRate', label: '写访问占比', min: 0, max: 1, step: 0.25, value: writeRate },
      ],
    },
    (stx) => {
      cfg.capacity = stx.capacity;
      cfg.blockSize = stx.blockSize;
      cfg.assoc = stx.assoc;
      writeRate = stx.writeRate;
      recompute();
    },
  );

  function recompute() {
    sim = stepSim(cfg, seq, isWrite);
    step = clamp(step, 0, Math.max(seq.length - 1, 0));
    sync();
    draw();
  }

  function sync() {
    const st = sim.steps[step];
    if (!st) return;
    const cs = cacheSim({
      accesses: seq, capacity: cfg.capacity, blockSize: cfg.blockSize,
      assoc: cfg.assoc, policy: cfg.policy === 'lru' ? 'lru' : 'fifo',
    });
    const kindTxt = { hit: '命中（绿）', cold: '冷失效（首次访问）', conflict: '失效 → 替换（红）' };
    ro.set('本次', `第 ${step + 1} 次  地址 ${st.addr}  →  ${kindTxt[st.kind]}　${st.write ? '（这是一次写）' : ''}`);
    ro.set('累计', `${st.hits} 命中 / ${st.misses} 缺失　共 ${seq.length} 次`);
    ro.set('命中率', fmt(sim.hitRate * 100, 1) + '%');
    ro.set('3C 分类', `冷失效 ${cs.coldMiss}　冲突失效 ${cs.conflictMiss}　容量失效 ${cs.capacityMiss}`);
    ro.set('访存字数', `${st.traffic} 字（当前配置跑完是 ${sim.traffic} 字）`);
    ro.set('写回', `${st.wb} 次（脏块被踢时整块写回，每次 ${cfg.blockSize} 字）`);
  }

  /* 曲线的横轴取值 */
  function axisValues() {
    if (axis === 'capacity') {
      const out = [];
      for (let v = 2; v <= 32; v += 2) out.push(v);
      return out;
    }
    if (axis === 'block') return [1, 2, 3, 4, 5, 6, 7, 8];
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }

  function curve() {
    return axisValues().map((v) => {
      const c = {
        capacity: axis === 'capacity' ? v : cfg.capacity,
        blockSize: axis === 'block' ? v : cfg.blockSize,
        assoc: axis === 'assoc' ? v : cfg.assoc,
      };
      return cacheSim({
        accesses: seq, capacity: c.capacity, blockSize: c.blockSize,
        assoc: c.assoc, policy: cfg.policy === 'lru' ? 'lru' : 'fifo',
      }).hitRate;
    });
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const Hh = cv.H;
    clearBg(ctx, W, Hh, C);

    const n = seq.length;
    const chipY = 20;
    const chipH = 26;
    const barY = chipY + chipH + 6;
    const barH = 10;
    geo = { chipY, chipH, barY, barH, W };
    const cwid = (W - 16) / n;

    label(ctx, '访问序列（上下拖格子改地址，拖下面的细条换步）', 8, 12, C.fg, { size: 10.5 });

    /* 地址格 */
    for (let i = 0; i < n; i += 1) {
      const x = 8 + i * cwid;
      const st = sim.steps[i];
      const seen = i <= step;
      const on = i === step;
      ctx.fillStyle = on ? C.accent : (seen ? C.soft : C.soft);
      ctx.globalAlpha = on ? 1 : (seen ? 1 : 0.45);
      ctx.fillRect(x + 1, chipY, cwid - 2, chipH);
      ctx.globalAlpha = 1;
      if (st && i <= step) {
        ctx.strokeStyle = st.kind === 'hit' ? C.ok : C.bad;
        ctx.lineWidth = on ? 2 : 1.2;
        ctx.strokeRect(x + 1.5, chipY + 0.5, cwid - 3, chipH - 1);
      } else {
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, chipY + 0.5, cwid - 3, chipH - 1);
      }
      label(ctx, String(seq[i]), x + cwid / 2, chipY + 17, on ? C.bg : C.fg,
        { align: 'center', size: Math.min(12, Math.max(8, cwid * 0.42)), weight: 700 });
      if (isWrite(i) && cwid >= 14) {
        label(ctx, 'W', x + cwid - 5, chipY + 9, C.accent2, { align: 'right', size: 7.5 });
      }
    }
    /* 细进度条 */
    ctx.fillStyle = C.soft;
    ctx.fillRect(8, barY, W - 16, barH);
    ctx.fillStyle = C.accent;
    ctx.fillRect(8, barY, ((step + 1) / n) * (W - 16), barH);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, barY + 0.5, W - 17, barH - 1);

    /* 缓存结构 */
    const py = barY + barH + 20;
    const st = sim.steps[step];
    label(ctx, `缓存：${cfg.capacity} 字 / ${cfg.blockSize} 字一块 / ${cfg.assoc} 路 `
      + `→ ${sim.sets} 组　${cfg.policy.toUpperCase()} 替换　${cfg.wpolicy === 'wb' ? '写回' : '写穿'}`,
      8, py - 6, C.fg, { size: 10.5 });

    const rowsH = Math.min(150, sim.sets * 18 + 4);
    const rh = Math.min(18, rowsH / Math.max(sim.sets, 1));
    const labW = Math.min(46, W * 0.16);
    const cellW = (W - 16 - labW) / cfg.assoc;
    const snap = st ? st.snap : [];
    for (let s = 0; s < sim.sets; s += 1) {
      const y = py + s * rh;
      const onSet = st && st.set === s;
      if (onSet) {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(6, y, W - 12, rh - 2);
        ctx.globalAlpha = 1;
      }
      label(ctx, `组 ${s}`, 8, y + rh - 5, onSet ? C.accent : C.axis, { size: 9.5, weight: onSet ? 700 : 400 });
      const line = snap[s] || [];
      for (let a = 0; a < cfg.assoc; a += 1) {
        const x = 8 + labW + a * cellW;
        const e = line[a];
        const slotHit = onSet && st && st.kind === 'hit' && e && e.tag === st.tag;
        ctx.fillStyle = slotHit ? C.ok : (onSet ? C.soft : C.soft);
        ctx.globalAlpha = onSet ? 1 : 0.55;
        ctx.fillRect(x, y, cellW - 3, rh - 3);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = slotHit ? C.ok : (e ? C.axis : C.grid);
        ctx.lineWidth = slotHit ? 1.8 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellW - 4, rh - 4);
        if (e) {
          label(ctx, `tag ${e.tag}${e.dirty ? ' ●脏' : ''}`, x + 5, y + rh - 6,
            e.dirty ? C.accent2 : C.fg, { size: Math.min(10, Math.max(7.5, cellW * 0.13)) });
        }
      }
    }
    const cy2 = py + rowsH + 12;
    if (st) {
      const msg = st.kind === 'hit'
        ? `地址 ${st.addr} → 块 ${Math.floor(st.addr / cfg.blockSize)} → 组 ${st.set}，组里 tag=${st.tag} 就在，命中。`
        : `地址 ${st.addr} → 块 ${Math.floor(st.addr / cfg.blockSize)} → 组 ${st.set}，组里没有 tag=${st.tag}：`
        + (st.victim
          ? `踢掉 tag=${st.victim.tag}${st.victim.dirty ? '（脏块 → 先整块写回）' : '（干净块，直接丢）'}。`
          : '组里还有空位，直接放进去（冷失效）。');
      label(ctx, msg, 8, cy2, st.kind === 'hit' ? C.ok : C.bad, { size: 10.5 });
    }

    /* 命中率曲线 */
    const gx = 36;
    const gy = cy2 + 16;
    const gw = W - gx - 10;
    const gh = Math.max(52, Hh - gy - 20);
    const vals = axisValues();
    const ys = curve();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1);
    [0, 0.5, 1].forEach((v) => {
      const y = gy + gh - v * gh;
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(gx, y + 0.5);
      ctx.lineTo(gx + gw, y + 0.5);
      ctx.stroke();
      label(ctx, v * 100 + '%', gx - 4, y + 3, C.axis, { align: 'right', size: 8.5 });
    });
    const px = (i) => gx + (vals.length > 1 ? (i / (vals.length - 1)) * gw : gw / 2);
    const pyy = (v) => gy + gh - clamp(v, 0, 1) * gh;
    polyline(ctx, ys.map((v, i) => [px(i), pyy(v)]), C.accent, 2);
    ys.forEach((v, i) => {
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(px(i), pyy(v), 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
    /* 当前工作点 */
    const curV = axis === 'capacity' ? cfg.capacity : (axis === 'block' ? cfg.blockSize : cfg.assoc);
    const ci2 = vals.reduce((best, v, i) => (Math.abs(v - curV) < Math.abs(vals[best] - curV) ? i : best), 0);
    ctx.strokeStyle = C.bad;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px(ci2), gy);
    ctx.lineTo(px(ci2), gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.bad;
    ctx.beginPath();
    ctx.arc(px(ci2), pyy(ys[ci2]), 4, 0, Math.PI * 2);
    ctx.fill();
    const axName = axis === 'capacity' ? '容量（字）' : (axis === 'block' ? '块大小（字/块）' : '每组路数');
    label(ctx, `${axName} = ${vals[ci2]} → 命中率 ${fmt(ys[ci2] * 100, 1)}%`,
      Math.min(px(ci2) + 6, W - 130), gy + 12, C.bad, { size: 9.5, weight: 700 });
    label(ctx, axName, gx + gw, gy + gh + 12, C.axis, { align: 'right', size: 9.5 });
    vals.forEach((v, i) => {
      if (i % 2 === 0 || vals.length <= 8) {
        label(ctx, String(v), px(i), gy + gh + 12, C.axis, { align: 'center', size: 8.5 });
      }
    });
    label(ctx, '命中率', gx - 4, gy - 3, C.axis, { align: 'right', size: 8.5 });
  }

  /* ---------- 拖拽：地址格改值 / 细条换步 ---------- */
  bindPointer(cv.canvas, {
    pick(x, y) {
      if (y >= geo.barY - 3 && y <= geo.barY + geo.barH + 3) return 'bar';
      if (y >= geo.chipY - 3 && y <= geo.chipY + geo.chipH + 3 && x >= 6 && x <= cv.W - 6) {
        return 'a' + clamp(Math.floor((x - 8) / ((cv.W - 16) / seq.length)), 0, seq.length - 1);
      }
      return null;
    },
    down(id, x, y) {
      if (id === 'bar') {
        drag = { id, x };
        step = clamp(Math.floor(((x - 8) / (cv.W - 16)) * seq.length), 0, seq.length - 1);
        sync();
        draw();
        return;
      }
      drag = { id, y, base: seq[+id.slice(1)] };
    },
    move(id, x, y) {
      if (!drag || drag.id !== id) return;
      if (id === 'bar') {
        step = clamp(Math.floor(((x - 8) / (cv.W - 16)) * seq.length), 0, seq.length - 1);
      } else {
        const d = Math.round((drag.y - y) / 5);
        seq[+id.slice(1)] = ((drag.base + d * 2) % 64 + 64) % 64;
        sim = stepSim(cfg, seq, isWrite);
      }
      sync();
      draw();
    },
    up() { drag = null; },
    leave() { if (drag) { drag = null; } },
  });

  bStep.addEventListener('click', () => {
    step = (step + 1) % seq.length;
    sync();
    draw();
  });
  bBack.addEventListener('click', () => {
    step = (step - 1 + seq.length) % seq.length;
    sync();
    draw();
  });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc >= 0.45) {
        acc = 0;
        step = (step + 1) % seq.length;
        sync();
        draw();
      }
    },
    onReset() { step = 0; acc = 0; sync(); draw(); },
  });

  recompute();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
