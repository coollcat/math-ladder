---
title: Ornstein-Uhlenbeck 与均值回归选讲
lesson_id: stochastic-analysis/ornstein-uhlenbeck
prereqs:
  - stochastic-analysis/fokker-planck
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
  - mean-reversion
  - ou-process
  - autocorrelation-time
applications:
  - interest-rate-baseline-models
  - sensor-drift-recalibration
exits:
  - stochastic-analysis
---

# Ornstein-Uhlenbeck 与均值回归选讲

## 1. 从一个场景开始

恒温空调房里的温度计、市场里被盯得死死的汇率走廊、实验室里带自动校准的传感器——它们有个共同的日常：**时不时跑偏，但总被一只看不见的手往"正常水平"拉回去**。纯布朗运动是只出不进的迷宫，走多远算多远；现实里大多数测量值却有"家"可回。把回家之力 $-\theta(X-\mu)$ 与布朗噪声 $\sigma dB$ 缝进同一行方程，就得到本章压轴名角：Ornstein–Uhlenbeck 过程。它是均值回归世界的氢原子——结构最简、人人必学，本课讲全它的三样家当：回家的速度、住处的宽窄、记忆能保鲜多久。

## 2. 直觉解释

**核心直觉：弹簧上拴着一只醉汉——既醉且弹，方成世间万物波动之常态。**

设想一颗珠子在光滑凹槽里晃荡：离中心越远，回拉的力气越大（胡克定律的那份正比），但它同时被分子噪声不停拍打。三者互动的全部账目：

| 家当 | 数学面孔 | 直觉读数 |
| --- | --- | --- |
| 回家的速度 | 漂移 $=\theta(\mu-X)$：偏差越大拉力越猛 | 弹簧劲度 $\theta$ |
| 醉汉的脾气 | 扩散 $\sigma\,dB$ | 噪声强度 $\sigma$ |
| 最终宅子 | 平稳分布 $N\bigl(\mu,\ \sigma^{2}/2\theta\bigr)$ | 家有围墙，宽窄定于劲度与噪声之比 |

最有意思的是第三行：布朗运动没有「平稳态」一说（云一路摊薄到无限远），而 OU 的云会**收敛安家**——上一课 Fokker-Planck 例题已经把这座钟形宅子的尺寸算了出来。这便是二者的分水岭：有无平稳围墙。

## 3. 正式定义

**Ornstein–Uhlenbeck 过程**：满足如下 SDE 的解

$$dX_t=-\theta\,(X_t-\mu)\,dt+\sigma\,dB_t .$$

| 符号 | 含义 |
| --- | --- |
| $\mu$ | 回归目标（长期均值） |
| $\theta>0$ | 回归速率：它决定偏差折半的时间尺度 |
| $\sigma$ | 噪声放大器 |
| 显式解 | $X_t=\mu+(X_0-\mu)e^{-\theta t}+\sigma\int_0^t e^{-\theta(t-s)}\,dB_s$ |

显式解的三段式读法值得背诵：**起点遗产** $(X_0-\mu)e^{-\theta t}$ 按指数衰减到家门口；**噪声余温** $\sigma\int e^{-\theta(t-s)}dB_s$ 是历史踢踹经折扣后的剩余影响；两段之外别无长物。由它直接读出**自相关函数**——相隔 $\tau$ 的两个时刻共享多少记忆：

$$\rho(\tau)=e^{-\theta \tau}.$$

它还有一个亲切的换装写法：$\rho(\tau)=(1/2)^{\tau/\tau_{half}}$，其中

$$\tau_{half}=\frac{\ln 2}{\theta}$$

叫**半衰期**：每过一段 $\tau_{half}$，记忆就打个对折。速率常数 $\theta$ 与半衰期互为倒数桥接，一个是工程师语言、一个是药理学语言。

## 4. 分步例题

**问**：某传感器的零点漂移建模为 OU，$\theta=0.7$/$天，起点恰好落在 $\mu$ 上；刚被一次撞击推出了 2 个单位的偏差。问半衰期多久？隔两天后，还剩几分记忆？

1. $\tau_{half}=\ln 2/\theta=0.693/0.7\approx0.99$，约一天——偏差一天腰斩；
2. 两天正好两个半衰期：残留比例 $(1/2)^2=1/4$，即约剩 0.5 单位；
3. 若等一个月：$e^{-0.7\times30}\approx 7\times10^{-10}$ 量级——在仪器精度面前等于彻底失忆；
4. 工程决策由此一算便知：校准周期设在几个半衰期内才有意义，超过十个半衰期的争论纯属浪费会议时间。

## 5. 动手实验

