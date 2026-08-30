/* 从原理图到 PCB。
   这一节不计算，只讲流程：原理图上画错一个脚位，代价会随着流程往后指数放大——
   网表阶段改是零成本，制板后改就得割线飞线，量产后再改就是灾难。
   每一步都列出「要点」与「常见坑」，点方块切换。 */
import {
  themeColors, setupCanvas, bindPointer, el, mkBtn, buildToolbar, buildReadout, label,
} from '../core.js';

const STEPS = [
  {
    name: '原理图',
    io: '想法 → 器件符号 + 连线',
    points: ['每个元件必须有唯一位号（R1、C3、U2）', '网络标号即电气连接，跨页靠 port / off-sheet',
      '先画电源与地树，再画信号', '标注清楚封装（Footprint）——原理图不决定焊盘'],
    traps: ['符号引脚编号与实物不一致（尤其二极管、三极管、MOSFET 的 B/C/E、G/D/S）',
      '多个电源网络同名不同压（+5V 与 +5V_STBY 混用）', '忘了画去耦电容，布局时再补就乱了'],
  },
  {
    name: '网表',
    io: '原理图 → 元件清单 + 连接关系',
    points: ['网表是唯一真相：布线只认它，不认图', '导出 BOM：位号、型号、封装、数量、供应商料号',
      'ERC（电气规则检查）必须清零', '给关键网络命名（CLK、RST、VBAT），方便后面约束'],
    traps: ['封装没指派，导出后是空封装', '位号重复 → 两个元件被当成同一个',
      '单端网络（只接了一个脚的线）被静默忽略'],
  },
  {
    name: '布局',
    io: '网表 → 板上物理位置',
    points: ['先放连接器、开关、指示灯——它们的位置由外壳决定', '按信号流走：输入 → 处理 → 输出，避免回折',
      '模拟与数字分区，功率器件靠边散热', '去耦电容紧贴 IC 电源脚：先电容后 IC，或同时放'],
    traps: ['去耦电容放得远，等于没放（引线电感吃掉高频）',
      '晶振离 MCU 太远或走线从下方穿过', '发热元件挨着电解电容，寿命直接减半'],
  },
  {
    name: '布线',
    io: '物理位置 → 铜箔连接',
    points: ['先走电源与地，再走时钟与差分，最后走一般信号', '电源走线按电流算宽度（1 oz 铜：10 mil ≈ 1 A）',
      '完整地平面比什么都重要：回流路径最短', '拐角用 45°，避免直角（蚀刻与阻抗都更稳）'],
    traps: ['地平面被过孔或走线割裂，回流绕大圈 → EMC 灾难',
      '线宽按默认值，大电流一上电就烧断', '差分对长度不匹配，共模抑制全丢'],
  },
  {
    name: 'DRC',
    io: '布线结果 → 规则校验',
    points: ['线宽 / 间距 / 孔径 / 阻焊桥 逐项设规则', 'DRC 清零只是及格线，不是优秀线',
      '再做一次网表比对（网表 ↔ 板子），防止手工改线出错', '丝印检查：位号别压在焊盘上'],
    traps: ['只看 DRC 不看间距之外的 manufacturability', '忘了检查器件 3D 高度与外壳干涉',
      '过孔盖油没勾，焊接时短路'],
  },
  {
    name: '制板',
    io: 'Gerber → 实物 PCB',
    points: ['输出 Gerber（各层 + 钻孔 + 边框）与 IPC-356 网表',
      '注明板厚、铜厚、阻焊颜色、表面处理（HASL / ENIG）', '阻抗要求要提前给板厂，不能事后抱怨'],
    traps: ['Gerber 单位/精度填错（英制 2:5 vs 公制）', '忘了输出钻孔文件，板子没孔',
      '拼板没加工艺边，SMT 过不了轨'],
  },
  {
    name: '焊接测试',
    io: 'PCB + 元件 → 可工作板卡',
    points: ['先焊电源，量电压正常再焊其余', '目视 + AOI 查连锡、虚焊、错件、反件',
      '分模块上电：电源 → 时钟 → 复位 → 通信', '飞线要记录，下一版必须改掉'],
    traps: ['元件方向焊反（二极管、电解、IC 第一脚）',
      '一上电就冒烟：多半是电源反接或桥接', '没有测试点，后期调试无从下手'],
  },
];

