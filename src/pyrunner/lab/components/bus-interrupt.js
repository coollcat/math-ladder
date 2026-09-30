/* =========================================================================
 * lab 组件：bus-interrupt（总线与中断：一次中断的完整一生）
 * -------------------------------------------------------------------------
 * 演示什么：设备拉高中断请求线（INTR）→ CPU 不能立刻停下，必须先把手头
 *   这条指令执行完（响应延迟的第一段）→ 保存现场（压栈 PC 与寄存器）→
 *   跳去执行中断服务程序 ISR → 恢复现场 → 返回断点继续跑主程序。
 *   整块画布就是一条时间线：拖「请求到达时刻」的把手，看响应延迟怎么变——
 *   请求来得越靠近指令边界，CPU 停得越干脆；来得越早，等得越久。
 *   还能演示两件事：屏蔽（把某设备屏蔽后，请求线一直挂着没人理）与
 *   优先级（定时器是高优先级，能在键盘 ISR 执行到一半时嵌套打断它）。
 *
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "bus-interrupt",
 *     "title": "拖动请求到达时刻，看响应延迟怎么变"
 *   }
 *   ```
 *
 * 字段（全部可省，省了用默认值）：
 *   cycles  时间线总长（时钟周期数），60–240，默认 120
 *   insnLen 主程序平均指令长度（周期），2–8，默认 4（实际长度在其附近波动）
 *   tA      高优先级设备（定时器）请求到达时刻，默认 32
 *   tB      低优先级设备（键盘）请求到达时刻，默认 66
 *   lenA    定时器 ISR 服务体时长（周期），4–40，默认 10
 *   lenB    键盘 ISR 服务体时长（周期），4–60，默认 18
 *   maskA   是否屏蔽定时器，默认 false
 *   maskB   是否屏蔽键盘，默认 false
 *   speed   播放头速度（周期/秒），默认 18
 *
 * 能玩什么：
 *   - 拖红色三角把手（定时器行）与青色三角把手（键盘行）→ 改请求到达时刻，
 *     整条时间线即时重排，读数里的响应延迟跟着变
 *   - 点「屏蔽定时器 / 屏蔽键盘」→ 被屏蔽的请求线拉高后一直挂着不受理
 *   - 把键盘请求拖到定时器 ISR 中途 → 看高优先级如何嵌套打断低优先级
 *   - 播放 / 重置：琥珀色播放头逐周期扫过，读数报当前周期 CPU 在干嘛
 *
 * 出声：否。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, anim, buildReadout, buildToolbar,
  buildSliders, mkBtn, label, clamp,
  clearBg,
  setSliderRow,
} from '../core.js';
import { toBits } from '../engines/logic.js';

const TOP = 56;
const ROWH = 46;
const PADL = 104;

/* 指令长度在其平均值附近波动（固定图案，时间线每次重排结果可复现） */
const INSN_VAR = [0, -1, 1, 0, 2, -1, 0, 1];

