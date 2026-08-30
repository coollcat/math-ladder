/* 进程与线程：同一个「地址空间」这张图，切换视角就能看出谁独享、谁共享。
   进程视图是两个互不相干的地址空间；线程视图是共享代码/数据/堆、各带私有栈。 */
import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildReadout, el, label,
} from '../core.js';

/* h 是相对高度（示意，不代表真实比例）；share 表示线程间共享 */
const LAYOUT = [
  { name: '内核空间（1G）', h: 1.0, share: true, desc: '所有进程映射到同一份内核；用户态不可访问，系统调用由此进入。' },
  { name: '栈 stack', h: 1.6, share: false, desc: '函数调用帧、局部变量、返回地址。向低地址生长；每个线程各一份。' },
  { name: '↓ 空闲映射区 ↑', h: 1.0, share: false, desc: 'mmap / 共享库落在这里；堆向上长、栈向下长，中间是空洞。' },
  { name: '堆 heap', h: 1.4, share: true, desc: 'malloc 的地盘，向高地址生长；线程共享同一堆，故需同步。' },
  { name: '数据段 .data/.bss', h: 1.0, share: true, desc: '已初始化/未初始化的全局与静态变量，编译期就定了大小。' },
  { name: '代码段 .text', h: 1.2, share: true, desc: '机器指令，只读且可共享；同一程序的两个进程可共用物理页。' },
];

const PCB = 'PCB（进程控制块）\n  pid=1042  state=RUNNING  prio=20\n  pgdir(CR3)=0x7f3a  ← 切换进程就要换它\n  pc=0x4011a6  sp=0x7ffd3c18  regs[rax..r15]\n  open_files=[0,1,2,7]  cwd=/home/alice';

const TCB = 'TCB（线程控制块）\n  tid=1042/2  state=RUNNING  stack=[0x7f10..0x7f50)\n  pc / regs 各存一份  ← 线程切换只换这个\n  不换页表：代码·数据·堆 与同进程其他线程共享';

export default function render(host) {
  const C0 = themeColors();
  let view = 'process';
  let sel = -1;

  const cv = setupCanvas(host, 250);
  const ro = buildReadout({ 视角: '进程', 选中区域: '—', 切换代价: '—' });
  const seg = buildSegmented(
    [{ label: '进程：独享地址空间', value: 'process' }, { label: '线程：共享地址空间', value: 'thread' }],
    view,
    (v) => {
      view = v;
      sel = -1;
      sync();
      draw();
    },
  );
  host.appendChild(seg);
  host.appendChild(ro.box);

  const pre = el('pre');
  pre.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(pre);

  function sync() {
    ro.set('视角', view === 'process' ? '进程（2 个进程）' : '线程（1 进程 2 线程）');
    ro.set('选中区域', sel < 0 ? '点图中任一段' : LAYOUT[sel].name);
    ro.set('切换代价', view === 'process' ? '高：换页表 + 刷 TLB' : '低：只换寄存器与栈');
    pre.textContent = sel < 0
      ? (view === 'process' ? PCB : TCB)
      : `${LAYOUT[sel].name}\n${LAYOUT[sel].desc}\n${view === 'thread' && LAYOUT[sel].share ? '→ 线程间共享，写它要加锁。' : '→ 各自一份，天然隔离。'}`;
  }

  /* 每列返回若干矩形；cols: [{title, x, w, rects:[{i,y,h}] }] */
  function columns() {
    const W = cv.W;
    const total = LAYOUT.reduce((a, r) => a + r.h, 0);
    const top = 26;
    const bot = cv.H - 26;
    const usable = bot - top;
    const pad = 14;
    const rects = [];
    let y = top;
    LAYOUT.forEach((r, i) => {
      const h = (r.h / total) * usable;
      rects.push({ i, y, h: h - 3 });
      y += h;
    });
    if (view === 'process') {
      const w = (W - pad * 3) / 2;
      return [
        { title: '进程 A（pid 1042）', x: pad, w, rects },
        { title: '进程 B（pid 1043）', x: pad * 2 + w, w, rects },
      ];
    }
    const w = (W - pad * 3) / 2;
    return [
      { title: '线程 T1（栈私有）', x: pad, w, rects },
      { title: '线程 T2（栈私有）', x: pad * 2 + w, w, rects },
    ];
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const cols = columns();

    cols.forEach((col) => {
      label(ctx, col.title, col.x, 16, C.fg, { size: 11, weight: 600 });
      col.rects.forEach((r) => {
        const it = LAYOUT[r.i];
        const shared = view === 'thread' && it.share;
        const on = r.i === sel;
        ctx.fillStyle = shared ? C.accent : C.soft;
        ctx.globalAlpha = shared ? 0.32 : 1;
        ctx.fillRect(col.x, r.y, col.w, r.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = on ? C.accent2 : C.grid;
        ctx.lineWidth = on ? 2 : 1;
        ctx.strokeRect(col.x + 0.5, r.y + 0.5, col.w - 1, r.h - 1);
        label(ctx, it.name, col.x + col.w / 2, r.y + r.h / 2 + 4,
          shared ? C.fg : C.fg, { align: 'center', size: 11, weight: on ? 700 : 400 });
      });
    });

    if (view === 'thread') {
      label(ctx, '底色 = 共享（代码/数据/堆）', 14, H - 8, C.accent, { size: 11 });
      label(ctx, '无底色 = 私有（栈/寄存器）', W - 14, H - 8, C.axis, { size: 11, align: 'right' });
    } else {
      label(ctx, '两列页表独立：同一个虚拟地址指向不同物理页', 14, H - 8, C.fg, { size: 11 });
    }
  }

  bindPointer(cv.canvas, {
    pick: () => 'main',
    down(id, x, y) {
      const cols = columns();
      const hit = cols.find((c) => x >= c.x && x <= c.x + c.w);
      if (!hit) return;
      const r = hit.rects.find((q) => y >= q.y && y <= q.y + q.h);
      if (r) {
        sel = r.i;
        sync();
        draw();
      }
    },
    move() {},
  });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
