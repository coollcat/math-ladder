---
title: 相量法与阻抗
lesson_id: electronics/impedance-phasor
prereqs:
  - electronics/rlc-ring
  - complex/euler
introduces_math: []
introduces_builtin: []
introduces_import: []
volume: 6
layer: L8
track:
  - analysis-change
  - geometry-space
stage: university-core
difficulty: 3
introduces_concepts:
  - phasor
  - complex-impedance
  - reactance
  - series-resonance
applications:
  - ac-circuit-analysis
  - filter-synthesis
exits:
  - engineering
---
## 1. 从一个场景开始
市电是 220 V / 50 Hz 的正弦波。给一台电机通上市电，电流不是最大值的 220 V 除以电阻那么简单——它**滞后**了，而且滞后的角度还会随负载变化。
处理这类问题，微分方程会写到你崩溃。可工程师从不写微分方程：他们把正弦变成**复平面上的一个旋转箭头**，于是微分变成乘 $j\omega$、积分变成除 $j\omega$，交流电路退化成初中矢量加法。
**相量法是电路分析史上最划算的一笔交易。**
## 2. 直觉解释
回忆欧拉公式 $e^{j\theta} = \cos\theta + j\sin\theta$。一个以角频率 $\omega$ 旋转的复矢量，它在虚轴上的投影就是正弦波：
$v(t) = V_p\cos(\omega t + \phi) = \Re\left\lbraceV_p e^{j\phi} \cdot e^{j\omega t}\right\rbrace$
关键的一步来了：**在同一个电路里，所有信号都以同一个 $\omega$ 旋转**。既然旋转是大家共有的，就可以把它"约掉"——只保留**幅度和初始相位**那部分复数 $\tilde{V} = V_p e^{j\phi}$。这个不随时间转的复数，就是**相量**。
于是：
- 正弦量 → 复平面上一个**固定的点**；
- 微分 $d/dt$ → 乘以 $j\omega$（转 90°、放大 $\omega$ 倍）；
- 积分 → 除以 $j\omega$；
- KCL、KVL → **照旧成立**（复数形式）。
**交流电路的全部难度，被压缩成了一次"把实数换成复数"的替换。**
## 3. 正式定义
**相量**：用复数表示正弦量的幅度与相位（约定用**有效值 RMS** 而非峰值，工程惯例）
$\tilde{V} = V_{\text{rms}} \,e^{j\phi} = V_{\text{rms}}\angle\phi$
**阻抗** $Z$：元件两端电压相量与电流相量之比
$Z = \frac{\tilde{V}}{\tilde{I}}$
**三种基本元件的阻抗**：
$Z_R = R, \qquad Z_L = j\omega L, \qquad Z_C = \frac{1}{j\omega C} = -\frac{j}{\omega C}$
**串联合成**（阻抗直接相加，规则与电阻完全相同）：
$Z = R + j\left(\omega L - \frac{1}{\omega C}\right), \qquad |Z| = \sqrt{R^2 + X^2}, \qquad \phi = \arctan\frac{X}{R}$
其中 $X = X_L - X_C$ 为**电抗**，$X_L = \omega L$ 为感抗，$X_C = 1/(\omega C)$ 为容抗。
**串联谐振**：当 $X_L = X_C$ 时，虚部抵消，$|Z| = R$ 取最小值且为纯阻
$f_0 = \frac{1}{2\pi\sqrt{LC}}$
| 符号 | 名字 | 单位 | 频率依赖 |
| --- | --- | --- | --- |
| $Z$ | 阻抗 | 欧姆 Ω | 复数，$Z = R + jX$ |
| $R$ | 电阻（实部） | Ω | 与频率无关（理想） |
| $X_L = \omega L$ | 感抗 | Ω | 频率翻倍 → 翻倍 |
| $X_C = 1/(\omega C)$ | 容抗 | Ω | 频率翻倍 → 减半 |
| $\phi$ | 阻抗角 | rad / ° | $>0$ 感性（电流滞后），$<0$ 容性（电流超前） |
| $f_0$ | 谐振频率 | Hz | $X_L = X_C$ 处 |
## 4. 分步例题
**例**：$R = 100$ Ω，$L = 1$ mH，$C = 1$ µF 串联，接在 5 kHz 的正弦源上。求阻抗、阻抗角与电路性质。
1. **角频率**：$\omega = 2\pi \times 5000 = 31416$ rad/s；
2. **感抗**：$X_L = \omega L = 31416 \times 10^{-3} = 31.42$ Ω；
3. **容抗**：$X_C = 1/(\omega C) = 1/(31416\times10^{-6}) = 31.83$ Ω；
4. **合成**：$Z = 100 + j(31.42 - 31.83) = 100 - j0.41$ Ω；
5. **模与角**：$|Z| = \sqrt{100^2 + 0.41^2} = 100.001$ Ω，$\phi = \arctan(-0.41/100) = -0.23°$；
6. **性质**：$\phi < 0$ → 略呈**容性**，电流略微超前；
7. **谐振频率**：$f_0 = 1/(2\pi\sqrt{10^{-9}}) = 5033$ Hz——**5 kHz 离谐振点只差 33 Hz！** 这就是第 4 步里虚部几乎抵消的原因。
**这张图值得记住**：$X_L$ 随频率上升、$X_C$ 随频率下降，两者必然相交一次。在交点以下电路呈容性，交点以上呈感性——**同一个 RLC 网络，在不同频率上是两种完全不同的东西。**
## 5. 动手实验
### 实验 1（lab）：复平面上的矢量加法
```lab
{
  "type": "impedance-phasor",
  "title": "相量法：把 R、L、C 摆到复平面上",
  "sliders": [
    { "name": "R", "label": "电阻 R", "min": 0, "max": 1000, "step": 10, "value": 100 },
    { "name": "L", "label": "电感 L", "min": 0.1, "max": 10, "step": 0.1, "value": 1 },
    { "name": "Cu", "label": "电容 C", "min": 0.01, "max": 10, "step": 0.01, "value": 1 },
    { "name": "lf", "label": "频率 log₁₀f", "min": 2, "max": 7, "step": 0.01, "value": 4 }
  ]
}
```
左边是复平面：橙色箭头 $R$ 沿实轴，绿色箭头 $j\omega L$ 向上，红色箭头 $-j/(\omega C)$ 向下，琥珀色箭头是三者首尾相接后的合成阻抗 $Z$。右边是 $|Z|$ 与两条电抗随频率的变化曲线（对数轴），**在右侧曲线上横向拖动可以沿频率扫描**。
做三件事：
- 把 `lf` 从 4 拖到 3.7（约 5 kHz）——红色与绿色箭头几乎等长反向，合成箭头几乎贴在实轴上。**这就是谐振**；
- 拖到 `lf` = 2（100 Hz）——$X_C$ 变成 1592 Ω，箭头猛地向下，$Z$ 变成纯容性；
- 拖到 `lf` = 6（1 MHz）——$X_L$ 变成 6283 Ω，箭头猛地向上，$Z$ 变成纯感性。
一个元件，三种性格——全看频率落在哪一段。
### 实验 2（python）：用 Python 的复数直接算
```python title="Python 原生复数：j 就是虚数单位"
import math
R, L, C = 100.0, 1e-3, 1e-6
for f in [100, 1000, 5033, 10000, 100000]:
    w = 2 * math.pi * f
    ZL = 1j * w * L          # 1j 是 Python 的虚数单位；感抗 = jωL
    ZC = 1 / (1j * w * C)    # 容抗 = 1/(jωC)
    Z = R + ZL + ZC          # 串联：直接相加
    mag = math.hypot(Z.real, Z.imag)     # hypot(a,b)：√(a²+b²)，求复数的模
    phi = math.atan2(Z.imag, Z.real)     # atan2(y,x)：带象限的反正切
    kind = "感性" if Z.imag > 0 else ("容性" if Z.imag < 0 else "纯阻")
    print(f"f={f:>6} Hz  |Z|={mag:8.2f} Ω  φ={math.degrees(phi):7.2f}°  {kind}")
```
五行输出里，5033 Hz 那一行 $\phi$ 最接近 $0°$、$|Z|$ 最接近 100 Ω——数值上确认了谐振。**注意 `1j` 这个写法**：电子学里电流记号也是 $i$，所以 Python 与工程界双双改用 $j$ 表示虚数单位，倒是很一致。
### 快问快答
```quiz
一个串联 RLC 电路工作在远高于谐振频率的频率上，它对外呈现什么性质？
- 容性，因为电容高频时电抗小
- 感性，因为感抗随频率线性增大并最终压过容抗 [*]
- 纯阻性，因为虚部总是抵消
? X_L = ωL 随频率线性增大，X_C = 1/(ωC) 随频率反比减小。高于谐振点后 X_L 占据上风，净电抗为正，电路呈感性，电流滞后于电压。
```
:::warning[常见误区]
**误区一**："阻抗就是电阻的复数推广，所以 $|Z|$ 可以直接当电阻用。" 你以为 $|Z|$ 能直接代进 $P = I^2R$——**不能**。只有实部（电阻）消耗有功功率，虚部（电抗）只在电源与负载之间来回搬运能量。算功率必须用第 100 课的 $P = VI\cos\phi$。$|Z|$ 唯一确定的是**电流的幅度**。
**误区二**："相量是随时间旋转的矢量。" 你以为相量在转——其实**相量是静止的**。转的那个因子 $e^{j\omega t}$ 被所有人共有，已经在定义里被"约掉"了。相量只编码幅度与初始相位。把它想成"快照"而不是"动画"，很多困惑会立刻消失。
**误区三**："相量用峰值还是有效值都一样，反正只是个复数。" 你在理论上没错，但工程惯例是**有效值（RMS）**：市电 220 V 是有效值，峰值其实是 $220\sqrt{2} = 311$ V。混用两者会让功率差两倍、让耐压设计差 41%。**写下相量前先声明用的是哪一种**——这是电气工程师的职业习惯。
:::
## 6. 练习
**练习 1**：串联 $R = 100$ Ω、$X_L = 31.416$ Ω、$X_C = 31.831$ Ω。求阻抗模。这段代码把两个电抗直接相加了，修到输出 `100.001`：
```exercise
# @title: 练习：串联 RLC 的阻抗模
# @check: 100.001
# @hint: 感抗向上（+j）、容抗向下（−j），净电抗是两者之差 XL − XC。代码把符号弄丢了，写成了相加
import math                    # 数学库（卷一已引入）
R = 100.0
XL = 31.416                    # 感抗（Ω）
XC = 31.831                    # 容抗（Ω）
Z = math.hypot(R, XL + XC)     # ← 问题在这：净电抗应为 XL - XC
print(round(Z, 3))
```
**练习 2**：一段 50 Hz 的工频下，某电感 $L = 100$ mH。(a) 它的感抗是多少？(b) 若要在这个频率上谐振，需要配多大的电容？(c) 谐振时若回路中只有 10 Ω 电阻，品质因数 $Q$ 是多少？
<details>
<summary>点开查看逐步解答</summary>
1. **感抗**：$\omega = 2\pi\times50 = 314.16$ rad/s，$X_L = \omega L = 314.16\times0.1 = 31.4$ Ω；
2. **配谐振电容**：令 $X_C = X_L = 31.4$ Ω，$C = 1/(\omega X_C) = 1/(314.16\times31.4) = 1.013\times10^{-4}$ F ≈ **100 µF**；
3. **也可以用公式验算**：$f_0 = 1/(2\pi\sqrt{LC})$，$C = 1/(4\pi^2 f_0^2 L) = 1/(39.48\times2500\times0.1) = 1.013\times10^{-4}$ F ✓；
4. **品质因数**：$Q = \dfrac{X_L}{R} = \dfrac{31.4}{10} = 3.14$。
$Q = 3.14$ 意味着谐振时电容与电感两端的电压是电源电压的 3.14 倍——**串联谐振是"电压放大器"**。工频下做到 $Q = 100$ 并不难，那时 220 V 的电源会在电容上产生 22 kV。电力系统里这叫"铁磁谐振过电压"，是真实的事故类型。
</details>
## 7. 选读：为什么微积分变成了乘除
<details>
<summary>选读 · 相量法的合法性证明</summary>
设线性电路在正弦稳态下，各处电压电流都是同频正弦。对任意支路量取 $x(t) = \Re\lbrace\tilde{X}e^{j\omega t}\rbrace$，则
$\frac{dx}{dt} = \Re\lbracej\omega \tilde{X} e^{j\omega t}\rbrace$
所以微分算子 $d/dt$ 作用在相量上等价于**乘以 $j\omega$**。把这条规则代进元件关系：
- 电容：$i = C\dfrac{dv}{dt} \Rightarrow j\omega C\,\tilde{V} = \tilde{I} \Rightarrow \dfrac{\tilde{V}}{\tilde{I}} = \dfrac{1}{j\omega C}$；
- 电感：$v = L\dfrac{di}{dt} \Rightarrow \tilde{V} = j\omega L\,\tilde{I} \Rightarrow \dfrac{\tilde{V}}{\tilde{I}} = j\omega L$。
再代进 KCL/KVL（它们是线性方程，对复数同样成立），整个电路方程组就变成了**复系数线性代数方程组**——微分方程消失，只剩代数。
**合法性依赖两个前提**：(1) 电路是线性的（所以同频正弦激励只产生同频正弦响应）；(2) 已进入稳态（暂态分量已衰减完）。研究上电瞬间的行为还得回到第 70、80 课的时域分析——**相量法与瞬态分析是互补的两半，不是替代关系。**
顺带一提：把 $j\omega$ 换成复频率 $s = \sigma + j\omega$，就得到了**拉普拉斯变换**视角下的阻抗 $Z(s) = R + sL + 1/(sC)$，这正是传递函数与滤波器设计的起点。
</details>
## 8. 下一站
阻抗是复数，功率却必须是实数。电压与电流之间的那个夹角 $\phi$，决定了有多少能量真正在干活。
→ [交流功率与功率因数](100-ac-power.md)
