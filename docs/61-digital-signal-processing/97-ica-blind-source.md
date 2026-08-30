---
title: ICA 与盲源分离：鸡尾酒会上挑声音
lesson_id: digital-signal-processing/ica-blind-source
prereqs:
  - digital-signal-processing/convolution-lti
  - linalg-advanced/eigenvalues
volume: 5
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: research-elective
difficulty: 5
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - cocktail-party-problem
  - centering-whitening
  - non-gaussianity-kurtosis
applications:
  - eeg-artifact-removal
  - audio-source-separation
exits:
  - engineering
  - data-ai
---

# ICA 与盲源分离：鸡尾酒会上挑声音

## 1. 从一个场景开始

喧闹的婚礼现场，你却能隔着人群听清对面朋友的每一句话——听觉系统的这项绝活叫「鸡尾酒会效应」。工程师想要机器也会：两支麦克风摆在房间里，各自录到的都是**两个人说话的混合**；不知道混音比例、没有原始音轨，要把两个人拆开。这类「连混料配方都是秘密」的问题统称**盲源分离**（Blind Source Separation），本课的主角 ICA（独立成分分析）是它最经典的解法。上一课的伪迹地图里已经预告过：眨眼与大脑节律在频率上抱团，滤波这把按频率切的刀分不开它们——按「源」切的刀，正是本课要磨的这一把。

先说清楚为什么老工具不够用。上一章的 FFT/DCT 会把每路录音翻译成频率配方——但配方里两个人的声音已按未知比例揉在一起，谱面上根本分不出「哪根柱子属于谁」。去相关的经典招 PCA（第 21 章）也只保证输出通道互不相关，而互不相关 ≠ 各自完整。盲源分离要赌的是一条更深的统计规律。

## 2. 直觉解释

把任务想成**从混音带里倒推分轨**。录音棚里两条原始轨各自音量起伏自由；mixing 台把它们线性叠加成两路成品。反推这场「猜分轨」游戏只有两条线索：

1. **混合是线性的**：每路成品都等于各源按固定系数加权求和；
2. **源之间彼此独立**：说话人甲说什么与乙说什么毫无关系。

第二条才是真正的魔法。中心极限定理告诉我们：不管两个源的分布长什么样，把它们搅在一起，混合信号会比任何一路**更像钟形曲线**——大量独立分量相互抵消之后，极端值被抹平了。于是分离方向上有一个清晰的灯塔：

> **沿着正确方向切开的分轨最不像高斯分布；越接近正确的拆法，投影越「怪」。**

衡量「怪」最方便的尺子是**峰度**（kurtosis）：比正态更尖更重的分布（如脉冲串）峰度为正、更平更散的为负。FastICA 这类算法做的事，就是在白化后的空间里不断旋转坐标轴，找到让某路输出的峰度绝对值最大的角度——收敛了，轴就对着某条真实的分轨。

与 PCA 划清界限一句话：**PCA 找方差最大的方向（二阶统计），ICA 找最不像高斯的方向（四阶及以上统计）；前者只要求不相关，后者押注独立。**

## 3. 正式定义

模型只有一行：设 $N$ 个时刻的观测 $\mathbf{x}_t \in \mathbb{R}^2$ 由两个独立源线性混合而成，

$$\mathbf{x}_t = A\,\mathbf{s}_t, \qquad A \text{ 为未知的可逆混合矩阵}$$

目标是只凭观测序列估出一个分离矩阵 $W$，使 $\hat{\mathbf{s}}_t = W\mathbf{x}_t$ 尽量还原 $\mathbf{s}_t$。求解的三步流水线：

| 步骤 | 操作 | 作用 |
| --- | --- | --- |
| 中心化 | 每路减去自身均值 | 把混合平移回原点，均值不再捣乱 |
| 白化 | 用协方差矩阵的特征分解把数据变到各向同性（协方差为单位阵） | 剩下的全部自由度只剩一个「旋转角」，且用第 21 章特征值的老工具即可完成 |
| 非高斯性搜索 | 在白化平面里旋转探测轴，最大化输出峰度的绝对值 | 锁定分离方向；FastICA 用不动点迭代加速，本课用网格扫描演示同一目标 |

## 4. 分步例题

最小的「零相关却不独立」标本，四个数据点手算就透：取 $(x, y)$ 依次为 $(1,0), (0,1), (-1,0), (0,-1)$——绕单位圆一圈。

