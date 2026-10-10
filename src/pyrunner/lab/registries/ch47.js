/* 第 47 章（Transformer 与大模型）分册注册表。
   与 ch00 / ch04 / ch68–ch75 同构——键是 lab 围栏里的 type，值是动态 import。
   路径必须是字面量，webpack 靠静态分析分包。 */
export default {
  'transformer-moe-route': () => import('../components/transformer-moe-route.js'),
};
