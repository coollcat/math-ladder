/* 分布式一致性（Raft 简化版）：5 个节点选主、复制日志、多数派提交。
   注入网络分区或让节点宕机，看少数派为什么写不进去、恢复后为什么被多数派的日志覆盖。 */
import {
  themeColors, setupCanvas, bindPointer, anim, buildToolbar,
  buildReadout, el, mkBtn, label, clamp,
} from '../core.js';

const N = 5;

function mkNodes() {
  return Array.from({ length: N }, (_, i) => ({
    id: i, state: 'follower', term: 0, log: [], commit: 0,
    alive: true, part: 0, t: 1.2 + Math.random() * 1.5, hb: 0,
  }));
}

export default function render(host) {
  let nodes = mkNodes();
  let cmds = 0;
  let clock = 0;
  let hint = '点「开始」让心跳跑起来；点某个节点可以把它宕机 / 拉起。';

  const cv = setupCanvas(host, 230);
  const ro = buildReadout({ 任期: '0', Leader: '—', 已提交: '0', 日志: '—', 提示: '—' });
  host.appendChild(ro.box);

  const bProp = mkBtn('提议写入 x=n');
  const bPart = mkBtn('注入 / 恢复网络分区');
  const bKill = mkBtn('随机宕机一个');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bProp, bPart, bKill, bReset));

  const note = el('div', 'ml-lab__hint', hint);
  note.style.cssText = 'padding:0.3rem 0.85rem;display:block';
  host.appendChild(note);

  const reachable = (a, b) => a.alive && b.alive && a.part === b.part;
  const group = (n) => nodes.filter((m) => m.alive && m.part === n.part);
  const majority = (g) => Math.floor(g.length / 2) + 1;
  const resetTimer = (n) => { n.t = 1.2 + Math.random() * 1.5; };

  function startElection(n) {
    n.state = 'candidate';
    n.term += 1;
    let votes = 1;
    nodes.forEach((m) => {
      if (m === n || !reachable(n, m)) return;
      if (n.term > m.term || (n.term === m.term && n.log.length >= m.log.length)) {
        m.term = n.term;
        m.state = 'follower';
        resetTimer(m);
        votes += 1;
      }
    });
    const g = group(n);
    if (votes >= majority(g)) {
      n.state = 'leader';
      n.hb = 0;
      hint = `任期 ${n.term}：N${n.id} 拿到 ${votes}/${g.length} 票，成为 leader`;
    } else {
      hint = `任期 ${n.term}：N${n.id} 只拿到 ${votes}/${g.length} 票，选举超时后重来`;
      resetTimer(n);
    }
  }

  function sendAppend(leader) {
    const g = group(leader);
    g.forEach((m) => {
      if (m === leader || m.state === 'leader') return;
      m.term = leader.term;
      m.state = 'follower';
      resetTimer(m);
      if (m.log.length > leader.log.length) m.log = m.log.slice(0, leader.log.length);
      else if (m.log.length < leader.log.length) m.log = leader.log.slice(0, m.log.length + 1);
    });
    const lens = g.map((m) => m.log.length).sort((a, b) => a - b);
    const c = lens[lens.length - majority(g)] || 0;
    g.forEach((m) => { m.commit = clamp(Math.max(m.commit, c), 0, m.log.length); });
  }

  function tick(dt) {
    clock += dt;
    nodes.forEach((n) => {
      if (!n.alive) return;
      if (n.state === 'leader') {
        n.hb -= dt;
        if (n.hb <= 0) {
          n.hb = 0.45;
          sendAppend(n);
        }
        return;
      }
      n.t -= dt;
      if (n.t <= 0) startElection(n);
    });
    sync();
    draw();
  }

  function sync() {
    const alive = nodes.filter((n) => n.alive);
    const maxT = alive.reduce((a, n) => Math.max(a, n.term), 0);
    const leaders = nodes.filter((n) => n.state === 'leader');
    ro.set('任期', String(maxT));
    ro.set('Leader', leaders.length ? leaders.map((n) => `N${n.id}(分区${n.part}, 任期${n.term})`).join(' ') : '无（选举中）');
    ro.set('已提交', String(Math.max(...nodes.map((n) => n.commit))));
    ro.set('日志', nodes.map((n) => `N${n.id}:${n.log.length}`).join(' '));
    ro.set('提示', hint);
    note.textContent = hint;
  }

  function nodeX(n) {
    const g0 = nodes.filter((x) => x.part === 0).length;
    const split = g0 < N;
    const pad = 34;
    const gap = split ? 46 : 0;
    const slotW = (cv.W - pad * 2 - gap) / N;
    const idx = n.part === 0
      ? nodes.filter((x) => x.part === 0).indexOf(n)
      : g0 + nodes.filter((x) => x.part === 1).indexOf(n);
    return pad + slotW * (idx + 0.5) + (n.part === 1 ? gap : 0);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const y = 62;
    const split = nodes.some((n) => n.part === 1);
    if (split) {
      const g0 = nodes.filter((x) => x.part === 0).length;
      const pad = 34;
      const slotW = (W - pad * 2 - 46) / N;
      const x = pad + slotW * g0 + 23;
      ctx.strokeStyle = C.bad;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, H - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '网络分区', x + 4, 16, C.bad, { size: 10 });
    }

    nodes.forEach((n) => {
      const x = nodeX(n);
      const col = !n.alive ? C.named('gray')
        : n.state === 'leader' ? C.accent : n.state === 'candidate' ? C.named('amber') : C.named('teal');
      ctx.beginPath();
      ctx.arc(x, y, 21, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = n.alive ? 0.85 : 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      label(ctx, 'N' + n.id, x, y + 1, C.bg, { align: 'center', size: 11, weight: 700 });
      label(ctx, n.alive ? { leader: 'Leader', candidate: 'Candidate', follower: 'Follower' }[n.state] : '已宕机',
        x, y + 15, C.bg, { align: 'center', size: 9 });
      label(ctx, `任期 ${n.term}`, x, y + 36, C.fg, { align: 'center', size: 10 });

      const bw = 13;
      const total = Math.max(n.log.length, 1);
      const startX = x - (Math.min(total, 8) * bw) / 2;
      for (let i = 0; i < Math.min(n.log.length, 8); i += 1) {
        const bx = startX + i * bw;
        ctx.fillStyle = i < n.commit ? C.accent : C.soft;
        ctx.fillRect(bx, y + 44, bw - 2, 14);
        ctx.strokeStyle = i < n.commit ? C.accent : C.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, y + 44.5, bw - 3, 13);
      }
      label(ctx, `log ${n.log.length} / commit ${n.commit}`, x, y + 76, C.fg, { align: 'center', size: 10 });
    });

    /* 心跳动画：从 leader 飞向同分区的 follower */
    nodes.filter((n) => n.state === 'leader' && n.alive).forEach((L) => {
      const lx = nodeX(L);
      nodes.forEach((m) => {
        if (m === L || !reachable(L, m)) return;
        const mx = nodeX(m);
        const p = (clock % 0.45) / 0.45;
        const px = lx + (mx - lx) * p;
        ctx.fillStyle = C.accent2;
        ctx.beginPath();
        ctx.arc(px, y - 26 - 6 * Math.sin(p * Math.PI), 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, y - 21);
        ctx.lineTo(mx, y - 21);
        ctx.stroke();
      });
    });
    label(ctx, '实心方块 = 已提交（多数派复制完）；空心 = 只在本地', 8, H - 6, C.fg, { size: 10 });
  }

  bindPointer(cv.canvas, {
    pick: () => 'main',
    down(id, x, py) {
      const hit = nodes.find((n) => Math.hypot(nodeX(n) - x, 62 - py) < 24);
      if (!hit) return;
      hit.alive = !hit.alive;
      if (!hit.alive) {
        hit.state = 'follower';
        hint = `N${hit.id} 已宕机：它不再参与投票与多数派，剩下的 ${group(hit).length} 个节点仍可继续服务。`;
      } else {
        hit.t = 0.8;
        hint = `N${hit.id} 重新上线：先当 follower 追日志，追平后才可能被选为 leader。`;
      }
      sync();
      draw();
    },
    move() {},
  });

  bProp.addEventListener('click', () => {
    const L = nodes.find((n) => n.state === 'leader' && n.part === 0 && n.alive);
    if (!L) {
      hint = '主分区里没有 leader → 这次写入无法提交。这就是 CAP 里分区时牺牲的 C。';
    } else {
      cmds += 1;
      L.log.push({ term: L.term, cmd: cmds });
      hint = `已把 x=${cmds} 追加到 leader N${L.id} 的日志；要等多数派复制完才会提交生效。`;
    }
    sync();
    draw();
  });
  bPart.addEventListener('click', () => {
    const split = nodes.some((n) => n.part === 1);
    nodes.forEach((n, i) => { n.part = !split && i >= 3 ? 1 : 0; });
    if (split) {
      const maxT = nodes.filter((n) => n.alive).reduce((a, n) => Math.max(a, n.term), 0);
      nodes.forEach((n) => {
        if (n.state === 'leader' && n.term < maxT) { n.state = 'follower'; n.term = maxT; resetTimer(n); }
      });
      hint = '分区恢复：任期低的旧 leader 自动下台，日志以高任期的多数派为准，未提交的条目被覆盖。';
    } else {
      hint = '已把 N3、N4 隔离到少数派分区：它们收不到心跳，会不断发起选举但永远拿不到多数票。';
    }
    sync();
    draw();
  });
  bKill.addEventListener('click', () => {
    const alive = nodes.filter((n) => n.alive);
    if (alive.length <= 1) return;
    const v = alive[Math.floor(Math.random() * alive.length)];
    v.alive = false;
    v.state = 'follower';
    hint = `N${v.id} 宕机。${alive.length - 1} ≥ 3，多数派仍在，服务不中断。`;
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    nodes = mkNodes();
    cmds = 0;
    hint = '已重置：所有节点回到任期 0 的 follower。';
    sync();
    draw();
  });

  const controls = anim(host, {
    onTick: tick,
    onReset() { nodes = mkNodes(); cmds = 0; hint = '已重置。'; sync(); draw(); },
  });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() { controls.stop(); } };
}
