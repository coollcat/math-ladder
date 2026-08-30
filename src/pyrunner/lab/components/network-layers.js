/* 网络分层与协议栈：OSI 七层与 TCP/IP 四层并排对照，点一层看它的 PDU 与协议；
   下面那条越走越长的报文，就是「封装」——每往下一层就多套一层首部。 */
import {
  themeColors, setupCanvas, bindPointer, anim, buildReadout, el, label, clamp,
} from '../core.js';

const OSI = [
  { n: 7, name: '应用层', pdu: '报文 Message', proto: 'HTTP / DNS / SMTP / MQTT', fn: '面向用户的语义：请求长什么样、每个字段什么意思。' },
  { n: 6, name: '表示层', pdu: '表示数据', proto: 'TLS / JSON / JPEG / gzip', fn: '编码、加密、压缩——让两端对同一串字节有一致解释。' },
  { n: 5, name: '会话层', pdu: '会话数据', proto: 'RPC / TLS 会话', fn: '建立、维持、断开对话：检查点、断点续传、重连。' },
  { n: 4, name: '传输层', pdu: '段 Segment / 数据报', proto: 'TCP / UDP / QUIC', fn: '端到端的复用与可靠：端口号、序号、重传、拥塞控制。' },
  { n: 3, name: '网络层', pdu: '包 Packet', proto: 'IP / ICMP / OSPF / BGP', fn: '跨网络寻址与选路：IP 地址、TTL、分片、路由表。' },
  { n: 2, name: '数据链路层', pdu: '帧 Frame', proto: 'Ethernet / Wi-Fi / ARP', fn: '相邻两点之间成帧：MAC 地址、CRC 校验、介质争用。' },
  { n: 1, name: '物理层', pdu: '比特 Bit', proto: '1000BASE-T / 光纤 / 无线电', fn: '把 0/1 变成真实信号：电平、调制、码元速率。' },
];
const TCPIP = [
  { name: '应用层', proto: 'HTTP / DNS / TLS', span: [7, 5] },
  { name: '传输层', proto: 'TCP / UDP', span: [4, 4] },
  { name: '网际层', proto: 'IP / ICMP', span: [3, 3] },
  { name: '网络接口层', proto: 'Ethernet / Wi-Fi', span: [2, 1] },
];
const ENCAP = [
  { name: '应用数据', bytes: 100, at: '应用 / 表示 / 会话' },
  { name: 'TCP 首部', bytes: 20, at: '传输层' },
  { name: 'IP 首部', bytes: 20, at: '网络层' },
  { name: '以太网首部 + FCS', bytes: 18, at: '数据链路层' },
];

