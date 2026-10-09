---
title: Arzelà–Ascoli：函数族什么时候能抽出收敛子列
lesson_id: functional-analysis/arzela-ascoli
prereqs:
  - functional-analysis/compact-operators
volume: 2
layer: L8
track:
  - analysis-change
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - equicontinuity
  - arzela-ascoli
applications:
  - pde-solutions
  - numerical-analysis
exits:
  - research
---

# Arzelà–Ascoli：函数族什么时候能抽出收敛子列

## 1. 从一个场景开始

把一根梁的挠度用越来越细的网格算一遍，你会拿到一列近似解 $f_1, f_2, f_3, \dots$。想宣布"数值方法收敛了"，最省事的证据是：从这列曲线里总能挑出一条子列，稳稳地压向同一条极限曲线。

可曲线不是数。实数那一套"有界必有收敛子列"（Bolzano–Weierstrass）搬得过来吗？搬过来会立刻翻车。曲线可以不越界，却越抖越厉害：$\sin(nx)$ 的振幅始终是 $1$，无论你挑哪个子列，它都不会安静下来。**真正的锁不在"框住高度"，而在"框住陡峭"**——这一课要给出那把锁的精确形状。

## 2. 直觉解释

先回看实数为什么好办。一列实数有界，就等于全被塞进一根有限长的线段；线段是紧的，于是无论怎么挑，总有越挑越近的一串。这就是 Bolzano–Weierstrass。

函数族想照搬，得让"塞进盒子"这件事在函数空间里真的成立。麻烦在于盒子的两个维度：**高度**和**陡峭**。

$[-1,1]$ 上的函数可以被夹在两条水平线之间（这叫一致有界），却依然互相离得很远。$\sin(nx)$ 与 $\sin(mx)$ 在 sup 范数下的距离可以大到 $2$——它们把盒子的上半层和下半层都填满了，谁也没往谁身边靠。

缺的那一条是**等度连续**：整族函数共用一个连续模，不存在某一条越来越陡。一致有界管住高度，等度连续管住陡峭；两条一起上，函数族就被压成一个"近似有限维"的对象，Bolzano–Weierstrass 立刻复活——这正是第 75 课紧算子的思维方式，只是这回被压的对象是函数本身。

## 3. 正式定义

设 $K$ 是紧度量空间（闭区间 $[a,b]$ 就是最常用的样子），函数族 $\lbrace f_n\rbrace\subset C(K)$，即每条 $f_n$ 都连续。

**定义一（一致有界）**：存在常数 $M$，使得

$$\sup_{n\ge 1}\ \sup_{x\in K}|f_n(x)|\le M.$$

**定义二（等度连续）**：对每个 $\varepsilon>0$，存在 $\delta>0$，使得对**一切** $n$ 和一切 $x,y\in K$，

$$|x-y|<\delta\ \Longrightarrow\ |f_n(x)-f_n(y)|<\varepsilon.$$

关键在于 $\delta$ 只依赖 $\varepsilon$：它与 $n$ 无关，也与 $x,y$ 无关。整族函数被同一个连续模管着。

**定理（Arzelà–Ascoli）**：若 $\lbrace f_n\rbrace$ 一致有界且等度连续，则存在子列 $f_{n_k}$ 在 sup 范数下一致收敛。

换个说法：一致有界 + 等度连续 $\iff$ 该函数族在 $C(K)$ 中**相对紧**——收敛子列是紧性许诺的，不是运气。

| 符号 | 名字 | 说明 |
| --- | --- | --- |
| $K$ | 紧度量空间 | 闭区间 $[a,b]$ 是最常见的样子；紧性是"有限覆盖"的保证 |
| $C(K)$ | 连续函数空间 | 配 sup 范数 $\lVert f\rVert_\infty=\sup_x\lvert f(x)\rvert$ 后完备 |
| $M$ | 一致有界常数 | 只和整族有关的一把高度尺，不随 $n$ 变 |
| $\delta$ | 等度连续模 | 由 $\varepsilon$ 决定、对全族通用的最小间距 |
| 相对紧 | relative compact | 闭包是紧集；在 $C(K)$ 里等价于任意序列有收敛子列 |

