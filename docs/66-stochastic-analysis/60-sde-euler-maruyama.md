---
title: SDE 与 Euler-Maruyama 数值格式
lesson_id: stochastic-analysis/sde-euler-maruyama
prereqs:
  - stochastic-analysis/ito-lemma-gbm
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
  - stochastic-differential-equation
  - euler-maruyama-scheme
applications:
  - particle-brownian-dynamics
  - interest-rate-path-simulation
exits:
  - stochastic-analysis
---

# SDE 与 Euler-Maruyama 数值格式

## 1. 从一个场景开始

悬在空气里的一粒微尘受着两种力的拉扯：重力给一个稳定的下坠推力，分子碰撞则没完没了地随机踢踹。确定性微分方程只会写第一种力，而现实两者都要。把两种力并排写进一行方程——漂移项加扩散项——就得到**随机微分方程（SDE）**。本课解决一个工程问题：这种方程绝大多数解不出闭式公式，如何在计算机上把它"步进"出来？答案是把第 22 章的显式 Euler 格式搬进随机世界，再补上第一课那枚按 $\sqrt{\Delta t}$ 配速的骰子。

## 2. 直觉解释

**核心直觉：每一步做两件事——沿确定的方向挪半格，再掷一枚口径缩好的噪声骰子。**

SDE 的标准写法：

$$dX_t=b(X_t)\,dt+\sigma(X_t)\,dB_t .$$

它只是记号上的宣言，真正的操作定义藏在它的积分形式 $X_t=X_0+\int b\,dt+\int\sigma\,dB$ 里。要把这条轨逐格走出来，把每个小时间段内的一切都"冻结在左端点"：

| 步骤 | 操作 | 来自哪里的授权 |
| --- | --- | --- |
| 漂移半步 | 加上 $b(X_k)\,\Delta t$ | 第 22 章 Euler 显式格式原班人马 |
| 噪声半步 | 再加上 $\sigma(X_k)\sqrt{\Delta t}\,Z_k$，$Z_k$ 为标准正态抽签 | 第一课的平方根配速 + Itō 左端点铁律 |

三层零件各就各位：**漂移**管方向、**扩散**管音量、**$\sqrt{\Delta t}$** 管口径。尤其注意最后一层：方差预算是 $Z^2\Delta t$，所以振幅必须开根号——这正是第 10 课配速表的重播，只是从全局走向了每一步。

## 3. 正式定义

**Euler–Maruyama 格式**：给定初值 $X_0$、时间网格 $t_k=k\Delta t$ 与独立的标准正态序列 $\lbrace Z_k\rbrace$，

$$X_{k+1}=X_k+b(X_k)\,\Delta t+\sigma(X_k)\,\sqrt{\Delta t}\;Z_k ,$$

输出 $\lbrace X_k\rbrace$ 作为真解 $X_{k\Delta t}$ 的近似。约定速记：

| 符号 | 含义 |
| --- | --- |
| $b(X)$ | 漂移函数（确定的力） |
| $\sigma(X)$ | 扩散函数（噪声放大倍数） |
| $\sqrt{\Delta t}\,Z_k$ | 标准化的单步噪声：均值为零、方差恰为 $\Delta t$ |
| 相合性 | 当 $b,\sigma$ 光滑且有界时，格子无限加密则样本路径意义下贴向真解 |

格式退化自检：令 $\sigma\equiv0$，它原封不动变回确定性 Euler——这是个绝佳的接线测试，说明新机器没有推翻旧机器，只是加了一条生产线。

## 4. 分步例题

手算三步 OU 型方程的极端简化版（参数刻意取整便于心算）：$\theta=1$，$\mu=8$，$\sigma=4$，$\Delta t=0.25$（于是噪声系数 $\sigma\sqrt{\Delta t}=2$）。从 $X_0=0$ 出发，抽签依次为 $Z=-1,\,2,\,-1$。

1. 第一步漂移：$(\mu-X)\theta\Delta t=(8-0)\times 0.25=2$；噪声：$2\times(-1)=-2$；合成 $X_1=2-2=0.0$；
2. 第二步漂移不变仍是 $2$；噪声 $+4$；得 $X_2=6.0$；
3. 第三步漂移 $(8-6)\times0.25=0.5$；噪声 $-2$；得 $X_3=4.5$。

