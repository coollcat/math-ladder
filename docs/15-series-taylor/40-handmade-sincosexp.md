---
title: 手搓三大函数：不用 math 库复现 sin、cos、exp
lesson_id: series/handmade
prereqs:
  - series/taylor
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 手搓三大函数：不用 math 库复现 sin、cos、exp

## 1. 从一个场景开始

从第 1 章起，`math.sin`、`math.exp` 就是我们要啥给啥的魔法口袋。今天把口袋扔掉：**只准用加减乘和循环**，把 $\sin$、$\cos$、$e^x$ 三大函数按泰勒原理重新发明一遍。做完了你会确认一件事——数学库不神秘，它的核心正是这类多项式近似循环；真实实现还会加上定义域归约等工程补丁。

## 2. 直觉解释

上一课配好了三个级数：

$$\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots \qquad \cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \cdots \qquad e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$

无穷项加不完，但也不必加完：每一项都比上一项小一大截（阶乘分母在疯狂膨胀），小到一定程度后，再往总和里添它就像往游泳池里滴一滴墨水——毫无存在感。那就停。

策略一句话：**逐项累加，一旦当前项的绝对值小于十亿分之一（$10^{-10}$）就收工**。剩下的"没加的部分"叫截断误差，被我们主动控制在阈值以内——敢这么收工的底气由上一课的 [泰勒余项](./35-taylor-remainder.md) 兜底：被丢的尾巴被阶乘分母死死压住，保险额度算都不用算就能开出。

## 3. 正式定义

三个函数共用同一副算法骨架，只有首项和递推因子不同：

| 函数 | 首项 term | 递推：下一项 = 当前项 × |
| --- | --- | --- |
| $\sin x$ | $x$ | $\dfrac{-x^2}{(2n+2)(2n+3)}$ |
| $\cos x$ | $1$ | $\dfrac{-x^2}{(2n+1)(2n+2)}$ |
| $e^x$ | $1$ | $\dfrac{x}{n+1}$ |

| 名词 | 意思 |
| --- | --- |
| term（当前项） | 正准备累加进总和的那一项 |
| 递推 | 不重算幂和阶乘，由上一项乘一个固定因子直接得到下一项 |
| 阈值 $\varepsilon$ | 停工标准：当前项绝对值小于 $\varepsilon$ 就 break（本课取 $10^{-10}$） |
| 截断误差 | 被舍弃的剩余项之和，不超过阈值附近量级 |

## 4. 分步例题

**手推 $e^x$ 在 $x=1$ 处的前四轮递推。**

1. 首项 term $=1$，累加后总和 $=1$；
2. 递推因子 $\frac{x}{n+1}=\frac{1}{1}$：term 变成 $1\times\frac{1}{1}=1$，总和 $=2$；
3. 因子变成 $\frac{1}{2}$：term $=0.5$，总和 $=2.5$；
4. 因子 $\frac{1}{3}$：term $\approx 0.1667$，总和 $\approx 2.6667$……

每一步只用到了上一项和一次除法——不用回头算 $x^n$，也不用算阶乘。照这个节奏走下去，总和步步逼近 $e \approx 2.71828$。

## 5. 动手实验

### 实验 1（viz）：看级数一层层长出函数

```viz
{
  "type": "seriesbuild",
  "title": "sin x 的部分和与当前项贡献",
  "fn": "sin",
  "n": 5
}
```

先点「sin / cos / exp」切换目标函数，再拖动蓝色探针或增大阶数。上方橙色虚线是截断后的多项式；下方每根柱子是一项的实际贡献。靠近 $0$ 时两三根柱子就够用，远离中心时需要更多层——这就是泰勒近似“局部出生、逐层扩张”的直观版。

### 实验 2（python）：三大函数，纯手工打造

```python title="my_sin / my_cos / my_exp：加减乘与循环，仅此而已"
import math   # 只当裁判用：最后跟手搓版对答案

def my_sin(x):
    term = x                        # 第 0 项就是 x 本身（x^1 / 1!）
    total = 0.0                     # 总和累加器
    for n in range(60):             # 有界兜底循环：正常远远跑不满就提前退出
        total = total + term        # 把当前项记入总和
        # 递推核心：当前项 × 固定因子(-x²/((2n+2)(2n+3))) 直接得到下一项，
        # 免去每次重算 x 的幂和阶乘——一行乘法顶过去一大片计算
        term = term * (-x * x) / ((2 * n + 2) * (2 * n + 3))
        if abs(term) < 1e-10:       # 新项小于十亿分之一：再加也无感
            break                   # 提前收工
    return total

def my_cos(x):
    term = 1.0                      # 第 0 项是 1（x^0 / 0!）
    total = 0.0
    for n in range(60):
        total = total + term
        term = term * (-x * x) / ((2 * n + 1) * (2 * n + 2))   # cos 的因子
        if abs(term) < 1e-10:
            break
    return total

def my_exp(x):
    term = 1.0                      # 第 0 项是 1
    total = 0.0
    for n in range(200):            # e^x 项衰减稍慢，多留些余量
        total = total + term
        term = term * x / (n + 1)   # exp 的因子：x/(n+1)
        if abs(term) < 1e-10:
            break
    return total

# 先冒烟测试一个点：my_sin(0.5) 应约等于 0.47942554
print(round(my_sin(0.5), 8))
```

### 实验 3（python）：误差对照表

