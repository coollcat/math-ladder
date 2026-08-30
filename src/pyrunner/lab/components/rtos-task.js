/* 实时任务调度：三个周期任务抢一个 CPU。协作式谁拿到手谁跑完，抢占式按优先级插队，
   RMS 让周期最短的优先级最高，EDF 让截止期最近的先跑。甘特图上红色三角就是超时。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  label, fmt,
} from '../core.js';

const TEND = 100;   // 仿真窗口 ms
const DT = 0.2;     // 调度仿真步长 ms

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    policy: spec.policy || 'rms',
    C: [spec.C1 ?? 2, spec.C2 ?? 3, spec.C3 ?? 2.5],   // 执行时间 ms
    T: [spec.T1 ?? 10, spec.T2 ?? 15, spec.T3 ?? 25],  // 周期 ms
    head: 0,
  };
  const cv = setupCanvas(host, 310);
  const ro = buildReadout({
    利用率: '—', 上界: '—', 判定: '—', 超时: '—', 最长响应: '—', 说明: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '协作式', value: 'coop' }, { label: '抢占式固定优先级', value: 'fps' },
      { label: 'RMS 速率单调', value: 'rms' }, { label: 'EDF 最早截止期', value: 'edf' }],
    s.policy,
    (v) => { s.policy = v; sim = simulate(); draw(); },
  ));

  const tasks = () => s.C.map((c, i) => ({ C: c, T: s.T[i] }));

  function higher(ts, dl, i, j) {
    if (s.policy === 'rms') return ts[i].T < ts[j].T || (ts[i].T === ts[j].T && i < j);
    if (s.policy === 'edf') return dl[i] < dl[j] || (dl[i] === dl[j] && i < j);
    return i < j;
  }

  function simulate() {
    const ts = tasks();
    const rem = ts.map(() => 0);
    const next = ts.map(() => 0);
    const dl = ts.map(() => Infinity);
    const blocks = [];
    const misses = [];
    const resp = ts.map(() => 0);
    let cur = -1;
    let bs = 0;
    for (let t = 0; t < TEND; t += DT) {
      for (let i = 0; i < ts.length; i += 1) {
        if (t + 1e-9 >= next[i]) {
          if (rem[i] > 1e-9) misses.push({ i, t: next[i] });   // 上一轮没跑完 → 超时
          rem[i] = ts[i].C;
          dl[i] = t + ts[i].T;
          next[i] = t + ts[i].T;
        }
      }
      let sel = -1;
      for (let i = 0; i < ts.length; i += 1) {
        if (rem[i] > 1e-9 && (sel < 0 || higher(ts, dl, i, sel))) sel = i;
      }
      if (cur >= 0 && rem[cur] <= 1e-9) {
        blocks.push({ i: cur, s: bs, e: t });
        cur = -1;
      }
      if (s.policy === 'coop' && cur >= 0) sel = cur;   // 协作式：不抢占，跑到完
      if (sel !== cur) {
        if (cur >= 0) blocks.push({ i: cur, s: bs, e: t });
        cur = sel;
        bs = t;
      }
      if (cur >= 0) {
        rem[cur] -= DT;
        if (rem[cur] <= 1e-9) {
          rem[cur] = 0;
          resp[cur] = Math.max(resp[cur], t + DT - (dl[cur] - ts[cur].T));
        }
      }
    }
    if (cur >= 0) blocks.push({ i: cur, s: bs, e: TEND });
    const U = ts.reduce((a, t2) => a + t2.C / t2.T, 0);
    const bound = ts.length * (2 ** (1 / ts.length) - 1);
    return { blocks, misses, resp, U, bound };
  }

  let sim = simulate();

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const gx = 62;
    const gw = W - gx - 14;
    const rowH = 34;
    const top = 26;
    const X = (t) => gx + (t / TEND) * gw;

    /* 时间刻度 */
    for (let t = 0; t <= TEND; t += 10) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(t), top - 4);
      ctx.lineTo(X(t), top + rowH * 3 + 12);
      ctx.stroke();
      label(ctx, t + '', X(t), top + rowH * 3 + 24, C.fg, { align: 'center', size: 9 });
    }

    /* 任务行 */
    tasks().forEach((tk, i) => {
      const y = top + i * (rowH + 8);
      ctx.fillStyle = C.soft;
      ctx.fillRect(gx, y, gw, rowH - 8);
      label(ctx, '任务' + (i + 1), gx - 6, y + 15, C.series(i), { align: 'right', size: 10, weight: 600 });
      label(ctx, 'C=' + fmt(tk.C, 1) + ' T=' + fmt(tk.T, 0), gx - 6, y + 27, C.fg, { align: 'right', size: 9 });
      /* 执行块 */
      sim.blocks.filter((b) => b.i === i).forEach((b) => {
        ctx.fillStyle = C.series(i);
        ctx.fillRect(X(b.s), y, Math.max(1, X(b.e) - X(b.s)), rowH - 8);
      });
      /* 截止期三角 */
      for (let d = tk.T; d <= TEND; d += tk.T) {
        const missed = sim.misses.some((m) => m.i === i && Math.abs(m.t - d) < 1e-6);
        ctx.fillStyle = missed ? C.bad : C.fg;
        ctx.beginPath();
        ctx.moveTo(X(d), y + rowH - 8);
        ctx.lineTo(X(d) - 4, y + rowH - 2);
        ctx.lineTo(X(d) + 4, y + rowH - 2);
        ctx.closePath();
        ctx.fill();
      }
    });

    /* 播放头 */
    ctx.strokeStyle = C.named('amber');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(s.head), top - 8);
    ctx.lineTo(X(s.head), top + rowH * 3 + 8);
    ctx.stroke();

    /* 利用率条 */
    const by = top + rowH * 3 + 34;
    const bw = W - 28;
    ctx.fillStyle = C.soft;
    ctx.fillRect(14, by, bw, 14);
    ctx.fillStyle = sim.U <= sim.bound ? C.ok : sim.U <= 1 ? C.named('amber') : C.bad;
    ctx.fillRect(14, by, Math.min(1, sim.U) * bw, 14);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(14 + sim.bound * bw, by - 3);
    ctx.lineTo(14 + sim.bound * bw, by + 17);
    ctx.stroke();
    label(ctx, 'RMS 上界 ' + fmt(sim.bound, 2), 14 + sim.bound * bw, by - 6, C.fg, { align: 'center', size: 9 });
    label(ctx, 'CPU 利用率 U = ' + fmt(sim.U, 3), 14, by + 28, C.fg, { size: 10 });

    const u = sim.U;
    const okEDF = s.policy === 'edf' && u <= 1;
    const okRMS = s.policy === 'rms' && u <= sim.bound;
    const note = s.policy === 'coop' ? '协作式：任务不让出 CPU，长任务会卡住别人'
      : s.policy === 'fps' ? '固定优先级：编号小的优先，可抢占，但优先级与周期无关'
        : s.policy === 'rms' ? 'RMS：周期越短优先级越高，静态优先级里的最优'
          : 'EDF：截止期最近者先跑，U ≤ 1 时理论最优';
    ro.set('利用率', fmt(u, 3) + '（Σ Ci/Ti）');
    ro.set('上界', s.policy === 'edf' ? '1.000（EDF 充要条件）' : fmt(sim.bound, 3) + '（RMS 充分条件）');
    ro.set('判定', sim.misses.length === 0
      ? (okRMS || okEDF ? '可调度（满足上界判据）' : '本次仿真未超时（上界判据只保证充分性）')
      : '⚠ 存在超时，需缩短执行时间或放慢周期');
    ro.set('超时', sim.misses.length + ' 次');
    ro.set('最长响应', fmt(Math.max(...sim.resp), 2) + ' ms（各任务：'
      + sim.resp.map((r) => fmt(r, 1)).join(' / ') + '）');
    ro.set('说明', note);
  }

  const controls = anim(host, {
    onTick(dt) {
      s.head += dt * 25;      // 25 ms/s 的播放速度
      if (s.head > TEND) s.head = 0;
      draw();
    },
    onReset() { s.head = 0; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'C1', label: '任务1 执行时间 (ms)', min: 0.5, max: 10, step: 0.5, value: s.C[0], fmt: 1 },
        { name: 'T1', label: '任务1 周期 (ms)', min: 5, max: 60, step: 1, value: s.T[0], fmt: 0 },
        { name: 'C2', label: '任务2 执行时间 (ms)', min: 0.5, max: 10, step: 0.5, value: s.C[1], fmt: 1 },
        { name: 'T2', label: '任务2 周期 (ms)', min: 5, max: 60, step: 1, value: s.T[1], fmt: 0 },
        { name: 'C3', label: '任务3 执行时间 (ms)', min: 0.5, max: 10, step: 0.5, value: s.C[2], fmt: 1 },
        { name: 'T3', label: '任务3 周期 (ms)', min: 5, max: 60, step: 1, value: s.T[2], fmt: 0 },
      ],
    },
    (v) => {
      s.C = [v.C1, v.C2, v.C3];
      s.T = [v.T1, v.T2, v.T3];
      sim = simulate();
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { controls.stop(); } };
}
