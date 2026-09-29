---
title: 泊松括号与守恒量
lesson_id: hamiltonian/poisson-brackets
prereqs:
  - hamiltonian/liouville-theorem
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 7
layer: L9
track:
  - analysis-change
stage: university-core
difficulty: 4
introduces_concepts:
  - poisson-bracket
  - conserved-quantity
  - jacobi-identity
applications:
  - canonical-transformation
  - quantum-correspondence
exits:
  - research
---

# 泊松括号与守恒量

## 1. 从一个场景开始

怎么判断一个物理量守恒？最老实的办法是：把运动方程解出来，得到 $q(t)$、$p(t)$，代进那个量的表达式，看它是不是常数。对谐振子还行，对三体问题就没法做了。

哈密顿力学给了一把更锋利的刀：**不解方程，只算一个括号**。这个量是不是守恒的，看它和哈密顿量的"泊松括号"是不是零。就这么简单。

这不是省事的技巧，而是一整套代数结构的入口。角动量的三个分量、能量、动量，它们之间的括号关系构成了一个封闭的代数；六十年后量子力学把同一套括号原封不动搬过去（换上一个 $1/\mathrm i\hbar$），成了对易关系。**泊松括号是经典力学留给量子力学的接口。**

## 2. 直觉解释

上一课我们见过一句话："跟着相流走的时候，密度不变。"把"密度"换成任意一个物理量 $f(q,p)$，同样的问题就是：**跟着流走，它变不变？**

- 如果 $f$ 是相空间里的"海拔表"，跟着流走时它的读数当然一直在变；
- 如果 $f$ 恰好只依赖 $H$ 本身（比如 $f = H$、$f = H^2$），那它就只能读到一个固定的值——海拔不动，海拔的函数当然也不动。

泊松括号 $\lbrace f, H\rbrace$ 量的正是这件事：**它是 $f$ 随时间的变化率**。等于零，就是"跟着流走读数不变"，也就是守恒。所以守恒量的判据不需要任何动力学求解，只需要偏导数。

括号还有第二层含义，初学者往往漏掉：它是**两个量互相生成**的度量。位置和动量的括号是 $1$——这一个数字里藏着的，就是"位置的变化由动量生成、动量的变化由位置生成"。

## 3. 正式定义

对相空间上的两个光滑函数 $f(q,p)$、$g(q,p)$，**泊松括号**定义为

$$\lbrace f, g\rbrace = \sum_{i=1}^{n}\left(\frac{\partial f}{\partial q_i}\frac{\partial g}{\partial p_i} - \frac{\partial f}{\partial p_i}\frac{\partial g}{\partial q_i}\right)$$

一维时求和号里只剩两项。**注意两项的顺序**：前一项是"$f$ 对坐标求导、$g$ 对动量求导"，后一项整个反过来再做减法。顺序写反，结果整体变号。

**与动力学的关系**：对不显含时间的 $f$，

$$\frac{\mathrm df}{\mathrm dt} = \lbrace f, H\rbrace$$

含时间时多一项：$\dfrac{\mathrm df}{\mathrm dt} = \dfrac{\partial f}{\partial t} + \lbrace f, H\rbrace$。于是**守恒判据**：$\dfrac{\partial f}{\partial t} = 0$ 且 $\lbrace f, H\rbrace = 0$ $\Longrightarrow$ $f$ 是运动常数。

| 符号 | 名字 | 一句话含义 |
| --- | --- | --- |
| $\lbrace f, g\rbrace$ | 泊松括号 | 由 $f$、$g$ 的偏导组合出的一个新函数 |
| $\lbrace f, H\rbrace$ | 与哈密顿量的括号 | 就是 $f$ 的时间变化率 |
| $q_i, p_i$ | 第 $i$ 对正则坐标 | 有几个自由度就有几对 |
| $\delta_{ij}$ | 克罗内克符号 | $i=j$ 时为 1，否则为 0 |

**四条代数性质**（都能从定义直接验证）：

1. **反对称**：$\lbrace f, g\rbrace = -\lbrace g, f\rbrace$。特别地 $\lbrace f, f\rbrace = 0$；
2. **双线性**：$\lbrace af + bg, h\rbrace = a\lbrace f,h\rbrace + b\lbrace g,h\rbrace$；
3. **莱布尼茨律**：$\lbrace fg, h\rbrace = f\lbrace g,h\rbrace + g\lbrace f,h\rbrace$（括号像导数一样"分配"）；
4. **雅可比恒等式**：$\lbrace f, \lbrace g, h\rbrace\rbrace + \lbrace g, \lbrace h, f\rbrace\rbrace + \lbrace h, \lbrace f, g\rbrace\rbrace = 0$。

