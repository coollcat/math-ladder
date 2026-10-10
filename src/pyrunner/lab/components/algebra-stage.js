/* =========================================================================
 * lab 组件公共底座：3Blue1Brown 式「分幕动画舞台」（第 4/47 章代数与 MoE）
 * -------------------------------------------------------------------------
 * 用法（组件文件顶部 import，不单独注册）：
 *
 *   import { makeStage } from './algebra-stage.js';
 *
 *   export default function render(host, spec) {
 *     const st = makeStage(host, {
 *       height: 320, aspect: 9 / 16,        // aspect 是高宽比！
 *       scenes: [
 *         { caption: '第 1 幕：……', dur: 3 },
 *         { caption: '第 2 幕：……', dur: 3 },
 *       ],
 *     });
 *     function draw() {
 *       const C = themeColors();
 *       st.draw({ ctx: st.cv.ctx, W: st.cv.W, H: st.cv.H, C, i: st.scene, t: st.tEased });
 *     }
 *     // 布 pointer 的组件一律经 st.toLogical() 反演 trim：
 *     bindPointer(st.cv.canvas, {
 *       pick(x, y) { const [lx, ly] = st.toLogical(x, y); … },
 *       move(id, x, y) { const [lx, ly] = st.toLogical(x, y); … },
 *     });
 *     draw();
 *     return { slidersBox: sl.box, destroy: st.stop };
 *   }
 *
 * 约定：
 *   - 颜色一律经 themeColors()，跟随明暗主题，禁止硬编码。
 *   - opts.onScene(i) 每次换幕回调，组件用它重置拖拽态。
 *   - trim 白边自适应（可传 trim:false 关）：组件画进离屏画布，舞台按内容
 *     包围盒等比放大居中 blit 到可见画布；st.toLogical() 把指针坐标反演回
 *     组件逻辑坐标——不反演就会「看得见抓不起」（热区被缩放位移吃掉）。
 *   - reduced-motion 用户不自动播放，所有幕直接给终态（t = 1）。
 *   - 滚出视口自动暂停，滚回视口若仍在播放态则自动续播。
 * ========================================================================= */

import { themeColors, setupCanvas, el, mkBtn } from '../core.js';

