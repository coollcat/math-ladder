/* =========================================================================
 * lab 组件：frame-window（分帧与短时分析：为什么语音要切成一小段一小段看）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "frame-window",
 *     "title": "拖动窗框：看一帧有多短，看加窗怎么压住泄漏"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   kind      'chirp' 扫频（默认，演示"整段不平稳、一帧内近似平稳"）
 *             / 'beats' 双音 300+340 Hz（演示"帧太短就分不开"）
 *   frameLen  帧长（样点），默认 256（@8 kHz = 32 ms）
 *   hop       帧移（样点），默认 128
 *   start     起始样点，默认取信号中段
 *   win       窗：'hann'（默认）/ 'rect' / 'hamming' / 'blackman'
 *   fs        采样率，默认 8000
 *
 * 三行图在说什么：
 *   上：整段波形 + 可拖的窗框。灰虚线是其余帧的起点——帧移越小帧越密
 *   中：这一帧被窗"掐"出来后的样子（虚线是窗本身的形状）
 *   下：这一帧的频谱。灰虚线是不加窗（矩形窗），实线是加了窗
 *       ——矩形窗主瓣窄但旁瓣高（泄漏严重），汉宁窗旁瓣低但主瓣变宽
 *
 * 能玩什么：
 *   · 拖窗框本体平移；拖窗框左右两端的把手改帧长
 *   · 切到「双音 300+340 Hz」再把帧长拖到 128 样点：两条谱线糊成一根
 *     （频率分辨率 = fs/帧长 = 62.5 Hz > 40 Hz 的间距，分不开）
 *   · 切窗函数看旁瓣电平那一行读数从 -13 dB（矩形）掉到 -31 dB（汉宁）
 *
 * 出声：否（纯分析）。麦克风：否。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, label, polyline, clamp, fmt, engine,
} from '../core.js';

const FS = 8000;
const DUR = 0.6;
const NFFT = 2048;         // 统一补零到 2048 点：只让曲线变光滑，不提高真分辨率
const DB_LO = -80;
const DB_HI = 0;
const PADL = 40;
const PADR = 12;

function makeSignal(kind) {
  const N = Math.round(FS * DUR);
  const x = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    const t = i / FS;
    if (kind === 'beats') {
      x[i] = 0.5 * Math.sin(2 * Math.PI * 300 * t) + 0.5 * Math.sin(2 * Math.PI * 340 * t);
    } else {
      /* 线性扫频 200 → 3000 Hz：相位要用积分，不能拿瞬时频率直接代进去 */
      const T = N / FS;
      const ph = 2 * Math.PI * (200 * t + ((3000 - 200) * t * t) / (2 * T));
      x[i] = 0.9 * Math.sin(ph);
    }
  }
  return x;
}

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    kind: spec.kind ?? 'chirp',
    frameLen: spec.frameLen ?? 256,
    hop: spec.hop ?? 128,
    win: spec.win ?? 'hann',
  };
  let sig = makeSignal(s.kind);
  let N = sig.length;
  let start = clamp(spec.start ?? Math.round(N * 0.42), 0, N - s.frameLen);

  let dsp = null;
  let dbWin = null;
  let dbRect = null;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({
    帧长: '—', 帧移: '—', 帧数: '—', 峰值: '—', 分辨率: '—', 旁瓣: '—', 双音: '—',
  });
  host.appendChild(ro.box);

  const plotW = () => Math.max(40, cv.W - PADL - PADR);
  const xOf = (i) => PADL + (i / (N - 1)) * plotW();
  const iOf = (X) => Math.round(((X - PADL) / plotW()) * (N - 1));

  const R1 = { y: 26, h: 70 };
  const R2 = { y: 128, h: 84 };
  const R3 = { y: 244, h: 128 };
  const dbY = (db, y, h) => y + h - ((clamp(db, DB_LO, DB_HI) - DB_LO) / (DB_HI - DB_LO)) * h;

  const segWin = buildSegmented(
    [
      { label: '扫频（不平稳）', value: 'chirp' },
      { label: '双音 300+340 Hz', value: 'beats' },
    ],
    s.kind,
    (v) => {
      s.kind = v;
      sig = makeSignal(v);
      N = sig.length;
      start = clamp(Math.round(N * 0.42), 0, N - s.frameLen);
      recompute();
      draw();
    },
  );
  host.appendChild(segWin);

  const segWave = buildSegmented(
    [
      { label: '矩形（不加窗）', value: 'rect' },
      { label: '汉宁', value: 'hann' },
      { label: '汉明', value: 'hamming' },
      { label: '布莱克曼', value: 'blackman' },
    ],
    s.win,
    (v) => { s.win = v; recompute(); draw(); },
  );
  host.appendChild(segWave);

  /* ---------- 计算 ---------- */

  function spectrum(winName) {
    const w = dsp.window(winName, s.frameLen);
    const seg = new Float64Array(s.frameLen);
    for (let i = 0; i < s.frameLen; i += 1) seg[i] = sig[start + i] * w[i];
    const { mag } = dsp.rfft(dsp.padPow2(seg, NFFT));
    const db = new Float64Array(mag.length);
    let mx = -Infinity;
    for (let k = 0; k < mag.length; k += 1) {
      db[k] = dsp.ampToDb(mag[k]);
      if (db[k] > mx) mx = db[k];
    }
    /* 归一化到峰值 0 dB：这样两条曲线的差别纯粹是"形状"（泄漏），不是增益 */
    for (let k = 0; k < db.length; k += 1) db[k] -= mx;
    return db;
  }

  function recompute() {
    if (!dsp) return;
    dbWin = spectrum(s.win);
    dbRect = spectrum('rect');
  }

  /* 主瓣宽度与旁瓣电平：沿峰值两侧走到第一个极小，主瓣之外的最高点就是旁瓣 */
  function lobeInfo(db) {
    let pk = 2;
    for (let k = 3; k < db.length; k += 1) if (db[k] > db[pk]) pk = k;
    let l = pk;
    while (l > 2 && db[l - 1] <= db[l]) l -= 1;
    let r = pk;
    while (r < db.length - 1 && db[r + 1] <= db[r]) r += 1;
    let mx = -Infinity;
    for (let k = 2; k < db.length; k += 1) {
      if (k >= l && k <= r) continue;
      if (db[k] > mx) mx = db[k];
    }
    const binHz = FS / NFFT;
    return { peakHz: pk * binHz, mainLobeHz: (r - l) * binHz, sidelobeDb: mx - db[pk] };
  }

  /* 双音能不能分开：看两个峰之间的谷比峰低多少 */
  function twoToneDip(db) {
    const bin = (f) => Math.round((f * NFFT) / FS);
    const near = (f) => {
      let b = bin(f);
      for (let k = Math.max(2, b - 12); k <= Math.min(db.length - 2, b + 12); k += 1) {
        if (db[k] > db[b]) b = k;
      }
      return db[b];
    };
    const pa = near(300);
    const pb = near(340);
    let dip = Infinity;
    for (let k = bin(300) + 2; k <= bin(340) - 2; k += 1) dip = Math.min(dip, db[k]);
    return Math.min(pa, pb) - dip;
  }

  /* ---------- 画图 ---------- */

  function drawWaveRow(y, h, data, winShape, color) {
    const ctx = cv.ctx;
    const w = plotW();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADL, y + h / 2);
    ctx.lineTo(PADL + w, y + h / 2);
    ctx.stroke();

    const n = data.length;
    const step = Math.max(1, Math.floor(n / w));
    const pts = [];
    for (let i = 0; i < n; i += step) {
      pts.push([PADL + (i / (n - 1)) * w, y + h / 2 - data[i] * (h / 2) * 0.9]);
    }
    polyline(ctx, pts, color, 1.4);

    if (winShape) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      const up = [];
      const dn = [];
      for (let i = 0; i < n; i += step) {
        const px = PADL + (i / (n - 1)) * w;
        up.push([px, y + h / 2 - winShape[i] * (h / 2) * 0.9]);
        dn.push([px, y + h / 2 + winShape[i] * (h / 2) * 0.9]);
      }
      polyline(ctx, up, C.named('purple'), 1.2);
      polyline(ctx, dn, C.named('purple'), 1.2);
      ctx.restore();
    }
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const w = plotW();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    label(ctx, '① 整段波形（拖窗框平移，拖两端改帧长）', PADL, 18, C.fg, { size: 11 });
    label(ctx, '② 这一帧 × 窗函数（虚线是窗的形状）', PADL, 118, C.fg, { size: 11 });
    label(ctx, '③ 这一帧的频谱（灰虚线 = 不加窗）', PADL, 234, C.fg, { size: 11 });

    if (!dsp) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    /* --- ① 全波形 + 窗框 --- */
    const stepAll = Math.max(1, Math.floor(N / w));
    const pts = [];
    for (let i = 0; i < N; i += stepAll) pts.push([xOf(i), R1.y + R1.h / 2 - sig[i] * (R1.h / 2) * 0.9]);
    polyline(ctx, pts, C.axis, 1.2);

    /* 帧边界：帧太多就不画，免得糊成一片 */
    const nFrames = 1 + Math.floor((N - s.frameLen) / s.hop);
    if (nFrames < 90) {
      ctx.save();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = C.grid;
      for (let i = 0; i < nFrames; i += 1) {
        const x = xOf(i * s.hop);
        ctx.beginPath();
        ctx.moveTo(x, R1.y);
        ctx.lineTo(x, R1.y + R1.h);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* 当前帧：高亮 + 窗形曲线 + 两端把手 */
    const wx0 = xOf(start);
    const wx1 = xOf(start + s.frameLen);
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(wx0, R1.y, Math.max(2, wx1 - wx0), R1.h);
    ctx.globalAlpha = 1;
    const wnd = dsp.window(s.win, s.frameLen);
    const up = [];
    const dn = [];
    for (let i = 0; i < s.frameLen; i += Math.max(1, Math.floor(s.frameLen / Math.max(6, wx1 - wx0)))) {
      const px = xOf(start + i);
      up.push([px, R1.y + R1.h / 2 - wnd[i] * (R1.h / 2) * 0.9]);
      dn.push([px, R1.y + R1.h / 2 + wnd[i] * (R1.h / 2) * 0.9]);
    }
    polyline(ctx, up, C.named('purple'), 1.6);
    polyline(ctx, dn, C.named('purple'), 1.6);
    ctx.fillStyle = C.named('purple');
    ctx.fillRect(wx0 - 3, R1.y, 6, R1.h);
    ctx.fillRect(wx1 - 3, R1.y, 6, R1.h);
    label(ctx, `${fmt((s.frameLen / FS) * 1000, 1)} ms`, (wx0 + wx1) / 2, R1.y - 4, C.named('purple'),
      { align: 'center', size: 10, weight: 600 });

    /* --- ② 加窗后的一帧 --- */
    const frame = new Float64Array(s.frameLen);
    for (let i = 0; i < s.frameLen; i += 1) frame[i] = sig[start + i] * wnd[i];
    drawWaveRow(R2.y, R2.h, frame, wnd, C.accent);

    /* --- ③ 频谱 --- */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    [0, 1000, 2000, 3000, 4000].forEach((f) => {
      const x = PADL + (f / (FS / 2)) * w;
      ctx.beginPath();
      ctx.moveTo(x, R3.y);
      ctx.lineTo(x, R3.y + R3.h);
      ctx.stroke();
      label(ctx, f / 1000 + 'k', x, R3.y + R3.h + 13, C.fg, { align: 'center', size: 10 });
    });
    [-20, -40, -60, -80].forEach((db) => {
      const y = dbY(db, R3.y, R3.h);
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(PADL + w, y);
      ctx.stroke();
      label(ctx, String(db), PADL - 5, y + 4, C.fg, { align: 'right', size: 10 });
    });
    label(ctx, 'dB', PADL - 5, R3.y - 4, C.fg, { align: 'right', size: 10 });
    label(ctx, 'Hz', PADL + w, R3.y + R3.h + 26, C.fg, { align: 'right', size: 10 });

    const binToX = (k) => PADL + ((k * (FS / NFFT)) / (FS / 2)) * w;
    const mkPts = (db) => {
      const out = [];
      for (let k = 1; k < db.length; k += 1) out.push([binToX(k), dbY(db[k], R3.y, R3.h)]);
      return out;
    };
    ctx.save();
    ctx.setLineDash([5, 3]);
    polyline(ctx, mkPts(dbRect), C.axis, 1.2);
    ctx.restore();
    polyline(ctx, mkPts(dbWin), C.accent, 1.8);

    if (s.kind === 'beats') {
      [300, 340].forEach((f) => {
        const x = PADL + (f / (FS / 2)) * w;
        ctx.save();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = C.accent2;
        ctx.beginPath();
        ctx.moveTo(x, R3.y);
        ctx.lineTo(x, R3.y + R3.h);
        ctx.stroke();
        ctx.restore();
        label(ctx, String(f), x + 3, R3.y + 11, C.accent2, { size: 10 });
      });
    }

    const info = lobeInfo(dbWin);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(PADL + (info.peakHz / (FS / 2)) * w, dbY(0, R3.y, R3.h), 3.5, 0, Math.PI * 2);
    ctx.fill();

    label(ctx, '主瓣越窄越能分辨靠得近的两条谱线；旁瓣越低越不会把能量漏到别处', PADL, H - 5, C.fg, { size: 10 });

    /* 读数 */
    ro.set('帧长', `${s.frameLen} 点 / ${fmt((s.frameLen / FS) * 1000, 1)} ms`);
    ro.set('帧移', `${s.hop} 点 / ${fmt((s.hop / FS) * 1000, 1)} ms`);
    ro.set('帧数', `${nFrames} 帧（重叠 ${fmt(100 * (1 - s.hop / s.frameLen), 0)}%）`);
    ro.set('峰值', `${fmt(info.peakHz, 0)} Hz`);
    ro.set('分辨率', `${fmt(FS / s.frameLen, 1)} Hz（= fs/帧长）`);
    ro.set('旁瓣', `${fmt(info.sidelobeDb, 1)} dB / 主瓣 ${fmt(info.mainLobeHz, 1)} Hz`);
    if (s.kind === 'beats') {
      const dip = twoToneDip(dbWin);
      ro.set('双音', dip >= 6 ? `分开了（谷深 ${fmt(dip, 1)} dB）` : `糊在一起（谷深仅 ${fmt(dip, 1)} dB）`);
    } else {
      ro.set('双音', '切到双音信号看');
    }
  }

  /* ---------- 拖拽 ---------- */

  let dragOff = 0;
  bindPointer(cv.canvas, {
    pick(X, Y) {
      if (Y < R1.y - 12 || Y > R1.y + R1.h + 12) return null;
      if (Math.abs(X - xOf(start)) < 9) return 'l';
      if (Math.abs(X - xOf(start + s.frameLen)) < 9) return 'r';
      return 'm';
    },
    down(id, X) {
      if (id !== 'm') return;
      const cx = iOf(X);
      if (cx < start || cx > start + s.frameLen) {
        start = clamp(Math.round(cx - s.frameLen / 2), 0, N - s.frameLen);
        recompute();
        draw();
      }
      dragOff = iOf(X) - start;
    },
    move(id, X) {
      if (id === 'm') {
        start = clamp(Math.round(iOf(X) - dragOff), 0, N - s.frameLen);
      } else if (id === 'l') {
        const right = start + s.frameLen;
        s.frameLen = clamp(right - iOf(X), 32, Math.min(1024, right));
        start = right - s.frameLen;
        syncSlider(0, s.frameLen);
      } else {
        s.frameLen = clamp(iOf(X) - start, 32, Math.min(1024, N - start));
        syncSlider(0, s.frameLen);
      }
      recompute();
      draw();
    },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'frameLen', label: '帧长', min: 32, max: 1024, step: 32, value: s.frameLen },
        { name: 'hop', label: '帧移', min: 16, max: 512, step: 16, value: s.hop },
      ],
    },
    (st) => {
      s.frameLen = st.frameLen;
      s.hop = st.hop;
      start = clamp(start, 0, N - s.frameLen);
      recompute();
      draw();
    },
  );

  /* 拖出来的帧长要回写到滑块上，否则两边打架 */
  function syncSlider(i, v) {
    const row = sliders.box.children[i];
    if (!row) return;
    const r = row.querySelector('input[type="range"]');
    const t = row.querySelector('.ml-slider__val');
    if (r) r.value = String(v);
    if (t) t.textContent = String(v);
  }

  draw();
  cv.redraw = draw;

  engine('dsp').then((m) => {
    dsp = m;
    recompute();
    draw();
  }).catch((e) => {
    void e;
  });

  return { slidersBox: sliders.box, destroy() {} };
}
