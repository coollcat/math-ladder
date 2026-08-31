---
title: 四连杆机构运动学
lesson_id: mechanical-engineering/four-bar
prereqs:
  - mechanical-engineering/mechanism-dof
  - robotics-motion/forward-kinematics
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L9
track:
  - geometry-space
  - analysis-change
stage: university-core
difficulty: 3
introduces_concepts:
  - four-bar-linkage
  - grashof-condition
  - transmission-angle
  - dead-center
  - coupler-curve
applications:
  - linkage-synthesis
  - mechanism-design
  - wiper-and-hinge-design
exits:
  - engineering
---

# 四连杆机构运动学

## 1. 从一个场景开始

汽车雨刮器的电机一刻不停地朝一个方向转，刮片却只在一百多度里来回摆。中间那几根钢片把「整周转」翻译成「来回摆」，还顺手把电机的小力矩放大成了刮得动雨水的力。

可这四根杆只要尺寸差上几毫米，故事的结局就完全两样：要么电机带着它转得欢快，要么转到某个角度**彻底卡死**——电机再大也推不过去。

决定命运的不是材料，不是电机功率，而是四个长度之间的一个不等式。

## 2. 直觉解释

把四连杆想成一条**四节的绳圈**。最短的一节和最长的一节如果能「凑得拢」（它俩的长度和不超过另外两节之和），这条绳圈就能被拉成一个可以整周转动的形状；凑不拢，它就只能在某个角度区间里来回摆，转到极限位置就撞墙。

第二个画面更重要，也更反直觉。想象你用一根杆去推另一根杆：你大概以为推力越大，传过去的转动效果越强。其实真正决定「传得动多少力」的是**两根杆的夹角**。垂直（90°）时，你推的力全部用来让对方转；几乎平行（0° 或 180°）时，你的力几乎全部变成沿杆的拉力，被铰链吃掉，对方一点也转不动。

这个夹角叫**传动角**。它等于 0° 或 180° 的两个位置叫**死点**——不是「力不够」，而是「力矩臂为零」。

## 3. 正式定义

**四连杆**：机架 $d$（固定）、输入杆 $a$、连杆 $b$、输出杆 $c$，用四个转动副首尾相接。

**闭环矢量方程**（机构学的基本方程，两边是同一个点 C 的两种走法）：

$$a e^{i\theta_2} + b e^{i\theta_3} = d + c e^{i\theta_4}$$

写成分量：

$$a\cos\theta_2 + b\cos\theta_3 = d + c\cos\theta_4$$
$$a\sin\theta_2 + b\sin\theta_3 = c\sin\theta_4$$

**位置解**：给定 $\theta_2$，先算出 $B=(a\cos\theta_2,\ a\sin\theta_2)$，再求「以 $B$ 为心、半径 $b$」与「以 $D$ 为心、半径 $c$」两个圆的交点，取交点得 $C$。

**Grashof 判据（曲柄存在条件）**：把四杆长度排序为 $s \le p \le q \le l$，则存在整周回转杆的充要条件是

$$s + l \le p + q$$

**传动角 $\mu$**：连杆 $BC$ 与输出杆 $CD$ 的夹角。在三角形 $BCD$ 里用余弦定理最省事：

$$\mu = \arccos\frac{b^2 + c^2 - |\overline{BD}|^2}{2bc}$$

**死点**：$\mu = 0^\circ$ 或 $180^\circ$（连杆与输出杆共线）。此时速度方程的系数行列式为零，$\omega_4$ 无解——几何奇异，与力大小无关。

**耦合曲线**：连杆平面上任一点（不在铰链上）在一整周里画出的封闭曲线。它是连杆机构能画出复杂轨迹的秘密。

| 符号 | 名字 | 含义 |
| --- | --- | --- |
| $a$ | 输入杆（曲柄） | 主动件，转角 $\theta_2$ |
| $b$ | 连杆 | 传力构件，耦合点挂在它身上 |
| $c$ | 输出杆（摇杆） | 从动件，转角 $\theta_4$ |
| $d$ | 机架 | 固定不动，$A=(0,0)$，$D=(d,0)$ |
| $\mu$ | 传动角 | 越接近 90° 传力越好；工程上要求 $\mu_{\min} \ge 40^\circ$ |
| $s,l,p,q$ | 排序后的杆长 | Grashof 判据的四个角色 |

