---
title: 第 24 章 · 组件规格
lesson_id: complex-analysis/component-spec
draft: true
resource: component-spec
prereqs: []
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 第 24 章 · 复分析专属组件规格

本文件登记未来应实现的复分析专属交互。本轮课程只使用已上线 viz 类型和浮窗 Python；下列组件落地后，可按“回填制度”替换或增强相应实验。

## 通用要求

- 所有组件必须支持鼠标拖拽、单指触摸拖拽和键盘可达的滑块替代操作。
- Canvas 使用设备像素比缩放；移动端高度不小于 260px，控件不遮挡画布。
- 双轴语义统一：横轴为实部 Re，纵轴为虚部 Im。拖拽点先命中半径 18px 的热区，未命中时允许空白处点选。
- 每个可拖拽点必须有 Re/Im 滑块或可聚焦数字输入作为键盘替代；删除操作不得只依赖长按。
- 动画和渐进渲染使用可取消的 token；路由卸载、隐藏、错误或用户切换配置时立即停止，并保留最后一帧或显示中文原因。
- 暗色模式使用主题前景色与网格色；错误状态显示中文原因并保留原代码块容器。
- 所有异步计算和动画有停止条件；组件挂载用 dataset 守卫防止 MutationObserver 重复注入。

## domain-coloring

用途：把复函数 $f(z)$ 的值直接画在源平面上。相位映射色相，模长映射明度；零点显示全色循环收拢，极点显示反向循环。

配置：

```json
{
  "type": "domain-coloring",
  "fx": "z^2 - 1",
  "xmin": -2, "xmax": 2,
  "ymin": -2, "ymax": 2,
  "showPhaseWheel": true,
  "probe": [0.5, 0.5]
}
```

交互：双轴拖拽探针读取 $z$ 与 $f(z)$，并提供 `probeRe/probeIm` 滑块；滚轮/双指缩放中心保持在指针处；滑块控制表达式参数和网格密度。渐进渲染从低分辨率逐步升到高分辨率；“稳定区”定义为当前视口内无奇点的采样格，先渲染该区再补细节。

## conformal-grid

用途：观察解析映射如何保角。左侧为源平面方格，右侧为像平面变形格；交点处的角度读数保持不变。

配置：

```json
{
  "type": "conformal-grid",
  "fx": "z + 1/z",
  "density": 12,
  "animate": false,
  "probe": [1, 0]
}
```

交互：双轴拖拽源点，像点同步移动，并提供 `sourceRe/sourceIm` 滑块；两个方向滑块分别改变局部向量夹角和长度；播放按钮让一小段圆弧映射到像曲线并测量夹角，再次点击暂停。奇点半径阈值内自动降密度并标记不稳定区。

## contour-path

用途：在复平面绘制可编辑围道，逐段累加 $\int_C f(z)\,dz$ 的实部和虚部。

配置：

```json
{
  "type": "contour-path",
  "fx": "1/z",
  "mode": "closed",
  "points": [[1, 0], [0, 1], [-1, 0], [0, -1]],
  "samples": 240
}
```

交互：拖动顶点改变折线围道；每个顶点都有序号化 Re/Im 数字输入；“闭合”“反向”“圆化”“添加顶点”“删除选中顶点”按钮改变路径；双轴拖拽路径内部探针检查奇点，并提供坐标滑块。采样数滑块从 24 到 960；每段显示微元贡献，总积分保留 4 位小数。

## residue-probe

用途：把孤立奇点分类和留数读数放在同一画面。小圆绕奇点收缩时，积分值趋于 $2\pi i\,\mathrm{Res}$。

配置：

```json
{
  "type": "residue-probe",
  "fx": "(3 - z) / ((z - 1) * (z + 2)^2)",
  "center": [1, 0],
  "radius": 0.6
}
```

交互：双轴拖拽中心选择奇点，并提供 `centerRe/centerIm` 滑块；半径滑块控制小圆；按钮展开 Laurent 主部并高亮 -1 次项。半径小于最近其他奇点距离时进入绿色稳定区，否则显示红色警告并停止数值求和。

## pole-zero-plane

用途：展示有理函数的零点、极点和增益。拖动零极点，实时画出等模长带和相位色底图。

配置：

```json
{
  "type": "pole-zero-plane",
  "zeros": [[1, 0]],
  "poles": [[-0.5, 0.5], [-0.5, -0.5]],
  "gain": 1,
  "unitCircle": true
}
```

交互：拖拽已有零极点；每个零极点都有序号化 Re/Im 滑块；点击空白添加，“删除选中”按钮移除；增益滑块只改明度不改位置。连续系统以单位圆外的增长模式作红色警示，稳定判据仍按所用变换约定单独说明；重根用层数标记而不是重叠隐藏。

## laplace-s-plane

用途：把 $s=\sigma+i\omega$ 平面变成衰减率与振荡频率地图。

配置：

```json
{
  "type": "laplace-s-plane",
  "sigma": -0.8,
  "omega": 2,
  "time": 3,
  "showDecayEnvelope": true
}
```

交互：左图拖拽 $s$ 点，右图同步显示 $e^{st}$ 的实部波形；$\sigma$ 和 $\omega$ 滑块提供精确输入并同步拖拽点。左半平面染成稳定绿区，右半平面染成增长红区，虚轴标为临界边界；时间滑块驱动指针动画并可暂停，卸载时取消 requestAnimationFrame。

## 回填点位

| 课程 | 现用兜底 | 落地后的首选 |
| --- | --- | --- |
| 10 复变函数与映射 | complexmult / Python | domain-coloring + conformal-grid |
| 50 围道积分 | path-integral / green-theorem | contour-path |
| 70 Laurent 级数 | taylor + Python | residue-probe |
| 80 留数定理 | green-theorem + Python | contour-path + residue-probe |
| 100 Laplace 变换 | plot + Python | laplace-s-plane + pole-zero-plane |