**基本括号**（把 $q_i$、$p_j$ 代进去）：

$$\lbrace q_i, q_j\rbrace = 0, \qquad \lbrace p_i, p_j\rbrace = 0, \qquad \lbrace q_i, p_j\rbrace = \delta_{ij}$$

前两条说的是"同类坐标之间互不生成"，第三条是这套代数的全部种子。量子力学把第三条改成 $\lbrace q_i,p_j\rbrace \to \frac{1}{\mathrm i\hbar}[\hat q_i, \hat p_j]$，就得到了 $[\hat q, \hat p] = \mathrm i\hbar$。

## 4. 分步例题

**例** 谐振子 $H = \tfrac12(p^2 + q^2)$，在相点 $(q, p) = (1.2,\; 0.7)$ 处算四个括号。

预备：$\dfrac{\partial H}{\partial q} = q$，$\dfrac{\partial H}{\partial p} = p$。

1. $f = q$：$\dfrac{\partial f}{\partial q} = 1$、$\dfrac{\partial f}{\partial p} = 0$，所以 $\lbrace q, H\rbrace = 1\cdot p - 0 \cdot q = p = 0.7$；
2. $f = p$：$\dfrac{\partial f}{\partial q} = 0$、$\dfrac{\partial f}{\partial p} = 1$，所以 $\lbrace p, H\rbrace = 0\cdot p - 1\cdot q = -q = -1.2$（注意那个负号来自定义里的减法）；
3. $f = \tfrac12(q^2 + p^2)$：这个 $f$ **就是 $H$ 自己**，而 $\lbrace H, H\rbrace = 0$（反对称性），所以结果恰为 $0$；
4. $f = qp$：用莱布尼茨律拆开，$\lbrace qp, H\rbrace = q\lbrace p,H\rbrace + p\lbrace q,H\rbrace = q(-q) + p(p) = p^2 - q^2 = 0.49 - 1.44 = -0.95$。

第 3 条是这一课最重要的观察：**$H$ 的任意函数都自动守恒**（因为 $\lbrace F(H), H\rbrace = F'(H)\lbrace H,H\rbrace = 0$）。所以"守恒量"从来不唯一——能量守恒、能量平方守恒、$\cos H$ 也守恒。真正有意思的是那些**与 $H$ 函数无关**的守恒量，比如角动量。找它们，就是下一课诺特定理的工作。

## 5. 动手实验

### 实验 1（lab）：拖参数，看括号什么时候咬住零

```lab
{
  "type": "ham-poisson",
  "title": "拖这几个系数：什么时候 {f, H} 恒等于零",
  "k": 1,
  "a": 0,
  "b": 0,
  "c": 1,
  "sliders": [
    { "name": "k", "label": "H 的刚度 k", "min": 0.1, "max": 2, "step": 0.05, "value": 1 },
    { "name": "a", "label": "f 的 a", "min": -1, "max": 1, "step": 0.05, "value": 0 },
    { "name": "b", "label": "f 的 b", "min": -1, "max": 1, "step": 0.05, "value": 0 },
    { "name": "c", "label": "f 的 c", "min": -1, "max": 2, "step": 0.05, "value": 1 }
  ]
}
```

模型是 $H = \tfrac12p^2 + \tfrac12kq^2$、$f = aq + bp + \tfrac{c}{2}(q^2+p^2)$。左图里灰椭圆是 $H$ 的等高线，橙线是真正的轨道，**绿虚线是过初始点的 $f$ 等高线**——两条线重合，$f$ 就守恒。右图把 $f(t)$ 画出来（纵轴放大了）：拉成直线就是守恒。先在读数里盯住"全平面 $\max|\lbrace f,H\rbrace|$"：

- 把 $a$、$b$ 拖到 0，$k=1$：这个数变成 $0$，因为此时 $f = \tfrac{c}{2}(q^2+p^2) = cH$；
- 只把 $b$ 拖到 0.5：立刻不等于零——$f$ 里混进了与 $H$ 无关的部分；
- 把 $k$ 拖到 1.3（并保持 $a=b=0$）：$f$ 不再正比于 $H$，括号又活了。

