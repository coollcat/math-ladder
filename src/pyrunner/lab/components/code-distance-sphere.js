/* =========================================================================
 * lab 组件：code-distance-sphere —— 最小距离、纠错半径与球填充界
 * -------------------------------------------------------------------------
 * 用法（第 35 章《纠错能力与最小距离》动手实验）：
 *   { "type": "code-distance-sphere", "title": "…" }
 * 字段（都可省）：code 码本（字符串数组，默认课文那个 [5,2] 码）；
 *   t 初始半径（默认由 d_min 推出）；height 画布高度（默认 520）。
 *
 * 每对码字算一次距离，短板就是 d_min；以每个码字为圆心画半径 t 的球：
 *   · 球两两不重叠 ⇔ 2t < d_min —— 这时「最近邻一定唯一」，纠错有保证；
 *   · 把 t 拖大一格，球开始接触、随后重叠，重叠处就是没人能安全判决的地带。
 * 下方实时对拍球填充界 |C|·ΣC(n,i) ≤ 2^n：等号成立即「完美码」（Hamming(7,4) 就是）。
 * 「换码本」可在课文那个 [5,2] 码、Hamming(7,4)、偶校验码之间切换，看界如何松紧。
 *
 * 取舍：圆的半径只画相对量（t / d_min），不假装是真实几何投影；
 *   真正的账全部在数字里算，图形只负责把「碰上了没有」变得可见。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, clearBg, clamp, polyline,
} from '../core.js';

const BOOKS = [
  { id: 'm52', name: '[5,2] 线性码（课文）', words: ['00000', '11100', '00111', '11011'] },
  { id: 'h74', name: 'Hamming(7,4)', words: null },
  { id: 'even', name: '3 位偶校验码', words: ['000', '011', '101', '110'] },
  { id: 'rep3', name: '3 重复码', words: ['000', '111'] },
];

function ham(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) d += 1;
  return d;
}

/* 用生成矩阵枚举 Hamming(7,4) 的全部 16 个码字 */
function hamming74Words() {
  const G = [
    [1, 0, 0, 0, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 1],
    [0, 0, 1, 0, 0, 1, 1],
    [0, 0, 0, 1, 1, 1, 1],
  ];
  const out = [];
  for (let m = 0; m < 16; m += 1) {
    const w = new Array(7).fill(0);
    for (let i = 0; i < 4; i += 1) {
      if ((m >> i) & 1) for (let j = 0; j < 7; j += 1) w[j] ^= G[i][j];
    }
    /* 按位置 1..7 重排成 p1 p2 d1 p4 d2 d3 d4 */
    out.push([w[4], w[5], w[0], w[6], w[1], w[2], w[3]].join(''));
  }
  return out;
}

function binom(n, kk) {
  let r = 1;
  for (let i = 1; i <= kk; i += 1) r = (r * (n - kk + i)) / i;
  return Math.round(r);
}

