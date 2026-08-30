---
title: 逆运动学与数值求根
lesson_id: robotics-motion/inverse-kinematics
prereqs:
  - robotics-motion/forward-kinematics
  - robotics-motion/quaternions-attitude
  - numerical-analysis/fixed-point-iteration
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
  - inverse-kinematics
  - jacobian-transpose-iteration
  - local-minimum
applications:
  - robot-arm-control
  - animation-rigging
exits:
  - robotics-motion/jacobian-singularities
---

# 逆运动学与数值求根

## 1. 从一个场景开始

正运动学课上那颗纽扣还躺在沙发底。这一回控制器拿到的是相反的命令："**末端要去 $(1,2)$，两个关节各转多少度？**"——从手到肩反着解方程，这就是**逆运动学**（inverse kinematics，IK）。

单行道变成了逆行：正向是"角度一查表、坐标就出来"；反向却可能有两个答案、没有答案，三连杆以上连公式都开始罢工。工业界于是兵分两路：能闭式就闭式，闭不了就数值迭代慢慢磨。

## 2. 直觉解释

二连杆的逆解像一场两步审讯：

- **先审肘**：目标到基座的距离 $d$ 定了，两臂与连线围成三角形，余弦定理直接把肘角 $\theta_2$ 逼出来；
- **再审肩**：肘角定了，肩角只剩"把整条臂对准目标方向"这件事，反三角函数一次到位。

三角形有"肘上"和"肘下"两种拼法——**一问两答**是逆解的常态，工程上靠附加规则（优先肘上、避开障碍）拍板。而 $d$ 超出 $|L_1-L_2|$ 到 $L_1+L_2$ 的圆环时，余弦值出了 $[-1,1]$ 的地界，物理上根本不可达：再多算法也只是徒劳地拧关节。

闭式解够不着的地方（自由度高、约束多），请出数值法：把"末端误差"当函数，每一步按雅可比指的方向微调关节——第 44 章迭代求根的机器人分身。

## 3. 正式定义

**二连杆闭式解**：目标 $(t_x,t_y)$，记 $d^2=t_x^2+t_y^2$，

$$\cos\theta_2=\frac{d^2-L_1^2-L_2^2}{2L_1L_2},\qquad \theta_1=\operatorname{atan2}(t_y,t_x)-\operatorname{atan2}(L_2\sin\theta_2,\ L_1+L_2\cos\theta_2)$$

| 符号 | 名字 | 易错点 |
| --- | --- | --- |
| $\pm\theta_2$ | 肘上/肘下 | 反余弦只给正根，另一解要取负 |
| 可达判据 | $\lvert\cos\theta_2\rvert\le1$ | 超界即目标在圆环外 |
| 多解 | 两个姿势 | 都对，按规则挑一个 |

**数值法（Jacobian 转置迭代）**：误差 $\vec e=FK(\vec q)-\vec t$，每步

$$\vec q\ \leftarrow\ \vec q-\alpha\,J^T\vec e$$

$J^T\vec e$ 读作"每个关节该拧多少"，$\alpha$ 是步长。它是梯度下降的近亲：便宜、稳、不挑维数，但收敛慢，且可能停进**局部极小**——误差降不动了，却没到目标。诚实边界：迭代法是"求根"，不是"许愿"。

## 4. 分步例题

**例**：$L_1=2$、$L_2=1$，目标 $(1,2)$。求两组解。

1. 距离平方：$d^2=1+4=5$；
2. 审肘：$\cos\theta_2=\frac{5-4-1}{2\cdot2\cdot1}=0$ → $\theta_2=\pm90^\circ$；
3. 肘上（$\theta_2=+90^\circ$）：$\operatorname{atan2}(2,1)=63.43^\circ$，$\operatorname{atan2}(1\cdot1,\ 2+0)=26.57^\circ$，相减得 $\theta_1=36.87^\circ$；
4. 肘下（$\theta_2=-90^\circ$）：第二项变 $-26.57^\circ$，相减得 $\theta_1=90^\circ$；
5. 正解复查：肘上时总角 $126.87^\circ$，手算 $x=2\cos36.87^\circ+\cos126.87^\circ=1.6+(-0.6)=1$、$y=1.2+0.8=2$ ✓ 两组都命中纽扣，姿势不同而已。

## 5. 动手实验

