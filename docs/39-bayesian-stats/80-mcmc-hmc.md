---
title: MCMC 直觉：Metropolis-Hastings 与 HMC
lesson_id: bayesian/mcmc-hmc
prereqs:
  - bayesian/continuous-updating
  - stochastic-processes/markov-chain
volume: 4
layer: L5
track:
  - probability-statistics
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - metropolis-hastings
  - hamiltonian-monte-carlo
  - burn-in
applications:
  - bayesian-computation
  - posterior-sampling
exits:
  - data-ai
---

# MCMC 直觉：Metropolis-Hastings 与 HMC

## 1. 从一个场景开始

上节课末尾留了一封战书：真实推荐系统的参数动辄几千维，网格铺不起，积分积不动——贝叶斯机器眼看要熄火。这一课请出最后也最强的引擎，思路却来自一个不折不扣的笨办法：

**别遍历这座山，去抽样它。**

想象一位游客要在浓雾里绘制山的轮廓图：他看不见全貌，只能不断挪脚，但可以保证一件事——在任意地点驻留的时间长短，正比于那里的海拔。走得足够久之后，他的足迹密度就是一张合格的「海拔地图」。把「山」换成「后验」，海拔换成密度，这套随机游走就叫 **MCMC**（马尔可夫链蒙特卡洛）。

## 2. 直觉解释

还记得马尔可夫链那课吗？转移矩阵推着状态满天跑，跑得够久后会进入**平稳分布**。MCMC 的全部野心就一句话：

> **精心设计「下一步去哪」的规则，逼着平稳分布恰好等于我们要的后验。**

最著名的配方是 Metropolis-Hastings，协议只有三步：

1. **提议**：从当前位置向附近扔一枚飞镖（随机试一个新点）；
2. **天平**：新点海拔更高？立刻搬家；海拔更低？按「高度比」掷骰子决定搬不搬；
3. **记账**：无论搬没搬，当前位置记录一次。

绝妙之处在第 2 步用的是**比值**——后验里那个谁也算不出来的归一化常数在分子分母之间直接约掉。我们从来不知道「山顶到底多高」，只知道「那里是这里的几倍」，这恰恰就够了。

随机游走版嫌自己太慢，物理学家给游客装上了冰刀：**HMC（哈密顿蒙特卡洛）**不再瞎晃，而是给一枚滑块注入随机动量、让它沿坡面无摩擦滑行一段再决定收不收——顺坡势滑出去老远还基本稳稳落在高密度区，一次顶醉汉晃几十步。

## 3. 正式定义

**MH 的接受率**（当前 $x$，提议 $x'$）：

$$\alpha(x \to x')=\min\left(1,\ \frac{f(x')}{f(x)}\right)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $x, x'$ | 当前点与提议点 | 脚下位置和飞镖落点 |
| $f$ | 未归一化目标密度 | 后验去掉常数后的形状，$f>0$ 处才可能被访问 |
| $\alpha$ | 接受率 | 天平读数；爬坡恒为 1，下坡等于密度比 |
| burn-in | 烧入期 | 开头还没走进正题的那段样本，统计前丢弃 |
| 步长 | 提议散布 | 掷飞镖的范围，太大尽挨拒、太小寸步移 |

**HMC 的能量账本**：令势能 $U(q)=-\log f(q)$，动量 $p \sim N(0,1)$，总能量 $H(q,p)=U(q)+\tfrac{1}{2}p^2$。无摩擦滑行保持能量守恒，端点能量差给出接受率：

$$\alpha_{\text{HMC}}=\min\left(1,\ e^{H_{\text{旧}}-H_{\text{新}}}\right)$$

数值积分器有微小泄漏，所以仍要这道老式的验收天平——妙处在于远离坡谷的大跳步照样敢提，因为能量差替它担保。

## 4. 分步例题

拿一座小山练天平：目标密度取 $g(\theta)=\theta^3(1-\theta)^7$（峰在 0.3）。站在 $\theta=0.3$ 处，飞镖分别落在 0.50 和 0.72。

1. 读出各自的高度并作比：$g(0.50)/g(0.30)\approx 0.44$——比脚下矮一半有余；
2. 第一枚飞镖天平读数 $\alpha=0.44$：掷骰，四成四的概率搬家，五成六原地驻留；
3. 第二枚更远：$g(0.72)/g(0.30)\approx 0.02$，几乎必拒——深谷里的提议不当家；
4. 全程没用过任何归一化常数：$g$ 本来就没归一化！这四位数字若是 $c\cdot g$，所有比值纹丝不动——MCMC 因此对「难缠的常数」免疫。

一句话总结例题：**往上白送，往下打折**——折扣恰好等于两地密度的倍数。

## 5. 动手实验

### 实验 1（viz）：先看看要爬的山

