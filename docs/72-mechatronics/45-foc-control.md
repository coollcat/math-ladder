---
title: 磁场定向控制：把交流电机当直流电机开
lesson_id: mechatronics/foc-control
prereqs:
  - mechatronics/bldc-commutation
  - mechatronics/motor-model
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L8
track:
  - optimization-control
  - scientific-computing
stage: university-core
difficulty: 4
introduces_concepts:
  - clarke-transform
  - park-transform
  - field-oriented-control
  - dq-axis
  - svpwm
  - current-loop
applications:
  - servo-drive
  - ev-traction
  - robot-joint
exits:
  - engineering
---

# 磁场定向控制：把交流电机当直流电机开

## 1. 从一个场景开始

上一课的六步换向电机转起来"咔咔"抖：电流是方波、磁场每 60° 跳一步，转矩随转矩角锯齿般起伏。低速时你能听见明显的脉动，云台用它还会嗡嗡响。

伺服驱动器里的无刷电机却安安静静、又稳又有劲。差别在控制策略：**磁场定向控制（FOC）不再让磁场"跳着走"，而是让它连续旋转**，同时把电流里"真正产生转矩的那一部分"单独拎出来控制。结果就是——一台三相交流电机，被开出了直流电机那种"电流正比于转矩"的顺滑手感。

它是怎么把交流电机"骗"成直流电机的？答案是一套坐标变换。

## 2. 直觉解释

直流电机为什么好控制？因为它的励磁磁场和电枢磁场在空间上**始终垂直**，所以转矩就是 $T\propto I_a$，简单直接。而三相电机里，**定子合成磁场的角度是随转子一起转的**——你用固定的三相坐标系看它，它永远在动。

FOC 的思路是：**换一个坐标系看问题**。

- **Clarke 变换**：把三相 $a,b,c$ 的电流合并成两相静止坐标 $\alpha,\beta$——三相变两相，减掉一个冗余（三相电流之和为零）；
- **Park 变换**：站在**跟着转子一起转**的 $d,q$ 坐标系里看这组电流。这个坐标系一直和转子磁场对齐，于是在它看来，旋转的电流变成了**两个直流分量**：$i_d$（沿磁铁方向的励磁分量）和 $i_q$（垂直方向、真正产生转矩的分量）。

一旦电流变成直流，一切就回到直流电机：让 $i_d=0$（不给磁场方向添乱）、只控制 $i_q$，转矩就正比于 $i_q$。**"把交流电机当直流电机开"——开的正是这件事**。控制算完，再用逆 Park、逆 Clarke 变回三相，交给 SVPWM 输出。

## 3. 正式定义

**Clarke 变换**（幅值不变约定，$\theta_e$ 为电角度）：

$$i_\alpha=\frac{2}{3}\Big(i_a-\tfrac12 i_b-\tfrac12 i_c\Big),\qquad i_\beta=\frac{1}{\sqrt3}\big(i_b-i_c\big)$$

**Park 变换**（转到以 $\theta_e$ 定向的旋转坐标系）：

$$i_d=i_\alpha\cos\theta_e+i_\beta\sin\theta_e,\qquad i_q=-i_\alpha\sin\theta_e+i_\beta\cos\theta_e$$

**表贴式永磁电机**（SPM，已令 $i_d=0$）的转矩：

$$T=\frac{3}{2}\,p\,\lambda_m\,i_q$$

**逆变换**（算完控制量再变回三相）：

$$i_\alpha=i_d\cos\theta_e-i_q\sin\theta_e,\qquad i_\beta=i_d\sin\theta_e+i_q\cos\theta_e$$

| 符号 | 名字 | 单位 | 含义 |
| --- | --- | --- | --- |
| $\theta_e$ | 电角度 | rad | 转子磁场方向，须由编码器/观测器实时得到 |
| $i_\alpha,i_\beta$ | 两相静止电流 | A | 合成电流在静止直角系的投影 |
| $i_d$ | d 轴电流 | A | 沿磁场方向，$i_d=0$ 表示不励磁、只出转矩 |
| $i_q$ | q 轴电流 | A | 垂直磁场方向，**转矩正比于它** |
| $p$ | 极对数 | — | 电角度 $=$ 机械角度 $\times\,p$ |
| $\lambda_m$ | 永磁磁链 | Wb | 转子磁铁产生的磁通，常数 |

