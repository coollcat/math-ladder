/* =========================================================================
 * lab 组件：fft-butterfly —— FFT 蝶形分治台（逐层点亮）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "fft-butterfly",
 *     "title": "三层蝴蝶：同一对 E、O，一加一减",
 *     "n": 8, "x": [1, 3, 2, 5, 8, 7, 1, 2]
 *   }
 *   ```
 *
 * spec 字段（都有默认值，只写 type + title 也能正常渲染）：
 *   n      4 | 8（教科书版 FFT 要求 2 的幂），默认 8
 *   x      输入序列，长度必须等于 n；默认：n=4 用 [1,2,3,4]，n=8 用示例数据
 *   stage  初始停在第几层，0 = 只看位反转输入，默认 0
 *
 * 看什么：
 *   五列（N=8 时）：输入按「位反转序」排好 → 三层蝴蝶 → 输出 X[k]。
 *   每一只蝴蝶吃同一对 E、O，吐一加一减两个结果：
 *     X[k]     = E + W·O
 *     X[k+N/2] = E − W·O
 *   点任意节点或用「下一层」按钮，逐层高亮；被选中的那只蝴蝶会在画布底部
 *   用真实数字把两条算式写出来。
 *
 * 能拖什么：
 *   - 顶部开关：N = 4 / 8
 *   - 按钮：上一层 / 下一层（播放按钮会一层一层自动走；离屏自动暂停，
 *     减少动效时播放停用，单步按钮仍然可用）
 *   - 点画布上任意节点：选中包含它的那只蝴蝶
 *
 * 读什么数：当前层 / 蝴蝶 / 旋转因子 / 输出桶 / 乘法账 / 位反转序
 * 数学口径与第 61 章 65 号课的公式一致：W = e^{-2πi k/len}，
 * 位反转重排后用原地蝶形阵列，输出不除 N（与正文的「定义式硬算」同口径）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSegmented, buildToolbar, buildReadout, mkBtn,
  anim, bindPointer, label, fmt, clamp,
  clearBg,
} from '../core.js';

const DEF_X = {
  4: [1, 2, 3, 4],
  8: [1, 3, 2, 5, 8, 7, 1, 2],
};

function bitRev(i, bits) {
  let r = 0;
  for (let b = 0; b < bits; b += 1) {
    r = (r << 1) | (i & 1);
    i >>= 1;
  }
  return r;
}

function fmtC(c) {
  const re = Math.abs(c.re) < 5e-10 ? 0 : c.re;
  const im = Math.abs(c.im) < 5e-10 ? 0 : c.im;
  if (!re && !im) return '0';
  if (!im) return fmt(re, 2);
  const imAbs = Math.abs(im) === 1 ? '' : fmt(Math.abs(im), 2);
  const imPart = imAbs + 'i';
  if (!re) return (im < 0 ? '-' : '') + imPart;
  return fmt(re, 2) + (im < 0 ? ' - ' : ' + ') + imPart;
}

/* 逐层算出蝶形阵列：cols[0] 是位反转输入，cols[s] 是第 s 层结果；
   layers[s-1] 记录第 s 层每只蝴蝶的输入/输出/旋转因子，供高亮与算式展示。 */
function buildNet(x, n) {
  const bits = Math.round(Math.log2(n));
  const order = [];
  for (let i = 0; i < n; i += 1) order.push(bitRev(i, bits));
  const cols = [order.map((idx) => ({ re: x[idx], im: 0 }))];
  const layers = [];
  for (let s = 1; s <= bits; s += 1) {
    const len = 1 << s;
    const half = len >> 1;
    const prev = cols[s - 1];
    const next = prev.map((c) => ({ re: c.re, im: c.im }));
    const bfs = [];
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k += 1) {
        const ang = (-2 * Math.PI * k) / len;
        const w = { re: Math.cos(ang), im: Math.sin(ang) };
        const u = prev[i + k];
        const v = prev[i + k + half];
        const tr = w.re * v.re - w.im * v.im;
        const ti = w.re * v.im + w.im * v.re;
        next[i + k] = { re: u.re + tr, im: u.im + ti };
        next[i + k + half] = { re: u.re - tr, im: u.im - ti };
        bfs.push({
          i, k, half, len, w,
          topIdx: i + k,
          botIdx: i + k + half,
          u: { re: u.re, im: u.im },
          v: { re: v.re, im: v.im },
          top: next[i + k],
          bot: next[i + k + half],
        });
      }
    }
    cols.push(next);
    layers.push(bfs);
  }
  return { bits, order, cols, layers };
}

