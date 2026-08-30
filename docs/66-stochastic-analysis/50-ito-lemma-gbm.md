---
title: Itō 引理与几何布朗运动
lesson_id: stochastic-analysis/ito-lemma-gbm
prereqs:
  - stochastic-analysis/ito-integral-intuition
volume: 5
layer: L9
track:
  - probability-statistics
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - ito-formula
  - geometric-brownian-motion
  - volatility-drag
applications:
  - stock-price-baseline-model
  - compound-return-accounting
exits:
  - stochastic-analysis
---

# Itō 引理与几何布朗运动

## 1. 从一个场景开始

基金海报上写着"年化预期收益 $8\%$"，你却发现自己这种普通账户的曲线远没有长得那么体面：一半的年份落在全市场平均之下，而跌 $50\%$ 要靠涨 $100\%$ 才爬得回来。这不是错觉——**波动本身在向你的账户收税**。本课的任务是给这笔"凸性税"立法定价：当布朗运动的二阶项拒绝被丢弃（上一课刚发生的事），泰勒展开就多出一层修正，而这层修正一登场，金融学的基准模型——几何布朗运动——立刻从天而降。

## 2. 直觉解释

**核心直觉：把抖动的山路拉直，路程反而更短。**

古典链式法则只保留泰勒展开的一阶项：

$$f(X_{k+1})-f(X_k)\approx f'(X_k)\,\Delta X \qquad (\text{二阶项小到可丢}).$$

随机世界不许丢：上一课证明过 $(\Delta B)^2$ 与 $\Delta t$ 同阶、加总后活着抵达 $[B]_T=T$。于是对 $f(B)$ 的展开被迫留到二阶：

$$\Delta f\approx f'\,\Delta B+\tfrac12 f''\,(\Delta B)^2 .$$

新账本的读法：一阶项是**切线收入**，二阶项是**曲率税**。函数凹（如对数）则曲率为负，抖动越剧烈扣税越多——这就是"$8\%$ 预期"与"惨淡中位数"之间那道裂缝的数学身份。

| 世界 | 泰勒展开保几阶 | 后果 |
| --- | --- | --- |
| 光滑函数路径 | 一阶，二阶项归零 | 古典链式法则安然无恙 |
| 布朗驱动路径 | 二阶，且 $(dB)^2\leftrightarrow dt$ | 多出修正项，链式法则改写 |

## 3. 正式定义

**Itō 引理**：设 $X_t$ 满足 $dX=b(X)\,dt+\sigma(X)\,dB$，$f$ 二阶连续可导，则

$$df(X_t)=f'(X_t)\,dX_t+\frac{1}{2}\,f''(X_t)\,(dX_t)^2=f'\,b\,dt+f'\,\sigma\,dB+\frac{\sigma^2}{2}\,f''\,dt,$$

其中查表规则是 $(dt)^2=dB\,dt=(dB)^3=0$、$(dB)^2=dt$。符号表如下：

| 符号 | 含义 |
| --- | --- |
| $b$ | 漂移速度：确定推力 |
| $\sigma$ | 扩散系数：噪声放大器 |
| $f',\,f''$ | 切线收入与曲率税率 |
| $(dB)^2=dt$ | 二次变差定理的代装口诀 |

**几何布朗运动（GBM）**：把它用在最要紧的问题上——股价 $S$ 不许变负，于是给对数开工。令 $X=\ln S$、取 $b=\mu X$ 太任意；正确姿势是从乘性涨落出发：

$$dS=S\,\mu\,dt+S\,\sigma\,dB .$$

对 $f(x)=e^x$ 与 $X=\mu t+\sigma B_t-\sigma^2 t/2$ 用引理即得上式的显式解：

$$S_T=S_0\exp\bigl((\mu-\sigma^2/2)\,T+\sigma B_T\bigr),$$

并由正态期望读出两大命运数字：

$$\operatorname{E}[S_T]=S_0\,e^{\mu T},\qquad \operatorname{median}(S_T)=S_0\,e^{(\mu-\sigma^2/2)\,T}.$$

均值与中位数的裂缝 $=\sigma^2 T/2$：波动率平方是税基，时间是计税周期。

## 4. 分步例题

**问**：$S_0=100$，$\mu=0.08$，$\sigma=0.2$，持有 $T=1$ 年。问均值的涨幅与中位数的涨幅各多少？

