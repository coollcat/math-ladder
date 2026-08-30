---
title: 第 58 章专属组件规格
lesson_id: tdg/component-spec
draft: true
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 4
---

# 第 58 章专属组件规格

本文件只登记尚未实现的理想教具。正式课程当前只能使用已有 `fit`、`plot`、`numberline`、`set-mapper` 和浮窗 Python；不得把这些名称写成已上线 `viz type`。

## 公共需求

1. 所有组件通过现有 `viz` JSON 围栏接入；解析失败显示中文错误且不影响页面水合。
2. 点云画布和参数平面必须支持 x/y 双轴独立拖拽：指针按下后同时更新横纵坐标，触屏不产生页面滚动冲突，并提供键盘方向键微调。
3. 所有搜索、过滤、全点对比较必须有硬上限；默认最大点数建议 200，超过时强制降采样并显示实际数量。
4. 阈值控件显示数值、单位化范围、重置按钮；连续动画使用 `requestAnimationFrame` 并遵守减少动态偏好。
5. 支持暗色模式、移动端纵排布局、路由切换重扫不重复绑定；异步运行必须有重入守卫。
6. 每个组件提供 CSV 导出或 JSON 快照，记录参数、种子、样本量和过滤上限。

## rubber-deformation-lab

- 目标：展示拉伸、压缩、剪切和扭转下不变量保持。
- 配置：`mode`（cup/torus/surface）、`handles`、`showCutGlueWarnings`。
- 必做：控制柄支持 x/y 双轴拖拽；撕开或粘合操作弹出红色警示并撤销；实时显示连通块数、边界数和候选亏格。
- 课程落点：10、35、45。

## open-set-painter

- 目标：在参数平面上绘制开集并测试内点、闭包与补集。
- 配置：`grid`、`brushes`、`testPoints`、`topologyPreset`。
- 必做：画笔中心和测试点都支持 x/y 双轴拖拽；显示任意有限并与有限交结果；无限交仅作为预设反例。
- 课程落点：15、25、30。

## surface-genus-explorer

- 目标：增删环柄、切换定向性并同步 Euler 账本。
- 配置：`genus`、`orientable`、`boundaryComponents`。
- 必做：环柄控制点和截面探针支持 x/y 双轴拖拽；显示 $\chi=2-2g$ 或不可定向对应公式；禁止把普通圆孔误标为亏格。
- 课程落点：40、45。

## rips-filtration

- 目标：拖动尺度滑杆时实时更新 Rips 边和高维团。
- 配置：`points`、`epsilonMin`、`epsilonMax`、`maxPoints`、`maxSimplices`。
- 必做：点云必须支持逐点 x/y 双轴拖拽；阈值轴也支持双端把手拖动；超过上限时停止扩展并提示降采样；区分 Rips 团与 Čech 公共交集。
- 课程落点：65、70、75。

## persistence-diagram

- 目标：barcode 与 persistence diagram 双向联动。
- 配置：`diagrams`、`dimensions`、`minPersistence`、`maxFeatures`。
- 必做：出生/死亡平面中的特征点支持 x/y 双轴拖拽用于教学假设实验；条码端点同样可拖；显示到对角线的持久度和过滤阈值。
- 课程落点：75、85。

## mapper-graph

- 目标：可视化镜头函数、重叠覆盖、聚类节点与桥边。
- 配置：`lens`、`intervals`、`overlap`、`clusterLinkage`、`minClusterSize`、`seed`。
- 必做：镜头参数平面支持 x/y 双轴拖拽；覆盖区间端点可拖；节点布局可拖；显示每个节点样本数、覆盖率、重叠来源和参数敏感性警告。
- 课程落点：80、85、90。