**SVPWM**（空间矢量 PWM）：三相桥有 $2^3=8$ 种开关组合，其中 6 个是有幅值、方向相隔 60° 的有效矢量，另 2 个是零矢量。SVPWM 用相邻两个有效矢量加零矢量按占空比合成**任意方向、任意幅值**的电压矢量，把逆变器的利用率比正弦调制提高约 15%。

## 4. 分步例题

**例**：某 7 对极 SPM 电机，$\lambda_m=0.01$ Wb。某一时刻三相电流 $i_a=5$ A、$i_b=i_c=-2.5$ A。求 $\alpha\beta$ 电流；当转子电角度 $\theta_e=0^\circ$ 与 $-90^\circ$ 时的 $dq$ 电流与转矩。

1. **Clarke**：$i_a+i_b+i_c=0$（三相平衡）。$i_\alpha=\frac23\big(5+1.25+1.25\big)=5$ A；
2. **$\beta$ 分量**：$i_\beta=(i_b-i_c)/\sqrt3=0$。所以 $\alpha\beta$ 电流就是 $(5,\ 0)$——**幅值 5 A，方向固定在 $\alpha$ 轴**；
3. **情况 A（$\theta_e=0^\circ$）**：$i_d=5\cos0+0=5$ A，$i_q=-5\sin0+0=0$ A。电流全部落在 $d$ 轴，**转矩为零**；
4. **情况 B（$\theta_e=-90^\circ$）**：$i_d=5\cos(-90^\circ)=0$，$i_q=-5\sin(-90^\circ)=+5$ A。电流全部落在 $q$ 轴；
5. **转矩**：$T=\frac32\times7\times0.01\times i_q$。情况 A：$T=0$；情况 B：$T=0.525$ N·m；
6. **结论**：同样的 5 A 电流，因为转子角度不同，产生的转矩从 0 变到最大。**这正是必须知道 $\theta_e$ 的原因**——不知道转子在哪，就不知道电机在出多大的力。

第 3、4 步是 FOC 的核心洞察：**让转子角度决定我们把电流"送"到哪个轴上**。FOC 要做的，就是实时测出 $\theta_e$，把控制输出始终定向到 $q$ 轴。

**为什么不能一直用固定三相电流？** 若 $\theta_e$ 自由旋转而 $\alpha\beta$ 电流固定，由第 3 步的公式可知 $i_q=-5\sin\theta_e$ 是**正弦变化**的——转矩正负交替、平均为零，电机只会抖不会转。这就是下一节实验 1 要看见的曲线。

## 5. 动手实验

### 实验 1（viz）：电流方向固定时，转矩随转子角摆动

```viz
{
  "type": "plot",
  "title": "α 轴电流固定时，d-q 电流随转子电角度怎么走",
  "expr": "A*cos(x)",
  "label": "i_d = A·cosθ",
  "expr2": "-A*sin(x)",
  "label2": "i_q = −A·sinθ",
  "xmin": 0,
  "xmax": 6.283,
  "sliders": [
    { "name": "A", "min": 1, "max": 10, "step": 0.5, "value": 5 }
  ]
}
```

横轴是转子电角度 $\theta_e$（0~2π），两条曲线分别是 $i_d$ 和 $i_q$。它们都是**正弦波**：$i_q$ 在正负之间来回，平均值恰好是零——**电流没变，转矩却在正负之间摇摆，电机平均出力为零**。这就是"不会做 FOC 的驱动器"的真实处境。把滑杆 $A$ 拉大只是让摆幅更大，**形状一点没变**。FOC 要做的，是让这两条线变成**水平直线**（$i_d\equiv0$、$i_q\equiv$ 常数），办法就是让 $\theta_e$ 实时跟着转子走。

### 实验 2（python）：三相 → Clarke → Park，看谁在变谁不变