```python title="手搓版 vs math 版：误差全部压进 1e-10 量级"
import math   # 只当裁判用

def taylor(kind, x):
    if kind == "sin":
        # lambda n: 表达式 是匿名小函数（本课首见）：吃一个轮次号 n，吐出该轮的递推因子
        term, factor = x, lambda n: -x * x / ((2 * n + 2) * (2 * n + 3))
        limit = 60
    elif kind == "cos":
        term, factor = 1.0, lambda n: -x * x / ((2 * n + 1) * (2 * n + 2))   # 同上：cos 版递推因子
        limit = 60
    else:
        term, factor = 1.0, lambda n: x / (n + 1)                            # 同上：exp 版递推因子
        limit = 200
    total = 0.0
    for n in range(limit):
        total = total + term
        term = term * factor(n)
        if abs(term) < 1e-10:
            break
    return total

for x in [0.5, 1.0, 3.0, 10.0]:
    for kind, official in [("sin", math.sin), ("cos", math.cos), ("exp", math.exp)]:
        made = taylor(kind, x)
        print(f"x = {x}: {kind} 差 {abs(made - official(x))}")
```

四个测试点上三对函数的误差全部缩在 $10^{-11}$ 到 $10^{-13}$ 一带——比阈值 $10^{-10}$ 还干净。这说明你手搓的循环抓住了数学库的核心思想：真实 libm 还会换掉变量名、做定义域归约，并可能采用更精细的近似多项式。

### 快问快答

```quiz
循环里 term = term * (-x*x) / ((2*n+2)*(2*n+3)) 这一行在干什么？
- 判断是否该停止累加
- 由上一项递推出下一项，免去重复计算幂和阶乘 [*]
- 把当前项累进总和
? 相邻两项之比是一个固定因子：保存上一项、每次只乘一个因子，就能滚出整个级数——级数数值计算的标配优化。
```

:::warning[常见误区]

**误区一**："你以为阈值取太小会停不下来。" 其实不会——三项级数的项最终单调递减奔向 0，必然触发 break。但阈值也别低于机器精度 $10^{-15}$：浮点噪声就那么大，再小的阈值只是白转空圈，精度一分不涨。$10^{-10}$ 是省力又够用的甜点位。

**误区二**："你以为每项都得从头算 $x^n$ 和 $n!$。" 其实相邻两项只差一个固定因子，保存上一项、一次乘法滚出下一项即可——递推比"幂运算 + 阶乘"快得多，这是级数计算的标配优化。

**误区三**："你以为 $x$ 很大时手搓版会失灵。" 其实 $\sin/\cos/e^x$ 的泰勒级数对一切实数收敛，没有 ln 那种铁壁；只是 $x$ 很大时中间项先胀后缩，白费不少轮次。工程上先用周期性把 $x$ 折回 $[-\pi,\pi]$ 再开算（选读给出无铁壁的理由）。

:::

## 6. 练习

**练习 1**：验证手搓版能算出精确值：$\cos(\pi/3)$ 应该等于 $0.5$。下面的代码能跑但结果不对，改到通过：

```exercise
# @title: 练习：让手搓 cos 算准 π/3
# @check: 0.5
# @hint: cos 的级数是正负交替的——对照 my_sin 的写法，看看递推那行丢了哪个符号
import math

def my_cos(x):
    term = 1.0
    total = 0.0
    for n in range(60):
        total = total + term
        term = term * (x * x) / ((2 * n + 1) * (2 * n + 2))   # ← 这行少了点东西
        if abs(term) < 1e-10:
            break
    return total

print(round(my_cos(math.pi / 3), 4))
```

**练习 2**：把停止条件放宽成 $|\text{term}| < 10^{-3}$，`my_sin(0.5)` 会差多少？

<details>
<summary>点开查看逐步解答</summary>

跟踪过程：加完 $x=0.5$ 与 $-\frac{x^3}{6}$ 后，下一项是 $\frac{x^5}{120}\approx 0.00026 < 10^{-3}$，于是它被丢下了。误差恰是被丢掉的尾巴：

$$\left|0.4791666\cdots - \sin(0.5)\right| \approx 2.6\times 10^{-4}.$$

对比正文实验里阈值 $10^{-10}$ 时误差不到 $10^{-11}$——**阈值直接决定精度的天花板**。想要几位小数的准确，就把阈值设到比它更小的量级。
</details>

## 7. 选读：为什么这三个级数没有铁壁

<details>
<summary>选读 · 相邻项比值奔向 0</summary>

ln 级数在 $|x|>1$ 散伙，而这三位的级数处处收敛。判据藏在**相邻两项之比**里：

$$\left|\frac{\text{下一项}}{\text{当前项}}\right| = \frac{x^2}{(2n+2)(2n+3)} \quad (\sin), \qquad \frac{|x|}{n+1} \quad (\exp).$$

无论固定多大的 $x$，只要项数 $n$ 足够大，分母 $(2n+2)(2n+3)$ 或 $n+1$ 都会远远甩开分子——比值奔向 0。从某一处起，每项不足前项的一半，于是尾巴被几何级数死死摁住：总和无界可逃。对比 ln 的比值 $\frac{n}{n+1}|x|\to|x|$：$|x|>1$ 时比值始终大于 1，项越滚越大——铁壁由此而生。一念之差，一个处处称臣，一个划界而治。
</details>

## 8. 下一站

至此你手里有两件看似无关的神器：泰勒教你在**一个点的附近**用多项式模仿任何光滑函数，正弦家族则是一群自带周期节拍的波形。下一章，傅里叶把这两样东西拧在一起，下一个惊天赌注：很广的一类周期信号——方波、锯齿、音乐、心电图——都能拆成一堆不同频率的正弦叠加。泰勒统治局部，傅里叶统治全局；枢纽站，正弦的交响乐见。

卷一下一章：第 16 章《傅里叶级数与傅里叶变换》。

→ [周期信号与正弦基](../16-fourier/10-periodic-signals.md)
