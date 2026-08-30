---
title: 测度变换与鞅表示：换个世界观算期望
lesson_id: stochastic-analysis/girsanov-martingale
prereqs:
  - stochastic-analysis/ito-integral-intuition
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
  - radon-nikodym-density
  - girsanov-theorem
  - risk-neutral-measure
applications:
  - risk-neutral-pricing
  - importance-reweighting
exits:
  - stochastic-analysis
---

# 测度变换与鞅表示：换个世界观算期望

## 1. 从一个场景开始

同一家跨国公司，美元账本和欧元账本记出的市值分文不差——变的只是记账汇率，钞票一张没多没少。20 世纪 70 年代的金融数学把这句话搬进了概率世界：给"未来"挂一张**汇率表**，就能把股价里讨厌的漂移整段换算掉，让它在新的记账口径下看起来像纯噪声。这张汇率表叫 Girsanov 密度，这套手法叫**测度变换**——风险中性定价的数学地基由此打牢，也顺手为随机控制留了入口。本章正史，在这最后一课收官。

## 2. 直觉解释

**核心直觉：概率不是路径的属性，而是套在路径上的一层"天气权重"；换测度＝换权重，路径一条不少。**

前面几课给每条布朗路径配了确定性的骨架（漂移）与抖动（扩散）。测度变换宣布一件更根本的事：**骨架不是路径的固有属性，而是记账口径的属性**。同一批路径，换一套天气权重重新描述，原来那段匀速上坡可以整个被"换算"成噪声——这就是标题里"换个世界观算期望"的全部含义。整套手法的账目只有四行：

| 记账动作 | 数学操作 | 效果 |
| --- | --- | --- |
| 挂出汇率表 | 定义密度 $Z_T=dQ/dP$ | 每条路径领到一个非负权重 |
| 核对账本自洽 | $\operatorname{E}_P[Z_T]=1$ | 权重总量分文不差 |
| 按新汇率折算期望 | $\operatorname{E}_Q[X]=\operatorname{E}_P[X\,Z_T]$ | 新测度期望 = 老测度乘权重再平均 |
| 骨架整体掰平 | $W_t-\theta t$ 在 $Q$ 下变布朗 | 漂移项被换出了路径描述 |

最妙的是角色互换的彻底性：漂移没有消失，而是连本带汇率折进了换算账里。现实世界的 $\mu$ 该多大还是多大——变的只是"在哪个口径下做算术"。

## 3. 正式定义

**Girsanov 密度**：设 $W$ 是概率测度 $P$ 下的标准布朗运动，$\theta$ 为任意实常数，令

$$Z_T=\exp\Bigl(\theta\,W_T-\tfrac{1}{2}\,\theta^{2}\,T\Bigr),\qquad \operatorname{E}_P[Z_T]=1 .$$

**测度变换（Girsanov 定理）**：以 $Z_T$ 为汇率表定义新测度 $dQ=Z_T\,dP$，则

$$\widetilde{W}_t:=W_t-\theta\,t\quad\text{在 } Q \text{ 下是标准布朗运动}.$$

| 符号 | 含义 |
| --- | --- |
| $\theta$ | 想掰动的漂移力矩：符号管方向，大小管力度 |
| $Z_T$ | 汇率表（Radon–Nikodym 密度）：每条路径在 $Q$ 下的话语权 |
| $\operatorname{E}_P[Z_T]=1$ | 汇率自洽：总权重不增不减 |
| $\widetilde{W}_t$ | 新测度里的布朗运动：原路径减去 $\theta t$ 的重新描述 |

漂移消失只需一行改写：$X_t=\mu t+\sigma W_t$ 可写成 $X_t=\sigma\widetilde{W}_t+(\mu+\sigma\theta)t$，取 $\theta=-\mu/\sigma$，净漂移当场清零——在 $Q$ 的世界观里这只股票就是纯抖动。代回密度式，$Z_T=\exp\bigl(-\tfrac{\mu}{\sigma}W_T-\tfrac{\mu^{2}}{2\sigma^{2}}T\bigr)$，正是教科书里风险中性密度的模样。

**两句定位，顺手收束金融线**：

- **鞅表示定理**：$Q$ 世界里任何"可达财富"都能写成 $\widetilde{W}$ 的随机积分——对冲策略永远存在的法定依据，而本章 Itō 积分课正是那台记账机器。
- **停时与可选停止**："何时停"本身也能当随机变量（停时），鞅性在随机时刻依然守恒——美式期权"最优行权"定价的地基。

## 4. 分步例题

最小的"世界"只有晴、雨两个状态，Girsanov 的全部机关在这就能演完。现实测度 $P$：晴天 $2/3$、雨天 $1/3$；想把世界掰成晴雨各半的新测度 $Q$。

