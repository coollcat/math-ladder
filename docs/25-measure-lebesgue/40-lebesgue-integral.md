---
title: 勒贝格积分思想
lesson_id: measure-lebesgue/lebesgue-integral
prereqs:
  - measure-lebesgue/measurable-functions
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
  - lebesgue-integral
  - layer-cake
applications:
  - expectation-as-integral
exits:
  - research
---

# 勒贝格积分思想

## 1. 从一个场景开始

数一罐硬币有两种方式。Riemann 的办法是按**时间顺序**：一枚一枚从左到右过秤，累加。Lebesgue 的办法是先**分面额**：1 角的堆一堆、5 角的堆一堆、1 元的堆一堆，每堆"枚数 × 面值"再总加。

面对温顺的函数，两种算法答案相同——所以黎曼积分至今好用。但 Dirichlet 函数来了：它像一把撒进沙里的硬币，每一小格都上下乱跳，"按顺序过秤"直接死机。"分面额"却毫发无伤：值 1 的那堆地盘是有理数集（测度 0），值 0 的那堆地盘长 1，积分立刻算出 $1\times 0+0\times 1=0$。

## 2. 直觉解释

黎曼切**横轴**：把定义域切成细条，条宽 × 条高求和。勒贝格切**纵轴**：把值域切成薄层，问每一层"函数值落在这层里的 $x$ 有多大地盘"，然后

$$\text{面积} \approx \sum_{\text{层}} \text{层高}\times\text{地盘大小}$$

这就是"分层蛋糕"公式的前奏：

$$\int_0^1 f(x)\,dx=\int_0^{\infty}\bigl|\lbrace x:f(x)>y\rbrace\bigr|\,dy$$

右边读作：把阈值 $y$ 从 0 抬到顶，把"高于阈值的土地面积"随高度积一遍。第 30 课你亲手量过抛物线的切片长度 $2\sqrt{t}$——把它对 $t$ 积分就是 $\int_{-2}^{2}x^2 dx$。切片视角与面积视角，此刻合二为一。

## 3. 正式定义

**第一步（简单函数的积分）**：简单函数 $f=\sum_i a_i\,\mathbf{1}_{E_i}$（各块地盘可测、互不相交）的积分定义为

$$\int f\,d\mu=\sum_{i=1}^{n}a_i\,\mu(E_i)$$

即"每堆枚数 × 面值再总加"，$d\mu$ 提醒你：称量地盘用的尺子是测度 $\mu$。

**第二步（一般非负函数的积分）**：用简单函数从下方托举：

$$\int f\,d\mu=\sup\Bigl\lbrace\int s\,d\mu:\ s\text{ 简单},\ 0\le s\le f\Bigr\rbrace$$

所有从下方够得着 $f$ 的积木塔里，最高的那座就是 $f$ 的积分。

| 对比项 | Riemann | Lebesgue |
| --- | --- | --- |
| 切谁 | 定义域（横轴） | 值域（纵轴） |
| 积木 | 细矩形条 | 水平切片 × 层高 |
| Dirichlet 函数 | 不可积 | 可积，值为 0 |
| 连续函数上的结果 | 一切照旧 | 与 Riemann 数值一致 |

## 4. 分步例题

**例**：用分层蛋糕公式重算 $\displaystyle\int_0^1 x\,dx$，阈值取 $N=10$ 格。令 $L(t)=|\lbrace x:f(x)>t\rbrace|=1-t$，则原积分就是 $\int_0^1 L(t)\,dt$。

1. 把纵轴 $[0,1]$ 切成 10 小段，每段高 $\tfrac{1}{10}$；
2. 右端点和用每个小区间右端的 $L$ 值：$\sum_{k=1}^{10}\bigl(1-\tfrac{k}{10}\bigr)\cdot\tfrac{1}{10}=0.45$；
3. 左端点和用每个小区间左端的 $L$ 值：$\sum_{k=0}^{9}\bigl(1-\tfrac{k}{10}\bigr)\cdot\tfrac{1}{10}=0.55$；
4. 因为 $L(t)$ 递减，右端点和从下方逼近，左端点和从上方逼近；
5. 真值被夹在中间：$(0.45+0.55)/2=0.5=\displaystyle\int_0^1 x\,dx$ ✓。层越切越薄，两个和一起挤向同一个极限——这正是"sup 托举"定义的数值化身。

## 5. 动手实验

### 实验 1：老朋友对照——黎曼竖切的上下夹逼

```viz
{
  "type": "riemann-upper-lower",
  "title": "x² 在 [0,2] 的上下和（横轴切割）",
  "expr": "x^2",
  "xmin": 0,
  "xmax": 2,
  "n": 10
}
```

拖动格数看竖切夹逼。这套机器对付 $x^2$ 绰绰有余，但换上 Dirichlet 函数会当场罢工——上下和永远差 1。

### 实验 2：新机器上岗——水平切片累加

