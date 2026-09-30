/* =========================================================================
 * lab 组件：room-modes（矩形房间的模态频率栅格）
 * -------------------------------------------------------------------------
 * 演示什么：
 *   矩形房间是一组三维驻波的集合。每个模式由三个非负整数 (nx, ny, nz) 决定：
 *
 *       f(nx,ny,nz) = (c/2) · sqrt((nx/Lx)² + (ny/Ly)² + (nz/Lz)²)
 *
 *   只有这三个数里「只有一个非零」的轴向模式能量最强（两面墙之间来回反射）；
 *   两个非零是切向模式，三个都非零是斜向模式。房间的尺寸一变，整套频率栅格
 *   跟着变——这就是为什么在小房间里低频总是一坨一坨的。
 *
 * 用法（课文里写 ```lab 围栏）：
 *
 *   ```lab
 *   { "type": "room-modes", "title": "把房间拉成长条，看低频怎么重新排队" }
 *   ```
 *
 * 字段（都有默认值，最小 spec 只写 type + title 即可）：
 *   Lx / Ly / Lz  房间三边长（m）  默认 5 / 4 / 2.6
 *   T60           混响时间（s）    默认 0.5（只用来算施罗德频率）
 *   fmax          频率轴上限（Hz） 默认 300（房间模式真正作乱的区间）
 *   order         每维最高阶数     默认 4
 *
 * 能拖什么：
 *   左图是房间俯视图——拖右边中点改 Lx，拖下边中点改 Ly，拖右侧那根立柱的
 *   顶端改层高 Lz；俯视图里的红蓝格子是当前模式的声压分布（白线是节线）。
 *   右图是模态频率栅格：鼠标掠过任一根竖线，就选中那个 (nx,ny,nz)，
 *   下方会画出它沿 x 方向的驻波形状。
 *   虚线是施罗德频率：它以下模式是「一根一根」的，以上才连成统计意义上的混响。
 *
 * 出声：否（纯几何 + 数值）。
 * ========================================================================= */

import {
  themeColors, setupCanvas, bindPointer, buildSliders, buildReadout, label, clamp, fmt,
  setSliderRow,
  clearBg,
} from '../core.js';

const CSOUND = 343;      // 空气中声速（m/s，20 ℃）
const MAXD = 10;         // 俯视图横向/纵向满量程（m），定死它比例尺才不会随拖动乱跳