工具条上的「取 $f = H$」一键把参数复位。

### 实验 2（python）：照定义用中心差分算

```python
def bracket(f, g, q, p, h=1e-5):
    # 中心差分求四个偏导，再照定义组合：{f, g} = ∂q f·∂p g − ∂p f·∂q g
    dqf = (f(q + h, p) - f(q - h, p)) / (2 * h)
    dpf = (f(q, p + h) - f(q, p - h)) / (2 * h)
    dqg = (g(q + h, p) - g(q - h, p)) / (2 * h)
    dpg = (g(q, p + h) - g(q, p - h)) / (2 * h)
    return dqf * dpg - dpf * dqg

def H(q, p):            # 简谐振子的哈密顿量
    return 0.5 * p * p + 0.5 * q * q

def f_q(q, p):
    return q

def f_p(q, p):
    return p

def f_half(q, p):       # 这个恰好就是 H 自己
    return 0.5 * (q * q + p * p)

def f_qp(q, p):
    return q * p

q0, p0 = 1.2, 0.7
for name, f in [("q", f_q), ("p", f_p), ("(q²+p²)/2", f_half), ("q·p", f_qp)]:
    print(f"{{f = {name}, H}} = {bracket(f, H, q0, p0):+.6f}")
print(f"对照：p = {p0:.6f}，−q = {-q0:.6f}，p²−q² = {p0 ** 2 - q0 ** 2:.6f}")
```

四行结果：`{f = q, H} = +0.700000`、`{f = p, H} = -1.200000`、`{f = (q²+p²)/2, H} = +0.000000`、`{f = q·p, H} = -0.950000`，与 §4 手算的四个数逐位吻合。

代码里有两点值得注意。第一，偏导是**数值**算的：中心差分 $\dfrac{f(q+h)-f(q-h)}{2h}$ 精度是 $O(h^2)$，取 $h = 10^{-5}$ 时误差约 $10^{-10}$，所以第三行显示的 $+0.000000$ 是"真零"而不是舍入垃圾。第二，`f"{{f = ...}}"` 里双写花括号是 f-string 的转义写法——**要打印一个真的花括号就得写两遍**，因为单个花括号在 f-string 里是"插值"的意思。不信把 `{{` 改回 `{`，Python 会报语法错误。

### 快问快答

```quiz
下面哪个说法在哈密顿力学里成立？
- {H, H} = 0，所以任何只依赖 H 的量都自动守恒 [*]
- {f, H} = 0 说明 f 是常数函数
- 泊松括号对两个自变量是对称的
? {H,H}=0 来自反对称性；{f,H}=0 只说明 f 沿轨道不变，它在相空间里当然可以处处不同。
```

::::warning[常见误区]

**误区一**："泊松括号就是个记号，本质还是链式法则。"
它确实是链式法则的产物，但重要的是它**自己构成了一个代数**：反对称、双线性、莱布尼茨、雅可比，四条性质让"守恒量的集合"可以做加法、乘法、括号运算。李代数、量子对易子、辛几何，都是从这个代数长出来的。

**误区二**："$\lbrace f,H\rbrace = 0$ 说明 $f$ 是常数。"
不是。$\lbrace f,H\rbrace$ 是**沿轨道**的变化率，等于零只说明 $f$ 在**每条轨道上**取常值，不同轨道之间可以完全不同。比如角动量在地球轨道上处处相同，但换一条轨道就换一个值。

**误区三**："守恒量就那么几个：能量、动量、角动量。"
这个印象来自中学——其实任何只依赖 $H$ 的函数（$H^2$、$\cos H$、$e^{H}$）都守恒，守恒量多得数不完。真正稀缺的是**与 $H$ 没有函数关系**的守恒量：它们每多一个，系统的可积程度就高一档（$n$ 个自由度需要 $n$ 个互相"对合"的独立守恒量才算完全可积，第 70 课会用到这一条）。**而且它们之间能不能封闭成代数，是比"存不存在"更深的问题**——若 $\lbrace f,H\rbrace = \lbrace g,H\rbrace = 0$，由雅可比恒等式立刻得 $\lbrace\lbrace f,g\rbrace, H\rbrace = 0$，所以括号把守恒量关进了同一个家族；可要是这个括号退化成平凡的常数（比如 0），它就没有带来任何新信息。