注意每次漂移都在朝 $\mu=8$ 拉、噪声在原地乱扔石子——两股力量的拔河画面会在下面的箭头场里现形。

## 5. 动手实验

先看确定性骨架：下面是漂移场 $\dot x=\mu-x$ 的方向箭头图（$\mu=4$），无论从哪里出发，所有箭头最终都汇向同一水平带——这就是噪声背后那只稳住局面的手。

```viz
{
  "type": "slope-field",
  "title": "均值回归的骨架场 dx/dt = 4 − x",
  "expr": "4-y",
  "tmin": 0,
  "tmax": 6,
  "ymin": -1,
  "ymax": 7,
  "t0": 0,
  "y0": 6.5
}
```

然后开真正的发动机：同一台 OU 方程（$\theta=2$，$\mu=4$，$\sigma=1$）用三档步长各跑一条 EM 轨迹，跟一把极细刻度的参照轨放在一起，看看格子粗一点、误差多一点的具体样子。

```python title="Euler-Maruyama 三档步长对照"
import random                     # 标准库随机模块；seed 固定保证可复现
import matplotlib.pyplot as plt   # 绘图模块

random.seed(4242)
T, theta, mu, sigma = 4.0, 2.0, 4.0, 1.0     # 终点时刻 / 回归速率 / 目标水平 / 噪声强度

def em_path(n):                   # n 步走到 T，返回整条轨迹列表
    dt = T / n                    # 步长
    x, xs = 0.0, [0.0]
    for k in range(n):
        z = random.gauss(0.0, 1.0)
        x = x + theta * (mu - x) * dt + sigma * z * (dt ** 0.5)   # EM 核心：漂移半步 + 噪声半步
        xs.append(x)
    return xs

for n in [10, 40, 160]:           # 由粗到细的三档步长
    p = em_path(n)
    plt.plot([i * T / n for i in range(n + 1)], p, linewidth=1.0, label="dt=" + str(round(T / n, 4)))

ref = em_path(4000)               # 极细参照轨（肉眼层面的"真解"）
plt.plot([i * T / len(ref) for i in range(len(ref))], ref, color="gray", linewidth=0.6, alpha=0.7)
plt.axhline(y=mu, color="black", linestyle="--", linewidth=0.8)   # axhline：画一条水平参考线
plt.legend()
plt.xlabel("time")
plt.ylabel("x")
plt.show()

for n in [10, 40, 160]:           # 终点误差表：粗格子的终点离参照轨更远
    err = abs(em_path(n)[-1] - ref[-1])
    print("dt =", round(T / n, 4), " 终点误差 =", round(err, 3))
```

读图要点：三条黑线各有毛刺且毛刺大小大致跟着 $\sqrt{dt}$ 走；误差表的数字会一路收窄但**并不**像确定性 Euler 那样按比例整整齐齐地缩小——这个悬念下一课当堂验收。

## 6. 常见误区

:::warning[常见误区]

- **"噪声项就该乘 Δt，保持跟漂移一样的体面"** —— 那样方差随网格加密归零，格子越细越"干净"，恰好把噪声磨没了。方差预算要求振幅按 $\sqrt{\Delta t}$ 配速。
- **"参数调大都会让轨道更狂野"** —— 不对。$\sigma$ 变大确实更颠簸，而回归速率 $\theta$ 变大反而**两头收效**：回家更快、平稳地带也更窄。方向和音量是两个旋钮。
- **"EM 的终点误差应该与 Δt 成正比"** —— 这是把确定性世界的直觉走私过来。带噪声的"比例合同"要重新签订，具体的条目就在下一课。

:::

## 7. 练习

实现单步推进器。初始代码把漂移方向写反了（把"被 $\mu$ 吸引"写成"被 $\mu$ 排斥"，粒子会永远逃离家门口）；修好它并通过三次连击检查：

```exercise
# @title: 单步推进器：别把家推开
# @check: 0.0
# @check: 6.0
# @check: 4.5
# @hint: 漂移是 (mu − x)*theta*dt：偏低就往上推、偏高就往下压。参数θ=1、μ=8、dt=0.25、σ=4。
def em_step(x, z):
    return x + 1 * (x - 8) * 0.25 + 4 * z * (0.25 ** 0.5)   # ← 漂移括号里的减法装反了

print(round(em_step(0.0, -1), 2))
print(round(em_step(em_step(0.0, -1), 2), 2))
chain = em_step(0.0, -1)
chain = em_step(chain, 2)
print(round(em_step(chain, -1), 2))
```

