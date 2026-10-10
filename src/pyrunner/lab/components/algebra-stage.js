/* =========================================================================
 * lab 组件公共底座：3Blue1Brown 式「分幕动画舞台」（第 4 章代数专用）
 * -------------------------------------------------------------------------
 * 用法（组件文件顶部 import，不单独注册）：
 *
 *   import { makeStage } from './algebra-stage.js';
 *
 *   export default function render(host, spec) {
 *     const st = makeStage(host, {
 *       height: 320, aspect: 9 / 16,
 *       scenes: [
 *         { caption: '第 1 幕：画一个边长 x 的正方形', dur: 3 },
 *         { caption: '第 2 幕：右边贴上一条窄臂', dur: 3 },
 *       ],
 *     });
 *     // 每帧重绘：i 是当前幕号，t 是 0..1 的缓动后进度（easeInOutCubic）
 *     function draw() {
 *       const C = themeColors();
 *       const { ctx, W, H } = st.cv;
 *       st.eachScene((i, t) => { ... });
 *     }
 *     draw();
 *     return { destroy: st.stop };
 *   }
 *
 * 约定：
 *   - 颜色一律经 themeColors()，跟随明暗主题，禁止硬编码。
 *   - opts.onScene(i) 在每次换幕时回调，组件用它重置拖拽态；
 *   - 场景切换 / 滑块变化时组件自己决定重画什么；舞台只负责
 *     「时间线 → 幕号 + 进度」，不碰业务绘制。
 *   - trimmed 白边自适应（默认开）：组件先画到离屏画布，舞台按内容实际
 *     占比裁出有效区域，等比放大居中贴到可见画布上——小幕不再半屏白边。
 *     组件零改动（判定用「与角落底色差异」，不依赖 alpha）。
 *   - reduced-motion 用户不自动播放，直接给终态（t = 1）。
 *   - 离屏（滚出视口）自动暂停播放循环，回滚视口不自动续播。
 * ========================================================================= */

import { themeColors, setupCanvas, el, mkBtn, onScreen } from '../core.js';

/* 与 3Blue1Brown 一致的缓动：起步慢、中段快、收尾稳 */

/* ---------- 白边自适应：内容占比裁剪 ----------
   组件在离屏画布上作画（照常铺背景色），舞台扫描「与角落底色差异」得到
   内容实际包围盒，再等比放大居中 blit 到可见画布。内容只占左上角时，
   它会被自动放大到填满画布——这就是「按使用占比自适应」。 */
let _off = null;         /* 离屏画布缓存（尺寸随主画布） */
let _sbox = null;         /* 平滑后的包围盒（防放大倍数逐帧抖动） */
let _octx = null;
let _ow = 0;
let _oh = 0;

function ensureOff(w, h) {
  if (!_off) {
    _off = document.createElement('canvas');
    /* trim 每帧 getImageData，declared 读频繁让浏览器别走 GPU 回读慢路径 */
    _octx = _off.getContext('2d', { willReadFrequently: true });
  }
  if (_ow !== w || _oh !== h) {
    _off.width = w;
    _off.height = h;
    _ow = w;
    _oh = h;
    _sbox = null;
  }
  return _octx;
}

/* 扫内容包围盒（降采样 + 与角落底色比差异）。返回 null 表示空画布。 */
function contentBox(ctx, w, h) {
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
}

