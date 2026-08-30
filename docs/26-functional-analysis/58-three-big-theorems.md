---
title: 泛函三大定理：承重墙巡礼
lesson_id: functional-analysis/three-big-theorems
prereqs:
  - functional-analysis/dual-spaces
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - hahn-banach-theorem
  - open-mapping-theorem
  - closed-graph-theorem
  - uniform-boundedness-principle
applications:
  - operator-theory
  - numerical-analysis
exits:
  - research
---

# 泛函三大定理：承重墙巡礼

## 1. 开场钩子

大楼能住人，靠的是住户看不见的承重墙。泛函分析这座大厦也一样——前面各课有几句"随口就用了"的话，其实都押在三面墙上：弱收敛课的误区二说过"只要泛函族分离点，弱极限自动唯一"——泛函凭什么够用？解方程时"求逆不炸"靠什么担保？"逐点有界就放心"又是谁批的条子？本课把三位幕后功臣一次请上台：Hahn-Banach、开映射/闭图像、一致有界原理。

## 2. 直觉解释

| 定理 | 一句话台词 | 它兑现的日常 |
| --- | --- | --- |
| Hahn-Banach | 泛函想延拓就能延拓：异点必有泛函分得开 | "对偶够用" |
| 开映射 / 闭图像 | 满射有界算子的逆自动有界 | "求逆不炸" |
| 一致有界原理 | 逐点有界 + 空间完备，范数就集体有界 | "逐点账本可信" |

三面墙共用一块地基：**完备性**（Banach 空间）。空间里没有洞，定理才有牙齿；洞一出现（下一节的反例）它们就集体失灵。

## 3. 正式定义

**Hahn-Banach 延拓定理**：赋范空间 $X$ 的子空间 $M$ 上定义的有界线性泛函 $f$，可以延拓成全空间 $X$ 上的有界线性泛函 $F$ 且范数不变：

$$\lVert F\rVert=\lVert f\rVert,\qquad F\big|_M=f.$$

推论（分离点）：对任何 $x\ne y$，必有连续线性泛函 $f$ 使 $f(x)\ne f(y)$——对偶足够稠密，看得清每一个点。

**开映射定理**：Banach 空间之间的满射有界线性算子 $T:X\to Y$ 把开集映成开集。推论：若 $T$ 还是双射，则逆算子 $T^{-1}$ 自动有界。**闭图像定理**是它的搭档：线性算子若定义域闭、图像闭，则必有界——"逐点收敛也保账本"的另一种写法。

**一致有界原理**（Banach-Steinhaus）：设 $X$ 是 Banach 空间，连续线性映射族 $T_n$ 逐点有界：

$$\sup_n\lVert T_n x\rVert<\infty\quad\text{对每个固定的 } x\in X,$$

则范数一致有界：$\sup_n\lVert T_n\rVert<\infty$。

## 4. 分步例题

反例圣地 $c_{00}$：只有有限多项非零的序列组成的空间，尺子取上确界范数——它不完备（$(1,\tfrac12,\tfrac13,\dots)$ 的有限截断都住在里面，极限却搬去了别处）。

1. 定义坐标泛函族 $T_n(x)=n\cdot x_n$：读第 $n$ 个分量、放大 $n$ 倍；
2. 每个 $T_n$ 都有界：$\lVert T_n\rVert=n$（把单位向量的第 $n$ 位放 1 就把它顶满）；
3. 逐点检查：固定 $x$ 只有前 $N$ 项非零，于是 $n>N$ 时 $T_n(x)=0$——$\sup_n\lvert T_n(x)\rvert=\max_{n\le N}n\lvert x_n\rvert<\infty$；
4. 但 $\sup_n\lVert T_n\rVert=\sup_n n=\infty$：范数集体爆炸；
5. 漏洞正在 $c_{00}$ 不完备——换任何 Banach 空间，一致有界原理都会当场封杀这种爆炸。

## 5. 动手实验

### 实验 1：逐点读数 vs 峰值爆炸

```viz
{
  "type": "plot",
  "title": "读数曲线：n 越大，内部越平、峰值越高",
  "expr": "n * x ^ n",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "n", "min": 1, "max": 30, "step": 1, "value": 5 }
  ]
}
```

