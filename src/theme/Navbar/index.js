import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import SearchBar from '@theme/SearchBar';
import { useColorMode } from '@docusaurus/theme-common';
import { Icon } from '@site/src/components/icons';
import { AUTH_EVENT, clearAuth, getAuth, loginUrlFor } from '@site/src/auth';
import DataMenu, { OPEN_DATA_EVENT } from './DataMenu';

import '../../css/nav.css';

/* =========================================================================
 * 顶栏（2026-09-02 重做，替代 Docusaurus 自带的那条）
 * -------------------------------------------------------------------------
 * 视觉：延续首页的「演算纸 × 印章朱砂」——暖纸底 + 方格纸底纹、墨蓝字、
 *       朱砂印章做品牌、激活项是一条从中间长出来的朱砂下划线。
 * 结构：左（印章 + 名号）· 中（带图标的导航项）· 右（搜索 + 账号）
 *       窄屏（≤996px）收成汉堡 → 下拉抽屉。
 *
 * 注意两点：
 *   1. 链接写死在下面的 LINKS 里，不再走 docusaurus.config.js 的 navbar.items
 *      （那边已清空，改链接请来这里）；
 *   2. 外层保留 Infima 的 `navbar navbar--fixed-top`：sticky 定位、
 *      --ifm-navbar-height 与侧栏的偏移计算都依赖它，别改成自定义定位。
 * ========================================================================= */

const LINKS = [
  { to: '/', label: '首页', icon: 'home', exact: true },
  /* 「怎么用本站」指向导览页，但整站课程都在 /docs 下，所以 /docs/* 都算它激活 */
  { to: '/docs/intro', label: '怎么用本站', icon: 'book', startsWith: '/docs' },
  { to: '/graph', label: '知识图谱', icon: 'graph' },
  { to: '/tree', label: '知识树', icon: 'tree' },
  { to: '/function', label: '看见函数', icon: 'curve' },
  /* 宣传片是 static/promo/ 下的纯静态页（不是 Docusaurus 路由）：
     用 <Link to> 会被构建期的断链检查拦下，所以标 raw，改渲染成原生 <a href>。
     代价是整页跳转——但对一个「进另一个应用」的入口来说，这正是想要的。 */
  { to: '/promo/', label: '宣传片', icon: 'play', startsWith: '/promo', raw: true },
];

/* 外观三态：亮 / 暗 / 自动（跟随系统）。
   value=null 表示「跟随系统」——与 themeConfig.colorMode.respectPrefersColorScheme
   配套，Docusaurus 会把选择存在 localStorage 的 theme 键里，刷新后照样生效。 */
const MODES = [
  { v: 'light', icon: 'sun', label: '亮色', title: '始终用亮色' },
  { v: 'dark', icon: 'moon', label: '暗色', title: '始终用暗色' },
  { v: null, icon: 'auto', label: '自动', title: '跟随系统设置' },
];

function isActive(pathname, link) {
  if (link.exact) return pathname === link.to;
  if (link.startsWith) return pathname === link.to || pathname.startsWith(link.startsWith);
  return pathname === link.to;
}

