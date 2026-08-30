---
title: 第 26 章 · 组件规格（生产档案）
lesson_id: functional-analysis/component-spec
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
draft: true
---

# 第 26 章 · 专属组件规格

本文只登记未来集成方案；当前正式课一律使用已实现渲染器或浮窗 Python。所有二维参数面和函数空间探针必须支持画布内 **x/y 双轴拖拽**，并保留键盘可达的数值输入或滑块。

| 候选 | 概念目标 | 最小交互规格 | 首批落点 |
| --- | --- | --- | --- |
| `norm-unit-balls` | 同一向量集合在不同范数下的单位球 | 左右双 canvas：左图拖动点 $(x,y)$ 并显示 $L_1,L_2,L_\infty$ 范数；右图叠加菱形、圆、方形边界。拖拽范围至少 $[-2,2]^2$；显示最近单位球缩放系数和三种长度排序。 | 20 |
| `operator-action` | 有界线性算子的拉伸与压缩 | 输入 $2\times2$ 矩阵可拖网格基向量；输出显示 $\lVert Ax\rVert/\lVert x\rVert$、当前方向、算子范数候选和上下界。x/y 双轴拖输入箭头终点，按钮切换单位圆像。 | 50 |
| `dual-probe` | 线性泛函的水平集与法向量 | 平面中拖动泛函向量 $(a,b)$ 和探测点 $(x,y)$；显示 $f(x)=a x+b y$、等值线族、核直线和 $\lvert f(x)\rvert/\lVert x\rVert$。x/y 双轴独立拖动，不把两点锁成一个参数。 | 55 |
| `adjoint-map` | $A$ 与 $A^*$ 的几何对偶 | 左画布拖输入 $x$，右画布同步显示 $Ax$ 与 $\langle Ax,y\rangle$ 的投影；另一侧可拖 $y$ 得到 $A^*y$。高亮“两个内积相等”的对偶桥。 | 60 |
| `spectrum-map` | 特征方向、谱点和数值域 | 复平面/实平面拖探针 $z$，显示 resolvent 大小、谱点标记、特征方向流线。矩阵可在正常、旋转、剪切之间切换；谱点不可拖时明确置灰。 | 70 |
| `weak-strong-convergence` | 强收敛与弱收敛差异 | 函数列画布支持拖采样点 $(x,n)$：强模式要求曲线整体贴近极限，弱模式仅显示与固定测试函数的积分值收敛。提供噪声振荡、移动尖峰、高频质量三个预设。 | 80 |

通用验收：

1. 触控、鼠标与键盘均可操作；指针释放后状态保留。
2. 明暗主题颜色来自现有主题变量，文本不遮挡图形。
3. 所有数值标签使用中文说明，公式不超过一行。
4. 渲染器加入 `src/pyrunner/viz.js` 后，再按对应课程回填；回填前正文不得引用这些类型。
5. 在现有 `linear-map` 和 `eigen-direction` 改用 nullish 判断前，它们的 `matrix` 数组不得包含 `0`：当前真值读取会把合法零项替换成默认值。未来 `operator-action` 与 `spectrum-map` 实现时必须直接支持任意矩阵项，包括零。
