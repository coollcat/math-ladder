import React from 'react';

/* =========================================================================
 * 站点图标集（描边式，24×24）
 * -------------------------------------------------------------------------
 * 统一口径（SVG skill 的三条硬规矩）：
 *   1. 必须有 viewBox——没有它就缩放不了；
 *   2. 颜色只写 currentColor——自动跟随文字色与深色模式，不许写死 #000；
 *   3. 图标一律 aria-hidden="true"——语义由外层的按钮/链接承担（它们有
 *      aria-label 或可见文字），图标本身对读屏器是装饰。
 *
 * 两种用法：
 *   React   —— <Icon name="home" size={17} />
 *   原生 DOM —— el.innerHTML = iconSvg('notebook', 22)（浮窗圆钮是手搓 DOM，走这个）
 *
 * 新增图标：往 ICONS 里加一项即可，键名即 name。
 * ========================================================================= */

export const ICONS = {
  home: [
    'M3.2 10.6 12 3.5l8.8 7.1',
    'M5.6 9.4v10.1h12.8V9.4',
    'M9.9 19.5v-5.7h4.2v5.7',
  ],
  book: [
    'M4 5.6A1.6 1.6 0 0 1 5.6 4H10a2 2 0 0 1 2 2v13.4a2 2 0 0 0-2-1.7H5.6A1.6 1.6 0 0 1 4 16.1V5.6Z',
    'M20 5.6A1.6 1.6 0 0 0 18.4 4H14a2 2 0 0 0-2 2v13.4a2 2 0 0 1 2-1.7h4.4a1.6 1.6 0 0 0 1.6-1.6V5.6Z',
  ],
  graph: [
    'M6.2 8.8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z',
    'M17.8 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z',
    'M6.2 19.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z',
    'M8.5 6.7 15.4 7.7',
    'M6.2 8.8v3.7',
    'M16.9 10.2 7.6 15.6',
  ],
  tree: [
    'M12 3.5 5.8 11h12.4L12 3.5Z',
    'M12 11v4.2',
    'M12 15.2 8.6 18.6',
    'M12 15.2 15.4 18.6',
  ],
  notebook: [
    'M5.5 4.5h11a2 2 0 0 1 2 2v11.6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z',
    'M5.5 17.9a2 2 0 0 1 2-2h11',
    'M9 8.4h6',
    'M9 12h4',
  ],
  user: [
    'M12 12.4a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z',
    'M4.9 20.4c1.4-3.4 4-5.1 7.1-5.1s5.7 1.7 7.1 5.1',
  ],
  logout: [
    'M15.6 8.4V6.6a1.9 1.9 0 0 0-1.9-1.9H6.9A1.9 1.9 0 0 0 5 6.6v10.8a1.9 1.9 0 0 0 1.9 1.9h6.8a1.9 1.9 0 0 0 1.9-1.9v-1.8',
    'M9.8 12h9.4',
    'M16.6 9.2l2.8 2.8-2.8 2.8',
  ],
  /* 外观切换：亮 / 暗 / 跟随系统 */
  sun: [
    'M12 15.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z',
    'M12 2.7v2.1',
    'M12 19.2v2.1',
    'M4.5 12H2.4',
    'M21.6 12h-2.1',
    'M6.4 6.4 4.9 4.9',
    'M19.1 19.1l-1.5-1.5',
    'M17.6 6.4l1.5-1.5',
    'M4.9 19.1l1.5-1.5',
  ],
  moon: ['M20.2 14.8A8.4 8.4 0 0 1 9.2 3.8a8.4 8.4 0 1 0 11 11Z'],
  auto: [
    'M4.6 5.4h14.8a1.2 1.2 0 0 1 1.2 1.2v8.4a1.2 1.2 0 0 1-1.2 1.2H4.6a1.2 1.2 0 0 1-1.2-1.2V6.6a1.2 1.2 0 0 1 1.2-1.2Z',
    'M9 20.4h6',
    'M12 16.2v3.4',
  ],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6.4 6.4 17.6 17.6', 'M17.6 6.4 6.4 17.6'],
  chevron: ['M6.5 9.5 12 15l5.5-5.5'],
  search: ['M11 18.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z', 'M16.4 16.4 21 21'],
};

export function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg
      className={'ml-icon' + (className ? ' ' + className : '')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** 原生 DOM 用：返回一段 SVG 字符串交给 innerHTML。路径来自上面的常量表，没有用户输入。 */
export function iconSvg(name, size = 20, strokeWidth = 1.8) {
  const paths = ICONS[name] || [];
  const body = paths.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg class="ml-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}
