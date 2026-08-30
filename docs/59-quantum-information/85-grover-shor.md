---
title: Grover 与 Shor：量子加速的样板间
lesson_id: quantum-information/grover-shor
prereqs:
  - quantum-information/bloch-sphere
  - quantum-information/interference-hadamard
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
  - amplitude-amplification
  - grover-search
  - quantum-fourier-transform
  - shor-period-finding
applications:
  - quantum-computing
  - cryptography
exits:
  - quantum-information/teleportation-outlook
---

# Grover 与 Shor：量子加速的样板间

## 1. 从一个场景开始

第 34 章两次拉过警报：量子 Shor 算法一旦工程化，RSA 与椭圆曲线的"单向门"整体塌方。第 70 课的选读也预告过量子算法的三段式骨架——均匀叠加打底、相位悄悄标注、干涉收割答案。警报响了两章，机器本身却一直没开门。

本课把两台招牌机器请进样板间：**Grover**（在 N 件东西里找出那一件，$\sqrt N$ 步收工）与 **Shor**（把大数拆成因数，骨干是"找周期"）。它们共用一件 hidden 工具——把相位账变成可读答案的**量子傅里叶变换**。样板间只看骨架，完整工程（相位估计、纠错）留给下一程。

## 2. 直觉解释

**Grover 的两步舞**：N 张彩票里恰好一张中奖。先把全部 N 张压进均匀叠加 $\lvert s\rangle$——每张振幅 $\frac{1}{\sqrt N}$，谁也不多谁也不少。然后反复做两个动作：

1. **预言家翻脸**（Oracle）：中奖那张的振幅翻个负号——答案被贴上一枚看不见的负标签；
2. **对平均反射**（扩散）：把每个振幅替换成"两倍平均值减自己"。平均值被那枚负标签拉低了一点点，于是**其余所有张都微微缩水，中奖张独自变大**。

两个动作合起来，等价于把整体振幅朝目标方向**旋转一个固定角 $2\theta$**。转着转着，目标的概率就逐轮抬升——抬到顶就该收手（转过头会跌回去，见实验）。

**相位轮盘（QFT 的直觉）**：一个以周期 r 循环的信号，在傅里叶眼里是"转盘转速"——周期越短，轮盘转得越快。量子傅里叶变换把每个基矢换成一个匀速旋转的相位轮盘，让"藏在振幅里的周期"变成"能测出来的频率峰"。

**Shor 的赌局**：大数分解难，是难在"直接找因数"；换成"找 $a^x \bmod N$ 的循环周期 r"，经典计算机依旧束手无策，量子计算机却能用上面的相位轮盘把它读出来——周期一到手，几行 gcd 就收网。

## 3. 正式定义

**Grover 算子**：$G=(2\lvert s\rangle\langle s\rvert-I)\,O$，其中 $O$ 是翻目标相位的 Oracle，$2\lvert s\rangle\langle s\rvert-I$ 是对平均值的反射。记 $\theta$ 为均匀态与目标态的夹角，$\sin\theta=\frac{1}{\sqrt N}$，则 k 轮后命中概率为：

$$P(k)=\sin^2\bigl((2k+1)\theta\bigr),\qquad k^*\approx\frac{\pi}{4\theta}-\frac12\approx\frac{\pi}{4}\sqrt N$$

**量子傅里叶变换**：把第 j 个基矢换成一枚匀速轮盘（N 次单位根的均匀相位账）：

$$\lvert j\rangle\ \longmapsto\ \frac{1}{\sqrt N}\sum_k \exp\left(\frac{2\pi i\,jk}{N}\right)\lvert k\rangle$$

**Shor 骨架**（分解大数 N）：

1. 随机选与 N 互素的 $a$，用量子周期查找（QFT 当读数器）求 $a^x \bmod N$ 的周期 $r$；
2. 检查 $r$ 为偶数且 $a^{r/2}\not\equiv-1\pmod N$（不满足就换 $a$ 重来，成功率过半）；
3. $\gcd(a^{r/2}-1,\ N)$ 与 $\gcd(a^{r/2}+1,\ N)$ 大概率各自吐出一个真因数。