## 4. 分步例题

**例**：$a=1.0$、$b=2.6$、$c=2.2$、$d=2.8$ m，取开式装配分支。求：(a) 能否整周回转；(b) $\theta_2 = 90^\circ$ 时的 $C$ 点、$\theta_4$ 与传动角；(c) 整周最小传动角与输出杆摆角。

1. **Grashof**：排序得 $1.0,\ 2.2,\ 2.6,\ 2.8$，于是 $s+l = 1.0+2.8 = 3.80$，$p+q = 2.2+2.6 = 4.80$。$3.80 \le 4.80$ 成立，且最短杆就是输入杆 $a$ → **曲柄摇杆**：输入能整周转，输出来回摆；
2. **B 点**：$B = (1.0\cos 90^\circ,\ 1.0\sin 90^\circ) = (0,\ 1.000)$；
3. **对角线**：$|\overline{BD}| = \sqrt{(2.8-0)^2 + (0-1)^2} = 2.973$ m；
4. **传动角**：$\mu = \arccos\dfrac{2.6^2 + 2.2^2 - 2.973^2}{2 \times 2.6 \times 2.2} = \arccos\dfrac{2.76}{11.44} = \arccos(0.2413) = 76.0^\circ$；
5. **C 点**：两圆交点公式给出 $C = (1.076,\ -1.367)$，于是 $\theta_4 = \operatorname{atan2}(-1.367,\ 1.076-2.8) = -141.6^\circ$；
6. **扫一圈输入角**：$\mu$ 在 $\theta_2 = 0^\circ$（曲柄与机架拉直共线）处最小，$\mu_{\min} = 43.0^\circ$；$\theta_4$ 在 $-145.2^\circ \sim -88.7^\circ$ 之间摆动，**摆角 56.5°**；
7. **校核**：$\mu_{\min} = 43.0^\circ > 40^\circ$，传力可用；若把 $c$ 从 2.2 改到 3.4，$\mu_{\min}$ 会掉到 31.5°，低于 40° 的门槛，必须重新设计。

注意第 6 步的规律：**极值传动角总是出现在曲柄与机架共线的两个位置**。这是设计时的两个必查点，不用扫全周。

## 5. 动手实验

### 实验 1（lab）：拖滑块，看机构「变性格」

```lab
{
  "type": "four-bar",
  "title": "四连杆：Grashof 类型、传动角与耦合曲线",
  "a": 1.0, "b": 2.6, "c": 2.2, "d": 2.8, "theta": 1.0, "t": 0.5, "off": 0.35, "spd": 1, "branch": 1,
  "sliders": [
    { "name": "a", "label": "曲柄 a", "min": 0.3, "max": 3, "step": 0.05, "value": 1.0 },
    { "name": "b", "label": "连杆 b", "min": 0.5, "max": 4.5, "step": 0.05, "value": 2.6 },
    { "name": "c", "label": "摇杆 c", "min": 0.5, "max": 4.5, "step": 0.05, "value": 2.2 },
    { "name": "d", "label": "机架 d", "min": 0.5, "max": 5, "step": 0.05, "value": 2.8 },
    { "name": "theta", "label": "输入角 θ₂", "min": 0, "max": 6.283, "step": 0.01, "value": 1.0 },
    { "name": "t", "label": "耦合点位置 t", "min": 0, "max": 1.2, "step": 0.02, "value": 0.5 },
    { "name": "off", "label": "耦合点偏置", "min": -1.2, "max": 1.2, "step": 0.02, "value": 0.35 },
    { "name": "spd", "label": "转速", "min": 0.2, "max": 3, "step": 0.1, "value": 1 }
  ]
}
```

图上四样东西要看：

