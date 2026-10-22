/* =========================================================================
 * 第 53 章（图与网络）组件的共用底座 —— 不是 lab type，不注册进 registries。
 * -------------------------------------------------------------------------
 * 这一章有十几个「图 + 矩阵」型组件，每个都从零画节点、画边、画邻接矩阵、
 * 做小规模特征分解的话，会有五份互不一致的实现。这里把四件公共的事收成一处：
 *
 *   1. 小规模稠密线代：jacobiEigen（对称矩阵特征分解，n ≤ 8 够用）。
 *      为什么不用 numpy 那一套思路（QR / 幂法）？这里只需求对称矩阵、
 *      n 很小、还要在浏览器里逐帧调用，循环 Jacobi 最稳、无收敛分支、
 *      代码 50 行能看懂，数值上也够（残差 1e-12 量级）。
 *   2. 布局与命中：circleLayout 给确定性圆环布局；pickNode 做圆心命中。
 *   3. 绘图小件：trimEdge / drawEdge / drawNode 统一节点半径与箭头留白，
 *      免得每张图的边都戳进圆里。
 *   4. 矩阵绘制：drawMatrixInto 一次性画出带行列标签、悬停行列描边、
 *      数值文字的热力方阵；matrixCellAt 把指针坐标换成 (i, j)。
 *
 * 约定：所有颜色都从 themeColors() 的 C 里取，禁止硬编码 hex。
 * ========================================================================= */

import { label, clamp, fmt, el } from '../core.js';

const TAU = Math.PI * 2;

/* ---------- 1. 小规模稠密线代 ---------- */

/* 循环 Jacobi 特征分解（只接受实对称矩阵）。
   返回 { values, vectors }：
     values  —— 升序特征值；
     vectors —— vectors[r][k] 是第 r 个分量在第 k 个特征向量里的值（列向量取出）。
   停止判据用「非对角元平方和」，比逐个元素判零更稳。
   重根时特征向量方向不唯一——调用方要把这一条写进 UI 提示。 */
function jacobiEigen(Ain, sweeps = 80) {
  const n = Ain.length;
  if (!n) return { values: [], vectors: [] };
  const A = Ain.map((r) => r.slice());
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < sweeps; sweep += 1) {
    let off = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) off += A[p][q] * A[p][q];
    }
    if (off < 1e-22) break;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-18) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * apq);
        const sign = theta >= 0 ? 1 : -1;
        const t = sign / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k += 1) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[a][a] - A[b][b]);
  return {
    values: order.map((i) => A[i][i]),
    vectors: Array.from({ length: n }, (_, r) => order.map((i) => V[r][i])),
  };
}

/* 取第 k 个特征向量并做「最大分量取正」的符号归一。
   特征向量允许整体乘 -1，固定符号只是为了让同一张图刷新时画面不跳。
   组件若要演示「翻符号分组不变」，自己再乘 -1 即可。 */
function eigenVector(vectors, k) {
  const col = vectors.map((row) => row[k] || 0);
  let big = 0;
  let sign = 1;
  col.forEach((v) => {
    if (Math.abs(v) > Math.abs(big)) {
      big = v;
      sign = v >= 0 ? 1 : -1;
    }
  });
  return col.map((v) => v * sign);
}

function matVec(M, v) {
  return M.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}

function identity(n) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/* 由边表建邻接矩阵。directed=false 时对称写两格；weight 为数字时按权重累加
   （多重边会自动叠加），否则记 1。 */
function adjOf(n, edges, opts = {}) {
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  edges.forEach((e) => {
    if (!Array.isArray(e) || e.length < 2) return;
    const u = Math.round(Number(e[0]));
    const v = Math.round(Number(e[1]));
    if (!(u >= 0 && u < n && v >= 0 && v < n)) return;
    const w = typeof e[2] === 'number' && isFinite(e[2]) ? e[2] : 1;
    A[u][v] += w;
    if (!opts.directed && u !== v) A[v][u] += w;
  });
  return A;
}

function degOf(A) {
  return A.map((row) => row.reduce((s, x) => s + x, 0));
}