| 部件 | 名字 | 一句话职责 |
| --- | --- | --- |
| $O$ | Oracle | 给答案贴负号标签（相位标注） |
| $2\lvert s\rangle\langle s\rvert-I$ | 扩散算子 | 对平均作反射（振幅重新分配） |
| $\theta$ | Grover 角 | 每轮旋转量的一半：$\sin\theta=1/\sqrt N$ |
| QFT | 相位轮盘 | 周期换频率：把振幅里的循环读成峰 |
| $\gcd$ | 收网 | 周期到因数的最后一跳（第 10 章老工具） |

## 4. 分步例题

**例 1（N=4 一轮即中）**：目标 $\lvert11\rangle$，均匀态 $\frac12(1,1,1,1)^T$。

1. Oracle 翻脸：$\frac12(1,1,1,-1)^T$——标签贴上，肉眼还看不出谁中奖；
2. 算平均值：$\frac14(1+1+1-1)=\frac14$；
3. 扩散反射 $2\times\frac14-$各分量：得 $(0,0,0,1)^T$；
4. 读结果：全部振幅集中到 $\lvert11\rangle$，$P=1$。一轮锁定——因为 $N=4$ 时 $\theta=30^\circ$，均匀态离目标只有 $30^\circ$，一轮 $2\theta$ 的旋转正好走到 $90^\circ$ 正对面。

**例 2（Shor 拆 15）**：取 $a=2$。

1. 幂表：$2,4,8,1,2,4,8,1\pmod{15}$——循环节长度 $r=4$，恰好偶数；
2. 算半程：$a^{r/2}=2^2=4$，不等于 $-1\equiv14\pmod{15}$ ✓ 条件通过；
3. 收网：$\gcd(4-1,\ 15)=3$，$\gcd(4+1,\ 15)=5$——$15=3\times5$，分解完成；
4. 换 $a=7$ 复验：幂表 $7,4,13,1$ 周期仍是 4，$\gcd(48,15)=3$、$\gcd(50,15)=5$——殊途同归，骨架不挑底数。

## 5. 动手实验

横轴是 Grover 轮数 x，纵轴是目标态概率 $\sin^2((2k+1)\theta)$。滑块 a 就是 Grover 角 θ（由 N 决定）：默认 0.52 弧度 $\approx30^\circ$ 正是 N=4——曲线在 x=1 处顶到 1，一轮即中：

```viz
{
  "type": "plot",
  "title": "振幅放大：x 轮后的命中概率",
  "expr": "sin((2*x+1)*a)^2",
  "xmin": 0,
  "xmax": 12,
  "sliders": [
    { "name": "a", "min": 0.05, "max": 0.6, "step": 0.01, "value": 0.52 }
  ]
}
```

拖小滑块（N 变大、θ 变小）：峰顶右移、变矮变缓——$O(\sqrt N)$ 的轮数账画在图上。再注意 N=4 的曲线在 x=2 处**跌回 0.25**：转过头会过冲，Grover 不是轮数越多越好。

相位轮盘单独展品：滑块 f 是频率，f 越大轮盘转得越急——周期 r 的信号在 QFT 眼里就是某个特定的 f：

```viz
{
  "type": "plot",
  "title": "相位轮盘：频率 f 决定转速",
  "expr": "cos(2*pi*f*x)",
  "xmin": 0,
  "xmax": 6,
  "sliders": [
    { "name": "f", "min": 0.25, "max": 2.5, "step": 0.25, "value": 1 }
  ]
}
```

### 实验 1（python）：N=4 的两个反射

```python title="Oracle 翻脸 + 扩散反射，逐轮记账"
def oracle(v):       # 黑箱预言家：目标（最后一格）振幅翻负号
    return [v[0], v[1], v[2], -v[3]]

def diffuse(v):      # 扩散算子：2×平均 - 各分量（对平均作反射）
    m = (v[0] + v[1] + v[2] + v[3]) / 4
    return [2 * m - v[0], 2 * m - v[1], 2 * m - v[2], 2 * m - v[3]]

v = [0.5, 0.5, 0.5, 0.5]     # 均匀叠加 |s>：四张彩票振幅全等
for k in range(4):
    print(f"第{k}轮后  目标概率={round(v[3] ** 2, 2)}")
    v = diffuse(oracle(v))
```

