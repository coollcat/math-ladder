---
title: Sobolev 空间：弱导数的家
lesson_id: functional-analysis/sobolev-spaces
prereqs:
  - functional-analysis/distributions-intro
  - functional-analysis/lax-milgram
  - functional-analysis/lp-spaces
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
  - weak-derivative
  - sobolev-space
  - h1-space
applications:
  - pde-weak-solutions
  - finite-elements
exits:
  - research
---

# Sobolev 空间：弱导数的家

## 1. 开场钩子

85 课的 Lax-Milgram 担保过"弱解存在且唯一"，但没说弱解住在哪个空间；90 课的分布语言让不可微函数也能求导。现在把两件事焊在一起提问：哪些函数**连弱导数都还落在 $L^2$ 里**？这个函数类叫 Sobolev 空间 $H^1$——现代 PDE 里弱解的标准住所，有限元方法的官方地基。

## 2. 直觉解释

办户口先过一遍三类申请者：

| 申请者 | 经典导数 | 弱导数 | 判定 |
| --- | --- | --- | --- |
| 光滑函数 | 处处存在 | 就是经典导数，落在 $L^2$ | 入住 |
| V 形折线 $\lvert x\rvert$ | 折点处不存在 | 阶梯函数 $\operatorname{sgn}(x)$，是 $L^2$ 正规居民 | 入住 |
| 阶跃函数 $H(x)$ | 几乎处处存在 | 冲激 $\delta$——连函数都不是 | 拒收 |

一句话总结：$H^1$ 允许**折**，不允许**跳**。函数图形可以有折点（斜率跳变由阶梯弱导数记账），但函数值本身不能跳——一跳，弱导数里就冒出 $\delta$，而 $\delta$ 不在 $L^2$ 的花名册上。

## 3. 正式定义

**弱导数**：设 $f\in L^2(a,b)$。若存在 $g\in L^2(a,b)$ 使

$$\int_a^b g(x)\,\varphi(x)\,dx=-\int_a^b f(x)\,\varphi'(x)\,dx$$

对一切紧支集光滑测试函数 $\varphi$ 成立，则称 $g$ 是 $f$ 的弱导数，记 $f'=g$。（这正是 90 课分布导数的语言：$\langle T',\varphi\rangle=-\langle T,\varphi'\rangle$。）

**Sobolev 空间** $H^1(a,b)$：自己与弱导数都在 $L^2$ 的函数类：

$$H^1(a,b)=\Big\lbrace f\in L^2(a,b): f' \text{ 存在且 } f'\in L^2(a,b)\Big\rbrace.$$

$H^1$ 的范数把两本账合在一起：