const easeInOutCubic = (t) => {
  const u = Math.min(Math.max(t, 0), 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

export function makeStage(host, opts = {}) {
  const scenes = opts.scenes || [{ caption: '', dur: 3 }];
  const total = scenes.length;
  const H0 = opts.height || 340;
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
    d.addEventListener('click', () => go(i, true));   /* 跳幕就演，跟 3B1B 的导航一致 */
    dots.appendChild(d);
    return d;
  });

  /* ---- 播放状态 ---- */
  let idx = 0;
  let t = reduced ? 1 : 0;   // 幕内原始进度 0..1
  let playing = false;
  let hold = 0;             // 幕末定格停留秒数
  let visible = true;
  let raf = null;
  let last = 0;
  let destroyed = false;

  function setCaption(i) {
    cap.textContent = scenes[i].caption || '';
    cap.classList.remove('is-fade');
    /* 强制回流，让同一段字幕连点也能重放动画 */
    void cap.offsetWidth;
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

  let _lastScene = -1;
  function draw() {
    if (destroyed) return;
    const C = themeColors();
    const W = cv.W;
    const H = cv.H;
    if (idx !== _lastScene) { _sbox = null; _lastScene = idx; }
    if (!opts.trim) {
      opts.draw({ ctx: cv.ctx, W, H, C, i: idx, t: easeInOutCubic(t), raw: t });
      return;
    }
    /* 离屏作画（DPR 同主画布） */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(W * dpr);
    const ph = Math.round(H * dpr);
    const octx = ensureOff(pw, ph);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    opts.draw({ ctx: octx, W, H, C, i: idx, t: easeInOutCubic(t), raw: t });
    /* 内容包围盒 → 等比放大居中贴上来 */
    const box = contentBox(octx, pw, ph);
    /* 平滑：内容在动（光点滑行）时包围盒逐帧微变，直接拿来缩放会让画面
       呼吸。向目标收敛后基本稳住，只有幕与幕之间才平滑变形。 */
    let use = box;
    if (box) {
      const k = _sbox ? 0.22 : 1;
      const lerp1 = (a, b) => a + (b - a) * k;
      _sbox = _sbox
        ? {
          x0: lerp1(_sbox.x0, box.x0), y0: lerp1(_sbox.y0, box.y0),
          x1: lerp1(_sbox.x1, box.x1), y1: lerp1(_sbox.y1, box.y1),
        }
        : { ...box };
      use = _sbox;
    } else if (_sbox) {
      _sbox = null;
    }
    const ctx = cv.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, cv.canvas.width, cv.canvas.height);
    if (use) {
      const bw = use.x1 - use.x0 + 1;
      const bh = use.y1 - use.y0 + 1;
      const s = Math.min(pw / bw, ph / bh);   /* contain：绝不裁掉内容 */
      const dw = Math.round(bw * s);
      const dh = Math.round(bh * s);
      const dx = Math.round((pw - dw) / 2);
      const dy = Math.round((ph - dh) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(_off, use.x0, use.y0, bw, bh, dx, dy, dw, dh);
    } else {
      /* 空画布：整幅贴上来（至少背景是对的） */
      ctx.drawImage(_off, 0, 0);
    }
    ctx.restore();
  }

  cv.redraw = draw;

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
    /* 停在末幕末尾再按播放：从头重演 */
    if (playing && idx === total - 1 && t >= 1) go(0, true);
    syncChrome();
    if (playing && raf == null) raf = requestAnimationFrame(loop);
  }

  /* 跳到第 i 幕；play=true 立即从该幕开始播放 */
  function go(i, playNow) {
    idx = Math.min(Math.max(i, 0), total - 1);
    t = 0;
    hold = 0;
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
    if (playing && t > 0.12) {
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

  /* 离屏暂停：回到视口不自动续（避免满屏 raf 打架） */
  onScreen(box, (v) => {
    visible = v;
    last = 0;
    if (!v && raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    /* 滚回视口时若仍在播放态，把循环接上（否则 raf 已被取消，播放永远停摆） */
    if (v && playing && raf == null && !destroyed) raf = requestAnimationFrame(loop);
  });

  function stop() {
    destroyed = true;
    playing = false;
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
  }

  syncChrome();
  draw();

  return {
    cv,
    box,
    redraw: draw,
    go,
    play,
    stop,
    next: () => go(idx + 1, playing),
    prev: () => go(idx - 1, playing),
    replay: () => go(0, true),
    get scene() { return idx; },
    get t() { return t; },
    get playing() { return playing; },
  };
}

export { easeInOutCubic };
export default makeStage;
