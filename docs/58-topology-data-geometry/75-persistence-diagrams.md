---
title: persistence diagram 和 barcode
lesson_id: tdg/persistence-diagrams
prereqs:
  - tdg/vietoris-rips
volume: 5
layer: L11
track:
  - geometry-space
  - information-learning
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - persistence-diagram
  - barcode
applications:
  - noise-robust-shape-analysis
exits:
  - data-ai
---

# persistence diagram 和 barcode

## 1. 开场钩子

把阈值从 0 慢慢推大，有些洞刚出生就消失，有些洞活过很宽的尺度区间。持久图把每个洞画成一个点，条码画成一根横线；“活得久”才值得认真解释。

## 2. 直觉解释

一个 $H_0$ 特征通常是一个连通块的诞生；一个 $H_1$ 特征是一个环的诞生。死亡时刻是它在过滤中被另一个结构合并或填充的时刻。

barcode 是时间轴上的线段；persistence diagram 把同维特征映射到平面，横轴出生，纵轴死亡。对角线附近表示短命特征，常像噪声；远离对角线表示跨尺度稳定候选。

## 3. 正式定义

设过滤复形随参数 $t$ 单调增长。某同调类的出生值记作 $b$，死亡值记作 $d>b$，则持久度为：

$$\operatorname{pers}=d-b$$

$k$ 维 persistence diagram 是多重集：

$$D_k=\lbrace (b_i,d_i)\rbrace_i\cup\Delta$$

其中 $\Delta=\lbrace (x,x)\mid x\ge0\rbrace$ 表示无限短命类。对应的 barcode 由区间 $[b_i,d_i]$ 组成。

## 4. 分步例题

四个点排成正方形，边长 1，对角线长约 1.41。

1. $\varepsilon=0.01$：四个连通块，四个 $H_0$ 出生于 0.01；
2. $\varepsilon=1$：四边相连，连通块合成一个，三个 $H_0$ 死亡；
3. 此时中间还没有面，形成一个环，$H_1$ 出生；
4. $\varepsilon=1.41$：对角线加入，三角形填满，$H_1$ 死亡；
5. 因此该 $H_1$ 点约是 $(1.00,1.41)$，持久度约 0.41。

## 5. 动手实验

```viz
{
  "type": "plot",
  "title": "持久图示意：出生与死亡",
  "expr": "x",
  "expr2": "d + 0 * x",
  "xmin": 0,
  "xmax": 2,
  "sliders": [
    { "name": "d", "min": 0.1, "max": 2, "step": 0.02, "value": 1.4 }
  ]
}
```

蓝色对角线是“出生=死亡”的零持久线；橙色水平线是死亡值 $d$。竖拖 `d` 移动橙线；橙线的高度就是持久度的读数——它到蓝对角线的竖直距离正是 $d-b$（出生值 $b$ 图上不可见，只用于心算）。橙线拖到贴近对角线时，应降低解释强度。

```python title="从区间列表筛选长寿特征"
features = [
    {"dim": 0, "birth": 0.0, "death": 1.0},
    {"dim": 1, "birth": 1.0, "death": 1.41},
    {"dim": 1, "birth": 0.2, "death": 0.25},
]
minimum_life = 0.3

for item in features:
    life = item["death"] - item["birth"]
    print(item["dim"], round(life, 2), life >= minimum_life)
```

输出提醒我们：第二行 $H_1$ 寿命约 0.41，第三行只有 0.05。

## 6. 练习

```exercise
# @title: 练习：把持久区间转成图上点
# @check: H0 0.00 1.00 1.00
# @check: H1 1.00 1.41 0.41
# @hint: 输出维度、出生、死亡和两位小数的寿命。
bars = [
    {"dimension": 0, "start": 0.00, "end": 1.00},
    {"dimension": 1, "start": 1.00, "end": 1.41},
]

for bar in bars:
    print("unknown")
```

<details>
<summary>点开查看逐步解答</summary>

用格式化输出统一小数位：

```python
bars = [
    {"dimension": 0, "start": 0.00, "end": 1.00},
    {"dimension": 1, "start": 1.00, "end": 1.41},
]
for bar in bars:
    life = bar["end"] - bar["start"]
    # :.2f 强制两位小数，避免 1.41 这类值被打印成一位
    print(f'H{bar["dimension"]} {bar["start"]:.2f} {bar["end"]:.2f} {life:.2f}')
```

这样得到两行判题目标。注意浮点误差时可用 `round(life, 2)` 再格式化。

</details>

```quiz
持久图中远离对角线的 H1 点通常意味着什么？
- 一定是数据的因果机制
- 一个在较宽阈值范围内存在的环状候选特征 [*]
- 所有噪声都已消失
? 远离对角线说明寿命较长，但仍需检查采样密度、尺度和领域解释。
```

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为长寿特征可以脱离尺度解释。必须同时报告出生、死亡和过滤构造方式。

**误区二**：你以为长寿特征就是真理。采样偏差、投影方式和归一化都可能制造稳定伪影。

**误区三**：你以为对角线点全是垃圾。短命特征在特定任务中可能有意义，只是不宜单独宣称稳健形状。

:::

## 8. 选读：瓶颈距离

<details>
<summary>选读 · 图怎样比较</summary>

两个同维持久图之间的瓶颈距离，是最优匹配中未配对点所需最大代价；对角线可作为“丢弃”目标。稳定性定理说，合适的函数扰动会导致持久图的小瓶颈扰动。

这是 TDA 可靠性的数学来源，但它不是语义可靠性保证：输入表示变了，“稳定”的对象也随之变化。

</details>

## 9. 下一站

持久同调看全局洞；mapper 则把数据切片后压缩成图。下一站进入 mapper 图概览。

→ [mapper 图概览](./80-mapper-graphs.md)
