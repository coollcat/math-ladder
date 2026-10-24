/* =========================================================================
 * lab 组件：schnorr-commit —— 承诺在前、挑战在后：顺序才是保密性的全部来源
 * -------------------------------------------------------------------------
 * 演示什么：Schnorr 协议里证明者先交承诺 t = g^r，验证者才抛挑战 c，最后应答 s = r + c·x。
 * 诚实者的 s 是**看着 c 现算**的，所以哪个 c 都能过；作弊者的 (t, s) 是**提前定死**的，
 * 只能骗过满足 t = g^s·y^{-c} 的那几个挑战。同一组 22 个挑战格，两种人的处境一目了然。
 *
 * 用法（第 34 章 · 零知识证明 的 lab 围栏）：
 *
 *   { "type": "schnorr-commit", "title": "先承诺再挑战：22 个挑战，作弊者只能骗过 2 个" }
 *
 * 字段：
 *   mode    "honest"（默认）/ "cheat"
 *   r       诚实模式的随机掩码（1..21，默认 4）
 *   s       作弊模式提前挑定的应答（1..21，默认 7）
 *   c       当前挑战（1..22，默认 3）
 *   k       重复轮数（1..8，默认 3），读作弊者连做 k 轮的存活率
 *
 * 完美教具五问：
 *   1 动手量：滑块 c 是验证者抛的挑战，r / s 是两种模式下证明者手里的那个随机量；
 *     分段按钮换人（诚实者 / 作弊者）。
 *   2 即时后果：改 c 的那一下，左侧三格的数字、验证式两边、右侧 22 个挑战格全部重算。
 *   3 读数：t、c、s、g^s、t·y^c、22 个挑战里过几个、连做 k 轮的存活率——每个数都能在
 *     课文的 python 输出里对上（r=4、c=3 时 t=4、s=0、两边都是 1）。
 *   4 啊哈预设：切到作弊者，绿格从 22 个塌成 2 个；把 k 拉到 8，存活率掉到 10^-8 量级。
 *     「先给承诺就等于把后路封死」这件事，比任何一段文字都硬。
 *   5 默认状态：诚实者、r = 4、c = 3、s = 22、t = 4，验证两边都是 1，22 格全绿；
 *     数字与课文 python 的 print 完全一致（s 不取模，与 python 写法相同）。
 *
 * s 不取模是刻意的：课文 python 里就写 s = r + c * x，print 出 22。取模不影响
 * g^s = t·y^c 是否成立（指数按 mod 22 循环），但读者逐位对照时会当场对不上。
 *
 * 参数注解（写课文时别写错）：p = 23、g = 5、x = 6、y = g^x mod p = 8。y 的阶是 11 不是 22
 * （y^11 = 1），所以 c 与 c + 11 给出同一个 y^c，作弊者能骗过的永远是**一对**挑战，2 / 22。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildReadout, buildSegmented,
  label, clamp, mergeSpec, clearBg,
} from '../core.js';

/* 教学参数与课文 python 完全相同 */
const P = 23;
const G = 5;
const X = 6;
const Y = powMod(G, X, P);      /* 8 */
const L = P - 1;                /* 22 */

function powMod(b, e, m) {
  let r = 1;
  let b2 = b % m;
  let e2 = e;
  while (e2 > 0) {
    if (e2 & 1) r = (r * b2) % m;
    b2 = (b2 * b2) % m;
    e2 >>= 1;
  }
  return r;
}
/* 小素数求逆：a^{p-2} mod p（费马小定理），只用于显示，别拿去当密码库 */
function invMod(a) {
  let r = 1;
  let b = a % P;
  let e = P - 2;
  while (e > 0) {
    if (e & 1) r = (r * b) % P;
    b = (b * b) % P;
    e >>= 1;
  }
  return r;
}

const BASE = [
  { name: 'r', label: '掩码 r（诚实者）', min: 1, max: 21, step: 1, value: 4 },
  { name: 's', label: '应答 s（作弊者挑定）', min: 1, max: 21, step: 1, value: 7 },
  { name: 'c', label: '挑战 c', min: 1, max: 22, step: 1, value: 3 },
  { name: 'k', label: '重复轮数 k', min: 1, max: 8, step: 1, value: 3 },
];

