/* TCP 拥塞控制：cwnd 随 RTT 轮次怎么长、遇到丢包怎么砍。
   慢启动是指数、拥塞避免是线性——「加性增、乘性减」这条锯齿就是互联网的呼吸。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildToolbar,
  buildReadout, mkBtn, label, polyline, fmt,
} from '../core.js';

const MSS = 1460;

export default function render(host) {
  let ssthresh = 16;
  let rtt = 60;
  let cwnd = 1;
  let phase = 'slow';
  let round = 0;
  let sent = 0;
  let hist = [];

  const cv = setupCanvas(host, 260);
  const ro = buildReadout({ 轮次: '0', cwnd: '—', ssthresh: '—', 状态: '—', 吞吐量: '—', 累计发送: '—' });
  host.appendChild(ro.box);

  const bRound = mkBtn('推进 1 个 RTT');
  const bTime = mkBtn('触发超时重传');
  const bDup = mkBtn('触发 3 次重复 ACK');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bRound, bTime, bDup, bReset));

  function reset() {
    cwnd = 1;
    phase = 'slow';
    round = 0;
    sent = 0;
    hist = [{ round: 0, cwnd: 1, ssthresh, ev: null }];
    sync();
    draw();
  }

  function nextRound() {
    round += 1;
    if (phase === 'slow') {
      cwnd = Math.min(cwnd * 2, ssthresh);
      if (cwnd >= ssthresh) phase = 'avoid';
    } else if (phase === 'fast') {
      cwnd = ssthresh;
      phase = 'avoid';
    } else {
      cwnd += 1;
    }
    sent += cwnd;
    hist.push({ round, cwnd, ssthresh, ev: null });
    sync();
    draw();
  }

  function timeout() {
    ssthresh = Math.max(Math.floor(cwnd / 2), 2);
    cwnd = 1;
    phase = 'slow';
    round += 1;
    hist.push({ round, cwnd, ssthresh, ev: 'timeout' });
    sync();
    draw();
  }

  function dupAck() {
    ssthresh = Math.max(Math.floor(cwnd / 2), 2);
    cwnd = ssthresh + 3;
    phase = 'fast';
    round += 1;
    hist.push({ round, cwnd, ssthresh, ev: 'dup' });
    sync();
    draw();
  }

  function sync() {
    const name = { slow: '慢启动（指数增长）', avoid: '拥塞避免（每轮 +1）', fast: '快恢复' };
    ro.set('轮次', String(round));
    ro.set('cwnd', fmt(cwnd, 0) + ' MSS');
    ro.set('ssthresh', fmt(ssthresh, 0) + ' MSS');
    ro.set('状态', name[phase]);
    ro.set('吞吐量', fmt((cwnd * MSS * 8) / (rtt / 1000) / 1e6, 2) + ' Mbps');
    ro.set('累计发送', fmt((sent * MSS) / 1000, 1) + ' KB');
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const x0 = 42;
    const y0 = 22;
    const x1 = W - 12;
    const y1 = H - 26;
    const maxR = Math.max(round, 24);
    const maxC = Math.max(ssthresh * 2, cwnd * 1.2, 20);
    const px = (r) => x0 + (r / maxR) * (x1 - x0);
    const py = (v) => y1 - (v / maxC) * (y1 - y0);

    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let v = 0; v <= maxC; v += Math.max(4, Math.round(maxC / 6))) {
      ctx.beginPath();
      ctx.moveTo(x0, py(v));
      ctx.lineTo(x1, py(v));
      ctx.stroke();
      label(ctx, String(v), x0 - 6, py(v) + 4, C.axis, { size: 10, align: 'right' });
    }
    label(ctx, 'cwnd (MSS)', x0 - 6, y0 - 6, C.fg, { size: 10, align: 'right' });
    label(ctx, 'RTT 轮次', x1, y1 + 16, C.fg, { size: 10, align: 'right' });

    /* 阈值线 */
    ctx.strokeStyle = C.accent2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, py(ssthresh));
    ctx.lineTo(x1, py(ssthresh));
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'ssthresh', x1 - 4, py(ssthresh) - 5, C.accent2, { size: 10, align: 'right' });

    const pts = hist.map((h) => [px(h.round), py(h.cwnd)]);
    polyline(ctx, pts, C.accent, 2.2);
    hist.forEach((h) => {
      if (!h.ev) return;
      ctx.fillStyle = h.ev === 'timeout' ? C.bad : C.named('amber');
      ctx.beginPath();
      ctx.arc(px(h.round), py(h.cwnd), 4.5, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, h.ev === 'timeout' ? '超时' : '3 dup ACK', px(h.round), py(h.cwnd) - 9,
        h.ev === 'timeout' ? C.bad : C.named('amber'), { size: 10, align: 'center' });
    });
    if (pts.length) {
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 4, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, '■ 拥塞窗口 cwnd　● 超时（乘性减到 1）　● 快重传快恢复（减半）', x0, H - 6, C.fg, { size: 11 });
  }

  bRound.addEventListener('click', nextRound);
  bTime.addEventListener('click', timeout);
  bDup.addEventListener('click', dupAck);
  bReset.addEventListener('click', reset);

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'ssthresh', label: '慢启动阈值', min: 4, max: 32, step: 1, value: ssthresh },
        { name: 'rtt', label: 'RTT (ms)', min: 10, max: 300, step: 5, value: rtt },
      ],
    },
    (st) => { ssthresh = st.ssthresh; rtt = st.rtt; sync(); draw(); },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc > 0.35) {
        acc = 0;
        nextRound();
        if (round > 200) reset();
      }
    },
    onReset() { reset(); },
  });

  reset();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
