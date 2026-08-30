---
title: 天线方向图与增益
lesson_id: radio/antenna-gain
prereqs:
  - radio/radio-wave
  - trig/unit-circle
volume: 5
layer: L9
track:
  - scientific-computing
  - optimization-control
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - antenna-pattern
  - antenna-gain
  - directivity
applications:
  - wi-fi-router
  - satellite-dish
exits:
  - radio/friis-budget
---

# 天线方向图与增益

## 1. 从一个场景开始

路由器厂商宣传"高增益天线，信号增强 5 倍"！听起来像功率被放大了。可天线是块没有电源的金属——它凭什么放大信号？

它没有放大，它只是**把能量从不需要的方向挪到了需要的方向**：天花板和地板省下来的那部分，全部补贴给了水平前方。这一课教你读懂天线的"体检报告"（方向图），并把"5 倍""dBi"这些行话翻译成几何。

## 2. 直觉解释

对比两盏灯：

- **裸灯泡**向四面八方均匀发光——这是**各向同性辐射器**，物理学家理想出来的"完美球源"，现实中造不出来，但它是最方便的参照物；
- **手电筒**把同样的光聚成一束——正前方亮了几十倍，代价是背后一片漆黑。

天线就是无线电世界的手电筒。描述"聚光形状"的曲线叫**方向图**；某个方向比裸灯泡亮多少倍，取对数后就是**增益**，单位 dBi（i = 相对 isotropic）。

关键直觉：增益是**几何再分配**的账本，能量守恒一分没赚。方向图越窄，峰值增益越高——"看得远"和"照得宽"永远在跷跷板两端。

## 3. 正式定义

**方向图** $P(\theta)$：辐射强度随方向角 $\theta$ 的分布，习惯归一化成最大值为 1。

**方向性系数** $D$：最亮方向的辐射强度与全空间平均辐射强度之比：

$$D = \frac{P_{\max}}{\bar{P}}$$

**增益**（相对各向同性天线）：计入天线自身损耗后的实用版本，用分贝表示：

$$G\text{(dBi)} = 10 \log_{10}\left(\frac{P_{\text{该方向}}}{P_{\text{同功率各向同性}}}\right)$$

| 概念 | 记号 | 一句话 |
| --- | --- | --- |
| 各向同性 | 球形方向图 | 参照物，$D=1$ 即 0 dBi |
| 半功率波束宽度 | HPBW | 功率降到一半的两个方向夹角 |
| 分贝换算 | ×2 ↔ +3 dB | ×10 ↔ +10 dB，乘法变加法 |

常用速查：3 dBi ≈ 2 倍、6 dBi ≈ 4 倍、10 dBi ≈ 10 倍、13 dBi ≈ 20 倍、20 dBi ≈ 100 倍。

## 4. 分步例题

**例**：一根 13 dBi 的八木天线朝基站方向发射，等效于把发射功率"放大"了多少倍？

1. 拆解分贝数：$13 = 10 + 3$；
2. 逐段换算：+10 dB 是 10 倍，再 +3 dB 是 2 倍；
3. 相乘：$10 \times 2 = 20$ 倍；
4. 验算：$10^{13/10} = 10^{1.3} \approx 19.95 \approx 20$ ✓。

也就是说，路由器只需输出 0.5 W，主方向上效果等同裸天线喷出 10 W——但背后方向几乎是静音区。法律管的是"最响的方向"（EIRP），这正是增益要登记进法规的原因。

## 5. 动手实验

### 实验 1（viz）：波束越窄，峰越尖

```viz
{
  "type": "plot",
  "title": "天线方向图 P(θ)=(|cosθ|)^n：n 越大波束越窄",
  "expr": "(abs(cos(x)))^n",
  "label": "P(θ)",
  "xmin": -3.14159,
  "xmax": 3.14159,
  "sliders": [
    { "name": "n", "min": 1, "max": 12, "step": 1, "value": 1 }
  ]
}
```

