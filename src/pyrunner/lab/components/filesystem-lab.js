/* 文件系统：点一个路径，看它怎么从「目录项 → inode → 数据块」一级级落地。
   下面的 8×8 是磁盘块位图：选中文件的 inode、直接块、一级间接块分别着色，碎片一眼可见。 */
import {
  themeColors, setupCanvas, bindPointer, buildSegmented, buildToolbar,
  buildReadout, el, mkBtn, label,
} from '../core.js';

const FILES = {
  notes: {
    path: '/home/alice/notes.txt', inode: 12, sizeKB: 8,
    chain: [['/', 2], ['home', 8], ['alice', 9], ['notes.txt', 12]],
    direct: [41, 42], lvl1: [], lvl1Data: [],
  },
  big: {
    path: '/home/bob/big.bin', inode: 27, sizeKB: 20,
    chain: [['/', 2], ['home', 8], ['bob', 14], ['big.bin', 27]],
    direct: [43, 45, 52], lvl1: [60], lvl1Data: [70, 71],
  },
  passwd: {
    path: '/etc/passwd', inode: 4, sizeKB: 4,
    chain: [['/', 2], ['etc', 5], ['passwd', 4]],
    direct: [40], lvl1: [], lvl1Data: [],
  },
};
const OTHERS = [16, 17, 18, 24, 25, 33, 34, 44, 47, 48, 49, 56, 57];
const COLS = 8;
const ROWS = 8;

