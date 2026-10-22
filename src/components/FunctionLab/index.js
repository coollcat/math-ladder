import React, { useEffect, useRef } from 'react';
import './style.css';

/* =========================================================================
 * 「看见函数」的 React 外壳
 * -------------------------------------------------------------------------
 * 本体是原生 DOM 的 workspace.js（画布、键盘、滑块都在那边手搓），
 * 这里只负责两件事：给一个挂载点，以及在卸载时把资源收干净。
 *
 * 走动态 import：整个子系统（表达式内核 + 数值分析 + 画布 + 键盘）
 * 只在这个组件真被渲染时才下载，不进主包。课文里若要插入，也用这个组件，
 * 但注意课文是纯 markdown，得靠 lab 围栏（见 lab/components/see-function.js）。
 * ========================================================================= */

export default function FunctionLab({ funcs, view, height, title, mode, domain, fromUrl, onIntro }) {
  const hostRef = useRef(null);
  const instRef = useRef(null);
  /* onIntro 进 option 里只在挂载时读一次，用 ref 兜住最新的那个回调 */
  const introRef = useRef(onIntro);
  introRef.current = onIntro;

  useEffect(() => {
    let dead = false;
    let inst = null;
    Promise.all([
      import('@site/src/pyrunner/func/workspace.js'),
      import('@site/src/pyrunner/func/bridge.js'),
    ])
      .then(([mod, bridge]) => {
        if (dead || !hostRef.current) return;
        /* fromUrl：/function?s=…（「复制链接」、Python 的 see() 新开标签页）或 ?f=sin(x)&m=3d
           直接按链接里的式子开场；链接坏了就当没有 */
        const spec = fromUrl ? bridge.readUrlSpec() : null;
        /* mode='3d' 时式子是 z = f(x, y)，domain 是 xy 域的半边长 */
        inst = mod.createWorkspace(hostRef.current, {
          funcs, view, height, mode, domain, spec,
          /* 「此刻这张图」的料：形态、自变量、参数、报错 */
          onIntro: (info) => { if (introRef.current) introRef.current(info); },
        });
        instRef.current = inst;
      })
      .catch((e) => {
        if (dead || !hostRef.current) return;
        const box = document.createElement('div');
        box.className = 'ml-fnlab__err';
        box.textContent = '交互组件加载失败：' + ((e && e.message) || e);
        hostRef.current.appendChild(box);
      });
    return () => {
      dead = true;
      /* instRef 与局部 inst 指向同一个实例；只解一次，
         否则 destroy 里的监听器/定时器会走两遍。 */
      const current = instRef.current || inst;
      instRef.current = null;
      if (current) current.destroy();
    };
    /* 只在挂载时建一次：式子、参数、视野都由组件内部自己管，
       重渲染不该把用户刚调好的东西冲掉 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ml-fnlab">
      {title ? <div className="ml-fnlab__title">{title}</div> : null}
      <div className="ml-fnlab__host" ref={hostRef} />
    </div>
  );
}
