/* =========================================================================
 * lab 组件：counting-tree —— 一条路是「或」，一层台阶是「且」
 * -------------------------------------------------------------------------
 * 用法（第 28 章《加法原理与乘法原理进阶》动手实验）：
 *   { "type": "counting-tree", "title": "…" }
 * 字段（都可省）：direct 直达班次（默认 3）；subway 地铁班次（默认 4）；
 *   bus 每班地铁接驳的校巴数（默认 2）；len 密码长度（默认 4）；
 *   height 画布高度（默认 460）。
 *
 * 两个场景，一条判据：
 *   · 家 → 学校：树根分出两条「路线」（或：加法），其中换乘那条内部还要
 *     地铁 × 校巴（且：乘法）。叶子总数 = 直达 + 地铁 × 校巴 = 3 + 8 = 11。
 *     按「都加起来」会错算成 3 + 4 + 2 = 9，一眼看出「或」与「且」差在哪。
 *   · 密码合集：全集 26^L 减去「全同字母」那 26 个，就是合法密码数。
 *     L = 1 时违规占 100%、合法数恰好为 0——补集计数不是装饰。
 *
 * 交互（完美教具五问）：
 *   1. 动手量：三条分支数滑块（直达 / 地铁 / 校巴）与密码长度滑块；
 *      拖哪一组就切到那个场景，不会出现「拖了没反应」。
 *   2. 即时后果：叶子重排、计数标签与读数条一帧内重算。
 *   3. 读数：算式 / 结果 / 对照三行与正文 $3 + 4 \times 2 = 11$ 逐项对得上。
 *   4. 啊哈预设：「按『都加起来』错算」把 9 与 11 并排摆出来。
 *   5. 默认状态即正文例题：3 + 4 × 2 = 11，读者不点也能读到正确账本。
 * ========================================================================= */

import {
  themeColors, setupCanvas, buildSliders, buildToolbar, buildReadout, buildSegmented,
  mkBtn, label, arrow, clearBg, clamp,
} from '../core.js';

/* 密码字母表固定 26 个小写字母（与课文一致） */
const ALPHA = 26;

/* 大整数别落进 fmt 的指数阈值：只有十亿以上才用科学记数 */
function big(v) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e9) return v.toExponential(2);
  return String(v);
}

