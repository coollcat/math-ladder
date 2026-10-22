/* =========================================================================
 * rob-vla-tokens —— 一句话变成一串动作词（第 65 章 · VLA 机器人基础模型）
 * -------------------------------------------------------------------------
 * mode="pipeline"（指令 → 接地 → 动作词 → 轨迹）
 *   桌上两件东西（红杯 / 蓝盒）。点一句指令，机器先把「颜色词」接地成具体
 *   目标（这一步在真机里由视觉模型做），再按码本把「先横后纵」翻译成一串
 *   动作词，最后逐词解码累加，走出轨迹。按「下一个词」看它一个词一个词地
 *   挪——这正是自回归生成的具身含义：上一个词落下的地方，是下一个词的起点。
 *
 * mode="quant"（词元量化）
 *   动作量程 [-1, 1] 切成 N 个桶，词 w 解码成桶中心
 *     â = (w + 0.5)/N × 2 − 1。
 *   拖 N 与 w，右侧画出桶格与解码位置。分辨率天花板＝桶宽 2/N：
 *   比它更细的动作差别，模型「说」不出来。N = 256 时天花板约 0.0078。
 *
 * 契约（```lab 围栏里的 JSON，字段均可省）：
 *   { "type": "rob-vla-tokens", "mode": "pipeline" }
 * ========================================================================= */

import {
  themeColors, setupCanvas, label, clamp, mkBtn,
  buildSliders, buildToolbar, buildSegmented, buildReadout, clearBg, mergeSpec,
} from '../core.js';

/* 码本：动作词 → 单位位移（上、右、下、左） */
const CODEBOOK = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const WORD_NAME = ['上', '右', '下', '左'];

/* 桌上物件：颜色词 → 目标 */
const WORLD = {
  红: { name: '红杯', pos: [3, 1] },
  蓝: { name: '蓝盒', pos: [1, 3] },
};

const INSTRUCTIONS = [
  { label: '把红色杯子递给我', key: '红', goal: [3, 1] },
  { label: '把蓝色盒子推走', key: '蓝', goal: [1, 3] },
  { label: '把两个都拿来', key: '两', goal: [2, 2] },
];

function planTokens(start, goal) {
  const tokens = [];
  const dx = goal[0] - start[0];
  const dy = goal[1] - start[1];
  for (let i = 0; i < Math.abs(dx); i += 1) tokens.push(dx > 0 ? 1 : 3);
  for (let i = 0; i < Math.abs(dy); i += 1) tokens.push(dy > 0 ? 0 : 2);
  return tokens;
}