先看肘角这本"可达账"：曲线是末端到基座的距离 $r(\theta_2)$，$\pm\pi$ 处缩到 $|L_1-L_2|=1$，$0$ 处伸满 $L_1+L_2=3$——目标距离落不进区间，闭式解直接弃权：

```viz
{
  "type": "plot",
  "title": "可达距离 r 随肘角的变化（L1=2, L2=1）",
  "expr": "sqrt(5 + 4*cos(x))",
  "xmin": -3.14159,
  "xmax": 3.14159,
  "piAxis": true
}
```

### 实验 1（python）：闭式解的两副姿势

```python title="二连杆 IK：肘上肘下各答一次"
import math                                     # 反三角函数 acos/atan2 都住这里

L1, L2 = 2, 1                                   # 大臂、小臂长度
tx, ty = 1, 2                                   # 目标点（第 20 课的那颗纽扣）

dd = tx * tx + ty * ty                          # 距离平方，免开方的中间量
c2 = (dd - L1**2 - L2**2) / (2 * L1 * L2)       # 余弦定理逼出的肘角余弦

for sgn in [1, -1]:                             # 两种肘姿：+1 肘上、-1 肘下
    th2 = sgn * math.acos(c2)                   # acos 给正根，符号手选
    th1 = math.atan2(ty, tx) - math.atan2(L2 * math.sin(th2), L1 + L2 * math.cos(th2))
    x = L1 * math.cos(th1) + L2 * math.cos(th1 + th2)   # 正解复查：算回末端
    y = L1 * math.sin(th1) + L2 * math.sin(th1 + th2)
    print(f"肘{'上' if sgn > 0 else '下'}: 肩角 {round(math.degrees(th1), 1)}°, "
          f"肘角 {round(math.degrees(th2), 1)}°, 复查 ({round(x, 3)}, {round(y, 3)})")
```

两副姿势、同一个终点——IK 的答案是一对，不是一朵。把 `ty` 改成 `4` 再跑：`c2` 超过 1，`acos` 当场抗议，这就是"圆环外"的数字报警。

### 实验 2（python）：转置迭代与它的天花板

```python title="Jacobian 转置迭代：够得着收敛，够不着卡死"
import math                                     # 浮窗同一命名空间，math 已就位

L1, L2 = 2, 1

def fk(q1, q2):                                 # 正解：角度 → 末端
    return (L1 * math.cos(q1) + L2 * math.cos(q1 + q2),
            L1 * math.sin(q1) + L2 * math.sin(q1 + q2))

def chase(tx, ty, steps):                       # 转置迭代：追一个目标点
    q1, q2 = 0.5, 0.5                           # 随手一个起始姿势
    for k in range(steps):                      # range 生成 0..steps-1 的步数序列
        x, y = fk(q1, q2)
        ex, ey = x - tx, y - ty                 # 误差 = 现在 - 想要
        s12, c12 = math.sin(q1 + q2), math.cos(q1 + q2)
        s1, c1 = math.sin(q1), math.cos(q1)
        q1 -= 0.02 * (-L1 * s1 - L2 * s12) * ex + 0.02 * (L1 * c1 + L2 * c12) * ey
        q2 -= 0.02 * (-L2 * s12) * ex + 0.02 * (L2 * c12) * ey
        if (k + 1) % 50 == 0:
            err = math.hypot(ex, ey)            # hypot＝sqrt(a²+b²) 的防溢出版本
            print(f"  第 {k + 1} 步误差 = {round(err, 3)}")

print("目标 (1, 2)（可达）：")
chase(1, 2, 150)
print("目标 (3.5, 0)（圆环外，最远只到 3）：")
chase(3.5, 0, 150)
```

可达目标误差一路缩到 0；圆环外目标误差被钉死在 0.5——迭代不撒谎，它只是把关节拧到"最接近"的位置然后停住。这就是转置法的诚实边界：收敛证明只属于可达世界，局部极小还可能让它更早收工。

### 快问快答

```quiz
逆运动学解出两个答案（肘上/肘下），控制器该怎么选？
- 两个轮流执行
- 按附加规则挑一个，比如优先肘上或避开障碍 [*]
- 求两个角度的平均值
? 平均两个角度会得到第三种没验证过的姿势，可能撞上自身或障碍。多解要靠显式规则裁决，这是工程与考题的区别。
```

