---
title: 紧算子选讲
lesson_id: functional-analysis/compact-operators
prereqs:
  - functional-analysis/spectrum-eigenvalues
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - compact-operator
applications:
  - integral-equations
exits:
  - research
---

# 紧算子选讲

## 1. 开场钩子

无穷维单位球太大，不能像有限维那样指望任何序列都有收敛子列。但有些算子会把这团巨大的集合“压软”，让它几乎变成有限维对象。

## 2. 直觉解释

紧算子把有界集送到相对紧集，也就是任意序列的像都有收敛子列。它常表现为“高频被强烈衰减”：矩阵对角线写 $1,1/2,1/3,\dots$，越往后的方向贡献越小。

## 3. 正式定义

设 $X,Y$ 是赋范空间。线性算子 $T:X\to Y$ **紧**，若它把 $X$ 的单位球映成相对紧集；等价地说：

$$\text{对每个有界 } (x_n),\quad (Tx_n)\text{ 有收敛子列}.$$

有限秩有界算子必紧；紧算子可用有限秩算子逼近时称为可逼近紧算子。

## 4. 分步例题

在平方可和序列空间 $\ell^2$ 中取对角算子 $T$：

$$T(e_n)=\frac{1}{n}e_n.$$

1. 每个方向都被压缩；
2. 截断前 N 项得到有限秩算子 $T_N$；
3. 算子范数由尾部系数的最大值 $\sup_{n>N}n^{-1}$ 控制；
4. $N$ 增大时 $\lVert T-T_N\rVert\to0$；
5. 因此 $T$ 是紧算子。

## 5. 动手实验

### 实验 1：截断误差的退场速度

```viz
{
  "type": "plot",
  "title": "对角紧算子的尾部上界 1/N",
  "expr": "1/x",
  "xmin": 1,
  "xmax": 12
}
```

横轴是保留前 N 个方向后的截断位置。曲线压向零，说明有限秩近似能一致逼近这个对角算子。

### 实验 2：观察高频衰减

```python title="截断近似紧算子"
window_tail_energy = 0.0
cutoff = 4
for n in range(cutoff + 1, 33):
    # 1/(n*n) 是第 n 个方向的能量权重；range(cutoff+1,33) 只扫尾部的整数编号。
    window_tail_energy = window_tail_energy + 1.0 / (n * n)
print("window_tail_energy=", window_tail_energy)
```

把 `cutoff` 从 4 改成 8、16，固定窗口内的尾部能量迅速变小。这只是能量示意，不是算子尾范数本身；真正的算子范数由尾部系数的最大值控制。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为有界就是紧。恒等算子有界，但无穷维单位球序列没有收敛子列，所以不紧。

**误区二**：你以为紧算子一定有限秩。对角衰减算子通常有无穷多个非零特征值。

**误区三**：你以为紧算子的谱一定只有零和有限点。它可以有无穷个特征值，但只能聚集在零附近。

:::

## 7. 练习

```exercise
# @title: 练习：判断衰减级数是否可和
# @check: True
# @hint: p 范数判别中，p 大于 1 时 1/n^p 可和。
p = 2.0
total = 1 + 1 / 2 + 1 / 3 + 1 / 4
print(total < 2)
```

<details>
<summary>点开查看逐步解答</summary>

有限前缀 $1+\frac12+\frac13+\frac14$ 小于 2 与否，不能当作无穷级数收敛判据。真正可用的是积分比较：当 $p>1$ 时，$\int_1^\infty x^{-p}dx=1/(p-1)$ 有界；本例取 $p=2$，余项不超过 $1/N$，所以级数可和。

```python
# 积分比较：p 大于 1 时，1/n^p 的积分余项有有限上界。
p = 2.0
convergent = p > 1
print(convergent)
```
</details>

## 8. 快问快答

```quiz
无穷维空间中的恒等算子是紧算子吗？
- 是，因为它连续
- 不是，因为单位球不是相对紧 [*]
- 取决于范数大小
? 连续只控制放大倍率；紧性还要求像集中的序列有收敛子列。
```

## 9. 选读证明

<details>
<summary>选读 · 对角算子为何可逼近</summary>

令 $T_N$ 只保留前 N 个坐标方向的 $1/n$ 倍。对任意单位向量，$\lVert(T-T_N)x\rVert^2=\sum_{n>N}|x_n|^2/n^2\le(N+1)^{-2}\sum_{n>N}|x_n|^2\le(N+1)^{-2}$，故 $\lVert T-T_N\rVert\le1/(N+1)$。有限秩有界算子一致极限为紧算子，因此 $T$ 紧。
</details>

## 10. 下一站

强收敛要求长度趋近零；弱收敛只要求所有测量值趋近零。下一课拆开这两种“接近”。

→ [弱收敛与强收敛](./80-weak-strong-convergence.md)



