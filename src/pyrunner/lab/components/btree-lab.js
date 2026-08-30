/* 索引与 B 树：一个节点 = 一个磁盘块，所以 B 树靠「又矮又胖」把磁盘 I/O 压到最低。
   拖阶数 m 再逐个插入/删除，看节点怎么分裂与合并；右侧读数对比同样键集下 BST 的树高。 */
import {
  themeColors, setupCanvas, anim, buildSliders, buildToolbar,
  buildReadout, mkBtn, label, clamp,
} from '../core.js';

const KW = 20;
const PAD = 6;
const GAP = 8;
const node0 = (leaf) => ({ leaf, keys: [], ch: [] });
const copy = (t) => JSON.parse(JSON.stringify(t));

function measure(n) {
  const own = n.keys.length * KW + PAD * 2;
  n._own = own;
  if (n.leaf) { n._w = own; return own; }
  const sum = n.ch.reduce((a, c) => a + measure(c), 0) + GAP * (n.ch.length - 1);
  n._w = Math.max(own, sum);
  return n._w;
}
function place(n, left, depth) {
  n._d = depth;
  n._x = left + n._w / 2;
  if (n.leaf) return;
  const used = n.ch.reduce((a, c) => a + c._w, 0) + GAP * (n.ch.length - 1);
  let x = left + (n._w - used) / 2;
  n.ch.forEach((c) => { place(c, x, depth + 1); x += c._w + GAP; });
}
function height(n) {
  return n.leaf || !n.ch.length ? 1 : 1 + height(n.ch[0]);
}

let dupFlag = false;

function insertRec(n, key, maxK) {
  let i = 0;
  while (i < n.keys.length && key > n.keys[i]) i += 1;
  if (n.keys[i] === key) { dupFlag = true; return null; }
  if (n.leaf) n.keys.splice(i, 0, key);
  else {
    const r = insertRec(n.ch[i], key, maxK);
    if (!r) return null;
    n.keys.splice(i, 0, r.mid);
    n.ch.splice(i + 1, 0, r.right);
  }
  /* 返回 null = 这一层没有分裂，父节点什么都不用做 */
  if (n.keys.length <= maxK) return null;
  const mid = Math.floor(n.keys.length / 2);
  const up = n.keys[mid];
  const right = { leaf: n.leaf, keys: n.keys.slice(mid + 1), ch: n.leaf ? [] : n.ch.slice(mid + 1) };
  n.keys = n.keys.slice(0, mid);
  n.ch = n.leaf ? [] : n.ch.slice(0, mid + 1);
  return { mid: up, right, split: true };
}

function maxKey(n) {
  return n.leaf ? n.keys[n.keys.length - 1] : maxKey(n.ch[n.ch.length - 1]);
}
function fix(n, i, minK) {
  const c = n.ch[i];
  if (!c || c.keys.length >= minK) return;
  const L = i > 0 ? n.ch[i - 1] : null;
  const R = i < n.ch.length - 1 ? n.ch[i + 1] : null;
  if (L && L.keys.length > minK) {
    c.keys.unshift(n.keys[i - 1]);
    n.keys[i - 1] = L.keys.pop();
    if (!L.leaf) c.ch.unshift(L.ch.pop());
    return;
  }
  if (R && R.keys.length > minK) {
    c.keys.push(n.keys[i]);
    n.keys[i] = R.keys.shift();
    if (!R.leaf) c.ch.push(R.ch.shift());
    return;
  }
  if (L) {
    L.keys.push(n.keys[i - 1], ...c.keys);
    if (!c.leaf) L.ch.push(...c.ch);
    n.keys.splice(i - 1, 1);
    n.ch.splice(i, 1);
  } else if (R) {
    c.keys.push(n.keys[i], ...R.keys);
    if (!R.leaf) c.ch.push(...R.ch);
    n.keys.splice(i, 1);
    n.ch.splice(i + 1, 1);
  }
}
function removeRec(n, key, minK) {
  let i = 0;
  while (i < n.keys.length && key > n.keys[i]) i += 1;
  if (n.leaf) {
    if (n.keys[i] === key) { n.keys.splice(i, 1); return true; }
    return false;
  }
  if (n.keys[i] === key) {
    const pred = maxKey(n.ch[i]);
    n.keys[i] = pred;
    removeRec(n.ch[i], pred, minK);
  } else if (!removeRec(n.ch[i], key, minK)) return false;
  fix(n, i, minK);
  return true;
}