export default function render(host, spec) {
  let C = themeColors();
  let sel = spec.step ?? 0;

  const cv = setupCanvas(host, 120);
  const ro = buildReadout({ 当前阶段: '—', 输入产出: '—' });
  host.appendChild(ro.box);

  /* 详情面板：要点 + 常见坑 */
  const panel = el('div');
  panel.style.cssText = 'padding:0.5rem 0.9rem;font-size:0.85rem;line-height:1.75';
  host.appendChild(panel);
  const bar = buildToolbar(mkBtn('← 上一步'), mkBtn('下一步 →'));
  bar.style.justifyContent = 'flex-start';
  host.appendChild(bar);
  const prev = bar.firstChild;
  const next = bar.lastChild;
  prev.addEventListener('click', () => { sel = (sel - 1 + STEPS.length) % STEPS.length; sync(); });
  next.addEventListener('click', () => { sel = (sel + 1) % STEPS.length; sync(); });

  function geom() {
    const W = cv.W;
    const n = STEPS.length;
    const gap = 8;
    const bw = (W - 24 - gap * (n - 1)) / n;
    return { bw, gap, y: 44, bh: 46 };
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const { bw, gap, y, bh } = geom();
    STEPS.forEach((st, i) => {
      const x = 12 + i * (bw + gap);
      const on = i === sel;
      const done = i < sel;
      ctx.fillStyle = on ? C.accent : (done ? C.soft : C.bg);
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = on ? C.accent : C.axis;
      ctx.lineWidth = on ? 2.2 : 1.2;
      ctx.strokeRect(x, y, bw, bh);
      label(ctx, String(i + 1), x + 6, y + 15, on ? C.bg : C.fg, { size: 10, weight: 600 });
      label(ctx, st.name, x + bw / 2, y + bh / 2 + 5, on ? C.bg : C.fg,
        { align: 'center', size: 11, weight: 600 });
      if (i < STEPS.length - 1) {
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + bw + 1, y + bh / 2);
        ctx.lineTo(x + bw + gap - 1, y + bh / 2);
        ctx.stroke();
      }
    });
    label(ctx, '点方块或按方向按钮切换阶段　每一阶段发现的错，越往后改代价越大', 12, 20, C.fg, { size: 10 });
    label(ctx, '代价 ↑', W - 12, H - 8, C.bad, { align: 'right', size: 10 });
  }

  function sync() {
    const st = STEPS[sel];
    panel.innerHTML = '';
    const head = el('div', null, st.io);
    head.style.cssText = `font-weight:600;color:${C.fg};margin-bottom:0.3rem`;
    panel.appendChild(head);
    const mk = (title, items, col) => {
      const box = el('div');
      box.style.marginBottom = '0.4rem';
      const t = el('div', null, title);
      t.style.cssText = `color:${col};font-weight:600`;
      box.appendChild(t);
      const ul = el('ul');
      ul.style.cssText = 'margin:0.2rem 0 0;padding-left:1.15rem';
      items.forEach((x) => {
        const li = el('li', null, x);
        li.style.color = C.fg;
        ul.appendChild(li);
      });
      box.appendChild(ul);
      return box;
    };
    panel.append(mk('要点', st.points, C.accent), mk('常见坑', st.traps, C.bad));
    ro.set('当前阶段', (sel + 1) + ' / ' + STEPS.length + '　' + st.name);
    ro.set('输入产出', st.io);
    draw();
  }

  bindPointer(cv.canvas, {
    pick(px, py) {
      const { bw, gap, y, bh } = geom();
      if (py < y || py > y + bh) return null;
      for (let i = 0; i < STEPS.length; i += 1) {
        const x = 12 + i * (bw + gap);
        if (px >= x && px <= x + bw) return String(i);
      }
      return null;
    },
    down(id) { sel = Number(id); sync(); },
  });

  draw();
  sync();
  cv.redraw = draw;
  return { destroy() {} };
}