怎么玩：横轴是方向角 θ（弧度，中间是 0° 主方向）。把 n 从 1 拉到 12：每个瓣都从"胖馒头"挤成"针尖"。n=12 时主峰两侧功率跌到一半的位置约在 ±19°（±20° 上下）——能量去哪了？看两侧 ±90°：那里趴到零；但注意背后 ±180° 处还立着一个与主瓣同高的背瓣——这条最简公式没有压背瓣，真实的定向天线会把背瓣设计到接近零。

### 实验 2（python）：亲手积分算出方向性系数

方向性系数可以由方向图"称重"得到：对绕轴旋转对称的天线（像 Wi-Fi 棒状天线），有公式

$$D = \frac{2}{\displaystyle\int_0^{\pi} P(\theta)\sin\theta \, d\theta}$$

我们用第 14 章的黎曼和老手艺把这个积分硬算出来：

```python title="数值积分求 sin^n 方向图的方向性"
import math

# sliders: n=2 [1:8:1]

steps = 10000
total = 0.0
for k in range(steps):
    th = math.pi * k / steps            # θ 从 0 到 π 均匀撒点
    p = (abs(math.sin(th))) ** n        # 归一化功率方向图
    total = total + p * math.sin(th) * (math.pi / steps)   # 黎曼和：矩形宽×高累加

D = 2 / total                            # 绕轴对称天线的方向性公式
# math.log10(x)：求以 10 为底的对数；这里把功率倍率 D 压成更好读的 dBi 刻度
dbi = 10 * math.log10(D)
print(f"P(θ)=sin^{n}(θ): D={round(D, 3)}, G={round(dbi, 2)} dBi")
```

怎么玩：默认 n=2 时输出 D=1.5、约 1.76 dBi——这正是教科书里"短偶极子天线"的标准答案，我们的暴力积分复现了它。把 n 拧大，看 D 怎么跟着波束变窄而飙升。

### 实验 3（python）：滑块观察波束与增益的跷跷板

```python title="方向图与增益联动实验"
import math
import matplotlib.pyplot as plt

# sliders: n=2 [1:8:1], theta_deg=30 [0:90:5]

th = math.radians(theta_deg)             # radians：度转弧度（三角函数只认弧度）
p_main = (abs(math.sin(th))) ** n        # 该方向的归一化辐射功率

steps = 2000                             # 积分步数够用即可
total = 0.0
for k in range(steps):
    t = math.pi * k / steps
    total = total + (abs(math.sin(t))) ** n * math.sin(t) * (math.pi / steps)
D = 2 / total
gain_db = round(10 * math.log10(D), 2)

angles = []
powers = []
for i in range(181):
    a = math.radians(i - 90)
    angles.append(a)
    powers.append((abs(math.sin(a))) ** n)

plt.plot(angles, powers, label=f"pattern n={n}")
plt.axvline(th, color="tomato", linestyle="--")   # 你选的观察方向
plt.legend()
plt.title(f"D={round(D, 3)} ({gain_db} dBi), P(theta)={round(p_main, 3)}")
plt.grid(True)
```

怎么玩：拖 theta_deg 观察红线扫过波束——偏离主向 30° 时功率掉到多少？再把 n 拧大：波束收窄、增益读数上涨，但红线上能"蹭到"的角度范围也缩水了。

### 快问快答

```quiz
把天线从 2 dBi 换成 7 dBi，发射机功率一点没变，手机收到的信号为什么变强了？
- 天线内部的小放大器开始工作了
- 能量从上下方向重新分配到了水平方向 [*]
- 7 dBi 表示功率变成了 7 倍
? 天线无源不供电，不可能凭空加能量。7−2=5 dB 约合 3 倍多，来源是把原本洒向天空和地面的能量聚拢到水平面。
```

:::warning[常见误区]

**误区一**："你以为增益是放大器。" 天线是纯被动金属件，能量守恒铁面无私；增益的全部含义是**方向性再分配**，主方向多一倍，别处必然少一块。

**误区二**："你以为 dBi 和 dBd 是同一个单位。" dBd 以半波偶极子为参照，而偶极子本身有 2.15 dBi。商家若写"增益 5 dBd"，换算成 dBi 要加 2.15——数字游戏就藏在这两个字母之间。

