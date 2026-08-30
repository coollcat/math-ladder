---
title: 对偶空间
lesson_id: functional-analysis/dual-spaces
prereqs:
  - functional-analysis/bounded-operators
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_concepts:
  - dual-space
applications:
  - gradients
  - constraints
exits:
  - research
---

# 对偶空间

## 1. 开场钩子

传感器给位置一个温度读数，考试给知识向量一个分数，内积 $\langle a,x\rangle$ 给方向 $x$ 一个投影值。这些都是同一个动作：用线性规则把向量变成数。

## 2. 直觉解释

对偶空间由“测量器”组成。每个有界线性泛函 $f$ 站在空间旁边，对输入 $x$ 输出一个实数；它的核是等值线中的一条直线，它的梯度方向决定最敏感的测量方向。

## 3. 正式定义

赋范空间 $X$ 的**对偶空间** $X^*$ 是所有有界线性泛函 $f:X\to\mathbb R$ 组成的空间，运算逐点定义，范数为：

$$\lVert f\rVert=\sup_{\lVert x\rVert\le1}|f(x)|.$$

有限维欧氏空间的每个线性泛函都可写成：

$$f(x)=a_1x_1+\cdots+a_nx_n=\langle a,x\rangle.$$

## 4. 分步例题

设 $f(x,y)=3x-4y$。

1. 代表向量为 $a=(3,-4)$；
2. 在 $(1,1)$ 上得 $3-4=-1$；
3. 核满足 $3x=4y$，是过原点的直线；
4. $\lVert a\rVert_2=5$；
5. 因此在单位圆上 $|f|\le5$，且在方向 $(3/5,-4/5)$ 取到最大。

## 5. 动手实验

### 实验 1：改变测量器的敏感方向

```viz
{
  "type": "plot",
  "title": "线性泛函沿 x 方向的取值",
  "expr": "a*x + b",
  "xmin": -5,
  "xmax": 5,
  "sliders": [
    { "name": "a", "min": -4, "max": 4, "step": 0.1, "value": 3 },
    { "name": "b", "min": -6, "max": 6, "step": 0.1, "value": -1 }
  ]
}
```

$a$ 控制直线斜率和敏感度；$b$ 平移函数图像，从而改变零点位置。真实二维探针会同时拖动点与代表向量，规格已写入组件清单。

### 实验 2：计算单位球上的最大得分

```python title="线性泛函的范数"
a = [3.0, -4.0]
x = [0.6, -0.8]
score = a[0] * x[0] + a[1] * x[1]
norm_a = (a[0] * a[0] + a[1] * a[1]) ** 0.5
print("score=", score)
print("dual norm=", norm_a)
```

这里 $x$ 恰好是单位向量，所以得分达到最大值 5。

## 6. 常见误区

:::warning[常见误区]

**误区一**：你以为所有向量都能自动当泛函。必须先有配对结构或表示定理；一般 Banach 空间的对偶元素不等于原空间元素。

**误区二**：你以为对偶空间只是记号翻转。它有自己的范数、弱拓扑和收敛概念。

**误区三**：你以为核是唯一重要对象。同一核可以相差常数倍，代表向量的大小决定测量的放大率。

:::

## 7. 练习

```exercise
# @title: 练习：修正线性泛函
# @check: score=2.0
# @hint: f(2,1) 应该是 3*2 加上 (-4)*1。
a = [3.0, -4.0]
x = [2.0, 1.0]
score = a[0] * x[0] - a[1] * x[1]
print("score=" + str(score))
```

<details>
<summary>点开查看逐步解答</summary>

$f(2,1)=3\cdot2+(-4)\cdot1=6-4=2$。初始代码把第二个乘积前的加号误写成减号，得到 $6+4=10$；恢复按分量相加后即可通过。

```python
a = [3.0, -4.0]
x = [2.0, 1.0]
score = a[0] * x[0] + a[1] * x[1]
print("score=" + str(score))
```
</details>

## 8. 快问快答

```quiz
对偶空间中的元素主要输出什么？
- 一个向量
- 一个数 [*]
- 一条曲线
? 泛函是线性映射 X 到实数，因此每次测量的结果是一个标量。
```

## 9. 选读边界

<details>
<summary>选读 · 表示定理为什么重要</summary>

$L^2$ 的 Riesz 表示定理说，每个连续线性泛函都能写成与某个唯一函数 $g$ 的内积 $\int f(x)\overline{g(x)}dx$。这让“求导数的对偶”和“求梯度”有了具体载体；但在 $L^1$、$C([0,1])$ 中，对偶对象的形态各不相同。
</details>

## 10. 下一站

泛函空间自己也有承重墙：对偶为什么够用、求逆为什么稳定、逐点有界为什么能升级成一致有界？下一课巡礼三大定理。

→ [泛函三大定理：承重墙巡礼](./58-three-big-theorems.md)