**第 1 步 · 相关性体检通过**：$\bar x=\bar y=0$；$\sum xy = 0$，协方差非对角为 $0$；对角 $\sum x^2 / 4 = 1/2$——两路完美去相关，PCA 到此收工并宣布胜利。

**第 2 步 · 高阶体检抓包**：算四次组合 $E[x^2y^2]$：四个点的 $x^2y^2$ 全是 $0$，故其值为 $0$；而 $E[x^2]\,E[y^2] = \frac12 \times \frac12 = \frac14$。若真独立，两者应相等——差了整整 $\frac14$，独立性当场穿帮。

**第 3 步 · 读数含义**：「不知道半径便知道不了角度」正是相依结构的指纹：知道了其中一路在哪，另一路的取值范围立刻被限死。这一步就是下一节判题练习里那把四次矩的量尺。

结论记牢：**相关性是二阶手术刀，只能切开球对称的账；独立性埋在更深阶的矩里。**

## 5. 动手实验

### 实验 1（viz）：源库里的一路信号是怎么攒出来的

```viz
{
  "type": "sines",
  "title": "三根正弦摞出一对方波棱角的源",
  "terms": [1, 3, 5]
}
```

频率成倍叠加会让和越来越像方波——分离实验里的「方波源」就是这样一款棱角分明、远离高斯的波形；它尖尖的双值直方图正是峰度为负（双峰分布）的原因。

### 实验 2（viz）：转出「最不 frontal」的投影角

上一节说「白化后转一转，让投影的峰度最大」，这枚组件把那句话搬上滑块。**怎么玩**：拖 angle，看散点云绕着圆心转——转到某个角度附近，原本糊成一团的点会突然裂成两条清晰的斜线，那就是两股源各自的方向；下方那条 |kurtosis| 曲线会同步告诉你此刻的投影离高斯有多远，虚线标出全角扫描找出的最优角。把 angle 停在混合方向上，读数的 |kurtosis| 会趴到接近 0（投影趋近高斯，正是 §3 说的中心极限效应）；转到最优角，|kurtosis| 立刻窜上去，读数提示「已对准」。mix 旋钮决定了两股源按什么比例搅在一起——mix 越接近 0，混合越轻，散点一开始就越接近分离态。对照实验 3：viz 让你看见「转哪个角」，Python 负责把每一步的峰度算给你看。

```viz
{
  "type": "ica-rotate",
  "title": "白化后旋转：峰度最大处即源方向",
  "mix": 0.6,
  "n": 400
}
```

### 实验 3（python）：中心极限定理的骰子账

多枚 ±1 骰子逐枚相加，精确枚举全部组合，看峰度如何一步步爬向 0（高斯）：

```python title="枚举骰子之和的超额峰度"
def dice_kurt(m):                # m 枚 ±1 骰子之和的分布峰度
    hist = [1]                   # 直方图：hist[i] 是「和为 i-m」的组合数
    for d in range(m):
        nxt = [0] * (len(hist) + 2)   # 新直方图比旧的宽两格
        for i in range(len(hist)):
            nxt[i] += hist[i]         # 这枚骰子取 -1
            nxt[i + 2] += hist[i]     # 这枚骰子取 +1
        hist = nxt
    total = 2 ** m                 # 全部组合总数
    mean = sum(i * hist[i] for i in range(len(hist))) / total - m  # 一阶矩
    var = 0                        # 二阶中心矩
    fourth = 0                     # 四阶中心矩
    for i in range(len(hist)):
        dv = i - m - mean
        var += hist[i] * dv ** 2
        fourth += hist[i] * dv ** 4
    var /= total
    fourth /= total
    return fourth / (var ** 2) - 3   # 超额峰度定义

for m in [1, 2, 3, 6]:           # 1 枚最负，越加越靠近 0
    print(f"{m}枚骰子 峰度: {round(dice_kurt(m), 1)}")
```

打印结果（正文引用）：`1枚骰子 峰度: -2.0`、`2枚: -1.0`、`3枚: -0.7`、`6枚: -0.3`——每加一枚骰子就往 0 挪一步。反过来读：**混合趋于平庸，分离就要找「最不平庸」**。

### 实验 4（python）：峰度罗盘——把方波从混合里拧出来

64 点数据：源为周期 16 的方波与周期 6 的中心化三角波，按固定矩阵混合后走完「中心化 → 白化 → 旋转搜峰」全流程（随机扰动一律不用，输出完全确定；关键数字都用放大取整的整数打印，避免浮点尾巴误导）。

