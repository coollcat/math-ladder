---
title: Sturm-Liouville：边值问题为什么只有离散答案
lesson_id: ode/sturm-liouville
prereqs:
  - ode/second-order-unified
volume: 2
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - sturm-liouville-form
  - self-adjoint-operator
  - eigenfunction-orthogonality
  - discrete-spectrum
applications:
  - vibration-modes
  - heat-conduction
exits:
  - engineering
  - scientific-computing
---

# Sturm-Liouville：边值问题为什么只有离散答案

## 1. 从一个场景开始

给一根小提琴弦定音：弦长、张力、线密度都定死了，你能拨出多少种音高？物理上的答案只有**一串离散**的音——基音和它的泛音。可弦的形状明明有无穷多种画法，为什么"能站得住的形状"只有可数的那么几个？

[同一个二阶方程的三种外衣](./55-second-order-unified.md)已经把机械振动、RLC 电路与梁弯曲装进同一个模子。这一课问一个更窄也更狠的问题：**同一条方程，一旦两端被夹住，"能活下来的答案"为什么只剩离散的一串？** 答案叫 Sturm-Liouville 理论，它是 16 章傅里叶级数与 23 章分离变量的共同地基。

## 2. 直觉解释

先分清两种提问方式，它们对同一个二阶方程给出完全不同的回答：

| 提问方式 | 条件 | 结果 |
| --- | --- | --- |
| 初值问题 | 给 $y(0)$ 与 $y'(0)$ | 存在且唯一，**任何**参数都有解（第 15 课） |
| 边值问题 | 给 $y(a)$ 与 $y(b)$ | 大多数参数**只有零解**，只有一小串特殊参数有非零解 |

把二阶方程想成一个筛子，边界条件就是筛孔：

```text
参数 λ 连续地扫过去   ────────▶
                        ↑    ↑      ↑
                      λ₁   λ₂     λ₃     ← 只有这几处留有非零解
              其余所有 λ 都被边界条件碾成零解 y≡0
```

**零解不是答案。** 一根处处不动的弦满足方程也满足边界条件，但它什么都没说。物理上"能站住的形状"必须是非零的，于是筛孔越细，能活的 $\lambda$ 越少——最细的情形只剩可数的一串。这一串数就是**谱**，"离散谱"三个字就是这么来的。

第二个直觉来自线性代数：实对称矩阵天然拥有实特征值与正交特征向量；微分算子只要"自伴"（对称的无穷维版本），就继承同样的三条礼物。这正是下一节把方程写成 S-L 标准形的动机。

## 3. 正式定义

**Sturm-Liouville 标准形**（区间 $x\in(a,b)$）：

$$-\frac{d}{dx}\left(p(x)\frac{dy}{dx}\right)+q(x)\,y=\lambda\,w(x)\,y .$$

