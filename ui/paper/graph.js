/* 数学阶梯 · 纸墨版知识图谱页
   逐课泳道：每行一章、每点一课，曲线是先修关系。
   滚轮缩放 / 拖动平移 / 悬停看先修(绿)与后继(橙) / 点击进课。 */
window.MLPaperGraph = (function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function render(box, meta, opts) {
    var isDone = opts.isDone || function () { return false; };
    var onOpen = opts.onOpen || function () {};

    var chapters = meta.chapters;
    var laneOf = {};
    chapters.forEach(function (c, i) { laneOf[c.dir] = i; });

    var ML = 120, MT = 30, DX = 13, DY = 40;
    var flat = meta.flat || [];
    var fullW = ML + flat.length * DX + 40;
    var fullH = MT + chapters.length * DY + 50;

    /* 节点与邻接表 */
    var nodes = flat.map(function (l, i) {
      var lane = laneOf[l.chDir] != null ? laneOf[l.chDir] : 0;
      return { i: i, id: l.id, title: l.title, chDir: l.chDir, lane: lane, x: ML + i * DX, y: MT + lane * DY };
    });
    var pre = [], dep = []; /* pre[i]=先修课下标集合，dep[j]=后继课下标集合 */
    flat.forEach(function (_, i) { pre[i] = []; dep[i] = []; });
    (meta.edges || []).forEach(function (e) {
      var lesson = e[0], prereq = e[1];
      if (nodes[lesson] && nodes[prereq]) {
        pre[lesson].push(prereq);
        dep[prereq].push(lesson);
      }
    });

    box.innerHTML =
      '<div class="pg-tools">' +
        '<select class="pg-jump"><option value="">跳到章节…</option>' +
          chapters.map(function (c) { return '<option value="' + esc(c.dir) + '">' + String(c.n).padStart(2, '0') + ' ' + esc(c.title) + '</option>'; }).join('') +
        '</select>' +
        '<button type="button" class="pg-zi">＋</button>' +
        '<button type="button" class="pg-zo">－</button>' +
        '<button type="button" class="pg-zr">复位</button>' +
      '</div>' +
      '<div class="pg-legend">已学<i style="background:var(--cinnabar)"></i>未学<i style="background:var(--card);border:1px solid var(--ink)"></i>先修<i style="background:var(--green)"></i>后继<i style="background:var(--orange)"></i></div>' +
      '<div class="pg-tip"></div>';

    var svg = svgEl('svg', { viewBox: '0 0 ' + fullW + ' ' + fullH, preserveAspectRatio: 'xMinYMin meet' });
    box.insertBefore(svg, box.firstChild);
    var world = svgEl('g', {});
    svg.appendChild(world);

    /* 泳道底色与章名 */
    var laneG = svgEl('g', {});
    world.appendChild(laneG);
    chapters.forEach(function (c, i) {
      var y = MT + i * DY;
      laneG.appendChild(svgEl('line', { class: 'pg-laneline', x1: 0, y1: y + DY / 2, x2: fullW, y2: y + DY / 2 }));
      var t = svgEl('text', { class: 'pg-lane', x: ML - 12, y: y + 4, 'text-anchor': 'end' });
      t.textContent = String(c.n).padStart(2, '0') + ' ' + (c.title.length > 7 ? c.title.slice(0, 7) + '…' : c.title);
      var tt = svgEl('title', {});
      tt.textContent = c.title;
      t.appendChild(tt);
      laneG.appendChild(t);
    });

    /* 边 */
    var edgeG = svgEl('g', {});
    world.appendChild(edgeG);
    var edgeEls = [];
    (meta.edges || []).forEach(function (e) {
      var a = nodes[e[1]], b = nodes[e[0]];
      if (!a || !b) return;
      var dx = Math.max(20, (b.x - a.x) * 0.4);
      var p = svgEl('path', {
        class: 'pg-edge',
        d: 'M ' + a.x + ' ' + a.y + ' C ' + (a.x + dx) + ' ' + a.y + ', ' + (b.x - dx) + ' ' + b.y + ', ' + b.x + ' ' + b.y
      });
      edgeG.appendChild(p);
      edgeEls.push({ el: p, from: e[1], to: e[0] });
    });

    /* 节点 */
    var nodeG = svgEl('g', {});
    world.appendChild(nodeG);
    nodes.forEach(function (n) {
      var c = svgEl('circle', { class: 'pg-node' + (isDone(n.id) ? ' is-done' : ''), cx: n.x, cy: n.y, r: 4.5, 'data-i': n.i });
      nodeG.appendChild(c);
      n.el = c;
    });

    /* 视口变换 */
    var tx = 10, ty = 12, k = 1;
    function apply() { world.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + k + ')'); }
    function boxW() { return box.clientWidth || 800; }
    function boxH() { return box.clientHeight || 500; }
    function resetView() {
      k = Math.min((boxH() - 24) / fullH, 1);
      tx = 10;
      ty = (boxH() - fullH * k) / 2;
      apply();
    }
    resetView();
    function zoomAt(mx, my, factor) {
      var k2 = Math.min(4, Math.max(0.05, k * factor));
      tx = mx - (mx - tx) * (k2 / k);
      ty = my - (my - ty) * (k2 / k);
      k = k2;
      apply();
    }
    svg.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var rect = svg.getBoundingClientRect();
      zoomAt(ev.clientX - rect.left, ev.clientY - rect.top, ev.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
    var pan = null;
    svg.addEventListener('pointerdown', function (ev) {
      if (ev.target.classList && ev.target.classList.contains('pg-node')) return;
      pan = { x: ev.clientX, y: ev.clientY, tx: tx, ty: ty };
      svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener('pointermove', function (ev) {
      if (!pan) return;
      tx = pan.tx + (ev.clientX - pan.x);
      ty = pan.ty + (ev.clientY - pan.y);
      apply();
    });
    svg.addEventListener('pointerup', function () { pan = null; });

    box.querySelector('.pg-zi').addEventListener('click', function () { zoomAt(boxW() / 2, boxH() / 2, 1.35); });
    box.querySelector('.pg-zo').addEventListener('click', function () { zoomAt(boxW() / 2, boxH() / 2, 1 / 1.35); });
    box.querySelector('.pg-zr').addEventListener('click', resetView);
    box.querySelector('.pg-jump').addEventListener('change', function () {
      var dir = this.value;
      if (!dir) return;
      var lane = laneOf[dir];
      var xs = nodes.filter(function (n) { return n.chDir === dir; }).map(function (n) { return n.x; });
      if (!xs.length) return;
      var x0 = Math.min.apply(null, xs) - 30, x1 = Math.max.apply(null, xs) + 30;
      var y = MT + lane * DY;
      k = Math.min(2.5, Math.max(0.2, (boxW() - 40) / (x1 - x0)));
      tx = 20 - x0 * k;
      ty = boxH() / 2 - y * k;
      apply();
      this.value = '';
    });

    /* 悬停高亮 + 提示 */
    var tip = box.querySelector('.pg-tip');
    function clearHot() {
      svg.classList.remove('has-hot');
      nodes.forEach(function (n) { n.el.classList.remove('is-hot', 'is-pre', 'is-dep'); });
      edgeEls.forEach(function (e) { e.el.classList.remove('is-pre', 'is-dep'); });
      tip.style.display = 'none';
    }
    nodeG.addEventListener('pointerover', function (ev) {
      var t = ev.target;
      if (!t.classList || !t.classList.contains('pg-node')) return;
      var i = Number(t.getAttribute('data-i'));
      var n = nodes[i];
      clearHot();
      svg.classList.add('has-hot');
      t.classList.add('is-hot');
      pre[i].forEach(function (j) { nodes[j].el.classList.add('is-pre'); });
      dep[i].forEach(function (j) { nodes[j].el.classList.add('is-dep'); });
      edgeEls.forEach(function (e) {
        if (e.to === i) e.el.classList.add('is-pre');
        if (e.from === i) e.el.classList.add('is-dep');
      });
      var ch = chapters[n.lane];
      tip.innerHTML = '<b>' + esc(n.title) + '</b><br>' + esc(ch ? ch.title : '') +
        (isDone(n.id) ? ' · 已学 ✓' : '') +
        (pre[i].length ? '<br>先修 ' + pre[i].length + ' 课' : '') +
        (dep[i].length ? ' · 托起 ' + dep[i].length + ' 课' : '');
      tip.style.display = 'block';
      var rect = box.getBoundingClientRect();
      var x = ev.clientX - rect.left + 14;
      var y = ev.clientY - rect.top + 10;
      tip.style.left = Math.min(x, rect.width - 300) + 'px';
      tip.style.top = Math.min(y, rect.height - 80) + 'px';
    });
    nodeG.addEventListener('pointerout', function (ev) {
      if (!ev.relatedTarget || !ev.relatedTarget.classList || !ev.relatedTarget.classList.contains('pg-node')) clearHot();
    });
    nodeG.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t.classList || !t.classList.contains('pg-node')) return;
      var i = Number(t.getAttribute('data-i'));
      onOpen(nodes[i].id);
    });
    svg.addEventListener('pointerleave', clearHot);
  }

  return { render: render };
})();