```python title="两麦克风的盲源分离：白化 + 峰度罗盘"
import math                       # sqrt / cos / sin / pi / atan2 都靠它
import matplotlib.pyplot as plt   # 画图库

SQ = []                           # 源 1：周期 16 的方波
TRI = []                          # 源 2：周期 6 的中心化三角波
for j in range(64):
    SQ.append(1 if j % 16 < 8 else -1)
    tri = [0, 1, 2, 3, 2, 1][j % 6]
    TRI.append(tri - 1.5)

A = [[0.7, 0.9], [0.8, 0.6]]      # 未知的「房间混音矩阵」假装保密
X = [[], []]                      # 两支麦克风的录音
for j in range(64):
    X[0].append(A[0][0] * SQ[j] + A[0][1] * TRI[j])
    X[1].append(A[1][0] * SQ[j] + A[1][1] * TRI[j])

for r in range(2):                # 第一步：中心化
    mu = 0                        # 该道的样本均值
    for v in X[r]:
        mu += v
    mu /= len(X[r])
    for j in range(len(X[r])):
        X[r][j] -= mu

cov = [[0.0, 0.0], [0.0, 0.0]]    # 第二步：协方差矩阵
for r in range(2):
    for q in range(2):
        s = 0.0
        for j in range(64):
            s += X[r][j] * X[q][j]
        cov[r][q] = s / 64
off_ints = [int(cov[0][0] * 100), int(cov[0][1] * 100),
            int(cov[1][0] * 100), int(cov[1][1] * 100)]   # 放大一百倍取整，躲开浮点小尾巴
print(f"协方差放大百倍取整 [[{off_ints[0]}, {off_ints[1]}], [{off_ints[2]}, {off_ints[3]}]]")

phi = 0.5 * math.atan2(2 * cov[0][1], cov[0][0] - cov[1][1])   # 特征向量角度
eig_phi = phi                      # 较大特征值对应的方向角
eig_ort = phi + math.pi / 2
V = [[math.cos(eig_phi), math.sin(eig_phi)],
     [math.cos(eig_ort), math.sin(eig_ort)]]
lam = [cov[0][0] * V[0][0] ** 2 + 2 * cov[0][1] * V[0][0] * V[0][1] + cov[1][1] * V[0][1] ** 2,
       cov[0][0] * V[1][0] ** 2 + 2 * cov[0][1] * V[1][0] * V[1][1] + cov[1][1] * V[1][1] ** 2]

W = [[0.0, 0.0], [0.0, 0.0]]      # 白化矩阵 W = diag(1/sqrt(lam)) · V^T 的展开
for r in range(2):
    for c in range(2):
        W[r][c] = V[r][c] / math.sqrt(lam[r])
Z = [[], []]                       # 白化后的数据，两维各向同性
for j in range(64):
    for r in range(2):
        s = W[r][0] * X[0][j] + W[r][1] * X[1][j]
        Z[r].append(s)

def proj(u0, u1):                  # 探测轴上的投影
    return [u0 * Z[0][j] + u1 * Z[1][j] for j in range(64)]

def kurt(vals):                    # 样本超额峰度
    n = len(vals)
    m = sum(vals) / n
    v = 0.0
    f = 0.0
    for x in vals:
        d = x - m
        v += d * d
        f += d ** 4
    return f / n / ((v / n) ** 2) - 3

best_deg = None                    # 第三步：罗盘粗扫
best_k = None
for deg in range(180):
    k = kurt(proj(math.cos(deg * math.pi / 180), math.sin(deg * math.pi / 180)))
    if best_k is None or abs(k) > abs(best_k):
        best_k = k
        best_deg = deg
for t in range(-30, 31):           # 再在 ±3 度内细化
    cand = best_deg + t * 0.1
    k = kurt(proj(math.cos(cand * math.pi / 180), math.sin(cand * math.pi / 180)))
    if abs(k) > abs(best_k):
        best_k = k
        best_deg = cand
print(f"罗盘指向 {round(best_deg)} 度（细化到 {round(best_deg, 1)}），该轴峰度 {round(best_k, 2)}")
orth_k = kurt(proj(math.cos((best_deg + 90) * math.pi / 180), math.sin((best_deg + 90) * math.pi / 180)))
print(f"正交轴峰度 x100 取整 = {int(orth_k * 100)}")
open_axis = kurt(proj(1.0, 0.0))   # 白化刚结束时默认的第一道
print(f"白化默认第一道峰度 x100 取整 = {int(open_axis * 100)}")
p_main = proj(math.cos(best_deg * math.pi / 180), math.sin(best_deg * math.pi / 180))
fig, axs = plt.subplots(1, 3, figsize=(11, 2.8))
axs[0].plot(SQ, color="steelblue"); axs[0].set_title("source: square", fontsize=8)
axs[1].plot(TRI, color="seagreen"); axs[1].set_title("source: triangle", fontsize=8)
axs[2].plot(p_main, color="tomato"); axs[2].set_title("recovered axis", fontsize=8)
plt.tight_layout()
plt.show()
```