<details>
<summary>点开查看逐步解答</summary>

把括号翻回来：

```python
def em_step(x, z):
    return x + 1 * (8 - x) * 0.25 + 4 * z * (0.25 ** 0.5)   # θ(μ−x)Δt + σ√Δt·z

a = em_step(0.0, -1)      # 漂移 +2，噪声 -2 → 0.0
b = em_step(a, 2)         # 漂移 +2，噪声 +4 → 6.0
c = em_step(b, -1)        # 漂移 +0.5，噪声 -2 → 4.5
print(round(a, 2))        # 0.0
print(round(b, 2))        # 6.0
print(round(c, 2))        # 4.5
```

错版的第一个输出是 $-4.0$：起点为 $0$ 时它非但不往 $\mu=8$ 回归，反而一脚踹向负方向。三连击检查专门盯防"只改对第一步"的假修好——第三步里漂移 $(8-6)\times0.25=0.5$ 已经变小，只有真正理解"误差越大回拉力越大"的人才能一路走对。

</details>

快问快答：

```quiz
为什么 EM 格式里的噪声要乘 √Δt 而不是 Δt？
- 为了让数值不要太大胆出边界
- 因为方差的预算是 Z²·Δt，振幅必须开根号才凑得出这份方差 [*]
- 这是历史习惯，换成 Δt 数值上差别不大
? 增量 B(t+Δt)−B(t) 的方差恰好是 Δt。若振幅乘 Δt，方差只剩 Δt³ 量级：网格加密时噪声指数级蒸发，格式将收敛到没有噪声的确定性方程。
```

```quiz
把 σ 恒置为零，Euler-Maruyama 格式变成了什么？
- 变成显式欧拉法，与第 22 章完全一致 [*]
- 变成一个恒等于零的空程序
- 什么都不像了，它是全新的机器
? 没有扩散项后每步只剩 X + b(X)Δt，正是确定性 ODE 的显式欧拉一步。所以 EM 不是推翻旧格式，而是给它加装噪声生产线——这也解释了为什么相合性检验要从这处接口做起。
```

## 8. 选读证明：EM 为什么"合法"

<details>
<summary>选读：相合性与强阶 ½ 的一句话版</summary>

合法性的正式名叫**强相合**：固定同一条驱动布朗路，比较格式终点 $X^{(\Delta)}_T$ 与真解 $X_T$，要求最大偏差随 $\Delta t\to0$ 收敛到零。证明骨架两步：

1. **局部合同**：把真解写成更新方程 $X_{t_{k+1}}-X_{t_k}=\int_{t_k}^{t_{k+1}}b\,dt+\int_{t_k}^{t_{k+1}}\sigma\,dB$。EM 用左端点值替代区间平均：漂移一侧的替代误差是 $O(\Delta t^2)$；扩散一侧把 $\sigma(X)$ 冻结在左端点后遗留的尾巴，经 Itō 等距核算其均方同样被常数倍的 $\Delta t^2$ 压住。总账：每步合同误差的**均方**不超过 $C\,\Delta t^2$。
2. **全球累账**：共有 $T/\Delta t$ 个环节，且各步噪声独立、互不助攻，于是均方账本线性累加 $\le C\,T\,\Delta t$。开根号得整体偏差按 **$\Delta t^{1/2}$** 缩小——这就是名言「EM 强阶 $\tfrac12$」的全部来历：误差按步长的平方根缩，恰是被试噪声自己的配速。

想听到½之后的下文吗：给扩散项补一枚二阶修正章 $\tfrac12\sigma\sigma'[(\Delta B)^2-\Delta t]$ 就能把强阶抬到 1（Milstein 格式），而那一枚修正章的身份证号正是二次变差。所有伏笔都已埋在前面几课的账本里。

</details>

## 9. 下一站

"误差按 √Δt 缩"——真的吗？[强收敛与弱收敛选讲](./70-strong-vs-weak-convergence.md)：把这句口号放到天平上，你会意外发现另一杆秤给出的答案漂亮得多。