1. 均值因子：$e^{\mu}=e^{0.08}\approx 1.0833$，即约 $+8.3\%$；
2. 中位数因子：$e^{\mu-\sigma^2/2}=e^{0.06}\approx 1.0618$，即约 $+6.2\%$；
3. 税额差：$\sigma^2/2=0.02$，每年被波动吃掉约 $2$ 个百分点的中位复利；
4. 几何解读：一半概率之下的典型账户走的就是 $6.2\%$ 这条线，而 $8.3\%$ 是少数暴涨样本拉高的平均——统计口径不同，两个数字都是真的。

顺带验收非负性：指数恒为正，无论噪声多大 $S_T>0$ 都自动成立。这是 GBM 常年霸榜股价模型的原因之一。

## 5. 动手实验

先用网页组件看清"对数中位轨道"的骨架：它是一条斜率固定为 $\mu-\sigma^2/2$ 的匀速上坡线，全部箭头不偏不倚地指向同一条水平带——噪声再大也只在这条线附近抖。

```viz
{
  "type": "slope-field",
  "title": "对数价格的中位骨架 dx/dt = μ − σ²/2 = 0.06",
  "expr": "0.06",
  "tmin": 0,
  "tmax": 8,
  "ymin": -1,
  "ymax": 1,
  "t0": 0,
  "y0": 0
}
```

接下来请 GBM 本人出场：三条完整轨迹叠着两条命运参考线（均值线与中位线），并抽样核验均值那条参考线不是纸上谈兵。

```python title="几何布朗运动：三轨两线"
import random                     # 标准库随机模块；seed 固定保证可复现
import numpy as np                # 数值计算库；这里主要用它的指数与开方
import matplotlib.pyplot as plt   # 绘图模块

random.seed(88)
np.random.seed(88)
s0, mu, sig, T, n = 100.0, 0.08, 0.2, 2.0, 400     # 起价 / 漂移 / 波动率 / 年数 / 步数
dt = T / n
for path_id in range(3):
    s = s0
    xs, ys = [0.0], [s0]
    for k in range(n):
        z = random.gauss(0.0, 1.0)                 # 每步抽一枚标准正态骰子
        s = s * np.exp((mu - 0.5 * sig * sig) * dt + sig * (dt ** 0.5) * z)   # 精确逐步解（对数空间）
        xs.append((k + 1) * dt)
        ys.append(s)
    plt.plot(xs, ys, linewidth=0.9)

grid = np.linspace(0.0, T, 100)                    # linspace：在 [0,T] 上等距布点画参考线
plt.plot(grid, s0 * np.exp(mu * grid), color="black", linestyle="--", label="mean E[S]")
plt.plot(grid, s0 * np.exp((mu - 0.5 * sig * sig) * grid), color="red", linestyle=":", label="median")
plt.legend()
plt.xlabel("time")
plt.ylabel("price")
plt.show()

M = 3000                                           # 大批量抽样终端价格，核验黑色参考线
ends = [s0 * np.exp((mu - 0.5 * sig * sig) * T + sig * (T ** 0.5) * random.gauss(0.0, 1.0))
        for _ in range(M)]
print("终端样本均值 =", round(sum(ends) / M, 2), "   理论 =", round(s0 * np.exp(mu * T), 2))
```

三条毛糙轨迹大多数时候贴着红色虚线下方打转、偶有冲到黑线上方的幸运儿——这正是"均值被右尾拉高、中位数才是普通人"的画面化。最后一行打印的两个数字每次都会咬得很近，你可以换几个种子验一验。

## 6. 常见误区

:::warning[常见误区]

- **"年化收益就是中位体验"** —— 分清两个口径：$\mu$ 统治均值（长期组合合计），$\mu-\sigma^2/2$ 统治中位（单个典型账户的手感）。差距 $=\sigma^2T/2$，波动越大坑越深。
- **"修正项是金融学家发明的经验参数"** —— 它是 Itō 引理的计算结果，别处一个系数都不能多也不能少。
- **"股价模型嘛，随便加个绝对值保证非负就行"** —— 取对数天然护航：GBM 由构造保证全程为正，而"$S=|X|$"式补丁会在过零点制造假漂移。

:::

## 7. 练习

实现两个命运数字计算器。初始代码有两处病根：把波动率错当成增长引擎，以及让"中位数"完全冒充"均值"。修好全部检查：

```exercise
# @title: 两条命运曲线的计算器
# @check: 108.3
# @check: 270.8
# @check: 106.2
# @hint: 均值走 exp(mu*T)；中位要多交一笔 sigma 平方的一半的税：exp((mu - sigma*sigma/2)*T)。认准每个符号的角色。
import numpy as np    # exp 是指数函数；上一行已示范，此处沿用

def gbm_expect(s0, mu, sig, T):
    return s0 * np.exp(sig * T)      # ← 谁才是增长引擎？

def gbm_median(s0, mu, sig, T):
    return s0 * np.exp(mu * T)       # ← 中位漏掉了哪笔税？

print(round(gbm_expect(100, 0.08, 0.2, 1), 1))
print(round(gbm_expect(250, 0.08, 0.2, 1), 1))
print(round(gbm_median(100, 0.08, 0.2, 1), 1))
```