1. **挂汇率表**：$\lambda_{\text{晴}}=(1/2)\div(2/3)=3/4$；$\lambda_{\text{雨}}=(1/2)\div(1/3)=3/2$——小概率世界被加倍权重；
2. **核对自洽**：$\operatorname{E}_P[\lambda]=\tfrac{2}{3}\cdot\tfrac{3}{4}+\tfrac{1}{3}\cdot\tfrac{3}{2}=\tfrac12+\tfrac12=1$，权重总量分文未动；
3. **现实期望**：某资产雨天付 $6$、晴天付 $0$，$\operatorname{E}_P[X]=\tfrac13\cdot 6=2$；
4. **换算期望**：$\operatorname{E}_Q[X]=\operatorname{E}_P[\lambda X]=\tfrac13\cdot\tfrac32\cdot 6=3$；
5. **直接验算**：按 $Q$ 现收现算 $\tfrac12\cdot 6=3$，两账对齐 ✓。

连续世界里的 Girsanov 密度就是这张表的"指数豪华版"：汇率不再逐状态列举，而是一整条 $\exp$ 曲线铺在全部路径上。

## 5. 动手实验

先看现实测度 $P$ 的骨架：箭头场整体朝上，这是 $\mu=0.8$ 的匀速上坡——待会儿换完测度，这把斜率将被整体掰平。

```viz
{
  "type": "slope-field",
  "title": "P 视角的骨架：dX/dt = 0.8（换测度后这把斜率整体掰平）",
  "expr": "0.8",
  "tmin": 0,
  "tmax": 6,
  "ymin": -1,
  "ymax": 7,
  "t0": 0,
  "y0": 0
}
```

再请两万条路径对账。四行输出分别验证：密度期望恒 $1$（$\theta$ 正负都算）、现实期望贴理论、换算期望贴 $0$——"漂移被换掉"不是修辞，是账面上的 $0$。

```python title="Girsanov 密度对拍：换测度把漂移换成 0"
import random                     # 标准库随机模块；seed 固定保证可复现
import math                       # math.exp：指数函数，Girsanov 密度的原料

random.seed(66)
T, trials = 1.0, 20000            # 终点时刻 / 抽样路径条数
acc_zp = 0.0                      # θ=+0.8 密度的累计器
acc_z = 0.0                       # θ=-0.8 密度的累计器
acc_x = 0.0                       # 现实期望的累计器
acc_q = 0.0                       # 换算（新测度）期望的累计器
for _ in range(trials):
    w = random.gauss(0.0, T ** 0.5)              # 直接抽终点 W_T（只认终点，无须逐步走）
    zp = math.exp(0.8 * w - 0.32)                # θ=+0.8：exp(θW_T − θ²T/2) 的取值
    z = math.exp(-0.8 * w - 0.32)                # θ=-0.8：把 +0.8 的漂移掰回去的力矩
    x = 0.8 * T + w                              # 漂移布朗终点 X_T = μT + σW_T（σ=1）
    acc_zp += zp
    acc_z += z
    acc_x += x
    acc_q += x * z                               # 换算账：老测度取值 × 汇率
print("E_P[Z_T](θ=+0.8) =", round(acc_zp / trials, 4), "（理论 1）")
print("E_P[Z_T](θ=-0.8) =", round(acc_z / trials, 4), "（理论 1）")
print("E_P[X_T]         =", round(acc_x / trials, 4), "（理论 0.8）")
print("E_Q[X_T]         =", round(acc_q / trials, 4), "（换测度后理论 0）")
```

实测四行：$0.9969$、$1.0086$、$0.7923$、$-0.0132$。前三行咬住理论值，第四行在 $0$ 附近一个抽样标准差之内打转；换种子重跑结论不变——汇率表自洽、漂移被换算归零，两件事当场对拍。

## 6. 常见误区

::::warning[常见误区]

- **"换测度就是把路径改了"** —— 路径一条不少、一根毫毛没动，动的只是每条路径的话语权。Radon–Nikodym 密度是汇率表，不是剪刀。
- **"Q 下漂移为零，说明漂移根本不存在"** —— 漂移没有消失，而是被折进换算账：$\operatorname{E}_Q[X]=\operatorname{E}_P[XZ_T]$。现实世界的 $\mu$ 该多大还是多大，$Q$ 只是让定价算式变干净。
- **"随手挑个正函数就能当密度"** —— 必须非负且期望恰为 $1$（连续版本再加 Novikov 可积性），否则汇率表自己就是亏空的，换出来的不是合法概率。

::::

## 7. 练习

