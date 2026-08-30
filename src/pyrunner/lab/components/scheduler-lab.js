/* 调度算法实验室：给一批任务，换一种调度策略，甘特图和两个平均值当场变。
   看点是权衡——SJF 平均等待最小但会饿死长任务，RR 公平但周转差，MLFQ 折中。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders,
  buildReadout, label, clamp, fmt,
} from '../core.js';

const PRESETS = {
  a: { name: '同时到达（长短混合）', tasks: [
    { id: 'P1', arrive: 0, burst: 8, prio: 3 }, { id: 'P2', arrive: 0, burst: 4, prio: 1 },
    { id: 'P3', arrive: 0, burst: 2, prio: 4 }, { id: 'P4', arrive: 0, burst: 6, prio: 2 },
  ] },
  b: { name: '错峰到达', tasks: [
    { id: 'P1', arrive: 0, burst: 5, prio: 2 }, { id: 'P2', arrive: 2, burst: 3, prio: 1 },
    { id: 'P3', arrive: 4, burst: 7, prio: 3 }, { id: 'P4', arrive: 6, burst: 2, prio: 4 },
  ] },
  c: { name: '长任务先到（护短效应）', tasks: [
    { id: 'P1', arrive: 0, burst: 9, prio: 1 }, { id: 'P2', arrive: 1, burst: 2, prio: 2 },
    { id: 'P3', arrive: 2, burst: 3, prio: 3 }, { id: 'P4', arrive: 3, burst: 4, prio: 4 },
  ] },
};

const ALGOS = [
  { label: 'FCFS', value: 'fcfs' }, { label: 'SJF', value: 'sjf' }, { label: 'RR', value: 'rr' },
  { label: '优先级', value: 'prio' }, { label: 'MLFQ', value: 'mlfq' },
];

/* 统一的离散事件模拟：全部算法共用「挑一个任务、跑一段、推进时钟」的骨架 */
function simulate(tasks, algo, q) {
  const ts = tasks.map((t) => ({ ...t, left: t.burst }));
  const segs = [];
  const queue = [];
  const mlq = [[], [], []];
  const MQ = [1, 2, 4];
  let time = 0;
  let boost = -1;
  let guard = 0;
  const pending = () => ts.filter((t) => t.left > 0);
  const ready = () => ts.filter((t) => t.left > 0 && t.arrive <= time);

  while (pending().length && guard++ < 6000) {
    const rd = ready();
    if (!rd.length) {
      const nxt = Math.min(...pending().map((t) => t.arrive));
      segs.push({ id: '', start: time, end: nxt });
      time = nxt;
      continue;
    }
    let cur = null;
    let slice = 0;
    let usedFull = false;
    if (algo === 'rr') {
      rd.forEach((t) => { if (!queue.includes(t)) queue.push(t); });
      cur = queue.shift() || rd[0];
      slice = Math.min(q, cur.left);
      usedFull = slice >= q;
    } else if (algo === 'mlfq') {
      rd.forEach((t) => { if (t.level === undefined) { t.level = 0; mlq[0].push(t); } });
      let lv = 0;
      while (lv < 3 && !mlq[lv].length) lv += 1;
      if (lv >= 3) { mlq[0] = rd.slice(); lv = 0; }
      cur = mlq[lv].shift() || rd[0];
      slice = Math.min(MQ[lv], cur.left);
      usedFull = slice >= MQ[lv];
      cur.lv = lv;
    } else {
      const cmp = algo === 'sjf' ? (a, b) => a.left - b.left
        : algo === 'prio' ? (a, b) => a.prio - b.prio : (a, b) => a.arrive - b.arrive;
      cur = rd.slice().sort(cmp)[0];
      slice = cur.left;
    }
    segs.push({ id: cur.id, start: time, end: time + slice });
    time += slice;
    cur.left -= slice;
    if (cur.left > 0) {
      if (algo === 'rr') queue.push(cur);
      else if (algo === 'mlfq') {
        if (usedFull) cur.level = Math.min(2, (cur.lv || 0) + 1);
        mlq[cur.level].push(cur);
      }
    }
    if (algo === 'mlfq' && Math.floor(time / 8) > boost) {
      boost = Math.floor(time / 8);
      ts.forEach((t) => { if (t.left > 0) t.level = 0; });
      mlq[0] = mlq.flat();
      mlq[1] = [];
      mlq[2] = [];
    }
  }
  const comp = {};
  ts.forEach((t) => { comp[t.id] = t.arrive; });
  segs.forEach((s) => { if (s.id) comp[s.id] = s.end; });
  let tat = 0;
  let wait = 0;
  const stat = {};
  ts.forEach((t) => {
    const turn = comp[t.id] - t.arrive;
    stat[t.id] = { turn, wait: turn - t.burst };
    tat += turn;
    wait += turn - t.burst;
  });
  const busy = segs.filter((s) => s.id).reduce((a, s) => a + (s.end - s.start), 0);
  return { segs, stat, total: time, tat: tat / ts.length, wait: wait / ts.length, util: time ? busy / time : 0 };
}

