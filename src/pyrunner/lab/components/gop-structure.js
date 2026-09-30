/* =========================================================================
 * lab 组件：gop-structure —— I / P / B 帧与 GOP：显示顺序 ≠ 解码顺序
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "gop-structure",
 *     "title": "拖 I 帧间隔与 B 帧数量，看顺序怎么被重排",
 *     "gop": 12,
 *     "bframes": 2,
 *     "frames": 24
 *   }
 *   ```
 *
 * 最小 spec（只有 type + title）也能正常渲染：GOP 长度 12、每组 2 个 B 帧、共 24 帧。
 *
 * 字段：
 *   gop      I 帧间隔（GOP 长度）4..16，默认 12
 *   bframes  相邻两个锚点（I/P）之间插几个 B 帧 0..3，默认 2
 *   frames   总帧数 12..36，默认 24
 *
 * 能拖什么：
 *   GOP 长度 / B 帧数 / 总帧数 三个滑块；
 *   **点任一个小方框** = 选中那一帧，下方文字区给出它的参考关系与代价；
 *   **在两排方框上拖动** = 逐帧扫过去看（等同拖播放头）；
 *   点「播放」= 让解码器按真实顺序往前走，顺带看「重排缓冲」怎么被 B 帧撑开。
 *
 * 看什么：
 *   上排是显示顺序（观众看到的顺序），弧线是依赖：P 帧一条（指向前一锚点），
 *   B 帧两条（前后各一条）—— 正因为 B 帧要「看未来」，它必须先等后面那一帧解码。
 *   下排是解码顺序，中间那些斜线就是重排：注意 I 帧后面紧跟着的不是第 1 帧。
 *   最下面是每帧的相对大小（I = 1.00，P = 0.35，B = 0.15，工程上的示意值）：
 *   全 I 帧要 24.00，排上 P/B 之后只要个零头 —— 代价是延迟与随机访问变差。
 *
 * 结构规则（闭合 GOP，B 帧不跨 GOP 边界）：
 *   每个 GOP 从 I 帧开始；之后每隔 (bframes+1) 帧放一个 P；两个锚点之间的是 B；
 *   GOP 末尾凑不满一组时，那一帧降级成 P（只参考前一个锚点）。
 *
 * 用的引擎函数：无（本组件是流程示意，纯结构推演，不需要数值引擎）
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, anim,
  buildReadout, label, el, fmt, clamp,
  clearBg,
} from '../core.js';

const SIZE = { I: 1.0, P: 0.35, B: 0.15 };   /* 工程示意值，用于算相对码流 */

