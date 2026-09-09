/* =========================================================================
 * lab 组件：see-function（把「看见函数」工作区嵌进课文）
 * -------------------------------------------------------------------------
 * 用法（在 .md 里写 ```lab 围栏）：
 *
 *   ```lab
 *   {
 *     "type": "see-function",
 *     "title": "拖动 a 看看抛物线怎么开合",
 *     "funcs": ["a*x^2"],
 *     "view": [-5, 5],
 *     "height": 360,
 *     "params": { "a": 1 },
 *     "keypad": true,
 *     "presets": false
 *   }
 *   ```
 *
 * 字段：
 *   funcs    初始式子数组（可多条叠加，最多 6 条）
 *   view     [x0, x1]，初始横向视野
 *   params   参数初值，键名要和式子里的字母对上
 *   height   画布高度（像素），课文里默认 360
 *   keypad   是否带符号键盘，默认关（课文里通常只读，不必占一大块）
 *   presets  是否带预设条，默认关（课文自带上下文，不需要引路）
 *
 * 之所以做成 lab 组件而不是 React 组件：课文是纯 markdown（本站禁用 .mdx），
 * 只有 ```lab 围栏这一种口子能往正文里塞交互。
 * ========================================================================= */

import { createWorkspace } from '../../func/workspace.js';

export default function render(host, spec) {
  const ws = createWorkspace(host, {
    funcs: spec.funcs,
    view: spec.view,
    params: spec.params,
    height: spec.height || 360,
    presets: spec.presets === true,
    keypad: spec.keypad === true,
  });
  return {
    destroy() {
      ws.destroy();
    },
  };
}