**误区三**："你以为天线增益越高越好。" 高增益波束窄，覆盖变成一条走廊；家里想照亮整套户型，宁可要低增益的全向"灯泡"。天线选型是覆盖形状设计，不是参数军备竞赛。

:::

## 6. 练习

**练习 1**：把 17 dBi 换成倍数并四舍五入到整数。代码能跑但结果离谱，修好那个指数运算：

```exercise
# @title: 练习：17 dBi 等于多少倍
# @check: 50
# @hint: 倍数 = 10^(dB/10)；检查现在是不是把除以 10 写成了乘以 10
gain_dbi = 17

times = 10 ** (gain_dbi * 10)    # ← 问题在这：dB 应该除以 10 再当指数
print(round(times))
```

改对后输出 50：17 dB = 10 dB + 7 dB ≈ 10 倍 × 5 倍 = 50 倍，与速算法互相印证。

**练习 2**：某定向天线 HPBW 为 60°。粗略估算它把能量集中到的立体角约为全空间的几分之一？（提示：球面共 360°×180° 的"经纬格"感）

<details>
<summary>点开查看逐步解答</summary>

工程速算：波束立体角 ≈ 水平角 × 垂直角。设方位面也是 60°，则波束占 $60\times60=3600$ 平方度；全球面积 $4\pi$ 球面度 ≈ 41253 平方度。占比 ≈ $3600/41253 \approx 8.7\%$，即大约 **1/11**。上限直觉：集中到 1/11 空间，理想无损时增益不超过约 11 倍（≈10.4 dBi）。实际天线有旁瓣漏损，会更小。
</details>

**练习 3**：两根天线 A（增益 15 dBi，波束 30°）与 B（增益 8 dBi，全向）做"仓库全覆盖"，谁更合适？说出权衡。

<details>
<summary>点开查看逐步解答</summary>

仓库需要照亮每个角落而不是一条走廊：B 更合适。A 的 15 dBi（约 32 倍）只在窄锥内兑现，锥外反而比 B 弱。工程折中常用多根低增益天线分布式部署——这正是后面蜂窝组网"小区裂化"思想的家庭版预演。
</details>

## 7. 边界与适用条件

- 实验 2 的公式 $D = 2/\int_0^\pi P\sin\theta\,d\theta$ 只对**绕轴旋转对称**（面包圈形）方向图成立；一般天线要在球面上做二维积分，思路相同、权重更复杂。
- 增益 G 与方向性 D 的区别是损耗：$G = \eta D$（效率 η≤1）；本课实验假设 η=1。
- 方向图是远场概念：距离需远大于 $2D^2/\lambda$（D 为天线口径），近场里"方向"本身还没成形。

## 8. 选读：短偶极子为什么是 sin² 图形

<details>
<summary>选读 · 从电流元推出经典方向图</summary>

一根长度远小于波长的电流元，其辐射场正比于 $\sin\theta$——沿轴方向（θ=0）完全不出力，垂直方向最强。功率正比于场强的平方，所以功率方向图是 $\sin^2\theta$。代入实验 2 的公式：$\int_0^\pi \sin^3\theta\, d\theta = 4/3$，于是 $D = 2/(4/3) = 1.5$，即 1.76 dBi。

这个其貌不扬的 1.76 dBi 是整个天线界的"一米尺"：Wi-Fi 路由器标 3~5 dBi，说明它在偶极子基础上又做了些整形；卫星碟动辄 35 dBi，则是把抛物面口径上的能量几乎全部聚焦到一个针尖方向。孔径越大、波长越短，可实现的增益上限越高——$D \approx 4\pi A_{\text{eff}}/\lambda^2$，这句公式留个印象，链路预算课会用到它的精神。

</details>

## 9. 下一站

有了频率、波长、增益三件套，可以回答那个终极问题：**隔这么远，还剩多少信号？** Friis 公式将把传播变成一道干净的乘法题——再用 dB 把它变成一道更干净的加法题。

→ [Friis 公式与链路预算](./30-friis-budget.md)
