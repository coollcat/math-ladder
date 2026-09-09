/* =========================================================================
 * lab 组件：analog-vs-digital（从模拟到数字：采样 → 量化 → 编码）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "analog-vs-digital",
 *     "title": "拖采样率和位数，看连续曲线怎么被掰成台阶",
 *     "spp": 8,
 *     "bits": 3,
 *     "shape": "sine",
 *     "probe": 0.55
 *   }
 *   ```
 *
 * 字段（全部可省略，省略时用下面的默认值）：
 *   spp    每周期采样点数，默认 8（范围 2–24）。采样率 = spp × 信号频率
 *   bits   量化位数，默认 3（范围 1–6）。电平数 = 2^bits，台阶 Δ = 2/(2^bits − 1)
 *   shape  "sine"（默认，纯正弦）或 "mix"（正弦 + 三次谐波， richer 波形失真更明显）
 *   probe  探针初始位置，0–1（一个信号窗口内的相对位置），默认 0.55
 *
 * 演示什么：
 *   一条连续曲线被三把刀切开——
 *   ① 采样：时间离散化，只在 t = k/fs 这些瞬间看一眼（琥珀色圆点）；
 *   ② 保持：把看到的值撑到下一个采样点（青色细台阶，零阶保持）；
 *   ③ 量化：幅度也离散化，只能报出 2^bits 个电平之一（蓝色粗台阶）。
 *   最下面是编码：每个采样点的电平变成一个二进制码字。
 *   bits = 1 时只剩「高 / 低」两个电平，台阶退化成方波——这是最直观的
 *   「数字化等于扔信息」演示。
 *
 * 能拖什么：
 *   在画布上按住拖动 = 移动竖直探针，实时读出该时刻的
 *   「原始值 / 量化值 / 误差 / 码字」。点一下也能把探针挪过去。
 *   「播放」按钮让探针自动扫过整个窗口。
 *   滑块：采样点数 spp、量化位数 bits。分段切换：波形形状。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout,
  buildSegmented, anim, polyline, label, clamp, fmt,
} from '../core.js';
import { toBits } from '../engines/logic.js';

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    spp: clamp(spec.spp ?? 8, 2, 24),
    bits: clamp(spec.bits ?? 3, 1, 6),
    shape: spec.shape === 'mix' ? 'mix' : 'sine',
    probe: clamp(spec.probe ?? 0.55, 0, 1),
  };
  const T = 2; // 显示两个信号周期

  const cv = setupCanvas(host, 380);
  const ro = buildReadout({
    '采样': '—', '量化台阶 Δ': '—', '电平数': '—',
    '探针 原值→量化值': '—', '探针 误差': '—', '探针 码字': '—',
    '误差 RMS': '—', '最大误差': '—',
  });
  host.appendChild(ro.box);
  host.appendChild(buildSegmented(
    [{ label: '纯正弦', value: 'sine' }, { label: '正弦 + 三次谐波', value: 'mix' }],
    s.shape,
    (v) => { s.shape = v; draw(); },
  ));

  /* ---------- 量化口径：0..L-1 共 L 个码字均匀铺满 [-1, 1] ---------- */
  const nLev = () => 2 ** Math.round(s.bits);
  const dStep = () => 2 / (nLev() - 1);
  const codeOf = (v) => clamp(Math.round(((v + 1) / 2) * (nLev() - 1)), 0, nLev() - 1);
  const vOfCode = (c) => c * dStep() - 1;
  const quantize = (v) => vOfCode(codeOf(v));

  function sigAt(t) {
    const w = 2 * Math.PI * t;
    if (s.shape === 'mix') return 0.75 * Math.sin(w) + 0.25 * Math.sin(3 * w);
    return Math.sin(w);
  }

  /* ---------- 几何 ---------- */
  const GX = 46;
  const gw = () => Math.max(120, cv.W - GX - 16);
  const X = (t) => GX + (t / T) * gw();
  const invX = (px) => clamp(((px - GX) / gw()) * T, 0, T);
  const waveY = () => 100;
  const waveH = () => 68;
  const VY = (v) => waveY() - (clamp(v, -1.25, 1.25) / 1.25) * waveH();
  const errY = () => 224;
  const errH = () => 46;
  const EY = (e) => errY() - (clamp(e, -0.6, 0.6) / 0.6) * errH();

  function samples() {
    const n = Math.max(2, Math.round(T * s.spp));
    const out = [];
    for (let k = 0; k < n; k += 1) {
      const t0 = k / s.spp;
      const t1 = Math.min((k + 1) / s.spp, T);
      const v = sigAt(t0);
      const code = codeOf(v);
      out.push({ t0, t1, v, code, q: vOfCode(code) });
    }
    return out;
  }

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    const G = gw();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const sp = samples();
    const nb = Math.round(s.bits);
    const L = nLev();
    const dq = dStep();

    /* ===== 上：三步走 ===== */
    label(ctx, '① 采样（看一眼）　② 保持（撑住）　③ 量化（报电平）', GX, 14, C.fg, { size: 11, weight: 600 });

    /* 电平横线 */
    if (L <= 16) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let c = 0; c < L; c += 1) {
        const y = VY(vOfCode(c));
        ctx.beginPath();
        ctx.moveTo(GX, y);
        ctx.lineTo(GX + G, y);
        ctx.stroke();
      }
    }
    /* 零轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GX, VY(0));
    ctx.lineTo(GX + G, VY(0));
    ctx.stroke();
    label(ctx, '+1', GX - 6, VY(1) + 4, C.fg, { align: 'right', size: 9 });
    label(ctx, '−1', GX - 6, VY(-1) + 4, C.fg, { align: 'right', size: 9 });

    /* 原始连续曲线 */
    const orig = [];
    for (let k = 0; k <= 480; k += 1) {
      const t = (k / 480) * T;
      orig.push([X(t), VY(sigAt(t))]);
    }
    polyline(ctx, orig, C.named('gray'), 1.5, [5, 4]);

    /* 保持台阶（未量化） */
    const hold = [];
    sp.forEach((p) => {
      hold.push([X(p.t0), VY(p.v)], [X(p.t1), VY(p.v)]);
    });
    polyline(ctx, hold, C.named('teal'), 1.4);

    /* 量化台阶 */
    const stair = [];
    sp.forEach((p) => {
      stair.push([X(p.t0), VY(p.q)], [X(p.t1), VY(p.q)]);
    });
    polyline(ctx, stair, C.accent, 2.6);

    /* 采样点 */
    ctx.fillStyle = C.named('amber');
    sp.forEach((p) => {
      ctx.beginPath();
      ctx.arc(X(p.t0), VY(p.v), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    label(ctx, '原始模拟信号', GX + 4, waveY() - waveH() - 6, C.named('gray'), { size: 10 });
    label(ctx, '零阶保持', GX + 4, waveY() + waveH() + 14, C.named('teal'), { size: 10 });
    label(ctx, '量化后台阶（2^' + nb + ' = ' + L + ' 个电平）',
      GX + G - 4, waveY() - waveH() - 6, C.accent, { align: 'right', size: 10 });

    /* ===== 中：量化误差 ===== */
    const ey = errY();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GX, ey);
    ctx.lineTo(GX + G, ey);
    ctx.stroke();
    ctx.strokeStyle = C.grid;
    ctx.setLineDash([4, 3]);
    [dq / 2, -dq / 2].forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(GX, EY(v));
      ctx.lineTo(GX + G, EY(v));
      ctx.stroke();
    });
    ctx.setLineDash([]);
    label(ctx, '±Δ/2', GX - 6, EY(dq / 2) + 4, C.fg, { align: 'right', size: 9 });

    const errPts = [];
    let se = 0;
    let nse = 0;
    let emax = 0;
    for (let k = 0; k <= 600; k += 1) {
      const t = (k / 600) * T;
      const idx = Math.min(sp.length - 1, Math.floor(t * s.spp));
      const p = sp[idx];
      const e = sigAt(t) - p.q;
      se += e * e;
      nse += 1;
      emax = Math.max(emax, Math.abs(e));
      errPts.push([X(t), EY(e)]);
    }
    polyline(ctx, errPts, C.named('red'), 1.8);
    label(ctx, '量化误差 e(t) = 原始 − 台阶（永远在 ±Δ/2 内，除非过载）',
      GX + 4, ey - errH() - 8, C.named('red'), { size: 10 });

    /* ===== 探针 ===== */
    const tp = s.probe * T;
    const pIdx = clamp(Math.floor(tp * s.spp), 0, sp.length - 1);
    const pc = sp[pIdx];
    const pv = sigAt(tp);
    const pq = pc.q;
    const pe = pv - pq;
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(X(tp), 18);
    ctx.lineTo(X(tp), errY() + errH() + 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent2;
    ctx.beginPath();
    ctx.arc(X(tp), VY(pv), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.named('red');
    ctx.beginPath();
    ctx.arc(X(tp), VY(pq), 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 't = ' + fmt(tp, 2) + '（第 ' + pIdx + ' 个采样点）',
      clamp(X(tp) + 8, GX, GX + G - 120), 30, C.accent2, { size: 10 });

    /* ===== 下：编码 ===== */
    const codeTop = 292;
    label(ctx, '④ 编码：每个电平一个二进制码字（码字流 = 数字系统真正搬运的东西）',
      GX, codeTop - 8, C.fg, { size: 11, weight: 600 });
    const nShow = Math.min(sp.length, Math.max(2, Math.floor(G / 54)));
    const cw = G / nShow;
    for (let k = 0; k < nShow; k += 1) {
      const p = sp[k];
      const bits = toBits(p.code, nb);
      const bx = GX + k * cw;
      const on = k === pIdx;
      ctx.fillStyle = on ? C.soft : C.bg;
      ctx.fillRect(bx, codeTop, cw - 4, 30);
      ctx.strokeStyle = on ? C.accent2 : C.axis;
      ctx.lineWidth = on ? 1.8 : 1;
      ctx.strokeRect(bx, codeTop, cw - 4, 30);
      const bw = (cw - 8) / nb;
      for (let b = 0; b < nb; b += 1) {
        const on2 = bits[b] === 1;
        ctx.fillStyle = on2 ? C.named('purple') : C.soft;
        ctx.fillRect(bx + 4 + b * bw, codeTop + 6, Math.max(3, bw - 2), 18);
        label(ctx, String(bits[b]), bx + 4 + b * bw + Math.max(3, bw - 2) / 2, codeTop + 20,
          on2 ? C.bg : C.grid, { align: 'center', size: 10, weight: 700 });
      }
    }
    if (sp.length > nShow) {
      label(ctx, '…（共 ' + sp.length + ' 个采样点）', GX + nShow * cw + 4, codeTop + 20, C.grid, { size: 10 });
    }

    /* 探针码字放大显示 */
    const pb = toBits(pc.code, nb);
    const bigTop = codeTop + 42;
    label(ctx, '探针处码字 =', GX, bigTop + 16, C.fg, { size: 10 });
    let bx2 = GX + 78;
    for (let b = 0; b < nb; b += 1) {
      const on2 = pb[b] === 1;
      ctx.fillStyle = on2 ? C.named('purple') : C.soft;
      ctx.fillRect(bx2, bigTop, 22, 22);
      ctx.strokeStyle = on2 ? C.named('purple') : C.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx2, bigTop, 22, 22);
      label(ctx, String(pb[b]), bx2 + 11, bigTop + 16, on2 ? C.bg : C.fg,
        { align: 'center', size: 11, weight: 700 });
      bx2 += 24;
    }
    label(ctx, '= ' + pc.code + '（十进制）　→ 还原电压 '
      + fmt(pq, 3) + ' V　MSB 权重 ' + fmt(2 ** (nb - 1) * dq, 2) + ' V，LSB 权重 Δ = '
      + fmt(dq, 3) + ' V', bx2 + 8, bigTop + 16, C.fg, { size: 10 });

    /* ===== 读数 ===== */
    ro.set('采样', fmt(s.spp, 0) + ' 点/周期　（窗口内共 ' + sp.length + ' 个采样点，采样率 = '
      + fmt(s.spp, 0) + ' × 信号频率）');
    ro.set('量化台阶 Δ', fmt(dq, 4) + '　（2 V 满量程 ÷ (2^' + nb + ' − 1)）');
    ro.set('电平数', L + ' 个　（' + nb + ' 位，能表示的电平只有这么多个，其余全被四舍五入吃掉）');
    ro.set('探针 原值→量化值', fmt(pv, 4) + ' → ' + fmt(pq, 4)
      + '　（最近的可报电平）');
    ro.set('探针 误差', fmt(pe, 4) + '　' + (Math.abs(pe) <= dq / 2 + 1e-9
      ? '（在 ±Δ/2 内，符合理论）' : '（超出 ±Δ/2：这是保持带来的额外误差）'));
    ro.set('探针 码字', pb.join(' ') + '　= ' + pc.code + '　（MSB 在左）');
    ro.set('误差 RMS', fmt(Math.sqrt(se / Math.max(nse, 1)), 4)
      + '　理论量化噪声 Δ/√12 = ' + fmt(dq / Math.sqrt(12), 4));
    ro.set('最大误差', fmt(emax, 4) + '　（≤ Δ/2 + 一个周期内信号的变化量）');
  }

  /* ---------- 交互：拖探针 ---------- */
  function setProbeFromX(px) {
    s.probe = invX(px) / T;
    draw();
  }
  bindPointer(cv.canvas, {
    pick: () => 'probe',
    down(id, x) { setProbeFromX(x); },
    move(id, x) { setProbeFromX(x); },
  });

  const controls = anim(host, {
    onTick(dt) {
      s.probe += dt * 0.28;
      if (s.probe > 1) s.probe -= 1;
      draw();
    },
    onReset() { s.probe = spec.probe ?? 0.55; draw(); },
  });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'spp', label: '采样密度（点/周期）', min: 2, max: 24, step: 1, value: s.spp, fmt: 0 },
        { name: 'bits', label: '量化位数 N', min: 1, max: 6, step: 1, value: s.bits, fmt: 0 },
      ],
    },
    (v) => { s.spp = v.spp; s.bits = v.bits; draw(); },
  );

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