```python title="同一组三相电流，换个坐标系就变直流"
import math                      # 数学工具库：用 sin、cos、sqrt、pi
import matplotlib.pyplot as plt  # 画图库

A = 5.0                          # 相电流幅值 5 A
omega_e = 2 * math.pi * 50       # 电角频率：对应 50 Hz 电频率
p, lam = 7, 0.01                 # 极对数、永磁磁链

ts = []                          # 时间轴（毫秒）
ia_l, ib_l, ic_l = [], [], []    # 三相电流
id_l, iq_l = [], []              # d、q 轴电流
T_l = []                         # 转矩

N = 200
for k in range(N):
    t = k / N * 0.02             # 0~20 ms，一个 50 Hz 周期
    th = omega_e * t             # 电角度（rad）
    ia = A * math.sin(th)                        # a 相电流
    ib = A * math.sin(th - 2 * math.pi / 3)      # b 相，滞后 120°
    ic = A * math.sin(th + 2 * math.pi / 3)      # c 相，超前 120°
    ialpha = 2 / 3 * (ia - ib / 2 - ic / 2)      # Clarke：三相 → α
    ibeta = (ib - ic) / math.sqrt(3)             # Clarke：三相 → β
    # 关键：让 Park 的旋转角对齐转子实际电角度，于是 dq 电流变成直流
    th_e = th + math.pi                          # 转子磁场与电流矢量反相 180°（i_d=0 的工况）
    idq_d = ialpha * math.cos(th_e) + ibeta * math.sin(th_e)   # Park 的 d 分量
    idq_q = -ialpha * math.sin(th_e) + ibeta * math.cos(th_e)  # Park 的 q 分量
    ts.append(t * 1000)          # 换算成毫秒
    ia_l.append(ia); ib_l.append(ib); ic_l.append(ic)
    id_l.append(idq_d); iq_l.append(idq_q)
    T_l.append(1.5 * p * lam * idq_q)            # 转矩正比于 i_q

fig, axes = plt.subplots(2, 1, figsize=(7, 5))   # 上下两张子图
axes[0].plot(ts, ia_l, linewidth=1)              # a 相
axes[0].plot(ts, ib_l, linewidth=1)              # b 相
axes[0].plot(ts, ic_l, linewidth=1)              # c 相
axes[0].set_title("三相静止坐标：三条正弦", fontsize=9)
axes[1].plot(ts, id_l, linewidth=1.5)            # i_d
axes[1].plot(ts, iq_l, linewidth=1.5)            # i_q
axes[1].set_title("旋转 dq 坐标：两条直线", fontsize=9)
plt.tight_layout()

print("i_d ≈", round(abs(sum(id_l) / N), 3))     # 平均值应接近 0（取绝对值免去 -0.0）
print("i_q ≈", round(sum(iq_l) / N, 3))          # 平均值应为常数
print("转矩 T ≈", round(1.5 * p * lam * (sum(iq_l) / N), 3), "N·m")
```

上图三条正弦相互错开 120°，下图两条线却是**平的**：$i_d$ 贴在 0 附近、$i_q$ 稳定在一个常数上。**同一个物理量，换坐标系就从"交流"变成了"直流"**——这正是 FOC 能把交流电机当直流电机开的全部秘密。最后一行给出稳态转矩约 $1.5\times7\times0.01\times5=0.525$ N·m，与例题一致。工程上的双闭环（外环速度、内环电流）就是分别对这张图里的 $i_d$、$i_q$ 各配一个 PI 控制器。

### 快问快答

```quiz
FOC 中为什么要让 d 轴电流保持为零？
- 因为 d 轴电流会损坏永磁体
- 因为只有 q 轴电流产生转矩，d 轴电流浪费在励磁上不产生有用转矩 [*]
- 因为编码器只能测量 q 轴角度
? 转子磁场已经由永磁体提供了，再让定子电流去 d 轴（磁场方向）只会白白发热，不产生转矩。让 i_d=0、把全部电流送给 i_q，就是「每一安培电流都换成转矩」——这也是表贴式永磁电机效率最高的工况。（内嵌式永磁电机例外，它会主动用一点负的 i_d 来利用磁阻转矩。）
```

## 6. 常见误区

:::warning[常见误区]

**误区一**："三相电流是正弦的，转矩就平滑了。"
你以为只要把六步换向的方波换成正弦电流就行——**光有正弦电流不够**，还要让这组正弦**和转子磁场的相位对齐**（即 $i_d=0$）。如果相位对不上，$i_q$ 仍会随角度摆动、平均转矩为零（实验 1 里那条正弦曲线）。FOC 的两大要素：正弦电流 + 正确的角度定向，缺一不可。

**误区二**："Clarke 和 Park 只是近似。"
你以为坐标变换会丢信息——对**三相平衡**（$i_a+i_b+i_c=0$）的系统，Clarke + Park 是**精确的恒等式**，和"把向量从一组基换到另一组基"是同一件事（第 40 课的基变换）。唯一的"近似"来自工程约定：Clarke 有幅值不变（系数 $2/3$）和功率不变（系数 $\sqrt{2/3}$）两种版本，选错版本只是数值差一个常数，物理一点没丢。

**误区三**："FOC 必须装高精度传感器。"
你以为没有位置反馈就做不了 FOC——现代驱动器大量使用**无感 FOC**：靠测量三相电流和母线电压，用反电动势模型（滑模观测器、龙伯格观测器）估算 $\theta_e$。代价是低速时反电动势太小、估算不准，往往要配合高频注入或强制开环启动。有感的编码器方案精度最高，无感方案成本最低，工程上按用途选。

