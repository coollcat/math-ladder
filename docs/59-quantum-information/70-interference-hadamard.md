---
title: 干涉直觉与 Hadamard 实验
lesson_id: quantum-information/interference-hadamard
prereqs:
  - quantum-information/bloch-sphere
  - complex/euler
  - quantum-information/measurement-born
volume: 5
layer: L11
track:
  - information-learning
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - phase-interference
  - mach-zehnder-interferometer
applications:
  - quantum-computing
exits:
  - quantum-information/tensor-product-dimension
---

# 干涉直觉与 Hadamard 实验

## 1. 从一个场景开始

光学实验室里有一个经典装置叫**马赫-曾德尔干涉仪**：一束光被半透镜劈成两条路径，各走一段后再由另一块半透镜汇合。把光调到"每次只放一个光子"的极限——单个光子同时探着两条路，最后却总能精准地落进同一个出口。两条路都走过的人，听见了自己声音的重叠。

量子线路里对应的一幕更迷：H 门把 $\lvert0\rangle$ 搅成均匀叠加，再敲一次 H，按直觉该搅得更乱——结果一五一十回到 $\lvert0\rangle$。两次都在剧烈动作，净效果却是零？本课用相位把这桩"经典谜"拆开。

## 2. 直觉解释

谜底一句话：**第二块 H 面对的是两个振幅带相反相位的路径**。

分步看（沿用上一章的地球仪）：

1. 第一次 H 把北极送上赤道经度 0 处——$\lvert0\rangle$ 与 $\lvert1\rangle$ 振幅等大同相；
2. 中间什么都不做的话，这两份振幅在球面上静静躺着；
3. 第二次 H 不是"再抹匀"，而是绕斜轴再拧半圈：原本同相的两份贡献走到出口处恰好一个增、一个减……
4. 精确抵消的净结果＝原点出发回原点。HH=I 从来不是"没干活"，是**完美对账后的余额归零**。

这就是**干涉**的全部含义：振幅可以携带正负与虚数符号，两路汇合时做的是加法不是投票。概率从不打架，打架的是它们的复数开方账。

## 3. 正式定义

**干涉条件**：某测量结果的概率由所有到达该结果的路径振幅之和决定：

$$P(x)=\Bigl\lvert\sum_{\text{各条路径}} a_j\Bigr\rvert^2 \ne \sum_{\text{各条路径}} \lvert a_j\rvert^2$$

右边那个"先平方再相加"的错误算法叫经典混合；只有当恰有一条路径或相位差特殊（例如等于 $0$ 或 $\pi$ 的倍数）时两边才碰巧相等。中间插一块**移相器**（对一路振幅乘 $e^{i\varphi}$），出口概率立刻变成

$$P_0(\varphi)=\frac{1+\cos\varphi}{2}=\cos^2\frac{\varphi}{2},\qquad P_1(\varphi)=1-P_0(\varphi)$$

| 相位差 | 出口 0 的情形 | 一句话 |
| --- | --- | --- |
| $0$ | 全部抵达 | 相长：两波峰对齐 |
| $\pi$ | 全军覆没 | 相消：波峰遇波谷 |
| $\frac{\pi}{2}$ | 一半一半 | 不上不下，条纹坡腰 |

单光子走双臂仍能干涉——因为干涉发生在**每个个体的振幅账本**里，不需要两颗粒子互相见面。φ 扫一圈，出口 0 与 1 此消彼长一轮，这就是双缝屏上的条纹在一维里的样子。

## 4. 分步例题

**例 1**：手算 HH 施加在 $\lvert0\rangle$ 上为什么归位。

1. 第一击后振幅：$\frac{1}{\sqrt2}(1,\ 1)$；
2. 第二击第一行：$\frac{1}{\sqrt2}\cdot\frac{1+1}{\sqrt2}=1$；
3. 第二击第二行：$\frac{1}{\sqrt2}\cdot\frac{1-1}{\sqrt2}=0$ ——注意 1 与 −1 的相遇，就是相消现场；
4. 结果 $(1,0)^T=\lvert0\rangle$ ✓。谜题结案：第二次 H 让两份历史各自投影、再正负交割。

