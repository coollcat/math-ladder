---
title: 正交基与投影
lesson_id: functional-analysis/orthogonal-bases-projection
prereqs:
  - functional-analysis/inner-product-hilbert
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - orthogonal-basis
applications:
  - fourier-series
  - data-compression
exits:
  - research
---

# 正交基与投影

## 1. 开场钩子

傅里叶系数为什么只是“乘一下、积一次”？因为 $\sin nx$ 和 $\cos nx$ 组成了互相垂直的方向。求坐标不再解方程组，而是直接量影子。

## 2. 直觉解释

在 Hilbert 空间中，正交基像互相垂直的坐标轴。把信号投影到每个轴上，就得到对应频率的含量。只保留最大的几个投影，就是最自然的低维压缩。

## 3. 正式定义

集合 $\lbrace e_n\rbrace$ 称为**正交系**，若不同元素满足 $\langle e_m,e_n\rangle=0$；若每个 $\lVert e_n\rVert=1$，称为标准正交系。完备标准正交系的展开为：

$$v=\sum_n \langle v,e_n\rangle e_n,\qquad \lVert v\rVert^2=\sum_n |\langle v,e_n\rangle|^2.$$

第二式叫 Parseval 等式，是勾股定理的无穷维版。

## 4. 分步例题

取标准正交基 $e_1=(1,0)$，$e_2=(0,1)$ 和 $v=(3,-4)$。

1. 第一坐标是 $\langle v,e_1\rangle=3$；
2. 第二坐标是 $\langle v,e_2\rangle=-4$；
3. 近似 $(3,0)$ 的误差是 $(0,-4)$；
4. 加入第二项后误差变成零向量；
5. 长度平方满足 $25=9+16$。

## 5. 动手实验

### 实验 1：投影是最短影子

```viz
{
  "type": "projection",
  "title": "把 u 投到方向 v 上",
  "u": [5, 0],
  "v": [3, -4]
}
```

红色虚线是误差。组件中的橙点始终取垂足，所以红色误差总是垂直于绿色方向；拖动蓝色向量并观察读数，误差最短的位置就是投影，这正是“最小二乘”的几何核心。

### 实验 2：逐项保留能量

```python title="Parseval 的三项检查"
coords = [3.0, -4.0, 0.0]
kept = coords[0] * coords[0] + coords[1] * coords[1]
total = kept + coords[2] * coords[2]
print("kept=", kept)
print("total=", total)
```

若再有一个非零坐标，就必须把它加入 `total`；漏掉一项会让能量账本不平衡。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为正交基必须有限。三角函数系在 $L^2$ 中无穷多个却仍然构成坐标系统。

**误区二**：你以为部分和无条件逼近所有函数。在 $L^2$ 意义下成立，逐点收敛和一致收敛需要额外条件。

**误区三**：你以为投影系数要靠解大方程组。标准正交时系数就是内积。

:::

## 7. 练习

```exercise
# @title: 练习：用内积求傅里叶式坐标
# @check: coefficient=4.0
# @hint: 标准基方向上的系数等于 v 点乘 e。
v = [3.0, 4.0]
e = [0.0, 1.0]
coefficient = v[0] + v[1]
print("coefficient=" + str(coefficient))
```

<details>
<summary>点开查看逐步解答</summary>

$e=(0,1)$ 时，$\langle v,e\rangle=3\cdot0+4\cdot1=4$。初始代码把两个坐标相加，混入了第一分量；应改成按 $e$ 的分量加权求和：`v[0] * e[0] + v[1] * e[1]`。

```python
v = [3.0, 4.0]
e = [0.0, 1.0]
coefficient = v[0] * e[0] + v[1] * e[1]
print("coefficient=" + str(coefficient))
```
</details>

## 8. 快问快答

```quiz
标准正交基中第 n 个坐标怎么求？
- 用行列式
- 用 v 与 e_n 的内积 [*]
- 把所有坐标相加
? 其他基方向与 e_n 垂直，所以内积自动筛出第 n 个分量。
```

## 9. 选读证明

<details>
<summary>选读 · 投影误差为何垂直</summary>

设 $p=\sum_{k=1}^n c_ke_k$ 是前 n 项近似。令误差 $r=v-p$。对任意保留方向 $e_j$，最小化 $\lVert v-\sum c_ke_k\rVert^2$ 得 $c_j=\langle v,e_j\rangle$，因此 $\langle r,e_j\rangle=0$。误差与已张成子空间整体垂直，所以任何额外移动都会变长。
</details>

## 10. 下一站

现在从空间中的点转向搬运点的规则。下一课研究线性算子什么时候连续、什么叫做有界。

→ [线性算子与有界性](./50-bounded-operators.md)



