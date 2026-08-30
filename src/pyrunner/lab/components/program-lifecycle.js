/* 程序的生命周期：源码 → 预处理 → 编译 → 汇编 → 链接 → 加载 → 执行。
   点任一阶段看它的输入/输出产物；下方是同一段函数在 C、汇编、机器码三种形态。 */
import {
  themeColors, setupCanvas, bindPointer, anim, buildSegmented,
  buildReadout, el, label,
} from '../core.js';

const STAGES = [
  { name: '源码', tool: '编辑器', io: 'hello.c', desc: '人写的文本，含 #include / #define 等预处理指令。' },
  { name: '预处理', tool: 'cpp', io: 'hello.c → hello.i', desc: '展开头文件与宏、处理条件编译，产物仍是 C 文本。' },
  { name: '编译', tool: 'cc1', io: 'hello.i → hello.s', desc: '词法→语法→语义→IR 优化，最后落成目标机汇编。' },
  { name: '汇编', tool: 'as', io: 'hello.s → hello.o', desc: '指令逐条变机器码，产出可重定位目标文件（地址未定）。' },
  { name: '链接', tool: 'ld', io: 'hello.o + libc → a.out', desc: '符号解析 + 重定位，把多个 .o 拼成一个可执行映像。' },
  { name: '加载', tool: 'execve / 装载器', io: 'a.out → 进程地址空间', desc: '建页表、映射段、装栈与 argv，PC 指向入口 _start。' },
  { name: '执行', tool: 'CPU', io: '地址空间 → 运行结果', desc: '取指-译码-执行；系统调用陷入内核，缺页时按需调页。' },
];

const CODE = {
  c: 'int add(int a, int b) {\n    return a + b;\n}',
  s: 'add:\n    movl  %edi, %eax   # a -> eax\n    addl  %esi, %eax   # + b\n    ret',
  m: '0:  89 f8        mov    %edi,%eax\n2:  01 f0        add    %esi,%eax\n4:  c3           ret\n     # 每条 1~2 字节，就是 CPU 真正取的东西',
};

export default function render(host) {
  const C0 = themeColors();
  let sel = 0;
  let codeView = 'c';
  let flow = 0;

  const cv = setupCanvas(host, 150);
  const ro = buildReadout({ 阶段: '—', 工具: '—', 产物: '—' });

  const pre = el('pre');
  pre.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;

  const code = el('pre');
  code.style.cssText = pre.style.cssText;

  host.append(ro.box, pre, code);

  const seg = buildSegmented(
    [{ label: 'C 源码', value: 'c' }, { label: '汇编', value: 's' }, { label: '机器码', value: 'm' }],
    codeView,
    (v) => { codeView = v; syncText(); },
  );
  host.appendChild(seg);

  function geom() {
    const W = cv.W;
    const n = STAGES.length;
    const gap = 10;
    const bw = (W - 16 - gap * (n - 1)) / n;
    return { bw, gap, y: 46, bh: 44 };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const { bw, gap, y, bh } = geom();

    for (let i = 0; i < STAGES.length; i += 1) {
      const x = 8 + i * (bw + gap);
      const on = i === sel;
      ctx.fillStyle = on ? C.accent : C.soft;
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = on ? C.accent : C.grid;
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      label(ctx, String(i + 1), x + 6, y + 15, on ? C.bg : C.axis, { size: 10 });
      label(ctx, STAGES[i].name, x + bw / 2, y + bh / 2 + 6, on ? C.bg : C.fg, { align: 'center', size: 12, weight: 600 });
      if (i < STAGES.length - 1) {
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + bw + 1, y + bh / 2);
        ctx.lineTo(x + bw + gap - 1, y + bh / 2);
        ctx.lineTo(x + bw + gap - 5, y + bh / 2 - 4);
        ctx.moveTo(x + bw + gap - 1, y + bh / 2);
        ctx.lineTo(x + bw + gap - 5, y + bh / 2 + 4);
        ctx.stroke();
      }
    }

    /* 流动的数据包：示意「产物在工序间传递」 */
    const px = 8 + flow * (bw + gap) + bw / 2;
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(px, y - 16, 5, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, '产物', px, y - 24, C.accent2, { align: 'center', size: 10 });
    label(ctx, '点一个方框看该步的产物（播放时自动巡游）', 8, H - 6, C.fg, { size: 11 });
  }

  function syncText() {
    const st = STAGES[sel];
    ro.set('阶段', `${sel + 1}. ${st.name}`);
    ro.set('工具', st.tool);
    ro.set('产物', st.io);
    pre.textContent = `${st.name}（${st.tool}）\n${st.desc}`;
    code.textContent = codeView === 'c' ? CODE.c : codeView === 's' ? CODE.s : CODE.m;
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      const { bh } = geom();
      return y >= 40 && y <= 52 + bh ? 'main' : null;
    },
    down(id, x) {
      const { bw, gap } = geom();
      const i = Math.floor((x - 8) / (bw + gap));
      if (i >= 0 && i < STAGES.length) {
        sel = i;
        flow = i;
        syncText();
        draw();
      }
    },
    move() {},
  });

  const controls = anim(host, {
    onTick(dt) {
      flow += dt * 0.9;
      if (flow >= STAGES.length) flow = 0;
      const i = Math.floor(flow) % STAGES.length;
      if (i !== sel) {
        sel = i;
        syncText();
      }
      draw();
    },
    onReset() {
      flow = 0;
      sel = 0;
      syncText();
      draw();
    },
  });

  syncText();
  draw();
  cv.redraw = draw;

  return {
    destroy() { controls.stop(); },
  };
}
