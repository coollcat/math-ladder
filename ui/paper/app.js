/* 数学阶梯 · 纸墨版主程序
   hash 路由（#/ · #/chap/NN-dir · #/read/NN-dir/MM-file · #/graph）、
   目录树 + 搜索、学习进度（ml-ui-progress）、quiz/判题/运行按钮接线。 */
(function () {
  'use strict';

  var PROG_KEY = 'ml-ui-progress';
  var EX_KEY = 'ml-ui-exercises';

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) | 0) >>> 0;
    return h.toString(36);
  }
  function api(path) {
    return fetch(path)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || '加载失败'); return j; });
  }

  var meta = null;
  var progress = loadJSON(PROG_KEY, {});
  var chByDir = {};
  var page = null;

  /* ---------- 进度 ---------- */
  function isDone(id) { return !!progress[id]; }
  function setDone(id, v) {
    if (v) progress[id] = true; else delete progress[id];
    saveJSON(PROG_KEY, progress);
  }
  function chProgress(ch) {
    var total = 0, done = 0;
    ch.lessons.forEach(function (l) {
      if (l.isIndex) return;
      total++;
      if (isDone(l.id)) done++;
    });
    return { total: total, done: done };
  }

  /* ---------- 目录树 ---------- */
  function buildTree() {
    var tree = $('#tree');
    tree.innerHTML = '';
    meta.volumes.forEach(function (vol, vi) {
      var chaps = meta.chapters.filter(function (c) { return c.volume === vi; });
      if (!chaps.length) return;
      var volEl = document.createElement('div');
      volEl.className = 't-vol';
      var head = document.createElement('div');
      head.className = 't-vol-name';
      head.textContent = vol.n + ' · ' + vol.title;
      volEl.appendChild(head);
      chaps.forEach(function (ch) {
        chByDir[ch.dir] = ch;
        var p = chProgress(ch);
        var chEl = document.createElement('div');
        chEl.className = 't-chap';
        chEl.dataset.dir = ch.dir;
        var row = document.createElement('a');
        row.className = 't-chap-row';
        row.href = '#/chap/' + ch.dir;
        row.innerHTML =
          '<span class="t-num">' + String(ch.n).padStart(2, '0') + '</span>' +
          '<span class="t-title">' + esc(ch.title) + '</span>' +
          '<span class="t-prog">' + (p.total ? p.done + '/' + p.total : '') + '</span>';
        var lessons = document.createElement('div');
        lessons.className = 't-lessons';
        ch.lessons.forEach(function (l) {
          if (l.isIndex) return;
          var a = document.createElement('a');
          a.className = 't-lesson' + (isDone(l.id) ? ' is-done' : '');
          a.dataset.id = l.id;
          a.href = '#/read/' + l.id;
          a.innerHTML = '<span class="t-dot"></span><span class="t-ltitle">' + esc(l.title) + '</span>';
          lessons.appendChild(a);
        });
        chEl.appendChild(row);
        chEl.appendChild(lessons);
        volEl.appendChild(chEl);
      });
      tree.appendChild(volEl);
    });
  }

  function refreshTree(route) {
    var readId = route.name === 'read' ? route.id : null;
    var chapDir = route.name === 'chap' ? route.dir : (readId ? readId.split('/')[0] : null);
    document.querySelectorAll('#tree .t-chap').forEach(function (chEl) {
      var isCur = chEl.dataset.dir === chapDir;
      chEl.classList.toggle('is-active', isCur);
      if (isCur) chEl.classList.add('is-open');
    });
    document.querySelectorAll('#tree .t-lesson').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.id === readId);
    });
    document.querySelectorAll('#topnav a[data-nav]').forEach(function (a) {
      a.classList.toggle('is-active',
        (a.dataset.nav === 'graph' && route.name === 'graph') ||
        (a.dataset.nav === 'home' && route.name === 'home'));
    });
  }

  function updateTreeLesson(id) {
    var a = document.querySelector('#tree .t-lesson[data-id="' + id + '"]');
    if (a) a.classList.toggle('is-done', isDone(id));
    var dir = id.split('/')[0];
    var ch = chByDir[dir];
    var chEl = document.querySelector('#tree .t-chap[data-dir="' + dir + '"]');
    if (ch && chEl) {
      var p = chProgress(ch);
      var prog = chEl.querySelector('.t-prog');
      if (prog) prog.textContent = p.total ? p.done + '/' + p.total : '';
    }
  }

  /* ---------- 互动接线 ---------- */
  function wireQuiz(root) {
    root.querySelectorAll('.ml-quiz[data-mlq]').forEach(function (q) {
      if (q.dataset.pBound) return;
      q.dataset.pBound = '1';
      var ok = -1;
      try { ok = parseInt(atob(q.dataset.qk || ''), 10); } catch (e) { }
      var opts = q.querySelectorAll('.mlq-opt');
      opts.forEach(function (b, i) {
        b.addEventListener('click', function () {
          if (q.classList.contains('is-done')) return;
          if (i === ok) {
            q.classList.add('is-done');
            b.classList.add('is-right');
            var expl = q.querySelector('.ml-expl');
            if (expl) expl.hidden = false;
          } else {
            b.classList.add('is-wrong');
            setTimeout(function () { b.classList.remove('is-wrong'); }, 650);
          }
        });
      });
    });
  }

  function wireRunButtons(root) {
    root.querySelectorAll('.ml-runbtn[data-mlpy]').forEach(function (btn) {
      if (btn.dataset.pBound) return;
      btn.dataset.pBound = '1';
      btn.addEventListener('click', function () {
        var code = '';
        try { code = decodeURIComponent(btn.dataset.mlpy || ''); } catch (e) { }
        var title = btn.dataset.mlt || '';
        if (btn.dataset.mlpyex) window.MLPaperConsole.openExercise(code, title, btn.dataset.mlpyex);
        else window.MLPaperConsole.openPython(code, title);
      });
    });
  }

  function refreshExerciseBadges(root) {
    var passes = loadJSON(EX_KEY, {});
    root.querySelectorAll('.ml-runbtn[data-mlpyex]').forEach(function (btn) {
      var key = hashStr(decodeURIComponent(btn.dataset.mlpyex));
      var head = btn.closest('.ml-card-head');
      if (!head) return;
      var old = head.querySelector('.p-pass');
      var passed = !!passes[key];
      if (passed && !old) {
        var chip = document.createElement('span');
        chip.className = 'p-pass';
        chip.textContent = '已通过 ✓';
        head.insertBefore(chip, btn);
      } else if (!passed && old) {
        old.remove();
      }
    });
  }

  function wireContent(root) {
    wireQuiz(root);
    wireRunButtons(root);
    if (window.MLPaperViz) window.MLPaperViz.mount(root);
    refreshExerciseBadges(root);
  }

  window.addEventListener('ml-paper:exercise-passed', function () {
    if (page) refreshExerciseBadges(page);
  });

  /* ---------- 页面：首页 ---------- */
  function renderHome(el) {
    var st = meta.stats;
    var doneTotal = Object.keys(progress).length;
    var html =
      '<section class="hero">' +
        '<div class="hero-seal">阶</div>' +
        '<h1>数学阶梯</h1>' +
        '<p class="hero-sub">从 1+1 到傅里叶变换的中文交互式数学教程 —— 纸墨阅读版</p>' +
        '<p class="hero-stats">' + st.chapters + ' 章 · ' + st.lessons + ' 课 · ' + st.edges + ' 条先修线' +
          (doneTotal ? ' · 已学 <b>' + doneTotal + '</b> 课' : '') + '</p>' +
        '<p class="hero-actions">' +
          '<a class="btn primary" href="#/graph">打开知识图谱</a>' +
          (meta.chapters[0] ? '<a class="btn" href="#/chap/' + meta.chapters[0].dir + '">从第一章开始</a>' : '') +
        '</p>' +
      '</section>';
    meta.volumes.forEach(function (vol, vi) {
      var chaps = meta.chapters.filter(function (c) { return c.volume === vi; });
      if (!chaps.length) return;
      var tot = 0, dn = 0;
      chaps.forEach(function (c) { var p = chProgress(c); tot += p.total; dn += p.done; });
      html +=
        '<section class="volsec">' +
          '<div class="vol-head">' +
            '<span class="vol-n">' + esc(vol.n) + '</span>' +
            '<span class="vol-title">' + esc(vol.title) + '</span>' +
            '<span class="vol-range">' + esc(vol.range) + '</span>' +
            (tot ? '<span class="vol-prog">已学 ' + dn + ' / ' + tot + '</span>'
                 : '<span class="vol-status">' + esc(vol.statusLabel) + '</span>') +
          '</div>' +
          '<p class="vol-desc">' + esc(vol.desc) + '</p>' +
          '<div class="cards">' +
            chaps.map(function (c) {
              var p = chProgress(c);
              var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
              return '<a class="card" href="#/chap/' + c.dir + '">' +
                '<span class="card-num">' + String(c.n).padStart(2, '0') + '</span>' +
                '<span class="card-title">' + esc(c.title) + '</span>' +
                (c.desc ? '<span class="card-desc">' + esc(c.desc) + '</span>' : '') +
                '<span class="card-meta">' + p.total + ' 课' + (p.done ? ' · 已学 ' + p.done : '') + '</span>' +
                (pct ? '<span class="card-bar"><i style="width:' + pct + '%"></i></span>' : '') +
              '</a>';
            }).join('') +
          '</div>' +
        '</section>';
    });
    el.innerHTML = html;
  }

  /* ---------- 页面：章 ---------- */
  function renderChapter(el, dir) {
    var ch = chByDir[dir];
    if (!ch) { el.innerHTML = '<div class="err">没有找到这一章。</div>'; return; }
    var p = chProgress(ch);
    var html =
      '<header class="chap-head">' +
        '<div class="chap-num">' + String(ch.n).padStart(2, '0') + '</div>' +
        '<div>' +
          '<h1>' + esc(ch.title) + '</h1>' +
          (ch.desc ? '<p class="chap-desc">' + esc(ch.desc) + '</p>' : '') +
          '<p class="chap-meta">' + p.total + ' 课' + (p.done ? ' · 已学 ' + p.done : '') + '</p>' +
        '</div>' +
      '</header>' +
      '<div class="lessonlist">';
    ch.lessons.forEach(function (l) {
      var done = isDone(l.id);
      html += '<a class="lessonrow' + (done ? ' is-done' : '') + '" href="#/read/' + l.id + '">' +
        '<span class="lr-num">' + (l.isIndex ? '导览' : String(l.num).padStart(2, '0')) + '</span>' +
        '<span class="lr-title">' + esc(l.title) + '</span>' +
        (l.prereqs && l.prereqs.length ? '<span class="lr-pre">先修 ' + l.prereqs.length + '</span>' : '') +
        '<span class="lr-check">' + (done ? '✓' : '') + '</span>' +
      '</a>';
    });
    el.innerHTML = html + '</div>';
  }

  /* ---------- 页面：课 ---------- */
  function renderRead(el, id) {
    el.innerHTML = '<div class="page-loading">研墨中…</div>';
    api('/api/lesson?id=' + encodeURIComponent(id)).then(function (d) {
      var inter = d.interactive || {};
      var chips = [];
      if (inter.quiz) chips.push('测验 ' + inter.quiz);
      if (inter.exercise) chips.push('练习 ' + inter.exercise);
      if (inter.viz) chips.push('互动图 ' + inter.viz);
      el.innerHTML =
        '<header class="read-head">' +
          '<div class="crumb"><a href="#/chap/' + d.chapter.dir + '">' + esc(d.chapter.title) + '</a> /</div>' +
          '<h1>' + esc(d.title) + '</h1>' +
          (d.description ? '<p class="read-desc">' + esc(d.description) + '</p>' : '') +
          '<div class="read-meta">' +
            (d.prereqs && d.prereqs.length
              ? '<span class="pre-label">前置：</span>' + d.prereqs.map(function (p) {
                  return '<a class="prereq" href="#/read/' + p.id + '">' + esc(p.title) + '</a>';
                }).join('')
              : '') +
            (chips.length ? '<span class="chips">本课互动：' + chips.join(' · ') + '</span>' : '') +
          '</div>' +
          '<div class="read-actions">' +
            '<button type="button" id="doneBtn" class="btn"></button>' +
            '<a class="btn ghost" href="' + esc(d.mainLink) + '" target="_blank" rel="noopener">在主站打开 ↗</a>' +
          '</div>' +
        '</header>' +
        '<article class="content" id="content">' + d.html + '</article>' +
        '<nav class="pager">' +
          (d.prev ? '<a class="pager-prev" href="#/read/' + d.prev.id + '">← ' + esc(d.prev.title) + '</a>' : '<span></span>') +
          (d.next ? '<a class="pager-next" href="#/read/' + d.next.id + '">' + esc(d.next.title) + ' →</a>' : '<span></span>') +
        '</nav>';
      var doneBtn = $('#doneBtn');
      function paintDone() {
        var done = isDone(id);
        doneBtn.textContent = done ? '✓ 已学完（点击取消）' : '标为已学完';
        doneBtn.classList.toggle('primary', !done);
        doneBtn.classList.toggle('is-done', done);
      }
      paintDone();
      doneBtn.addEventListener('click', function () {
        setDone(id, !isDone(id));
        paintDone();
        updateTreeLesson(id);
      });
      wireContent($('#content'));
    }).catch(function (e) {
      el.innerHTML = '<div class="err">这节课没读到：' + esc(e.message) + '</div>';
    });
  }

  /* ---------- 页面：图谱 ---------- */
  function renderGraph(el) {
    var doneTotal = Object.keys(progress).length;
    el.innerHTML =
      '<header class="graph-head">' +
        '<h1>知识图谱</h1>' +
        '<p class="graph-sub">每行一章、每点一课，连线是先修关系（共 ' + meta.stats.lessons + ' 课 · ' +
          meta.stats.edges + ' 条先修线 · 已学 ' + doneTotal + ' 课）。滚轮缩放，拖动平移，点击圆点进课。</p>' +
      '</header>' +
      '<div id="graphbox" class="graphbox"></div>';
    window.MLPaperGraph.render($('#graphbox'), meta, {
      isDone: isDone,
      onOpen: function (id) { location.hash = '#/read/' + id; }
    });
  }

  /* ---------- 路由 ---------- */
  function parseRoute() {
    var h = location.hash.replace(/^#/, '');
    if (h.indexOf('/read/') === 0) return { name: 'read', id: h.slice(6) };
    if (h.indexOf('/chap/') === 0) return { name: 'chap', dir: h.slice(6) };
    if (h === '/graph') return { name: 'graph' };
    return { name: 'home' };
  }

  function render() {
    var route = parseRoute();
    closeSide();
    window.scrollTo(0, 0);
    updateScrollProg();
    page = $('#page');
    page.className = 'page';
    refreshTree(route);
    if (route.name === 'read') renderRead(page, route.id);
    else if (route.name === 'chap') renderChapter(page, route.dir);
    else if (route.name === 'graph') renderGraph(page);
    else renderHome(page);
  }

  /* ---------- 阅读进度条 ---------- */
  function updateScrollProg() {
    var bar = $('#scrollprog');
    var route = parseRoute();
    if (route.name !== 'read') { bar.style.width = '0'; return; }
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
  }

  /* ---------- 侧栏（移动端） ---------- */
  function closeSide() { document.body.classList.remove('side-open'); }

  /* ---------- 启动 ---------- */
  function init() {
    page = $('#page');
    api('/api/meta').then(function (m) {
      meta = m;
      $('#mainSiteLink').href = m.mainUrl || 'http://localhost:9452';
      buildTree();
      render();
      window.addEventListener('hashchange', render);
      window.MLPaperConsole.init();
    }).catch(function (e) {
      page.className = 'page';
      page.innerHTML = '<div class="err">目录数据加载失败：' + esc(e.message) + '</div>';
    });

    $('#search').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      document.querySelectorAll('#tree .t-chap').forEach(function (chEl) {
        var chapTitle = chEl.querySelector('.t-title').textContent.toLowerCase();
        var chapHit = !q || chapTitle.indexOf(q) >= 0;
        var anyLesson = chapHit;
        chEl.querySelectorAll('.t-lesson').forEach(function (a) {
          var hit = !q || a.querySelector('.t-ltitle').textContent.toLowerCase().indexOf(q) >= 0;
          a.classList.toggle('is-hidden', !!q && !hit && !chapHit);
          if (hit) anyLesson = true;
        });
        chEl.classList.toggle('is-hidden', !anyLesson);
        chEl.classList.toggle('is-open', !!q && anyLesson);
      });
      document.querySelectorAll('#tree .t-vol').forEach(function (v) {
        var any = Array.prototype.some.call(v.querySelectorAll('.t-chap'), function (c) {
          return !c.classList.contains('is-hidden');
        });
        v.classList.toggle('is-hidden', !any);
      });
    });

    $('#ham').addEventListener('click', function () {
      document.body.classList.toggle('side-open');
    });
    $('#backdrop').addEventListener('click', closeSide);
    window.addEventListener('scroll', updateScrollProg, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