export default function render(host, spec) {
  const st = mergeSpec(BASE, {
    r: typeof spec.r === 'number' ? clamp(Math.round(spec.r), 1, 21) : 4,
    s: typeof spec.s === 'number' ? clamp(Math.round(spec.s), 1, 21) : 7,
    c: typeof spec.c === 'number' ? clamp(Math.round(spec.c), 1, 22) : 3,
    k: typeof spec.k === 'number' ? clamp(Math.round(spec.k), 1, 8) : 3,
  });
  let mode = spec.mode === 'cheat' ? 1 : 0;

  const sliders = buildSliders({ sliders: st }, (v) => {
    st[0].value = Math.round(v.r);
    st[1].value = Math.round(v.s);
    st[2].value = Math.round(v.c);
    st[3].value = Math.round(v.k);
    draw();
  });
  const ro = buildReadout({
    承诺t: '—', 应答s: '—', 验证左边: '—', 验证右边: '—', 过几个挑战: '—', 存活率: '—',
  });
  const cv = setupCanvas(host, 330);
  host.appendChild(ro.box);

  /* 当前模式在这一轮里的 (t, s)：诚实者的 s 依赖 c，作弊者的 t 依赖他挑定的 c0 */
  function round() {
    const c = Math.round(st[2].value);
    if (mode === 0) {
      const r = Math.round(st[0].value);
      return { c, r, s: r + c * X, t: powMod(G, r, P), honest: true };
    }
    const s = Math.round(st[1].value);
    return { c, r: null, s, t: (powMod(G, s, P) * invMod(powMod(Y, c, P))) % P, honest: false };
  }

  /* 22 个挑战逐个走一遍协议：诚实者每个 c 现算 s，作弊者的 (t, s) 定死不变 */
  function passSet(rd) {
    const out = [];
    for (let cc = 1; cc <= L; cc += 1) {
      const s = rd.honest ? Math.round(st[0].value) + cc * X : rd.s;
      const t = rd.honest ? powMod(G, Math.round(st[0].value), P) : rd.t;
      out.push(powMod(G, s, P) === (t * powMod(Y, cc, P)) % P);
    }
    return out;
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);
    if (!W || !H) return;

    const rd = round();
    const left = powMod(G, rd.s, P);
    const right = (rd.t * powMod(Y, rd.c, P)) % P;
    const ok = left === right;
    const pass = passSet(rd);
    const nPass = pass.filter(Boolean).length;

    /* ---------- 左：协议三步 ---------- */
    const colX = 12;
    const colW = Math.min(200, Math.max(120, W * 0.44));
    label(ctx, rd.honest ? '诚实者（知道 x = 6）' : '作弊者（不知道 x）', colX, 15, C.fg, { size: 12, weight: 600 });
    const rows = [
      ['① 先给承诺 t = g^r mod 23', 't = ' + rd.t + (rd.honest ? '（r = ' + rd.r + '）' : '（由 s 反推）')],
      ['② 验证者抛挑战 c', 'c = ' + rd.c],
      ['③ 再算应答 s = r + c·x', 's = ' + rd.s],
    ];
    rows.forEach((row, i) => {
      const y = 26 + i * 50;
      ctx.save();
      ctx.fillStyle = C.soft;
      ctx.fillRect(colX, y, colW, 42);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(colX, y, colW, 42);
      ctx.restore();
      label(ctx, row[0], colX + 8, y + 16, C.axis, { size: 10.5 });
      label(ctx, row[1], colX + 8, y + 34, C.fg, { size: 11.5, weight: 600 });
    });

    const vy = 26 + 3 * 50 + 2;
    label(ctx, '验证者检查 g^s = t·y^c mod 23', colX, vy + 12, C.axis, { size: 10.5 });
    label(ctx, left + '  =  ' + right + (ok ? '  ✓' : '  ✗'), colX, vy + 31, ok ? C.ok : C.bad,
      { size: 12, weight: 600 });

    /* ---------- 右：22 个挑战谁能过 ---------- */
    const gx = colX + colW + 26;
    const gw = Math.max(84, W - gx - 10);
    label(ctx, '这一对 (t, s) 骗得过哪些 c？', gx, 15, C.fg, { size: 11.5, weight: 600 });
    const cols = 11;
    const cw = gw / cols;
    const ch = Math.min(26, Math.max(14, (H - 150) / 2));
    for (let i = 0; i < L; i += 1) {
      const bx = gx + (i % cols) * cw;
      const by = 26 + Math.floor(i / cols) * (ch + 12);
      const on = pass[i];
      ctx.save();
      ctx.globalAlpha = on ? 0.9 : 0.2;
      ctx.fillStyle = on ? C.ok : C.bad;
      ctx.fillRect(bx + 1, by, Math.max(5, cw - 4), ch);
      ctx.restore();
      label(ctx, String(i + 1), bx + cw / 2, by + ch / 2 + 4, on ? C.bg : C.fg,
        { size: 9.5, align: 'center', weight: 600 });
    }
    const ty = 30 + 2 * (ch + 12);
    label(ctx, '过 ' + nPass + ' / ' + L + ' 个挑战', gx, ty, nPass === L ? C.ok : C.bad, { size: 11.5, weight: 600 });
    label(ctx, rd.honest ? 'c 变一次，s 就跟着变一次' : 'c 有 22 种，他提前只备了一种',
      gx, ty + 18, C.axis, { size: 10.5 });

    const k = Math.round(st[3].value);
    const survive = nPass / L;
    const pk = Math.pow(survive, k);
    label(ctx, '连做 k = ' + k + ' 轮全骗过：', gx, ty + 40, C.axis, { size: 10.5 });
    label(ctx, pk >= 0.01 ? (pk * 100).toFixed(2) + '%' : pk.toExponential(2),
      gx, ty + 60, nPass === L ? C.ok : C.bad, { size: 13, weight: 700 });

    ro.set('承诺t', String(rd.t));
    ro.set('应答s', String(rd.s));
    ro.set('验证左边', 'g^s = ' + left);
    ro.set('验证右边', 't·y^c = ' + right + (ok ? '' : '（对不上）'));
    ro.set('过几个挑战', nPass + ' / ' + L);
    ro.set('存活率', (pk >= 0.01 ? (pk * 100).toFixed(2) + '%' : pk.toExponential(2)) + '（k = ' + k + ' 轮）');
  }

  const seg = buildSegmented(
    [{ value: 0, label: '诚实者' }, { value: 1, label: '作弊者' }],
    mode,
    (v) => { mode = v; draw(); },
  );
  host.insertBefore(seg, ro.box);

  draw();
  cv.redraw = () => draw();
  return { slidersBox: sliders.box, destroy() { cv.redraw = null; } };
}
