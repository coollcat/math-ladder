import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@site/src/components/icons';
import { AUTH_EVENT, getAuth } from '@site/src/auth';

/* =========================================================================
 * 顶栏「数据」钮 + 下拉面板（登录后页面右上角的主入口）
 * -------------------------------------------------------------------------
 * 2026-09-29 搬迁：数据面板（备份 / 还原 / 空间搬家）原先是**页面右下角第三个
 * 圆钮**——十个人有九个找不到，而「登录后进度看着像没了」恰恰是最需要它的时刻。
 * 现在它是顶栏右上角的一颗钮：点开，面板就落在**这颗钮下方**（盖在页面内容
 * 之上），任何页面随手可得，不必先跑去登录页。
 *
 * 实现要点：
 *   1. 面板本体是 src/pyrunner/backup.js 的 mountBackup()（与登录页内嵌那份
 *      是同一份实现，两处各写一遍必然文案漂移）。这里只是给它一个宿主 div。
 *   2. **按需动态 import**：backup 会顺带拉起 notebook / repo 两个模块，几十 KB，
 *      没点开之前不该进首屏。
 *   3. 首次点开后实例**留着**（只是隐藏），再点开走 handle.refresh()——
 *      每次重建会把云端状态行、滚动位置、输入框状态全丢掉。
 *   4. 关闭路径有三条：点关闭钮、点面板与钮之外、Esc。三条都收敛到 setOpen(false)，
 *      并把焦点还给那颗钮（键盘用户不会掉到 body 上）。
 *
 * 对外还认一个窗口事件 ml-open-data（Alt+D 与登录页的按钮都用它）：
 * 「一个功能只留一个家」——入口可以有几处，面板只有这一份。
 * ========================================================================= */

export const OPEN_DATA_EVENT = 'ml-open-data';

/* 有没有别的浮动面板压在上面（浮窗 / 笔记本 / 仓库 / 公式）。
   这几个面板都是 body 上固定定位的节点，且都登记在 zorder 的栈里；
   这里只问「谁开着」，不碰它们的层级。 */
function belowOtherPanels() {
  return !!document.querySelector(
    '#ml-console.is-open, #ml-notebook.is-open, #ml-repo.is-open, #ml-formula.is-open, #ml-backup.is-open',
  );
}

export default function DataMenu() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(null);
  const [broken, setBroken] = useState(false);

  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const btnRef = useRef(null);
  const handleRef = useRef(null);

  /* 登录态：只影响标题文案与账号提示。初始 null，挂载后才读 localStorage。 */
  useEffect(() => {
    const sync = () => setAuth(getAuth());
    sync();
    window.addEventListener(AUTH_EVENT, sync);
    return () => window.removeEventListener(AUTH_EVENT, sync);
  }, []);

  /* 外部（Alt+D / 登录页按钮）请求打开 */
  useEffect(() => {
    const onAsk = () => setOpen(true);
    window.addEventListener(OPEN_DATA_EVENT, onAsk);
    return () => window.removeEventListener(OPEN_DATA_EVENT, onAsk);
  }, []);

  /* 首次打开时装面板；之后只刷新数据。 */
  useEffect(() => {
    if (!open || handleRef.current || broken) return undefined;
    let dead = false;
    import('@site/src/pyrunner/backup')
      .then((mod) => {
        if (dead || !hostRef.current) return;
        handleRef.current = mod.mountBackup(hostRef.current, {
          variant: 'popover',
          onClose: () => setOpen(false),
        });
      })
      .catch(() => {
        if (!dead) setBroken(true);
      });
    return () => {
      dead = true;
    };
  }, [open, broken]);

  /* 每次打开都把最新数据画一遍：面板关着的时候进度、笔记、代码都可能变过 */
  useEffect(() => {
    if (open && handleRef.current) handleRef.current.refresh();
  }, [open]);

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus && btnRef.current) btnRef.current.focus();
  }, []);

  /* 点面板与钮之外就收起（用 pointerdown：比 click 早，不会跟钮自己打架） */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      /* 分层关闭：浮窗 / 笔记本 / 仓库 / 公式面板也都在 document 上听 Esc。
         它们叠在气泡上面时，一次 Esc 不该关掉两层——只在没有别的浮动面板
         压着的时候自己动手。 */
      if (belowOtherPanels()) return;
      close(true);
    };
    /* 捕获阶段 + 只在本层需要时 stopPropagation：不给别的面板机会抢跑 */
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, close]);

  const label = '数据';

  return (
    <div className="ml-nav__data" ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className={'ml-nav__databtn' + (open ? ' is-open' : '')}
        onClick={() => (open ? close(false) : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={
          auth && auth.u
            ? `数据 · 备份与搬家（账号 ${auth.u}）—— 导出成文件、把游客进度搬进来`
            : '数据 · 备份与搬家 —— 导出成文件带走，换设备就靠它'
        }
      >
        <Icon name="database" size={16} />
        <span className="ml-nav__datalabel">{label}</span>
      </button>

      <div
        className={'ml-nav__datapop' + (open ? ' is-open' : '')}
        role="dialog"
        aria-modal="false"
        aria-label="数据 · 备份与搬家"
        hidden={!open}
      >
        <div className="ml-nav__datahost" ref={hostRef}>
          {broken ? (
            <p className="ml-nav__datafail">
              数据面板加载失败，请刷新页面重试。
              {' '}
              学习进度与笔记仍在这台浏览器里，不会丢。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