export default function render(host, spec) {
  let C = themeColors();
  const s = {
    Lx: spec.Lx ?? 5,
    Ly: spec.Ly ?? 4,
    Lz: spec.Lz ?? 2.6,
    T60: spec.T60 ?? 0.5,
  };
  const FMAX = spec.fmax ?? 300;
  const ORDER = spec.order ?? 4;

  const cv = setupCanvas(host, 400);
  const ro = buildReadout({ 房间体积: '—', 最低轴向模式: '—', 施罗德频率: '—', 模式总数: '—', 当前模式: '—' });
  host.appendChild(ro.box);

  let hlKey = null;       // 当前高亮模式的键 "nx,ny,nz"（模式数组每帧重建，只能按键认人）
  let hoverKey = null;    // 鼠标悬停到的模式键
  let hits = [];          // 右图竖线的命中区（供 hover 查询）
  let geo = null;         // 左图几何（供拖拽换算）

  /* ---------- 模型 ---------- */

  const key = (md) => md.nx + ',' + md.ny + ',' + md.nz;

  function modeFreq(nx, ny, nz) {
    return 0.5 * CSOUND * Math.hypot(nx / s.Lx, ny / s.Ly, nz / s.Lz);
  }

  function allModes() {
    const out = [];
    for (let nx = 0; nx <= ORDER; nx += 1) {
      for (let ny = 0; ny <= ORDER; ny += 1) {
        for (let nz = 0; nz <= ORDER; nz += 1) {
          const k = (nx ? 1 : 0) + (ny ? 1 : 0) + (nz ? 1 : 0);
          if (k === 0) continue;
          const f = modeFreq(nx, ny, nz);
          if (f > FMAX) continue;
          out.push({
            nx, ny, nz, f,
            type: k === 1 ? 'axial' : k === 2 ? 'tangential' : 'oblique',
          });
        }
      }
    }
    out.sort((a, b) => a.f - b.f);
    return out;
  }

  const vol = () => s.Lx * s.Ly * s.Lz;
  const schroeder = () => 2000 * Math.sqrt(s.T60 / vol());
  const typeColor = (t) => (t === 'axial' ? C.named('red') : t === 'tangential' ? C.named('orange') : C.named('purple'));
  const typeName = (t) => (t === 'axial' ? '轴向' : t === 'tangential' ? '切向' : '斜向');

  /* ---------- 绘图 ---------- */

  function draw() {
    C = themeColors();
    const ctx = cv.ctx;
    const W = cv.W;
    const H = cv.H;
    clearBg(ctx, W, H, C);

    const modes = allModes();
    const activeKey = hoverKey || hlKey;
    let m = modes.find((md) => key(md) === activeKey) || null;
    if (!m) m = modes[0] || null;
    if (m) hlKey = key(m);

    const A = { x0: 8, x1: Math.round(W * 0.46), y0: 26, y1: 300 };
    const B = { x0: A.x1 + 12, x1: W - 10, y0: 26, y1: 300 };

    /* ============ 左：房间俯视图 ============ */
    const fx = A.x0 + 36;
    const fy = A.y0 + 28;
    const availW = (A.x1 - A.x0) - 36 - 40;
    const availH = (A.y1 - A.y0) - 28 - 24;
    const scale = Math.max(6, Math.min(availW / MAXD, availH / MAXD));
    const planW = s.Lx * scale;
    const planH = s.Ly * scale;
    const barX = fx + MAXD * scale + 16;
    const barBase = fy + MAXD * scale;
    geo = { fx, fy, scale, barX, barBase };

    /* 声压分布（当前模式在 z=0 平面上的截面） */
    if (m) {
      const NXG = 46;
      const NYG = 34;
      const cw = planW / NXG;
      const ch = planH / NYG;
      for (let i = 0; i < NXG; i += 1) {
        for (let j = 0; j < NYG; j += 1) {
          const px = ((i + 0.5) / NXG) * Math.PI * m.nx;
          const py = ((j + 0.5) / NYG) * Math.PI * m.ny;
          const p = Math.cos(px) * Math.cos(py);
          ctx.fillStyle = p >= 0 ? C.named('red') : C.named('blue');
          ctx.globalAlpha = Math.min(0.55, Math.abs(p) * 0.55);
          ctx.fillRect(fx + i * cw, fy + j * ch, cw + 0.6, ch + 0.6);
        }
      }
      ctx.globalAlpha = 1;
    }

    /* 房间轮廓 */
    ctx.strokeStyle = C.fg;
    ctx.lineWidth = 2;
    ctx.strokeRect(fx, fy, planW, planH);
    if (m) {
      /* 节线：cos(nx π x/Lx)·cos(ny π y/Ly) = 0 */
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      for (let k = 0; k < m.nx; k += 1) {
        const x = fx + ((2 * k + 1) / (2 * m.nx)) * planW;
        ctx.beginPath();
        ctx.moveTo(x, fy);
        ctx.lineTo(x, fy + planH);
        ctx.stroke();
      }
      for (let k = 0; k < m.ny; k += 1) {
        const y = fy + ((2 * k + 1) / (2 * m.ny)) * planH;
        ctx.beginPath();
        ctx.moveTo(fx, y);
        ctx.lineTo(fx + planW, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    /* 尺寸标注 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 12);
    ctx.lineTo(fx + planW, fy - 12);
    ctx.moveTo(fx, fy - 16);
    ctx.lineTo(fx, fy - 8);
    ctx.moveTo(fx + planW, fy - 16);
    ctx.lineTo(fx + planW, fy - 8);
    ctx.stroke();
    label(ctx, 'Lx = ' + fmt(s.Lx, 2) + ' m', fx + planW / 2, fy - 18, C.fg, { align: 'center', size: 11 });
    ctx.beginPath();
    ctx.moveTo(fx - 12, fy);
    ctx.lineTo(fx - 12, fy + planH);
    ctx.moveTo(fx - 16, fy);
    ctx.lineTo(fx - 8, fy);
    ctx.moveTo(fx - 16, fy + planH);
    ctx.lineTo(fx - 8, fy + planH);
    ctx.stroke();
    ctx.save();
    ctx.translate(fx - 18, fy + planH / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, 'Ly = ' + fmt(s.Ly, 2) + ' m', 0, 0, C.fg, { align: 'center', size: 11 });
    ctx.restore();

    /* 三个拖拽把手 */
    const handle = (x, y, active) => {
      ctx.fillStyle = active ? C.accent : C.bg;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(x - 5, y - 5, 10, 10);
      ctx.fill();
      ctx.stroke();
    };
    handle(fx + planW, fy + planH / 2, false);
    handle(fx + planW / 2, fy + planH, false);

    /* 层高立柱 */
    const barH = s.Lz * scale;
    ctx.fillStyle = C.soft;
    ctx.fillRect(barX, barBase - barH, 14, barH);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barBase - barH, 14, barH);
    handle(barX + 7, barBase - barH, false);
    label(ctx, 'Lz ' + fmt(s.Lz, 2) + ' m', barX + 7, barBase + 14, C.fg, { align: 'center', size: 10 });
    label(ctx, '拖三个把手改房间尺寸', A.x0, A.y1 - 4, C.fg, { size: 10 });

    /* ============ 右：模态频率栅格 ============ */
    const XF = (f) => B.x0 + (clamp(f, 0, FMAX) / FMAX) * (B.x1 - B.x0);
    const laneTop = B.y0 + 20;
    const axisY = B.y1 - 22;
    const laneH = (axisY - laneTop) / 3;
    const lanes = [
      { key: 'axial', name: '轴向（一个方向）', top: laneTop },
      { key: 'tangential', name: '切向（两个方向）', top: laneTop + laneH },
      { key: 'oblique', name: '斜向（三个方向）', top: laneTop + 2 * laneH },
    ];
    hits = [];

    lanes.forEach((ln) => {
      const y0 = ln.top + 6;
      const y1 = ln.top + laneH - 10;
      label(ctx, ln.name, B.x0, ln.top + laneH / 2, typeColor(ln.key), { size: 10 });
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(B.x0, y1 + 2.5);
      ctx.lineTo(B.x1, y1 + 2.5);
      ctx.stroke();
      modes.filter((md) => md.type === ln.key).forEach((md) => {
        const x = Math.round(XF(md.f)) + 0.5;
        const on = key(md) === activeKey;
        ctx.strokeStyle = typeColor(md.type);
        ctx.lineWidth = on ? 3.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, on ? y1 - 4 : y1);
        ctx.stroke();
        if (on) {
          ctx.fillStyle = typeColor(md.type);
          ctx.beginPath();
          ctx.arc(x, y0 - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();
          label(ctx, `(${md.nx},${md.ny},${md.nz}) ${fmt(md.f, 1)} Hz`,
            clamp(x, B.x0 + 4, B.x1 - 90), y0 - 10, C.fg, { size: 10 });
        }
        hits.push({ x, y0, y1, md });
      });
    });

    /* 频率轴 */
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(B.x0, axisY + 2.5);
    ctx.lineTo(B.x1, axisY + 2.5);
    ctx.stroke();
    const step = FMAX > 250 ? 50 : 20;
    for (let f = 0; f <= FMAX; f += step) {
      const x = Math.round(XF(f)) + 0.5;
      ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 5);
      ctx.stroke();
      label(ctx, String(f), x, axisY + 17, C.fg, { align: 'center', size: 10 });
    }
    label(ctx, 'Hz', B.x1, axisY + 30, C.fg, { align: 'right', size: 10 });

    /* 施罗德频率：以下模式分立，以上进入统计区 */
    const fsHz = schroeder();
    if (fsHz < FMAX) {
      const x = Math.round(XF(fsHz)) + 0.5;
      ctx.strokeStyle = C.named('green');
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, laneTop);
      ctx.lineTo(x, axisY);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '施罗德 ' + fmt(fsHz, 0) + ' Hz', clamp(x + 4, B.x0, B.x1 - 78), laneTop - 2, C.named('green'), { size: 10 });
    }
    label(ctx, '掠过竖线选中某个模式', B.x1, B.y0 - 10, C.fg, { align: 'right', size: 10 });

    /* ============ 下：沿 x 的驻波剖面 ============ */
    const py0 = 328;
    const py1 = 376;
    const pm = (py0 + py1) / 2;
    const pa = 26;
    const px0 = A.x0 + 30;
    const px1 = W - 24;
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, pm);
    ctx.lineTo(px1, pm);
    ctx.stroke();
    if (m) {
      if (m.nx === 0) {
        ctx.strokeStyle = C.named('blue');
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(px0, pm - pa * 0.5);
        ctx.lineTo(px1, pm - pa * 0.5);
        ctx.stroke();
        label(ctx, 'nx = 0：沿 x 方向声压不变（整条是同相的）', px0, py0 - 6, C.fg, { size: 11 });
      } else {
        ctx.beginPath();
        for (let i = 0; i <= 200; i += 1) {
          const u = i / 200;
          const y = pm - Math.cos(m.nx * Math.PI * u) * pa;
          if (i === 0) ctx.moveTo(px0 + u * (px1 - px0), y);
          else ctx.lineTo(px0 + u * (px1 - px0), y);
        }
        ctx.strokeStyle = C.named('blue');
        ctx.lineWidth = 2.4;
        ctx.stroke();
        /* 节点：cos = 0 处，声压恒为零 */
        for (let k = 0; k < m.nx; k += 1) {
          const u = (2 * k + 1) / (2 * m.nx);
          const x = px0 + u * (px1 - px0);
          ctx.fillStyle = C.named('red');
          ctx.beginPath();
          ctx.arc(x, pm, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, `沿 x 的驻波：nx = ${m.nx}，红点是声压节点（墙角总是波腹）`, px0, py0 - 6, C.fg, { size: 11 });
      }
    }
    label(ctx, 'x = 0', px0, py1 + 12, C.fg, { size: 10 });
    label(ctx, 'x = Lx = ' + fmt(s.Lx, 2) + ' m', px1, py1 + 12, C.fg, { align: 'right', size: 10 });

    /* 读数 */
    const axial = modes.filter((md) => md.type === 'axial');
    ro.set('房间体积', fmt(vol(), 1) + ' m³');
    ro.set('最低轴向模式', axial.length ? fmt(axial[0].f, 1) + ' Hz (' + axial[0].nx + ',' + axial[0].ny + ',' + axial[0].nz + ')' : '—');
    ro.set('施罗德频率', fmt(fsHz, 0) + ' Hz');
    ro.set('模式总数', modes.length + ' 个（' + FMAX + ' Hz 以下）');
    ro.set('当前模式', m ? `(${m.nx},${m.ny},${m.nz}) ${typeName(m.type)} ${fmt(m.f, 1)} Hz` : '—');
  }

  /* ---------- 交互 ---------- */

  bindPointer(cv.canvas, {
    pick(x, y) {
      if (!geo) return null;
      const cands = [
        ['lx', geo.fx + s.Lx * geo.scale, geo.fy + (s.Ly * geo.scale) / 2],
        ['ly', geo.fx + (s.Lx * geo.scale) / 2, geo.fy + s.Ly * geo.scale],
        ['lz', geo.barX + 7, geo.barBase - s.Lz * geo.scale],
      ];
      let best = null;
      let bd = 16;
      cands.forEach(([id, cx, cy]) => {
        const d = Math.hypot(x - cx, y - cy);
        if (d < bd) { bd = d; best = id; }
      });
      return best;
    },
    move(id, x, y) {
      if (!geo) return;
      if (id === 'lx') s.Lx = clamp((x - geo.fx) / geo.scale, 1.5, MAXD);
      if (id === 'ly') s.Ly = clamp((y - geo.fy) / geo.scale, 1.5, MAXD);
      if (id === 'lz') s.Lz = clamp((geo.barBase - y) / geo.scale, 1.5, 6);
      setSliderRow(sliders, 0, Math.round(s.Lx * 100) / 100, 2, NAMES[0]);
      setSliderRow(sliders, 1, Math.round(s.Ly * 100) / 100, 2, NAMES[1]);
      setSliderRow(sliders, 2, Math.round(s.Lz * 100) / 100, 2, NAMES[2]);
      draw();
    },
    hover(x, y) {
      let found = null;
      for (let i = 0; i < hits.length; i += 1) {
        const h = hits[i];
        if (Math.abs(x - h.x) < 5 && y >= h.y0 - 8 && y <= h.y1 + 4) { found = h.md; break; }
      }
      const k = found ? key(found) : null;
      if (k !== hoverKey) {
        hoverKey = k;
        draw();
      }
    },
    leave() {
      if (hoverKey) {
        hoverKey = null;
        draw();
      }
    },
  });

  const NAMES = ['Lx', 'Ly', 'Lz', 'T60'];
  const sliders = buildSliders(
    {
      sliders: [
        { name: 'Lx', label: '长 Lx', min: 1.5, max: MAXD, step: 0.05, value: s.Lx },
        { name: 'Ly', label: '宽 Ly', min: 1.5, max: MAXD, step: 0.05, value: s.Ly },
        { name: 'Lz', label: '高 Lz', min: 1.5, max: 6, step: 0.05, value: s.Lz },
        { name: 'T60', label: '混响时间 T60', min: 0.2, max: 1.2, step: 0.05, value: s.T60 },
      ],
    },
    (st) => {
      s.Lx = st.Lx;
      s.Ly = st.Ly;
      s.Lz = st.Lz;
      s.T60 = st.T60;
      draw();
    },
  );

  draw();
  cv.redraw = draw;

  return { slidersBox: sliders.box };
}