- **紫色虚线**是耦合曲线——连杆上那一点画出的轨迹。拖动 `t`（沿连杆的位置）和 `off`（垂直偏置），同一副杆能画出香蕉形、8 字形、月牙形；
- **C 点处的圆弧**标的就是传动角 $\mu$，绿色表示良好（$40^\circ \sim 140^\circ$），红色表示已经逼近死点；
- 读数里的 **Grashof 余量** $= (p+q)-(s+l)$，它越接近零，机构越接近「变性格」的临界；
- **开式/交叉分支**按钮切换的是同一个 $\theta_2$ 下两个装配解（两圆交点的两个解），物理上是两套不同的装配方式。

三件值得动手做的事：

- 把 `c` 从 2.2 慢慢拖到 4.0，盯住 $\mu$：它会在共线位置掉到 20° 左右，读数栏跳出「⚠ 传力恶化，接近死点」；
- 把 `d` 拖到 1.2、`b` 拖到 1.2（使 $s+l > p+q$），类型变成**双摇杆**，此时耦合曲线会**断开一段**——那一段输入角机构根本装不起来；
- 点开**交叉分支**再看一遍：同一个 $\theta_2$、同一组杆长，机构换了一副完全不同的姿态，耦合曲线也跟着变样。装配时选错分支，实物会跟图纸差得离谱——这也是图纸上必须标注装配分支的原因。

### 实验 2（python）：两圆交点就是全部答案

```python title="四连杆位置解与最小传动角"
import math                        # 数学库：cos / sin / sqrt / hypot / degrees / acos

a, b, c, d = 1.0, 2.6, 2.2, 2.8    # 曲柄 a、连杆 b、摇杆 c、机架 d（m）

def position(theta2, branch=1):
    """给定输入角，返回铰链点 B 与 C 的坐标；两圆不相交时返回 None"""
    B = (a * math.cos(theta2), a * math.sin(theta2))
    dx, dy = d - B[0], 0.0 - B[1]
    dd = math.hypot(dx, dy)
    if dd > b + c or dd < abs(b - c):
        return None                                  # 这个输入角下机构装配不上
    t = (b * b - c * c + dd * dd) / (2 * dd)         # 交点在连心线上的投影距离
    h = math.sqrt(max(b * b - t * t, 0.0))           # 交点到连心线的垂距
    ux, uy = dx / dd, dy / dd                        # 连心线单位向量
    mx, my = B[0] + t * ux, B[1] + t * uy            # 垂足
    C = (mx + branch * h * uy, my - branch * h * ux) # branch 选两个交点之一
    return B, C

def transmission_angle(B, C):
    """连杆 BC 与输出杆 CD 的夹角（角度制）"""
    v1 = (C[0] - B[0], C[1] - B[1])                  # 连杆方向
    v2 = (C[0] - d, C[1] - 0.0)                      # 输出杆方向（注意是 C − D）
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    n = math.hypot(v1[0], v1[1]) * math.hypot(v2[0], v2[1])
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / n))))

arr = sorted([a, b, c, d])
margin = arr[1] + arr[2] - arr[0] - arr[3]
print("Grashof:", "成立（余量 %.2f）" % margin if margin >= 0 else "不成立 → 双摇杆")

B, C = position(math.radians(90.0))
th4 = math.degrees(math.atan2(C[1], C[0] - d))
print("θ₂ = 90°: C = (%.3f, %.3f), θ₄ = %.1f°, μ = %.1f°" % (C[0], C[1], th4, transmission_angle(B, C)))

worst = (999.0, 0)
lo = hi = None
for i in range(0, 360, 5):
    r = position(math.radians(i))
    if r is None:
        continue                                     # 双摇杆时会跳过装不上的角度
    m = transmission_angle(r[0], r[1])
    if m < worst[0]:
        worst = (m, i)
    t4 = math.degrees(math.atan2(r[1][1], r[1][0] - d))
    lo = t4 if lo is None else min(lo, t4)
    hi = t4 if hi is None else max(hi, t4)
print("最小传动角 μmin = %.1f°（出现在 θ₂ = %d°）" % worst)
print("输出杆摆角 = %.1f°" % (hi - lo))
```

输出里最该记住的是最后两行：**$\mu_{\min} = 43.0^\circ$ 出现在 $\theta_2 = 0^\circ$**，也就是曲柄与机架共线的那一刻——此时连杆被「拉直」，传力最差。把循环步长从 5° 改成 1° 再跑，$\mu_{\min}$ 只变小数点后第二位：**极值确实落在共线位置，扫点只是把它找出来**，不是靠密采样凑出来的。