:::warning[常见误区]

**误区一**："你以为闭式解是标配。" 三连杆以上一般没有漂亮的闭式公式；工业六轴臂的解析解要靠特殊构型（球腕）硬凑，通用场景只能数值迭代。

**误区二**："你以为迭代一定会到目标。" 圆环外的目标停在最近点，局部极小停在半路——迭代法给出的永远是"当前误差"，不是"承诺"。

**误区三**："你以为转置迭代就是牛顿法。" 牛顿法每步要解线性方程（用 $J^{-1}$），转置法用 $J^T$ 免了求逆——便宜、不挑奇异，代价是收敛更慢。第 44 章的收敛速度账在这里照样要算。

:::

## 6. 练习

**练习 1**：初始代码把余弦定理的分子抄反了，能跑、结论全错。修到复查归位：

```exercise
# @title: 练习：修好余弦定理的分子
# @check: 0.75
# @check: 41.4
# @check: 2.0
# @check: 2.0
# @hint: 分子是"目标距离平方减两臂平方和"：d²-L1²-L2²；抄反了符号，肘角就指向镜像世界。
import math                                     # acos / atan2 的老班底

L1, L2 = 2, 1                                   # 臂长：大 2、小 1
tx, ty = 2, 2                                   # 目标点

dd = tx * tx + ty * ty                          # 距离平方
c2 = (L1**2 + L2**2 - dd) / (2 * L1 * L2)       # ← 错在这：分子抄反，符号丢了
th2 = math.acos(c2)                             # 肘上姿势
th1 = math.atan2(ty, tx) - math.atan2(L2 * math.sin(th2), L1 + L2 * math.cos(th2))

x = L1 * math.cos(th1) + L2 * math.cos(th1 + th2)   # 正解复查
y = L1 * math.sin(th1) + L2 * math.sin(th1 + th2)
print(round(c2, 2))
print(round(math.degrees(th2), 1))
print(round(x, 3))
print(round(y, 3))
```

**练习 2**：把实验 2 的起始姿势改成 $(3.0, -3.0)$ 弧度再追 $(1,2)$，观察是否还能收敛。写两三句话解释这算不算局部极小，以及步长 $\alpha$ 调大一倍后发生了什么。

<details>
<summary>点开查看逐步解答</summary>

从 $(3.0,-3.0)$ 出发，误差虽然很大，但转置法的方向场仍指向缩小误差的半坡，150 步内误差同样缩到 0 附近——本例两连杆的误差面只有两个"盆地"（肘上/肘下各一），没有真正的局部极小。但把 $\alpha$ 从 0.02 调到 0.4 后，单步迈得过猛，关节角来回过冲，误差曲线开始抖动甚至发散——转置法的 $\alpha$ 上限由 $J^TJ$ 的曲率决定，"步子大了容易扯着"。

真正的局部极小需要约束介入：比如给肘角加上"不许低于地面"的限位，迭代会顶着限位停住，误差清不了零——那是可行的（尊重约束），但不是全局最优。判别手段：换几个起始点各跑一次，全部落在同一误差水平才敢说"大概是全局的"。
</details>

## 7. 选读：伪逆与阻尼最小二乘

<details>
<summary>选读 · 转置法的两个升级包</summary>

**伪逆迭代**：$\Delta\vec q=-J^{+}\vec e$，其中 $J^{+}=J^T(JJ^T)^{-1}$ 是伪逆——每步解一个最小二乘问题，收敛比转置法快得多；代价是要做矩阵求逆，且奇异附近 $JJ^T$ 接近退化（下节课的主角）。

**阻尼最小二乘（DLS）**：$\Delta\vec q=-J^T(JJ^T+\lambda^2 I)^{-1}\vec e$，那个 $\lambda$ 是阻尼：宁可步子小一点，也不让奇异附近的步长爆炸。奇异鲁棒与收敛速度之间的旋钮，与第 44 章条件数课里"正则化换稳定"是同一个交易。

</details>

## 8. 下一站

逆解迭代到"误差降不动"时，有一类位置连正解都开始变僵——手臂伸直的那一刻，某些方向的速度凭空消失。下一课给这台变速箱装上仪表：速度雅可比与奇异位形。

→ [速度雅可比与奇异位形](./60-jacobian-singularities.md)