$$\lVert f\rVert_{H^1}=\Big(\lVert f\rVert_{L^2}^2+\lVert f'\rVert_{L^2}^2\Big)^{1/2}.$$

| 符号 | 含义 |
| --- | --- |
| $f\in L^2$ | 函数本身的"能量"有限 |
| $f'\in L^2$ | 弱导数的"能量"也有限——导数也算资产 |
| $\lVert f\rVert_{H^1}$ | 两本账合算再开方 |
| $\varphi$ | 紧支集光滑测试函数（90 课的老角色） |

85 课 Lax-Milgram 里的 $H$，在椭圆方程里最常取的正是 $H^1$（或它的零边值版本）——能量碗的"碗底"从此有了门牌号。

## 4. 分步例题

验证 $f(x)=\lvert x\rvert$ 在 $(-1,1)$ 上是 $H^1$ 正式居民。

1. 候选弱导数：$x>0$ 段经典导数为 $1$，$x<0$ 段为 $-1$，猜 $g=\operatorname{sgn}(x)$（跳跃函数，$\lvert g\rvert=1$ 显然属于 $L^2$）；
2. 核对定义：把 $-\int_{-1}^1\lvert x\rvert\varphi'(x)dx$ 分段分部积分，折点 $x=0$ 处两段的边界项恰好相抵（完整账本在选读），剩下 $\int_{-1}^1\operatorname{sgn}(x)\varphi(x)dx$——定义成立；
3. 第一本账：$\lVert f\rVert_{L^2}^2=\int_{-1}^1x^2dx=\tfrac23$；
4. 第二本账：$\lVert g\rVert_{L^2}^2=\int_{-1}^11\,dx=2$；
5. 户口费：$\lVert f\rVert_{H^1}=\sqrt{8/3}\approx1.633$。对照：阶跃函数 $H$ 的弱导数是 $\delta$，$\delta$ 不是函数更不属 $L^2$——被拒收。

## 5. 动手实验

### 实验 1：折线与弱导数同框

```viz
{
  "type": "plot",
  "title": "V 形折线（实线）与它的弱导数阶梯（虚线）",
  "expr": "a*abs(x) + b",
  "expr2": "a*(2*floor(x) + 1)",
  "xmin": -0.49,
  "xmax": 0.49,
  "sliders": [
    { "name": "a", "min": 0.5, "max": 3, "step": 0.1, "value": 1 },
    { "name": "b", "min": -1.5, "max": 1.5, "step": 0.1, "value": 0 }
  ]
}
```

实线是 $f(x)=a\lvert x\rvert+b$（窗口只取 $(-0.5,0.5)$ 内的一段），虚线是弱导数：左岸 $-a$、右岸 $+a$ 的两级台阶。拖 $b$ 上下平移 V 形——台阶纹丝不动（弱导数不管常数项）；拖 $a$，V 形变陡、台阶跳得更高（两本账同步上涨）。

### 实验 2：拖动折点

```viz
{
  "type": "plot",
  "title": "折点搬到 c：弱导数跟着在 c 处跳变",
  "expr": "a*abs(x - c)",
  "xmin": -2.5,
  "xmax": 2.5,
  "sliders": [
    { "name": "a", "min": 0.5, "max": 2, "step": 0.1, "value": 1 },
    { "name": "c", "min": -1.5, "max": 1.5, "step": 0.1, "value": 0.5 }
  ]
}
```

折点滑到哪，弱导数阶梯的跳变位置就跟到哪：左 $-a$、右 $+a$。折线族再大，弱导数始终是分段常数——都是 $L^2$ 的良民。

### 实验 3：分部积分账本数值核账

```python title="验证弱导数定义：∫g·φ = -∫f·φ′"
n = 4000
a = -1.0
b = 1.0
h = (b - a) / n            # 梯形法的切片宽度

def phi(x):
    # 测试函数：(1-x^2)^2 乘 (0.3+x)；在 -1 与 1 两端取 0，边界项清零
    t = 1 - x * x
    return t * t * (0.3 + x)

def dphi(x):
    # phi 的导数：乘积法则展开 = -4x(1-x^2)(0.3+x) + (1-x^2)^2
    t = 1 - x * x
    return -4 * x * t * (0.3 + x) + t * t

def sgn(x):
    # 符号函数：候选弱导数 g(x) = sgn(x)
    if x > 0:
        return 1.0
    if x < 0:
        return -1.0
    return 0.0

left = 0.0    # 左账本：∫ sgn·φ dx（弱导数一侧）
right = 0.0   # 右账本：∫ |x|·φ′ dx（原函数一侧）
for i in range(n):
    x0 = a + i * h
    x1 = x0 + h
    left = left + h * (sgn(x0) * phi(x0) + sgn(x1) * phi(x1)) / 2
    right = right + h * (abs(x0) * dphi(x0) + abs(x1) * dphi(x1)) / 2

print(round(left, 4))
print(round(right, 4))
print(abs(left + right) < 0.001)
```

左账本约 $0.3334$、右账本约 $-0.3333$，两账相加只剩十万分之几的残差（梯形法切片的误差，加密 $n$ 还会继续缩小）——弱导数定义 $\int g\varphi=-\int f\varphi'$ 在数值上兑现。

## 6. 常见误区

::::warning[常见误区]

**误区一**：你以为 $H^1$ 就是"处处可微"。$\lvert x\rvert$ 在折点连经典导数都不存在，却是 $H^1$ 正式居民——弱导数绕开逐点定义，走分部积分的整体路线。

**误区二**：你以为弱导数是"在不可导点随便补个值的经典导数"。补值改得动逐点图像，改不动 $L^2$ 等价类；决定生死的是"有没有跳跃"，不是"折点怎么补"。

**误区三**：你以为范数量的是函数本身。$H^1$ 范数把函数与弱导数两本 $L^2$ 账合在一起——85 课的能量碗用的正是这本"导数也算资产"的会计制度。

::::

## 7. 练习

```exercise
# @title: 练习：H¹ 户口费的两本账
# @check: 0.667
# @check: 2.0
# @check: 2.667
# @hint: H¹ 范数 = 函数的 L² 账 + 弱导数的 L² 账；L² 账本要"先平方再积分"——初始代码量成了 L¹ 账。
n = 20000
dx = 2.0 / n                # 中点法切片宽度
total_f = 0.0               # 函数那本账：∫ f² dx
total_g = 0.0               # 弱导数那本账：∫ (f')² dx
for i in range(n):
    x = -1.0 + (i + 0.5) * dx       # 切片中点
    total_f = total_f + abs(x) * dx    # ← 量的是 |x| 本身：L¹ 账本，不是 L²
    total_g = total_g + 1.0 * dx       # 弱导数 sgn(x) 的平方恰好处处是 1
h1_sq = total_f + total_g
print(round(total_f, 3))
print(round(total_g, 3))
print(round(h1_sq, 3))
```

<details>
<summary>点开查看逐步解答</summary>

$L^2$ 账本要先平方：$f(x)=\lvert x\rvert$ 的平方是 $x^2$。把那行改成 `x * x * dx`：

```python
total_f = total_f + x * x * dx
```

于是 $\lVert f\rVert_{L^2}^2=\int_{-1}^1x^2dx=\tfrac23\approx0.667$；弱导数 $\operatorname{sgn}$ 的平方处处是 $1$，$\lVert f'\rVert_{L^2}^2=2.0$；合计 $2.667$。输出 `0.667`、`2.0`、`2.667`。

</details>

## 8. 快问快答

```quiz
函数在区间内部有一个跳跃间断点，它还可能是 H¹ 居民吗？
- 可能，只要跳跃幅度小于 1
- 不可能 [*]
- 把跳跃点挖掉就能住
? 跳跃让弱导数冒出 δ 成分，δ 不是 L² 函数——H¹ 允许折、不允许跳。
```

## 9. 选读：完整账本与唯一性

<details>
<summary>选读 · 分部积分逐段核账 + 弱导数唯一</summary>

**账本**：对紧支集测试函数 $\varphi$（两端取零：$\varphi(\pm1)=0$）：

$$-\int_{-1}^1\lvert x\rvert\varphi'dx=-\int_0^1x\varphi'dx+\int_{-1}^0x\varphi'dx.$$

第一段分部积分：$-\int_0^1x\varphi'dx=-\big[x\varphi\big]_0^1+\int_0^1\varphi\,dx=-\varphi(1)+\int_0^1\varphi\,dx=\int_0^1\varphi\,dx$（$\varphi(1)=0$）。

第二段：$\int_{-1}^0x\varphi'dx=\big[x\varphi\big]_{-1}^0-\int_{-1}^0\varphi\,dx=0\cdot\varphi(0)+\varphi(-1)-\int_{-1}^0\varphi\,dx=-\int_{-1}^0\varphi\,dx$（$\varphi(-1)=0$；折点 $x=0$ 处 $x\varphi=0$，两段边界自动相抵）。

两段合计：$\int_0^1\varphi\,dx-\int_{-1}^0\varphi\,dx=\int_{-1}^1\operatorname{sgn}(x)\varphi(x)\,dx$——弱导数就是 $\operatorname{sgn}$，账本严丝合缝。

**唯一性**：若 $g,h$ 都是 $f$ 的弱导数，则 $\int(g-h)\varphi\,dx=0$ 对一切测试函数成立。让 $\varphi$ 逼近 $\operatorname{sgn}(g-h)$（测试函数在 $L^2$ 中稠密），得 $\int\lvert g-h\rvert^2=0$，即 $g=h$（$L^2$ 意义下）。弱导数有唯一定语，$H^1$ 范数才立得住。

**为什么它是 PDE 的日常语言**：85 课的能量碗取 $H=H^1$ 时，碗底 $u$ 满足的正是方程的弱形式；100 课的傅里叶模态在 $H^1$ 里自带范数账本。"弱解和分布是现代 PDE 的日常语言"，而 Sobolev 空间就是这门语言的标准语法书——Lax-Milgram、分布、傅里叶三条线在这里收拢成同一个家。

</details>

## 10. 下一站

函数的家安顿好，下一课让"以函数为自变量"的泛函正式登台：一条最速降线怎么求，Euler-Lagrange 方程怎么亲手吐出答案。

→ [变分法选讲：Euler-Lagrange 与最速降线](./95-calculus-of-variations.md)