export default function render(host) {
  const C0 = themeColors();
  let sel = 0;
  let prog = 0;

  const cv = setupCanvas(host, 360);
  const ro = buildReadout({ 选中: '—', PDU: '—', 协议: '—', 封装总长: '—' });
  host.appendChild(ro.box);

  const pre = el('pre');
  pre.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(pre);

  const top = 26;
  const rowH = 24;

  function geom() {
    const W = cv.W;
    return { lw: (W - 30) * 0.55, lx: 8, rx: 8 + (W - 30) * 0.55 + 14 };
  }

  function sync() {
    const L = OSI[sel];
    ro.set('选中', `OSI 第 ${L.n} 层 · ${L.name}`);
    ro.set('PDU', L.pdu);
    ro.set('协议', L.proto);
    const total = ENCAP.reduce((a, e) => a + e.bytes, 0);
    ro.set('封装总长', `${total} 字节（首部开销 ${Math.round(((total - 100) / total) * 100)}%）`);
    pre.textContent = `${L.name}（第 ${L.n} 层）\n  PDU 名称：${L.pdu}\n  典型协议：${L.proto}\n  干什么：${L.fn}`;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const { lw, lx, rx } = geom();

    label(ctx, 'OSI 七层（参考模型）', lx, 14, C.fg, { size: 11, weight: 600 });
    label(ctx, 'TCP/IP 四层（实用模型）', rx, 14, C.fg, { size: 11, weight: 600 });

    OSI.forEach((L, i) => {
      const y = top + i * rowH;
      const on = i === sel;
      ctx.fillStyle = on ? C.accent : C.soft;
      ctx.globalAlpha = on ? 0.9 : 1;
      ctx.fillRect(lx, y, lw, rowH - 4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = on ? C.accent : C.grid;
      ctx.lineWidth = on ? 1.8 : 1;
      ctx.strokeRect(lx + 0.5, y + 0.5, lw - 1, rowH - 5);
      label(ctx, `${L.n} ${L.name}`, lx + 8, y + 14, on ? C.bg : C.fg, { size: 11, weight: on ? 700 : 400 });
      label(ctx, L.pdu.split(' ')[0], lx + lw - 8, y + 14, on ? C.bg : C.axis, { size: 10, align: 'right' });
    });

    TCPIP.forEach((T) => {
      const r0 = 7 - T.span[0];
      const r1 = 7 - T.span[1];
      const y = top + r0 * rowH;
      const h = (r1 - r0 + 1) * rowH - 4;
      ctx.fillStyle = C.soft;
      ctx.fillRect(rx, y, W - rx - 8, h);
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rx + 0.5, y + 0.5, W - rx - 9, h - 1);
      label(ctx, T.name, rx + (W - rx - 8) / 2, y + h / 2 - 2, C.fg, { align: 'center', size: 11, weight: 600 });
      label(ctx, T.proto, rx + (W - rx - 8) / 2, y + h / 2 + 12, C.axis, { align: 'center', size: 9 });
      const midY = y + h / 2;
      ctx.strokeStyle = C.grid;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lx + lw, midY);
      ctx.lineTo(rx, midY);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    /* --- 封装动画 --- */
    const ey = top + 7 * rowH + 26;
    label(ctx, '封装：数据从上往下走，每过一层就套一个首部', 8, ey - 8, C.fg, { size: 11 });
    const total = ENCAP.reduce((a, e) => a + e.bytes, 0);
    const barW = W - 16;
    const sx = barW / total;
    let x = 8;
    ENCAP.forEach((e, i) => {
      const shown = clamp(prog - i, 0, 1);
      const col = C.series(i);
      if (shown > 0) {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, ey, e.bytes * sx * shown, 34);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 0.5, ey + 0.5, Math.max(e.bytes * sx * shown - 1, 1), 33);
        if (shown > 0.6) {
          label(ctx, e.name, x + (e.bytes * sx * shown) / 2, ey + 16, C.bg, { align: 'center', size: 10, weight: 600 });
          label(ctx, e.bytes + ' B', x + (e.bytes * sx * shown) / 2, ey + 28, C.bg, { align: 'center', size: 9 });
        }
      }
      x += e.bytes * sx;
    });
    label(ctx, prog >= ENCAP.length ? `封装完成：100 B 数据 → ${total} B 帧，首部占了 ${Math.round(((total - 100) / total) * 100)}%`
      : `正在加第 ${Math.min(Math.floor(prog) + 1, ENCAP.length)} 层：${ENCAP[Math.min(Math.floor(prog), ENCAP.length - 1)].at}`,
      8, ey + 52, prog >= ENCAP.length ? C.ok : C.accent2, { size: 11 });
    label(ctx, '← 先出现的在内层（先发）', W - 8, ey + 52, C.axis, { size: 10, align: 'right' });
  }

  bindPointer(cv.canvas, {
    pick: () => 'main',
    down(id, x, y) {
      if (y >= top && y < top + 7 * rowH) {
        const i = Math.floor((y - top) / rowH);
        sel = clamp(i, 0, OSI.length - 1);
        sync();
        draw();
      }
    },
    move() {},
  });

  const controls = anim(host, {
    onTick(dt) {
      prog += dt * 1.4;
      if (prog > ENCAP.length + 1.2) prog = 0;
      draw();
    },
    onReset() { prog = 0; draw(); },
  });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); } };
}
