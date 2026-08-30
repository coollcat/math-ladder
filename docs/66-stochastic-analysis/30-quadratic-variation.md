---
title: 二次变差：普通链式法则为何失效
lesson_id: stochastic-analysis/quadratic-variation
prereqs:
  - stochastic-analysis/brownian-three-faces
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
  - quadratic-variation
  - first-order-variation-divergence
applications:
  - hedging-pnl-accounting
exits:
  - stochastic-analysis
---

# 二次变差：普通链式法则为何失效

## 1. 从一个场景开始

上一课看到布朗路径毛得连切线都找不到。这立刻危及一件微积分的基本工具：链式法则对 $f(B_t)$ 求导时，要用到 $f$ 的切线斜率——斜率都靠不住，复合求导还剩几分真？本课请出一位新会计：把路径切成小块，把每块位移**平方后加总**。这个量不随切割变细而消失，反而稳稳收敛成一个确定的数（对布朗运动就是流逝的时间）。它是随机世界送给我们的补偿品：微分不行，但这份"抖动账本"记得清清楚楚。

## 2. 直觉解释

**核心直觉：出租车计价器若按"里程的平方"计费，乱窜路线就会原形毕露。**

一条乱窜的路线可以从两个角度记账：

- **普通账（一阶变差）**：把每小步的路程长度累加。走得越碎，账越厚——布朗路径上这笔账**无限膨胀**，记不完。
- **平方账（二次变差）**：把每小步**位移的平方**累加，正负号先被抹平。神奇之处在于：步子越碎，单步平方越小得越快（$\sqrt{\Delta t}$ 的平方是 $\Delta t$），恰好抵消步数变多的速度——总账稳定在 $t$。

| 记账方式 | 单步贡献 | 步数效应 | 总账结局 |
| --- | --- | --- | --- |
| 一阶 $\sum\lvert\Delta B\rvert$ | 约 $\sqrt{\Delta t}$ | $\times\, t/\Delta t$ 越来越多 | 爆炸到无穷 |
| 二阶 $\sum(\Delta B)^2$ | 约 $\Delta t$ | $\times\, t/\Delta t$ | 恰好停在 $t$ |

平方这笔账里藏着布朗运动唯一的身份证号：它把"抖了多少"量化成"过了多久"。下一课你就知道，Itō 积分与失效的链式法则都要对这本账鞠躬。

## 3. 正式定义

设路径分割 $\Pi:0=t_0<t_1<\cdots<t_m=T$，最细网眼 $\lVert\Pi\rVert=\max_k(t_{k+1}-t_k)$。

**二次变差**：

$$[X]_T=\lim_{\lVert\Pi\rVert\to 0}\sum_{k}\bigl(X_{t_{k+1}}-X_{t_k}\bigr)^2 .$$

**定理**：布朗运动沿越来越细的二进分割几乎必然有 $[B]_T=T$。同时它的一阶变差 $\lim\sum\lvert\Delta B\rvert=+\infty$ 几乎必然成立。

两个极限一死一生，符号表如下：

| 符号 | 读法 | 对光滑函数 |
| --- | --- | --- |
| $[X]_T$ | 二次变差 | 等于 $0$（平锯齿贡献是二阶小量） |
| $\sum\lvert\Delta X\rvert$ 极限 | 全变差 | 有限且正常（等于古典弧长） |
| $(dB)^2\leftrightarrow dt$ | 「黑箱除法」口诀 | 光滑世界没有对应物 |

最后一行是个工程速记：增量平方"宏观上是"时间微元。它看起来像胡写，其实是上面定理的代装；整章后续公式都合法地使用它。

## 4. 分步例题

取一条玩具路径：八步位移依次为 $-3,\,5,\,-4,\,3,\,2,\,-5,\,4,\,-2$（单位 0.1）。三种算法的结果判若云泥：

1. **净位移**求和并整体平方：$\bigl(\sum\Delta\bigr)^2=(-3+5-4+3+2-5+4-2)\times 0.1=0$；
2. **平方账**：$\sum(\Delta)^2=(9+25+16+9+4+25+16+4)\times 0.01=108\times 0.01=1.08$；
3. **普通账**：$\sum\lvert\Delta\rvert=(3+5+4+3+2+5+4+2)\times 0.1=2.8$。

