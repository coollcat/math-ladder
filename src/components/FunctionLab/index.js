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

export default function FunctionLab({ funcs, view, height, title, mode, domain }) {
  const hostRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    let dead = false;
    let inst = null;
    import('@site/src/pyrunner/func/workspace.js')
      .then((mod) => {
        if (dead || !hostRef.current) return;
        /* mode='3d' 时式子是 z = f(x, y)，domain 是 xy 域的半边长 */
        inst = mod.createWorkspace(hostRef.current, { funcs, view, height, mode, domain });
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
      if (instRef.current) {
        instRef.current.destroy();
        instRef.current = null;
      }
      if (inst) inst.destroy();
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