**姊妹结论（Stone–Weierstrass）**：若子代数 $A\subset C(K)$ 含有常数函数、且能分离 $K$ 上的点（任给 $x\ne y$，存在 $f\in A$ 使 $f(x)\ne f(y)$），则 $A$ 在整个 $C(K)$ 中稠密。它回答的是"能不能用简单函数逼近一切连续函数"，与 Arzelà–Ascoli 的"能不能抽出收敛子列"是一对分工：一个管逼近的**密度**，一个管收敛子的**存在**。

## 4. 分步例题

**例 1（正面教材）**：$f_n(x)=\dfrac{\sin(nx)}{n}$ 在 $[-\pi,\pi]$ 上。

1. **一致有界**：$|f_n(x)|=\lvert\sin(nx)\rvert/n\le 1/n\le 1$，取 $M=1$；
2. **等度连续**：由 $|\sin u-\sin v|\le|u-v|$（正弦的 Lipschitz 常数是 1），
$$|f_n(x)-f_n(y)|\le \frac{n|x-y|}{n}=|x-y|;$$
   于是取 $\delta=\varepsilon$ 就对**所有** $n$ 通用；
3. **两个条件齐了**，定理保证存在一致收敛子列；
4. **顺手把答案算全**：$\sup_x|f_n(x)|=1/n\to0$，其实整条序列本身就一致收敛到 $0$，连子列都不用挑。条件是够用的，不是够紧的。

**例 2（反例：有界但没有子列）**：$g_n(x)=\sin(nx)$ 在 $[-\pi,\pi]$ 上。

1. **一致有界**：$|g_n(x)|\le 1$，高度被框得死死的；
2. **不等度连续**：取 $x=\dfrac{\pi}{2n}$、$y=0$，则 $|x-y|=\dfrac{\pi}{2n}$，而 $|g_n(x)-g_n(y)|=1$。对任意给定的 $\delta>0$，只要 $n>\dfrac{\pi}{2\delta}$ 就会破防——没有一个 $\delta$ 能对全族生效；
3. **没有一致收敛子列**：任何子列的 sup 距离都下不去，因为振幅始终是 $1$；
4. **结论**：光框高度只能保证"在盒子里"，不能保证"互相靠近"。等度连续就是那道缺口的名字。

**例 3（逐点收敛也救不了）**：$h_n(x)=x^n$ 在 $[0,1]$ 上。

1. 一致有界：$0\le h_n(x)\le 1$；
2. 逐点收敛：$x<1$ 时 $x^n\to0$，$x=1$ 时恒为 $1$，极限函数有跳变；
3. 不一致：$\sup_x|h_n(x)-h(x)|=1$ 恒成立（$x\to1^-$ 那一段永远在最慢处卡着）；
4. 不等度连续：$h_n'(x)=nx^{n-1}$，在 $x=1$ 附近斜率达到 $n$，随 $n$ 无限变陡。
   逐点收敛只对每个**固定的** $x$ 负责，而一致收敛要对**最慢的那个** $x$ 负责。

## 5. 动手实验

### 实验 1（viz）：一致收敛长什么样

```viz
{
  "type": "uniform-convergence-zoom",
  "title": "sin(nx)/n 压向 0：全域最慢点也在降",
  "mode": "sin",
  "n": 10,
  "probe": 1
}
```

蓝线是 $f_n(x)=\sin(nx)/n$，橙虚线是极限 $0$。拖动紫色探针，再拖 $n$ 滑块：探针读数随位置变化，但**全域最大值**（sup）恰好是 $1/n$，n 一大它就整体塌下去。对照例 2 的 $\sin(nx)$——把公式里的 $1/n$ 抹掉，振幅就永远停在 1。

### 实验 2（viz）：一致误差由最慢点决定

```viz
{
  "type": "uniform-convergence-zoom",
  "title": "几何部分和：单点误差小，不代表全域误差小",
  "mode": "power",
  "n": 8,
  "probe": 0.2
}
```

这一族是 $\dfrac{1-x^{n+1}}{1-x}$，在 $|x|<0.9$ 内逼近 $\dfrac{1}{1-x}$。把探针拖到 0 附近，单点误差几乎看不见；拖到 0.9 附近，误差由那里决定。**一致收敛看的是全场最差的那一点**，不是你在看的那一点——这就是 sup 范数存在的理由。