::::

## 6. 练习

**练习 1**：下面这个括号把两项的顺序写反了，于是 $\lbrace q, H\rbrace$ 算出来是 $-0.8$；正确答案是 $+0.8$（因为 $\lbrace q,H\rbrace = \partial H/\partial p = p$）。修到输出 `0.8`：

```exercise
# @title: 练习：泊松括号的两项顺序
# @check: 0.8
# @hint: 定义是 {f,g} = ∂q f·∂p g − ∂p f·∂q g。函数里四个参数依次是 ∂q f、∂p f、∂q g、∂p g
def poisson(fq, fp, gq, gp):
    return fp * gq - fq * gp    # ← 问题在这：两项的顺序反了

q, p = 1.5, 0.8                 # H = (p² + q²)/2，在这一点算 {q, H}
print(poisson(1.0, 0.0, q, p))  # f = q：∂q f = 1、∂p f = 0
```

**练习 2**：验证雅可比恒等式在一维、$f = q$、$g = p$、$h = qp$ 时成立。

<details>
<summary>点开查看逐步解答</summary>

按定义逐项算（一维，$f,g,h$ 都只依赖 $q,p$）：

1. $\lbrace g, h\rbrace = \lbrace p, qp\rbrace$。用莱布尼茨：$= q\lbrace p,p\rbrace + p\lbrace p,q\rbrace = 0 + p\cdot(-1) = -p$；
2. $\lbrace f, \lbrace g,h\rbrace\rbrace = \lbrace q, -p\rbrace = -1$；
3. $\lbrace h, f\rbrace = \lbrace qp, q\rbrace = q\lbrace p,q\rbrace + p\lbrace q,q\rbrace = -q$；
4. $\lbrace g, \lbrace h,f\rbrace\rbrace = \lbrace p, -q\rbrace = +1$；
5. $\lbrace f, g\rbrace = \lbrace q,p\rbrace = 1$，于是 $\lbrace h, \lbrace f,g\rbrace\rbrace = \lbrace qp, 1\rbrace = 0$（任何量与常数的括号都是 0，因为常数求导为零）；
6. 三项相加：$-1 + 1 + 0 = 0$。✔

**为什么这条恒等式重要**：它保证了"$\lbrace\cdot, H\rbrace$ 这个运算"满足导子的相容性，从而保证**时间演化保持括号关系**。换句话说，如果你今天算出 $\lbrace q,p\rbrace = 1$，明天它还是 1——这就是"正则结构在哈密顿流下不变"的代数版本，第 60 课讲的辛结构是它的几何版本。

</details>

## 7. 选读：从括号到对易子

<details>
<summary>选读 · 经典与量子之间那道最窄的缝</summary>

1925 年，狄拉克注意到一件事：量子力学里那些奇怪的对易关系，和经典泊松括号长得一模一样。他给出的对应规则是

$$\lbrace f, g\rbrace_{\text{经典}} \;\longrightarrow\; \frac{1}{\mathrm i\hbar}\,[\hat f, \hat g]$$

把 $\lbrace q, p\rbrace = 1$ 代进去，立刻得到 $[\hat q, \hat p] = \mathrm i\hbar$——海森堡的不确定性关系就住在这个等式里。这一步不是"推导"，而是**猜**出来的对应；它的正确性由实验检验（比如氢原子光谱）。

为什么经典括号能"翻译"过去？因为两者共享同一套代数结构：反对称、双线性、莱布尼茨、雅可比。凡是满足这四条的东西，抽象代数里都叫**泊松代数**。从这个角度看，量子化不是"把数字换成算符"，而是**把同一个泊松代数换成另一个表示**：经典用一个交换代数实现它，量子用一个非交换代数实现它。

顺带说一句：这个对应在一般情况下会有" ordering 问题"（$q$ 和 $p$ 不交换，乘积怎么写就有歧义），这正是量子化在数学上至今没有唯一标准答案的原因。经典极限 $\hbar \to 0$ 下，非交换性消失，括号对应关系恢复成经典形式——这叫"对应原理"。

</details>

## 8. 下一站

括号为零 = 有东西守恒。可守恒量是从哪来的？为什么角动量守恒、为什么能量守恒？答案只有两个字：**对称**。而且这个"因为所以"是可以写成定理的。

→ [诺特定理：对称就是守恒](./50-noether.md)