export default function render(host, spec) {
  let n = spec.n === 4 ? 4 : 8;
  let x = Array.isArray(spec.x) && spec.x.length === n
    ? spec.x.map((v) => Number(v) || 0)
    : DEF_X[n].slice();
  let net = buildNet(x, n);
  let stage = clamp(Math.round(Number(spec.stage) || 0), 0, net.bits);
  let sel = 0;
  let geom = null;

  const seg = buildSegmented(
    [{ label: 'N = 4', value: 4 }, { label: 'N = 8', value: 8 }],
    n,
    (v) => {
      n = v;
      x = DEF_X[n].slice();
      net = buildNet(x, n);
      stage = 0;
      sel = 0;
      draw();
    },
  );
  host.appendChild(seg);

  const ro = buildReadout({
    '当前层': '—',
    '蝴蝶': '—',
    '旋转因子': '—',
    '输出桶': '—',
    '乘法账': '—',
    '位反转序': '—',
  });
  host.appendChild(ro.box);

  const cv = setupCanvas(host, 352);

  const bPrev = mkBtn('◀ 上一层');
  const bNext = mkBtn('下一层 ▶');
  bPrev.addEventListener('click', () => {
    stage = clamp(stage - 1, 0, net.bits);
    sel = clamp(sel, 0, net.layers[Math.max(stage, 1) - 1].length - 1);
    draw();
  });
  bNext.addEventListener('click', () => {
    stage = clamp(stage + 1, 0, net.bits);
    sel = clamp(sel, 0, net.layers[Math.max(stage, 1) - 1].length - 1);
    draw();
  });
  host.appendChild(buildToolbar(bPrev, bNext));

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const L = net.bits;
    const padL = 30;
    const padR = 30;
    const top = 40;
    const bottom = H - 88;
    const plotW = W - padL - padR;
    const colX = (c) => padL + (c / L) * plotW;
    const rowY = (r) => top + (n === 1 ? 0 : (r / (n - 1)) * (bottom - top));
    const nodeR = n >= 8 ? 3.4 : 4.4;

    /* 列标题：两行写，免得窄屏上互相压字 */
    const names = [['输入', '位反转序']];
    for (let s = 1; s <= L; s += 1) names.push([`第 ${s} 层`, `W${1 << s}`]);
    names.push(['输出', 'X[k]']);
    names.forEach((pair, c) => {
      const al = c === 0 ? 'left' : (c === L ? 'right' : 'center');
      label(ctx, pair[0], colX(c), 13, C.fg, { size: 10, weight: c === 0 || c === L ? 700 : 400, align: al });
      label(ctx, pair[1], colX(c), 25, C.axis, { size: 9.5, align: al });
    });

    /* 蝶形连线：先画淡的，再画选中的 */
    const drawBf = (s, bi, hi) => {
      const bf = net.layers[s - 1][bi];
      ctx.strokeStyle = hi ? C.named('red') : C.axis;
      ctx.globalAlpha = hi ? 1 : (stage === s ? 0.5 : 0.22);
      ctx.lineWidth = hi ? 2.2 : 1;
      const x0 = colX(s - 1);
      const x1 = colX(s);
      ctx.beginPath();
      ctx.moveTo(x0, rowY(bf.i + bf.k));
      ctx.lineTo(x1, rowY(bf.topIdx));
      ctx.moveTo(x0, rowY(bf.i + bf.k + bf.half));
      ctx.lineTo(x1, rowY(bf.topIdx));
      ctx.moveTo(x0, rowY(bf.i + bf.k));
      ctx.lineTo(x1, rowY(bf.botIdx));
      ctx.moveTo(x0, rowY(bf.i + bf.k + bf.half));
      ctx.lineTo(x1, rowY(bf.botIdx));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    for (let s = 1; s <= L; s += 1) {
      const on = s === stage;
      net.layers[s - 1].forEach((bf, bi) => {
        if (!(on && bi === sel)) drawBf(s, bi, false);
      });
    }
    if (stage >= 1) drawBf(stage, sel, true);

    /* 节点 */
    const hot = new Set();
    if (stage >= 1) {
      const bf = net.layers[stage - 1][sel];
      hot.add(`${stage - 1}:${bf.i + bf.k}`);
      hot.add(`${stage - 1}:${bf.i + bf.k + bf.half}`);
      hot.add(`${stage}:${bf.topIdx}`);
      hot.add(`${stage}:${bf.botIdx}`);
    }
    for (let c = 0; c <= L; c += 1) {
      for (let r = 0; r < n; r += 1) {
        const x1 = colX(c);
        const y1 = rowY(r);
        const isHot = hot.has(`${c}:${r}`);
        ctx.fillStyle = isHot ? C.named('red') : (c === 0 || c === L ? C.accent : C.named('gray'));
        ctx.beginPath();
        ctx.arc(x1, y1, nodeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* 数值标注：输入列、输出列，以及选中蝴蝶的四个节点 */
    const tag = (c, r) => {
      const v = net.cols[c][r];
      const x1 = colX(c);
      const y1 = rowY(r);
      const isHot = hot.has(`${c}:${r}`);
      label(ctx, fmtC(v), x1 + (c === L ? -7 : 7), y1 + 3.5, isHot ? C.named('red') : C.fg, {
        size: 9.5,
        align: c === L ? 'right' : 'left',
      });
    };
    for (let r = 0; r < n; r += 1) { tag(0, r); tag(L, r); }
    if (stage >= 1) {
      const bf = net.layers[stage - 1][sel];
      tag(stage - 1, bf.i + bf.k);
      tag(stage - 1, bf.i + bf.k + bf.half);
      tag(stage, bf.topIdx);
      tag(stage, bf.botIdx);
    }

    /* 画布底部：选中蝴蝶的真实算式 */
    const bx = 8;
    if (stage === 0) {
      label(ctx, '还没有开始合并：上面的输入已经按位反转排好队。', bx, H - 64, C.fg, { size: 10.5 });
      label(ctx, '点一个节点，或按「下一层 ▶」看第一对 E、O 怎么加减。', bx, H - 48, C.fg, { size: 10.5 });
      label(ctx, '位反转序：' + net.order.map((i) => 'x' + i).join(' '), bx, H - 32, C.axis, { size: 10 });
    } else {
      const bf = net.layers[stage - 1][sel];
      label(ctx, `第 ${stage} 层 · 第 ${sel + 1}/${nf()} 只蝴蝶 · W = ${fmtC(bf.w)}`, bx, H - 70, C.fg, {
        size: 10,
        weight: 700,
      });
      label(ctx, `上翼 X[${bf.topIdx}] = E + W·O = ${fmtC(bf.top)}`, bx, H - 54, C.named('red'), { size: 10 });
      label(ctx, `下翼 X[${bf.botIdx}] = E − W·O = ${fmtC(bf.bot)}`, bx, H - 38, C.accent, { size: 10 });
      label(ctx, `E = ${fmtC(bf.u)}，O = ${fmtC(bf.v)}：两只翼共享同一对子结果，只是一加一减。`,
        bx, H - 22, C.axis, { size: 9.5 });
    }

    geom = { colX, rowY, L, nodeR };

    ro.set('当前层', stage === 0 ? '输入（位反转序）' : `${stage} / ${L}`);
    if (stage === 0) {
      ro.set('蝴蝶', '—');
      ro.set('旋转因子', '—');
      ro.set('输出桶', '—');
    } else {
      const bf = net.layers[stage - 1][sel];
      ro.set('蝴蝶', `第 ${sel + 1} / ${nf()} 只（跨第 ${bf.i + bf.k} 与第 ${bf.i + bf.k + bf.half} 行）`);
      ro.set('旋转因子', `W${1 << stage}^${bf.k} = ${fmtC(bf.w)}`);
      ro.set('输出桶', `X[${bf.topIdx}]、X[${bf.botIdx}]`);
    }
    ro.set('乘法账', `累计 ${stage * (n / 2)} 次复数乘法｜直接法 DFT 要 ${n * n} 次`);
    ro.set('位反转序', 'x' + net.order.join(' x'));
  }

  function nf() {
    return n / 2;
  }

  /* 点节点 → 选中包含它的蝴蝶 */
  bindPointer(cv.canvas, {
    pick(x1, y1) {
      if (!geom) return null;
      let best = null;
      let bestD = 18;
      for (let c = 0; c <= geom.L; c += 1) {
        for (let r = 0; r < n; r += 1) {
          const d = Math.hypot(x1 - geom.colX(c), y1 - geom.rowY(r));
          if (d < bestD) {
            bestD = d;
            best = { c, r };
          }
        }
      }
      return best;
    },
    down(node) {
      if (!node) return;
      if (node.c === 0) {
        stage = 1;
        sel = Math.min(Math.floor(node.r / 2), nf() - 1);
      } else {
        stage = node.c;
        sel = 0;
        const bfs = net.layers[stage - 1];
        for (let bi = 0; bi < bfs.length; bi += 1) {
          const bf = bfs[bi];
          if (node.r === bf.topIdx || node.r === bf.botIdx
            || node.r === bf.i + bf.k || node.r === bf.i + bf.k + bf.half) {
            sel = bi;
            break;
          }
        }
      }
      draw();
    },
  });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc < 1.1) return;
      acc = 0;
      if (stage < net.bits) {
        stage += 1;
        sel = clamp(sel, 0, nf() - 1);
        draw();
      } else {
        controls.toggle(false);
      }
    },
    onReset() {
      stage = 0;
      sel = 0;
      draw();
    },
  });

  draw();
  cv.redraw = draw;
  return {
    slidersBox: null,
    destroy() { controls.stop(); },
  };
}