```viz
{
  "type": "plot",
  "title": "双峰山脉：三副滑块捏出不同的地形",
  "expr": "exp(-((x-a)/w)^2)+exp(-((x-b)/w)^2)",
  "xmin": 0,
  "xmax": 1,
  "sliders": [
    { "name": "a", "min": 0.05, "max": 0.45, "step": 0.01, "value": 0.25 },
    { "name": "b", "min": 0.55, "max": 0.95, "step": 0.01, "value": 0.75 },
    { "name": "w", "min": 0.03, "max": 0.15, "step": 0.01, "value": 0.06 }
  ]
}
```

拖近 `a` 和 `b`，山谷抬高成缓丘——随机游走还能偶尔串门；拖远又捏细，中间隔出一道绝望深渊。记住这个手感，实验 2 的游客马上就要栽在这道沟里。

### 实验 2（python）：双峰山地上的真实游走

```python title="RW-MH 游走双峰山：接受率健康，足迹却跛了"
import random                     # 固定种子保证人人同一路径
import matplotlib.pyplot as plt   # 画图库

random.seed(2026)                 # 固定随机种子：路径完全可复现

def bump_target(t):
    # 未归一化目标：双峰先验 × 一份相当平坦的似然
    prior = math.exp(-((t - 0.25) / 0.06) ** 2) + math.exp(-((t - 0.75) / 0.06) ** 2)
    return prior * t ** 6 * (1 - t) ** 6

cur = 0.5                         # 从山坳出发
samples = []                      # 全部足迹（含驻留重复）
acc_cnt = 0                       # 接受计数
for it in range(6000):
    prop = cur + random.uniform(-0.12, 0.12)          # 掷飞镖：±0.12 步长
    if 0 < prop < 1 and random.random() < min(1, bump_target(prop) / bump_target(cur)):
        cur = prop                # 天平放行才搬家
        acc_cnt = acc_cnt + 1
    samples.append(cur)           # 无论搬没搬都记一笔

keep = samples[1000::5]           # 烧入前 1000 步，之后每 5 步抽 1 个（抗自相关）
left = sum(1 for s in keep if s < 0.5)   # 生成器表达式：sum 直接吃一个边生成边计数的循环，数出落在左半边的样本
print(f"接受率 {round(acc_cnt / 6000, 2)}")   # f-string：引号前加 f，花括号里的表达式算好直接填进句子
print(f"左峰占比 {round(left / len(keep), 2)}")
print(f"足迹均值 {round(sum(keep) / len(keep), 3)}")

plt.hist(samples[1000::5], bins=60)
plt.title("footprint histogram")
```

本机实跑结果：接受率约 0.49（教科书级的健康区间），左峰占比却是 **1.00** ——六千步里游客一次都没翻过中央深渊，直方图只剩半边山。这就是 MCMC 最阴险的故障模式：**体检指标全绿，地图其实缺角**。诊断思路多元起步（几条不同起点并行）、放大步长、或换本课下半场的装备。

### 实验 3（python）：装上冰刀是什么效果

```python title="醉汉 vs 冰刀：同样起点，一次能蹿多远"
import random   # 固定种子比较公平

random.seed(5)

def leapfrog(q, p, eps, n_steps):
    # 半步动量 → 全步位置交替进行，是无摩擦滑行的标准积分器
    p = p - eps * q / 2           # 半步更新动量
    for _ in range(n_steps):
        q = q + eps * p           # 全步前进
        p = p - eps * q           # 又半步动量
    return abs(q)                 # 归途之前的落点不必对称，看绝对距离

rw_dist = 0                       # 醉汉组累计位移
hmc_dist = 0                      # 冰刀组累计位移
for trial in range(200):
    start = random.gauss(0, 1)    # 同一批起点与预算
    drift = start + random.gauss(0, 0.3)
    rw_dist = rw_dist + abs(drift - start)
    kick = random.gauss(0, 1)     # 随机动量
    hmc_dist = hmc_dist + leapfrog(start, kick, 0.1, 10)

print(f"醉汉平均一步 {round(rw_dist / 200, 2)}")
print(f"冰刀平均一程 {round(hmc_dist / 200, 2)}")
```

同样的起点与预算，冰刀一程是醉汉一步的三倍多——这正是 HMC 在高维大显神威的原因：靠坡度与惯性做**定向长跳**，而不是望天随机踩点。

### 快问快答

```quiz
为什么 MH 的天平只需要未归一化的密度 f，不用先算出真正的后验常数？
- 因为常数在任何模型里都等于 1
- 因为比值里上下相约掉了 [*]
- 因为计算机自动补齐常数
? f 只是 c·后验：搬到别处的天平读数写成 f(x')/f(x)，常数 c 同时出现在分子分母，一步约分消失。
```

:::warning[常见误区]

**误区一**：「你以为链条越接近峰顶越好。」链不需要找峰，需要的是按密度比例**停泊**；把 σ 定得极小反而全局趴窝，定得巨大则天天爬山日日被拒。健康的接受率大约落在两到五成之间。

