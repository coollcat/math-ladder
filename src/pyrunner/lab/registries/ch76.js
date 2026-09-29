/* 第 76 章组件注册表：键为 lab 围栏里的 type，值为该组件的动态 import。
   新增组件时在这里加一行，并在 components/ 下建同名文件。

   注意：箭头函数里的路径必须是字面量，webpack 靠静态分析分包。

   补记（卷七施工期）：registry.js 已经先 import 了 ch76/77/78，但分册文件当时还没建，
   整个站点构建因此报 Module not found。这里按 components/ 里实有的文件补齐，
   键名沿用「与组件文件名同名」的约定（与 ch68–ch75 一致）。 */
export default {
  'rel-collision': () => import('../components/rel-collision.js'),
  'rel-doppler': () => import('../components/rel-doppler.js'),
  'rel-gravity-clock': () => import('../components/rel-gravity-clock.js'),
  'rel-lightcone': () => import('../components/rel-lightcone.js'),
  'rel-lorentz': () => import('../components/rel-lorentz.js'),
  'rel-muon': () => import('../components/rel-muon.js'),
  'rel-rapidity': () => import('../components/rel-rapidity.js'),
  'rel-simultaneity': () => import('../components/rel-simultaneity.js'),
};