等价写法 $(p y')'+qy+\lambda w y=0$，两者只差一个移项。

| 符号 | 名称 | 含义与约束 |
| --- | --- | --- |
| $p(x)$ | 系数函数（权重） | 连续且 $p>0$，代表张力/刚度/电导之类的"传导能力" |
| $q(x)$ | 势函数 | 连续，代表回复力或反应项 |
| $w(x)$ | 权函数（密度） | 连续且 $w>0$，正交性里必须带上它 |
| $\lambda$ | 本征值 | 待筛的未知常数，只有离散的一串能被留下 |
| $\alpha y(a)+\beta y'(a)=0$ | 边界条件 | 分离型：固定(β=0)、绝热(α=0) 都是它的特例；两端各一条 |

两端条件合称**正则边界条件**（$\alpha,\beta$ 与 $\gamma,\delta$ 各自不同时为零）。端点处 $p$ 为零或区间无穷时叫奇异情形，那是 96 课特殊函数的舞台。

**Sturm-Liouville 定理**（本课只需会用，论证见第 9 节选读）：

1. **实数性**：所有本征值都是实数，可以按大小排成一列 $\lambda_1<\lambda_2<\lambda_3<\cdots$ 且 $\lambda_n\to\infty$；
2. **一维性**：每个 $\lambda_n$ 只对应一个本征函数（至多差一个常数倍），可按内部零点数编号（第 $n$ 个恰有 $n-1$ 个零点）；
3. **带权正交性**：$\displaystyle\int_a^b w(x)X_m(x)X_n(x)\,dx=0$（$m\neq n$）；
4. **完备性**：任何"足够好"的函数 $f$ 都能展开成 $f=\sum_n b_nX_n$。

第 2 条是"离散"的全部内容：谱不但离散，而且一维、不重不漏。第 3、4 条合起来才让"展开"这件事可操作——正交告诉我们系数怎么求，完备担保一定能表示出来。

## 4. 分步例题

**例 1**：把第 55 课的无阻尼自由振动 $y''+\lambda y=0,\ y(0)=y(L)=0$ 改写成 S-L 标准形。

1. 对照 $-(py')'+qy=\lambda wy$：取 $p\equiv1$，则 $-(1\cdot y')'=-y''$；
2. 再取 $q\equiv0$、$w\equiv1$，于是 $-y''=\lambda y$，即 $y''+\lambda y=0$；
3. 结论：弦振动就是最简单的 S-L 问题（$p=1,q=0,w=1$），系数全常数，一次不走样的改写。

**例 2**：验算 $\lambda_1=(\pi/L)^2$、$X_1(x)=\sin(\pi x/L)$ 确实是它的本征对。

1. 求导两次：$X_1''=-(\pi/L)^2\sin(\pi x/L)=-\lambda_1X_1$，代入方程得 $-\lambda_1X_1+\lambda_1X_1=0$ ✓；
2. 左端 $X_1(0)=\sin 0=0$ ✓；右端 $X_1(L)=\sin\pi=0$ ✓；
3. 非零？在 $x=L/2$ 处 $X_1=1\neq0$，所以不是零解 ✓；
4. 三个条件同时满足，$\lambda_1$ 是合法本征值。

**例 3**：验算正交性。取 $L=1$，算 $\int_0^1\sin(m\pi x)\sin(n\pi x)\,dx$（$m\neq n$）。

1. 用积化和差：$\sin A\sin B=\tfrac12[\cos(A-B)-\cos(A+B)]$；
2. 积分得 $\tfrac12\left[\dfrac{\sin((m-n)\pi x)}{(m-n)\pi}-\dfrac{\sin((m+n)\pi x)}{(m+n)\pi}\right]_0^1$；
3. 两个正弦在 $x=0$ 与 $x=1$ 处都为零（$(m\mp n)$ 是整数），整式等于 **0**；
4. 若 $m=n$，第二项消失、第一项退化为 $\int_0^1\sin^2=\tfrac12$，这就是归一化常数 $L/2$ 的来历；
5. 正交与归一合起来，这套函数才配当"坐标轴"用。

## 5. 动手实验

### 实验 1：夹具一换，谱整族换掉

```viz
{
  "type": "eigen-boundary",
  "title": "三个本征函数的同框：切换边界看谱怎么被筛出来",
  "L": 1,
  "n": 3,
  "mode": "dirichlet"
}
```

灰色是同族的前四个本征函数，红色是当前 $n$ 号。把边界按钮逐个切过去：两端固定只放行端点为零的正弦，两端绝热只放行端点斜率为零的余弦，左固定右绝热放行"四分之一波"。**同一个方程、同一根区间，边界一换整族本征函数连编号规则一起改写。** 读数里的 $\lambda_n$ 是这一族自己的值。

### 实验 2：离散谱怎么逼近连续谱

```python
import math                                  # 首次出现的 import：标准数学库

L = 1.0                                      # 弦长

def lam_diff(k, h):                          # def 定义函数：h 网格上第 k 个离散本征值
    return 4 * math.sin(k * math.pi * h / 2) ** 2 / (h * h)   # math.sin 正弦，** 是幂运算

def lam_exact(k):                            # math.pi 是圆周率常数
    return (k * math.pi / L) ** 2            # 连续情形的 λ_k = (kπ/L)²

for h in (0.1, 0.02):                        # 两种网格密度
    row = [round(lam_diff(k, h), 4) for k in range(1, 4)]   # 列表推导：一次算出三个
    print(h, row)                            # round(x, 4) 保留四位小数
print([round(lam_exact(k), 4) for k in range(1, 4)])
```

输出 `0.1 [9.7887, 38.1966, 82.4429]`、`0.02 [9.8664, 39.4265, 88.5637]`、`[9.8696, 39.4784, 88.8264]`。三点差分的公式 $\lambda_k\approx\dfrac{4}{h^2}\sin^2\dfrac{k\pi h}{2}$ 在 $h\to0$ 时收敛到 $\left(\dfrac{k\pi}{L}\right)^2$：网格越细，离散谱越贴连续谱。注意 $h=0.5$ 时得到 `[8, 16, 8]`——第 3 号被粗糙网格"折叠"回低序号，那是离散谱自己的走样，不是物理。

### 实验 3：用中点法把正交性算出来

```python
import math

m, n = 1, 2                                  # 两个不同的模态编号
steps = 2000                                 # 中点法分段数
h = 1.0 / steps                              # 每段宽度

orth = 0.0                                   # 累加器：正交积分 ∫X₁X₂ dx
nrm = 0.0                                    # 累加器：归一积分 ∫X₁² dx
for k in range(steps):                       # range(steps) 依次给 0..steps-1
    x = (k + 0.5) * h                        # 取每段中点，中点法比端点法准
    orth += math.sin(m * math.pi * x) * math.sin(n * math.pi * x)
    nrm += math.sin(m * math.pi * x) ** 2

orth *= h                                    # 乘回段宽才是积分值
nrm *= h
print(round(abs(orth), 6), round(nrm, 6))    # abs 取绝对值，挡住机器零的负号
```

输出 `0.0 0.5`。$m\neq n$ 时数值积分塌到机器零，$m=n$ 时给出 $0.5=L/2$——**正交性可以逐点算出来，不必背公式。**

## 6. 练习

下面这段代码想交付两样东西：前三个本征值，以及模态 1 与模态 2 的正交积分。两处想当然：本征值漏了平方，正交积分里把两个频率写成了同一个。

```exercise
# @title: 练习：本征值表与正交性检验
# @check: [9.87, 39.478, 88.826]
# @check: 0.0
# @check: 0.5
# @hint: λ_n 是 (n*pi/L) 的平方，不是 n*pi/L；正交积分要求两个模态编号不同（m≠n），写成同一个频率算出来的就成了归一化常数 0.5。
import math

L = 1.0
lams = []
for n in range(1, 4):
    lam = n * math.pi / L                    # ← 有错一：漏了平方
    lams.append(round(lam, 3))               # append：往列表尾部追加元素
print(lams)

m, n = 1, 2
steps = 2000
h = L / steps
s = 0.0
for k in range(steps):
    x = (k + 0.5) * h
    s += math.sin(m * math.pi * x) * math.sin(m * math.pi * x)   # ← 有错二：第二个频率应是 n
s *= h
print(round(abs(s), 3))

nrm = 0.0
for k in range(steps):
    x = (k + 0.5) * h
    nrm += math.sin(m * math.pi * x) ** 2
nrm *= h
print(round(nrm, 3))
```

<details>
<summary>点开查看逐步解答</summary>

修正版只有两处改动——本征值补平方、正交积分换成两个不同的频率：

```python
import math

L = 1.0
lams = []
for n in range(1, 4):
    lam = (n * math.pi / L) ** 2
    lams.append(round(lam, 3))
print(lams)                                  # [9.87, 39.478, 88.826]

m, n = 1, 2
steps = 2000
h = L / steps
s = 0.0
for k in range(steps):
    x = (k + 0.5) * h
    s += math.sin(m * math.pi * x) * math.sin(n * math.pi * x)
s *= h
print(round(abs(s), 3))                      # 0.0：不同模态正交
```

第三行 `0.5` 是 $\int_0^1\sin^2(\pi x)\,dx=L/2$ 的归一化常数，代码不变。

```text
λ₁ = (1π/1)² = 9.870      λ₂ = (2π)² = 39.478    λ₃ = (3π)² = 88.826
∫₀¹ sin(πx)·sin(2πx) dx = 0        ← m ≠ n，正交
∫₀¹ sin(πx)·sin(πx) dx = 1/2       ← m = n，归一
```

初始代码把 $m=n$ 用在了本该 $m\neq n$ 的位置，正交积分反而算出 $0.5$——**这个 0.5 不是"对"的证据，而是"少算了一个模态"的证据。** 正交性是模态族互相独立的凭证，也解释了后面为什么能把任意初值一项一项拆开。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为边值问题一定无解或一定有解。真相是"分情况"：绝大多数 $\lambda$ 只有零解，一小串 $\lambda$ 有非零解。判定工具就是第 9 节那个边界条件决定的方程 $\sin(\sqrt\lambda L)=0$。

**误区二**：你以为"离散谱"是物理世界的量子性偷偷溜进来了。这里纯粹是数学后果：**有限区间 + 两端夹持**就把连续参数筛成了可数集。区间换成整条实轴、或去掉夹持，谱立刻变成连续的一整段（16 章的傅里叶变换就是那种情形）。

**误区三**：你以为正交性是自动的。必须带上权函数 $w$：一般 S-L 问题里正交的口径是 $\int wX_mX_n=0$，只有当 $w\equiv1$（弦振动、均匀杆热传导）时才退化成不带权的那个熟悉写法。96 课里圆域径向方程的正交权是 $w(r)=r$，忘掉 $r$ 会算出一堆"看起来不零"的积分。

:::

## 8. 快问快答

```quiz
Sturm-Liouville 问题里的本征值为什么是离散的一串？
- 因为区间有限且两端加了夹持条件，边界把连续参数筛成了可数集 [*]
- 因为能量只能取量子化的值
- 因为微分方程只能有有限多个解
? 离散性来自"有限区间加正则边界条件"这一套几何约束，与量子力学无关；去掉任一条件谱就可能变成连续的一段。
```

```quiz
两个不同模态的本征函数之间满足什么关系？
- 乘上权函数 w 之后积分为零，即带权正交 [*]
- 它们一定互为对方的导数
- 它们在区间内部没有交点
? 正交的口径是 ∫ w X_m X_n dx = 0；权函数 w 由方程本身给出，w≡1 时才退化成不带权的写法。
```

## 9. 选读：自伴性从分部积分来

<details>
<summary>选读 · 为什么边界条件能"筛"出离散谱</summary>

写 $L[y]=-(py')'+qy$，对两个函数 $u,v$ 做两次分部积分，得到一个叫**Lagrange 恒等式**的东西：

$$\int_a^b\big(L[u]\,v-u\,L[v]\big)dx=\Big[p\,(u'v-uv')\Big]_a^b .$$

右端只依赖两端的值——这正是"边界条件决定一切"的代数原因。若边界条件使右端恒为零，就称这个边值问题**自伴**，此时 $\int L[u]\,v=\int u\,L[v]$，算子扮演了实对称矩阵的角色。

有了自伴性，三条结论依次落地：

1. **实本征值**：设 $L[X]=\lambda wX$，取 $u=v=X$，恒等式左端为零，配合 $w>0$ 立刻逼出 $\lambda=\bar\lambda$；
2. **带权正交**：取 $L[X_m]=\lambda_mwX_m$、$L[X_n]=\lambda_nwX_n$ 代入，得 $(\lambda_m-\lambda_n)\int wX_mX_n=0$，因 $\lambda_m\neq\lambda_n$ 故积分为零；
3. **离散性**：把问题化成一阶方程组后做逐点比较论证，可以证明按零点数排序的本征函数严格振荡、$\lambda_n$ 严格递增且趋于无穷——所以谱必然是"一个一个数得出来"的离散串，而不是一段连续区间。

**离散性不是假设，是被推导出来的结论**；夹持条件越强（$q$ 越大、$p$ 越小），$\lambda_1$ 越大，第一个音就越高。这条单调性在工程上就是"绷得越紧音越高"。

</details>

## 10. 下一站

现在手里有了一族带权正交、完备的本征函数，而且知道它们是被边界"筛"出来的。但弦的振动方程只含一个空间变量；真正的鼓膜、圆柱、球面有两个甚至三个空间维度，那时"筛子"会筛出什么？

下一站进入第 23 章：[分离变量：把时间和空间拆开算](../23-pde-intro/90-separation-of-variables.md)——把一个偏微分方程裂成两个常微分方程，每个都是一道 S-L 问题。而谱的可计算性，则由偏微分方程课的 [特征函数与边界](../23-pde-intro/100-eigenfunction-boundary.md) 接着讲。
