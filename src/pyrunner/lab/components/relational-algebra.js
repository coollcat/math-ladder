/* 关系代数与 SQL：点一个算子、填好参数，结果表当场算出来，同时给出等价 SQL。
   六个算子 σ π ⋈ ∪ − × 里，⋈ 其实可以由 × + σ + π 合成——代价差距就在笛卡尔积上。 */
import { themeColors, buildSegmented, buildToolbar, buildReadout, el, mkBtn } from '../core.js';

const S = {
  name: 'S', label: '学生', cols: ['sid', 'name', 'dept', 'age'],
  rows: [[1, '张三', 'CS', 20], [2, '李四', 'EE', 21], [3, '王五', 'CS', 19], [4, '赵六', 'MA', 22]],
};
const E = {
  name: 'E', label: '选课', cols: ['sid', 'course', 'score'],
  rows: [[1, 'DB', 92], [1, 'OS', 85], [2, 'DB', 78], [3, 'OS', 90], [5, 'DB', 88]],
};
const OPS = [
  { label: 'σ 选择', value: 'sel' }, { label: 'π 投影', value: 'proj' }, { label: '⋈ 自然连接', value: 'join' },
  { label: '∪ 并', value: 'union' }, { label: '− 差', value: 'diff' }, { label: '× 笛卡尔积', value: 'prod' },
];
const uniq = (arr) => arr.filter((v, i) => arr.indexOf(v) === i);

