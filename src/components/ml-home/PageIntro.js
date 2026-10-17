import React from 'react';

/* =========================================================================
 * 图谱页（/tree、/graph）的导语块
 * -------------------------------------------------------------------------
 * 桌面：两栏（正文说明在左、延伸指引在右），与画布同宽——原先两段各占 62ch
 * 且左对齐，画布比正文宽出半个身子，「正文宽度与画布边缘对齐」因此对不上。
 * 手机（≤620px）：**折成 2 行 + 「展开说明」**。390 宽下两段说明要占 10 行以上
 * （约 330px），画布被顶到第二屏去——而这一段只是读图方法，读一遍就够。
 *
 * 折叠只写成 CSS clamp + 一个按钮，桌面端两段永远整段显示，
 * 所以初始 state 取 false 不会让桌面端少一段话（也不会水合失配）。
 * ========================================================================= */

export default function PageIntro({ className = 'ml-fg__lead', main, aside }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={'ml-page-intro' + (open ? ' is-open' : '')}>
      <p className={className}>{main}</p>
      {aside ? <p className={className}>{aside}</p> : null}
      <button
        type="button"
        className="ml-page-intro__more"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '收起说明' : '展开说明'}
      </button>
    </div>
  );
}
