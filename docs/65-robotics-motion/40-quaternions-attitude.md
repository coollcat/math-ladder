---
title: 四元数选讲：免奇异的姿态语言
lesson_id: robotics-motion/quaternions-attitude
prereqs:
  - robotics-motion/pose-frames
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - quaternion
  - gimbal-lock
  - slerp
applications:
  - drone-attitude
  - game-engine
  - spacecraft-attitude
exits:
  - robotics-motion/inverse-kinematics
---

# 四元数选讲：免奇异的姿态语言

## 1. 从一个场景开始

1969 年，阿波罗 11 号的登月舱里突然响起警报：惯导系统的三个陀螺框架眼看要排成一平面，姿态解算眼看要丢掉一个自由度。地面控制中心紧急计算了补救机动——这不是故障，而是欧拉角的天生缺陷：**万向节死锁**（gimbal lock）。

今天的无人机翻滚、游戏引擎的镜头、火箭的姿态控制器，几乎都换了一种语言记姿态：**四元数**——四个数，没有死锁。本课只讲"怎么用"，代数证明点到为止。

## 2. 直觉解释

欧拉角用三个角 $(\psi,\theta,\phi)$ 依次转三次。问题出在"依次"：第二个角转到 $90^\circ$ 时，第一根轴和第三根轴恰好转到同一方向——三个角突然只有两个管用，第三个角怎么转都在原地打转。三个角度会打架。

四元数的思路干脆换掉记法：一次旋转由"**转多少**"和"**绕哪根轴**"两件事决定。用四个数打包：

- 一个数管"转多少"：$w=\cos\frac{\theta}{2}$；
- 三个数管"绕哪根轴"：$(x,y,z)=\vec n\,\sin\frac{\theta}{2}$，其中 $\vec n$ 是单位转轴。

注意那个刺眼的**半角**——这是四元数最反直觉的设定，也是它免于死锁的伏笔。平面绕 $z$ 轴的特例最上镜：转轴固定，四件套只剩 $(w,z)$ 两个数在动，而它们恰好住在一个单位圆上——第 7 章的单位圆直接换了个工位重新上岗。

## 3. 正式定义

**单位四元数**：$q=(w,x,y,z)$，满足

$$w^2+x^2+y^2+z^2=1$$

**轴角 → 四元数**：转角 $\theta$、单位转轴 $\vec n=(n_x,n_y,n_z)$，则

$$q=\left(\cos\tfrac{\theta}{2},\ n_x\sin\tfrac{\theta}{2},\ n_y\sin\tfrac{\theta}{2},\ n_z\sin\tfrac{\theta}{2}\right)$$

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $w$ | 标量部 | $\cos\frac{\theta}{2}$，管"转多少" |
| $(x,y,z)$ | 向量部 | 转轴方向乘 $\sin\frac{\theta}{2}$，管"绕哪转" |
| 单位约束 | — | 四个数只有 3 个自由度，恰够描述姿态 |
| $q$ 与 $-q$ | 双覆盖 | 代表**同一个**旋转（选读） |

**为什么免奇异**：任何姿态都能写出四元数——转轴永远存在（旋转总绕着某根轴），单位圆/球上没有"卡死"的洞。欧拉角的死锁是"三个依次的转动"这个记法自带的，换记法即消失。旋转**复合**时四元数按专门的乘法规则相乘（平面特例恰是复数乘法），**插值**有 slerp（球面线性插值），都比欧拉角直接好用。

## 4. 分步例题

**例**：平面绕 $z$ 轴转 $90^\circ$，写出四元数；再把两个 $90^\circ$ 复合。

1. 转轴 $\vec n=(0,0,1)$，半角 $45^\circ$；
2. 查单位圆：$\cos45^\circ=\sin45^\circ=\frac{\sqrt2}{2}$；
3. 所以 $q_{90^\circ}=\left(\frac{\sqrt2}{2},\ 0,\ 0,\ \frac{\sqrt2}{2}\right)$；
4. 复合两个 $90^\circ$：平面情形四元数乘法就是复数乘法 $(w_1+z_1\,i)(w_2+z_2\,i)$，角度直接相加得 $180^\circ$，即 $q=(0,0,0,1)$；
5. 复查半角直觉：总转角从 $90^\circ$ 走到 $180^\circ$，$w$ 从 $\frac{\sqrt2}{2}$ 走到 $\cos90^\circ=0$——$w$ 落地，转满半圈。