### 快问快答

```quiz
四根杆长分别为 1.0、2.2、2.6、2.8，最短杆是输入杆。这个机构属于哪一类，输出杆能整周转吗？
- 双摇杆：输入和输出都只能摆动
- 曲柄摇杆：输入能整周转，输出只能摆动 [*]
- 双曲柄：输入和输出都能整周转
? 最短杆与最长杆之和 1.0+2.8=3.80，小于其余两杆之和 2.2+2.6=4.80，Grashof 成立；又因最短杆是输入杆，所以它是曲柄摇杆。若最短杆是机架则是双曲柄，若是最短杆是连杆则谁都不能整周转。
```

:::warning[常见误区]

**误区一**：「四根杆能装上，电机就能带着它整周转。」
你以为装配成功就够了——其实「能装上」只说明**这一个位置**能拼起来，而 Grashof 不等式 $s+l \le p+q$ 决定的是**能否整周回转**。不满足时机构是双摇杆，会在某个输入角彻底无解（耦合曲线断开成几段），电机硬转会顶坏零件。

**误区二**：「死点嘛，换个大电机就冲过去了。」
你以为死点是力气问题——其实它是**几何奇异性**：$\mu \to 0^\circ$ 时输出杆的力矩臂趋于零，需要的力趋于无穷。真实机器的解法是**惯性**（缝纫机靠飞轮闯过去）、**错位**（多缸发动机各缸死点错开）或**加辅助杆**（蒸汽机车的双侧曲拐相差 90°），从来不是加大电机。

**误区三**：「传动角要设计成 90°。」
你以为 90° 是设计目标——其实 $\mu = 90^\circ$ 只是转过某个瞬时的**最佳点**，一转就过去了。真正的指标是**整周内的最小值** $\mu_{\min} \ge 40^\circ$（有冲击载荷时取 50°），而它必定出现在曲柄与机架共线的两个位置。

:::

## 6. 练习

**练习 1**：下面这段代码算最小传动角，结果偏大且不像共线位置出现。问题出在向量 $v_2$ 上，修好后输出应为 `最小传动角 μmin = 43.0°`：

```exercise
# @title: 练习：最小传动角算错了
# @check: 最小传动角 μmin = 43.0°
# @hint: 传动角是连杆 BC 与输出杆 CD 的夹角。代码里 v2 = C − (0, 0)，那是铰点 A 而不是 D。机架的另一端的坐标是 (d, 0)
import math                        # 数学库：cos / sin / hypot / degrees / acos

a, b, c, d = 1.0, 2.6, 2.2, 2.8

def position(theta2):
    B = (a * math.cos(theta2), a * math.sin(theta2))
    dx, dy = d - B[0], 0.0 - B[1]
    dd = math.hypot(dx, dy)
    if dd > b + c or dd < abs(b - c):
        return None
    t = (b * b - c * c + dd * dd) / (2 * dd)
    h = math.sqrt(max(b * b - t * t, 0.0))
    ux, uy = dx / dd, dy / dd
    mx, my = B[0] + t * ux, B[1] + t * uy
    return B, (mx + h * uy, my - h * ux)

def transmission_angle(B, C):
    v1 = (C[0] - B[0], C[1] - B[1])
    v2 = (C[0] - 0.0, C[1] - 0.0)   # ← 问题在这：应从 C 指向 D，而不是指向原点 A
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    n = math.hypot(v1[0], v1[1]) * math.hypot(v2[0], v2[1])
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / n))))

worst = (999.0, 0)
for i in range(0, 360, 5):
    r = position(math.radians(i))
    if r is None:
        continue
    m = transmission_angle(r[0], r[1])
    if m < worst[0]:
        worst = (m, i)
print("最小传动角 μmin = %.1f°" % worst[0])
```

**练习 2**：一台输送机要求输出杆摆角不小于 $60^\circ$，且 $\mu_{\min} \ge 40^\circ$。若取 $a = 0.8$ m、$d = 2.4$ m，请给出你调 $b$、$c$ 的思路。