/* 组合拉普拉斯 L = D − A */
function laplacianOf(A) {
  const d = degOf(A);
  return A.map((row, i) => row.map((x, j) => (i === j ? d[i] - x : -x)));
}

/* ---------- 2. 布局与命中 ---------- */

/* 圆环布局：从正上方开始顺时针铺满 n 个点。确定性（同样入参同样坐标），
   这样「重置布局」不用存快照。 */
function circleLayout(n, rect, shrink = 0.33) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const R = Math.max(26, Math.min(rect.w, rect.h) * shrink);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / Math.max(n, 1)) * TAU;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
}

/* 两行布局：左右各一半再各自成环。双社区图（双三角、桥）用它能一眼看出分组 */
function twinLayout(n, split, rect) {
  const out = new Array(n);
  const half = { x: rect.x, y: rect.y, w: rect.w / 2, h: rect.h };
  const half2 = { x: rect.x + rect.w / 2, y: rect.y, w: rect.w / 2, h: rect.h };
  const left = circleLayout(split, half, 0.30);
  const right = circleLayout(n - split, half2, 0.30);
  left.forEach((p, i) => { out[i] = p; });
  right.forEach((p, i) => { out[split + i] = p; });
  return out;
}

function pickNode(pos, x, y, radius = 16, pad = 6) {
  let hit = -1;
  let best = 1e9;
  for (let i = 0; i < pos.length; i += 1) {
    const p = pos[i];
    if (!p) continue;
    const d = Math.hypot(x - p.x, y - p.y);
    if (d <= radius + pad && d < best) {
      best = d;
      hit = i;
    }
  }
  return hit;
}

/* ---------- 3. 绘图小件 ---------- */

/* 把边的两端各从节点圆心退回各自半径，箭头才不会被圆盖住。
   两点重合时给一个兜底方向，避免除零。 */
function trimEdge(a, ra, b, rb) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  return {
    x0: a.x + ux * ra,
    y0: a.y + uy * ra,
    x1: b.x - ux * rb,
    y1: b.y - uy * rb,
    ux,
    uy,
    len: L - ra - rb,
  };
}