export default function render(host, spec) {
  let gop = clamp(Math.round(spec.gop ?? 12), 4, 16);
  let nb = clamp(Math.round(spec.bframes ?? 2), 0, 3);
  let N = clamp(Math.round(spec.frames ?? 24), 12, 36);
  let sel = 0;
  let step = 0;          /* 解码进度：已解码的帧数 */

  let types = [];        /* 每帧类型 'I' | 'P' | 'B' */
  let refs = [];         /* 每帧的参考帧下标数组 */
  let decodeOrder = [];  /* 解码顺序（存显示帧号） */
  let decodePos = [];    /* 显示帧号 → 它在解码顺序里的位次 */
  let steps = [];        /* 解码逐步推进的模拟结果 */

  const cv = setupCanvas(host, 300);

  const ro = buildReadout({
    GOP: '—', 帧型统计: '—', 相对码流: '—', 重排缓冲: '—', 解码进度: '—',
  });
  host.appendChild(ro.box);

  const detail = el('pre');
  detail.style.cssText = 'margin:0;padding:0.6rem 0.85rem;font:12px/1.7 var(--pyr-mono,monospace);'
    + 'white-space:pre-wrap;background:var(--ifm-background-surface-color,rgba(127,127,127,0.08));'
    + 'border:1px dashed rgba(127,127,127,0.35);border-radius:6px';
  host.appendChild(detail);

  const box = { row1: null, row2: null, bw: 20 };

  /* ---------- 结构推演 ---------- */

  function rebuild() {
    types = new Array(N).fill('P');
    refs = new Array(N).fill(0).map(() => []);
    decodeOrder = [];
    const A = nb + 1;                       /* 锚点间隔 */
    for (let s = 0; s < N; s += gop) {
      const e = Math.min(N, s + gop);       /* 闭合 GOP：B 不跨边界 */
      const anchors = [];
      for (let i = s; i < e; i += 1) {
        const off = i - s;
        if (off === 0) { types[i] = 'I'; anchors.push(i); }
        else if (off % A === 0) { types[i] = 'P'; anchors.push(i); }
      }
      /* 两个锚点之间的都是 B；GOP 末尾凑不满一组的降级为 P */
      for (let i = s + 1; i < e; i += 1) {
        const off = i - s;
        if (off % A === 0) continue;
        const prev = i - (off % A);
        const next = prev + A;
        if (next < e) {
          types[i] = 'B';
          refs[i] = [prev, next];
        } else {
          types[i] = 'P';
          refs[i] = [prev];
          anchors.push(i);
        }
      }
      anchors.sort((a, b) => a - b);
      for (let k = 0; k < anchors.length; k += 1) {
        const a = anchors[k];
        if (types[a] === 'P') refs[a] = [anchors[k - 1]];
        if (types[a] === 'I') refs[a] = [];
      }
      /* 解码顺序：锚点 → 它和上一个锚点之间的 B */
      for (let k = 0; k < anchors.length; k += 1) {
        decodeOrder.push(anchors[k]);
        if (k === 0) continue;
        const prev = anchors[k - 1];
        for (let j = prev + 1; j < anchors[k]; j += 1) decodeOrder.push(j);
      }
    }
    /* 兜底：结构算错时不至于丢帧（防御性重排，正常路径不会进） */
    if (decodeOrder.length !== N) {
      const seen = new Uint8Array(N);
      const ord = [];
      decodeOrder.forEach((f) => { if (!seen[f]) { seen[f] = 1; ord.push(f); } });
      for (let i = 0; i < N; i += 1) if (!seen[i]) ord.push(i);
      decodeOrder = ord;
    }
    decodePos = new Array(N).fill(0);
    decodeOrder.forEach((f, k) => { decodePos[f] = k; });

    /* 模拟解码器推进：按解码顺序喂帧，喂完就把能显示的显示掉 */
    const decoded = new Uint8Array(N);
    let nextDisp = 0;
    steps = [];
    let shownTotal = 0;
    for (let k = 0; k < decodeOrder.length; k += 1) {
      decoded[decodeOrder[k]] = 1;
      const shown = [];
      while (nextDisp < N && decoded[nextDisp]) {
        shown.push(nextDisp);
        nextDisp += 1;
      }
      shownTotal += shown.length;
      steps.push({
        frame: decodeOrder[k],
        shown,
        displayed: shownTotal,
        buffer: (k + 1) - shownTotal,   /* 已解码但还没能显示的帧数 */
      });
    }

    sel = clamp(sel, 0, N - 1);
    step = clamp(step, 0, N - 1);
    updateReadout();
    syncText();
  }

  function updateReadout() {
    let nI = 0;
    let nP = 0;
    let nB = 0;
    let total = 0;
    for (let i = 0; i < N; i += 1) {
      if (types[i] === 'I') nI += 1; else if (types[i] === 'P') nP += 1; else nB += 1;
      total += SIZE[types[i]];
    }
    ro.set('GOP', `I 帧间隔 ${gop}，每组 ${nb} 个 B 帧（锚点间隔 ${nb + 1}），共 ${N} 帧`);
    ro.set('帧型统计', `I × ${nI}　P × ${nP}　B × ${nB}`);
    ro.set('相对码流', `${fmt(total, 2)}（全 I 帧要 ${N.toFixed(2)}，只用它的 ${fmt((total / N) * 100, 1)}%）`);
    const st = steps[step] || { buffer: 0, displayed: 0 };
    ro.set('重排缓冲', `${st.buffer} 帧（已解码但还不能显示 —— 这就是 B 帧换来的延迟）`);
    ro.set('解码进度', `已解码 ${step + 1} / ${N}　已显示 ${st.displayed} / ${N}`);
  }

  function syncText() {
    const t = types[sel];
    const r = refs[sel];
    const head = `第 ${sel} 帧 · ${t} 帧`;
    const desc = t === 'I'
      ? '帧内编码：不参考任何帧，自己一张图独立压缩。它既是随机访问的入口，也是错误恢复的锚点 —— 代价是最贵。'
      : t === 'P'
        ? '前向预测：只参考前面已解码的那个锚点，传的是运动矢量 + 残差。比 I 便宜得多，但误差会沿 P 链往下传。'
        : '双向预测：前后两个锚点都参考，取插值/择优，最省比特；代价是必须等后面那一帧先解码，所以显示顺序和解码顺序就此分家。';
    const refTxt = r.length ? r.map((k) => `#${k}（${types[k]}）`).join('，') : '无（自包含）';
    detail.textContent = [
      head,
      `  显示顺序：第 ${sel} 个　　解码顺序：第 ${decodePos[sel]} 个`,
      `  参考帧：${refTxt}`,
      `  相对大小：${SIZE[t].toFixed(2)}（I 帧 = 1.00）`,
      '',
      `  ${desc}`,
      t === 'B' ? `  因此它比参考它的 #${r[1]} 晚解码，却比 #${r[1]} 早显示 —— 中间那 ${r[1] - sel} 帧的错位就是重排缓冲。`
        : t === 'P' ? `  解码位次 ${decodePos[sel]}，显示位次 ${sel}：只比显示早 ${sel - decodePos[sel]} 帧，几乎不引入延迟。`
          : '  每个 GOP 的第一帧，随机访问只能落在这里。',
    ].join('\n');
  }

  /* ---------- 绘图 ---------- */

  function typeColor(C, t) {
    return t === 'I' ? C.accent : t === 'P' ? C.named('green') : C.named('purple');
  }

  function arcTo(ctx, x1, x2, yTop, lift, color, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, yTop);
    ctx.quadraticCurveTo((x1 + x2) / 2, yTop - lift, x2, yTop);
    ctx.stroke();
    /* 箭头：指向被参考的那一帧 */
    const dir = x2 > x1 ? 1 : -1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, yTop);
    ctx.lineTo(x2 - 4 * dir, yTop - 5);
    ctx.lineTo(x2 + 2 * dir, yTop - 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRow(ctx, C, y, h, order, isDecode) {
    const bw = (cv.W - 20) / N - 2;
    box.bw = bw;
    for (let k = 0; k < N; k += 1) {
      const f = order[k];
      const x = 10 + k * (bw + 2);
      const on = f === sel;
      const col = typeColor(C, types[f]);
      ctx.fillStyle = col;
      ctx.globalAlpha = on ? 1 : 0.32;
      ctx.fillRect(x, y, bw, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = on ? C.fg : C.grid;
      ctx.lineWidth = on ? 2 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, h - 1);
      label(ctx, types[f], x + bw / 2, y + h / 2 + 1, on ? C.bg : C.fg,
        { size: Math.min(13, bw * 0.62), align: 'center', baseline: 'middle', weight: 700 });
      if (bw >= 15) {
        label(ctx, String(f), x + bw / 2, y + h + 11, on ? C.fg : C.axis,
          { size: 9, align: 'center' });
      }
    }
    return { x: 10, y, w: N * (bw + 2), h: h + 14, bw };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const bw = (W - 20) / N - 2;
    const y1 = 52;
    const h = 32;
    const y2 = 160;

    label(ctx, '显示顺序（观众看到的）：弧线 = 这一帧参考谁', 10, 18, C.fg, { size: 11, weight: 600 });

    /* 依赖弧线 */
    const cxOf = (f) => 10 + f * (bw + 2) + bw / 2;
    for (let f = 0; f < N; f += 1) {
      const on = f === sel;
      refs[f].forEach((r, idx) => {
        const dist = Math.abs(r - f);
        const lift = clamp(14 + dist * 5, 16, 46) + idx * 7;
        arcTo(ctx, cxOf(f), cxOf(r), y1, lift, on ? C.accent2 : typeColor(C, types[f]),
          on ? 2 : 1, on ? 1 : 0.28);
      });
    }

    const dispOrder = [];
    for (let i = 0; i < N; i += 1) dispOrder.push(i);
    const r1 = drawRow(ctx, C, y1, h, dispOrder, false);
    box.row1 = r1;

    /* 重排连线：显示位置 → 解码位置 */
    label(ctx, '中间这些斜线就是「重排」：解码顺序被 B 帧打乱了', 10, y1 + h + 30, C.fg,
      { size: 11, weight: 600 });
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    for (let f = 0; f < N; f += 1) {
      const on = f === sel;
      ctx.globalAlpha = on ? 0.95 : 0.16;
      if (on) ctx.strokeStyle = C.accent2; else ctx.strokeStyle = C.axis;
      const xa = cxOf(f);
      const xb = 10 + decodePos[f] * (bw + 2) + bw / 2;
      ctx.beginPath();
      ctx.moveTo(xa, y1 + h + 34);
      ctx.lineTo(xb, y2 - 12);
      ctx.stroke();
    }
    ctx.restore();

    label(ctx, '解码顺序（码流里的真实先后）', 10, y2 - 24, C.fg, { size: 11, weight: 600 });
    const r2 = drawRow(ctx, C, y2, h, decodeOrder, true);
    box.row2 = r2;

    /* 解码进度指针 */
    const px = 10 + (step + 0.5) * (bw + 2);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, y2 - 6);
    ctx.lineTo(px, y2 + h + 4);
    ctx.stroke();

    /* ---- 每帧相对大小 ---- */
    const by = y2 + h + 46;
    const bh = 40;
    label(ctx, '每帧相对大小（I = 1.00，P = 0.35，B = 0.15，工程示意值）', 10, by - 8, C.fg,
      { size: 11, weight: 600 });
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, by + bh + 0.5);
    ctx.lineTo(W - 10, by + bh + 0.5);
    ctx.stroke();
    for (let f = 0; f < N; f += 1) {
      const x = 10 + f * (bw + 2);
      const v = SIZE[types[f]];
      const bh2 = v * bh;
      ctx.fillStyle = typeColor(C, types[f]);
      ctx.globalAlpha = f === sel ? 1 : 0.55;
      ctx.fillRect(x, by + bh - bh2, Math.max(1, bw), bh2);
      ctx.globalAlpha = 1;
    }

    label(ctx, '点任一方框看它的参考关系；在两排上拖动 = 逐帧扫；点「播放」看重排缓冲怎么被撑开',
      10, H - 4, C.accent, { size: 11 });
  }

  function pickFrame(which, x) {
    const bw = (cv.W - 20) / N - 2;
    const k = clamp(Math.floor((x - 10) / (bw + 2)), 0, N - 1);
    const f = which === 'row2' ? decodeOrder[k] : k;
    if (f === sel) return;
    sel = f;
    syncText();
    updateReadout();
    draw();
  }

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (box.row1 && y >= box.row1.y - 6 && y <= box.row1.y + box.row1.h) return 'row1';
      if (box.row2 && y >= box.row2.y - 6 && y <= box.row2.y + box.row2.h) return 'row2';
      return null;
    },
    down(id, x) { pickFrame(id, x); },
    move(id, x) { pickFrame(id, x); },
  });

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt * 3.2;                 /* 每秒约 3.2 帧的解码推进 */
      while (acc >= 1) {
        acc -= 1;
        step += 1;
        if (step >= N) step = 0;
      }
      updateReadout();
      draw();
    },
    onReset() {
      acc = 0;
      step = 0;
      updateReadout();
      draw();
    },
  });

  const sl = buildSliders(
    {
      sliders: [
        { name: 'gop', label: 'I 帧间隔', min: 4, max: 16, step: 1, value: gop, fmt: 0 },
        { name: 'bframes', label: '每组 B 帧数', min: 0, max: 3, step: 1, value: nb, fmt: 0 },
        { name: 'frames', label: '总帧数', min: 12, max: 36, step: 1, value: N, fmt: 0 },
      ],
    },
    (st) => {
      gop = clamp(Math.round(st.gop ?? gop), 4, 16);
      nb = clamp(Math.round(st.bframes ?? nb), 0, 3);
      N = clamp(Math.round(st.frames ?? N), 12, 36);
      step = 0;
      acc = 0;
      rebuild();
      draw();
    },
  );

  rebuild();
  draw();
  cv.redraw = draw;

  return { slidersBox: sl.box, destroy() { controls.stop(); } };
}