export default function render(host, spec) {
  let book = BOOKS[0];
  if (Array.isArray(spec.code) && spec.code.length) book = { id: 'custom', name: '自定义码本', words: spec.code.map(String) };
  let words = (book.words || hamming74Words()).slice();
  /* n 必须跟着码本一起走：写死成 const 后，切到 Hamming(7,4) 还算「n = 5」，
     于是球体积 binom(5,t) 与陪集数 2^(5-k) 全错，课文承诺的完美码对不上。 */
  let n = words[0] ? words[0].length : 5;

  let dmin = 99;
  for (let i = 0; i < words.length; i += 1) {
    for (let j = i + 1; j < words.length; j += 1) dmin = Math.min(dmin, ham(words[i], words[j]));
  }
  if (dmin === 99) dmin = 0;
  let t = clamp(Math.round(spec.t === undefined ? Math.floor((dmin - 1) / 2) : spec.t), 0, Math.max(0, dmin));

  const cv = setupCanvas(host, spec.height || 520);
  const ro = buildReadout({
    码字数: '—',
    'd_min': '—',
    '纠错半径 t': '—',
    '球体积 ΣC(n,i)': '—',
    球填充界: '—',
  });
  host.appendChild(ro.box);

  const bUp = mkBtn('半径 +1');
  const bDown = mkBtn('半径 −1');
  const bMax = mkBtn('取最大安全 t');
  host.appendChild(buildToolbar(bUp, bDown, bMax));

  const geo = { cx: 0, cy: 0, r: 0, W: 0, H: 0, wide: false };

  function layout(W, H) {
    const wide = W >= 620;
    geo.wide = wide;
    geo.W = W;
    geo.H = H;
    geo.cx = wide ? Math.min(W * 0.34, 250) : W / 2;
    geo.cy = wide ? H * 0.44 : 156;
    geo.r = wide ? Math.min(W * 0.16, H * 0.2) : Math.min(W * 0.2, 92);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    layout(W, H);

    /* 码字按圆环摆开（码字多时用两圈，避免挤成一坨） */
    const cnt = words.length;
    const pts = words.map((w, i) => {
      const ring = cnt > 8 ? (i < Math.ceil(cnt / 2) ? 0 : 1) : 0;
      const perRing = ring === 0 ? Math.ceil(cnt / 2) : cnt - Math.ceil(cnt / 2);
      const idx = ring === 0 ? i : i - Math.ceil(cnt / 2);
      const ang = (idx / Math.max(1, perRing)) * Math.PI * 2 - Math.PI / 2 + (ring ? 0.14 : 0);
      const rad = geo.r * (1 + ring * 0.45);
      return { x: geo.cx + Math.cos(ang) * rad, y: geo.cy + Math.sin(ang) * rad, w, i };
    });

    label(ctx, '每个圆是一个 Hamming 球：半径 t，球里所有串都会被译给球心', 16, 26, C.fg, { size: 12.5, weight: 700 });
    label(ctx, '两个球不重叠 ⇔ 2t < d_min ⇔ 最近邻唯一', 16, 46, C.axis, { size: 10.5 });

    /* 球：半径按 t / max(1,t) 的比例画成大圈，圈内点出「成员数」 */
    let overlap = false;
    pts.forEach((p) => {
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = t === 0 ? 0.5 : 0.13;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(10, t * 26), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    });

    /* 球两两相交检测：2·t ≥ d(c_i,c_j) 就重叠 */
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        if (2 * t >= ham(pts[i].w, pts[j].w)) {
          overlap = true;
          polyline(ctx, [[pts[i].x, pts[i].y], [pts[j].x, pts[j].y]], C.bad, 1.6, [4, 4]);
          const mx = (pts[i].x + pts[j].x) / 2;
          const my = (pts[i].y + pts[j].y) / 2;
          label(ctx, 'd=' + ham(pts[i].w, pts[j].w), mx, my - 4, C.bad, { size: 9.5, align: 'center' });
        }
      }
    }

    pts.forEach((p) => {
      ctx.save();
      ctx.fillStyle = C.named('blue');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, p.w, p.x, p.y - 12, C.fg, { size: 10, align: 'center', weight: 700 });
    });

    /* ---- 数字账 ---- */
    let vol = 0;
    for (let i = 0; i <= Math.min(t, n); i += 1) vol += binom(n, i);
    const covered = words.length * vol;
    const total = 2 ** n;
    const tsafe = Math.floor((dmin - 1) / 2);

    const px = geo.wide ? Math.min(W * 0.62, geo.cx + geo.r * 2.4) : 16;
    let py = geo.wide ? 78 : geo.cy + geo.r * 1.9 + 40;
    const pw = geo.wide ? W - px - 16 : W - 32;

    label(ctx, '码字数 |C| = ' + words.length, px, py, C.fg, { size: 12 });
    py += 19;
    label(ctx, '最小距离 d_min = ' + dmin + '（短板在最近那一对）', px, py, C.fg, { size: 12 });
    py += 19;
    label(ctx, '纠错半径 t = ⌊(d_min−1)/2⌋ = ' + tsafe, px, py, C.named('green'), { size: 12, weight: 700 });
    py += 19;
    label(ctx, '可检测 ≤ d_min−1 = ' + Math.max(0, dmin - 1) + ' 个错', px, py, C.axis, { size: 11 });
    py += 26;
    label(ctx, '当前 t = ' + t + (t > tsafe ? '　超出安全线！球已重叠' : '　仍在安全线内'),
      px, py, t > tsafe ? C.bad : C.ok, { size: 12, weight: 700 });
    py += 24;
    label(ctx, '球体积 Σ_{i=0}^{t} C(' + n + ',i) = ' + vol, px, py, C.fg, { size: 11.5 });
    py += 18;
    label(ctx, '|C| × 体积 = ' + words.length + ' × ' + vol + ' = ' + covered, px, py, C.fg, { size: 11.5 });
    py += 18;
    label(ctx, '总空间 2^' + n + ' = ' + total, px, py, C.fg, { size: 11.5 });
    py += 22;
    const ok = covered <= total;
    label(ctx, ok
      ? (covered === total ? '球填充界取等号：完美码，一个串都不浪费' : '球填充界成立（还有 ' + (total - covered) + ' 个串没被覆盖）')
      : '球填充界被突破：这么多球装不进空间', px, py, ok ? C.ok : C.bad, { size: 11.5, weight: 700 });
    py += 18;
    if (t > tsafe) label(ctx, '注意：界可能仍成立，但「保证纠错」已经失效', px, py, C.axis, { size: 10 });
    void pw;

    ro.set('码字数', String(words.length));
    ro.set('d_min', String(dmin));
    ro.set('纠错半径 t', tsafe + '（当前 ' + t + '）');
    ro.set('球体积 ΣC(n,i)', String(vol));
    ro.set('球填充界', covered + ' ≤ ' + total + (ok ? ' ✓' : ' ✗'));
  }

  const step = (delta) => {
    t = clamp(t + delta, 0, Math.max(0, Math.min(n, dmin)));
    draw();
  };
  bUp.addEventListener('click', () => step(1));
  bDown.addEventListener('click', () => step(-1));
  bMax.addEventListener('click', () => { t = Math.floor((dmin - 1) / 2); draw(); });

  /* 换码本：重算 d_min 与安全半径，t 落回新码本的安全值 */
  host.appendChild(buildSegmented(
    BOOKS.map((b) => ({ label: b.name, value: b.id })),
    book.id,
    (v) => {
      const nb = BOOKS.find((b) => b.id === v) || BOOKS[0];
      book = nb;
      words = (nb.words || hamming74Words()).slice();
      dmin = 99;
      for (let i = 0; i < words.length; i += 1) {
        for (let j = i + 1; j < words.length; j += 1) dmin = Math.min(dmin, ham(words[i], words[j]));
      }
      if (dmin === 99) dmin = 0;
      n = words[0] ? words[0].length : n;      /* 换码本必须同步量词长 */
      t = Math.floor((dmin - 1) / 2);
      draw();
    },
  ));

  draw();
  cv.redraw = draw;
  return { destroy() {} };
}
