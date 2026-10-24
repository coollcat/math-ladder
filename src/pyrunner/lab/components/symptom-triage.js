/* =========================================================================
 * lab 组件：symptom-triage —— 方法地图的核心不是「有哪些方法」，是「先分诊」
 *                        （第 68 / 73 / 75 章的「方法地图」课通用）
 * -------------------------------------------------------------------------
 * 演示什么：一张「症状 → 科室」对照表被点活。读者点一个主诉，
 *   立刻看到该挂哪一科、那一科的关键动作，以及**最容易挂错的那一科**——
 *   方法地图课上真正的难点从来不是「不知道有这个方法」，
 *   而是「把症状归错了科，于是用对了工具解错了题」。
 *
 * 用法（症状表由课文自己给，组件不认识任何具体学科）：
 *   { "type": "symptom-triage",
 *     "title": "先分诊，再选工具",
 *     "hint": "点一个症状",
 *     "default": "static",
 *     "symptoms": [
 *       { "id": "static", "label": "电压不对、发热",
 *         "dept": "基尔霍夫与戴维南", "action": "先画参考方向，再写 KCL",
 *         "trap": "以为是器件坏了，其实是工作点跑到饱和区" }
 *     ] }
 *
 * 字段：symptoms 必填（2~9 条）；id/label/dept 必填，action / trap 可省；
 *       default 选中的症状 id；hard 标在症状上表示「最难分诊的一条」。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：直接点画布上的症状卡；或按「最难分诊」跳到那条陷阱题。
 *   2. 即时后果：选中的卡当场填色，下方卡片整块换内容，读数条同步。
 *   3. 读数：症状 / 科室 / 关键动作 / 常被误判为 —— 与正文对照表的列一一对应。
 *   4. 啊哈预设：「最难分诊」直接落在那条「最像 A 科、其实归 B 科」的症状上，
 *      trap 那行用警示色写出来。
 *   5. 默认状态：spec.default 那一条，读者不点任何东西也能读到一条完整分诊。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildToolbar, buildReadout, mkBtn,
  label, clearBg,
} from '../core.js';

const FALLBACK = [
  { id: 'a', label: '症状 A', dept: '科室 A', action: '关键动作 A', trap: '最容易误判的地方' },
  { id: 'b', label: '症状 B', dept: '科室 B', action: '关键动作 B', trap: '最容易误判的地方' },
];

export default function render(host, spec) {
  const rows = (Array.isArray(spec.symptoms) && spec.symptoms.length >= 2 ? spec.symptoms : FALLBACK)
    .filter((r) => r && r.id && r.label && r.dept)
    .map((r) => ({
      id: String(r.id),
      label: String(r.label),
      dept: String(r.dept),
      action: r.action ? String(r.action) : '',
      trap: r.trap ? String(r.trap) : '',
      hard: !!r.hard,
    }));

  const cv = setupCanvas(host, 340);
  const cfg = {
    sel: rows.some((r) => r.id === spec.default) ? spec.default : rows[0].id,
  };
  const hover = { id: null };
  let chips = [];   // [{id, x, y, w, h}]
  let card = null;  // 卡片矩形

  /* 逐字折行：中文没有词边界，按字数切比按空格切准 */
  function wrap(text, width, perChar) {
    if (!text) return [];
    const max = Math.max(4, Math.floor(width / perChar));
    const out = [];
    let cur = '';
    for (const ch of text) {
      cur += ch;
      if (cur.length >= max) { out.push(cur); cur = ''; }
    }
    if (cur) out.push(cur);
    return out;
  }

  function layout(W, H) {
    const narrow = W < 620;
    const cols = narrow ? 1 : 2;
    const gap = 8;
    const padX = 12;
    const top = 26;
    const chipH = 34;
    const availW = W - padX * 2;
    const colW = (availW - gap * (cols - 1)) / cols;
    const out = [];
    rows.forEach((r, i) => {
      const c = i % cols;
      const row = Math.floor(i / cols);
      out.push({
        id: r.id,
        x: padX + c * (colW + gap),
        y: top + row * (chipH + gap),
        w: colW,
        h: chipH,
      });
    });
    const rowsUsed = Math.ceil(rows.length / cols);
    const chipsBottom = top + rowsUsed * (chipH + gap);
    return {
      chips: out,
      card: { x: padX, y: chipsBottom + 8, w: availW, h: Math.max(70, H - chipsBottom - 20) },
    };
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const L = layout(W, H);
    chips = L.chips;
    card = L.card;

    if (spec.hint) label(ctx, String(spec.hint), 12, 16, C.grid, { size: 10.5 });

    /* 症状卡 */
    rows.forEach((r) => {
      const p = chips.find((c) => c.id === r.id);
      if (!p) return;
      const on = cfg.sel === r.id;
      const hot = hover.id === r.id;
      ctx.save();
      ctx.fillStyle = on ? C.ok : (hot ? C.soft : C.bg);
      ctx.strokeStyle = on ? C.ok : (r.hard ? C.accent2 : C.axis);
      ctx.lineWidth = on || r.hard ? 2.2 : 1.2;
      ctx.beginPath();
      const rad = 7;
      const x = p.x;
      const y = p.y;
      const w = p.w;
      const h = p.h;
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + w - rad, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
      ctx.lineTo(x + w, y + h - rad);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      ctx.lineTo(x + rad, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const txt = wrap(r.label, p.w - 16, 12)[0] || r.label;
      label(ctx, txt, p.x + 8, p.y + p.h / 2 + 4, on ? C.bg : C.fg, { size: 11, weight: on ? 700 : 400 });
      if (r.hard) label(ctx, '★', p.x + p.w - 12, p.y + 12, C.accent2, { size: 10, align: 'center' });
    });

    /* 分诊卡 */
    const r = rows.find((x) => x.id === cfg.sel) || rows[0];
    const k = L.card;
    ctx.save();
    ctx.fillStyle = C.soft;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(k.x, k.y, k.w, k.h);
    ctx.restore();
    let y = k.y + 22;
    label(ctx, '症状', k.x + 12, y, C.axis, { size: 10 });
    label(ctx, r.label, k.x + 52, y, C.fg, { size: 11.5, weight: 700 });
    y += 24;
    label(ctx, '科室', k.x + 12, y, C.axis, { size: 10 });
    label(ctx, r.dept, k.x + 52, y, C.ok, { size: 12.5, weight: 700 });
    y += 24;
    if (r.action) {
      const lines = wrap('关键动作：' + r.action, k.w - 24, 11.5);
      lines.slice(0, 3).forEach((ln) => {
        label(ctx, ln, k.x + 12, y, C.fg, { size: 10.5 });
        y += 15;
      });
    }
    if (r.trap) {
      y += 2;
      const lines = wrap('最容易误判：' + r.trap, k.w - 24, 11.5);
      lines.slice(0, 3).forEach((ln) => {
        label(ctx, ln, k.x + 12, y, C.bad, { size: 10.5 });
        y += 15;
      });
    }
  }

  /* ---------- 控件 ---------- */

  const ro = buildReadout({ 症状: '—', 科室: '—', 关键动作: '—', 常被误判为: '—' });
  host.appendChild(ro.box);

  const hardRow = rows.find((r) => r.hard) || rows[rows.length - 1];
  const btnHard = mkBtn('最难分诊的一条');
  btnHard.addEventListener('click', () => { cfg.sel = hardRow.id; refresh(); });
  host.appendChild(buildToolbar(btnHard));

  function refresh() {
    const r = rows.find((x) => x.id === cfg.sel) || rows[0];
    ro.set('症状', r.label);
    ro.set('科室', r.dept);
    ro.set('关键动作', r.action || '—');
    ro.set('常被误判为', r.trap || '—');
    draw();
  }

  /* ---------- 指针 ---------- */

  bindPointer(cv.canvas, {
    pick(px, py) {
      for (const c of chips) {
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return { kind: 'chip', id: c.id };
      }
      return null;
    },
    down(id) {
      if (id && id.kind === 'chip') cfg.sel = id.id;
      refresh();
    },
    move() {},
    up() {},
    hover(px, py) {
      let next = null;
      for (const c of chips) {
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) { next = c.id; break; }
      }
      if (next !== hover.id) { hover.id = next; draw(); }
    },
    leave() {
      if (hover.id !== null) { hover.id = null; draw(); }
    },
  });

  refresh();
  cv.redraw = () => { refresh(); };
  return { destroy() { cv.redraw = null; } };
}