/* 与 3Blue1Brown 一致的缓动：起步慢、中段快、收尾稳 */
const easeInOutCubic = (t) => {
  const u = Math.min(Math.max(t, 0), 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

/* 每个舞台实例一套离屏画布、平滑包围盒与观察者（同页多实例互不干扰） */
function createTrimmer() {
  let off = null;
  let octx = null;
  let ow = 0;
  let oh = 0;
  let sbox = null;
  return {
    ensureOff(w, h) {
      if (!off) {
        off = document.createElement('canvas');
        /* trim 每帧 getImageData，声明读频繁让浏览器别走 GPU 回读慢路径 */
        octx = off.getContext('2d', { willReadFrequently: true });
      }
      if (ow !== w || oh !== h) {
        off.width = w;
        off.height = h;
        ow = w;
        oh = h;
        sbox = null;
      }
      return { ctx: octx, canvas: off };
    },
    contentBox(ctx, w, h) {
      const step = Math.max(2, Math.round(Math.min(w, h) / 220));
      const d = ctx.getImageData(0, 0, w, h).data;
      const bg = [d[0], d[1], d[2]];
      let x0 = w;
      let y0 = h;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 26) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      /* 向外扩一个采样步长 + 2px 呼吸边，再夹回画布 */
      return {
        x0: Math.max(0, x0 - step - 2),
        y0: Math.max(0, y0 - step - 2),
        x1: Math.min(w - 1, x1 + step + 2),
        y1: Math.min(h - 1, y1 + step + 2),
      };
    },
    get sbox() { return sbox; },
    set sbox(v) { sbox = v; },
    resetSmooth() { sbox = null; },
  };
}

export function makeStage(host, opts = {}) {
  const scenes = opts.scenes || [{ caption: '', dur: 3 }];
  const total = scenes.length;
  const H0 = opts.height || 320;
  const trim = opts.trim !== false;
  const reduced = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---- DOM 骨架 ---- */
  const box = el('div', 'ml-alg-stage');
  host.appendChild(box);

  const canvasBox = el('div', 'ml-alg-stage__canvas');
  box.appendChild(canvasBox);
  const cv = setupCanvas(canvasBox, H0, { aspect: opts.aspect || 9 / 16 });

  const cap = el('div', 'ml-alg-stage__caption', scenes[0].caption || '');
  box.appendChild(cap);

  const controls = el('div', 'ml-viz__controls');
  box.appendChild(controls);
  const btnPrev = mkBtn('◀ 上一幕');
  const btnPlay = mkBtn(reduced ? '减少动效' : '播放');
  const btnNext = mkBtn('下一幕 ▶');
  const btnReplay = mkBtn('重播');
  btnPlay.disabled = reduced;
  const badge = el('span', 'ml-lab__hint', '');
  controls.append(btnPrev, btnPlay, btnNext, btnReplay, badge);

  const dots = el('div', 'ml-alg-stage__dots');
  box.appendChild(dots);
  const dotEls = scenes.map((s, i) => {
    const d = el('button', 'ml-alg-stage__dot');
    d.type = 'button';
    d.setAttribute('aria-label', '跳到第 ' + (i + 1) + ' 幕');
    d.title = '第 ' + (i + 1) + ' 幕：' + (s.caption || '');
    d.addEventListener('click', () => go(i, true));
    dots.appendChild(d);
    return d;
  });

  /* ---- 播放状态 ---- */
  let idx = 0;
  let t = reduced ? 1 : 0;
  let playing = false;
  let hold = 0;
  let visible = true;
  let raf = null;
  let last = 0;
  let destroyed = false;
  const trimmer = createTrimmer();
  /* 最近一次 trim 的变换（CSS px 域），供指针反演 */
  const trimInfo = { on: trim, s: 1, dx: 0, dy: 0 };

  function setCaption(i) {
    cap.textContent = scenes[i].caption || '';
    cap.classList.remove('is-fade');
    void cap.offsetWidth;   /* 强制回流，同一幕连点也能重放字幕动画 */
    cap.classList.add('is-fade');
  }

  function syncChrome() {
    badge.textContent = '第 ' + (idx + 1) + ' / ' + total + ' 幕'
      + (playing ? ' · 播放中' : '');
    dotEls.forEach((d, i) => {
      d.classList.toggle('is-on', i === idx);
      d.classList.toggle('is-past', i < idx);
    });
    btnPlay.textContent = reduced ? '减少动效' : (playing ? '暂停' : '播放');
  }

  function draw() {
    if (destroyed) return;
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    const eased = easeInOutCubic(t);
    if (!trim) {
      opts.draw({ ctx: cv.ctx, W, H, C, i: idx, t: eased, raw: t });
      return;
    }
    /* 离屏作画（DPR 同主画布） */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    const { ctx: octx, canvas: offCv } = trimmer.ensureOff(pw, ph);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    opts.draw({ ctx: octx, W, H, C, i: idx, t: eased, raw: t });

    /* 内容包围盒 → 等比放大居中贴到可见画布（contain，绝不裁内容） */
    const target = trimmer.contentBox(octx, pw, ph);
    let use = target;
    if (target) {
      const k = trimmer.sbox ? 0.22 : 1;
      trimmer.sbox = trimmer.sbox
        ? {
          x0: trimmer.sbox.x0 + (target.x0 - trimmer.sbox.x0) * k,
          y0: trimmer.sbox.y0 + (target.y0 - trimmer.sbox.y0) * k,
          x1: trimmer.sbox.x1 + (target.x1 - trimmer.sbox.x1) * k,
          y1: trimmer.sbox.y1 + (target.y1 - trimmer.sbox.y1) * k,
        }
        : { ...target };
      use = trimmer.sbox;
    } else {
      trimmer.resetSmooth();
      use = null;
    }
    const ctx = cv.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, cv.canvas.width, cv.canvas.height);
    if (use) {
      const bw = use.x1 - use.x0 + 1;
      const bh = use.y1 - use.y0 + 1;
      const s = Math.min(pw / bw, ph / bh);
      const dw = Math.round(bw * s);
      const dh = Math.round(bh * s);
      const dx = Math.round((pw - dw) / 2);
      const dy = Math.round((ph - dh) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(offCv, use.x0, use.y0, bw, bh, dx, dy, dw, dh);
      /* 记录 CSS 域变换，供组件把指针坐标反演回逻辑坐标 */
      trimInfo.s = s / dpr;
      trimInfo.dx = dx / dpr;
      trimInfo.dy = dy / dpr;
    } else {
      ctx.drawImage(offCv, 0, 0);
      trimInfo.s = 1;
      trimInfo.dx = 0;
      trimInfo.dy = 0;
    }
    ctx.restore();
  }

  function loop(now) {
    raf = null;
    if (destroyed || !playing) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    if (!visible || !host.isConnected) return;
    if (hold > 0) {
      hold -= dt;
      if (hold <= 0) {
        if (idx < total - 1) {
          idx += 1;
          t = 0;
          setCaption(idx);
          if (opts.onScene) opts.onScene(idx);
          syncChrome();
        } else {
          playing = false;
          syncChrome();
          return;
        }
      }
    } else {
      t += dt / (scenes[idx].dur || 3);
      if (t >= 1) {
        t = 1;
        hold = 0.5;
      }
    }
    draw();
    if (playing) raf = requestAnimationFrame(loop);
  }

  function play(v) {
    if (reduced) return;
    playing = v === undefined ? !playing : !!v;
    last = 0;
    if (playing && idx === total - 1 && t >= 1) go(0, true);
    syncChrome();
    if (playing && raf == null) raf = requestAnimationFrame(loop);
  }

  /* 跳到第 i 幕；reduced 用户不给播，直接终态 */
  function go(i, playNow) {
    idx = Math.min(Math.max(i, 0), total - 1);
    t = reduced ? 1 : 0;
    hold = 0;
    trimmer.resetSmooth();
    setCaption(idx);
    if (opts.onScene) opts.onScene(idx);
    if (playNow && !reduced) {
      playing = true;
      last = 0;
    } else {
      playing = false;
    }
    syncChrome();
    draw();
    if (playing && raf == null) raf = requestAnimationFrame(loop);
  }

  btnPrev.addEventListener('click', () => {
    if (playing && t > 0.12 && !reduced) {
      t = 0;
      draw();
      syncChrome();
    } else {
      go(idx - 1, false);
    }
  });
  btnNext.addEventListener('click', () => {
    if (idx < total - 1) go(idx + 1, playing);
    else {
      playing = false;
      t = 1;
      syncChrome();
      draw();
    }
  });
  btnReplay.addEventListener('click', () => go(0, true));
  btnPlay.addEventListener('click', () => play());

  /* 可见性观测（自己持有，stop 时断开，不依赖 core 的无柄 onScreen） */
  const io = (typeof IntersectionObserver !== 'undefined')
    ? new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      last = 0;
      if (!visible && raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      /* 滚回视口：仍在播放态就把循环接上 */
      if (visible && playing && raf == null && !destroyed) raf = requestAnimationFrame(loop);
    }, { rootMargin: '60px' })
    : null;
  if (io) io.observe(box);

  function stop() {
    destroyed = true;
    playing = false;
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
    if (io) io.disconnect();
    cv.redraw = null;   /* 主题切换不再唤醒已销毁的舞台 */
  }

  /* 指针坐标（CSS px）→ 组件逻辑坐标：trim 开时反演缩放与位移 */
  function toLogical(x, y) {
    if (!trimInfo.on) return [x, y];
    return [(x - trimInfo.dx) / trimInfo.s, (y - trimInfo.dy) / trimInfo.s];
  }

  cv.redraw = draw;
  syncChrome();
  draw();

  return {
    cv,
    box,
    redraw: draw,
    go,
    play,
    stop,
    toLogical,
    next: () => go(idx + 1, playing),
    prev: () => go(idx - 1, playing),
    replay: () => go(0, true),
    get scene() { return idx; },
    get t() { return t; },
    get tEased() { return easeInOutCubic(t); },
    get playing() { return playing; },
  };
}

export { easeInOutCubic };
export default makeStage;