## 5. 动手实验

先在单位圆上热身：拖着那个点转一圈，盯住 cos 与 sin 的读数——四元数的 $(w,z)$ 就住在这样的圆上，只是坐标换成了"半角"：

```viz
{
  "type": "unitcircle",
  "title": "四件套中的 (w, z) 住在一个单位圆上"
}
```

### 实验 1（python）：构造与复合

```python title="平面旋转四元数：半角构造 + 复数式复合"
import math                                     # 三角函数与角度换算的标准库

# sliders: deg=90 [0:360:15]

th = math.radians(deg)                          # radians 把度翻译成弧度——cos/sin 只认弧度
w = math.cos(th / 2)                            # 标量部：转角的一半取余弦
z = math.sin(th / 2)                            # z 分量：转角的一半取正弦（绕 z 轴）
print(f"旋转 {deg}° 的四元数 = ({round(w, 4)}, 0, 0, {round(z, 4)})")

pw, pz = math.cos(math.pi / 4), math.sin(math.pi / 4)   # 再叠一个 90°：半角 45° 的 (w, z)
wc = w * pw - z * pz                            # 平面四元数乘法＝复数乘法：实部=积减交叉积
zc = w * pz + z * pw                            # 虚部=两项相加，角度随之相加
print(f"再叠 90° 后复合 = ({round(wc, 4)}, 0, 0, {round(zc, 4)})")
total = math.degrees(2 * math.atan2(zc, wc))    # atan2(对边, 邻边)：从 (w,z) 反读出转角
print(f"复合后总转角   = {round(total, 1)}°")
```

拖动滑块把 `deg` 从 0 拉到 360：单个四元数的 $w$ 走半圈（半角！），复合总角却老老实实按全角累加。角度过 $360^\circ$ 后，四元数回到起点——转一圈"物极必反"。

### 实验 2（python）：欧拉角翻车前的一瞥

```python title="俯仰角逼近 90°：第三根轴开始漂移"
import math                                     # 浮窗同一命名空间，math 已就位

# sliders: pitch=89 [-90:90:1]

p = math.radians(pitch)                         # 俯仰角转弧度
ax = math.cos(p)                                # 滚转轴在水平面的分量：随俯仰被"压扁"
print(f"俯仰 {pitch}° 时，滚转轴水平分量 = {round(ax, 4)}")

for q in [89, 90, 91]:                          # 小步逼近死锁角
    c = math.cos(math.radians(q))               # 逐个角的水平分量
    print(f"pitch={q}° → 分量 {round(c, 4)}")
```

俯仰从 $89^\circ$ 走到 $91^\circ$，水平分量从正穿到负——第三根轴的指向在这一度之间**翻面**。翻面的瞬间（恰 $90^\circ$）分量归零，滚转与偏航失去区分：这就是死锁的数学嘴脸，而四元数的四个数全程平滑，毫无戏剧。

### 快问快答

```quiz
单位四元数 q 和它的相反数 -q，代表什么？
- 两个方向相反的旋转
- 同一个旋转的两张票根 [*]
- q 无效，只有 -q 是合法四元数
? 单位四元数生活在一个四维球面上，q 与 -q 是球的对径两点，对应同一个旋转。插值时挑路程短的那条弧即可。
```

:::warning[常见误区]

**误区一**："你以为四元数是四个角度。" 四件套里只有 $w,\,(x,y,z)$ 共同编码"半角 + 一根轴"，且满足平方和为 1——真正自由的只有 3 个数，恰好对应姿态的 3 个自由度。

