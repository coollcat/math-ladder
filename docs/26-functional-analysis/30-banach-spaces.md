---
title: Banach 空间
lesson_id: functional-analysis/banach-spaces
prereqs:
  - functional-analysis/norm-completion
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - banach-space
applications:
  - iterative-solvers
exits:
  - research
---

# Banach 空间

## 1. 开场钩子

数值方法不断修正近似解：$x_{n+1}=T(x_n)$。什么时候敢断言它停在真解附近？答案的关键不是公式漂亮，而是所在空间没有洞。

## 2. 直觉解释

Banach 空间是“完备的赋范空间”。你可以把它想成一间没有裂缝的地板：每一步跨得更近的路径，最终必然踩到一个实际存在的点。压缩映射每步把距离至少缩小一个固定比例，所以不会永远追着一个不存在的极限。

## 3. 正式定义

赋范空间 $(X,\lVert\cdot\rVert)$ 若完备，即每个 Cauchy 列都在 $X$ 中收敛，则称 $X$ 为 **Banach 空间**。映射 $T:X\to X$ 称为压缩，若存在 $0\le k<1$ 使得：

$$\lVert T(x)-T(y)\rVert\le k\lVert x-y\rVert.$$

## 4. 分步例题

在闭区间 $[0.5,1]$ 上考虑 $T(x)=0.5+0.2(x-x^2)$。

1. 它把区间映回自身；
2. 对 $x,y\in[0.5,1]$，导数绝对值不超过 $0.2$；
3. 因此 $\lvert T(x)-T(y)\rvert\le0.2|x-y|$；
4. 从 $x_0=1$ 出发迭代：$0.5,0.55,0.5495,\dots$；
5. 后续差距越来越小，不动点是方程 $x=T(x)$ 的解。

## 5. 动手实验

### 实验 1：看压缩距离缩水

```viz
{
  "type": "plot",
  "title": "相邻距离按 q^n 衰减",
  "expr": "q^x",
  "xmin": 0,
  "xmax": 6,
  "sliders": [
    { "name": "q", "min": 0.05, "max": 0.95, "step": 0.05, "value": 0.25 }
  ]
}
```

把 q 拖小，Cauchy 尾巴更快贴住横轴；完备性保证极限点真的落在本空间里。

### 实验 2：追踪 Cauchy 尾巴

```python title="压缩迭代的两步差"
x = 1.0
old_gap = 1.0
for n in range(1, 7):
    # range(1,7) 生成 1 到 6 的整数序列
    x_new = 0.5 + 0.2 * (x - x * x)
    gap = abs(x_new - x)
    print(n, x_new, gap)
    old_gap = gap
    x = x_new
```

第三列是相邻两项的距离。全局压缩常数保证每步差距不超过前一步的五分之一；这个非线性例子的实际局部比率还会更小。完备性正是把这些越来越近的项兑现成一个极限的原因。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为赋范空间自动完备。连续函数在 $L_1$ 尺子下可能收敛到不连续函数，所以原空间不完备。

**误区二**：你以为“越来越近”一定指相邻项。Cauchy 要求任意两项在编号很大时都很近。

**误区三**：你以为 Banach 空间必须有内积。不需要角度；只有距离和线性结构就够了。

:::

## 7. 练习

```exercise
# @title: 练习：找出压缩因子
# @check: ratio=0.25
# @hint: 若每次距离变成四分之一，压缩常数就是 0.25。
d0 = 8.0
d1 = d0 / 4
d2 = d1 / 4
ratio = d1 / d0
ratio = ratio * d2 / d1
print("ratio=" + str(ratio))
```

<details>
<summary>点开查看逐步解答</summary>

$8\to2\to0.5$。第一段比例是 $2/8=0.25$，第二段也是 $0.25$。最后一行多乘了一次相同比值，会把答案改成 $0.0625$；删除多余乘法即可得到 `ratio=0.25`。

```python
d0 = 8.0
d1 = d0 / 4
d2 = d1 / 4
ratio = d2 / d1
print("ratio=" + str(ratio))
```
</details>

## 8. 快问快答

```quiz
Banach 空间比普通赋范空间多了什么？
- 必须能计算角度
- 每个 Cauchy 列都在本空间内有极限 [*]
- 元素必须是矩阵
? 角度属于内积空间的额外结构；Banach 只要求范数加上完备性。
```

## 9. 选读证明

<details>
<summary>选读 · 压缩映射原理骨架</summary>

反复使用压缩条件得 $\lVert x_{n+m}-x_n\rVert\le k^n(1-k^m)/(1-k)\lVert x_1-x_0\rVert$，故 $(x_n)$ 是 Cauchy 列。完备性给出极限 $x$；$T$ 连续使 $Tx=\lim T(x_n)=\lim x_{n+1}=x$。若还有另一个不动点 $y$，则 $\lVert x-y\rVert=\lVert Tx-Ty\rVert\le k\lVert x-y\rVert$，只能为零。
</details>

## 10. 下一站

Banach 空间有长度却没有角度——而且函数住户还没点名。下一课先按 p 范数给可积函数安家（$L^p$ 家族），兑现第 25 章的跨章承诺；带角度的 Hilbert 随后登场。

→ [Lp 空间：可积函数的家](./35-lp-spaces.md)