把两点世界的汇率表装回代码。初始代码的 `rn_density` 把"汇率"错填成了 $Q$ 本身——前两行检查会当场打脸，第三行永远正确（直接按 $Q$ 算才是定音锤）：

```exercise
# @title: 两点世界的汇率表
# @check: 1.0
# @check: 2.0
# @check: 2.0
# @hint: 汇率是"新概率 ÷ 老概率"逐状态相除；自洽检查 E_P[λ] 必须恰好为 1。换算期望 = 老概率 × 汇率 × 收益。
P = [0.75, 0.25]          # 现实测度：两个状态各自的"天气概率"
Q = [0.5, 0.5]            # 目标测度：想把世界掰成的样子
X = [0.0, 4.0]            # 某资产在两个状态的收益

def rn_density(p, q):
    return q              # ← 问题在这：汇率表应是 Q/P，不是 Q 本身

def e_under(weights, values):
    total = 0.0
    for w, x in zip(weights, values):     # zip：把两组名单并排拉链，逐对取出
        total += w * x
    return total

lam = rn_density(P, Q)
print(round(e_under(P, lam), 2))                                # 自洽检查：E_P[λ]
print(round(e_under(P, [lam[i] * X[i] for i in range(2)]), 2))  # 换算账：E_Q[X]
print(round(e_under(Q, X), 2))                                  # 直接按 Q 算：定音锤
```

<details>
<summary>点开查看逐步解答</summary>

汇率逐状态相除：$\lambda=[0.5/0.75,\ 0.5/0.25]=[2/3,\ 2]$。

```python
def rn_density(p, q):
    return [q[i] / p[i] for i in range(2)]   # 汇率 = 新概率 ÷ 老概率
```

修好后三行输出 $1.0$、$2.0$、$2.0$：自洽检查归一（$\tfrac34\cdot\tfrac23+\tfrac14\cdot 2=\tfrac12+\tfrac12$），换算账 $\tfrac14\cdot 2\cdot 4=2$ 与直接账 $\tfrac12\cdot 4=2$ 分毫不差。初始版本报 $0.5$、$0.5$、$2.0$（第三行碰巧永远正确）：它把 $Q$ 本身当汇率用，权重总量只剩一半——等于记账记丢了一半的世界。

</details>

```quiz
测度从 P 换成 Q 之后，下列哪件事保持不变？
- 每条路径的出现概率
- 路径的全体集合：一条不多、一条不少 [*]
- 期望值
? 换测度重新分配的是"话语权"：个别路径的概率会变、期望会变，但世界的故事板（路径集合）原封不动——这正是"换个世界观"而非"换个世界"。
```

```quiz
风险中性定价的逻辑链是哪一条？
- Q 下随机性消失，所以期望好算
- Q 下漂移统一折成无风险利率，期望再贴现给出无套利价格 [*]
- Q 下波动率变为零
? Girsanov 只挪走漂移、从不碰扩散：Q 世界照样满地噪声，只是所有资产按同一无风险利率记账——正因为人人相同，任何偏离都会被套利抹平，价格因此唯一。
```

## 8. 选读证明：为什么 exp(θW−θ²T/2) 的期望恒等于 1

<details>
<summary>选读：一行矩母函数 + 一句 Novikov</summary>

$W_T$ 是均值 $0$、方差 $T$ 的正态变量，它的矩母函数只有一行：

$$\operatorname{E}\bigl[e^{sW_T}\bigr]=e^{s^{2}T/2}\qquad(\text{任意实数 } s).$$

代 $s=\theta$ 再乘 $e^{-\theta^{2}T/2}$，两个指数因子恰好抵消——期望恒 $1$，与 $\theta$ 的符号大小一概无关，所以力矩"掰多狠都合法"。严谨版的最后一公里叫 **Novikov 条件**：要求 $\operatorname{E}\bigl[e^{\frac12\int_0^T\lambda_t^2\,dt}\bigr]<\infty$，它保证密度过程 $Z_t$ 自身是个不漏不重的真鞅（任意时刻的汇率表平均看仍是 $1$），从而 $dQ=Z_T\,dP$ 真的裁出一套概率。至于漂移布朗的换算对拍，本课实验里 $\theta=-0.8$ 正是 $\mu/\sigma=0.8$ 的反号——你已经亲手跑过风险中性定价入口的第一次全流程对账。

</details>

## 9. 下一站

至此，从一枚硬币的缩放到一张汇率表的挂钩，随机分析十门课圆满收官：路径的制造、三副面孔、平方账本、Itō 宪法、修正项、数值发动机、两杆秤、密度云、回家的弹簧，最后是换世界观的汇率表。回到[随机分析章首页](./index.md)重温整条路线图，或直接开往站内其他卷册继续你的阶梯攀登。
