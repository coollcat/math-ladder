/* lab 组件注册表 —— 汇总各章的分册注册表。
   分成 per-chapter 文件的唯一理由：多子代理并行写组件时各写各的文件，
   不会在同一个文件上打架。新增一章就在这里加一行。

   注意：每个条目必须是 **静态字面量** 的 () => import('...')，
   不能用变量拼路径——webpack 靠静态分析分包，变量路径会退化成整包加载。 */

/* ch00 是通用工具分册，放不属于某一章的站级组件（如「看见函数」） */
import ch00 from './registries/ch00.js';

/* ch04 是代数章（卷一）的分册：3Blue1Brown 式分幕动画演示组件 */
import ch04 from './registries/ch04.js';

import ch06 from './registries/ch06.js';
import ch07 from './registries/ch07.js';
import ch10 from './registries/ch10.js';
import ch11 from './registries/ch11.js';
import ch13 from './registries/ch13.js';
import ch15 from './registries/ch15.js';

/* ch16 是傅里叶章（卷一）的分册：旋转探针等频率叙事组件 */
import ch16 from './registries/ch16.js';

/* 卷三、卷四的分册：图论 / 自动机 / 编码 / 随机过程 */
import ch29 from './registries/ch29.js';
import ch31 from './registries/ch31.js';
import ch35 from './registries/ch35.js';
import ch37 from './registries/ch37.js';

/* ch47 是 Transformer 章（卷五）的分册：MoE 门控等组件 */
import ch47 from './registries/ch47.js';
import ch50 from './registries/ch50.js';
import ch53 from './registries/ch53.js';
/* ch61 是数字信号处理章（卷五）的分册：EEG 读谱等组件 */
import ch61 from './registries/ch61.js';
import ch62 from './registries/ch62.js';
import ch64 from './registries/ch64.js';
import ch65 from './registries/ch65.js';
import ch66 from './registries/ch66.js';
import ch67 from './registries/ch67.js';
import ch68 from './registries/ch68.js';
import ch69 from './registries/ch69.js';
import ch70 from './registries/ch70.js';
import ch71 from './registries/ch71.js';
import ch72 from './registries/ch72.js';
import ch73 from './registries/ch73.js';
import ch74 from './registries/ch74.js';
import ch75 from './registries/ch75.js';
import ch76 from './registries/ch76.js';
import ch77 from './registries/ch77.js';
import ch78 from './registries/ch78.js';

/* P1 回填新开的章分册（2026-10）：A 流补可视化时按章落位 */
import ch03 from './registries/ch03.js';
import ch05 from './registries/ch05.js';
import ch09 from './registries/ch09.js';
import ch14 from './registries/ch14.js';
import ch18 from './registries/ch18.js';
import ch19 from './registries/ch19.js';
import ch20 from './registries/ch20.js';
import ch21 from './registries/ch21.js';
import ch22 from './registries/ch22.js';
import ch23 from './registries/ch23.js';
import ch24 from './registries/ch24.js';
import ch25 from './registries/ch25.js';
import ch26 from './registries/ch26.js';
import ch27 from './registries/ch27.js';
import ch28 from './registries/ch28.js';
import ch34 from './registries/ch34.js';
import ch36 from './registries/ch36.js';
import ch38 from './registries/ch38.js';
import ch39 from './registries/ch39.js';
import ch41 from './registries/ch41.js';
import ch43 from './registries/ch43.js';
import ch44 from './registries/ch44.js';
import ch45 from './registries/ch45.js';
import ch46 from './registries/ch46.js';
import ch48 from './registries/ch48.js';
import ch49 from './registries/ch49.js';
import ch51 from './registries/ch51.js';
import ch52 from './registries/ch52.js';
import ch55 from './registries/ch55.js';
import ch56 from './registries/ch56.js';
import ch57 from './registries/ch57.js';
import ch58 from './registries/ch58.js';
import ch59 from './registries/ch59.js';
import ch60 from './registries/ch60.js';
import ch63 from './registries/ch63.js';

/* 同名以「后加载的章」为准；分册之间不应重名，validate.mjs 会查重 */
export const RENDERERS = Object.assign(
  {},
  ch00,
  ch04,
  ch06,
  ch07,
  ch10,
  ch11,
  ch13,
  ch15,
  ch16,
  ch47,
  ch29,
  ch31,
  ch35,
  ch37,
  ch50,
  ch53,
  ch61,
  ch62,
  ch64,
  ch65,
  ch66,
  ch67,
  ch68,
  ch69,
  ch70,
  ch71,
  ch72,
  ch73,
  ch74,
  ch75,
  ch76,
  ch77,
  ch78,
  ch03,
  ch05,
  ch09,
  ch14,
  ch18,
  ch19,
  ch20,
  ch21,
  ch22,
  ch23,
  ch24,
  ch25,
  ch26,
  ch27,
  ch28,
  ch34,
  ch36,
  ch38,
  ch39,
  ch41,
  ch43,
  ch44,
  ch45,
  ch46,
  ch48,
  ch49,
  ch51,
  ch52,
  ch55,
  ch56,
  ch57,
  ch58,
  ch59,
  ch60,
  ch63,
);

export const RENDERER_NAMES = Object.keys(RENDERERS);

export function hasRenderer(name) {
  return Object.prototype.hasOwnProperty.call(RENDERERS, name);
}

export default RENDERERS;