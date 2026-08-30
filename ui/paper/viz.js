/* 数学阶梯 · 纸墨版 viz.js
   就地渲染 10 类通用 viz 组件：plot / datachart / seq / sines / unitcircle /
   wave / dice / statdots / coinlaw / counting（spec 字段与主站 src/pyrunner/viz.js 对齐）。
   其余章节专属类型保留占位卡，走卡片上的主站链接。 */
window.MLPaperViz = (function () {
  'use strict';

  /* ---------- 基础工具 ---------- */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function niceStep(span) {
    var raw = span / 8;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  }
  function themeColors() {
    var cs = getComputedStyle(document.documentElement);
    function g(n, f) { var v = cs.getPropertyValue(n).trim(); return v || f; }
    return {
      bg: g('--viz-bg', '#fbf7ec'), fg: g('--viz-fg', '#2b2620'),
      grid: g('--viz-grid', 'rgba(43,38,32,.12)'), axis: g('--viz-axis', 'rgba(43,38,32,.55)'),
      a: g('--viz-a', '#b3402a'), b: g('--viz-b', '#2f5d8a'), c: g('--viz-c', '#3a7d44'),
      d: g('--viz-d', '#7c3aed'), e: g('--viz-e', '#c47f17')
    };
  }
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupCanvas(host, H) {
    var canvas = document.createElement('canvas');
    canvas.className = 'pv-canvas';
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var r = { canvas: canvas, ctx: ctx, W: host.clientWidth || 600, H: H, redraw: null };
    function fit() {
      var w = host.clientWidth || 600;
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      r.W = w;
      if (r.redraw) r.redraw();
    }
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(host);
    fit();
    return r;
  }
  function onScreen(el, cb) {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { cb(e.isIntersecting); });
    }, { threshold: 0.05 }).observe(el);
  }
  function mkBtn(label) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'pv-btn'; b.textContent = label;
    return b;
  }
  function mkBox(host) { var d = document.createElement('div'); d.className = 'pv-controls'; host.appendChild(d); return d; }
  function mkCaption(host) { var d = document.createElement('div'); d.className = 'pv-caption'; host.appendChild(d); return d; }
  function buildSliders(defs, onChange) {
    var box = document.createElement('div');
    box.className = 'pv-sliders';
    var refs = {};
    var state = {};
    defs.forEach(function (d) { state[d.name] = d.value; });
    defs.forEach(function (d) {
      var row = document.createElement('label');
      row.className = 'pv-slider';
      var name = document.createElement('span');
      name.className = 'pv-sname'; name.textContent = d.name;
      var range = document.createElement('input');
      range.type = 'range';
      range.min = d.min; range.max = d.max; range.step = d.step; range.value = d.value;
      var val = document.createElement('span');
      val.className = 'pv-sval'; val.textContent = d.value;
      range.addEventListener('input', function () {
        state[d.name] = parseFloat(range.value);
        val.textContent = range.value;
        onChange(state);
      });
      row.appendChild(name); row.appendChild(range); row.appendChild(val);
      box.appendChild(row);
      refs[d.name] = { range: range, val: val };
    });
    return { box: box, refs: refs, state: state };
  }

  /* ---------- 表达式编译（plot 用，Pratt 解析，白名单函数） ---------- */
  var EXPR_FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
    log: Math.log, exp: Math.exp, floor: Math.floor, ceil: Math.ceil
  };
  var EXPR_CONSTS = { pi: Math.PI, e: Math.E };
  var EXPR_UNICODE = {
    '−': '-', '–': '-', '—': '-', '‐': '-', '‑': '-', '‒': '-', '―': '-', '－': '-',
    '×': '*', '÷': '/', '∗': '*', '⋅': '*', '·': '*', '＊': '*', '／': '/',
    '（': '(', '）': ')', '【': '(', '】': ')', '［': '(', '］': ')'
  };
  function compileExpr(srcRaw, allowedVars) {
    var src = String(srcRaw).replace(/./g, function (ch) { return EXPR_UNICODE[ch] || ch; });
    var toks = [];
    var i = 0;
    while (i < src.length) {
      var ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        var j = i;
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        toks.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        var k = i;
        while (k < src.length && /\w/.test(src[k])) k++;
        var name = src.slice(i, k);
        if (EXPR_FUNCS[name]) toks.push({ t: 'func', v: name });
        else if (EXPR_CONSTS[name] != null) toks.push({ t: 'num', v: EXPR_CONSTS[name] });
        else if (allowedVars.indexOf(name) >= 0) toks.push({ t: 'var', v: name });
        else throw new Error('未知名字: ' + name);
        i = k; continue;
      }
      if (ch === '*' && src[i + 1] === '*') { toks.push({ t: 'op', v: '**' }); i += 2; continue; }
      if ('+-*/%^()'.indexOf(ch) >= 0) {
        var isParen = ch === '(' || ch === ')';
        toks.push({ t: isParen ? 'paren' : 'op', v: ch === '^' ? '**' : ch });
        i++; continue;
      }
      throw new Error('无法识别的字符: ' + ch);
    }
    var pos = 0;
    function prec(op) { return op === '**' ? 3 : (op === '*' || op === '/') ? 2 : 1; }
    function parseExpr(minP) {
      var left = parsePrefix();
      for (;;) {
        var tk = toks[pos];
        if (!tk || tk.t !== 'op') break;
        var p = prec(tk.v);
        if (p < minP) break;
        pos++;
        var right = parseExpr(tk.v === '**' ? p : p + 1);
        left = { t: 'bin', op: tk.v, l: left, r: right };
      }
      return left;
    }
    function parsePrefix() {
      var tk = toks[pos++];
      if (!tk) throw new Error('表达式不完整');
      if (tk.t === 'num') return { t: 'num', v: tk.v };
      if (tk.t === 'var') return { t: 'var', v: tk.v };
      if (tk.t === 'func') {
        var open = toks[pos++];
        if (!open || open.v !== '(') throw new Error('函数 ' + tk.v + ' 后缺括号');
        var arg = parseExpr(1);
        var close = toks[pos++];
        if (!close || close.v !== ')') throw new Error('函数 ' + tk.v + ' 缺右括号');
        return { t: 'call', v: tk.v, arg: arg };
      }
      if (tk.t === 'paren' && tk.v === '(') {
        var e = parseExpr(1);
        var c = toks[pos++];
        if (!c || c.v !== ')') throw new Error('缺右括号');
        return e;
      }
      if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
        var operand = parseExpr(3); /* 一元负号弱于幂：-2^2 = -(2^2) */
        return tk.v === '-' ? { t: 'neg', e: operand } : operand;
      }
      throw new Error('这里不该出现 ' + (tk.v || '结尾'));
    }
    function ev(node, scope) {
      switch (node.t) {
        case 'num': return node.v;
        case 'var': return scope[node.v];
        case 'neg': return -ev(node.e, scope);
        case 'call': return EXPR_FUNCS[node.v](ev(node.arg, scope));
        case 'bin':
          var a = ev(node.l, scope), b = ev(node.r, scope);
          return node.op === '+' ? a + b : node.op === '-' ? a - b
            : node.op === '*' ? a * b : node.op === '/' ? a / b : Math.pow(a, b);
      }
      return NaN;
    }
    var ast = parseExpr(1);
    if (pos < toks.length) throw new Error('表达式有多余内容');
    return function (scope) { return ev(ast, scope); };
  }

  /* ---------- plot：函数图像（expr/expr2/xmin/xmax/piAxis/sliders） ---------- */
  function renderPlot(host, spec) {
    var H = 260;
    var xmin = spec.xmin != null ? spec.xmin : -5;
    var xmax = spec.xmax != null ? spec.xmax : 5;
    var piAxis = spec.piAxis === true;
    var sliderDefs = Array.isArray(spec.sliders) ? spec.sliders : [];
    var vars = ['x'].concat(sliderDefs.map(function (s) { return s.name; }));
    var fn, fn2 = null;
    try { fn = compileExpr(spec.expr, vars); }
    catch (e) {
      var err = document.createElement('div');
      err.className = 'pv-err';
      err.textContent = '表达式有误：' + e.message;
      host.appendChild(err);
      return;
    }
    if (spec.expr2) { try { fn2 = compileExpr(spec.expr2, vars); } catch (e2) { fn2 = null; } }
    var state = {};
    sliderDefs.forEach(function (s) { state[s.name] = s.value; });
    var r = setupCanvas(host, H);

    function piLabel(v) {
      var k = Math.round(v / (Math.PI / 2));
      if (k === 0) return '0';
      var sign = k < 0 ? '−' : '';
      k = Math.abs(k);
      if (k === 2) return sign + 'π';
      if (k % 2 === 0) return sign + (k / 2) + 'π';
      return sign + (k === 1 ? '' : k) + 'π/2';
    }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      var padL = 40, padR = 14, padT = 14, padB = 26, N = 400;
      var xs = [], ys = [], ys2 = [], k, x, y;
      for (k = 0; k <= N; k++) {
        x = xmin + (xmax - xmin) * k / N;
        xs.push(x);
        try { y = fn(Object.assign({ x: x }, state)); } catch (e) { y = NaN; }
        ys.push(y);
        if (fn2) {
          try { y = fn2(Object.assign({ x: x }, state)); } catch (e2) { y = NaN; }
          ys2.push(y);
        }
      }
      var all = ys.concat(fn2 ? ys2 : []).filter(function (v) { return Number.isFinite(v); });
      var ymin = all.length ? Math.min.apply(null, all) : -1;
      var ymax = all.length ? Math.max.apply(null, all) : 1;
      if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) { ymin = -1; ymax = 1; }
      if (ymax - ymin < 1e-9) { ymax += 1; ymin -= 1; }
      var spanPad = (ymax - ymin) * 0.12;
      ymin -= spanPad; ymax += spanPad;
      function X(v) { return padL + (v - xmin) / (xmax - xmin) * (W - padL - padR); }
      function Y(v) { return padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB); }
      ctx.fillStyle = tc.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      var xTicks = [], v;
      if (piAxis) {
        var step = Math.PI / 2;
        for (var kk = Math.ceil(xmin / step); kk * step <= xmax + 1e-9; kk++) xTicks.push(kk * step);
      } else {
        var gx = niceStep(xmax - xmin);
        for (v = Math.ceil(xmin / gx) * gx; v <= xmax; v += gx) xTicks.push(v);
      }
      ctx.strokeStyle = tc.grid;
      xTicks.forEach(function (t) { line(ctx, X(t), padT, X(t), H - padB); });
      var gy = niceStep(ymax - ymin);
      for (v = Math.ceil(ymin / gy) * gy; v <= ymax; v += gy) line(ctx, padL, Y(v), W - padR, Y(v));
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      xTicks.forEach(function (t) { ctx.fillText(piAxis ? piLabel(t) : String(Math.round(t * 100) / 100), X(t), H - padB + 16); });
      ctx.textAlign = 'right';
      for (v = Math.ceil(ymin / gy) * gy; v <= ymax; v += gy) ctx.fillText(String(Math.round(v * 100) / 100), padL - 5, Y(v) + 4);
      ctx.strokeStyle = tc.axis;
      if (ymin < 0 && ymax > 0) line(ctx, padL, Y(0), W - padR, Y(0));
      if (xmin < 0 && xmax > 0) line(ctx, X(0), padT, X(0), H - padB);
      function stroke(ysArr, color, dash) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.2;
        ctx.setLineDash(dash || []);
        ctx.beginPath();
        var pen = false;
        for (var i2 = 0; i2 <= N; i2++) {
          if (!Number.isFinite(ysArr[i2]) || Math.abs(ysArr[i2]) > 1e6) { pen = false; continue; }
          var px = X(xs[i2]);
          var py = Y(Math.max(Math.min(ysArr[i2], ymax + 5), ymin - 5));
          if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      stroke(ys, tc.a);
      if (fn2) stroke(ys2, tc.e, [6, 4]);
      ctx.fillStyle = tc.fg;
      ctx.textAlign = 'left';
      ctx.font = '600 12px monospace';
      ctx.fillText('y = ' + spec.expr + (spec.expr2 ? '　·　虚线: ' + spec.expr2 : ''), padL, 16);
    }
    r.redraw = draw;
    if (sliderDefs.length) {
      var sl = buildSliders(sliderDefs.map(function (s) {
        return { name: s.name, min: s.min, max: s.max, step: s.step, value: s.value };
      }), function (next) { state = Object.assign({}, next); draw(); });
      host.appendChild(sl.box);
    }
    draw();
  }

  /* ---------- sines：谐波叠加动画（terms/rawAmplitude） ---------- */
  function drawSinesFrame(ctx, W, H, t, terms, rawAmp) {
    ctx.clearRect(0, 0, W, H);
    var midY = H * 0.58, scale = H * 0.3, pxStep = 4;
    var cols = Math.ceil(W / pxStep);
    function amp(k) { return rawAmp ? 1 : 1 / k; }
    terms.forEach(function (k, idx) {
      ctx.strokeStyle = 'rgba(47,93,138,' + (0.10 + idx * 0.06) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var c = 0; c <= cols; c++) {
        var px = c * pxStep;
        var phase = (px / W) * Math.PI * 4 - t * (0.6 + idx * 0.25);
        var y = midY - Math.sin(k * phase) * amp(k) * scale;
        if (c === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(179,64,42,0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (var c2 = 0; c2 <= cols; c2++) {
      var px2 = c2 * pxStep;
      var phase2 = (px2 / W) * Math.PI * 4 - t * 0.6;
      var acc = terms.reduce(function (s, kk) { return s + Math.sin(kk * phase2) * amp(kk); }, 0);
      var py = midY - acc * scale;
      if (c2 === 0) ctx.moveTo(px2, py); else ctx.lineTo(px2, py);
    }
    ctx.stroke();
  }
  function renderSines(host, spec) {
    var H = 220;
    var rawAmp = spec.rawAmplitude === true;
    var terms = spec.terms && spec.terms.length ? spec.terms.slice() : [1, 3, 5];
    var t = 0, raf = null, visible = true;
    var r = setupCanvas(host, H);
    function frame() {
      if (!wrapOk() || !visible) { raf = null; return; }
      drawSinesFrame(r.ctx, r.W, H, t, terms, rawAmp);
      t += 0.035;
      raf = requestAnimationFrame(frame);
    }
    function wrapOk() { return host.isConnected; }
    function restart() {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      t = 0;
      if (REDUCED || !visible) { drawSinesFrame(r.ctx, r.W, H, 0, terms, rawAmp); return; }
      raf = requestAnimationFrame(frame);
    }
    r.redraw = restart;
    restart();
    onScreen(host, function (v) {
      visible = v;
      if (!v) { if (raf != null) cancelAnimationFrame(raf); raf = null; }
      else if (raf == null && !REDUCED && host.isConnected) raf = requestAnimationFrame(frame);
    });
    if (!rawAmp) {
      var sl = buildSliders([{ name: 'harmonics', min: 1, max: 9, step: 2, value: terms.length }], function (st) {
        var n = Math.max(1, Math.round(st.harmonics));
        terms = [];
        for (var k = 1; k <= 2 * n - 1; k += 2) terms.push(k);
        restart();
      });
      host.appendChild(sl.box);
    }
  }

  /* ---------- unitcircle：单位圆（mode=wave 时描出正弦曲线） ---------- */
  function renderUnitcircle(host, spec) {
    var H = 300;
    var trace = spec.mode === 'wave';
    var st = { th: 0.9, playing: true };
    var raf = null, visible = true;
    var geo = {};
    var cap = mkCaption(host);
    var box = mkBox(host);
    var r = setupCanvas(host, H);
    function stop() { if (raf != null) cancelAnimationFrame(raf); raf = null; }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var R = Math.min(96, H * 0.32);
      var cy = H / 2 + 8;
      var cx = trace ? Math.max(R + 34, W * 0.2) : W * 0.3;
      geo.cx = cx; geo.cy = cy;
      var px = cx + Math.cos(st.th) * R;
      var py = cy - Math.sin(st.th) * R;
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1.4;
      line(ctx, cx - R - 14, cy, cx + R + 14, cy);
      line(ctx, cx, cy - R - 14, cx, cy + R + 14);
      if (!trace) {
        for (var k = 1; k <= 3; k++) {
          ctx.strokeStyle = tc.grid;
          ctx.beginPath();
          ctx.arc(cx, cy, R * k / 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = tc.axis;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('1', cx + 4, cy - R + 2);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = tc.b;
      ctx.lineWidth = 3;
      line(ctx, cx, cy, px, cy);
      ctx.strokeStyle = tc.e;
      line(ctx, px, cy, px, py);
      ctx.strokeStyle = tc.d;
      ctx.lineWidth = 2;
      line(ctx, cx, cy, px, py);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = tc.a;
      ctx.fill();
      ctx.fillStyle = tc.b;
      ctx.font = '600 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('cos=' + Math.cos(st.th).toFixed(2), (cx + px) / 2, cy + 16);
      ctx.save();
      ctx.translate(px + (Math.cos(st.th) >= 0 ? 12 : -12), (cy + py) / 2);
      ctx.textAlign = Math.cos(st.th) >= 0 ? 'left' : 'right';
      ctx.fillStyle = tc.e;
      ctx.fillText('sin=' + Math.sin(st.th).toFixed(2), 0, 4);
      ctx.restore();
      if (trace) {
        var x0 = cx + R + 26;
        var span = Math.PI * 4;
        var sx = function (phi) { return x0 + (phi / span) * (W - x0 - 16); };
        var sy = function (v) { return cy - v * R; };
        ctx.strokeStyle = tc.grid;
        ctx.lineWidth = 1;
        line(ctx, x0 - 10, sy(0), W - 14, sy(0));
        ctx.strokeStyle = tc.e;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (var k2 = 0; k2 <= 240; k2++) {
          var phi = span * k2 / 240;
          var yy = sy(Math.sin(phi));
          if (k2 === 0) ctx.moveTo(sx(phi), yy); else ctx.lineTo(sx(phi), yy);
        }
        ctx.stroke();
        var cur = ((st.th % span) + span) % span;
        ctx.strokeStyle = tc.d;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        line(ctx, px, py, sx(cur), sy(Math.sin(st.th)));
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(sx(cur), sy(Math.sin(st.th)), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = tc.a;
        ctx.fill();
      }
      cap.textContent = '角度 θ=' + st.th.toFixed(2) + ' rad：横坐标是 cos，纵坐标是 sin（可拖动圆上的点）';
    }
    function frame() {
      if (!host.isConnected || !visible) { stop(); return; }
      if (st.playing && !REDUCED) st.th += 0.012;
      draw();
      raf = requestAnimationFrame(frame);
    }
    var btn = mkBtn('暂停');
    btn.addEventListener('click', function () {
      st.playing = !st.playing;
      btn.textContent = st.playing ? '暂停' : '播放';
      if (REDUCED) draw();
    });
    box.appendChild(btn);
    r.redraw = draw;
    r.canvas.classList.add('ml-drag');
    var dragging = false;
    function setFromEvent(e) {
      var rect = r.canvas.getBoundingClientRect();
      st.th = Math.atan2(geo.cy - (e.clientY - rect.top), (e.clientX - rect.left) - geo.cx);
      st.playing = false;
      btn.textContent = '播放';
      draw();
    }
    r.canvas.addEventListener('pointerdown', function (e) { dragging = true; r.canvas.setPointerCapture(e.pointerId); setFromEvent(e); });
    r.canvas.addEventListener('pointermove', function (e) { if (dragging) setFromEvent(e); });
    r.canvas.addEventListener('pointerup', function () { dragging = false; });
    onScreen(host, function (v) {
      visible = v;
      if (!v) stop();
      else if (raf == null && host.isConnected) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  /* ---------- wave：正弦波（A/f/phi 滑杆） ---------- */
  function renderWave(host, spec) {
    var H = 260;
    var st = { A: spec.A || 1, f: spec.f || 1, phi: spec.phi || 0, t: 0 };
    var raf = null, visible = true;
    var cap = mkCaption(host);
    var r = setupCanvas(host, H);
    function stop() { if (raf != null) cancelAnimationFrame(raf); raf = null; }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      var midY = H / 2 + 6;
      var scale = H * 0.36;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = tc.grid;
      ctx.lineWidth = 1;
      line(ctx, 0, midY, W, midY);
      ctx.strokeStyle = 'rgba(47,93,138,0.25)';
      ctx.setLineDash([3, 4]);
      line(ctx, 0, midY - st.A * scale, W, midY - st.A * scale);
      line(ctx, 0, midY + st.A * scale, W, midY + st.A * scale);
      ctx.setLineDash([]);
      ctx.strokeStyle = tc.a;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (var px = 0; px <= W; px += 3) {
        var xx = (px / W) * Math.PI * 2 * 2;
        var y = midY - st.A * scale * Math.sin(st.f * xx - st.phi - st.t * 2);
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
      var lam = W / (2 * st.f); /* 屏上 x 跨度 4π，故一个波长 = W/(2f) */
      if (lam > 30 && lam < W) {
        ctx.strokeStyle = tc.c;
        ctx.lineWidth = 1.6;
        var yL = midY - st.A * scale - 12;
        line(ctx, 14, yL, 14 + lam, yL);
        line(ctx, 14, yL - 5, 14, yL + 5);
        line(ctx, 14 + lam, yL - 5, 14 + lam, yL + 5);
        ctx.fillStyle = tc.c;
        ctx.font = '12px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('λ 一个波长', 18 + lam / 2, yL - 6);
      }
      ctx.fillStyle = tc.fg;
      ctx.font = '600 14px monospace';
      ctx.fillText('y = ' + st.A.toFixed(1) + '·sin(' + st.f.toFixed(2) + 'x − ' + (st.phi % (Math.PI * 2)).toFixed(2) + ')', 14, 24);
      cap.textContent = '振幅 A=' + st.A.toFixed(1) + '（多高）　频率 f=' + st.f.toFixed(2) +
        '（多密）　相位 φ=' + (st.phi % (Math.PI * 2)).toFixed(2) + '（左右挪动）';
    }
    function frame() {
      if (!host.isConnected || !visible) { stop(); return; }
      if (!REDUCED) st.t += 0.02;
      draw();
      raf = requestAnimationFrame(frame);
    }
    var sl = buildSliders([
      { name: 'A', min: 0.2, max: 2, step: 0.1, value: st.A },
      { name: 'f', min: 0.25, max: 4, step: 0.25, value: st.f },
      { name: 'phi', min: 0, max: 6.28, step: 0.1, value: st.phi }
    ], function (next) {
      st.A = next.A; st.f = next.f; st.phi = next.phi;
      if (REDUCED) draw();
    });
    host.appendChild(sl.box);
    r.redraw = draw;
    onScreen(host, function (v) {
      visible = v;
      if (!v) stop();
      else if (raf == null && host.isConnected) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }

  /* ---------- seq：数列（kind=arith/geom，a1/d/r/n） ---------- */
  function renderSeq(host, spec) {
    var H = 300;
    var kind = spec.kind === 'geom' ? 'geom' : 'arith';
    var st = kind === 'arith'
      ? { a1: spec.a1 != null ? spec.a1 : 1, d: spec.d != null ? spec.d : 2, n: spec.n || 8 }
      : { a1: spec.a1 != null ? spec.a1 : 1, r: spec.r != null ? spec.r : 1.5, n: spec.n || 8 };
    var cap = mkCaption(host);
    var r = setupCanvas(host, H);
    function term(k) { return kind === 'arith' ? st.a1 + k * st.d : st.a1 * Math.pow(st.r, k); }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var vals = [];
      for (var k = 0; k < st.n; k++) vals.push(Math.abs(term(k)) > 9999 ? NaN : term(k));
      var finite = vals.filter(function (v) { return !Number.isNaN(v); });
      var maxAbs = Math.max.apply(null, [1].concat(finite.map(Math.abs)));
      var padL = 30;
      var bw = Math.min(64, (W - padL - 16) / st.n - 8);
      var baseY = H - 44;
      var usable = baseY - 46;
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1.4;
      line(ctx, padL - 8, baseY, W - 12, baseY);
      var acc = 0;
      for (var i = 0; i < st.n; i++) {
        var v = vals[i];
        var x = padL + i * (bw + 8);
        if (Number.isNaN(v)) {
          ctx.fillStyle = tc.a;
          ctx.font = '700 13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('爆炸', x + bw / 2, baseY - 14);
          acc = NaN;
        } else {
          acc += v;
          var h = Math.abs(v) / maxAbs * usable;
          ctx.fillStyle = v >= 0 ? 'rgba(47,93,138,0.6)' : 'rgba(179,64,42,0.55)';
          ctx.fillRect(x, v >= 0 ? baseY - h : baseY, bw, Math.max(h, 1.5));
          ctx.fillStyle = tc.fg;
          ctx.font = '600 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(Number.isInteger(v) ? String(v) : v.toFixed(1), x + bw / 2, v >= 0 ? baseY - h - 5 : baseY + h + 13);
        }
        ctx.fillStyle = tc.axis;
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('a' + (i + 1), x + bw / 2, baseY + 16);
      }
      ctx.textAlign = 'left';
      ctx.font = '600 13px monospace';
      if (!Number.isNaN(acc)) {
        ctx.fillStyle = tc.d;
        ctx.fillText('S' + st.n + '（前' + st.n + '项和）= ' + (Number.isInteger(acc) ? acc : acc.toFixed(2)), padL - 8, 24);
      }
      ctx.fillStyle = tc.fg;
      ctx.fillText('a₁=' + st.a1, padL - 8, 44);
      ctx.fillText(kind === 'arith' ? 'd=' + st.d : 'r=' + st.r, padL + 60, 44);
      cap.textContent = kind === 'arith'
        ? '等差：每项再加同一个 d，长高像楼梯'
        : '等比：每项再乘同一个 r，r>1 时瞬间爆发，r<1 时越长越矮';
    }
    var sliderDefs = kind === 'arith'
      ? [{ name: 'a1', min: -5, max: 10, step: 1, value: st.a1 }, { name: 'd', min: -5, max: 5, step: 1, value: st.d }, { name: 'n', min: 3, max: 12, step: 1, value: st.n }]
      : [{ name: 'a1', min: 1, max: 5, step: 1, value: st.a1 }, { name: 'r', min: 0.1, max: 2, step: 0.1, value: st.r }, { name: 'n', min: 3, max: 11, step: 1, value: st.n }];
    var sl = buildSliders(sliderDefs, function (next) {
      Object.assign(st, next);
      st.n = Math.round(st.n);
      draw();
    });
    host.appendChild(sl.box);
    r.redraw = draw;
    draw();
  }

  /* ---------- coinlaw：大数定律（p） ---------- */
  function renderCoinlaw(host, spec) {
    var H = 260;
    var st = { n: 0, heads: 0, pts: [{ n: 0, f: 0.5 }], target: spec.p != null ? spec.p : 0.5 };
    var cap = mkCaption(host);
    var box = mkBox(host);
    var r = setupCanvas(host, H);
    function record() {
      st.pts.push({ n: st.n, f: st.heads / st.n });
      if (st.pts.length > 1400) st.pts = st.pts.filter(function (p, i) { return i % 2 === 0 || i === st.pts.length - 1; });
    }
    function flip(k) {
      for (var i = 0; i < k; i++) { if (Math.random() < st.target) st.heads++; st.n++; }
      record();
      draw();
      cap.textContent = '正面 ' + st.heads + ' 次 / 共掷 ' + st.n + ' 次，频率 = ' +
        (st.heads / st.n).toFixed(4) + '（理论值 ' + st.target.toFixed(2) + '）';
    }
    function reset() {
      st.n = 0; st.heads = 0; st.pts = [{ n: 0, f: 0.5 }];
      cap.textContent = '还没有数据：点一下“掷 1 次”';
      draw();
    }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var padL = 44, padR = 14, padT = 18, padB = 26;
      var X = function (n) { return padL + (Math.log10(Math.max(n, 1)) / Math.log10(Math.max(st.n, 100))) * (W - padL - padR); };
      var Y = function (f) { return padT + (1 - f) * (H - padT - padB); };
      ctx.fillStyle = tc.bg;
      ctx.fillRect(0, 0, W, H);
      for (var g = 0; g <= 4; g++) {
        var f = g / 4;
        ctx.strokeStyle = g === 2 ? 'rgba(58,125,68,0.55)' : tc.grid;
        if (g === 2) ctx.setLineDash([5, 4]);
        line(ctx, padL, Y(f), W - padR, Y(f));
        ctx.setLineDash([]);
        ctx.fillStyle = tc.axis;
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(f.toFixed(2), padL - 5, Y(f) + 4);
      }
      ctx.strokeStyle = tc.b;
      ctx.lineWidth = 2;
      ctx.beginPath();
      st.pts.forEach(function (p, i) {
        var x = X(p.n), y = Y(p.f);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      var last = st.pts[st.pts.length - 1];
      ctx.beginPath();
      ctx.arc(X(last.n), Y(last.f), 5, 0, Math.PI * 2);
      ctx.fillStyle = tc.b;
      ctx.fill();
      ctx.fillStyle = tc.fg;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('理论概率 ' + st.target.toFixed(2), padL + 4, Y(st.target) - 6);
      ctx.textAlign = 'center';
      [1, 10, 100, 1000, 10000].forEach(function (v) {
        if (v <= Math.max(st.n, 100)) ctx.fillText(String(v), X(v), H - padB + 15);
      });
    }
    [['掷 1 次', 1], ['+100', 100], ['+1000', 1000], ['+100000', 100000]].forEach(function (pair) {
      var b = mkBtn(pair[0]);
      b.addEventListener('click', function () { flip(pair[1]); });
      box.appendChild(b);
    });
    var rst = mkBtn('重置');
    rst.addEventListener('click', reset);
    box.appendChild(rst);
    r.redraw = draw;
    reset();
  }

  /* ---------- statdots：拖数据点看均值与标准差（min/max/n） ---------- */
  function renderStatdots(host, spec) {
    var H = 240;
    var LO = spec.min != null ? spec.min : 0;
    var HI = spec.max != null ? spec.max : 10;
    var N = clamp(spec.n || 8, 3, 14);
    var vals = [];
    function shuffle() {
      vals = [];
      for (var i = 0; i < N; i++) vals.push(Math.round(((LO + HI) / 2 + (Math.random() - 0.5) * (HI - LO) * 0.8) * 10) / 10);
    }
    shuffle();
    var cap = mkCaption(host);
    var box = mkBox(host);
    var r = setupCanvas(host, H);
    var geo = {};
    function stats() {
      var m = vals.reduce(function (s, v) { return s + v; }, 0) / vals.length;
      var varr = vals.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / vals.length;
      return { mean: m, sd: Math.sqrt(varr), varr: varr };
    }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      geo.pad = 26;
      var axisY = H - 52;
      var dotY = H * 0.38;
      geo.axisY = axisY; geo.dotY = dotY;
      ctx.clearRect(0, 0, W, H);
      var s = stats();
      function X(v) { return geo.pad + ((v - LO) / (HI - LO)) * (W - geo.pad * 2); }
      geo.X = X;
      ctx.fillStyle = 'rgba(47,93,138,0.14)';
      ctx.fillRect(X(s.mean - s.sd), 30, X(s.mean + s.sd) - X(s.mean - s.sd), axisY - 30);
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 4;
      line(ctx, geo.pad, axisY, W - geo.pad, axisY);
      ctx.fillStyle = tc.axis;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      for (var v = Math.ceil(LO); v <= HI; v++) {
        ctx.fillRect(X(v) - 0.5, axisY - 8, 1, 16);
        ctx.fillText(String(v), X(v), axisY + 22);
      }
      ctx.strokeStyle = tc.e;
      ctx.lineWidth = 3;
      line(ctx, X(s.mean), axisY - 6, X(s.mean), axisY + 6);
      ctx.beginPath();
      ctx.moveTo(X(s.mean), axisY - 14);
      ctx.lineTo(X(s.mean) - 6, axisY - 24);
      ctx.lineTo(X(s.mean) + 6, axisY - 24);
      ctx.closePath();
      ctx.fillStyle = tc.e;
      ctx.fill();
      ctx.font = '700 12px system-ui';
      ctx.fillText('均值', X(s.mean), axisY - 30);
      vals.forEach(function (val, i) {
        var x = X(val);
        geo['d' + i] = x;
        ctx.beginPath();
        ctx.arc(x, dotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = tc.b;
        ctx.fill();
        ctx.strokeStyle = tc.bg;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      ctx.textAlign = 'left';
      ctx.font = '600 13px monospace';
      ctx.fillStyle = tc.fg;
      ctx.fillText('均值=' + s.mean.toFixed(2), geo.pad, 20);
      ctx.fillStyle = tc.d;
      ctx.fillText('方差=' + s.varr.toFixed(2), geo.pad + 140, 20);
      ctx.fillStyle = tc.c;
      ctx.fillText('标准差=' + s.sd.toFixed(2), geo.pad + 280 > W ? geo.pad : geo.pad + 280, 20);
      cap.textContent = '蓝色阴影 = [均值−σ, 均值+σ]：大约 2/3 的数据会落在这个区间（拖蓝点试试）';
    }
    r.redraw = draw;
    r.canvas.classList.add('ml-drag');
    var dragIdx = -1;
    r.canvas.addEventListener('pointerdown', function (e) {
      var rect = r.canvas.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (Math.abs(y - geo.dotY) > 26) return;
      for (var i = 0; i < vals.length; i++) {
        if (Math.abs(x - geo['d' + i]) < 14) {
          dragIdx = i;
          r.canvas.setPointerCapture(e.pointerId);
          break;
        }
      }
    });
    r.canvas.addEventListener('pointermove', function (e) {
      if (dragIdx < 0) return;
      var rect = r.canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var v = LO + ((x - geo.pad) / (r.W - geo.pad * 2)) * (HI - LO);
      vals[dragIdx] = Math.round(clamp(v, LO, HI) * 10) / 10;
      draw();
    });
    r.canvas.addEventListener('pointerup', function () { dragIdx = -1; });
    var again = mkBtn('换一批数据');
    again.addEventListener('click', function () { shuffle(); draw(); });
    box.appendChild(again);
    draw();
  }

  /* ---------- dice：骰子频率直方图（dice=1|2） ---------- */
  function renderDice(host, spec) {
    var H = 280;
    var two = spec.dice !== 1;
    var MIN = two ? 2 : 1;
    var MAXF = two ? 12 : 6;
    var FACES = MAXF - MIN + 1;
    /* 理论值：两骰求和是三角形分布（7 最常见），单骰均匀分布 */
    var ways = function (s) { return two ? 6 - Math.abs(s - 7) : 1; };
    var TOTAL = two ? 36 : 6;
    var thMean = two ? 7 : 3.5;
    var thSd = two ? Math.sqrt(35 / 6) : Math.sqrt(35 / 12);
    var st = { counts: new Array(FACES).fill(0), n: 0, s1: 0, s2: 0 };
    var cap = mkCaption(host);
    var box = mkBox(host);
    var r = setupCanvas(host, H);
    function roll(k) {
      for (var i = 0; i < k; i++) {
        var a = 1 + Math.floor(Math.random() * 6);
        var b = two ? 1 + Math.floor(Math.random() * 6) : 0;
        st.counts[a + b - MIN]++;
        st.n++;
        st.s1 += a + b;
        st.s2 += (a + b) * (a + b);
      }
      draw();
    }
    function reset() {
      st.counts = new Array(FACES).fill(0);
      st.n = 0; st.s1 = 0; st.s2 = 0;
      cap.textContent = '还没有数据：点一下“掷 1 次”';
      draw();
    }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var padL = 40, padR = 14, padB = 30, topPad = 46;
      var maxFreq = Math.max.apply(null, [0.05].concat(st.counts.map(function (c) { return st.n ? c / st.n : 0; })));
      var bw = Math.min(64, (W - padL - padR) / FACES - 8);
      var baseY = H - padB;
      var usable = baseY - topPad;
      ctx.strokeStyle = tc.axis;
      ctx.lineWidth = 1.4;
      line(ctx, padL - 8, baseY, W - 12, baseY);
      for (var i = 0; i < FACES; i++) {
        var s = MIN + i;
        var x = padL + i * (bw + 8);
        var f = st.n ? st.counts[i] / st.n : 0;
        var h = (f / maxFreq) * usable;
        ctx.fillStyle = 'rgba(47,93,138,0.55)';
        ctx.fillRect(x, baseY - h, bw, Math.max(h, 0));
        ctx.strokeStyle = 'rgba(47,93,138,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, baseY - h, bw, Math.max(h, 0));
        var yTh = baseY - (ways(s) / TOTAL / maxFreq) * usable;
        ctx.strokeStyle = tc.e;
        ctx.lineWidth = 2.5;
        line(ctx, x - 3, yTh, x + bw + 3, yTh);
        ctx.fillStyle = tc.fg;
        ctx.font = '600 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(s), x + bw / 2, baseY + 16);
        if (st.counts[i]) ctx.fillText(String(st.counts[i]), x + bw / 2, baseY - h - 5);
      }
      ctx.textAlign = 'left';
      ctx.font = '600 13px monospace';
      ctx.fillStyle = tc.fg;
      if (!st.n) {
        ctx.fillText('橙色刻度 = 理论概率（' + (two ? '两骰和的三角形分布' : '均匀分布') + '）', padL - 8, 22);
      } else {
        var m = st.s1 / st.n;
        var sd = Math.sqrt(Math.max(st.s2 / st.n - m * m, 0));
        ctx.fillText('均值 ' + m.toFixed(3) + '（理论 ' + thMean + '）', padL - 8, 22);
        ctx.fillStyle = tc.d;
        ctx.fillText('标准差 ' + sd.toFixed(3) + '（理论 ' + thSd.toFixed(4) + '…）', padL - 8, 40);
      }
      cap.textContent = !st.n
        ? (two ? '两颗骰子求和：为什么“7 点”最常见？' : '单骰：每个点数机会均等')
        : '共掷 ' + st.n + ' 次。大量重复后，柱高会稳定贴在橙色刻度上，均值/标准差也会闭合到理论值——又一次大数定律';
    }
    [['掷 1 次', 1], ['+100', 100], ['+1000', 1000]].forEach(function (pair) {
      var b = mkBtn(pair[0]);
      b.addEventListener('click', function () { roll(pair[1]); });
      box.appendChild(b);
    });
    var rst = mkBtn('重置');
    rst.addEventListener('click', reset);
    box.appendChild(rst);
    r.redraw = draw;
    reset();
  }

  /* ---------- datachart：条形图与零基线（labels/values） ---------- */
  function renderDatachart(host, spec) {
    var labels = Array.isArray(spec.labels) && spec.labels.length ? spec.labels.map(String) : ['甲', '乙', '丙'];
    var values = Array.isArray(spec.values) ? spec.values.slice(0, labels.length).map(function (v) { return Number(v) || 0; }) : [4, 6, 9];
    while (values.length < labels.length) values.push(5);
    var state = { values: values, zero: true };
    var H = 290, padL = 40, padB = 38, padT = 32;
    var cap = mkCaption(host);
    var r = setupCanvas(host, H);
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var maxV = Math.max.apply(null, [10].concat(state.values));
      var low = Math.min.apply(null, state.values);
      var minV = state.zero ? 0 : Math.max(0.05, low - Math.max(0.5, (maxV - low) * 0.18));
      var Y = function (v) { return padT + (maxV - v) / ((maxV - minV) || 1) * (H - padT - padB); };
      var n = labels.length;
      var gap = (W - padL - 20) / n;
      var bw = Math.max(1, Math.min(64, gap * 0.55));
      var labFont = 12, valFont = 12, labelStep = 1, skipValues = false;
      if (n > 6) {
        /* 类目超过 6 根：字号随间距缩放，极端密集时抽稀名称/省略数值 */
        var widest = labels.reduce(function (mx, s) { return Math.max(mx, s.length); }, 1);
        var asciiOnly = labels.every(function (s) { return !/[^\x00-\x7f]/.test(s); });
        var charPx = asciiOnly ? 6.6 : 12;
        labFont = Math.max(7, Math.min(12, Math.floor((gap / (charPx * widest)) * 12)));
        valFont = Math.max(7, Math.min(12, Math.floor(gap * 0.38)));
        if (widest * (charPx / 12) * labFont > gap) labelStep = Math.ceil((widest * (charPx / 12) * labFont * 1.05) / gap);
        var maxLen = state.values.reduce(function (mx, v) { return Math.max(mx, String(v).length); }, 1);
        skipValues = maxLen * valFont * 0.66 > gap;
      }
      ctx.strokeStyle = tc.grid;
      for (var step = 0; step <= 4; step++) {
        var v = minV + (maxV - minV) * step / 4;
        line(ctx, padL, Y(v), W - 16, Y(v));
        ctx.fillStyle = tc.axis;
        ctx.textAlign = 'right';
        ctx.font = '11px system-ui';
        ctx.fillText(v.toFixed(state.zero ? 0 : 1), padL - 6, Y(v) + 4);
      }
      ctx.strokeStyle = tc.axis;
      line(ctx, padL, padT, padL, H - padB);
      line(ctx, padL, Y(minV), W - 16, Y(minV));
      labels.forEach(function (label, i) {
        var x = padL + gap * i + (gap - bw) / 2;
        var y = Y(state.values[i]);
        ctx.fillStyle = 'rgba(47,93,138,0.72)';
        ctx.fillRect(x, y, bw, Y(minV) - y);
        ctx.strokeStyle = tc.b;
        ctx.strokeRect(x, y, bw, Y(minV) - y);
        ctx.fillStyle = tc.fg;
        ctx.textAlign = 'center';
        ctx.font = labFont + 'px system-ui';
        if (i % labelStep === 0) ctx.fillText(label, x + bw / 2, H - padB + 18);
        if (!skipValues) {
          ctx.font = '600 ' + valFont + 'px monospace';
          ctx.fillText(String(state.values[i]), x + bw / 2, y - 12);
        }
      });
      var denseNote = '';
      if (n > 6) {
        if (labelStep > 1) denseNote += '（类目较密：每 ' + labelStep + ' 根标注一个名称）';
        if (skipValues) denseNote += '（数值过密，柱顶数字省略）';
      }
      cap.textContent =
        (state.zero ? '零基线：柱高和数据大小比例一致。' : '非零基线：微小差距被放大了。看图先问纵轴从哪里开始。') + denseNote;
    }
    r.redraw = draw;
    var box = mkBox(host);
    var btn = mkBtn('切换零基线 / 非零基线');
    btn.addEventListener('click', function () { state.zero = !state.zero; draw(); });
    box.appendChild(btn);
    draw();
  }

  /* ---------- counting：排列与组合（n/k） ---------- */
  function renderCounting(host, spec) {
    var state = {
      n: Math.min(6, Math.max(2, spec.n || 4)),
      k: 1
    };
    state.k = clamp(spec.k != null ? Math.round(spec.k) : 2, 1, state.n);
    var colors = ['#2f5d8a', '#c47f17', '#3a7d44', '#7c3aed', '#b3402a', '#00838f'];
    var H = 300;
    var cap = mkCaption(host);
    var r = setupCanvas(host, H);
    function combinations(items, k) {
      if (!k) return [[]];
      if (items.length < k) return [];
      var rest = items.slice(1);
      return combinations(rest, k - 1).map(function (g) { return [items[0]].concat(g); }).concat(combinations(rest, k));
    }
    function permutations(group) {
      if (group.length <= 1) return [group];
      return group.flatMap(function (item, i) {
        return permutations(group.slice(0, i).concat(group.slice(i + 1))).map(function (tail) { return [item].concat(tail); });
      });
    }
    function permCount(n, k) {
      var total = 1;
      for (var i = 0; i < k; i++) total *= n - i;
      return total;
    }
    function draw() {
      var ctx = r.ctx, W = r.W, tc = themeColors();
      ctx.clearRect(0, 0, W, H);
      var items = [];
      for (var i = 0; i < state.n; i++) items.push(i);
      var allGroups = combinations(items, state.k);
      var rowStep = Math.min(24, (H - 82) / 9);
      var maxRows = Math.max(1, Math.floor((H - 82) / rowStep) + 1);
      var groups = allGroups.slice(0, maxRows);
      var orders = groups.flatMap(permutations).slice(0, maxRows);
      var radius = Math.min(10, (W / 2 - 40) / (state.k + 1));
      function panel(list, x0, title, count, color) {
        ctx.fillStyle = tc.fg;
        ctx.textAlign = 'left';
        ctx.font = '600 13px system-ui';
        ctx.fillText(title, x0, 28);
        ctx.font = '12px monospace';
        ctx.fillStyle = color;
        ctx.fillText(count, x0, 48);
        list.forEach(function (row, ri) {
          row.forEach(function (item, ci) {
            ctx.beginPath();
            ctx.arc(x0 + ci * radius * 2.35 + radius + 2, 68 + ri * rowStep, radius - 2, 0, Math.PI * 2);
            ctx.fillStyle = colors[item];
            ctx.fill();
          });
        });
      }
      var pc = permCount(state.n, state.k);
      panel(groups, 24, '组合：只挑团队', 'C=' + allGroups.length + (allGroups.length > maxRows ? '（显示前' + maxRows + '行）' : ''), '#3a7d44');
      panel(orders, W / 2 + 8, '排列：还要排顺序', 'P=' + pc + (pc > orders.length ? '（显示前' + orders.length + '行）' : ''), '#b3402a');
      cap.textContent = '左边同一批圆点不管怎么站都只算一次；右边换个站位就是一条新的排列。';
    }
    r.redraw = draw;
    var sl = buildSliders([
      { name: 'n', min: 2, max: 6, step: 1, value: state.n },
      { name: 'k', min: 1, max: state.n, step: 1, value: state.k }
    ], function (next) {
      state.n = Math.round(next.n);
      state.k = clamp(Math.round(next.k), 1, state.n);
      var refs = sl.refs;
      refs.k.range.max = String(state.n);
      refs.k.range.value = String(Math.min(Number(refs.k.range.value), state.n));
      refs.k.val.textContent = refs.k.range.value;
      draw();
    });
    host.appendChild(sl.box);
    draw();
  }

  /* ---------- 挂载 ---------- */
  var RENDERERS = {
    plot: renderPlot,
    datachart: renderDatachart,
    seq: renderSeq,
    sines: renderSines,
    unitcircle: renderUnitcircle,
    wave: renderWave,
    dice: renderDice,
    statdots: renderStatdots,
    coinlaw: renderCoinlaw,
    counting: renderCounting
  };

  function mount(root) {
    root.querySelectorAll('.ml-viz[data-viz]').forEach(function (card) {
      if (card.dataset.pvBound) return;
      card.dataset.pvBound = '1';
      var spec = null;
      try { spec = JSON.parse(decodeURIComponent(card.dataset.viz)); } catch (e) { /* 非法 spec 保留占位 */ }
      if (!spec || !spec.type) return;
      var fn = RENDERERS[spec.type];
      if (!fn) return; /* 章节专属组件：保留占位卡与主站链接 */
      var ph = card.querySelector('.ml-viz-ph');
      if (!ph) return;
      ph.textContent = '';
      ph.classList.add('is-live');
      try {
        fn(ph, spec);
      } catch (e) {
        var err = document.createElement('div');
        err.className = 'pv-err';
        err.textContent = '组件渲染失败：' + e.message;
        ph.appendChild(err);
      }
    });
  }

  return { mount: mount };
})();