<details>
<summary>点开查看逐步解答</summary>

```python
def gbm_expect(s0, mu, sig, T):
    return s0 * np.exp(mu * T)                       # 均值由纯漂移统治：波动只影响形状不影响均值

def gbm_median(s0, mu, sig, T):
    return s0 * np.exp((mu - 0.5 * sig * sig) * T)   # 中位被扣掉 sigma²/2 的凸性税

print(round(gbm_expect(100, 0.08, 0.2, 1), 1))   # e^0.08 ≈ 108.33 → 108.3
print(round(gbm_expect(250, 0.08, 0.2, 1), 1))   # e^0.08×250 ≈ 270.82 → 270.8
print(round(gbm_median(100, 0.08, 0.2, 1), 1))   # e^0.06 ≈ 106.18 → 106.2
```

第三条检查最有戏：参数一样、起点一样，中位答案却低了两块多——那两块正是 $\sigma^2T/2=0.02$ 这笔年度税收的现形。若你的前两行输出是 $122.1$，说明波动率还在冒充漂移上班。

</details>

概念自检：

```quiz
其他条件不变，把波动率 σ 从 0.2 提高到 0.4，下列哪个说法是对的？
- 期望终点和中位终点都提高
- 期望终点不变，中位终点降低 [*]
- 两者都降低
? 均值只认 μ（exp(μT)）纹丝不动；中位的税率是 σ²/2，翻四倍的方差意味着中位数被大幅压低。"高波动坑害典型持有人"在这里给出了公式级别的表达。
```

```quiz
Itō 引理相对古典链式法则多出来的那一项，其来源是什么？
- 对 f'' 项做了二次近似
- (ΔB)² 与 Δt 同阶、无法当作零丢弃 [*]
- 噪声的期望不是零
? 古典世界里二阶增量是 o(dt)；随机世界 Σ(ΔB)² 收敛到 [B]_T = T，它是保级幸存的一阶量。f(B) 求导时因此必须带上 ½f''·dt 层级的修正。
```

## 8. 选读证明：Itō 公式为什么长成这样

<details>
<summary>选读：二阶泰勒的收尾工程</summary>

对分割 $\Pi$ 写出二阶泰勒并求和：

$$f(X_T)-f(X_0)=\sum_k f'(X_{t_k})\,\Delta X_k+\frac12\sum_k f''(X_{t_k})\,(\Delta X_k)^2+R,$$

其中余项受三次幂控制：$|R|\le C\sum(|\Delta X|^3)\to0$——因为三个因子里每一份都至少是 $\sqrt{\Delta t}$ 级别的尖刻，凑满三次方就压过了求和次数。主打的两项命运不同：

- **一阶级**：$\sum f'\,b\,\Delta t\to\int f'b\,dt$ 照古典剧本；$\sum f'\sigma\,\Delta B_k\to\int f'\sigma\,dB$ 靠上一课的 Itō 收敛。
- **二阶级**：$(\Delta X)^2=b^2\Delta t^2+2b\sigma\,\Delta t\,\Delta B+\sigma^2(\Delta B)^2$，前两项是更高阶的小量只剩骨干，故第二总和 $\to\frac12\int f''\sigma^2\,dt$ ——非它莫属地多出一层。

把三项合体即得引理结论。至于 GBM 显式解：对 $X_t=\mu t+\sigma B_t$ 取 $f=e^x$，引理给出 $de^{X}=e^{X}(\mu+\frac{\sigma^2}{2})dt+e^{X}\sigma dB$？小心！这是常见的"半懂陷阱"：想让方程里净漂移恰为 $\mu$，就令 $X_t=(\mu-\frac{\sigma^2}{2})t+\sigma B_t$，引理的两项 $\mu-\frac{\sigma^2}{2}$ 与 $\frac{\sigma^2}{2}$ 相加才恰好回补成 $\mu$——显式解因此天生带着那个减号。整条推导没有一个自由参数，全是义务劳动。

</details>

## 9. 下一站

解既然随手可得，是时候问一般情形怎么算——[SDE 与 Euler-Maruyama](./60-sde-euler-maruyama.md)：给随机微分方程配一台能跑的数值发动机。