**例 2**：在两击之间塞一块 Z（即给 $\lvert1\rangle$ 方向振幅乘 $-1$，相当于移相器 φ=π）。

1. 第一击后：$\frac{1}{\sqrt2}(1,\ 1)$；Z 之后变 $\frac{1}{\sqrt2}(1,\ -1)$；
2. 第二击第一行：$\frac12(1-1)=0$，第二行：$\frac12(1+1)=1$；
3. 出口彻底翻成 $\lvert1\rangle$——这正是第 30 课验过的矩阵恒等式 $HZH=X$ 的物理面孔；
4. 读物理：Z 动的全是看不见的相位，却把所有光子从 0 号口赶去了 1 号口。**相位是隐形货币，干涉是兑现窗口。**

## 5. 动手实验

拖动下面的曲线看两条出口此消彼长：横轴是移相器 φ，蓝线与红线之和恒为 1——出口之间没有第三种命运：

```viz
{
  "type": "plot",
  "title": "马赫-曾德尔条纹：两出口互补",
  "expr": "(1 + cos(x)) / 2",
  "expr2": "(1 - cos(x)) / 2",
  "xmin": -6.2832,
  "xmax": 6.2832,
  "piAxis": true
}
```

### 实验 1（python）：逐站振幅台账

```python title="HH 双击与 HZH 变脸的中间态"
import math

s = 1 / math.sqrt(2)

psi = [s, s]      # 第一击 H 后：五五开
print("H 后    =", round(psi[0], 4), ",", round(psi[1], 4))

psi = [psi[0] * s + psi[1] * s, psi[0] * s - psi[1] * s]
print("HH 后   =", round(psi[0], 6), ",", round(psi[1], 6), " ← 归位")

mid = [s, -s]     # 中间垫 Z：下路翻号
out = [mid[0] * s + mid[1] * s, mid[0] * s - mid[1] * s]
print("HZH 后  =", round(out[0], 4), ",", round(out[1], 4), " ← 全去 1 口")
```

第二行打印出 `1.0 , 0.0`：两份贡献的加减对账精确清零。第三行则是同一台干涉仪被一块 Z 改写了结局。

### 实验 2（python）：移相器扫描

```python title="相位差如何搬动出口流量"
import math

for deg in [0, 45, 90, 135, 180]:          # 依次扫五个相位挡位
    phi = math.radians(deg)
    top = 1 + 0j                                  # 上路振幅基线
    bottom = complex(math.cos(phi), math.sin(phi))   # e^{iφ}：cos 管 real，sin 管 imag
    amp0 = (top + bottom) / 2                     # 两路在 0 号口的合流振幅
    p0 = abs(amp0) ** 2
    print(f"φ={deg:3d}°  P0={round(p0, 4)}")
```

扫描输出从 1.0 平滑滑到 0.0——标准余弦条纹。φ=90° 时 P0 恰好 0.5：这意味着"各半"的叠加态并非天生，它需要**特定的相位中点**才站得住。

### 快问快答

```quiz
两路振幅大小相同、相位差多少时会在出口完全抵消？
- 相位差为 0
- 相位差为 π（整数 180 度） [*]
- 相位差任意都无所谓，反正概率照旧相加
? 大小相同而方向相反的两个复矢量相加得零：e^{i0} 与 e^{iπ} 正是一对，相减才回家。
```

:::warning[常见误区]

**误区一**："你以为干涉需要两个光子碰头。" 单个光子的振幅先分后合就足够产生条纹；干扰的是**概率流的支流合并方式**，不是粒子们的社交生活。

**误区二**："你以为中间态的概率一样就说明白干了。" HZH 之前与之后单看概率都是五五开，但终局一个是原地、一个是全翻转——中间步骤的相位是存折，测量只是提现时刻。

**误区三**："你以为做两次 H 等于'洗得更散'。" 酉演化的可逆性保证任何门序列都有精确逆；HH=I 是对账而非懒惰。真正会'越洗越散'的是退相干（噪声），这位恶役已在[密度矩阵一课](./45-density-matrix.md)亮过相。

