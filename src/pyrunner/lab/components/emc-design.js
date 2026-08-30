/* EMC 三要素：干扰源、耦合路径、敏感设备，掐断任意一个就不成其为干扰。
   小环天线的辐射强度 E ∝ f²·A·I / r —— 环路面积是最容易被忽视、也最好改的那一项。 */
import {
  themeColors, setupCanvas, buildReadout, buildSliders, buildToolbar,
  mkBtn, label, clamp, fmt,
} from '../core.js';

/* 小环天线远场估算：E(µV/m) = 1.316e-14 · f²(Hz) · A(cm²) · I(mA) / r(m)，
   换算成 f 以 MHz 计时系数是 0.01316。 */
const K_E = 0.01316;

const MEASURES = [
  { id: 'shield', label: '屏蔽（金属壳 20 dB）', db: 20, why: '在源与路径之间插一层导电屏障' },
  { id: 'filter', label: '滤波（I/O 与电源口 15 dB）', db: 15, why: '掐断传导耦合路径，只放出干净的直流/低频' },
  { id: 'ground', label: '接地（降共模 8 dB）', db: 8, why: '给共模电流一条低阻抗回去的路，别让它走电缆' },
  { id: 'twist', label: '扭绞 / 缩小环路（面积 ÷10）', db: 20, why: '去程回程贴在一起，磁场抵消，面积小一个量级' },
];

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    A: spec.A ?? 20,       // 环路面积 cm²
    f: spec.f ?? 100,      // 干扰频率 MHz
    I: spec.I ?? 20,       // 环路电流 mA
    r: spec.r ?? 3,        // 测试距离 m
    on: { shield: false, filter: false, ground: false, twist: false },
  };
  const cv = setupCanvas(host, 340);
  const ro = buildReadout({
    辐射电平: '—', 限值: '—', 余量: '—', 环路面积: '—', 措施合计: '—', 判定: '—',
  });
  host.appendChild(ro.box);

  const btns = MEASURES.map((m) => {
    const b = mkBtn(m.label);
    b.addEventListener('click', () => {
      s.on[m.id] = !s.on[m.id];
      b.classList.toggle('is-active', s.on[m.id]);
      draw();
    });
    return { b, m };
  });
  host.appendChild(buildToolbar(...btns.map((x) => x.b)));

  /* 当前环路面积与总衰减 */
  const area = () => (s.on.twist ? s.A / 10 : s.A);
  const atten = () => MEASURES.reduce((a, m) => a + (s.on[m.id] ? m.db : 0), 0);
  const level = () => 20 * Math.log10(Math.max((K_E * s.f * s.f * area() * s.I) / s.r, 1e-6));
  const limit = () => (s.f <= 230 ? 40 : 47);   // CISPR 32 Class B @3 m（30–230 / 230–1000 MHz）

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const E = level() - atten();
    const lim = limit();
    const over = E - lim;

    /* ---- 三要素 + 环路 ---- */
    const cy = 96;
    const boxW = Math.min(96, W * 0.2);
    [['干扰源', '驱动器 / DC-DC', C.named('red')],
      ['耦合路径', '空间辐射 + 电缆传导', C.accent2],
      ['敏感设备', '接收机 / 传感器', C.accent]].forEach(([name, sub, col], i) => {
      const x = 12 + i * (boxW + 26);
      ctx.fillStyle = C.soft;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.rect(x, cy - 20, boxW, 44);
      ctx.fill();
      ctx.stroke();
      label(ctx, name, x + boxW / 2, cy - 4, col, { align: 'center', size: 11, weight: 600 });
      label(ctx, sub, x + boxW / 2, cy + 14, C.fg, { align: 'center', size: 9 });
      if (i < 2) {
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + boxW + 2, cy + 2);
        ctx.lineTo(x + boxW + 24, cy + 2);
        ctx.lineTo(x + boxW + 18, cy - 2);
        ctx.moveTo(x + boxW + 24, cy + 2);
        ctx.lineTo(x + boxW + 18, cy + 6);
        ctx.stroke();
      }
    });

    /* 环路：面积越大，向外画的辐射弧越多越亮 */
    const lx = W - 108;
    const side = clamp(10 + Math.sqrt(area()) * 5, 12, 74);
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(lx - side / 2, cy - side / 2, side, side);
    ctx.stroke();
    ctx.fillStyle = C.named('red');
    ctx.globalAlpha = 0.12;
    ctx.fillRect(lx - side / 2, cy - side / 2, side, side);
    ctx.globalAlpha = 1;
    label(ctx, 'A = ' + fmt(area(), 1) + ' cm²', lx, cy + side / 2 + 16, C.named('red'), { align: 'center', size: 10 });
    /* 环流方向 */
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(lx - side / 2, cy - side / 2 + 6);
    ctx.lineTo(lx - side / 2, cy - side / 2);
    ctx.lineTo(lx - side / 2 + 8, cy - side / 2);
    ctx.stroke();
    /* 辐射弧（强度越高弧越多） */
    const rings = clamp(Math.round((E - 20) / 12), 1, 4);
    for (let k = 1; k <= rings; k += 1) {
      ctx.strokeStyle = over > 0 ? C.bad : C.named('green');
      ctx.globalAlpha = 0.55 / k;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(lx, cy, side / 2 + 8 + k * 9, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* ---- 电平 vs 限值 ---- */
    const by = 196;
    const bh = 30;
    const gx = 46;
    const gw = W - gx - 16;
    const eMin = 10;
    const eMax = 90;
    const XE = (db) => gx + ((clamp(db, eMin, eMax) - eMin) / (eMax - eMin)) * gw;
    ctx.fillStyle = C.soft;
    ctx.fillRect(gx, by, gw, bh);
    ctx.fillStyle = over > 0 ? C.bad : C.ok;
    ctx.fillRect(gx, by, XE(E) - gx, bh);
    ctx.strokeStyle = C.named('red');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(XE(lim), by - 4);
    ctx.lineTo(XE(lim), by + bh + 4);
    ctx.stroke();
    label(ctx, '限值 ' + lim + ' dBµV/m', XE(lim) + 4, by - 6, C.named('red'), { size: 10 });
    label(ctx, fmt(E, 1) + ' dBµV/m', XE(E) - 6, by + bh + 16, over > 0 ? C.bad : C.ok, { align: 'right', size: 11, weight: 600 });
    [20, 40, 60, 80].forEach((db) => {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(XE(db), by);
      ctx.lineTo(XE(db), by + bh);
      ctx.stroke();
      label(ctx, String(db), XE(db), by + bh + 14, C.fg, { align: 'center', size: 9 });
    });
    label(ctx, '辐射发射电平（' + fmt(s.f, 0) + ' MHz @ ' + fmt(s.r, 1) + ' m）', gx, by - 10, C.fg, { size: 10 });

    /* ---- 各项措施贡献 ---- */
    const my = by + bh + 34;
    MEASURES.forEach((m, i) => {
      const y = my + i * 15;
      const on = s.on[m.id];
      ctx.fillStyle = C.soft;
      ctx.fillRect(gx, y, gw, 11);
      ctx.fillStyle = on ? C.named('green') : C.grid;
      ctx.fillRect(gx, y, (m.db / 60) * gw, 11);
      label(ctx, m.label + '：' + (on ? '−' + m.db + ' dB 已生效' : '未启用') ,
        gx - 4, y + 10, on ? C.named('green') : C.grid, { align: 'right', size: 9 });
    });

    const measures = MEASURES.filter((m) => s.on[m.id]).map((m) => m.label.split('（')[0]).join(' + ');
    ro.set('辐射电平', fmt(E, 1) + ' dBµV/m（未整改 ' + fmt(level(), 1) + '）');
    ro.set('限值', lim + ' dBµV/m（CISPR 32 Class B @3 m）');
    ro.set('余量', (over > 0 ? '超标 +' : '余量 ') + fmt(Math.abs(over), 1) + ' dB');
    ro.set('环路面积', fmt(area(), 1) + ' cm²（原始 ' + fmt(s.A, 1) + '，E ∝ A）');
    ro.set('措施合计', '−' + fmt(atten(), 0) + ' dB' + (measures ? '（' + measures + '）' : '（未整改）'));
    ro.set('判定', over > 0 ? '⚠ 超标：' + MEASURES.filter((m) => !s.on[m.id]).map((m) => m.why).slice(0, 1).join('')
      : '低于限值，EMC 预测试可通过');
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'A', label: '环路面积 (cm²)', min: 1, max: 200, step: 1, value: s.A, fmt: 0 },
        { name: 'f', label: '干扰频率 (MHz)', min: 1, max: 500, step: 1, value: s.f, fmt: 0 },
        { name: 'I', label: '环路电流 (mA)', min: 1, max: 200, step: 1, value: s.I, fmt: 0 },
        { name: 'r', label: '测试距离 (m)', min: 1, max: 10, step: 0.5, value: s.r, fmt: 1 },
      ],
    },
    (v) => { s.A = v.A; s.f = v.f; s.I = v.I; s.r = v.r; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { /* 静态图，无动画 */ } };
}
