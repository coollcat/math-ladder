/* 嵌入式状态机：中断只做一件事——把事件丢进队列；主循环从队列取出事件推进状态机。
   左边是状态转移图，右边是事件队列，最下面对比「轮询 + 延时」与「事件驱动」的响应延迟。 */
import {
  themeColors, setupCanvas, anim, buildSegmented, buildReadout, buildSliders,
  buildToolbar, mkBtn, label, fmt,
} from '../core.js';

/* 两个经典状态机：按键消抖、串口帧解析 */
const FSMS = {
  debounce: {
    title: '按键消抖状态机',
    states: [
      { id: 'IDLE', name: 'IDLE', desc: '等待按下' },
      { id: 'DB_PRESS', name: 'DB_PRESS', desc: '按下消抖中' },
      { id: 'PRESSED', name: 'PRESSED', desc: '已确认按下' },
      { id: 'DB_REL', name: 'DB_REL', desc: '松开消抖中' },
    ],
    events: [['press', '按下（低电平）'], ['release', '松开（高电平）'], ['tick', '10 ms 定时到']],
    edges: [['IDLE', 'DB_PRESS', '按下'], ['DB_PRESS', 'PRESSED', '定时到&仍低'],
      ['DB_PRESS', 'IDLE', '松开（抖动）'], ['PRESSED', 'DB_REL', '松开'],
      ['DB_REL', 'IDLE', '定时到&仍高'], ['DB_REL', 'PRESSED', '按下（抖动）']],
    next(st, ev) {
      if (st === 'IDLE' && ev === 'press') return ['DB_PRESS', '启动 10 ms 定时器'];
      if (st === 'DB_PRESS' && ev === 'tick') return ['PRESSED', '确认按下 → 上报按键事件'];
      if (st === 'DB_PRESS' && ev === 'release') return ['IDLE', '10 ms 内弹起 → 判为抖动，丢弃'];
      if (st === 'PRESSED' && ev === 'release') return ['DB_REL', '启动 10 ms 定时器'];
      if (st === 'DB_REL' && ev === 'tick') return ['IDLE', '确认松开 → 上报抬起事件'];
      if (st === 'DB_REL' && ev === 'press') return ['PRESSED', '抖动，忽略'];
      return [st, '此状态忽略该事件'];
    },
  },
  frame: {
    title: '串口帧解析状态机',
    states: [
      { id: 'SYNC', name: 'SYNC', desc: '等帧头' },
      { id: 'LEN', name: 'LEN', desc: '读长度' },
      { id: 'PAYLOAD', name: 'PAYLOAD', desc: '收数据' },
      { id: 'CRC', name: 'CRC', desc: '等校验' },
    ],
    events: [['aa', '收到 0xAA'], ['data', '收到数据字节'], ['ok', 'CRC 正确'], ['err', 'CRC 错误']],
    edges: [['SYNC', 'LEN', '0xAA'], ['SYNC', 'SYNC', '其他字节'], ['LEN', 'PAYLOAD', '长度 n'],
      ['PAYLOAD', 'PAYLOAD', '收 1 字节'], ['PAYLOAD', 'CRC', '收满 n'], ['CRC', 'SYNC', '校验通过/失败']],
    next(st, ev, mem) {
      if (st === 'SYNC' && ev === 'aa') return ['LEN', '收到帧头 0xAA'];
      if (st === 'SYNC') return ['SYNC', '丢弃非帧头字节'];
      if (st === 'LEN' && ev === 'data') {
        mem.n = mem.len;
        return ['PAYLOAD', '长度 n = ' + mem.n + '，开始收数据'];
      }
      if (st === 'PAYLOAD' && ev === 'data') {
        mem.n -= 1;
        return mem.n > 0 ? ['PAYLOAD', '还剩 ' + mem.n + ' 字节'] : ['CRC', '数据收满，等校验结果'];
      }
      if (st === 'CRC' && ev === 'ok') return ['SYNC', '校验通过 → 提交一帧'];
      if (st === 'CRC' && ev === 'err') return ['SYNC', '校验失败 → 丢弃这一帧'];
      return [st, '此状态忽略该事件'];
    },
  },
};

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    fsm: spec.fsm || 'debounce',
    poll: spec.poll ?? 10,     // 轮询周期 ms
    len: spec.len ?? 3,        // 帧长度 n
  };
  const st = { cur: 'IDLE', queue: [], done: 0, ok: 0, drop: 0, note: '等待事件…', mem: { n: 0, len: s.len } };
  let auto = false;
  let acc = 0;
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    当前状态: '—', 队列: '—', 最近动作: '—', 成功: '—', 轮询延迟: '—', 事件驱动延迟: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '按键消抖', value: 'debounce' }, { label: '串口帧解析', value: 'frame' }],
    s.fsm,
    (v) => {
      s.fsm = v;
      st.cur = FSMS[v].states[0].id;
      st.queue = [];
      st.done = 0;
      st.ok = 0;
      st.drop = 0;
      st.note = '等待事件…';
      st.mem = { n: 0, len: s.len };
      syncButtons();
      draw();
    },
  ));

  /* 事件按钮（模拟中断入队）+ 单步（主循环出队） */
  const evtHandlers = [null, null, null, null];
  const evtBtns = evtHandlers.map((_, i) => {
    const b = mkBtn('');
    b.addEventListener('click', () => {
      if (evtHandlers[i]) evtHandlers[i]();
    });
    return b;
  });
  const stepBtn = mkBtn('单步：取一个事件');
  const autoBtn = mkBtn('自动喂事件：关');
  const bar = buildToolbar(evtBtns[0], evtBtns[1], evtBtns[2], evtBtns[3], stepBtn, autoBtn);
  host.appendChild(bar);

  function enqueue(ev) {
    if (st.queue.length >= 6) return;
    st.queue.push(ev);
    draw();
  }
  function processOne() {
    const ev = st.queue.shift();
    if (!ev) return;
    const f = FSMS[s.fsm];
    const [nextState, note] = f.next(st.cur, ev, st.mem);
    st.cur = nextState;
    st.note = note;
    st.done += 1;
    if (note.indexOf('确认按下') >= 0 || note.indexOf('提交一帧') >= 0) st.ok += 1;
    if (note.indexOf('丢弃') >= 0 || note.indexOf('抖动') >= 0) st.drop += 1;
    draw();
  }
  function syncButtons() {
    const evs = FSMS[s.fsm].events;
    evtBtns.forEach((b, i) => {
      if (i < evs.length) {
        b.style.display = '';
        b.textContent = '↓ ' + evs[i][1];
        evtHandlers[i] = () => enqueue(evs[i][0]);
      } else {
        b.style.display = 'none';
        evtHandlers[i] = null;
      }
    });
  }
  stepBtn.addEventListener('click', processOne);
  autoBtn.addEventListener('click', () => {
    auto = !auto;
    autoBtn.textContent = '自动喂事件：' + (auto ? '开' : '关');
    autoBtn.classList.toggle('is-active', auto);
  });

  /* 状态转移图 + 队列 + 延迟对比 */
  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const f = FSMS[s.fsm];
    const leftW = W * 0.58;
    const cx = leftW / 2;
    const cy = 88;
    const R = Math.min(leftW, 190) * 0.30;
    const pos = {};
    f.states.forEach((sd, i) => {
      const a = -Math.PI / 2 + (i / f.states.length) * Math.PI * 2;
      pos[sd.id] = { x: cx + R * 1.35 * Math.cos(a), y: cy + R * 0.95 * Math.sin(a) };
    });

    /* 转移箭头 */
    f.edges.forEach(([from, to, text]) => {
      const p0 = pos[from];
      const p1 = pos[to];
      const on = from === st.cur;
      const col = on ? C.accent : C.grid;
      if (from === to) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p0.x, p0.y - R * 0.62, R * 0.4, 0.2, Math.PI * 2 - 0.2);
        ctx.stroke();
        label(ctx, text, p0.x, p0.y - R * 1.15, col, { align: 'center', size: 9 });
        return;
      }
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const x0 = p0.x + ux * R * 0.62;
      const y0 = p0.y + uy * R * 0.62;
      const x1 = p1.x - ux * R * 0.78;
      const y1 = p1.y - uy * R * 0.78;
      ctx.strokeStyle = col;
      ctx.lineWidth = on ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - ux * 8 - uy * 4, y1 - uy * 8 + ux * 4);
      ctx.lineTo(x1 - ux * 8 + uy * 4, y1 - uy * 8 - ux * 4);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      label(ctx, text, (x0 + x1) / 2 - uy * 10, (y0 + y1) / 2 + ux * 10, col, { align: 'center', size: 9 });
    });

    /* 状态节点 */
    f.states.forEach((sd, i) => {
      const p = pos[sd.id];
      const on = sd.id === st.cur;
      ctx.fillStyle = on ? C.accent : C.bg;
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 2.6 : 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(ctx, sd.name, p.x, p.y + 3, on ? C.bg : C.fg, { align: 'center', size: 10, weight: 700 });
      label(ctx, sd.desc, p.x, p.y + R * 0.62 + 12, on ? C.accent : C.grid, { align: 'center', size: 9 });
    });
    label(ctx, f.title, 8, 14, C.fg, { size: 11, weight: 600 });

    /* 事件队列 */
    const qx = leftW;
    const qw = W - qx - 8;
    label(ctx, '事件队列（中断入队 → 主循环出队）', qx, 14, C.fg, { size: 10 });
    st.queue.forEach((ev, i) => {
      const y = 22 + i * 24;
      ctx.fillStyle = C.soft;
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.rect(qx, y, qw - 4, 20);
      ctx.fill();
      ctx.stroke();
      const evs = f.events.find((e) => e[0] === ev);
      label(ctx, (i === 0 ? '▶ ' : '') + (evs ? evs[1] : ev), qx + 6, y + 14, C.accent2, { size: 10 });
    });
    if (!st.queue.length) label(ctx, '（空）', qx + 6, 36, C.grid, { size: 10 });
    label(ctx, '最近动作：' + st.note, qx, 22 + 6 * 24 + 14, C.fg, { size: 10 });

    /* 延迟对比 */
    const by = 200;
    const bw = W - 28;
    const pollDelay = s.poll / 2 + 10;                     // 轮询：平均等半个周期 + 10 ms 消抖
    const evtDelay = 0.05 + st.queue.length * 0.1;         // 事件驱动：ISR 响应 + 排队
    const scale = Math.max(pollDelay, 1) * 1.1;
    [['轮询 + 延时(10ms 消抖)', pollDelay, C.named('red')],
      ['事件驱动（中断 + 队列）', evtDelay, C.named('green')]].forEach(([name, v, col], i) => {
      const y = by + i * 34;
      label(ctx, name, 14, y - 3, C.fg, { size: 10 });
      ctx.fillStyle = C.soft;
      ctx.fillRect(14, y, bw, 16);
      ctx.fillStyle = col;
      ctx.fillRect(14, y, Math.max(2, (v / scale) * bw), 16);
      label(ctx, fmt(v, 2) + ' ms', 14 + Math.max(2, (v / scale) * bw) + 6, y + 13, col, { size: 10, weight: 600 });
    });
    label(ctx, '响应延迟对比（轮询周期 ' + fmt(s.poll, 0) + ' ms，队列 ' + st.queue.length + ' 个待处理）',
      14, by + 2 * 34 + 14, C.fg, { size: 10 });

    ro.set('当前状态', st.cur);
    ro.set('队列', st.queue.length + ' / 6');
    ro.set('最近动作', st.note);
    ro.set('成功', st.ok + ' 次有效输出 / 丢弃 ' + st.drop + ' / 已处理 ' + st.done + ' 事件');
    ro.set('轮询延迟', fmt(pollDelay, 2) + ' ms（周期/2 + 消抖）');
    ro.set('事件驱动延迟', fmt(evtDelay, 2) + ' ms（ISR 0.05 + 排队）');
  }

  const controls = anim(host, {
    onTick(dt) {
      if (!auto) return;
      acc += dt;
      if (acc < 0.45) return;
      acc = 0;
      const evs = FSMS[s.fsm].events;
      enqueue(evs[Math.floor(Math.random() * evs.length)][0]);
      processOne();
    },
    onReset() {
      st.queue = [];
      st.cur = FSMS[s.fsm].states[0].id;
      st.done = 0;
      st.ok = 0;
      st.drop = 0;
      st.note = '等待事件…';
      st.mem = { n: 0, len: s.len };
      draw();
    },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'poll', label: '轮询周期 (ms)', min: 1, max: 50, step: 1, value: s.poll, fmt: 0 },
        { name: 'len', label: '串口帧长度 n（字节）', min: 1, max: 6, step: 1, value: s.len, fmt: 0 },
      ],
    },
    (v) => {
      s.poll = v.poll;
      s.len = v.len;
      st.mem.len = v.len;
      draw();
    },
  );

  syncButtons();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() {
      controls.stop();
      auto = false;
    },
  };
}