:::

## 6. 练习

**练习 1**：下面的脚本模拟"第一块 H → 移相器 φ=90° → 第二块 H"。能跑，但把移相器当成了纯实数缩放——$e^{i\varphi}$ 的虚部被弄丢了。修到两个出口概率正确为止：

```exercise
# @title: 练习：把丢掉的虚部找回来
# @check: 0.5
# @check: 0.5
# @hint: 移相器要写成完整复数 complex(cos(phi), sin(phi))——欧拉公式说 e^{iφ} 实虚各管一角；本组设置下 0 号口与 1 号口的概率恰好打平。
import math

phi = math.pi / 2     # 移相器设定：90 度

top = 1 + 0j
bottom = math.cos(phi) + 0j       # ← 错在这：只剩实部，相位被抹平

amp0 = (top + bottom) / 2         # 0 号出口：两路相加
amp1 = (top - bottom) / 2         # 1 号出口：两路相减
print(round(abs(amp0) ** 2, 4))
print(round(abs(amp1) ** 2, 4))
```

修好后读输出：两个 0.5 正是条纹的坡腰——别嫌它平淡，φ 往任一边拨一点，天平立刻倾斜，干涉仪因此成了世界上最灵敏的尺子之一。

<details>
<summary>练习 1 解法</summary>

```python
import math

phi = math.pi / 2

top = 1 + 0j
bottom = complex(math.cos(phi), math.sin(phi))   # e^{iφ} 完整成型

amp0 = (top + bottom) / 2
amp1 = (top - bottom) / 2
print(round(abs(amp0) ** 2, 4))
print(round(abs(amp1) ** 2, 4))
```
</details>

**练习 2**：不写代码，用例题的台账法手算序列 H、H、Z、H 依次作用在 $\lvert0\rangle$ 上的最终态。特别留意中间那记 Z：它真的动了什么吗？

<details>
<summary>点开查看逐步解答</summary>

1. 第一次 H：$\lvert0\rangle\to\frac{1}{\sqrt2}(1,\ 1)$；
2. 第二次 H：对账归零，回到 $\lvert0\rangle$；
3. 第三步的 Z 给 $\lvert1\rangle$ 振幅乘 −1——可此刻第二个分量是 **0**，乘多少还是 0：Z 这一拳打进了棉花里，状态纹丝不动；
4. 最后的 H 再把北极送回赤道：终态 $\frac{1}{\sqrt2}(1,\ 1)=\lvert+\rangle$。

教训反着记才深刻：门只在自己有戏的地方出场——Z 的本事全押在下路振幅上，前两击恰好清空了它。这也解释了为什么"先相位再干涉"必须讲究次序（选读部分的算法骨架正建立在这套次序账上）。
</details>

## 7. 选读：为什么条纹如此金贵

<details>
<summary>选读 · 干涉与计算的同源</summary>

把例 2 反过来看：如果存在一组答案能让"错误选项的振幅"相位互抵、"正确选项"相长，一台量子计算机就在做**计算化的马赫-曾德尔实验**。著名的 Shor 算法质因数分解、Grover 搜索，骨架都是这个三段式：制造均匀叠加（H 打底）→ 在振幅上悄悄标注相位（黑箱预言家）→ 再打一次变换让错误答案相消（收获）。所谓"量子加速"，不在于机器算得多快，而在于**错误选项从未有机会把模平方凑成正数**——它们在暗中被相位绞杀了。条纹敏感度也是同一原理的反面用法：光路上多出头发丝几万分之一的程差都能推动相位、挪动条纹，引力波天文台的激光臂正是这样聆听时空颤动的。

</details>

## 8. 下一站

单比特的戏剧落幕。下一课起，我们把多个比特拼在一起——你会看到，允许的宇宙尺寸不是慢慢长大，而是每添一枚硬币就**整个翻一倍**，爆炸从第二枚就开始。

→ [张量积：维数爆炸从哪里来](./80-tensor-product-dimension.md)
