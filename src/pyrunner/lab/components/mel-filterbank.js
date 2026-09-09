/* =========================================================================
 * lab 组件：mel-filterbank（梅尔刻度与听觉滤波组）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "mel-filterbank",
 *     "title": "拖那条竖线：低频密、高频疏，一眼就看见"
 *   }
 *   ```
 *
 * 字段（全部可省，缺省值如下）：
 *   nFilters  滤波器个数，默认 26（语音识别的常用配置）
 *   fmax      最高频率 Hz，默认 8000
 *   fmin      最低频率 Hz，默认 0
 *   probe     探针频率 Hz，默认 1000
 *   fftSize   FFT 点数，默认 512
 *   fs        采样率，默认 16000
 *
 * 三块图在说什么：
 *   上：这 26 个三角滤波器摆在**线性频率轴**上——左边挤成一片，右边又宽又扁
 *   中：同样这 26 个摆在**梅尔轴**上——立刻变成等宽等高的整齐一排
 *       这两张图的对比就是整节课的结论：梅尔刻度 = 把赫兹按人耳的感受重新排一遍
 *   下：左是 hz → mel 的映射曲线（低频陡、高频平）；右是当前探针落在哪几个通道上
 *
 * 能玩什么：
 *   · 在上下两张图上左右拖那条橙色竖线（探针），看它落到第几号通道
 *   · 拖上面一排滤波器最右端的把手改 fmax
 *   · 拖「滤波器个数」：个数越多通道越窄，但相邻通道也就越相关
 *   · 看读数里那一行「低频 vs 高频」：同样是 26 个通道，100 Hz 附近能分出
 *     几十个/kHz，5000 Hz 附近只剩一两个——人耳在低频的分辨力就是强
 *
 * 出声：否（纯分析）。麦克风：否。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  label, polyline, clamp, fmt, engine,
} from '../core.js';

const PADL = 44;
const PADR = 12;

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    nFilters: spec.nFilters ?? 26,
    fmax: spec.fmax ?? 8000,
    fmin: spec.fmin ?? 0,
    probe: spec.probe ?? 1000,
    fftSize: spec.fftSize ?? 512,
    fs: spec.fs ?? 16000,
  };

  let dsp = null;
  let fb = null;         // 滤波器组矩阵：nFilters × (fftSize/2+1)
  let centers = [];      // 每个滤波器的中心频率 Hz
  let edges = [];        // [left, right] Hz
  let hiMel = 0;
  let loMel = 0;
  let probeCh = 0;
  let probeW = [];

  const cv = setupCanvas(host, 440);
  const ro = buildReadout({
    探针: '—', 所在通道: '—', 通道带宽: '—', 局部密度: '—', '低频 vs 高频': '—',
  });
  host.appendChild(ro.box);

  const plotW = () => Math.max(40, cv.W - PADL - PADR);
  const R1 = { y: 28, h: 110 };
  const R2 = { y: 188, h: 84 };
  const R3 = { y: 308, h: 100 };

  const hzX = (f) => PADL + (clamp(f, 0, s.fmax) / s.fmax) * plotW();
  const invHzX = (X) => ((X - PADL) / plotW()) * s.fmax;
  const melX = (f) => PADL + (clamp(dsp.hzToMel(f) - loMel, 0, hiMel) / Math.max(1e-9, hiMel - loMel)) * plotW();
  const invMelX = (X) => dsp.melToHz(loMel + ((X - PADL) / plotW()) * (hiMel - loMel));

  /* ---------- 计算 ---------- */

  function recompute() {
    if (!dsp) return;
    loMel = dsp.hzToMel(s.fmin);
    hiMel = dsp.hzToMel(s.fmax);
    fb = dsp.melFilterbank({
      nFilters: s.nFilters, fftSize: s.fftSize, fs: s.fs, fmin: s.fmin, fmax: s.fmax,
    });
    /* 三角的顶点与两个零点直接从矩阵里读出来：画出来的就是真在用的那一份 */
    centers = [];
    edges = [];
    fb.forEach((row) => {
      let k0 = -1;
      let k1 = -1;
      let kp = 0;
      for (let k = 0; k < row.length; k += 1) {
        if (row[k] > 0) {
          if (k0 < 0) k0 = k;
          k1 = k;
        }
        if (row[k] > row[kp]) kp = k;
      }
      if (k0 < 0) {
        centers.push(0);
        edges.push([0, 0]);
        return;
      }
      const binHz = s.fs / s.fftSize;
      centers.push(kp * binHz);
      edges.push([k0 * binHz, k1 * binHz]);
    });
    /* 探针落在第几号通道、各通道拿到多少权重 */
    const kb = clamp(Math.round((s.probe * s.fftSize) / s.fs), 0, fb[0].length - 1);
    probeW = fb.map((row) => row[kb]);
    let bi = 0;
    for (let m = 1; m < probeW.length; m += 1) if (probeW[m] > probeW[bi]) bi = m;
    probeCh = bi;
  }

  /* ---------- 画图 ---------- */

  function axisHz(y, h, showTop) {
    const ctx = cv.ctx;
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    const stepHz = s.fmax > 5000 ? 1000 : 500;
    for (let f = 0; f <= s.fmax; f += stepHz) {
      const x = hzX(f);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
      label(ctx, f / 1000 + 'k', x, y + h + 13, C.fg, { align: 'center', size: 10 });
    }
    if (showTop) label(ctx, 'Hz', PADL + plotW(), y + h + 26, C.fg, { align: 'right', size: 10 });
  }

  function drawTriangles(y, h, useMel) {
    const ctx = cv.ctx;
    const mapX = useMel ? melX : hzX;
    for (let m = 0; m < fb.length; m += 1) {
      const [e0, e1] = edges[m];
      if (e1 <= e0) continue;
      const xa = mapX(e0);
      const xb = mapX(centers[m]);
      const xc = mapX(e1);
      ctx.beginPath();
      ctx.moveTo(xa, y + h);
      ctx.lineTo(xb, y + h * 0.08);
      ctx.lineTo(xc, y + h);
      ctx.closePath();
      ctx.fillStyle = C.series(m);
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.series(m);
      ctx.lineWidth = m === probeCh ? 2.4 : 1.1;
      ctx.stroke();
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

    label(ctx, '① 线性频率轴（Hz）：低频挤、高频散（拖最右端把手改 fmax）', PADL, 20, C.fg, { size: 11 });
    label(ctx, '② 梅尔轴（mel）：同样这一组，立刻变得等宽等高', PADL, 180, C.fg, { size: 11 });
    label(ctx, '③ 左：Hz → mel 映射曲线   右：探针落在哪几个通道', PADL, 300, C.fg, { size: 11 });

    if (!dsp) {
      label(ctx, '正在载入信号处理引擎…', W / 2, H / 2, C.fg, { align: 'center', size: 12 });
      return;
    }

    axisHz(R1.y, R1.h, true);
    drawTriangles(R1.y, R1.h, false);
    drawTriangles(R2.y, R2.h, true);
    /* 梅尔轴的刻度：位置在 mel 上等距，标注的是对应的 Hz —— 间距不等正是要给人看的 */
    {
      const nT = Math.min(9, s.nFilters + 2);
      for (let i = 0; i < nT; i += 1) {
        const m = loMel + ((hiMel - loMel) * i) / (nT - 1);
        const f = dsp.melToHz(m);
        const x = melX(f);
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, R2.y);
        ctx.lineTo(x, R2.y + R2.h);
        ctx.stroke();
        label(ctx, fmt(f, 0), x, R2.y + R2.h + 13, C.fg, { align: 'center', size: 9 });
      }
      label(ctx, 'Hz（等 mel 间距）', PADL + w, R2.y + R2.h + 26, C.fg, { align: 'right', size: 10 });
    }

    /* fmax 把手 */
    const fxMax = hzX(s.fmax);
    ctx.fillStyle = C.named('purple');
    ctx.beginPath();
    ctx.moveTo(fxMax, R1.y - 10);
    ctx.lineTo(fxMax - 7, R1.y - 20);
    ctx.lineTo(fxMax + 7, R1.y - 20);
    ctx.closePath();
    ctx.fill();
    label(ctx, `fmax ${fmt(s.fmax, 0)}`, fxMax - 8, R1.y - 24, C.named('purple'), { align: 'right', size: 10, weight: 600 });

    /* 探针竖线 */
    const px = hzX(s.probe);
    const pmx = melX(s.probe);
    [[px, R1], [pmx, R2]].forEach(([x, r]) => {
      ctx.strokeStyle = C.accent2;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, r.y);
      ctx.lineTo(x, r.y + r.h);
      ctx.stroke();
    });
    label(ctx, `${fmt(s.probe, 0)} Hz`, px + 4, R1.y + 12, C.accent2, { size: 10, weight: 600 });

    /* --- ③ 左：映射曲线 --- */
    const splitX = PADL + Math.round(w * 0.56);
    const curveW = splitX - PADL - 14;
    const cX = (f) => PADL + (clamp(f, 0, s.fmax) / s.fmax) * curveW;
    const cY = (m) => R3.y + R3.h - (clamp(m - loMel, 0, hiMel - loMel) / Math.max(1e-9, hiMel - loMel)) * R3.h;
    const pts = [];
    for (let i = 0; i <= 120; i += 1) {
      const f = (s.fmax * i) / 120;
      pts.push([cX(f), cY(dsp.hzToMel(f))]);
    }
    polyline(ctx, pts, C.accent, 2);
    /* 通道中心在曲线上的位置：纵向等距（等 mel），横向越往右越稀 */
    centers.forEach((f, m) => {
      ctx.fillStyle = C.series(m);
      ctx.beginPath();
      ctx.arc(cX(f), cY(dsp.hzToMel(f)), 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    [0, 1000, 2000, 4000, 8000].forEach((f) => {
      if (f > s.fmax) return;
      const x = cX(f);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, R3.y);
      ctx.lineTo(x, R3.y + R3.h);
      ctx.stroke();
      label(ctx, f / 1000 + 'k', x, R3.y + R3.h + 13, C.fg, { align: 'center', size: 10 });
    });
    [0.25, 0.5, 0.75].forEach((u) => {
      const m = loMel + (hiMel - loMel) * u;
      const y = cY(m);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(PADL, y);
      ctx.lineTo(PADL + curveW, y);
      ctx.stroke();
      ctx.restore();
      label(ctx, fmt(dsp.melToHz(m), 0) + ' Hz', PADL + curveW + 3, y + 4, C.fg, { size: 9 });
    });
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(cX(s.probe), cY(dsp.hzToMel(s.probe)), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    label(ctx, 'mel', PADL, R3.y - 4, C.fg, { size: 10 });

    /* --- ③ 右：各通道对探针的响应 --- */
    const bx0 = splitX + 14;
    const bw = Math.max(20, PADL + w - bx0);
    const bwid = bw / Math.max(1, s.nFilters);
    probeW.forEach((val, m) => {
      const hgt = Math.max(val > 0 ? 1.5 : 0, val * (R3.h - 12));
      ctx.fillStyle = C.series(m);
      ctx.globalAlpha = m === probeCh ? 1 : 0.45;
      ctx.fillRect(bx0 + m * bwid + 0.5, R3.y + R3.h - hgt, Math.max(1, bwid - 1.5), hgt);
      ctx.globalAlpha = 1;
    });
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx0, R3.y + R3.h);
    ctx.lineTo(bx0 + bw, R3.y + R3.h);
    ctx.stroke();
    label(ctx, `第 ${probeCh + 1} 号通道最亮（共 ${s.nFilters} 个）`, bx0, R3.y + R3.h + 13, C.fg, { size: 10 });
    label(ctx, '通道序号 →', bx0 + bw, R3.y - 4, C.fg, { align: 'right', size: 10 });

    label(ctx, '拖上下两图的橙色竖线移动探针，或拖最上面的紫色三角改 fmax', PADL, H - 5, C.fg, { size: 10 });

    /* 读数 */
    const dMel = (hiMel - loMel) / (s.nFilters + 1);
    const gapAt = (f) => {
      const m = dsp.hzToMel(f);
      return dsp.melToHz(m + dMel) - dsp.melToHz(Math.max(0, m - dMel));
    };
    const gapHere = gapAt(s.probe);
    ro.set('探针', `${fmt(s.probe, 0)} Hz = ${fmt(dsp.hzToMel(s.probe), 0)} mel`);
    ro.set('所在通道', `第 ${probeCh + 1} / ${s.nFilters} 号`);
    ro.set('通道带宽', `${fmt(edges[probeCh][1] - edges[probeCh][0], 0)} Hz`);
    ro.set('局部密度', `${fmt(gapHere > 0 ? 1000 / gapHere : 0, 1)} 个/kHz`);
    const g100 = gapAt(100);
    const g5000 = gapAt(Math.min(5000, s.fmax - 1));
    ro.set('低频 vs 高频', g100 > 0 && g5000 > 0
      ? `100 Hz 处 ${fmt(1000 / g100, 1)} 个/kHz，5000 Hz 处 ${fmt(1000 / g5000, 1)} 个/kHz`
      : '—');
  }

  /* ---------- 拖拽 ---------- */

  function setProbe(f) {
    s.probe = Math.round(clamp(f, s.fmin + 1, s.fmax - 1));
    syncSlider(2, s.probe);
  }

  bindPointer(cv.canvas, {
    pick(X, Y) {
      if (Y >= R1.y - 28 && Y <= R1.y + 4) return 'fmax';
      if (Y >= R1.y && Y <= R1.y + R1.h) return 'p1';
      if (Y >= R2.y && Y <= R2.y + R2.h) return 'p2';
      if (Y >= R3.y && Y <= R3.y + R3.h && X <= PADL + plotW() * 0.56) return 'p3';
      return null;
    },
    move(id, X) {
      if (id === 'fmax') {
        s.fmax = Math.round(clamp(invHzX(X), 2000, Math.min(8000, s.fs / 2)));
        syncSlider(1, s.fmax);
        s.probe = Math.min(s.probe, s.fmax - 1);
      } else if (id === 'p1') {
        setProbe(invHzX(X));
      } else if (id === 'p2') {
        setProbe(invMelX(X));
      } else if (id === 'p3') {
        setProbe(((X - PADL) / (plotW() * 0.56 - 14)) * s.fmax);
      } else {
        return;
      }
      recompute();
      draw();
    },
  });

  /* ---------- 滑块 ---------- */

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'nFilters', label: '滤波器个数', min: 6, max: 40, step: 1, value: s.nFilters },
        { name: 'fmax', label: '最高频率', min: 2000, max: 8000, step: 100, value: s.fmax },
        { name: 'probe', label: '探针频率', min: 20, max: 8000, step: 10, value: s.probe },
      ],
    },
    (st) => {
      s.nFilters = Math.round(st.nFilters);
      s.fmax = Math.round(st.fmax);
      s.probe = Math.round(clamp(st.probe, 1, s.fmax - 1));
      recompute();
      draw();
    },
  );

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
