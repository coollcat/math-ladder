/* 四种常用总线：UART 靠起停位和约定波特率异步对齐；I2C 用两根线做多主多从的地址寻址；
   SPI 用时钟 + 片选换速度；CAN 用差分信号和非破坏性仲裁换抗干扰。拖速率看位时间怎么变。 */
import {
  themeColors, setupCanvas, buildSegmented, buildReadout, buildSliders,
  polyline, label, clamp, fmt,
} from '../core.js';

const BUSES = {
  uart: {
    name: 'UART', pins: '2（TX/RX，异步无时钟）', topo: '点对点',
    addr: '无寻址，靠双方约定波特率', range: [1200, 921600],
    note: '起始位对齐，每帧 1+8+1 = 10 bit，收发起止各一根线',
  },
  i2c: {
    name: 'I2C', pins: '2（SDA/SCL，开漏线与）', topo: '总线型，多主多从',
    addr: '7/10 bit 地址 + R/W，每字节一个 ACK', range: [1e4, 3.4e6],
    note: 'SCL 由主机给，SDA 在 SCL 为高时的跳变就是起始/停止',
  },
  spi: {
    name: 'SPI', pins: '4（SCLK/MOSI/MISO/CS）+ 每从机一根 CS', topo: '主从星型',
    addr: '无寻址，靠 CS 片选', range: [1e5, 5e7],
    note: '全双工同步，CPOL/CPHA 必须与从机一致，没有 ACK 也没有流控',
  },
  can: {
    name: 'CAN', pins: '2（CAN_H/CAN_L 差分）', topo: '总线型，多主',
    addr: '报文 ID（11/29 bit），ID 越小优先级越高', range: [1e4, 1e6],
    note: '显性 0 压过隐性 1，边发边听实现非破坏性仲裁 + CRC 校验',
  },
};

/* 把 n 的第 k 位取出（MSB 优先） */
const bitOf = (v, k, n) => (v >> (n - 1 - k)) & 1;
/* 重复字节流：帧里的负载 */
const payload = (byte, n) => {
  const out = [];
  for (let i = 0; i < n; i += 1) for (let k = 0; k < 8; k += 1) out.push(bitOf(byte, k, 8));
  return out;
};