**误区二**：「你以为把轨迹画出来就是后验图。」轨迹先要走完烧入期，且相邻样本高度相关——连续足迹不是独立投票。「有效样本数」通常远小于迭代次数，认真结算前必须换算。

**误区三**：「你以为 HMC 是全面升级款。」它的发动机是梯度，参数不可导或维度会变的模型根本挂不上挡。离散选择、变结构模型至今仍是随机游走系的主场。

:::

## 6. 练习

**练习 1**：手动运转同一台 MH 天平（还是 §4 那座 $g(\theta)=\theta^3(1-\theta)^7$）。代码能跑，但天平被人拆了砝码——所有提议来者不拒。修好它：恢复 $\min(1,\ r)$ 的标准读法。改到通过：

```exercise
# @title: 练习：把砝码放回天平
# @check: 2
# @check: 0.3
# @hint: 接受条件是骰子小于 min(1, r)；爬坡（r ≥ 1）时必定放行，深谷提议多半被扣下
proposals = [0.40, 0.30, 0.50, 0.72]   # 四次提议的去处
coins = [0.60, 0.45, 0.80, 0.20]       # 预先掷好的四枚骰子，顺序使用保证人人一致

def g(t):
    return t ** 3 * (1 - t) ** 7       # 目标密度（峰在 0.3），无需归一化

current = 0.6                           # 起点：山坳右侧
accepted = 0
for i in range(4):
    r = g(proposals[i]) / g(current)    # 高度比
    alpha = 1                           # ← 砝码丢了：不管三七二十一全放行
    if coins[i] < alpha:
        current = proposals[i]
        accepted = accepted + 1
print(accepted)
print(round(current, 2))
```

<details>
<summary>点开查看逐步解答</summary>

```python
proposals = [0.40, 0.30, 0.50, 0.72]   # 重建提议与骰子
coins = [0.60, 0.45, 0.80, 0.20]

def g(t):
    return t ** 3 * (1 - t) ** 7

current = 0.6
accepted = 0
for i in range(4):
    r = g(proposals[i]) / g(current)
    alpha = min(1, r)                   # 砝码归位
    if coins[i] < alpha:
        current = proposals[i]
        accepted = accepted + 1
# 四步依次：r≈5.06 放行到 0.40；r≈1.24 登顶 0.30；
# 0.50 的读数约 0.44 被骰子 0.80 扣下；0.72 只有约 0.02 直接拒载。
print(accepted)      # 2
print(round(current, 2))   # 0.3
```

正确的链条两次放行皆在上行，两次下行提议全被礼貌送回——终点钉在峰顶 0.3。而坏天平会连吃四个提议窜去 0.72（accepted 变 4），把「深谷低密度」当成了「照单全收」。

</details>

**练习 2**：实验 2 的游客为何卡死在左峰？给出至少两条工程对策，并说明各自的代价。

<details>
<summary>点开查看逐步解答</summary>

根源：跨过 0.5 山谷的中段提案密度趋近零，天平读数趋近 0——间隔成了一堵绝对墙。对策：(1) 多链并行、不同起点出发，至少每个模式各有一条链报告本地情况（代价是需要聚合判据判断何时该合并）；(2) 加大步长或改用厚尾提议增加跳跃半径（代价是接受率骤降、单链效率变差）；(3) 换 HMC 类定向跳步（代价是要算梯度且越过浅谷容易、深谷依旧艰难）；(4) 重构参数化抹平山谷（代价是要懂病根在哪，属于最高级但也最有效的方案）。实际工作流常是几招并用。

</details>

## 7. 选读：天平为什么守恒

<details>
<summary>选读 · 细致平衡的四行证明</summary>

想让驻留频率收敛到 $\pi(x)$，充分条件是**细致平衡**：任意两点间的往返流量相等，$\pi(x)\alpha(x{\to}x')P_0(x') = \pi(x')\alpha(x'{\to}x)P_0(x)$，其中 $P_0$ 是提议概率。代入 Metropolis 的 $\alpha=\min(1,\pi'/\pi)$（提议对称时 $P_0$ 两边相同）验证：设 $\pi'\ge\pi$，正向 $\alpha=1$、反向 $\alpha=\pi/\pi'$，两端流量都是 $\pi\cdot P_0\cdot 1$ 与 $\pi'\cdot P_0\cdot \pi/\pi'$ 相等即 $\pi P_0 = \pi P_0$ ✓。反向同理。一锅端地满足细致平衡 ⇒ 平稳分布恰为 $\pi$ ⇒ 游客的长期足迹就是后验。那条随口的天平规则，原来是精心配平过的流量阀。

</details>

## 8. 下一站

引擎解决了「能不能算」。但当数据天然分层——连锁店的门店各不相同、学生嵌套在班级里——硬塞进单一后验会闹笑话。下一课讲结构：层次模型与部分池化。

→ [层次模型与部分池化](./90-hierarchical-models.md)
