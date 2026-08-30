/* 事务与 ACID：同一段并发调度，换隔离级别重放一遍，看脏读/不可重复读/幻读/丢失更新
   哪个还在。最后用冲突图判一次「这个调度是不是冲突可串行化」。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildToolbar,
  buildReadout, el, mkBtn, label, clamp,
} from '../core.js';

const SCENES = {
  dirty: { name: '脏读', steps: [
    { tx: 0, op: 'W', item: 'x', val: 10, label: 'W(x):=10' },
    { tx: 1, op: 'R', item: 'x', label: 'R(x)' },
    { tx: 0, op: 'A', label: 'ROLLBACK' },
    { tx: 1, op: 'C', label: 'COMMIT' },
  ] },
  nrep: { name: '不可重复读', steps: [
    { tx: 1, op: 'R', item: 'x', label: 'R(x)' },
    { tx: 0, op: 'W', item: 'x', val: 10, label: 'W(x):=10' },
    { tx: 0, op: 'C', label: 'COMMIT' },
    { tx: 1, op: 'R', item: 'x', label: 'R(x) 再读' },
    { tx: 1, op: 'C', label: 'COMMIT' },
  ] },
  phantom: { name: '幻读', steps: [
    { tx: 1, op: 'N', item: 'n', label: 'COUNT(*)' },
    { tx: 0, op: 'I', item: 'n', label: 'INSERT 一行' },
    { tx: 0, op: 'C', label: 'COMMIT' },
    { tx: 1, op: 'N', item: 'n', label: 'COUNT(*) 再数' },
    { tx: 1, op: 'C', label: 'COMMIT' },
  ] },
  lost: { name: '丢失更新', steps: [
    { tx: 0, op: 'R', item: 'x', label: 'R(x)' },
    { tx: 1, op: 'R', item: 'x', label: 'R(x)' },
    { tx: 0, op: 'W', item: 'x', calc: 1, label: 'W(x):=x+1' },
    { tx: 1, op: 'W', item: 'x', calc: 1, label: 'W(x):=x+1' },
    { tx: 0, op: 'C', label: 'COMMIT' },
    { tx: 1, op: 'C', label: 'COMMIT' },
  ] },
};
const LEVELS = [
  { label: '读未提交', value: 'ru' }, { label: '读已提交', value: 'rc' },
  { label: '可重复读', value: 'rr' }, { label: '串行化', value: 'serial' },
];

function simulate(key, level) {
  const committed = { x: 5, n: 2 };
  const local = [{}, {}];
  const snap = [{}, {}];
  const reads = [{}, {}];
  const log = [];
  const flags = { dirty: false, nrep: false, phantom: false, lost: false };
  let order = SCENES[key].steps.map((s, i) => ({ ...s, i }));
  if (level === 'serial') order = order.slice().sort((a, b) => a.tx - b.tx);

  const readValue = (tx, item, snapIt) => {
    if (local[tx][item] !== undefined) return { v: local[tx][item], from: 'own' };
    if (level === 'ru') {
      for (let t = 0; t < 2; t += 1) {
        if (t !== tx && local[t][item] !== undefined) return { v: local[t][item], from: 'uncommitted' };
      }
      return { v: committed[item], from: 'committed' };
    }
    if (level === 'rr' && snapIt) {
      if (snap[tx][item] === undefined) snap[tx][item] = committed[item];
      return { v: snap[tx][item], from: 'snapshot' };
    }
    return { v: committed[item], from: 'committed' };
  };

  order.forEach((st, idx) => {
    const tx = st.tx;
    if (st.op === 'R' || st.op === 'N') {
      const r = readValue(tx, st.item, st.op === 'R');
      (reads[tx][st.item] = reads[tx][st.item] || []).push(r.v);
      if (r.from === 'uncommitted') { flags.dirty = true; st.bad = true; }
      log.push(`T${tx + 1} ${st.op === 'N' ? '数到行数' : '读到 ' + st.item} = ${r.v}（来源：${r.from === 'uncommitted' ? 'T2/T1 未提交的数据！' : r.from === 'snapshot' ? '本事务快照' : '已提交数据'}）`);
      st.seen = r.v;
    } else if (st.op === 'W') {
      const base = reads[tx] && reads[tx][st.item] && reads[tx][st.item].length
        ? reads[tx][st.item][reads[tx][st.item].length - 1] : committed[st.item];
      local[tx][st.item] = st.calc ? base + st.calc : st.val;
      log.push(`T${tx + 1} 把 ${st.item} 写成 ${local[tx][st.item]}（先落在自己的私有副本里）`);
    } else if (st.op === 'I') {
      local[tx][st.item] = committed[st.item] + 1;
      log.push(`T${tx + 1} 插入一行，行数 → ${local[tx][st.item]}`);
    } else if (st.op === 'C') {
      Object.keys(local[tx]).forEach((k) => { committed[k] = local[tx][k]; });
      local[tx] = {};
      log.push(`T${tx + 1} COMMIT：私有副本落盘`);
    } else if (st.op === 'A') {
      local[tx] = {};
      log.push('T' + (tx + 1) + ' ROLLBACK：私有副本丢弃，什么都没发生');
    }
    st.pos = idx;
  });

  [0, 1].forEach((tx) => {
    Object.keys(reads[tx]).forEach((it) => {
      const arr = reads[tx][it];
      if (arr.length >= 2 && new Set(arr).size > 1) {
        if (it === 'n') flags.phantom = true; else flags.nrep = true;
      }
    });
  });
  if (key === 'lost' && committed.x === 6) flags.lost = true;

  /* 冲突可串行化：同一数据上至少一个是写，先执行的指向后执行的 */
  const edges = {};
  const itemOf = (s) => (s.op === 'R' || s.op === 'W' || s.op === 'I' || s.op === 'N' ? s.item : null);
  for (let a = 0; a < order.length; a += 1) {
    for (let b = a + 1; b < order.length; b += 1) {
      const ia = itemOf(order[a]);
      const ib = itemOf(order[b]);
      if (!ia || ia !== ib || order[a].tx === order[b].tx) continue;
      const wa = order[a].op === 'W' || order[a].op === 'I';
      const wb = order[b].op === 'W' || order[b].op === 'I';
      if (!wa && !wb) continue;
      edges[order[a].tx + '>' + order[b].tx] = true;
    }
  }
  const cyc = edges['0>1'] && edges['1>0'];
  return { order, log, flags, committed, serializable: !cyc, edges };
}