<details>
<summary>点开查看逐步解答</summary>

1. **先保证能整周转**：$a=0.8$ 是最短杆，Grashof 要求 $0.8 + l \le p + q$。取 $l = d = 2.4$（机架最长），则要求 $p + q \ge 3.2$；
2. **摆角由 $c$ 控制**：曲柄与机架共线时，输出杆处于两个极限位置，此时 $|BD|$ 分别等于 $|d-a|=1.6$ 与 $d+a=3.2$。由 $\mu = \arccos\frac{b^2+c^2-|BD|^2}{2bc}$ 可反解两个 $\theta_4$，摆角随 $c$ 减小而增大；
3. **试着取** $b = 2.0$、$c = 1.4$：$p+q = 2.0+1.4 = 3.4 \ge 3.2$ ✓（余量只有 0.2，偏紧）；
4. **查 $\mu_{\min}$**：在 $|BD| = 3.2$（曲柄与机架反向共线）时 $\cos\mu = (4.0+1.96-10.24)/(2\times2.0\times1.4) = -4.28/5.6 = -0.764$，$\mu = 139.8^\circ$，偏离 90° 达 $40.2^\circ$ —— 这才是本例的真正短板，刚好卡在门槛上；
5. **摆角是富余的**：实算摆角约 $70^\circ > 60^\circ$ ✓，所以约束全部落在 $\mu$ 上。想松快就把 $d$ 缩到 2.0，或把 $b$、$c$ 同时放大（$p+q$ 变大）。注意 $c$ 再往小调会走向退化：取 $c=1.2$ 时机构在极限位置 $\mu = 0^\circ$，输出杆开始整周转，摆角这个指标就失去意义了。

**这里真正想说的是**：四连杆设计不是解方程，而是**在「摆角够不够」和「传力行不行」之间来回妥协**。摆角要求越大，$\mu_{\min}$ 越难看，这就是为什么工程上会改用凸轮或伺服电机直驱。

</details>

## 7. 选读：Freudenstein 方程——把两个未知角压缩成一个

<details>
<summary>选读 · 从闭环方程消去 θ₃</summary>

把闭环分量式的含 $\theta_3$ 项留在左边，其余移项：

$$b\cos\theta_3 = d + c\cos\theta_4 - a\cos\theta_2,\qquad b\sin\theta_3 = c\sin\theta_4 - a\sin\theta_2$$

两式平方相加，$\theta_3$ 消失（利用 $\cos^2+\sin^2=1$）：

$$b^2 = d^2 + c^2 + a^2 + 2dc\cos\theta_4 - 2ad\cos\theta_2 - 2ac\cos(\theta_2 - \theta_4)$$

整理成

$$\cos(\theta_2 - \theta_4) = \frac{a^2 + c^2 + d^2 - b^2}{2ac} + \frac{d}{a}\cos\theta_4 - \frac{d}{c}\cos\theta_2$$

即

$$R_1\cos\theta_2 - R_2\cos\theta_4 + R_3 = \cos(\theta_2 - \theta_4),\quad R_1 = \frac{d}{c},\ R_2 = \frac{d}{a},\ R_3 = \frac{a^2 - b^2 + c^2 + d^2}{2ac}$$

这就是 **Freudenstein 方程**。它的用处不在手算（现在都用两圆交点），而在**设计**：给定三组输入输出角对应关系 $(\theta_2, \theta_4)$，三个方程解三个未知量 $R_1, R_2, R_3$，直接反求出杆长比——这叫**函数发生器综合**。

用 $\tan(\theta_4/2)$ 半角代换可把它化成一元二次方程，两个根对应两个装配分支。**分支的存在正是四连杆分析里最容易被忽略的东西**：同一组杆长、同一个输入角，机构可能有两种合法姿态，动画里点到哪个取决于你是怎么装起来的。

</details>

## 8. 下一站

四连杆只能给出「输入角 → 输出角」这一条固定的对应关系。要是你想要的不是「摆多少度」，而是「在某一瞬间精确地抬起多少毫米、然后稳稳停住」——那就该换一件工具了。

→ [凸轮与从动件](./140-cam.md)