/* 有向边：直线 + 箭头（箭头长度随线宽略放大） */
function drawEdge(ctx, a, ra, b, rb, color, width, opts = {}) {
  const e = trimEdge(a, ra, b, rb);
  if (e.len <= 2) return e;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (opts.dash) ctx.setLineDash(opts.dash);
  ctx.beginPath();
  ctx.moveTo(e.x0, e.y0);
  ctx.lineTo(e.x1, e.y1);
  ctx.stroke();
  if (opts.arrow) {
    const h = opts.head || 8;
    const ang = Math.atan2(e.y1 - e.y0, e.x1 - e.x0);
    ctx.beginPath();
    ctx.moveTo(e.x1, e.y1);
    ctx.lineTo(e.x1 - h * Math.cos(ang - 0.42), e.y1 - h * Math.sin(ang - 0.42));
    ctx.lineTo(e.x1 - h * Math.cos(ang + 0.42), e.y1 - h * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return e;
}

/* 节点：浅底 + 描边 + 名称 + 可选副标签（度、特征值分量…）。
   ring 给「悬停/选中」的加粗外圈——非颜色冗余，不只靠变色传达焦点。 */
function drawNode(ctx, p, r, C, opts = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fillStyle = C.bg;
  ctx.fill();
  if (opts.fill) {
    ctx.globalAlpha = opts.fillAlpha == null ? 0.5 : opts.fillAlpha;
    ctx.fillStyle = opts.fill;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.strokeStyle = opts.stroke || C.axis;
  ctx.lineWidth = opts.lineWidth || 1.6;
  ctx.stroke();
  ctx.restore();
  if (opts.ring) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 3.5, 0, TAU);
    ctx.strokeStyle = opts.ring;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.restore();
  }
  if (opts.text != null) {
    label(ctx, String(opts.text), p.x, p.y - r - 5, opts.textColor || C.fg, {
      size: opts.textSize || 11, weight: 700, align: 'center',
    });
  }
  if (opts.sub != null) {
    label(ctx, String(opts.sub), p.x, p.y + r + 12, opts.subColor || C.fg, {
      size: 9.5, align: 'center',
    });
  }
}

/* ---------- 4. 矩阵绘制 ---------- */

/* 画一个 n×n 方阵。
   rect 给可用区域；返回 { x0, y0, cell, n, rowSums?, colSums? } 供命中测试。
   opts:
     C          主题色（必填）
     labels     行列标签数组
     signed     true 时正数用 accent、负数用 bad，否则统一 accent
     mx         归一化分母（给 0 时自动取 |最大值|）
     title      矩阵标题（画在 rect 上方）
     hoverRow / hoverCol   悬停高亮的行/列（描边 2px，非颜色冗余）
     focus      {i,j} 单格焦点（再加一层虚线框）
     showValues 是否在格子里写数字（格子够大才写）
     rowSums    给数组时在右侧画行和（度）
     small      小字号（窄屏）
   注意：格子最小只画到 6px，仍然可命中——手机上一个指头按不准时，
   悬停值由读数条兜底显示。 */
function drawMatrixInto(ctx, rect, M, opts) {
  const C = opts.C;
  const n = M.length;
  const small = !!opts.small;
  const labelW = small ? 18 : 24;
  const topH = small ? 14 : 17;
  const sumsW = opts.rowSums ? (small ? 26 : 32) : 0;
  const cell = Math.max(6, Math.min(
    (rect.w - labelW - sumsW - 2) / n,
    (rect.h - topH - 2) / n,
  ));
  const x0 = rect.x + labelW;
  const y0 = rect.y + topH;

  if (opts.title) {
    label(ctx, opts.title, rect.x, rect.y + (small ? 10 : 12), C.fg, {
      size: small ? 9.5 : 11, weight: 700,
    });
  }

  let mx = opts.mx;
  if (!mx) {
    mx = 1e-9;
    M.forEach((row) => row.forEach((v) => { mx = Math.max(mx, Math.abs(v)); }));
  }

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const x = x0 + j * cell;
      const y = y0 + i * cell;
      const v = M[i][j];
      const a = clamp(Math.abs(v) / mx, 0, 1);
      ctx.save();
      if (Math.abs(v) < 1e-12) {
        ctx.fillStyle = C.soft;
        ctx.globalAlpha = 0.5;
      } else {
        ctx.fillStyle = (opts.signed && v < 0) ? C.bad : C.accent;
        ctx.globalAlpha = 0.10 + 0.78 * a;
      }
      ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      ctx.restore();
      if (opts.showValues !== false && cell >= 25) {
        const txt = Number.isInteger(v) ? String(v) : fmt(v, 2);
        label(ctx, txt, x + cell / 2, y + cell / 2 + 3.5, a > 0.55 || v === 0 ? C.bg : C.fg, {
          size: cell >= 34 ? 10 : 8.5, align: 'center',
        });
      }
    }
  }

  /* 行/列高亮：2px 实线描边，颜色之外还有粗细差异 */
  const hr = opts.hoverRow;
  const hc = opts.hoverCol;
  if (hr >= 0) {
    ctx.save();
    ctx.strokeStyle = C.accent2;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 - 1, y0 + hr * cell - 1, n * cell + 2, cell + 2);
    ctx.restore();
  }
  if (hc >= 0) {
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + hc * cell - 1, y0 - 1, cell + 2, n * cell + 2);
    ctx.restore();
  }
  if (opts.focus && opts.focus.i >= 0) {
    ctx.save();
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(x0 + opts.focus.j * cell + 1, y0 + opts.focus.i * cell + 1, cell - 2, cell - 2);
    ctx.restore();
  }

  const labels = opts.labels || [];
  for (let i = 0; i < n; i += 1) {
    label(ctx, String(labels[i] == null ? i : labels[i]), x0 - 4,
      y0 + i * cell + cell / 2 + 3.5, hr === i ? C.accent2 : C.axis, {
        size: small ? 8 : 8.5, align: 'right', weight: hr === i ? 700 : 400,
      });
    label(ctx, String(labels[i] == null ? i : labels[i]), x0 + i * cell + cell / 2,
      y0 - 4, hc === i ? C.named('purple') : C.axis, {
        size: small ? 8 : 8.5, align: 'center', weight: hc === i ? 700 : 400,
      });
  }

  /* 行和（度数）：矩阵外的第五列，带标签 */
  if (opts.rowSums) {
    const sx = x0 + n * cell + 6;
    label(ctx, '行和', sx, y0 - 4, C.axis, { size: 8.5 });
    for (let i = 0; i < n; i += 1) {
      label(ctx, fmt(opts.rowSums[i], 2), sx, y0 + i * cell + cell / 2 + 3.5,
        hr === i ? C.accent2 : C.fg, { size: small ? 8.5 : 9.5, weight: hr === i ? 700 : 400 });
    }
  }

  return { x0, y0, cell, n };
}

