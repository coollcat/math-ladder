/* 通用工具分册（ch00）：不属于任何一章的站级交互组件放这里。
   与 ch68–ch75 那八本分册同构——键是 lab 围栏里的 type，值是动态 import。
   validate.mjs 直接扫 registries/ 目录，新建分册不需要改校验脚本。

   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'see-function': () => import('../components/see-function.js'),
};