export default function Navbar() {
  const { pathname } = useLocation();
  /* colorModeChoice：'light' | 'dark' | null（null = 跟随系统）。
     SSR 阶段恒为 null，挂载后 Docusaurus 在 effect 里校正——不会水合失配。 */
  const { colorModeChoice, setColorMode } = useColorMode();
  const [auth, setAuth] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const acctRef = useRef(null);

  /* 登录态：初始值 null，挂载后才读 localStorage——SSR 与首帧渲染一致，水合安全。
     别的页面登录后靠 ml-auth-changed 事件同步，不用刷新。 */
  useEffect(() => {
    const sync = () => setAuth(getAuth());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    return () => window.removeEventListener(AUTH_EVENT, sync);
  }, []);

  /* ?panel=data 深链：登录页由它自己的内嵌面板接（更贴合上下文），
     别的页面一律由右上角那颗「数据」钮接——面板落在钮的下方。
     参数不删：刷新/分享时还能再定位一次，且登录页要读它。 */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname.replace(/\/+$/, '') === '/login') return;
    if (new URLSearchParams(window.location.search).get('panel') === 'data') {
      window.dispatchEvent(new Event(OPEN_DATA_EVENT));
    }
  }, [pathname]);

  /* 打开数据面板这件事只有一处实现（DataMenu 里的那份挂载）。
     顶栏账号菜单、抽屉、Alt+D、登录页按钮都只是**请求**它打开。 */
  const askData = useCallback(() => {
    setMenu(false);
    setDrawer(false);
    window.dispatchEvent(new Event(OPEN_DATA_EVENT));
  }, []);

  /* 路由一变就收起抽屉与账号菜单，否则点完链接菜单还挂着 */
  useEffect(() => {
    setDrawer(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  /* 点账号菜单外面就关掉（用 pointerdown：比 click 早，不会跟按钮自己打架） */
  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menu]);

  /* 账号菜单的键盘行为：它声明了 role="menu"/"menuitem"，那就得按 ARIA 的
     菜单模式来——方向键在项间移动、Esc 关闭并把焦点还给那颗钮。
     之前只支持「点外面」和「再点一次」，键盘用户打开菜单后既关不掉、
     也走不到第二项（role 声明与行为不符，是比不用 role 更糟的状态）。 */
  useEffect(() => {
    if (!menu) return undefined;
    const root = acctRef.current;
    if (!root) return undefined;
    const listItems = () => [...root.querySelectorAll('[role="menuitem"]')];
    const onKey = (e) => {
      const items = listItems();
      if (!items.length) return;
      const cur = items.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenu(false);
        root.querySelector('.ml-nav__acctbtn')?.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next = cur < 0 ? 0 : (cur + step + items.length) % items.length;
        items[next].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        (e.key === 'Home' ? items[0] : items[items.length - 1]).focus();
      }
    };
    document.addEventListener('keydown', onKey);
    /* 打开即把焦点交给第一项（ARIA 菜单模式的标准行为）：键盘用户从此处用
       方向键走；鼠标用户只是看到第一项带焦点环，关掉时焦点还给触发钮。 */
    const first = listItems()[0];
    if (first) first.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const logout = useCallback(() => {
    clearAuth();
    setMenu(false);
  }, []);

  /* 一颗按钮循环三态（亮 → 暗 → 自动 → 亮），和 Docusaurus 原来那个一样。
     三个图标全都渲染，由 CSS 按 html[data-theme-choice] 决定显示哪一个：
     colorModeChoice 在 SSR 恒为 null，只靠 state 会先闪一下「自动」。 */
  const modeButton = (inDrawer) => {
    const idx = MODES.findIndex((m) => m.v === colorModeChoice);
    const cur = idx < 0 ? MODES.length - 1 : idx;
    const next = MODES[(cur + 1) % MODES.length];
    return (
      <button
        type="button"
        className={'ml-nav__modebtn' + (inDrawer ? ' ml-nav__modebtn--wide' : '')}
        onClick={() => setColorMode(next.v)}
        title={`外观：${MODES[cur].label} · 点一下换成${next.label}`}
        aria-label={`外观：${MODES[cur].label}，点一下换成${next.label}`}
      >
        <span className="ml-nav__modeicons" aria-hidden="true">
          {MODES.map((m) => (
            <span key={String(m.v)} className="ml-nav__modeicon" data-mode={m.v ?? 'auto'}>
              <Icon name={m.icon} size={inDrawer ? 18 : 17} />
            </span>
          ))}
        </span>
        {inDrawer && <span className="ml-nav__modelabel">{MODES[cur].label}</span>}
      </button>
    );
  };

  const linkList = (inDrawer) => (
    <ul className={inDrawer ? 'ml-nav__links ml-nav__links--stack' : 'ml-nav__links'}>
      {LINKS.map((l, i) => {
        const on = isActive(pathname, l);
        const cls = 'ml-nav__link' + (on ? ' is-active' : '');
        const inner = (
          <>
            <Icon name={l.icon} size={inDrawer ? 19 : 17} />
            <span>{l.label}</span>
          </>
        );
        return (
          <li key={l.to} style={{ '--i': i }}>
            {l.raw ? (
              <a href={l.to} className={cls} aria-current={on ? 'page' : undefined}>
                {inner}
              </a>
            ) : (
              <Link to={l.to} className={cls} aria-current={on ? 'page' : undefined}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav className="navbar navbar--fixed-top ml-nav" aria-label="主导航">
      <div className="ml-nav__inner">
        <Link to="/" className="ml-nav__brand" aria-label="数学阶梯 · 回到首页">
          <span className="ml-nav__seal" aria-hidden="true">
            数
          </span>
          <span className="ml-nav__brandtext">
            <span className="ml-nav__title">数学阶梯</span>
            {/* 2026-09-02：终点早就不是傅里叶了（它只是卷一的一个枢纽站），
                现在的目标是人工智能与前沿数学 */}
            <span className="ml-nav__tag">从 1+1 到 AI 与前沿数学</span>
          </span>
        </Link>

        {linkList(false)}

        <div className="ml-nav__right">
          <div className="ml-nav__search">
            <SearchBar />
          </div>

          {modeButton(false)}

          <DataMenu />

          {auth ? (
            <div className="ml-nav__acct" ref={acctRef}>
              <button
                type="button"
                className="ml-nav__acctbtn"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-haspopup="menu"
                title="账号与学习进度"
              >
                <span className="ml-nav__avatar" aria-hidden="true">
                  {(auth.name || auth.u || '?').slice(0, 1)}
                </span>
                <span className="ml-nav__acctname">{auth.name || auth.u}</span>
                <Icon name="chevron" size={14} />
              </button>
              {menu && (
                <div className="ml-nav__menu" role="menu">
                  <p className="ml-nav__menuhint">
                    学习进度存在账号空间 <strong>{auth.u}</strong>
                  </p>
                  <Link to="/login" role="menuitem" className="ml-nav__menuitem">
                    <Icon name="user" size={16} />
                    账号与进度
                  </Link>
                  {/* 数据面板就在右上角（同一个下拉里也留一条，顺手指一下）。
                      点了不再跳登录页：面板落在右上角那颗钮下方，人不用离开当前页。 */}
                  <button type="button" role="menuitem" className="ml-nav__menuitem" onClick={askData}>
                    <Icon name="database" size={16} />
                    数据 · 备份与搬家
                  </button>
                  <button type="button" role="menuitem" className="ml-nav__menuitem" onClick={logout}>
                    <Icon name="logout" size={16} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="ml-nav__login" to={loginUrlFor(pathname)}>
              <Icon name="user" size={16} />
              <span>登录</span>
            </Link>
          )}

          <button
            type="button"
            className="ml-nav__burger"
            onClick={() => setDrawer((v) => !v)}
            aria-expanded={drawer}
            aria-label={drawer ? '收起导航' : '展开导航'}
          >
            <Icon name={drawer ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>

      {drawer && (
        <div className="ml-nav__drawer">
          {linkList(true)}
          <div className="ml-nav__drawer-modes">
            <span className="ml-nav__drawer-modelabel">外观</span>
            {modeButton(true)}
          </div>
          {/* 窄屏抽屉里再给一条数据入口：顶栏那颗钮在 ≤620px 只剩图标，
              图标认得的人不多，抽屉里有字的这一条更稳。 */}
          <div className="ml-nav__drawer-modes">
            <span className="ml-nav__drawer-modelabel">数据</span>
            <button type="button" className="ml-nav__drawer-btn" onClick={askData}>
              <Icon name="database" size={15} />
              备份与搬家
            </button>
          </div>
          <div className="ml-nav__drawer-acct">
            {auth ? (
              <>
                <span className="ml-nav__avatar" aria-hidden="true">
                  {(auth.name || auth.u || '?').slice(0, 1)}
                </span>
                <span className="ml-nav__drawer-name">{auth.name || auth.u}</span>
                <button type="button" className="ml-nav__drawer-btn" onClick={logout}>
                  <Icon name="logout" size={15} />
                  退出
                </button>
              </>
            ) : (
              <Link className="ml-nav__drawer-btn" to={loginUrlFor(pathname)}>
                <Icon name="user" size={15} />
                登录（进度存入账号空间）
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