输出 $0.25,\ 1.0,\ 0.25,\ 0.25$：一轮封顶，第二轮**跌回**——与 viz 曲线互相印证。封顶后继续转，概率在 0.25 与 1 之间打摆，这就是"轮数要掐准"的账面证据。

### 实验 2（python）：比特数翻倍，轮数只多一点

```python title="Grover 角、最优轮数与经典对照"
import math
# sliders: n_qubits=3 [2:6:1]

N = 2 ** n_qubits                      # 维数：乘法口诀（第 80 课）
theta = math.asin(1 / math.sqrt(N))    # Grover 角：均匀态与目标的夹角
kstar = round(math.pi / (4 * theta) - 0.5)   # 最优轮数（四舍五入取整）
p_hit = math.sin((2 * kstar + 1) * theta) ** 2
print(f"N={N}  Grover 角={round(math.degrees(theta), 2)} 度")
print(f"最优轮数={kstar}  该轮命中率={round(p_hit, 4)}")
print(f"经典盲抽平均要试 {N / 2} 次")
```

拖动滑块：N=4 一轮 100%；N=8 两轮 94.5%；N=16 三轮 96.1%；N=64 也只要 6 轮（99.7%）——而经典盲抽平均要试 32 次。**轮数按 $\sqrt N$ 慢悠悠走，经典步数按 N 翻倍狂奔**：这就是搜索加速的全部秘密，不玄，就是几何。

### 实验 3（python）：Shor 的周期归约骨架

```python title="幂表找周期，gcd 收网"
import math

N = 15
a = 2                        # 与 N 互素的底数
x = 1
row = ""
for e in range(1, 9):
    x = (x * a) % N          # %：取余（第 10 章）；模幂的递推一条
    row = row + f"{x} "
print(f"{a} 的幂 mod {N}：", row)

r = 4                        # 从幂表读出的循环节长度
print("gcd(a^(r/2)-1, N) =", math.gcd(2 ** 2 - 1, N))
print("gcd(a^(r/2)+1, N) =", math.gcd(2 ** 2 + 1, N))
```

幂表 $2\ 4\ 8\ 1\ 2\ 4\ 8\ 1$ 明晃晃写着周期 4；两行 gcd 吐出 3 和 5。真正的量子步骤只有"读出周期"这一步（大 N 时靠 QFT 相位轮盘）——余下的归约与收网全是经典小数运算。把 `a` 改成 7 再跑：幂表变 $7\ 4\ 13\ 1$，答案仍是 3 和 5。

### 快问快答

```quiz
N=4 时 Grover 为什么一轮就把命中概率顶到 1？
- 因为量子计算机同时试了 4 张彩票，自然一次命中
- 因为均匀态离目标只差 30 度，一轮 2θ 的旋转正好转到正对面 [*]
- 因为 Oracle 把错误彩票全部删掉了
? θ = asin(1/2) = 30°，均匀态与目标夹角 30°，两步反射合计旋转 60°……精确账是 sin²((2·1+1)·30°) = sin²90° = 1。Oracle 从不删除任何选项，它只贴相位标签，删除动作由干涉完成。
```

:::warning[常见误区]

**误区一**："你以为量子搜索一步就中。" 均匀叠加只是把 N 张彩票压进一个状态，读取仍是一次测量；加速的真身是 $\sqrt N$ 轮的振幅旋转。N=4 是"轮数=1"的特例，别把样板间当全部户型。

**误区二**："你以为轮数越多越保险。" 实验 1 的第三行就是反例：转过峰顶概率跌回 0.25。最优轮数 $k^*\approx\frac{\pi}{4}\sqrt N$ 是要掐着表走的——这在算法里是特性不是缺陷。