**误区二**："你以为免奇异等于四元数没有坏处。" 它只是没有死锁；代价是可读性差（人读不懂四个数）、以及 $q$ 与 $-q$ 的双覆盖要在插值和判等时小心处理。

**误区三**："你以为用了四元数就该把欧拉角全烧掉。" 陀螺仪硬件吐欧拉角、机械限位用角度描述、调试界面靠人眼读数——工程上永远在两套语言间换汇，四元数只是内部硬通货。

:::

## 6. 练习

**练习 1**：初始代码把**全角**当成了四元数的角，能跑但复合结果直接错成"转了半圈"。修成半角版本：

```exercise
# @title: 练习：半角才是四元数的行规
# @check: 90° 的四元数 = (0.7071, 0, 0, 0.7071)
# @check: 两个 90° 复合 = (0.0, 0, 0, 1.0)
# @hint: 四元数吃的是转角的一半：构造时用 th/2；复合时角度才会"加回"全角。
import math                                     # 三角函数标准库

deg = 90
th = math.radians(deg)                          # 度转弧度

def qz(angle_rad):                              # 自定义函数：绕 z 轴的四元数 (w, z)
    w = math.cos(angle_rad)                     # ← 错在这：吃下了全角，行规是半角
    z = math.sin(angle_rad)                     # ← 这里同病
    return w, z

w1, z1 = qz(th)
w2, z2 = qz(th)
wc = w1 * w2 - z1 * z2                          # 平面复合＝复数乘法
zc = w1 * z2 + z1 * w2
print(f"90° 的四元数 = ({round(w1, 4)}, 0, 0, {round(z1, 4)})")
print(f"两个 90° 复合 = ({round(wc, 4)}, 0, 0, {round(zc, 4)})")
```

**练习 2**：证明平面特例里"四元数乘法 = 角度相加"。提示：把 $(w,z)$ 认作 $\cos\alpha+i\sin\alpha$，用两角和公式展开乘积。

<details>
<summary>点开查看逐步解答</summary>

设 $q_a=(\cos\alpha,\sin\alpha)$、$q_b=(\cos\beta,\sin\beta)$（把 $z$ 分量记作虚部），按复数乘法：

$$q_a q_b=(\cos\alpha\cos\beta-\sin\alpha\sin\beta,\ \cos\alpha\sin\beta+\sin\alpha\cos\beta)$$

用两角和公式 $\cos(\alpha+\beta)=\cos\alpha\cos\beta-\sin\alpha\sin\beta$、$\sin(\alpha+\beta)=\cos\alpha\sin\beta+\sin\alpha\cos\beta$，乘积恰为 $(\cos(\alpha+\beta),\ \sin(\alpha+\beta))$——半角 $\alpha+\beta=\frac{\theta_1}{2}+\frac{\theta_2}{2}=\frac{\theta_1+\theta_2}{2}$ 正是新转角的半角。所以复合两个四元数时全角直接相加，与实验 1 的数值严丝合缝。
</details>

## 7. 选读：为什么三个数一定不够

<details>
<summary>选读 · 奇异是拓扑的天罚</summary>

把三维姿态全体看成一个空间（数学上叫 SO(3)，是个三维流形）。要给整个空间造一套"三个数"的全局坐标，等于用一块平面的地图包住整个地球——必然有接缝。欧拉角的接缝就在 $\theta=\pm90^\circ$：三根轴共线，雅可比行列式归零，微分结构当场塌方。

四元数用四维球面 $S^3$ 包住 SO(3)，对径两点（$q$ 与 $-q$）贴同一个旋转——多花一个数买断了接缝。这不是巧合而是拓扑定理：低一维的坐标必出奇点，多一维的覆盖可以无奇。同一笔账在机器人里反复出现：宁可多带一个冗余量，也不在奇异处翻车。

</details>

## 8. 下一站

姿态语言齐备，但控制器还有个更急的问题：目标点已定，关节该转多少度？正解唯一、逆解多解，还常常够不着——下一课从手到肩反着解方程。

→ [逆运动学与数值求根](./50-inverse-kinematics.md)