export default function render(host, spec) {
  const st = {
    direct: clamp(Math.round(spec.direct ?? 3), 1, 6),
    subway: clamp(Math.round(spec.subway ?? 4), 1, 6),
    bus: clamp(Math.round(spec.bus ?? 2), 1, 4),
    len: clamp(Math.round(spec.len ?? 4), 1, 6),
    scene: 'route',
    wrong: false,
  };

  const cv = setupCanvas(host, clamp(spec.height || 460, 340, 900));

  /* 键名固定不换：换场景只换数值，避免「标签改了、数字还写在旧键上」 */
  const ro = buildReadout({ 场景: '—', 算式: '—', 结果: '—', 对照: '—' });
  host.appendChild(ro.box);

  const bWrong = mkBtn('按「都加起来」错算一次');
  const bReset = mkBtn('回到课文例题');
  host.appendChild(buildToolbar(bWrong, bReset));

  host.appendChild(buildSegmented(
    [{ label: '家 → 学校', value: 'route' }, { label: '密码合集', value: 'pass' }],
    st.scene,
    (v) => { st.scene = v; st.wrong = false; draw(); },
  ));

  /* 两条滑块只显示当前场景那一组；拖到哪一组就切到那个场景 */
  const slRoute = buildSliders({
    sliders: [
      { name: 'direct', label: '直达班次', min: 1, max: 6, step: 1, value: st.direct },
      { name: 'subway', label: '地铁班次', min: 1, max: 6, step: 1, value: st.subway },
      { name: 'bus', label: '每趟接驳校巴', min: 1, max: 4, step: 1, value: st.bus },
    ],
  }, (s) => {
    st.direct = s.direct; st.subway = s.subway; st.bus = s.bus;
    st.scene = 'route'; st.wrong = false; draw();
  });
  const slPass = buildSliders({
    sliders: [
      { name: 'len', label: '密码长度', min: 1, max: 6, step: 1, value: st.len },
    ],
  }, (s) => {
    st.len = s.len; st.scene = 'pass'; st.wrong = false; draw();
  });
  host.appendChild(slRoute.box);
  host.appendChild(slPass.box);

  /* ---------- 场景一：树 ---------- */

  function drawRoute(C, W, H) {
    const ctx = cv.ctx;
    const total = st.direct + st.subway * st.bus;
    const wrongSum = st.direct + st.subway + st.bus;

    label(ctx, '「或」= 并列的主干分别计数再相加　　「且」= 同一条主干上的台阶连乘', 14, 22, C.axis, { size: 10.5 });

    const xRoot = 26;
    const xWay = 96;
    const xMid = Math.min(W * 0.44, 216);
    const xLeaf = W - 128;
    const top = 54;
    const bot = H - 30;
    const yA = top + (bot - top) * 0.26;   /* 直达那条主干 */
    const yB = top + (bot - top) * 0.74;   /* 换乘那条主干 */

    /* 根与两条主干 */
    ctx.save();
    ctx.beginPath();
    ctx.arc(xRoot, (yA + yB) / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = C.accent;
    ctx.fill();
    ctx.restore();
    label(ctx, '出发', xRoot + 8, (yA + yB) / 2 - 12, C.fg, { size: 10.5 });
    arrow(ctx, xRoot + 8, (yA + yB) / 2 - 4, xWay - 10, yA + 3, C.axis, 1.6);
    arrow(ctx, xRoot + 8, (yA + yB) / 2 + 4, xWay - 10, yB - 3, C.axis, 1.6);

    /* 路线一：直达，direct 片叶子 */
    label(ctx, '路线一：直达', xWay, yA - 18, C.fg, { size: 11.5, weight: 700 });
    const dyA = Math.min(22, (bot - top) / Math.max(2, st.direct * 2));
    for (let i = 0; i < st.direct; i += 1) {
      const y = yA + (i - (st.direct - 1) / 2) * dyA;
      arrow(ctx, xWay + 6, yA + 6, xLeaf - 8, y, C.named('blue'), 1.4, 7);
      ctx.save();
      ctx.beginPath();
      ctx.arc(xLeaf, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = C.named('blue');
      ctx.fill();
      ctx.restore();
    }

    /* 路线二：地铁 × 校巴 */
    label(ctx, '路线二：地铁 × 校巴', xWay, yB - 18, C.fg, { size: 11.5, weight: 700 });
    const dyB = Math.min(30, (bot - top) / Math.max(2, st.subway * 1.8));
    for (let m = 0; m < st.subway; m += 1) {
      const ym = yB + (m - (st.subway - 1) / 2) * dyB;
      arrow(ctx, xWay + 6, yB + 6, xMid - 8, ym, C.named('orange'), 1.3, 6);
      ctx.save();
      ctx.beginPath();
      ctx.arc(xMid, ym, 4, 0, Math.PI * 2);
      ctx.fillStyle = C.named('orange');
      ctx.fill();
      ctx.restore();
      for (let b = 0; b < st.bus; b += 1) {
        const yl = ym + (b - (st.bus - 1) / 2) * Math.min(16, dyB * 0.42);
        arrow(ctx, xMid + 6, ym, xLeaf - 8, yl, C.named('green'), 1, 5);
        ctx.save();
        ctx.beginPath();
        ctx.arc(xLeaf, yl, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = C.named('green');
        ctx.fill();
        ctx.restore();
      }
    }

    /* 右侧账本：两行叶子数 + 总数 */
    const bx = xLeaf + 14;
    let y = top + 6;
    label(ctx, '直达叶子', bx, y, C.named('blue'), { size: 10 });
    label(ctx, String(st.direct), bx + 78, y, C.named('blue'), { size: 11.5, weight: 700 });
    y += 18;
    label(ctx, '换乘叶子', bx, y, C.named('green'), { size: 10 });
    label(ctx, st.subway + '×' + st.bus + '=' + (st.subway * st.bus), bx + 78, y, C.named('green'), { size: 11.5, weight: 700 });
    y += 26;
    label(ctx, '叶子总数', bx, y, C.axis, { size: 10 });
    y += 22;
    label(ctx, String(total), bx, y, C.ok, { size: 24, weight: 700 });
    y += 18;
    label(ctx, st.direct + ' + ' + st.subway + '×' + st.bus, bx, y, C.fg, { size: 10.5 });
    y += 22;
    if (st.wrong) {
      label(ctx, '都加起来 = ' + wrongSum, bx, y, C.bad, { size: 11, weight: 700 });
      y += 16;
      label(ctx, '少算 ' + (total - wrongSum) + ' 种', bx, y, C.bad, { size: 10.5 });
    } else {
      label(ctx, '两主干相加', bx, y, C.axis, { size: 10 });
      y += 15;
      label(ctx, '一主干内相乘', bx, y, C.axis, { size: 10 });
    }

    ro.set('场景', '家 → 学校');
    ro.set('算式', st.direct + ' + ' + st.subway + ' × ' + st.bus + ' = ' + total);
    ro.set('结果', total + ' 种走法');
    ro.set('对照', st.wrong
      ? '把「且」当成「或」全加起来 = ' + wrongSum + '，少算 ' + (total - wrongSum) + ' 种'
      : '加法管并列主干，乘法管同一主干上的台阶');
  }

  /* ---------- 场景二：补集 ---------- */

  function drawPass(C, W, H) {
    const ctx = cv.ctx;
    const L = st.len;
    const all = ALPHA ** L;
    const bad = ALPHA;
    const good = all - bad;
    const ratio = bad / all;

    label(ctx, '全集 = 26^L，违规 = 26 个「全同字母」，合法 = 全集 − 违规', 14, 22, C.axis, { size: 10.5 });

    /* 长条：合法（绿）+ 违规（红，最少留 3 px 才看得见） */
    const x0 = 18;
    const bw = W - 36;
    const by = 56;
    const badW = Math.max(3, bw * ratio);
    ctx.save();
    ctx.fillStyle = C.named('green');
    ctx.globalAlpha = 0.78;
    ctx.fillRect(x0, by, Math.max(1, bw - badW), 26);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bad;
    ctx.fillRect(x0 + bw - badW, by, badW, 26);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, by, bw, 26);
    ctx.restore();
    label(ctx, '合法 ' + big(good), x0 + 8, by + 18, '#ffffff', { size: 10.5, weight: 700 });
    if (badW > 52) label(ctx, '违规 ' + bad, x0 + bw - badW + 5, by + 18, '#ffffff', { size: 10.5, weight: 700 });
    else label(ctx, '违规 26', x0 + bw - 2, by + 42, C.bad, { size: 10.5, align: 'right' });

    /* 违规占比随 L 的衰减曲线（线性纵轴，L=1 的 100% 正好顶格） */
    const gx = 56;
    const gw = W - gx - 34;
    const gy = H - 40;
    const gh = Math.max(20, gy - (by + 66));
    ctx.save();
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    ctx.restore();
    label(ctx, '违规占比', gx - 8, gy - gh + 4, C.fg, { size: 10, align: 'right' });
    label(ctx, '密码长度 L', gx + gw / 2, gy + 16, C.fg, { size: 10, align: 'center' });
    const maxL = 6;
    const X = (l) => gx + ((l - 1) / (maxL - 1)) * gw;
    const Y = (p) => gy - clamp(p, 0, 1) * gh;
    ctx.save();
    ctx.strokeStyle = C.named('purple');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let l = 1; l <= maxL; l += 1) {
      const yy = Y(ALPHA / ALPHA ** l);
      if (l === 1) ctx.moveTo(X(l), yy); else ctx.lineTo(X(l), yy);
    }
    ctx.stroke();
    ctx.restore();
    for (let l = 1; l <= maxL; l += 1) {
      const p = ALPHA / ALPHA ** l;
      ctx.save();
      ctx.beginPath();
      ctx.arc(X(l), Y(p), l === L ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = l === L ? C.accent : C.named('purple');
      ctx.fill();
      ctx.restore();
      label(ctx, String(l), X(l), gy + 13, C.fg, { size: 9.5, align: 'center' });
      if (l === L) label(ctx, (p * 100).toPrecision(3) + '%', X(l), Y(p) - 10, C.accent, { size: 10.5, align: 'center', weight: 700 });
    }
    label(ctx, 'L = 1 时 26 个密码全是「全同字母」，补集把全集减光', 14, H - 8, C.axis, { size: 10 });

    ro.set('场景', '密码合集（L = ' + L + '）');
    ro.set('算式', '26^' + L + ' − 26 = ' + big(all) + ' − 26');
    ro.set('结果', big(good) + ' 个合法密码');
    ro.set('对照', L === 1
      ? '违规占 100%，合法数恰好为 0——补集不是小修小补'
      : '违规只占 ' + (ratio * 100).toPrecision(3) + '%，但一位也不能漏');
  }

  function draw() {
    const C = themeColors();
    clearBg(cv.ctx, cv.W, cv.H, C);
    /* 只亮当前场景那组滑块，免得读者去拖一个对当前画面没反应的控件 */
    slRoute.box.style.display = st.scene === 'route' ? '' : 'none';
    slPass.box.style.display = st.scene === 'pass' ? '' : 'none';
    if (st.scene === 'route') drawRoute(C, cv.W, cv.H);
    else drawPass(C, cv.W, cv.H);
  }

  bWrong.addEventListener('click', () => {
    st.scene = 'route';
    st.wrong = !st.wrong;
    draw();
  });
  bReset.addEventListener('click', () => {
    st.direct = 3; st.subway = 4; st.bus = 2; st.len = 4;
    st.scene = 'route'; st.wrong = false;
    /* 回写滑块位置：每行固定是 label / input / span 三个孩子 */
    [[slRoute, 0, 3], [slRoute, 1, 4], [slRoute, 2, 2], [slPass, 0, 4]].forEach(([sl, i, v]) => {
      const row = sl.box.children[i];
      if (!row) return;
      const input = row.children[1];
      const val = row.children[2];
      if (input) input.value = String(v);
      if (val) val.textContent = String(v);
    });
    slRoute.state.direct = 3; slRoute.state.subway = 4; slRoute.state.bus = 2; slPass.state.len = 4;
    draw();
  });

  draw();
  cv.redraw = draw;
  return { destroy() { cv.redraw = null; } };
}