### 实验 3（python）：把"抖"量化出来

```python title="一致误差与等度连续模"
import math

N = 120                                            # 采样段数：把 [-π, π] 切成 120 段
step = 2 * math.pi / N                             # 每段宽度（约 0.0524）
xs = [-math.pi + step * i for i in range(N + 1)]   # 等距采样点，覆盖整个区间
h = 3 * step                                       # 检验“等度连续”用的固定位移

def sup_norm(n):
    # 族 f_n(x) = sin(n x)/n 在网格上的最大绝对值，也就是它到极限 0 的一致误差
    worst = 0.0
    for x in xs:
        v = abs(math.sin(n * x) / n)
        if v > worst:
            worst = v
    return worst

def max_jump(n, normalize):
    # 固定位移 h 上的最大跳跃 |f(x+h) − f(x)|；等度连续要求它对所有 n 一起小下去
    worst = 0.0
    for x in xs:
        if x + h <= math.pi:
            if normalize:
                jump = abs(math.sin(n * (x + h)) / n - math.sin(n * x) / n)
            else:
                jump = abs(math.sin(n * (x + h)) - math.sin(n * x))
            if jump > worst:
                worst = jump
    return worst

for n in [1, 5, 10]:
    print(n, round(sup_norm(n), 3), round(max_jump(n, True), 3), round(max_jump(n, False), 3))
```

四列数字依次是 $n$、归一化族的一致误差、归一化族的最大跳跃、未归一化族的最大跳跃：

```
1 1.0 0.157 0.157
5 0.2 0.152 0.759
10 0.1 0.137 1.366
```

第二列精确地按 $1/n$ 掉落。第三列在 $0.157\to0.152\to0.137$ 之间基本**平着走**——整族共用一个连续模，这就是等度连续。第四列却是 $0.157\to0.759\to1.366$ 一路暴涨：未归一化的 $\sin(nx)$ 越来越陡，等度连续在第一列就断了。同一段代码，左边是定理的正面、右边是反例。

## 6. 常见误区

:::warning[常见误区]

**误区一**："你以为只要函数族一致有界，就能抽出收敛子列。" 其实 $g_n(x)=\sin(nx)$ 一致有界却做不到。高度被框住只说明大家待在同一个盒子里，盒子可以同时容纳一整个上下晃动的家族。

**误区二**："你以为每条函数都连续就够了，等度连续是多余的。" 其实"每条都连续"里的 $\delta$ 允许**逐条不同**，$x^n$ 就是这么溜过去的：每条都连续，可在 $x=1$ 附近的陡峭程度随 $n$ 无界。等度连续把 $\delta$ 收成全族共用，堵的正是这个洞。

**误区三**："你以为逐点收敛能顶替一致收敛。" 其实逐点收敛只对每个固定的点负责，一致收敛要对全域最慢点负责。$h_n(x)=x^n$ 逐点收敛到 $0$（除 $x=1$），sup 误差却永远是 $1$——在数值分析里，"能算"和"算得稳"的差别就在这里。

:::

## 7. 练习

给 $\dfrac{\sin(nx)}{n}$ 做一次"体检"，算出它的一致误差上界与 Lipschitz 上界。代码能跑，但两处都漏算了 $1/n$ 这个归一化因子：

```exercise
# @title: 练习：给 sin(n x)/n 做等度连续体检
# @check: sup_norm=0.2
# @check: lip=1.0
# @hint: 振幅在 x=π/(2n) 处取到，值是 1/n；求导 (sin(nx)/n)' = cos(nx)，绝对值最大只有 1——它不随 n 增长，这正是等度连续。
import math

n = 5
peak = math.pi / (2 * n)               # sin(n x) 第一次取到峰值的位置
sup_norm = math.sin(n * peak)          # ← 归一化因子 1/n 漏掉了
print("sup_norm=" + str(round(sup_norm, 4)))

lip = float(n)                         # ← 求导时把 1/n 一并丢了
print("lip=" + str(round(lip, 4)))
```

<details>
<summary>点开查看逐步解答</summary>