function matrixCellAt(mr, x, y) {
  if (!mr) return null;
  const j = Math.floor((x - mr.x0) / mr.cell);
  const i = Math.floor((y - mr.y0) / mr.cell);
  if (i < 0 || i >= mr.n || j < 0 || j >= mr.n) return null;
  return { i, j };
}

/* ---------- 5. 小杂项 ---------- */

/* 读数用的向量格式化：[0.908, 1.15, …] */
function fmtVec(v, digits = 3) {
  return '[' + v.map((x) => fmt(x, digits)).join(', ') + ']';
}

/* spec 里的 nodes / edges 兜底解析：字段缺失或越界时退回默认值，绝不 throw。
   —— lab 组件容错的第一道防线，课文 spec 写错也只该「画得不对」，不该白屏。 */
function readNodes(spec, def) {
  const src = Array.isArray(spec && spec.nodes) ? spec.nodes : null;
  if (!src) return def.slice();
  const out = src.slice(0, 9).map((s) => String(s));
  return out.length >= 2 ? out : def.slice();
}

function readEdges(spec, n, def, cap = 40) {
  const src = Array.isArray(spec && spec.edges) ? spec.edges : null;
  const list = src || def;
  const out = [];
  const seen = new Set();
  list.forEach((e) => {
    if (!Array.isArray(e) || e.length < 2) return;
    const u = Math.round(Number(e[0]));
    const v = Math.round(Number(e[1]));
    if (!isFinite(u) || !isFinite(v) || u < 0 || v < 0 || u >= n || v >= n) return;
    const w = typeof e[2] === 'number' && isFinite(e[2]) ? e[2] : 1;
    const key = u + '>' + v + ':' + w;
    if (seen.has(key)) return;
    seen.add(key);
    out.push([u, v, w]);
  });
  if (!out.length) {
    return def.filter((e) => e[0] < n && e[1] < n).map((e) => [e[0], e[1], e[2] == null ? 1 : e[2]]);
  }
  return out.slice(0, cap);
}

/* 把一组「图例条目」拼成 DOM（.ml-lab__legend 已在全站 CSS 里）。
   文字一律带说明，不只给色块——色觉障碍与灰度打印都要能读。 */
function legendInto(host, entries) {
  const box = el('div', 'ml-lab__legend');
  (entries || []).forEach(([color, text]) => {
    const item = el('span');
    if (color) {
      const i = el('i');
      i.style.background = color;
      item.appendChild(i);
    }
    item.appendChild(document.createTextNode(text));
    box.appendChild(item);
  });
  host.appendChild(box);
  return box;
}

export {
  TAU,
  jacobiEigen,
  eigenVector,
  matVec,
  identity,
  adjOf,
  degOf,
  laplacianOf,
  circleLayout,
  twinLayout,
  pickNode,
  trimEdge,
  drawEdge,
  drawNode,
  drawMatrixInto,
  matrixCellAt,
  fmtVec,
  readNodes,
  readEdges,
  legendInto,
};