export default function render(host) {
  const C0 = themeColors();
  let op = 'sel';
  let base = 'S';
  let col = 'dept';
  let val = 'CS';
  let proj = ['dept', 'age'];

  const ro = buildReadout({ 结果行数: '—', 列: '—', 说明: '—' });
  const paramBox = el('div');
  paramBox.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;padding:0.4rem 0.85rem';
  const baseSeg = buildSegmented(
    [{ label: '基于 学生表 S', value: 'S' }, { label: '基于 选课表 E', value: 'E' }],
    base, (v) => { base = v; const t = v === 'S' ? S : E; col = t.cols[0]; val = String(t.rows[0][0]); proj = t.cols.slice(0, 2); build(); },
  );
  host.appendChild(buildSegmented(OPS, op, (v) => { op = v; build(); }));
  host.appendChild(baseSeg);
  host.appendChild(paramBox);
  host.appendChild(ro.box);

  const tableBox = el('div');
  tableBox.style.cssText = 'overflow-x:auto;padding:0.3rem 0.85rem 0.6rem';
  host.appendChild(tableBox);

  const sql = el('pre');
  sql.style.cssText = `margin:0;padding:0.55rem 0.85rem;font:12px/1.6 var(--pyr-mono,monospace);
    white-space:pre-wrap;color:${C0.fg};background:${C0.soft};border-top:1px dashed ${C0.grid}`;
  host.appendChild(sql);

  function table(data) {
    const C = themeColors();
    const tb = el('table');
    tb.style.cssText = `border-collapse:collapse;font:12px var(--pyr-mono,monospace);color:${C.fg};min-width:100%`;
    const thead = el('tr');
    data.cols.forEach((c) => {
      const th = el('th', null, c);
      th.style.cssText = `border:1px solid ${C.grid};padding:3px 10px;background:${C.soft};text-align:left;font-weight:700`;
      thead.appendChild(th);
    });
    tb.appendChild(thead);
    data.rows.forEach((r) => {
      const tr = el('tr');
      r.forEach((v) => {
        const td = el('td', null, String(v));
        td.style.cssText = `border:1px solid ${C.grid};padding:3px 10px`;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    return tb;
  }

  function select(opts, cur, onChange) {
    const s = el('select');
    s.style.cssText = `font:12px var(--pyr-mono,monospace);padding:2px 4px;border-radius:5px;
      border:1px solid ${C0.grid};background:${C0.bg};color:${C0.fg}`;
    opts.forEach((o) => {
      const op2 = el('option', null, String(o));
      op2.value = String(o);
      if (String(o) === String(cur)) op2.selected = true;
      s.appendChild(op2);
    });
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  function compute() {
    const t = base === 'S' ? S : E;
    if (op === 'sel') {
      const i = t.cols.indexOf(col);
      const rows = t.rows.filter((r) => String(r[i]) === String(val));
      return { res: { cols: t.cols, rows }, sqlText: `SELECT * FROM ${t.name}\n WHERE ${col} = ${typeof t.rows[0][i] === 'number' ? val : `'${val}'`};`, note: `σ 是水平筛选：行数变、列数不变（${t.rows.length} → ${rows.length}）` };
    }
    if (op === 'proj') {
      const idx = proj.map((c) => t.cols.indexOf(c)).filter((i) => i >= 0);
      const seen = {};
      const rows = [];
      t.rows.forEach((r) => {
        const row = idx.map((i) => r[i]);
        const k = row.join('');
        if (!seen[k]) { seen[k] = 1; rows.push(row); }
      });
      return { res: { cols: idx.map((i) => t.cols[i]), rows }, sqlText: `SELECT DISTINCT ${idx.map((i) => t.cols[i]).join(', ')}\n FROM ${t.name};`, note: `π 是垂直裁剪：列数变、行数可能变少（关系要自动去重，${t.rows.length} → ${rows.length}）` };
    }
    if (op === 'join') {
      const cols = ['sid', 'name', 'dept', 'age', 'course', 'score'];
      const rows = [];
      S.rows.forEach((s) => E.rows.forEach((e) => {
        if (s[0] === e[0]) rows.push([s[0], s[1], s[2], s[3], e[1], e[2]]);
      }));
      return { res: { cols, rows }, sqlText: 'SELECT *\n FROM S JOIN E ON S.sid = E.sid;', note: `⋈ 只留公共属性 sid 相等的配对：${S.rows.length}×${E.rows.length} → ${rows.length} 行；sid=4 没有选课、sid=5 没有学籍，都被丢掉（外连接才会保留）` };
    }
    if (op === 'union') {
      const set = uniq(S.rows.map((r) => r[0]).concat(E.rows.map((r) => r[0]))).sort((a, b) => a - b);
      return { res: { cols: ['sid'], rows: set.map((v) => [v]) }, sqlText: 'SELECT sid FROM S\nUNION\nSELECT sid FROM E;', note: `∪ 要求两表属性相容（这里都取单列 sid）；并集自动去重，共 ${set.length} 个学号` };
    }
    if (op === 'diff') {
      const inE = E.rows.map((r) => r[0]);
      const rows = uniq(S.rows.map((r) => r[0])).filter((v) => !inE.includes(v)).map((v) => [v]);
      return { res: { cols: ['sid'], rows }, sqlText: 'SELECT sid FROM S\nEXCEPT\nSELECT sid FROM E;', note: `S − E：在 S 中但不在 E 中 → 没选任何课的学生，共 ${rows.length} 人` };
    }
    const cols = S.cols.map((c) => 'S.' + c).concat(E.cols.map((c) => 'E.' + c));
    const rows = [];
    S.rows.forEach((s) => E.rows.forEach((e) => rows.push(s.concat(e))));
    return { res: { cols, rows: rows.slice(0, 8) }, sqlText: 'SELECT * FROM S CROSS JOIN E;', note: `× 是纯粹的排列组合：${S.rows.length} × ${E.rows.length} = ${rows.length} 行（这里只显示前 8 行）。⋈ = σ(×)，先乘再筛，代价差在这里` };
  }

  function build() {
    paramBox.textContent = '';
    const t = base === 'S' ? S : E;
    if (op === 'sel') {
      paramBox.append(
        select(t.cols, col, (v) => { col = v; build(); }),
        select(['='], '=', () => {}),
        select(uniq(t.rows.map((r) => r[t.cols.indexOf(col)])), val, (v) => { val = v; build(); }),
      );
    } else if (op === 'proj') {
      t.cols.forEach((c) => {
        const b = mkBtn(c);
        const paint = () => {
          const C = themeColors();
          b.style.background = proj.includes(c) ? C.accent : '';
          b.style.color = proj.includes(c) ? C.bg : '';
        };
        b.addEventListener('click', () => {
          proj = proj.includes(c) ? proj.filter((x) => x !== c) : proj.concat(c);
          build();
        });
        paint();
        paramBox.appendChild(b);
      });
    } else {
      paramBox.appendChild(el('span', 'ml-lab__hint', '该算子固定作用于 S 与 E 两张表'));
    }
    baseSeg.style.display = op === 'join' || op === 'union' || op === 'diff' || op === 'prod' ? 'none' : '';

    const { res, sqlText, note } = compute();
    tableBox.textContent = '';
    tableBox.appendChild(table(res));
    sql.textContent = '等价 SQL：\n' + sqlText;
    ro.set('结果行数', String(res.rows.length));
    ro.set('列', res.cols.join(', '));
    ro.set('说明', note);
  }

  build();
  return { destroy() {} };
}