export default function render(host) {
  const C0 = themeColors();
  let scene = 'dirty';
  let level = 'ru';
  let step = 0;
  let res = simulate(scene, level);

  const cv = setupCanvas(host, 200);
  host.appendChild(buildSegmented(
    Object.keys(SCENES).map((k) => ({ label: SCENES[k].name, value: k })),
    scene, (v) => { scene = v; recompute(); },
  ));
  host.appendChild(buildSegmented(LEVELS, level, (v) => { level = v; recompute(); }));
  const ro = buildReadout({ 调度: '—', 当前步: '—', 脏读: '—', '不可重复读': '—', 幻读: '—', '丢失更新': '—', '冲突可串行化': '—' });
  host.appendChild(ro.box);

  const logBox = el('pre');
  logBox.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(logBox);

  const next = mkBtn('下一步');
  host.appendChild(buildToolbar(next));

  function recompute() {
    res = simulate(scene, level);
    step = 0;
    sync();
    draw();
  }

  function sync() {
    const f = res.flags;
    ro.set('调度', SCENES[scene].name + ' / ' + LEVELS.find((l) => l.value === level).label);
    ro.set('当前步', `${step + 1} / ${res.order.length}` + (level === 'serial' ? '（已重排为串行）' : ''));
    ro.set('脏读', f.dirty ? '出现' : '无');
    ro.set('不可重复读', f.nrep ? '出现' : '无');
    ro.set('幻读', f.phantom ? '出现' : '无');
    ro.set('丢失更新', f.lost ? '出现（x=6，应为 7）' : '无（x=' + res.committed.x + '）');
    ro.set('冲突可串行化', res.serializable ? '是' : '否（冲突图有环）');
    logBox.textContent = res.log.slice(0, step + 1).map((l, i) => `${i + 1}. ${l}`).join('\n');
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const n = res.order.length;
    const bw = Math.min(96, (W - 30) / n - 6);
    const laneY = [44, 118];
    ['T1', 'T2'].forEach((t, k) => {
      label(ctx, t, 8, laneY[k] + 4, C.series(k), { size: 12, weight: 700 });
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(28, laneY[k]);
      ctx.lineTo(W - 8, laneY[k]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    res.order.forEach((st, i) => {
      const x = 34 + i * (bw + 6);
      const y = laneY[st.tx] - 16;
      const cur = i === step;
      const hot = cur && st.bad;
      ctx.fillStyle = C.series(st.tx);
      ctx.globalAlpha = cur ? 0.9 : i < step ? 0.45 : 0.16;
      ctx.fillRect(x, y, bw, 32);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hot ? C.bad : C.series(st.tx);
      ctx.lineWidth = cur ? 2.2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, 31);
      label(ctx, st.label, x + bw / 2, y + 14, C.bg, { align: 'center', size: 10, weight: 600 });
      const seen = st.seen !== undefined ? '→ ' + st.seen : (st.op === 'C' ? '✓' : st.op === 'A' ? '✗' : '');
      label(ctx, seen, x + bw / 2, y + 27, C.bg, { align: 'center', size: 10 });
    });
    label(ctx, '时间 →', 34, H - 6, C.axis, { size: 11 });
    label(ctx, res.serializable ? '冲突图无环 → 这个调度等价于某个串行调度' : '冲突图有环 → 不可串行化，必须换隔离级别或加锁',
      W - 8, H - 6, res.serializable ? C.ok : C.bad, { size: 11, align: 'right' });
  }

  next.addEventListener('click', () => {
    step = (step + 1) % res.order.length;
    sync();
    draw();
  });

  const sliders = buildSliders(
    { sliders: [{ name: 'step', label: '执行到第几步', min: 0, max: 8, step: 1, value: 0 }] },
    (st) => { step = clamp(st.step, 0, res.order.length - 1); sync(); draw(); },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc > 0.9) {
        acc = 0;
        step = (step + 1) % res.order.length;
        sync();
        draw();
      }
    },
    onReset() { step = 0; sync(); draw(); },
  });

  recompute();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