export default function render(host, spec) {
  const safe = spec && typeof spec === 'object' ? spec : {};
  let mode = safe.mode === 'quant' ? 'quant' : 'pipeline';

  /* pipeline 状态 */
  let insIdx = 0;
  let tokens = [];
  let eaten = 0;                 /* 已经解码了几个词 */
  let pos = [0, 0];
  let path = [[0, 0]];
  let grounded = null;

  function rebuild() {
    const ins = INSTRUCTIONS[insIdx];
    grounded = ins.key === '两' ? null : WORLD[ins.key];
    pos = [0, 0];
    path = [[0, 0]];
    eaten = 0;
    tokens = planTokens(pos, ins.goal);
  }
  rebuild();

  /* quant 状态 */
  let buckets = 256;
  let word = 100;

  const decode = (w, N) => ((w + 0.5) / N) * 2 - 1;

  /* ---------- DOM ---------- */

  const ro = buildReadout({
    模式: '—',
    接地结果: '—',
    动作词: '—',
    解码位置: '—',
    结论: '—',
  });
  host.appendChild(ro.box);

  host.appendChild(buildSegmented(
    [{ label: '指令 → 动作', value: 'pipeline' }, { label: '词元量化', value: 'quant' }],
    mode,
    (v) => {
      mode = v;
      sync();
      draw();
    },
  ));

  /* 指令选择（只在 pipeline 模式显示） */
  const insBar = document.createElement('div');
  insBar.className = 'ml-lab__seg';
  INSTRUCTIONS.forEach((ins, i) => {
    const b = mkBtn(ins.label);
    b.addEventListener('click', () => {
      insIdx = i;
      rebuild();
      syncBadges();
      sync();
      draw();
    });
    insBar.appendChild(b);
  });
  host.appendChild(insBar);

  function syncBadges() {
    Array.from(insBar.children).forEach((b, i) => {
      b.classList.toggle('is-active', i === insIdx);
    });
  }
  syncBadges();

  const base = [
    { name: 'buckets', label: '桶数 N', min: 4, max: 512, step: 4, value: buckets, fmt: 0 },
    { name: 'word', label: '动作词号 w', min: 0, max: 511, step: 1, value: word, fmt: 0 },
  ];
  const sliders = buildSliders({ sliders: mergeSpec(base, safe) }, () => {
    buckets = Math.round(sliders.state.buckets);
    word = Math.round(sliders.state.word);
    sync();
    draw();
  });

  const bNext = mkBtn('下一个词');
  const bAll = mkBtn('一次走完');
  const bReset = mkBtn('重置');
  host.appendChild(buildToolbar(bNext, bAll, bReset));

  const cv = setupCanvas(host, 420);
  const geo = { W: 0, H: 0 };

  /* ---------- 绘制 ---------- */

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    geo.W = W;
    geo.H = H;
    clearBg(ctx, W, H, C);

    /* 命令行始终显示 */
    label(ctx, '指令：' + INSTRUCTIONS[insIdx].label, 10, 18, C.fg, { size: 11.5, weight: 700 });

    if (mode === 'quant') {
      drawQuant(C, ctx, W, H);
      return;
    }

    /* ---------- pipeline ---------- */
    label(ctx, grounded
      ? '接地：颜色词「' + INSTRUCTIONS[insIdx].key + '」→ ' + grounded.name
        + ' @ ' + grounded.pos.join(',')
      : '接地：这句指令指向两个目标，玩具版取其中点', 10, 38, C.axis, { size: 10 });

    /* 桌面网格 */
    const padL = 56;
    const padB = H - 66;
    const gridW = Math.min(W - 96, 320);
    const cell = gridW / 4.6;
    const ox = padL;
    const oy = padB;
    const toX = (gx) => ox + gx * cell;
    const toY = (gy) => oy - gy * cell;

    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g += 1) {
      ctx.beginPath();
      ctx.moveTo(toX(g), toY(0));
      ctx.lineTo(toX(g), toY(4));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(g));
      ctx.lineTo(toX(4), toY(g));
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, '原点 (0,0)', toX(0) - 6, toY(0) + 14, C.grid, { size: 9, align: 'right' });

    /* 物件 */
    Object.keys(WORLD).forEach((k) => {
      const obj = WORLD[k];
      const col = k === '红' ? C.named('red') : C.named('blue');
      ctx.save();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(toX(obj.pos[0]), toY(obj.pos[1]), 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      label(ctx, obj.name, toX(obj.pos[0]) + 14, toY(obj.pos[1]) + 4, col, { size: 10 });
    });

    /* 已经走出的轨迹 */
    if (path.length > 1) {
      ctx.save();
      ctx.strokeStyle = C.named('green');
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      path.forEach(([gx, gy], i) => {
        if (i === 0) ctx.moveTo(toX(gx), toY(gy));
        else ctx.lineTo(toX(gx), toY(gy));
      });
      ctx.stroke();
      ctx.restore();
    }
    /* 尚未解码的路径（虚影） */
    if (eaten < tokens.length) {
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let cx = pos[0];
      let cy = pos[1];
      ctx.moveTo(toX(cx), toY(cy));
      for (let i = eaten; i < tokens.length; i += 1) {
        cx += CODEBOOK[tokens[i]][0];
        cy += CODEBOOK[tokens[i]][1];
        ctx.lineTo(toX(cx), toY(cy));
      }
      ctx.stroke();
      ctx.restore();
    }
    /* 机器人 */
    ctx.save();
    ctx.fillStyle = C.named('orange');
    ctx.beginPath();
    ctx.arc(toX(pos[0]), toY(pos[1]), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* 右侧：动作词序列 */
    const tx = W - 190;
    if (tx > toX(4) + 20) {
      label(ctx, '模型说出的动作词', tx, 66, C.fg, { size: 11, weight: 700 });
      tokens.forEach((w, i) => {
        const col = i < eaten ? C.named('green') : C.axis;
        const bx = tx + (i % 6) * 26;
        const by = 78 + Math.floor(i / 6) * 26;
        ctx.save();
        ctx.strokeStyle = col;
        ctx.fillStyle = i < eaten ? col : C.soft;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(bx, by, 22, 20);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        label(ctx, String(w), bx + 11, by + 14, i < eaten ? C.bg : C.axis,
          { size: 10, align: 'center', weight: 600 });
      });
      const words = tokens.map((w) => WORD_NAME[w]).join('');
      label(ctx, '读作：' + (words || '（空）'), tx, 78 + Math.ceil(tokens.length / 6) * 26 + 14,
        C.axis, { size: 10 });
      label(ctx, '已解码 ' + eaten + ' / ' + tokens.length, tx,
        78 + Math.ceil(tokens.length / 6) * 26 + 32, C.named('orange'),
        { size: 10, weight: 600 });
    }

    /* 判词 */
    let msg;
    if (eaten >= tokens.length && tokens.length > 0) {
      const goal = INSTRUCTIONS[insIdx].goal;
      const hit = pos[0] === goal[0] && pos[1] === goal[1];
      msg = hit
        ? '终点 (' + pos.join(', ') + ') 与目标重合：一串离散的「词」，经查表与累加，变成了一段连续的运动。'
        : '走完了，但终点 (' + pos.join(', ') + ') 与目标 (' + goal.join(', ') + ') 差一点——玩具版只按「先横后纵」排队，真 VLA 由模型自己决定词序。';
    } else {
      msg = '按「下一个词」走一步。注意每个词都从上一步落下的地方接着走——累加正是自回归的具身含义。';
    }
    label(ctx, msg, 10, H - 10, C.axis, { size: 10 });

    /* 显示/隐藏滑块行 */
    showRows([false, false]);
  }

  function drawQuant(C, ctx, W, H) {
    const a = decode(word, buckets);
    const width = 2 / buckets;

    label(ctx, '动作量程 [-1, 1] 切成 ' + buckets + ' 个桶，词 ' + word + ' 解码成桶中心', 10, 38,
      C.axis, { size: 10 });

    /* 桶格：只画当前词附近的一段（桶太密就画不下了） */
    const padL = 46;
    const padR = 24;
    const y = 118;
    const bw = W - padL - padR;
    const showN = Math.min(buckets, 64);
    const startW = clamp(word - showN / 2, 0, Math.max(0, buckets - showN));
    const cellW = bw / showN;
    for (let i = 0; i < showN; i += 1) {
      const wi = Math.floor(startW) + i;
      if (wi >= buckets) break;
      const isCur = wi === word;
      ctx.save();
      ctx.fillStyle = isCur ? C.named('green') : C.soft;
      ctx.globalAlpha = isCur ? 0.9 : 0.7;
      ctx.fillRect(padL + i * cellW, y, Math.max(1, cellW - 1), 34);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    label(ctx, '−1', padL, y + 50, C.axis, { size: 9.5 });
    label(ctx, '+1', W - padR, y + 50, C.axis, { size: 9.5, align: 'right' });
    if (buckets > showN) {
      label(ctx, '（只画了词 ' + Math.floor(startW) + '–'
        + (Math.floor(startW) + showN - 1) + ' 这一段的 ' + showN + ' 个桶）',
      padL, y - 12, C.grid, { size: 9.5 });
    }

    /* 解码值 */
    const sy = 220;
    label(ctx, '解码 â = (w + 0.5)/N × 2 − 1 = (' + word + ' + 0.5)/' + buckets + ' × 2 − 1 = '
      + a.toFixed(4), 10, sy, C.ok, { size: 11.5, weight: 700 });
    label(ctx, '分辨率天花板 = 桶宽 = 2/N = ' + width.toFixed(5)
      + '　——比这更细的动作差别，模型「说」不出来。', 10, sy + 22, C.fg, { size: 10.5 });
    label(ctx, '这枚词能表示的连续动作是一段宽 ' + width.toFixed(5) + ' 的区间，而不是一个点：'
      + (a - width / 2).toFixed(4) + ' ~ ' + (a + width / 2).toFixed(4) + '。',
      10, sy + 42, C.axis, { size: 10 });

    /* 对比：不同 N 下的同一个词 */
    label(ctx, '同一个词号在不同桶数下解码到不同数值（词号本身没有绝对含义）', 10, sy + 76,
      C.fg, { size: 10.5, weight: 600 });
    [16, 64, 256, 512].forEach((N, i) => {
      const w2 = Math.min(word, N - 1);
      const v = decode(w2, N);
      const yy = sy + 96 + i * 20;
      label(ctx, 'N = ' + String(N).padStart(3) + '　词 ' + w2 + ' → ' + v.toFixed(4)
        + '　天花板 ' + (2 / N).toFixed(4), 20, yy,
      N === buckets ? C.ok : C.axis, { size: 10, weight: N === buckets ? 600 : 400 });
    });

    label(ctx, '桶切多些 → 天花板更细，但输出空间更大、更难学；夹爪开合这类精细维度常单独加密切分。',
      10, H - 10, C.axis, { size: 10 });

    showRows([true, true]);
  }

  function showRows(flags) {
    Array.from(sliders.box.children).forEach((row, i) => {
      row.style.display = flags[i] ? '' : 'none';
    });
  }

  function setRow(i, v, digits) {
    const row = sliders.box.children[i];
    if (!row) return;
    const input = row.children[1];
    const val = row.children[2];
    if (input) input.value = String(v);
    if (val) val.textContent = digits === undefined ? String(v) : v.toFixed(digits);
  }

  /* ---------- 读数 ---------- */

  function sync() {
    if (mode === 'quant') {
      const a = decode(word, buckets);
      ro.set('模式', '词元量化');
      ro.set('接地结果', '—（本模式不看指令）');
      ro.set('动作词', 'w = ' + word + '（共 ' + buckets + ' 个桶）');
      ro.set('解码位置', 'â = ' + a.toFixed(4));
      ro.set('结论', '分辨率天花板 2/N = ' + (2 / buckets).toFixed(5));
      return;
    }
    const ins = INSTRUCTIONS[insIdx];
    ro.set('模式', '指令 → 动作');
    ro.set('接地结果', grounded ? grounded.name : '两件都算');
    ro.set('动作词', tokens.length
      ? tokens.join(' ') + '（读作 ' + tokens.map((w) => WORD_NAME[w]).join('') + '）'
      : '（空）');
    ro.set('解码位置', '(' + pos.join(', ') + ')　目标 (' + ins.goal.join(', ') + ')');
    ro.set('结论', eaten >= tokens.length && tokens.length
      ? (pos[0] === ins.goal[0] && pos[1] === ins.goal[1] ? '解码到位' : '差一点，看判词')
      : '已解码 ' + eaten + ' / ' + tokens.length + ' 个词');
  }

  /* ---------- 交互 ---------- */

  bNext.addEventListener('click', () => {
    if (mode !== 'pipeline' || eaten >= tokens.length) return;
    const d = CODEBOOK[tokens[eaten]];
    pos = [pos[0] + d[0], pos[1] + d[1]];
    path.push(pos);
    eaten += 1;
    sync();
    draw();
  });
  bAll.addEventListener('click', () => {
    if (mode !== 'pipeline') return;
    while (eaten < tokens.length) {
      const d = CODEBOOK[tokens[eaten]];
      pos = [pos[0] + d[0], pos[1] + d[1]];
      path.push(pos);
      eaten += 1;
    }
    sync();
    draw();
  });
  bReset.addEventListener('click', () => {
    insIdx = 0;
    buckets = 256;
    word = 100;
    rebuild();
    setRow(0, buckets, 0);
    setRow(1, word, 0);
    sliders.state.buckets = buckets;
    sliders.state.word = word;
    syncBadges();
    sync();
    draw();
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { cv.redraw = null; },
  };
}