运行后的关键打印（正文引用）：`协方差放大百倍取整 [[117, 99], [99, 91]]`；`罗盘指向 46 度（细化到 46.3），该轴峰度 -2.0`；`正交轴峰度 x100 取整 = -96`；`白化默认第一道峰度 x100 取整 = -64`。分离主轴上的投影与原始方波的相关系数绝对值约等于 1（小数点后六个 9）。第三方图的 recovered 轴与蓝色方波逐点同形——分离成功。

三个读数连成一个故事：**白化只负责「摆圆桌面」，它交给你的默认第一道是个不冷不热的视角（-64，距任何一条源轴都远）；两条真正的分轨安静地等在 46 度及其垂直线上——一条峰度直抵方波理论极值 -2.0，另一条 -0.96 正好对应平缓的三角波。峰度罗盘转这一格，整个棋盘就点亮了。**

### 快问快答

```quiz
白化完成后数据的协方差已经是单位阵，为什么还不能宣布两条输出就是独立源？
- 协方差阵变成单位阵等价于所有阶矩都解耦，所以已经独立
- 白化只抹掉二阶相关，更高阶的相依结构一点没动 [*]
- 因为白化会引入噪声
? 白化是不动高阶信息的线性变换：中心极限定理说不像高斯才可能是源，白化本身从不负责这一点。把「各向同性」误当「独立」正是本课练习要挖的坑。
```

## 6. 常见误区

:::warning[常见误区]

**误区一**：「去相关（不相关）就是独立。」
第 4 节的四点圆标本已经证伪：协方差干净归零，四次矩却差着一整个象限。相关只是相依关系里最容易被看见的那一层。

**误区二**：「既然要找非高斯，把输出削得越尖越好，峰度越大越好。」
方向没错但别只会单向发力：比正态「平」的分布（均匀类）峰度是负的，绝对值同样是指纹。实践中 FastICA 更爱用稳定的负熵近似，就是为了让正负两侧不吃亏。

**误区三**：「ICA 能把顺序、幅度、符号也一并定死。」
不能也不必：把某路乘以 −1 或整体换序，混合模型照样成立，这是问题天生的模糊性。工程里靠后处理约定（比如脑电里按是否盯着眨眼伪迹来人工贴标签）补齐语义。

:::

## 7. 练习

**练习 1（判题）**：下面代码拿四个圆环点做「独立性测试」。它能跑通，但判词不可信——修到三行输出全部命中为止：

```exercise
# @title: 练习：第四次矩揪出假独立
# @check: 协方差非对角（放大万倍取整） = 0
# @check: 四次检验量 = -0.125
# @check: 判词：二阶“零相关”是假象，高阶相依现形
# @hint: 第一行的 0 已经证明二阶账干净，别在那儿找事；盯住那行累计——按 E[X²Y²] 的定义，X 和 Y 是不是都得平方？现在只给了谁平方？
import math

XS = []                            # 绕单位圆均分的 16 个横坐标
YS = []
for j in range(16):
    ang = 2 * math.pi * j / 16
    XS.append(math.cos(ang))
    YS.append(math.sin(ang))

mx = sum(XS) / 16                  # 样本均值（理论上应为 0）
my = sum(YS) / 16
sxy = 0.0                          # 中心化后的叉积和
witness = 0.0                      # 四次检验量的分子累计
ex2 = 0.0                          # E[x^2]
ey2 = 0.0                          # E[y^2]
for j in range(16):
    dx = XS[j] - mx
    dy = YS[j] - my
    sxy += dx * dy
    witness += dx ** 2 * dy        # ← 问题在这：按 E[X^2·Y^2] 的定义，这里少平方了吗？
    ex2 += dx ** 2
    ey2 += dy ** 2
c01 = sxy / 16
wit = witness / 16 - (ex2 / 16) * (ey2 / 16)

print(f"协方差非对角（放大万倍取整） = {int(abs(c01) * 10000)}")
print(f"四次检验量 = {round(wit, 3)}")
if abs(wit) > 0.001:
    print("判词：二阶“零相关”是假象，高阶相依现形")
else:
    print("判词：查不出相依，白化即终点")
```