先看力的长相：下面箭头场画的就是 $dX/dt=\theta(\mu-X)$ 这股回家的风（取 $\theta=0.7$、$\mu=3$）。所有箭头不再指着杂乱方向，而是齐刷刷指向同一条水平带——栏杆之外皆归途。

```viz
{
  "type": "slope-field",
  "title": "回归之风：dx/dt = 0.7 · (3 − x)",
  "expr": "0.7*(3-y)",
  "tmin": 0,
  "tmax": 6,
  "ymin": -1,
  "ymax": 7,
  "t0": 0,
  "y0": 6.8
}
```

再放真轨迹登场：烧掉一段初期暂态后，路径应长期夹在 $\mu\pm 2\sigma_{stat}$ 的窄带里自娱自乐；顺带实测一下"每隔一个半衰期相关性大约折半"这句合同是否兑现。

```python title="OU 轨道 + 安置带 + 记忆折半验证"
import random                     # 标准库随机模块；seed 固定保证可复现
import numpy as np                # 数值库：mean 平均、exp 指数、sqrt 开方
import matplotlib.pyplot as plt   # 绘图模块

random.seed(99)
theta, mu, sig = 0.5, 3.0, 0.6    # 回归速率 / 目标 / 噪声强度
dt, T_burn, T_run = 0.01, 8.0, 16.0   # 步长 / 先期烧入时长 / 正式观察时长
sd_stat = sig * np.sqrt(1.0 / (2 * theta))            # 平稳标准差理论值（上节课的公式）

def ou_step(x):
    return x + (-theta) * (x - mu) * dt + sig * random.gauss(0.0, 1.0) * (dt ** 0.5)

x = mu + 5.0                       # 故意从远高处出发，看弹簧如何押送回家
for _ in range(int(T_burn / dt)):
    x = ou_step(x)

xs, ys = [], []
for i in range(int(T_run / dt)):
    xs.append(T_burn + i * dt)
    ys.append(x)
    x = ou_step(x)

plt.plot(xs, ys, linewidth=0.7)
band = 2 * sd_stat                 # ± 两倍平稳标准差的安置带
plt.axhline(y=mu, color="black", linestyle="--")          # axhline：水平参考线
plt.axhline(y=mu + band, color="red", linestyle=":")
plt.axhline(y=mu - band, color="red", linestyle=":")
plt.xlabel("time")
plt.ylabel("x")
plt.show()

tail = ys[int(len(ys) * 0.5):]     # 后半段切片：靠近平稳态的部分才配作样本
print("实测后段标准差 =", round(float(np.std(tail)), 3), "  理论 =", round(float(sd_stat), 3))

step_half = int(round((np.log(2.0) / theta) / dt))        # 一个半衰期对应多少步（np.log 自然对数）
lags = range(step_half, int(len(tail) * 0.5), step_half)  # 在 1、2、3…个半衰期处抽查自相关
for lag in lags:
    a, b = np.array(tail[:-lag]), np.array(tail[lag:])
    rho = float(np.mean((a - a.mean()) * (b - b.mean())) / (a.std() * b.std()))
    half_n = lag // step_half
    print("滞后 ", half_n, " 个半衰期： 实测自相关 =", round(rho, 2), "  理论 =", 0.5 ** half_n)
```

读输出要点：后半段的标准差与理论值 $0.6$ 贴得很近；自相关各行里"实测"列围绕"理论"列抖动、整体按对折节奏下滑——弹簧与醉汉的分工一览无余。数字逐行会有些上下浮动，这是抽样的天然呼吸，加大 `T_run` 它们就会贴得更紧。

## 6. 常见误区

:::warning[常见误区]

- **"每天少掉固定的一截，所以也差不多是指数衰减"** —— 完全不同：OU 是乘性折损（按当前存量打折），加性折扣会把尾巴拖成一条慵懒直线，数量级都能错开好几倍。"折半"说的是比例，不是定量口粮。
- **"既然必有回归，价格离均值越远就越是买点"** —— 经典杠杆陷阱。$\theta$ 保证统计意义上回家，却不担保在你的资金耗尽之前到家；均值回归策略死于"等等就回来"的比例从不稀奇。
- **"记忆折半讲的是数值本身也减半"** —— 分清对象：半衰期刻画的是**相关性**（两组未来值的联动程度）随间隔衰减，而不是过程取值的大小缩水。轨道本身依旧在 $\pm$ 带内活蹦乱跳。

:::

## 7. 练习

传感器科室要给校准排班。初始代码有两处概念事故：把指数回家错写成"每天扣一口固定粮"，以及相关系数的幂次只肯折一次。修好全部检查：