export default function render(host) {
  let preset = 'a';
  let algo = 'fcfs';
  let quantum = 2;
  let res = simulate(PRESETS[preset].tasks, algo, quantum);
  let playT = 0;

  const cv = setupCanvas(host, 250);
  host.appendChild(buildSegmented(
    Object.keys(PRESETS).map((k) => ({ label: PRESETS[k].name, value: k })),
    preset, (v) => { preset = v; recompute(); },
  ));
  host.appendChild(buildSegmented(ALGOS, algo, (v) => { algo = v; recompute(); }));
  const ro = buildReadout({ 算法: 'FCFS', 平均周转: '—', 平均等待: '—', 总时长: '—', 'CPU 利用率': '—' });
  host.appendChild(ro.box);

  const sliders = buildSliders(
    { sliders: [{ name: 'quantum', label: '时间片', min: 1, max: 6, step: 1, value: quantum }] },
    (st) => { quantum = st.quantum; recompute(); },
  );

  function recompute() {
    res = simulate(PRESETS[preset].tasks, algo, quantum);
    playT = 0;
    const names = { fcfs: 'FCFS 先来先服务', sjf: 'SJF 最短作业优先', rr: `RR 轮转 q=${quantum}`, prio: '优先级调度', mlfq: 'MLFQ 多级反馈队列' };
    ro.set('算法', names[algo]);
    ro.set('平均周转', fmt(res.tat, 1));
    ro.set('平均等待', fmt(res.wait, 1));
    ro.set('总时长', fmt(res.total, 0));
    ro.set('CPU 利用率', fmt(res.util * 100, 1) + '%');
    draw();
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const tasks = PRESETS[preset].tasks;
    const x0 = 52;
    const x1 = W - 14;
    const sx = (x1 - x0) / Math.max(res.total, 1);
    const rowH = Math.min(30, (H - 60) / (tasks.length + 1));
    const y0 = 30;

    /* 时间刻度 */
    ctx.strokeStyle = C.grid;
    for (let t = 0; t <= res.total; t += Math.max(1, Math.round(res.total / 12))) {
      const x = x0 + t * sx;
      ctx.beginPath();
      ctx.moveTo(x, y0 - 8);
      ctx.lineTo(x, y0 + rowH * (tasks.length + 1));
      ctx.stroke();
      label(ctx, String(t), x, y0 - 12, C.fg, { align: 'center', size: 10 });
    }

    /* CPU 行 */
    label(ctx, 'CPU', 8, y0 + rowH / 2 + 4, C.fg, { size: 11, weight: 600 });
    ctx.strokeStyle = C.grid;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, rowH - 6);

    const rowY = (i) => y0 + rowH * (i + 1);
    tasks.forEach((t, i) => {
      label(ctx, t.id, 8, rowY(i) + rowH / 2, C.fg, { size: 11 });
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(x0 + 0.5, rowY(i) + 0.5, x1 - x0, rowH - 8);
    });

    res.segs.forEach((sg) => {
      const i = tasks.findIndex((t) => t.id === sg.id);
      if (i < 0) {
        ctx.fillStyle = C.soft;
        ctx.fillRect(x0 + sg.start * sx, y0 + 1, (sg.end - sg.start) * sx, rowH - 8);
        return;
      }
      const col = C.series(i);
      [y0, rowY(i)].forEach((y, k) => {
        ctx.fillStyle = col;
        ctx.globalAlpha = k === 0 ? 1 : 0.75;
        ctx.fillRect(x0 + sg.start * sx + 0.5, y + 1, Math.max((sg.end - sg.start) * sx - 1, 1), rowH - 8);
        ctx.globalAlpha = 1;
      });
      if ((sg.end - sg.start) * sx > 18) {
        label(ctx, sg.id, x0 + (sg.start + sg.end) / 2 * sx, y0 + rowH / 2 - 1, C.bg, { align: 'center', size: 10, weight: 600 });
      }
    });

    /* 播放头 */
    const px = x0 + clamp(playT, 0, res.total) * sx;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, y0 - 8);
    ctx.lineTo(px, rowY(tasks.length - 1) + rowH - 8);
    ctx.stroke();
    label(ctx, `t = ${fmt(playT, 1)}`, Math.min(px + 4, W - 40), H - 4, C.accent2, { size: 11 });
  }

  const controls = anim(host, {
    onTick(dt) {
      playT += dt * 3;
      if (playT > res.total) playT = 0;
      draw();
    },
    onReset() { playT = 0; draw(); },
  });

  recompute();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