export default function render(host, spec) {
  const C = themeColors();
  const s = {
    bus: spec.bus || 'uart',
    lvl: spec.lvl ?? 50,      // 速率档位 0–100（按各总线范围对数插值）
    data: spec.data ?? 0x5A,
    n: spec.n ?? 2,           // 一帧里的负载字节数
    mode: spec.mode ?? 0,     // SPI 模式 0–3
  };
  const cv = setupCanvas(host, 330);
  const ro = buildReadout({
    位时间: '—', 一帧时长: '—', 有效吞吐: '—', 引脚: '—', 拓扑: '—', 寻址: '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: 'UART', value: 'uart' }, { label: 'I2C', value: 'i2c' },
      { label: 'SPI', value: 'spi' }, { label: 'CAN', value: 'can' }],
    s.bus,
    (v) => { s.bus = v; draw(); },
  ));
  host.appendChild(buildSegmented(
    [{ label: 'SPI 模式 0', value: '0' }, { label: '模式 1', value: '1' },
      { label: '模式 2', value: '2' }, { label: '模式 3', value: '3' }],
    String(s.mode),
    (v) => { s.mode = parseInt(v, 10); draw(); },
  ));

  const rate = () => {
    const [a, b] = BUSES[s.bus].range;
    return a * (b / a) ** (s.lvl / 100);
  };

  /* 各总线的时序：返回若干条 0/1 数字线（以位时间为单位） */
  function timing() {
    const d = s.data & 0xff;
    if (s.bus === 'uart') {
      const bits = [0];
      for (let k = 0; k < 8; k += 1) bits.push((d >> k) & 1);   // LSB 先发
      bits.push(1, 1);
      return { lines: [{ name: 'TX', bits }], marks: [
        { at: 0, text: '起始位', col: C.named('green') },
        { at: 1, text: '数据 LSB 先发', col: C.fg },
        { at: 9, text: '停止位', col: C.named('amber') },
      ] };
    }
    if (s.bus === 'i2c') {
      const addr = 0x50;
      const sda = [1];                       // 空闲高
      const push = (v) => sda.push(v);
      for (let k = 0; k < 7; k += 1) push(bitOf(addr, k, 7));
      push(0);                               // R/W = 写
      push(0);                               // ACK（从机拉低）
      for (let k = 0; k < 8; k += 1) push(bitOf(d, k, 8));
      push(0);                               // ACK
      sda.push(1);
      const scl = [1];
      for (let i = 0; i < 18; i += 1) scl.push(0, 1);
      scl.push(1);
      return { lines: [{ name: 'SCL', bits: scl }, { name: 'SDA', bits: sda }], marks: [
        { at: 0.4, text: 'START：SCL 高时 SDA↓', col: C.named('green') },
        { at: 8, text: '地址 7bit + R/W', col: C.fg },
        { at: 9, text: 'ACK', col: C.named('purple') },
        { at: 18, text: 'STOP：SCL 高时 SDA↑', col: C.named('amber') },
      ] };
    }
    if (s.bus === 'spi') {
      const cpol = s.mode >= 2 ? 1 : 0;
      const cpha = s.mode % 2;
      const idle = cpol;
      const cs = [1];
      const clk = [idle];
      const mosi = [];
      for (let k = 0; k < 8; k += 1) mosi.push(bitOf(d, k, 8));
      for (let k = 0; k < 8; k += 1) {
        clk.push(1 - idle, idle);
        cs.push(0, 0);
      }
      cs.push(1);
      return {
        lines: [{ name: 'CS', bits: cs }, { name: 'SCLK', bits: clk }, { name: 'MOSI', bits: mosi }],
        marks: [{ at: 0.5, text: cpha ? 'CPHA=1：第二个沿采样' : 'CPHA=0：第一个沿采样', col: C.named('purple') }],
        cpol, cpha,
      };
    }
    /* CAN：SOF + 11 位 ID + RTR/IDE + DLC + 数据 + CRC + ACK + EOF */
    const id = 0x123;
    const bits = [0];
    for (let k = 0; k < 11; k += 1) bits.push(bitOf(id, k + 21, 32) & 1);
    bits.push(0, 0, 0);
    for (let k = 0; k < 4; k += 1) bits.push(bitOf(s.n, k + 4, 8) & 1);
    payload(d, s.n).forEach((v) => bits.push(v));
    for (let k = 0; k < 15; k += 1) bits.push((k % 3 === 0) ? 0 : 1);
    bits.push(1, 0, 1);
    for (let k = 0; k < 7; k += 1) bits.push(1);
    return {
      lines: [
        { name: 'CAN_H', bits: bits.map((b) => 1 - b) },
        { name: 'CAN_L', bits },
      ],
      marks: [
        { at: 0, text: 'SOF（显性）', col: C.named('green') },
        { at: 1, text: '仲裁段 ID=0x123：ID 小者赢', col: C.named('amber') },
        { at: 19, text: '数据段（' + s.n + ' 字节）', col: C.fg },
      ],
    };
  }

  /* 一条数字线：按位时间画方波 */
  function waveLine(ctx, x0, y, w, h, bits, col, name) {
    const n = bits.length;
    const dx = w / n;
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const yy = y + (bits[i] ? 0 : h);
      pts.push([x0 + i * dx, yy]);
      pts.push([x0 + (i + 1) * dx, yy]);
    }
    polyline(ctx, pts, col, 1.8);
    label(ctx, name, x0 - 6, y + h / 2 + 4, col, { align: 'right', size: 10, weight: 600 });
    return dx;
  }

  function draw() {
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const b = BUSES[s.bus];
    const r = rate();
    const t = timing();
    const gx = 58;
    const gw = W - gx - 14;
    const rowH = 26;
    const top = 40;
    label(ctx, b.name + ' 时序（位时间 = 1/' + fmt(r, 0) + ' = ' + fmt((1e9 / r), 1) + ' ns）',
      8, 14, C.fg, { size: 11, weight: 600 });

    t.lines.forEach((ln, i) => {
      const y = top + i * (rowH + 14);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, y - 4);
      ctx.lineTo(gx + gw, y - 4);
      ctx.stroke();
      waveLine(ctx, gx, y, gw, rowH - 6, ln.bits, C.series(i), ln.name);
    });
    /* 标注 */
    const dx = gw / t.lines[0].bits.length;
    (t.marks || []).forEach((m, i) => {
      const x = gx + m.at * dx;
      const y = top + t.lines.length * (rowH + 14) + 8 + i * 14;
      ctx.strokeStyle = m.col;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, top - 8);
      ctx.lineTo(x, y - 2);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, m.text, clamp(x, gx, gx + gw - 4), y + 8, m.col, { size: 10 });
    });

    /* 位时间标尺 */
    const ry = H - 30;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, ry);
    ctx.lineTo(gx + dx, ry);
    ctx.moveTo(gx, ry - 4);
    ctx.lineTo(gx, ry + 4);
    ctx.moveTo(gx + dx, ry - 4);
    ctx.lineTo(gx + dx, ry + 4);
    ctx.stroke();
    label(ctx, '1 位 = ' + fmt(1e9 / r, 1) + ' ns', gx + dx + 6, ry + 4, C.fg, { size: 10 });

    /* 各总线的开销与吞吐 */
    let bits;
    let payloadBits;
    if (s.bus === 'uart') { bits = 10 * s.n; payloadBits = 8 * s.n; }
    else if (s.bus === 'i2c') { bits = 11 + 9 * s.n; payloadBits = 8 * s.n; }
    else if (s.bus === 'spi') { bits = 8 * s.n + 2; payloadBits = 8 * s.n; }
    else { bits = 44 + 8 * s.n; payloadBits = 8 * s.n; }
    const extra = s.bus === 'spi' ? '（CPOL=' + (t.cpol || 0) + ' CPHA=' + (t.cpha || 0) + '）' : '';
    ro.set('位时间', fmt(1e9 / r, 1) + ' ns（' + fmt(r / 1000, 1) + ' kbit/s）');
    ro.set('一帧时长', fmt((bits / r) * 1e6, 2) + ' µs（' + bits + ' bit，负载 ' + payloadBits + ' bit）');
    ro.set('有效吞吐', fmt((r * payloadBits) / bits / 1000, 1) + ' kbit/s（开销 ' + fmt((1 - payloadBits / bits) * 100, 0) + '%）');
    ro.set('引脚', b.pins);
    ro.set('拓扑', b.topo);
    ro.set('寻址', b.addr + extra);
  }

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'lvl', label: '速率档位（按总线范围对数插值）', min: 0, max: 100, step: 1, value: s.lvl, fmt: 0 },
        { name: 'data', label: '数据字节（0–255）', min: 0, max: 255, step: 1, value: s.data, fmt: 0 },
        { name: 'n', label: '一帧负载字节数', min: 1, max: 8, step: 1, value: s.n, fmt: 0 },
      ],
    },
    (v) => { s.lvl = v.lvl; s.data = v.data; s.n = v.n; draw(); },
  );

  draw();
  cv.redraw = draw;
  return { slidersBox: sliders.box, destroy() { /* 静态图，无动画 */ } };
}