```exercise
# @title: 校准倒计时与记忆存折
# @check: 5
# @check: 2
# @check: 0.125
# @hint: 回家是乘性折半——每次拿当前值除以 2；相关折 n 个半衰期就是 0.5 的 n 次方。
def days_to_calibrate(gap, tol):
    # 从偏差 gap 出发，每过一个半衰期偏差折半，问几天后 ≤ tol？（天数取整数）
    count = 0
    g = gap
    for _ in range(60):
        if g <= tol:
            break
        g = g - tol      # ← 加性折扣：回家的方式错了
        count += 1
    return count

def corr_after(n):
    return 0.5           # ← 只记得折一次

print(days_to_calibrate(2.0, 0.1))
print(days_to_calibrate(3.0, 0.75))
print(corr_after(3))
```

<details>
<summary>点开查看逐步解答</summary>

```python
def days_to_calibrate(gap, tol):
    count = 0
    g = gap
    for _ in range(60):
        if g <= tol:
            break
        g = g / 2       # 乘性折半：OU 的正确回家姿势
        count += 1
    return count

def corr_after(n):
    return 0.5 ** n     # n 个半衰期 = 连续打 n 对折

print(days_to_calibrate(2.0, 0.1))    # 2→1→0.5→0.25→0.125→0.0625 共 5 天
print(days_to_calibrate(3.0, 0.75))   # 3→1.5→0.75（≤ tol 即停）共 2 天
print(corr_after(3))                  # 0.125
```

两条路都走一遍就能看出加性版的破产之处：它第二问给出的答案是 $3$ 天，而且偏差越小擦得越吃力——最后一段永远差着一口气。乘性版五步之内干净利落，这正是"指数衰减碾压一切直线方案"的最小演示。

</details>

```quiz
把回归速率 θ 提高到原来的四倍，OU 过程的半衰期和平稳云宽分别怎么变？
- 都变成原来的四倍
- 半衰期变为四分之一，云宽缩为原来的一半 [*]
- 半衰期变为四分之一，云宽不变
? 半衰期 = ln2/θ 与 θ 成反比；云宽 = σ/√(2θ) 与 √θ 成反比。劲度加倍收益打的还是对折的折扣——两个指标共用同一根旋钮，敏感度却不同档。
```

```quiz
两只同型号的传感器，甲已连续工作一天、乙刚开机校准完毕。对「甲明天的漂移量」而言，谁更有资格发言？
- 信息更多的一方当然是甲，昨天的具体读数很关键
- 都一样：OU 的平稳分布与初始状态无关，明天早晨的期望位置都是 μ [*]
- 取决于哪只更贵
? 一天（约半个到一个半衰期）后乙的开机偏差已衰减大半，甲的历史在相关性视角下几乎不含增量信息——不过若间隔远小于半衰期，答案反过来，初值信息十分金贵。思考题留给你：这个临界时长取多少？
```

## 8. 选读证明：显式解与那条指数记忆

<details>
<summary>选读：一根积分因子驯服整条方程</summary>

第 22 章对付线性 ODE 的老兵器——积分因子——原样适用。把方程整理为 $dX+\theta X\,dt=\theta\mu\,dt+\sigma\,dB$，两侧同乘 $e^{\theta t}$：

$$d\bigl(e^{\theta t}X_t\bigr)=\theta\mu\,e^{\theta t}\,dt+\sigma\,e^{\theta t}\,dB_t,$$

从 $0$ 积到 $t$ 并移项：

$$X_t=\mu+(X_0-\mu)\,e^{-\theta t}+\sigma\int_0^t e^{-\theta(t-s)}\,dB_s .$$

三项各司其职：初值遗产指数还乡，噪声支流按时效折旧。要自相关的证明也只要两口气：令 $Y_t=X_t-\mu$（纯涨落），当离初值足够远后只剩噪声余温项

$$Y_t=\sigma\int_{-\infty}^{t}e^{-\theta(t-s)}\,dB_s .$$

利用 Itō 等距算方差 $\operatorname{E}Y_t^2=\sigma^{2}\!\int_0^\infty e^{-2\theta u}\,du=\sigma^{2}/(2\theta)$——平稳云宽就在手上了；再把两时刻写成同一噪声流的两个加权窗口，交叠积分给出

$$\operatorname{E}[Y_{t}Y_{t+\tau}]=\frac{\sigma^{2}}{2\theta}\,e^{-\theta \tau},$$

于是 $\rho(\tau)=e^{-\theta\tau}$。半衰期、安置带宽窄、记忆折旧——三样家当在同一页账本上互相盖章，谁是新添的解释也无须多言：它们全是二次变差账本的远房子孙。

</details>

## 9. 下一站

弹簧与醉汉谢幕之后，正史还剩最后一件镇宅之宝——[测度变换与鞅表示](./95-girsanov-martingale.md)：挂出一张汇率表，把漂移整段换出路径之外，为金融数学开出风险中性定价的入口。