export default function render(host, spec) {
  const s = {
    cycles: Math.round(clamp(spec.cycles ?? 120, 60, 240)),
    insnLen: Math.round(clamp(spec.insnLen ?? 4, 2, 8)),
    tA: Math.round(clamp(spec.tA ?? 32, 2, 118)),
    tB: Math.round(clamp(spec.tB ?? 66, 2, 118)),
    lenA: Math.round(clamp(spec.lenA ?? 10, 4, 40)),
    lenB: Math.round(clamp(spec.lenB ?? 18, 4, 60)),
    maskA: !!spec.maskA,
    maskB: !!spec.maskB,
    speed: clamp(spec.speed ?? 18, 2, 80),
  };
  let head = 0;
  let hoverT = -1;

  const cv = setupCanvas(host, 300);
  const ro = buildReadout({
    '响应延迟·定时器': '—',
    '响应延迟·键盘': '—',
    '嵌套': '—',
    '屏蔽寄存器 IM': '—',
    '当前周期': '—',
  });
  host.appendChild(ro.box);

  const lenOfInsn = (i) => Math.max(2, s.insnLen + INSN_VAR[i % INSN_VAR.length]);

  /* ---------- 逐周期仿真：一次跑完整条时间线 ----------
     rows.main[t]  该周期是否在执行主程序
     rows.irqA/irqB[t]  两条请求线的电平（受理后落回 0）
     rows.isr[t]   0 无 / 1 定时器 / 2 键盘
     rows.ph[t]    0 / 1 保存现场 / 2 服务体 / 3 恢复现场                     */
  function simulate() {
    const T = s.cycles;
    const rows = {
      main: new Uint8Array(T),
      irqA: new Uint8Array(T),
      irqB: new Uint8Array(T),
      isr: new Uint8Array(T),
      ph: new Uint8Array(T),
    };
    let pendA = false;
    let pendB = false;
    let latA = null;      // 受理时刻（开始保存现场那一拍）
    let latB = null;
    let servedA = false;
    let servedB = false;
    let nestedAt = null;  // 嵌套打断发生的周期
    let where = 'main';
    let rem = lenOfInsn(0);
    let insnIdx = 1;
    let cur = null;       // { dev, phase, rem }
    const stack = [];     // 嵌套时被压住的下级 ISR
    const bounds = [];    // 因中断而在该边界被打断（画红刻度）

    const startIsr = (dev, t, nested) => {
      if (dev === 'A') { pendA = false; latA = t; servedA = true; }
      else { pendB = false; latB = t; servedB = true; }
      if (nested) nestedAt = t;
      stack.push(cur);
      cur = { dev, phase: 1, rem: 2 };
    };

    for (let t = 0; t < T; t += 1) {
      if (t === s.tA) pendA = true;
      if (t === s.tB) pendB = true;

      /* 受理检查：只在指令边界受理（主程序）；键盘服务体运行中可被定时器嵌套打断 */
      if (where === 'main' && rem <= 0) {
        if (pendA && !s.maskA) { startIsr('A', t, false); bounds.push(t); }
        else if (pendB && !s.maskB) { startIsr('B', t, false); bounds.push(t); }
      } else if (where === 'isr' && cur && cur.dev === 'B' && cur.phase === 2
        && pendA && !s.maskA) {
        /* 嵌套打断发生在服务体内，不动主程序的指令边界刻度 */
        startIsr('A', t, true);
      }

      /* 执行一个周期 */
      if (where === 'main') {
        rows.main[t] = 1;
        if (rem <= 0) { rem = lenOfInsn(insnIdx); insnIdx += 1; }
        rem -= 1;
      } else {
        rows.isr[t] = cur.dev === 'A' ? 1 : 2;
        rows.ph[t] = cur.phase;
        cur.rem -= 1;
        if (cur.rem <= 0) {
          if (cur.phase === 1) { cur.phase = 2; cur.rem = cur.dev === 'A' ? s.lenA : s.lenB; }
          else if (cur.phase === 2) { cur.phase = 3; cur.rem = 2; }
          else {
            const prev = stack.pop();
            if (prev) cur = prev;
            else { where = 'main'; cur = null; }
          }
        }
      }

      rows.irqA[t] = pendA ? 1 : 0;
      rows.irqB[t] = pendB ? 1 : 0;
    }

    return { rows, latA, latB, servedA, servedB, nestedAt, bounds };
  }

  /* ---------- 画图 ---------- */

  function hatch(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let d = -h; d < w; d += 5) {
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const T = s.cycles;
    s.tA = Math.round(clamp(s.tA, 2, T - 10));
    s.tB = Math.round(clamp(s.tB, 2, T - 10));
    const R = simulate();
    const rows = R.rows;
    const x0 = PADL;
    const x1 = W - 14;
    const X = (t) => x0 + (t / T) * (x1 - x0);
    const tOf = (px) => clamp(Math.round(((px - x0) / (x1 - x0)) * T), 2, T - 2);
    const plotBot = TOP + 4 * ROWH;

    label(ctx, '一次中断的完整一生：请求 → 等指令边界 → 保存现场 → 服务 → 恢复返回', 10, 20, C.fg, { size: 12, weight: 600 });
    label(ctx, '拖三角把手改请求到达时刻 · 红刻度 = 被打断的指令边界 · 斜纹 = 存/取现场', 10, 36, C.grid, { size: 10 });

    /* 行 0：主程序 */
    {
      const yb = TOP;
      const yT = yb + 8;
      const yB = yb + ROWH - 12;
      label(ctx, '主程序', x0 - 8, (yT + yB) / 2 + 4, C.named('blue'), { align: 'right', size: 10, weight: 600 });
      let run = -1;
      for (let t = 0; t <= T; t += 1) {
        const on = t < T && rows.main[t];
        if (on && run < 0) run = t;
        if (!on && run >= 0) {
          ctx.fillStyle = C.soft;
          ctx.strokeStyle = C.named('blue');
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.rect(X(run), yT, X(t) - X(run), yB - yT);
          ctx.fill();
          ctx.stroke();
          run = -1;
        }
      }
      R.bounds.forEach((t) => {
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(t), yT - 3);
        ctx.lineTo(X(t), yB + 3);
        ctx.stroke();
      });
      label(ctx, 'CPU 执行用户程序', x0, yB + 14, C.grid, { size: 9 });
    }

    /* 行 1/2：两条中断请求线（方波电平）+ 到达把手 */
    const irqRows = [
      { key: 'irqA', name: 'INTR·定时器（高）', color: C.bad, t: s.tA, id: 'ha' },
      { key: 'irqB', name: 'INTR·键盘（低）', color: C.named('teal'), t: s.tB, id: 'hb' },
    ];
    irqRows.forEach((r, i) => {
      const yb = TOP + (i + 1) * ROWH;
      const yHi = yb + 12;
      const yLo = yb + ROWH - 12;
      label(ctx, r.name, x0 - 8, (yHi + yLo) / 2 + 4, r.color, { align: 'right', size: 10, weight: 600 });
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let prev = 0;
      ctx.moveTo(X(0), yLo);
      for (let t = 0; t < T; t += 1) {
        const v = rows[r.key][t];
        if (v !== prev) ctx.lineTo(X(t), v ? yHi : yLo);
        ctx.lineTo(X(t + 1), v ? yHi : yLo);
        prev = v;
      }
      ctx.stroke();

      /* 到达把手（可左右拖） */
      const hx = X(r.t);
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.moveTo(hx, yHi - 4);
      ctx.lineTo(hx - 6, yHi - 14);
      ctx.lineTo(hx + 6, yHi - 14);
      ctx.closePath();
      ctx.fill();
      label(ctx, 't=' + r.t + ' ⇕', hx, yHi - 18, r.color, { align: 'center', size: 9, weight: 700 });
    });

    /* 行 3：中断服务程序 */
    {
      const yb = TOP + 3 * ROWH;
      const yT = yb + 8;
      const yB = yb + ROWH - 12;
      label(ctx, '中断服务程序', x0 - 8, (yT + yB) / 2 + 4, C.fg, { align: 'right', size: 10, weight: 600 });
      let run = -1;
      const same = (t) => (t >= 0 && t < T ? rows.isr[t] * 10 + rows.ph[t] : -1);
      for (let t = 0; t <= T; t += 1) {
        const k = same(t);
        const kPrev = same(t - 1);
        if (run >= 0 && (t === T || k !== kPrev)) {
          const dev = Math.floor(kPrev / 10);
          const ph = kPrev % 10;
          const bx = X(run);
          const bw = Math.max(1.5, X(t) - bx);
          const col = dev === 1 ? C.bad : C.named('teal');
          if (ph === 2) {
            ctx.fillStyle = col;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(bx, yT, bw, yB - yT);
            ctx.globalAlpha = 1;
            if (bw > 56) label(ctx, dev === 1 ? '定时器 ISR' : '键盘 ISR', bx + bw / 2, (yT + yB) / 2 + 4, C.bg, { align: 'center', size: 9, weight: 600 });
          } else {
            ctx.strokeStyle = C.axis;
            ctx.strokeRect(bx, yT, bw, yB - yT);
            hatch(ctx, bx, yT, bw, yB - yT, C.axis);
            if (bw > 52) label(ctx, ph === 1 ? '保存现场' : '恢复返回', bx + bw / 2, (yT + yB) / 2 + 4, C.fg, { align: 'center', size: 9 });
          }
          run = k > 0 ? t : -1;
        } else if (run < 0 && k > 0) {
          run = t;
        }
      }
      /* 受理箭头 + 延迟标注 */
      if (R.servedA) {
        const ax = X(R.latA);
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ax, yT - 4);
        ctx.lineTo(ax, yB + 6);
        ctx.stroke();
        label(ctx, '延迟 ' + (R.latA - s.tA) + ' 拍', ax + 4, yT - 6, C.bad, { size: 9, weight: 600 });
      }
      if (R.servedB) {
        const ax = X(R.latB);
        ctx.strokeStyle = C.named('teal');
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ax, yB + 6);
        ctx.lineTo(ax, yB + 16);
        ctx.stroke();
        label(ctx, '延迟 ' + (R.latB - s.tB) + ' 拍', ax + 4, yB + 18, C.named('teal'), { size: 9, weight: 600 });
      }
    }

    /* 时间刻度 */
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let t = 0; t <= T; t += Math.max(1, Math.round(T / 12))) {
      ctx.moveTo(X(t), plotBot);
      ctx.lineTo(X(t), plotBot + 4);
    }
    ctx.stroke();
    for (let t = 0; t <= T; t += Math.max(1, Math.round(T / 6))) {
      label(ctx, String(t), X(t), plotBot + 15, C.fg, { align: 'center', size: 9 });
    }
    label(ctx, '时钟周期', x1, plotBot + 15, C.grid, { align: 'right', size: 9 });

    /* 播放头 / 悬停指示 */
    const markT = hoverT >= 0 ? hoverT : head;
    if (markT >= 0 && markT <= T) {
      ctx.strokeStyle = hoverT >= 0 ? C.accent2 : C.named('amber');
      ctx.lineWidth = hoverT >= 0 ? 1.2 : 2;
      ctx.beginPath();
      ctx.moveTo(X(markT), TOP - 8);
      ctx.lineTo(X(markT), plotBot + 4);
      ctx.stroke();
    }

    /* 读数 */
    const lat = (served, latT, tReq, mask) => {
      if (served) return latT - tReq + ' 拍（t=' + tReq + ' 请求 → t=' + latT + ' 受理）';
      if (mask) return '被屏蔽：请求线一直挂着，没人受理';
      return '时间线内没等到指令边界，还没受理';
    };
    ro.set('响应延迟·定时器', lat(R.servedA, R.latA, s.tA, s.maskA));
    ro.set('响应延迟·键盘', lat(R.servedB, R.latB, s.tB, s.maskB));
    ro.set('嵌套', R.nestedAt !== null
      ? 't=' + R.nestedAt + '：定时器在键盘服务体内嵌套打断（高优先级抢占）'
      : '本时间线内未发生（试试把键盘请求拖到定时器 ISR 之前）');
    const im = (s.maskB ? 1 : 0) | (s.maskA ? 2 : 0);
    ro.set('屏蔽寄存器 IM', '0b' + toBits(im, 2).join('') + '（bit1=定时器 bit0=键盘，1=屏蔽）');
    const k = clamp(Math.floor(markT), 0, T - 1);
    const phName = ['', '保存现场', '执行服务程序', '恢复现场'];
    ro.set('当前周期', rows.isr[k]
      ? 't=' + k + '：' + (rows.isr[k] === 1 ? '定时器' : '键盘') + '中断服务 · ' + phName[rows.ph[k]]
      : 't=' + k + '：主程序执行中' + (rows.irqA[k] || rows.irqB[k] ? '（有请求在等指令边界）' : ''));
  }

  /* ---------- 拖拽 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      for (let i = 0; i < 2; i += 1) {
        const yb = TOP + (i + 1) * ROWH;
        const yHi = yb + 12;
        const tx = i === 0 ? s.tA : s.tB;
        const X = (t) => PADL + (t / s.cycles) * (cv.W - 14 - PADL);
        if (Math.abs(px - X(tx)) <= 10 && py >= yHi - 22 && py <= yHi + 8) {
          return i === 0 ? 'ha' : 'hb';
        }
      }
      if (py >= TOP && py <= TOP + 4 * ROWH) return 'scrub';
      return null;
    },
    down(id, px) {
      if (id === 'scrub') { hoverT = -1; head = tOfFromPx(px); draw(); }
    },
    move(id, px) {
      if (id === 'ha') { s.tA = tOfFromPx(px); syncSliders(); draw(); }
      else if (id === 'hb') { s.tB = tOfFromPx(px); syncSliders(); draw(); }
      else if (id === 'scrub') { head = tOfFromPx(px); draw(); }
    },
    leave() { hoverT = -1; draw(); },
  });

  function tOfFromPx(px) {
    const x0 = PADL;
    const x1 = cv.W - 14;
    return clamp(Math.round(((px - x0) / (x1 - x0)) * s.cycles), 0, s.cycles - 1);
  }

  /* ---------- 控件 ---------- */

  const bMaskA = mkBtn('屏蔽定时器：关');
  const bMaskB = mkBtn('屏蔽键盘：关');
  const syncMaskBtns = () => {
    bMaskA.textContent = '屏蔽定时器：' + (s.maskA ? '开' : '关');
    bMaskB.textContent = '屏蔽键盘：' + (s.maskB ? '开' : '关');
  };
  bMaskA.addEventListener('click', () => { s.maskA = !s.maskA; syncMaskBtns(); draw(); });
  bMaskB.addEventListener('click', () => { s.maskB = !s.maskB; syncMaskBtns(); draw(); });
  syncMaskBtns();
  host.appendChild(buildToolbar(bMaskA, bMaskB));

  const controls = anim(host, {
    onTick(dt) {
      head += dt * s.speed;
      if (head >= s.cycles) head -= s.cycles;
      draw();
    },
    onReset() { head = 0; draw(); },
  });

  function syncSliders() {
    setSliderRow(sliders, 0, s.tA);
    setSliderRow(sliders, 1, s.tB);
  }
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'tA', label: '定时器请求到达', min: 2, max: s.cycles - 10, step: 1, value: s.tA, fmt: 0 },
        { name: 'tB', label: '键盘请求到达', min: 2, max: s.cycles - 10, step: 1, value: s.tB, fmt: 0 },
        { name: 'speed', label: '播放速度 (周期/秒)', min: 2, max: 80, step: 1, value: s.speed, fmt: 0 },
      ],
    },
    (st) => {
      s.tA = Math.round(st.tA);
      s.tB = Math.round(st.tB);
      s.speed = st.speed;
      draw();
    },
  );

  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
