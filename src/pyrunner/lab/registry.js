/* lab 组件注册表 —— 汇总各章的分册注册表。
   分成 per-chapter 文件的唯一理由：多子代理并行写组件时各写各的文件，
   不会在同一个文件上打架。新增一章就在这里加一行。

   注意：每个条目必须是 **静态字面量** 的 () => import('...')，
   不能用变量拼路径——webpack 靠静态分析分包，变量路径会退化成整包加载。 */

import ch68 from './registries/ch68.js';
import ch69 from './registries/ch69.js';
import ch70 from './registries/ch70.js';
import ch71 from './registries/ch71.js';
import ch72 from './registries/ch72.js';
import ch73 from './registries/ch73.js';
import ch74 from './registries/ch74.js';
import ch75 from './registries/ch75.js';

/* 同名以「后加载的章」为准；分册之间不应重名，validate.mjs 会查重 */
export const RENDERERS = Object.assign({}, ch68, ch69, ch70, ch71, ch72, ch73, ch74, ch75);

export const RENDERER_NAMES = Object.keys(RENDERERS);

export function hasRenderer(name) {
  return Object.prototype.hasOwnProperty.call(RENDERERS, name);
}

export default RENDERERS;