```python title="勒贝格分层蛋糕：x 在 [0,1] 的积分"
# sliders: N=10 [1:100:1]
thickness = 1 / N          # 每层的高度
lower = 0.0                # 下层和累加器
upper = 0.0                # 上层和累加器
for k in range(N):
    left_height = 1 - k / N         # 左端点处的蛋糕高度 L(t)
    right_height = 1 - (k + 1) / N  # 右端点处的蛋糕高度 L(t)
    lower = lower + right_height * thickness   # L 递减：右端点给下和
    upper = upper + left_height * thickness    # L 递减：左端点给上和

print(round(lower, 4))
print(round(upper, 4))
print(round((lower + upper) / 2, 4))
```

输出 0.45、0.55、0.5：与例题手算一致。把 `N` 改成 100 再跑，两个和挤到 0.495 与 0.505——夹逼收紧，逼近真值 0.5。

### 快问快答

```quiz
Lebesgue 积分处理函数的第一步是什么？
- 把定义域均匀切成小区间
- 把函数图像下的区域旋转一周求体积
- 按函数值的高低把定义域分成若干块地盘 [*]
? 先按值域分层、量出每层地盘的测度，这正是它与 Riemann 积分的根本区别。
```

:::warning[常见误区]

**误区一**："勒贝格积分就是把函数切成水平条当矩形算。"
水平切片只是直觉草图；严格定义是对**全部**简单函数托举取上确界。切片图告诉你为什么合理，sup 定义才保证任何可测函数都有一致的处理。

**误区二**："勒贝格可积的函数黎曼都可积，只是算法不同。"
方向反了：连续函数两边数值一致，但 Dirichlet 函数这类"处处间断"的家伙只在勒贝格世界可积。新理论是扩容，不是改装修。

**误区三**："只要函数可测就能积分。"
可测只是入场券；非负可测函数总有积分（可能是 $+\infty$），但要得到有限积分还得函数"别太狂野"。正负值混合时更要求正负两部分至少一边有限——这些边界条款在第 50 课收敛定理处还会现身。

:::

## 6. 练习

**练习 1**：实验 2 的账本里，递减蛋糕高度的两行取样点被拿反了——把它们各归各位：

```exercise
# @title: 练习：对齐分层蛋糕的下层和与上层和
# @check: 0.45
# @check: 0.55
# @hint: 蛋糕高度 L(t)=1-t 递减。右端点取样得到较小的 L 值，所以是下和；左端点取样才是上和。
N = 10                      # 层数
thickness = 1 / N           # 层高
lower = 0.0                 # 下层和
upper = 0.0                 # 上层和
for k in range(N):
    lower = lower + (1 - k / N) * thickness             # ← 问题在这：这是左端点取样？
    upper = upper + (1 - (k + 1) / N) * thickness       # ← 这是右端点取样？
print(round(lower, 4))
print(round(upper, 4))
```

修好后输出 0.45 与 0.55，平均恰为 0.5。注意两层和之差恒为 $\tfrac{1}{N}$——层越细误差越小的定量版本。

**练习 2**：用分层蛋糕公式解释：为什么 Dirichlet 函数在 $[0,1]$ 上的积分为 0？

<details>
<summary>点开查看逐步解答</summary>

对任意阈值 $y\in(0,1]$：切片 $\lbrace f>y\rbrace$ 是全体有理数，零测，面积为 0；$y=0$ 时切片是无理数集，长度为 1。于是蛋糕公式的被积函数在 $(0,1]$ 上恒为 0，只有单点 $y=0$ 处是 1——而单点不贡献积分。故

$$\int_0^1 f\,d\mu=\int_0^1\bigl|\lbrace f>y\rbrace\bigr|\,dy=\int_0^1 0\,dy=0$$

对比 Riemann 世界里这个函数连入场资格都没有：新积分机的第一场胜利。
</details>

## 7. 选读：为什么"sup 托举"不会翻车

<details>
<summary>选读 · 良定义性的两道保险</summary>

同一只简单函数可以有多种"面额分解"（比如指示函数 $\mathbf{1}_{[0,1]}$ 也能写成 $\mathbf{1}_{[0,\tfrac12]}+\mathbf{1}_{(\tfrac12,1]}$），凭什么积分值唯一？第一道保险：对不相交地盘的可数可加性保证不同分解算出的总和一致——这正是第 10 课花血本买下的公理。第二道保险：sup 定义对一切简单函数托举同时取最大，天然免疫分解方式的分歧。当年勒贝格在博士论文里反复打磨的正是这两处；后来 Carathéodory 把它们整理成今天教科书的标准形态。

</details>

## 8. 下一站

积分机已上线。最后一个悬案：函数列的极限与积分能不能交换次序？黎曼时代要靠苛刻的一致收敛；勒贝格给出两张宽松得多通行证——单调收敛与控制收敛。

→ [收敛定理](./50-convergence-theorems.md)