**误区三**："你以为 Shor 已经终结了 RSA。" 样板间拆的是 15；真实攻破 2048 位 RSA 需要上百万物理量子比特与全链路纠错（第 45 课的退相干正是头号反派）。第 34 章的后量子迁移今天仍在施工，警报归警报，工期归工期。

:::

## 6. 练习

**练习 1**：初始代码把振幅放大当成了"每轮线性攒概率"，能跑但账全错——修成旋转公式：

```exercise
# @title: 练习：把线性攒概率修成旋转放大
# @check: 0 0.25
# @check: 1 1.0
# @check: 2 0.25
# @check: 3 0.25
# @hint: Grover 的账是几何账：每轮振幅朝目标转 2θ，k 轮后命中概率是 sin((2k+1)θ) 的平方；θ = asin(1/√N) 已备好。
import math

theta = math.asin(1 / math.sqrt(4))   # N=4 的 Grover 角：30°

for k in range(4):
    p = k / 4          # ← 错在这：概率不是线性攒出来的，是振幅旋转出来的
    print(k, round(p, 2))
```

修好后的四行——$0.25,\ 1.0,\ 0.25,\ 0.25$——正是实验 1 逐轮模拟的同款读数：两条路（向量模拟与旋转公式）对的是同一本账。

<details>
<summary>练习 1 解法</summary>

```python
import math

theta = math.asin(1 / math.sqrt(4))

for k in range(4):
    p = math.sin((2 * k + 1) * theta) ** 2
    print(k, round(p, 2))
```
</details>

**练习 2**：N=16 时最优轮数是 3（命中率约 0.961）。不看实验、只用旋转公式解释：如果贪心转到第 4 轮，命中率变成多少？这说明什么？

<details>
<summary>点开查看逐步解答</summary>

$N=16$ 时 $\theta=\arcsin\frac14\approx14.48^\circ$。第 4 轮的概率是 $\sin^2(9\theta)=\sin^2(130.3^\circ)\approx0.582$——比第 3 轮的 0.961 **跌掉近四成**。完整阶梯是 $0.063\to0.473\to0.908\to0.961\to0.582\to0.125$：振幅是个不会停的旋转，过峰顶就下坡。这说明 Grover 的轮数必须**按 $\sqrt N$ 预先算好**，不能靠"多转几轮保险"——它是全书中少见的"做多了反而错"的算法，也是干涉双刃剑的诚实一面。
</details>

## 7. 选读：相位轮盘怎么把周期读成峰

<details>
<summary>选读 · QFT 的一页直觉</summary>

设寄存器装满 $a^x \bmod N$ 的循环节（周期 r）。对它做 QFT，相当于让每个基矢轮流当"转速探针"：周期 r 的成分与转速 $\frac{N}{r}$ 的轮盘**同频**，各探针的振幅在该频率处同相叠加——干涉把峰立起来；转速差半拍的探针则互相绞杀（第 70 课的三段式在此完整重演）。测量一次，就以高概率读到一个接近 $\frac{N}{r}$ 的整数，再用连分数（数论小工具）锁定 $r$。整套动作与卷四的离散傅里叶变换是同一枚硬币：[离散傅里叶变换](../16-fourier/65-dft.md)在经典世界里把信号拆成频率，QFT 在量子世界里把振幅里的周期拆成可测的峰——区别只在于，$2^n$ 维的变换在量子机上只花多项式个门。至于"求 $a^x\bmod N$ 的周期"为什么等价于"求分解"，例 2 的三步归约就是全部骨架；工程化的完整版还要配上相位估计与误差纠正，那是下一程的门票。

</details>

## 8. 下一站

两台机器的共同底牌看清楚了：**空间翻倍给戏台，干涉当导演**。下一课把整章的零件当场组装一回——隐形传态如何只用两条经典短信加一对贝尔对，把未知状态原样寄往远方，顺便望一眼量子机器学习的大门。

→ [应用展望：隐形传态选讲与量子机器学习接口](./90-teleportation-outlook.md)