峰值处的函数值是 $\left|\sin\left(n\cdot\frac{\pi}{2n}\right)\right|=\sin\frac{\pi}{2}=1$，再除以 $n$ 才是振幅上界，所以 `sup_norm` 要写成 `math.sin(n * peak) / n`，得到 $1/5=0.2$。

斜率上界来自链式法则：

$$\left(\frac{\sin(nx)}{n}\right)'=\frac{n\cos(nx)}{n}=\cos(nx),\qquad |\cos(nx)|\le 1.$$

所以 `lip` 应当直接取 `1.0`——它**与 n 无关**，这正是等度连续的标志。修好后两行输出 `sup_norm=0.2` 与 `lip=1.0`。

```py
n = 5
peak = math.pi / (2 * n)
sup_norm = math.sin(n * peak) / n
print("sup_norm=" + str(round(sup_norm, 4)))

lip = 1.0
print("lip=" + str(round(lip, 4)))
```

作为对照，若把归一化整个抹掉、只留 $\sin(nx)$，斜率上界就是 $n$，随 $n$ 无限增长——例 2 的破防点。

</details>

**趁热打铁**：

```quiz
Arzelà–Ascoli 除了一致有界，还要求函数族具备什么性质？
- 每个函数都可导
- 等度连续：整族共用一个连续模 [*]
- 函数的个数必须有限
? sin(nx) 一致有界却没有收敛子列，问题出在它越来越陡；等度连续要求存在对所有 n 通用的 delta，这才能把族压成近似有限维的对象。
```

## 8. 选读：对角线法为什么能抽出子列

<details>
<summary>选读 · Arzelà–Ascoli 的证明骨架</summary>

先把紧区间 $K$ 筛出一列可数稠密点 $q_1,q_2,q_3,\dots$（闭区间上取有理数就够）。

**第一层（对角线法）**：一致有界让每个点上的数列 $\lbrace f_n(q_1)\rbrace$ 有界，于是能挑出子列在 $q_1$ 处收敛。在这个子列里再挑一层子列，让它在 $q_2$ 处也收敛……把第 $k$ 层子列的第 $k$ 项排成一列，就得到一条在**所有** $q_j$ 上都收敛的"对角线子列" $f_{n_k}$。

**第二层（等度连续把点收敛升级成一致收敛）**：给定 $\varepsilon>0$，等度连续给出全族通用的 $\delta$。用有限个 $\delta$-球覆盖 $K$（紧性的用武之地），取球心里的稠密点。因为对角线子列在这些稠密点上收敛，取 $N$ 足够大后，任意 $x$ 落在某个球心 $q_j$ 的 $\delta$-球内，于是

$$|f_{n_k}(x)-f_{n_\ell}(x)|\le\underbrace{|f_{n_k}(x)-f_{n_k}(q_j)|}_{<\varepsilon/3}+\underbrace{|f_{n_k}(q_j)-f_{n_\ell}(q_j)|}_{<\varepsilon/3}+\underbrace{|f_{n_\ell}(q_j)-f_{n_\ell}(x)|}_{<\varepsilon/3}<\varepsilon.$$

对 $x$ 取 sup 即得一致收敛。**等度连续专门负责把"每个点都收敛"翻译成"整段一起收敛"**。

</details>

<details>
<summary>选读 · Stone–Weierstrass：姊妹结论的口味</summary>

Arzelà–Ascoli 说"条件够了就能挑出收敛子列"，Stone–Weierstrass 说"足够丰富的简单函数能逼近一切连续函数"。后者的常用特例是魏尔斯特拉斯逼近定理：$[a,b]$ 上任意连续函数都能被多项式**一致**逼近——注意这里的"一致"正是 sup 范数下的意义。两条定理在数值分析里经常连用：先证明一族近似解相对紧（A–A），再用稠密性说明极限确实落在目标函数类里。

</details>

## 9. 下一站

函数族的紧性难题到这里告一段落。可还有一类对象连"函数"这个身份都拿不到——锤击、点电荷、瞬时脉冲全挤在一个点上，经典函数写不下它们。下一课给这些"广义函数"发合法身份证。

→ [分布初步](./90-distributions-intro.md)