export default function render(host) {
  const C0 = themeColors();
  let key = 'big';
  let hint = '';

  const cv = setupCanvas(host, 340);
  host.appendChild(buildSegmented(
    Object.keys(FILES).map((k) => ({ label: FILES[k].path, value: k })),
    key, (v) => { key = v; hint = ''; sync(); draw(); },
  ));
  const ro = buildReadout({ inode: '—', 大小: '—', 占用块: '—', 碎片: '—' });
  host.appendChild(ro.box);

  const defrag = mkBtn('碎片整理（搬到连续块）');
  host.appendChild(buildToolbar(defrag));

  const pre = el('pre');
  pre.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(pre);

  const f = () => FILES[key];
  const usedByFile = (b) => {
    const x = f();
    return [x.inode, ...x.direct, ...x.lvl1, ...x.lvl1Data].includes(b);
  };

  function runs(blocks) {
    const s = blocks.slice().sort((a, b) => a - b);
    let n = 0;
    s.forEach((v, i) => { if (i === 0 || v !== s[i - 1] + 1) n += 1; });
    return n;
  }

  function sync() {
    const x = f();
    const all = [...x.direct, ...x.lvl1Data];
    ro.set('inode', '#' + x.inode);
    ro.set('大小', x.sizeKB + ' KB');
    ro.set('占用块', `${all.length} 个数据块 + ${x.lvl1.length ? '1 个间接块' : '0 个间接块'}`);
    ro.set('碎片', `跨 ${runs(all)} 段`);
    pre.textContent = `路径解析：${x.path}\n`
      + x.chain.map(([nm, ino]) => `  目录项 "${nm}" → inode #${ino}`).join('\n')
      + `\n\ninode #${x.inode} 的索引结构：\n`
      + `  直接块 [${x.direct.join(', ') || '—'}]\n`
      + `  一级间接 → 块 ${x.lvl1.join(',') || '—'}${x.lvl1.length ? ` → 数据块 [${x.lvl1Data.join(', ')}]` : ''}\n`
      + `\n点磁盘里任一块看它是谁的。当前：${hint || '—'}`;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const x = f();

    /* 上：路径解析链（目录项 → inode） */
    label(ctx, '① 逐级查目录，拿到 inode 号', 8, 13, C.fg, { size: 11 });
    const n = x.chain.length;
    const slot = Math.min(150, (W - 20) / n);
    x.chain.forEach(([nm, ino], i) => {
      const bx = 10 + i * slot;
      ctx.fillStyle = C.soft;
      ctx.fillRect(bx, 22, slot - 18, 22);
      ctx.strokeStyle = C.grid;
      ctx.strokeRect(bx + 0.5, 22.5, slot - 19, 21);
      label(ctx, nm, bx + (slot - 18) / 2, 37, C.fg, { align: 'center', size: 11 });
      label(ctx, 'inode #' + ino, bx, 56, C.axis, { size: 10 });
      if (i < n - 1) {
        ctx.strokeStyle = C.axis;
        ctx.beginPath();
        ctx.moveTo(bx + slot - 16, 33);
        ctx.lineTo(bx + slot - 4, 33);
        ctx.stroke();
      }
    });

    /* 中：inode → 数据块 */
    label(ctx, '② inode 里的块指针', 8, 76, C.fg, { size: 11 });
    const iy = 86;
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(10, iy, 90, 26);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent;
    ctx.strokeRect(10.5, iy + 0.5, 89, 25);
    label(ctx, `inode #${x.inode}`, 55, iy + 17, C.fg, { align: 'center', size: 11, weight: 600 });

    const blocks = [...x.direct.map((b) => [b, '直接']), ...x.lvl1.map((b) => [b, '一级间接']), ...x.lvl1Data.map((b) => [b, '间接指向'])]
      .slice(0, 9);
    blocks.forEach(([b, kind], i) => {
      const bx = 120 + i * 52;
      ctx.strokeStyle = kind === '一级间接' ? C.named('purple') : C.accent2;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(100, iy + 13);
      ctx.lineTo(bx, iy + 13);
      ctx.stroke();
      ctx.fillStyle = kind === '一级间接' ? C.named('purple') : C.accent2;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(bx, iy, 44, 26);
      ctx.globalAlpha = 1;
      ctx.strokeRect(bx + 0.5, iy + 0.5, 43, 25);
      label(ctx, '#' + b, bx + 22, iy + 17, C.fg, { align: 'center', size: 11 });
    });

    /* 下：磁盘块布局 */
    const gy = 128;
    label(ctx, '③ 磁盘块布局（8×8，含超级块与 inode 表）', 8, gy - 4, C.fg, { size: 11 });
    const cw = Math.min(24, (W - 20) / COLS);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const b = r * COLS + c;
        const bx = 10 + c * cw;
        const by = gy + r * cw;
        let col = C.soft;
        let txt = String(b);
        if (b === 0) { col = C.named('gray'); txt = 'SB'; } else if (b <= 8) { col = C.named('teal'); txt = 'in'; } else if (b === x.inode) { col = C.accent; } else if (x.lvl1.includes(b)) { col = C.named('purple'); } else if (x.direct.includes(b) || x.lvl1Data.includes(b)) { col = C.accent2; } else if (OTHERS.includes(b)) { col = C.named('gray'); }
        ctx.fillStyle = col;
        ctx.globalAlpha = OTHERS.includes(b) || b <= 8 ? 0.3 : 0.5;
        ctx.fillRect(bx, by, cw - 3, cw - 3);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, cw - 4, cw - 4);
        label(ctx, txt, bx + (cw - 3) / 2, by + cw / 2 + 3, C.fg, { align: 'center', size: b === 0 || b <= 8 ? 9 : 10 });
      }
    }
    const legend = [['inode', C.accent], ['直接数据块', C.accent2], ['一级间接块', C.named('purple')], ['其他/空闲', C.named('gray')]];
    let lx = 10;
    const ly = gy + ROWS * cw + 16;
    legend.forEach(([t, col]) => {
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(lx, ly - 8, 10, 10);
      ctx.globalAlpha = 1;
      label(ctx, t, lx + 14, ly, C.fg, { size: 10 });
      lx += 24 + t.length * 11;
    });
  }

  bindPointer(cv.canvas, {
    pick: () => 'main',
    down(id, px, py) {
      const gy = 128;
      const cw = Math.min(24, (cv.W - 20) / COLS);
      const c = Math.floor((px - 10) / cw);
      const r = Math.floor((py - gy) / cw);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      const b = r * COLS + c;
      const x = f();
      if (b === 0) hint = '块 #0 是超级块：记文件系统类型、块大小、空闲块总数。';
      else if (b <= 8) hint = '块 #' + b + ' 属于 inode 表区，一个 inode 128 B，一块可放 32 个。';
      else if (b === x.inode) hint = `块 #${b} 是 ${x.path} 的 inode：存权限、大小、时间戳与块指针。`;
      else if (x.lvl1.includes(b)) hint = `块 #${b} 是一级间接块：里面全是块号（${x.lvl1Data.join(', ')}），它自己不存文件内容。`;
      else if (x.direct.includes(b)) hint = `块 #${b} 是 ${x.path} 的直接数据块，inode 里的指针一步到位。`;
      else if (x.lvl1Data.includes(b)) hint = `块 #${b} 由一级间接块指出，需要多读一次盘才能找到。`;
      else if (OTHERS.includes(b)) hint = `块 #${b} 已被其他文件占用，所以新文件写到这里就得断开。`;
      else hint = `块 #${b} 空闲。`;
      sync();
      draw();
    },
    move() {},
  });

  defrag.addEventListener('click', () => {
    const x = f();
    const all = [...x.direct, ...x.lvl1Data];
    let start = 9;
    for (let b = 9; b < COLS * ROWS; b += 1) {
      if (!OTHERS.includes(b) && b !== x.inode) { start = b; break; }
    }
    x.direct = all.slice(0, x.direct.length).map((_, i) => start + i);
    x.lvl1Data = all.slice(x.direct.length).map((_, i) => start + x.direct.length + i);
    hint = `已整理：数据块搬到 #${start} 起的连续区，顺序读只需 1 次寻道。`;
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