把横轴上每个点想成空间里的一个"向量"，曲线是泛函 $T_n$ 在它身上的读数。拖大 $n$：内部每一点（$x<1$）的读数反而被压平——逐点有界；而 $x=1$ 处的峰值一路冲到 $n$——范数爆炸。这是"逐点账本与统一账本分岔"的直觉骨架，真正的泛函版反例就是上面的 $c_{00}$。

### 实验 2：坐标泛函族上手

```python title="c_00 上的坐标泛函：逐点有界、范数爆炸"
x = [1.0, 0.5, 0.25, 0.125, 0.0625]   # c_00 的向量：第 5 位之后全零

def T(n, vec):
    # 坐标泛函：读第 n 个分量、放大 n 倍；越界按 0 记账
    if n <= len(vec):
        return n * vec[n - 1]
    return 0.0

print(T(2, x))
print(T(6, x))
print(T(3, x) / x[2])   # 用单位向量 e_3 检验：读数恰为 ‖T_3‖ = 3
```

输出 `1.0`、`0.0`、`3.0`：固定向量的读数安分守己（第 6 位早已越界、按 0 记账），而第三行显示 $\lvert T_3(e_3)\rvert=3$——$\lVert T_n\rVert=n$ 各自攀高。

## 6. 常见误区

::::warning[常见误区]

**误区一**：你以为三大定理是三件互不相干的工具。它们是一条链：对偶够用（Hahn-Banach）→ 求逆不炸（开映射/闭图像）→ 逐点账本可信（一致有界），地基都是完备性。

**误区二**：你以为 Hahn-Banach 会告诉你泛函长什么样。它只管存在，不管构造——"该有的泛函一定有"，具体长相不归它管。

**误区三**：你以为逐点有界就够放心。$c_{00}$ 反例里每个向量的读数都老实，范数照样集体爆炸——没有完备性，"逐点"与"一致"之间隔着深渊。

::::

## 7. 练习

```exercise
# @title: 练习：修好坐标泛函
# @check: 0.75
# @check: 0.0
# @check: 9.0
# @hint: T_n 的定义是"读第 n 个分量、再放大 n 倍"——初始代码只读不放；单位向量 e_9 的读数就是范数 ‖T_9‖。
x = [1.0, 0.5, 0.25, 0.125, 0.0625]
e9 = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]   # 单位向量：只有第 9 位是 1

def T(n, vec):
    if n <= len(vec):
        return vec[n - 1]      # ← 少乘了放大系数
    return 0.0

print(T(3, x))
print(T(9, x))
print(T(9, e9))
```

<details>
<summary>点开查看逐步解答</summary>

$T_3(x)=3\times0.25=0.75$；$T_9(x)$ 第 9 位越界、按 0 记账；$T_9(e_9)=9\times1=9$——这正是范数 $\lVert T_9\rVert=9$。

```python
def T(n, vec):
    if n <= len(vec):
        return n * vec[n - 1]
    return 0.0
```

输出 `0.75`、`0.0`、`9.0`：逐点有界由"越界按 0 记账"兑现，范数爆炸由第三行白纸黑字。

</details>

## 8. 快问快答

```quiz
一致有界原理把"逐点有界"升级成"范数一致有界"，关键前提是？
- 泛函必须是正的
- 空间完备（Banach） [*]
- 维数有限
? c_00 反例：不完备的空间里逐点有界挡不住范数爆炸；完备性封死漏洞。
```

## 9. 选读：一致有界原理的证明骨架

<details>
<summary>选读 · Baire 纲推理一览</summary>

钥匙是完备性的另一副面孔：**Banach 空间不能写成可数个"瘦子"（闭包没有内点的集合）之并**。

对每个 $m$，令 $E_m=\lbrace x:\sup_n\lVert T_n x\rVert\le m\rbrace$。逐点有界说 $\bigcup_m E_m=X$；由连续性每个 $E_m$ 是闭集。若所有 $E_m$ 都是瘦子，空间就被可数个瘦子铺满——与 Baire 纲结论矛盾。所以某个 $E_{m_0}$ 包有一个开球，再用线性齐次性把"球上的界"平移、缩放成"全空间的界"：$\lVert T_n\rVert$ 被一个只依赖 $m_0$ 的常数统一罩住。完备性不是装饰——它是唯一能把"逐点"逼成"一致"的杠杆。

</details>

## 10. 下一站

三面墙立稳，地基验收完毕。下一课回到账本本身：算子的"转置"在 Hilbert 空间改名伴随，负责让输入侧与输出侧的测量互相对账。

→ [伴随算子](./60-adjoint-operators.md)