export default function render(host) {
  let m = 4;
  let key = 20;
  let root = node0(true);
  const history = [{ tree: copy(root), note: '空树' }];
  let view = 0;

  const cv = setupCanvas(host, 260);
  const ro = buildReadout({ 键数: '0', 'B 树高度': '—', 'BST 高度': '—', '查找 I/O': '—', 操作: '—' });
  host.appendChild(ro.box);

  const bIns = mkBtn('插入');
  const bDel = mkBtn('删除');
  const bRand = mkBtn('随机插入 5 个');
  const bReset = mkBtn('重置');
  const bPrev = mkBtn('◀ 上一步');
  const bNext = mkBtn('下一步 ▶');
  host.appendChild(buildToolbar(bIns, bDel, bRand, bReset, bPrev, bNext));

  function keys(n, out = []) {
    out.push(...n.keys);
    n.ch.forEach((c) => keys(c, out));
    return out;
  }
  function bstHeight(list) {
    let h = 0;
    const set = new Set();
    list.forEach((v) => { if (!set.has(v)) { set.add(v); h = Math.max(h, Math.floor(Math.log2(set.size)) + 1); } });
    return h;
  }

  function push(note) {
    history.push({ tree: copy(root), note });
    view = history.length - 1;
    sync();
    draw();
  }

  function sync() {
    const tree = history[view].tree;
    const all = keys(tree);
    ro.set('键数', String(all.length));
    ro.set('B 树高度', String(height(tree)));
    const bh = bstHeight(all);
    ro.set('BST 高度', all.length ? `${bh}（退化 ${all.length}）` : '—');
    ro.set('查找 I/O', `${height(tree)} 次（B 树） vs ${bh} 次（BST）`);
    ro.set('操作', history[view].note + `　[${view + 1}/${history.length}]`);
  }

  function draw() {
    const C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const tree = copy(history[view].tree);
    if (!tree.keys.length) {
      label(ctx, '空树：先插入几个键', W / 2, H / 2, C.fg, { align: 'center', size: 13 });
      return;
    }
    measure(tree);
    place(tree, 0, 0);
    const sc = Math.min(1, (W - 20) / tree._w);
    const off = (W - tree._w * sc) / 2;
    const lh = Math.min(58, (H - 30) / Math.max(height(tree), 1));
    const px = (n) => off + n._x * sc;
    const py = (n) => 22 + n._d * lh;

    const walk = (n) => {
      const w = n._own * sc;
      const h = 26;
      const x = px(n) - w / 2;
      const y = py(n);
      n.ch.forEach((c) => {
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(px(n) - w / 2 + (n.ch.indexOf(c) + 0.5) * (w / n.ch.length), y + h);
        ctx.lineTo(px(c), py(c));
        ctx.stroke();
        walk(c);
      });
      ctx.fillStyle = C.soft;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = n.keys.length > m - 1 ? C.bad : C.accent;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      n.keys.forEach((k, i) => {
        if (i > 0) {
          ctx.strokeStyle = C.grid;
          ctx.beginPath();
          ctx.moveTo(x + PAD * sc + i * KW * sc, y + 3);
          ctx.lineTo(x + PAD * sc + i * KW * sc, y + h - 3);
          ctx.stroke();
        }
        label(ctx, String(k), x + PAD * sc + (i + 0.5) * KW * sc, y + h / 2 + 4, C.fg, { align: 'center', size: Math.max(9, 11 * sc) });
      });
    };
    walk(tree);
    label(ctx, `${m} 阶 B 树：每节点最多 ${m - 1} 个键、最多 ${m} 个孩子；除根外至少 ${Math.ceil(m / 2) - 1} 个键`,
      8, H - 5, C.fg, { size: 11 });
  }

  bIns.addEventListener('click', () => {
    dupFlag = false;
    const r = insertRec(root, key, m - 1);
    if (dupFlag) {
      push(`${key} 已存在，B 树里索引键通常唯一`);
      return;
    }
    if (r && r.split) {
      const nr = node0(false);
      nr.keys = [r.mid];
      nr.ch = [root, r.right];
      root = nr;
      push(`插入 ${key} → 节点分裂，${r.mid} 上移，树高 +1`);
    } else push(`插入 ${key}`);
  });
  bDel.addEventListener('click', () => {
    if (!removeRec(root, key, Math.ceil(m / 2) - 1)) {
      push(`${key} 不在树里`);
      return;
    }
    if (!root.leaf && root.keys.length === 0) {
      root = root.ch[0];
      push(`删除 ${key} → 合并后根变空，树高 −1`);
      return;
    }
    push(`删除 ${key}（不足半满时先借兄弟，借不到就合并）`);
  });
  bRand.addEventListener('click', () => {
    for (let i = 0; i < 5; i += 1) {
      const k = 1 + Math.floor(Math.random() * 40);
      const r = insertRec(root, k, m - 1);
      if (r && r.split) {
        const nr = node0(false);
        nr.keys = [r.mid];
        nr.ch = [root, r.right];
        root = nr;
      }
    }
    push('随机插入 5 个键');
  });
  bReset.addEventListener('click', () => {
    root = node0(true);
    history.length = 0;
    history.push({ tree: copy(root), note: '空树' });
    view = 0;
    sync();
    draw();
  });
  bPrev.addEventListener('click', () => { view = clamp(view - 1, 0, history.length - 1); sync(); draw(); });
  bNext.addEventListener('click', () => { view = clamp(view + 1, 0, history.length - 1); sync(); draw(); });

  const sliders = buildSliders(
    {
      sliders: [
        { name: 'm', label: '阶数 m', min: 3, max: 6, step: 1, value: m },
        { name: 'key', label: '键值', min: 1, max: 40, step: 1, value: key },
      ],
    },
    (st) => {
      m = st.m;
      key = st.key;
      draw();
    },
  );

  let acc = 0;
  const controls = anim(host, {
    onTick(dt) {
      acc += dt;
      if (acc > 0.8 && history.length > 1) {
        acc = 0;
        view = (view + 1) % history.length;
        sync();
        draw();
      }
    },
    onReset() { view = history.length - 1; sync(); draw(); },
  });

  sync();
  draw();
  cv.redraw = draw;
  return {
    slidersBox: sliders.box,
    destroy() { controls.stop(); },
  };
}