:::

## 7. 练习

**练习 1**：把三相电流 $i_a=5$ A、$i_b=i_c=-2.5$ A 做 Clarke 变换，得到 $\alpha$ 轴电流 $i_\alpha$。下面这段代码漏了一个系数，修到输出 `5.0`：

```exercise
# @title: 练习：三相到两相（Clarke 变换）
# @check: 5.0
# @hint: 幅值不变的 Clarke 变换是 iα = (2/3)·(ia − ib/2 − ic/2)，本课约定要乘 2/3 这个系数
ia, ib, ic = 5.0, -2.5, -2.5
ialpha = ia - ib / 2 - ic / 2    # ← 问题在这：漏掉了幅值不变的 2/3 系数
print(round(ialpha, 1))
```

**练习 2**：同一个 $\lambda_m=0.01$ Wb、$p=7$ 的电机，若控制器把 $i_q$ 稳定在 4 A、$i_d=0$，稳态转矩是多少？如果转子角度估算偏了 $30^\circ$（即真正的 $i_q=4\cos30^\circ$），转矩会损失多少？

<details>
<summary>点开查看逐步解答</summary>

1. **理想转矩**：$T=\frac32\times7\times0.01\times4=0.42$ N·m；
2. **角度偏差**：角度误差 $\Delta\theta$ 会把电流"漏"到 $d$ 轴上。修正后的 $i_q = 4\cos30^\circ = 3.46$ A，$i_d = 4\sin30^\circ = 2$ A；
3. **实际转矩**：$T'=\frac32\times7\times0.01\times3.46=0.363$ N·m；
4. **损失**：$(0.42-0.363)/0.42=13.5\%$。同时那 2 A 的 $i_d$ 白发热不产生转矩，进一步拉低效率；
5. **工程结论**：$\theta_e$ 的精度直接决定转矩和效率。角度误差 $30^\circ$ 就损失约 13% 转矩——所以无感 FOC 在低速时的痛点，本质是"角度估得不够准"。

$\cos30^\circ=0.866$ 这个折扣，和上一课六步换向"$\sin30^\circ$ 折算一半转矩"是同一类账：**角度决定你能把多少电流变成转矩**。

</details>

## 8. 选读：两种 Clarke 约定与 SVPWM 的几何

<details>
<summary>选读 · 2/3 还是 √(2/3)，以及六个矢量怎么合成任意方向</summary>

**两种 Clarke 约定**：

- **幅值不变**（本课采用，系数 $2/3$）：合成矢量模长等于相电流幅值。好处是 $\lvert I_{\alpha\beta}\rvert$ 直接就是相电流峰值，控制时好对应；
- **功率不变**（系数 $\sqrt{2/3}$）：让变换矩阵正交，三相功率 $=$ 两相功率，数学上更干净，仿真软件里常见。

两者只差一个常数 $\sqrt{3/2}$，物理内容完全相同。工程代码里一定要和库函数的约定对齐，否则实测电流会莫名其妙差 1.22 倍。

**SVPWM 的几何**：三相逆变器的 8 种开关状态对应 8 个电压矢量，6 个有效矢量 $\vec V_1\sim\vec V_6$ 长度为 $\frac23 V_{dc}$、方向相隔 60°，加两个零矢量 $\vec V_0,\vec V_7$。把平面分成 6 个扇区，每个扇区里用相邻两个有效矢量 $+$ 零矢量，按"伏秒平衡"合成目标矢量：

$$T_s\,\vec V_{ref}=T_1\vec V_k+T_2\vec V_{k+1}+T_0\vec 0,\qquad T_1+T_2+T_0=T_s$$

解出 $T_1,T_2$ 就是每个周期两个开关管的导通时间。**这与 Buck 变换器的伏秒平衡是同一个原理**（第 165 课）——都是在"不能让储能元件积累"的约束下分配时间。SVPWM 比正弦 PWM 多榨出约 15% 的直流母线电压利用率，代价是计算量和死区补偿。

</details>

## 9. 下一站

FOC 让磁场连续旋转、用正弦电流换来平滑转矩，代价是必须实时知道转子角度。如果反过来走极端——**不装任何传感器，只靠"数脉冲"来定位**，会得到什么？下一课的步进电机把这条路走到了尽头。

→ [步进电机与细分驱动](./50-stepper-microstep.md)