同一条路：终点原地踏步（净位移为 0），抖动账却厚达 $1.08$。把它想成一天反复买卖对冲组合：收盘价没赚没赔，但逐笔盈亏的波动幅度实实在在发生过——这正是衍生品定价关心二次变差的原因。

## 5. 动手实验

第一组实验把同一批噪声放进三种颗粒度的筛子里，看两本账的分道扬镳。因为分割是嵌套的（粗筛是细筛每隔若干项取一次），三条估计值来自同一路径，比较绝对公平。

```python title="越切越细：平方账钉在 1，普通账飙升"
import random                     # 标准库随机模块；seed 固定保证可复现
random.seed(7)
n = 4096                          # 最细一层切 4096 步，dt = 1/n
dW = [random.gauss(0.0, (1 / n) ** 0.5) for _ in range(n)]   # 列表推导：一次性抽满全部微增量

print("分割数      平方账(QV)     普通账(TV)")
for stride in [64, 256, 1024]:    # 嵌套取样：每次跳着取细增量的子集构成粗分割
    qv = sum((sum(dW[i:i + stride]) ** 2) for i in range(0, n, stride))   # 粗增量平方再求和
    tv = sum(abs(sum(dW[i:i + stride])) for i in range(0, n, stride))     # abs 取绝对值
    print(stride, "        ", round(qv, 3), "       ", round(tv, 3))
```

读表要点：三行平方账都贴着理论值 $1$ 微调；普通账却随分割加密而**持续上涨、看不到天花板**——有限的钱记不完无限的抖。

第二张图把这对比画成曲线：横轴都是时间，两条累计账目一条贴着对角直线走（平方账 ≈ 时间本身），一条往上鼓成弯曲的加速线（普通账）。

```python title="两本账的累计曲线"
import random                     # 随机模块
import matplotlib.pyplot as plt   # 绘图模块
random.seed(7)
n = 4096
dt = 1.0 / n
dW = [random.gauss(0.0, dt ** 0.5) for _ in range(n)]
qv_cum, tv_cum = [0.0], [0.0]
for v in dW:                      # 逐帧累加两种账本
    qv_cum.append(qv_cum[-1] + v * v)          # 平方账：加位移平方
    tv_cum.append(tv_cum[-1] + abs(v))         # 普通账：加位移长度
xs = [i * dt for i in range(n + 1)]
plt.plot(xs, qv_cum, linewidth=1.2, label="quadratic variation")   # label 供图例识别
plt.plot(xs, xs, linestyle="--", color="gray", label="y = t")      # 参考对角线
plt.plot(xs, [v * 0.12 for v in tv_cum], linewidth=1.2, label="total variation x0.12")
plt.legend()                      # 显示图例
plt.xlabel("time")
plt.ylabel("accumulated")
plt.show()
```

橙色那条即使按比例缩过还是明显弯离灰色对角线，而且把分割再加密十倍它就会蹿到画面外——爆炸没有尽头。

## 6. 常见误区

:::warning[常见误区]

- **"净位移是零，所以这条路径什么都没发生"** —— 终点只讲结论不讲过程；$1.08$ 的抖动账才是过程的实况。金融里这对应"对冲后盈亏为零，但风险敞口的波动真实存在"。
- **"二次变差是对路径求个和，结果应该每条路都不一样"** —— 对布朗运动它是例外地稳定：几乎每条路径的平方账都等于 $T$ 本身，与路径个性无关。
- **"(dB)² 和 dt 同阶，所以可以把二阶泰勒项丢掉"** —— 正相反！光滑世界丢弃二阶项是因为它们是更小的量；随机世界里二阶项恰好保级存活，这才是下一课链式法则翻车的根源。

:::

## 7. 练习

把例题的玩具账本写成代码。初始版本犯了一个本章重罪——先求和再平方，把全部内部抖动一笔勾销。修好三个检查：

