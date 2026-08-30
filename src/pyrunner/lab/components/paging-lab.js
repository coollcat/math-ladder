/* 分页与页面置换：逐次走完一串页访问，看 FIFO / LRU / OPT 的每一次命中与缺页。
   重点：把帧数从 3 拖到 4，FIFO 的缺页次数反而变多——这就是 Belady 异常。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildSliders, buildToolbar,
  buildReadout, el, mkBtn, label, fmt,
} from '../core.js';

const REFS = {
  belady: { name: '经典 Belady 序列', seq: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5] },
  loop: { name: '循环扫描（局部性差）', seq: [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6] },
  local: { name: '局部性良好', seq: [1, 1, 2, 2, 1, 3, 1, 2, 7, 7, 1, 2] },
};

/* 完整走一遍，返回每一步的帧快照与是否缺页 */
function trace(seq, frames, algo) {
  const f = [];
  const steps = [];
  const lastUse = {};
  let fifo = [];
  let faults = 0;
  for (let i = 0; i < seq.length; i += 1) {
    const p = seq[i];
    if (f.includes(p)) {
      lastUse[p] = i;
      steps.push({ p, f: f.slice(), fault: false });
      continue;
    }
    faults += 1;
    if (f.length < frames) f.push(p);
    else {
      let victim = f[0];
      if (algo === 'fifo') victim = fifo[0];
      else if (algo === 'lru') victim = f.reduce((m, q) => (lastUse[q] < lastUse[m] ? q : m), f[0]);
      else {
        victim = f[0];
        let far = -1;
        f.forEach((q) => {
          const nx = seq.indexOf(q, i + 1);
          if (nx === -1) { victim = q; far = Infinity; }
          else if (nx > far) { far = nx; victim = q; }
        });
      }
      f[f.indexOf(victim)] = p;
      fifo = fifo.filter((q) => q !== victim);
    }
    fifo.push(p);
    lastUse[p] = i;
    steps.push({ p, f: f.slice(), fault: true });
  }
  return { steps, faults };
}

export default function render(host) {
  let refKey = 'belady';
  let algo = 'fifo';
  let frames = 3;
  let stepIdx = 0;
  let res = trace(REFS[refKey].seq, frames, algo);

  const cv = setupCanvas(host, 250);
  host.appendChild(buildSegmented(
    Object.keys(REFS).map((k) => ({ label: REFS[k].name, value: k })),
    refKey, (v) => { refKey = v; recompute(); },
  ));
  host.appendChild(buildSegmented(
    [{ label: 'FIFO', value: 'fifo' }, { label: 'LRU', value: 'lru' }, { label: 'OPT', value: 'opt' }],
    algo, (v) => { algo = v; recompute(); },
  ));
  const ro = buildReadout({ 缺页: '—', 缺页率: '—', 命中: '—', 步: '—', Belady: '—' });
  host.appendChild(ro.box);

  const step = mkBtn('单步');
  const back = mkBtn('上一步');
  host.appendChild(buildToolbar(step, back));

  function beladyNote() {
    const counts = [];
    for (let k = 1; k <= 6; k += 1) counts.push(trace(REFS[refKey].seq, k, 'fifo').faults);
    let msg = 'FIFO 缺页：' + counts.map((c, i) => `${i + 1}帧=${c}`).join(' ');
    for (let k = 0; k + 1 < counts.length; k += 1) {
      if (counts[k + 1] > counts[k]) msg += `　⚠ ${k + 1}→${k + 2} 帧反而变多`;
    }
    return msg;
  }

  function recompute() {
    res = trace(REFS[refKey].seq, frames, algo);
    stepIdx = 0;
    sync();
    draw();
  }

  function sync() {
    const upto = res.steps.slice(0, stepIdx + 1);
    const fl = upto.filter((s) => s.fault).length;
    const n = Math.max(upto.length, 1);
    ro.set('缺页', String(fl));
    ro.set('缺页率', fmt((fl / n) * 100, 1) + '%');
    ro.set('命中', String(upto.length - fl));
    ro.set('步', `${stepIdx + 1} / ${res.steps.length}（全程 ${res.faults} 次缺页）`);
    ro.set('Belady', beladyNote());
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const seq = REFS[refKey].seq;
    const cur = res.steps[stepIdx] || { p: 0, f: [], fault: false };

    /* 顶部：当前帧内容 */
    label(ctx, `物理帧（${frames} 个）`, 8, 14, C.fg, { size: 11 });
    const bw = Math.min(46, (W - 20) / Math.max(frames, 1) - 6);
    for (let k = 0; k < frames; k += 1) {
      const x = 8 + k * (bw + 6);
      ctx.fillStyle = C.soft;
      ctx.fillRect(x, 22, bw, 30);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 22.5, bw - 1, 29);
      const v = cur.f[k];
      if (v !== undefined) label(ctx, String(v), x + bw / 2, 42, C.fg, { align: 'center', size: 14, weight: 700 });
      label(ctx, '帧' + k, x + bw / 2, 62, C.axis, { align: 'center', size: 9 });
    }

    /* 下部矩阵：行 = 帧，列 = 访问序列 */
    const y0 = 74;
    const rowH = Math.min(26, (H - y0 - 22) / Math.max(frames, 1));
    const cw = (W - 30) / seq.length;
    label(ctx, '访问序列', 8, y0 - 4, C.axis, { size: 10 });
    seq.forEach((p, i) => {
      const x = 30 + i * cw;
      if (i === stepIdx) {
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y0 - 2, cw, rowH * frames + 4);
        ctx.globalAlpha = 1;
      }
      label(ctx, String(p), x + cw / 2, y0 - 4, i === stepIdx ? C.accent : C.fg, { align: 'center', size: 11, weight: i === stepIdx ? 700 : 400 });
    });
    for (let k = 0; k < frames; k += 1) {
      for (let i = 0; i <= stepIdx && i < seq.length; i += 1) {
        const st = res.steps[i];
        const x = 30 + i * cw;
        const y = y0 + k * rowH;
        const v = st.f[k];
        if (v === undefined) continue;
        ctx.fillStyle = st.fault && v === st.p ? C.bad : C.soft;
        ctx.globalAlpha = st.fault && v === st.p ? 0.85 : 1;
        ctx.fillRect(x + 1, y + 1, cw - 2, rowH - 3);
        ctx.globalAlpha = 1;
        label(ctx, String(v), x + cw / 2, y + rowH / 2 + 4, st.fault && v === st.p ? C.bg : C.fg, { align: 'center', size: 11 });
      }
    }
    const msg = cur.fault
      ? `第 ${stepIdx + 1} 次访问页 ${cur.p}：缺页！调入内存`
      : `第 ${stepIdx + 1} 次访问页 ${cur.p}：命中，不用访盘`;
    label(ctx, msg, 8, H - 6, cur.fault ? C.bad : C.ok, { size: 11 });
  }

  step.addEventListener('click', () => {
    stepIdx = (stepIdx + 1) % res.steps.length;
    sync();
    draw();
  });
  back.addEventListener('click', () => {
    stepIdx = (stepIdx - 1 + res.steps.length) % res.steps.length;
    sync();
    draw();
  });

  const sliders = buildSliders(
    { sliders: [{ name: 'frames', label: '物理帧数', min: 1, max: 6, step: 1, value: frames }] },
    (st) => { frames = st.frames; recompute(); },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc >= 0.45) {
        acc = 0;
        stepIdx = (stepIdx + 1) % res.steps.length;
        sync();
        draw();
      }
    },
    onReset() { stepIdx = 0; acc = 0; sync(); draw(); },
  });

  recompute();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