<details>
<summary>点开查看逐步解答</summary>

诊断思路：程序跑通且第一行就已输出 `协方差非对角（放大万倍取整） = 0`——去相关达标没问题。毛病出在四次量的算法上：按定义分子要累计的是 $x^2 y^2$（两个变量**各自平方后再相乘**），初始代码却写成 `dx ** 2 * dy`——只把 X 平方，Y 留了一次方，攒下的其实是 $\cos^2\theta\,\sin\theta$ 这类三次项；这种项绕单位圆一圈正负抵消、总和近乎 0，再被基准项 $E[x^2]\,E[y^2]=\tfrac14$ 一减，就打出 -0.25 冒充四次检验量，与真值相去甚远。

修正一行：把累加行改成 `witness += dx ** 2 * dy ** 2`。重跑三行输出依次为 `协方差非对角（放大万倍取整） = 0`、`四次检验量 = -0.125`、`判词：二阶“零相关”是假象，高阶相依现形`。

为什么恰好是 -0.125？单位圆上 $c^2s^2=\sin^2(2\theta)/4$，十六个均分点上 $E[x^2y^2]=1/8$，而 $E[x^2]E[y^2]=(1/2)(1/2)=1/4$，相减正好 $-1/8=-0.125$。这个四次量就是实践里「非高斯性」的最朴素化身——它与错误答案 `≈ 0` 之间的鸿沟，就是「白化」与「独立」之间的距离。

</details>

**练习 2（概念题）**：解释为什么「求平均取共振」式的 PCA 不能完成的任务，ICA 有机会完成；并用一句顺口溜记住分工。

<details>
<summary>点开查看逐步解答</summary>

参考说法：PCA 只沿「方差最大」排序方向，等于只读了协方差矩阵——那是二阶信息的天花板；当多个源被混合后，方差大小并不携带「谁是源」的地址。ICA 补的是高阶假设「源相互独立」，借助中心极限定理把分离转化为「找让投影最不像高斯的方向」，这才可能拆开方差上难分伯仲的分轨。顺口溜示例：**PCA 管排队（方差大小），ICA 管验血（高斯浓度）。**
</details>

## 8. 选读：负熵、不动点与它在脑电里的真实岗位

<details>
<summary>选读 · 从峰度罗盘到 FastICA 工业实现</summary>

峰度对离群点敏感是它的软肋：个别坏样本就能把读数拽偏。信息论给出更稳的「非高斯程度」尺子——负熵：一个分布在方差固定的前提下，高斯分布的熵最大，因此**负熵 = 高斯的熵减去自身的熵**恒非负，且任何偏离高斯的形状都会让它上涨。Hyvärinen 提出的 FastICA 算法把负熵换成一族光滑的非二次函数（如 $\log\cosh$），再用不动点迭代一次更新整列分离向量：

$$W \leftarrow E\left[\mathbf{x}\, g(W^\top \mathbf{x})\right] - E\left[g'(W^\top \mathbf{x})\right] W,\qquad \text{随后对 } W \text{ 施密特正交化}$$

几轮迭代即可收敛，且支持并行更新整列分量。它的临床岗位非常具体：EEG 记录常被眨眼、咬牙、心电三类伪迹污染，跑一遍 ICA 得到几十个独立成分，把「眨眼成分」（左额头通道权重巨大、时程与眨眼同步的那一支）置零后再逆变换回去，脑电信号立刻干净许多而不伤及alpha节律。本课的两维罗盘正是它缩微版的透明沙盘。

</details>

## 9. 下一站

至此数字信号处理的选讲支线全部打通：FFT 让你看清频域，DCT 教你压缩图像，小波带你在时间与频率间变焦，ICA 则从混音里讨回了分轨。主干线还没合拢——下一章把这些工具押上通信战场，把比特变成波形，再从噪声手里抢回来。

→ [第 62 章 · 通信系统](../62-communication-systems/index.md)