```exercise
# @title: 抖动账本修正案
# @check: 1.08
# @check: 2.8
# @check: 0.0
# @hint: 平方要作用在每个增量上再相加；"先加后平"会把来回抵消的位移冒充成岁月静好。
MOVES = [-0.3, 0.5, -0.4, 0.3, 0.2, -0.5, 0.4, -0.2]   # 八步玩具位移

def squared_ledger(moves):
    return sum(moves) ** 2      # ← 错误记账法：先合并再平方

def total_variation(moves):
    return sum(moves)           # ← 这甚至不是绝对值账

def net_displacement(moves):
    return sum(moves)

print(round(squared_ledger(MOVES), 2))
print(round(total_variation(MOVES), 2))
print(round(net_displacement(MOVES) ** 2, 2))
```

<details>
<summary>点开查看逐步解答</summary>

```python
def squared_ledger(moves):
    return sum(v * v for v in moves)   # 生成器：对每个元素平方后再求和

def total_variation(moves):
    return sum(abs(v) for v in moves)  # abs 先抹掉方向，只留路程

def net_displacement(moves):
    return sum(moves)

print(round(squared_ledger(MOVES), 2))          # 0.09+0.25+... = 1.08
print(round(total_variation(MOVES), 2))         # 2.8
print(round(net_displacement(MOVES) ** 2, 2))   # (0.0)**2 = 0.0
```

三个数字拼成本课的完整寓言：净位移平方 $0.0$ 说"假装无事发生"；普通账 $2.8$ 说"路走了不少但会爆表"；平方账 $1.08$ 才是既有限又意义丰富的那个量。检查行故意把 `0.0` 也列进去——确认你写的是逐项平方，而不是碰巧撞出别的巧合。

</details>

概念快问快答：

```quiz
把布朗路径的分割无限加密，下列哪个量的极限不是无穷大？
- 各段位移长度之和（全变差）
- 各段位移平方之和（二次变差） [*]
- 弦斜率绝对值的最大值
? 唯独平方账被 Δt 与 √Δt 的配速锁死在常数 T 上：单步平方 ~ Δt 恰好喂饱步数 ~ 1/Δt。另外两位都在细化过程中持续膨胀。
```

## 8. 选读证明：为什么光滑路径的平方账注定归零

<details>
<summary>选读：同一笔账在两个世界的不同命运</summary>

设 $f$ 可导且导数有界 $M$。对任意分割：

$$[f]_T^{(\Pi)}=\sum_k\bigl(f(t_{k+1})-f(t_k)\bigr)^2=\sum_k\bigl(f'(\xi_k)\,(t_{k+1}-t_k)\bigr)^2\le M^2\,\lVert\Pi\rVert\sum_k(t_{k+1}-t_k)=M^2\,T\,\lVert\Pi\rVert\xrightarrow[\ \ ]{}0.$$

关键一步是拉格朗日中值定理把每个增量按 $M\cdot\Delta t$ 控制，于是总和最多 $M^2 T\lVert\Pi\rVert$——随网格消失。光滑世界没有毛刺可收租。

布朗那边则是一对平行结论：一方面由上节课的量级账 $\Delta B\sim\sqrt{\Delta t}$，结合大数定律式的论证可得 $\sum(\Delta B)^2$ 稳定到 $T$（证明用 $L^2$ 估计：$\operatorname{E}\bigl[\bigl(\sum((\Delta B)^2-\Delta t)\bigr)^2\bigr]=\sum 2\Delta t^2\le 2T\lVert\Pi\rVert\to0$）；另一方面 $\sum|\Delta B|\ge\frac{(\sum\Delta B^2)}{\max|\Delta B|}\approx \frac{T}{\sqrt{\lVert\Pi\rVert}}\to\infty$——分母是趋零的单步最大位移。一阶账因此必然爆仓。

这两条合起来叫「$p$ 变差分水岭」：$p<2$ 的账全爆、$p>2$ 的账全空，只有 $p=2$ 恰好活着。这也是为什么随机微积分选中二次变差当支点。

</details>

## 9. 下一站

账本备齐，可以开工了——[Itō 积分](./40-ito-integral-intuition.md)：给抖动积分的第一条铁律是"只用区间左端点的信息做决定"。
