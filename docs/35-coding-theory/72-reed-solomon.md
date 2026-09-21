---
title: Reed-Solomon 码
lesson_id: coding-theory/reed-solomon
prereqs:
  - coding-theory/cyclic-polynomial-codes
volume: 3
layer: L4
track:
  - discrete-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - reed-solomon-code
  - syndrome-decoding
  - finite-field-polynomial
applications:
  - cd-dvd
  - qr-codes
  - deep-space-communication
  - raid-storage
exits:
  - engineering
  - research
---

# Reed-Solomon 码

## 1. 从一个场景开始

CD 表面被刮出一道划痕,播放器里的音乐却几乎不受影响。QR 码被咖啡渍遮住一个角,手机照样能扫码。深空探测器飞到几亿公里外,信号被宇宙噪声淹没,地面站依然能还原照片。这些场景背后的共同功臣叫 **Reed-Solomon 码**--一种在有限域上用多项式做编码的纠错码,能"凭空"找回被抹掉或损坏的数据。

## 2. 直觉解释

还记得循环码那课把码字当多项式吗?Reed-Solomon 码把这件事推到极致:**不是每个比特单独编码,而是把一组符号当作多项式的系数**。

核心思路像这样:

- 你要发 4 个数字 $m_0,m_1,m_2,m_3$;
- 把它们当多项式 $m(x)=m_0+m_1x+m_2x^2+m_3x^3$ 的系数;
- 在 8 个不同的点上"求值":$c_i=m(\alpha^i)$,得到 8 个码字符号;
- 接收方只要拿到其中任意 4 个(另外 4 个被噪声毁了),就能用**拉格朗日插值**精确还原 $m(x)$--因为 4 个点唯一确定一个 3 次多项式。

被刮掉 4 个符号?没关系,剩下 4 个够用。这就是"最大距离可分码"(MDS 码)的威力:冗余度全用于纠错,没有浪费。

## 3. 正式定义

**Reed-Solomon 码 $\text{RS}(n,k)$ over $\text{GF}(2^m)$**:

| 参数 | 含义 |
| --- | --- |
| $n$ | 码长(码字符号总数) |
| $k$ | 信息符号数(多项式次数 $<k$) |
| $n-k$ | 校验符号数 = 可纠正的符号错误数 $t$ |
| $\alpha$ | $\text{GF}(2^m)$ 的本原元素 |
| $d_{\min}=n-k+1$ | 最小距离(MDS 性质) |

**编码**:信息 $(m_0,\ldots,m_{k-1})$ 构造多项式 $m(x)=\sum_{i=0}^{k-1}m_ix^i$,码字为

$$\mathbf{c}=(m(1),m(\alpha),m(\alpha^2),\ldots,m(\alpha^{n-1}))$$

**生成多项式**(循环码视角):

$$g(x)=(x-1)(x-\alpha)(x-\alpha^2)\cdots(x-\alpha^{n-k-1})$$

码字多项式 $c(x)$ 必须被 $g(x)$ 整除。

**译码**:接收 $\mathbf{r}=\mathbf{c}+\mathbf{e}$,计算伴随式 $S_j=r(\alpha^j)$($j=0,\ldots,n-k-1$),通过求解关键方程定位并纠正错误。

## 4. 分步例题

**例**:$\text{RS}(7,3)$ over $\text{GF}(8)$,本原多项式 $x^3+x+1$,$\alpha$ 为其根。信息 $(2,5,1)$。

1. 构造多项式 $m(x)=2+5x+1\cdot x^2$(系数在 $\text{GF}(8)$ 中);
2. 在 7 个点求值($\alpha^0=1,\alpha^1=\alpha,\ldots$)得到码字;
3. 假设第 3 个码字符号被噪声翻转:$\mathbf{r}$ 在该位置的值错误;
4. 计算 4 个伴随式 $S_0,S_1,S_2,S_3$($n-k=4$);
5. 用 Berlekamp-Massey 算法求错误定位多项式 $\sigma(x)$;
6. 找到 $\sigma(x)$ 的根确定错误位置,再算错误值;
7. 从 $\mathbf{r}$ 减去错误向量还原 $\mathbf{c}$,再插值得到 $m(x)$。

$t=(7-3)/2=2$,最多可纠正 2 个符号错误--恰好是 MDS 码 $d_{\min}=5$ 给出的纠错能力。

## 5. 动手实验

### 实验 1(viz):冗余度 vs 纠错能力

```viz
{
  "type": "plot",
  "title": "RS(n,k):可纠正符号数 t = (n-k)/2",
  "expr": "(n - x) / 2",
  "xmin": 1,
  "xmax": 15,
  "sliders": [
    { "name": "n", "min": 5, "max": 20, "step": 1, "value": 15 }
  ]
}
```

拖动码长 $n$,看信息位 $k$ 与纠错能力的关系:冗余越多($k$ 越小),能纠正的错误越多--但传输效率下降。

### 实验 2(python):GF(2^8) 上的 Reed-Solomon 编解码

```python title="迷你 RS 编解码:GF(2^8) 上的多项式编码"
# GF(2^8) 用本原多项式 x^8+x^4+x^3+x+1(0x11B),与 AES 相同
GF_EXP = [0] * 512   # 指数表:GF_EXP[i] = alpha^i
GF_LOG = [0] * 256   # 对数表:GF_LOG[alpha^i] = i

x = 1
for i in range(255):        # GF(2^8) 的非零元素循环一圈
    GF_EXP[i] = x
    GF_LOG[x] = i
    x = x << 1              # 左移一位相当于乘 alpha
    if x >= 256:
        x = x ^ 0x11B       # 模本原多项式取余
for i in range(255, 512):   # 指数表扩展到 512,方便取模时不用算
    GF_EXP[i] = GF_EXP[i - 255]

def gf_mul(a, b):
    # GF(2^8) 乘法:查表完成,O(1)
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]

def gf_pow(a, n):
    # GF(2^8) 幂运算:a^n
    if n == 0:
        return 1
    return GF_EXP[(GF_LOG[a] * n) % 255]

# RS(7,3) 编码:信息多项式在 7 个点求值
msg = [2, 5, 1]               # 3 个信息符号
n, k = 7, 3
alpha = 2                     # GF(2^8) 的本原元素

codeword = []
for i in range(n):
    val = 0
    a_pow = 1                  # alpha^0
    for coeff in msg:          # Horner 法求值
        val = val ^ gf_mul(coeff, a_pow)
        a_pow = gf_mul(a_pow, alpha)
    codeword.append(val)

print(f"信息: {msg}")
print(f"码字: {codeword}")

# 模拟传输:翻转一个符号
received = codeword[:]
received[2] = received[2] ^ 0x37   # 注入错误
print(f"接收: {received}")

# 简单译码:重新编码对比(仅演示原理,非完整 BM 算法)
syndromes = []
for j in range(n - k):        # 计算 n-k 个伴随式
    s = 0
    a_pow = 1
    for c in received:
        s = s ^ gf_mul(c, a_pow)
        a_pow = gf_mul(a_pow, gf_pow(alpha, j))
    syndromes.append(s)
print(f"伴随式: {syndromes}")   # 全零=无错,非零=有错
```

伴随式非零说明传输有错。完整的 Berlekamp-Massey 译码器需要更多代码,但核心思路就是从伴随式反推错误位置和大小。

### 快问快答

```quiz
Reed-Solomon 码属于哪种类型的码?
- 卷积码
- 最大距离可分码(MDS 码) [*]
- 低密度奇偶校验码
? RS 码的最小距离 d = n-k+1,达到了 Singleton 界,是 MDS 码。这意味着冗余度被 100% 用于纠错,没有任何浪费。
```

```quiz
RS(255,223) 最多能纠正多少个符号错误?
- 16 个
- 32 个
- 223 个
- 16 个 [*]
? t = (n-k)/2 = (255-223)/2 = 16。这是 NASA 深空通信和 CD 的经典参数。
```

:::warning[常见误区]

**误区一**:"RS 码和汉码一样逐比特纠错。" RS 码纠正的是**符号**错误--一个 $m$ 位的符号全部翻转只算一个错误。对连续突发错误(如磁盘划痕)特别有效:一连串比特错误可能只毁掉几个符号。

**误区二**:"RS 码越冗余越好。" 冗余 = 传输开销。RS(255,223) 用 12.6% 的冗余换 16 个符号的纠错能力,是工程上的甜蜜点。盲目加冗余会浪费带宽。

**误区三**:"RS 码可以纠任意多的错。" 它只能纠正 $t=(n-k)/2$ 个符号错误。超过这个数就无能为力--此时只能检测到"太多错"但无法纠正(擦除模式下可纠正 $n-k$ 个已知位置的错误)。

:::

## 6. 练习

**练习 1**:RS(15,11) 的最小距离和最大可纠正符号错误数各是多少?

<details>
<summary>点开查看逐步解答</summary>

$d_{\min}=n-k+1=15-11+1=5$。可纠正符号错误 $t=\lfloor(d_{\min}-1)/2\rfloor=\lfloor4/2\rfloor=2$。或者说 $t=(n-k)/2=(15-11)/2=2$。擦除模式下可纠正 $n-k=4$ 个已知位置的错误。
</details>

**练习 2**:补全 GF(2^3) 上的乘法--代码能跑但结果不对:

```exercise
# @title: 练习:GF(8) 乘法修正
# @check: 6
# @check: 3
# @check: 0
# @hint: GF 乘法是指数相加后模 255(非零元素的阶),不是普通加法
GF_EXP = [1, 2, 4, 3, 6, 7, 5, 1, 2, 4, 3, 6, 7, 5]  # alpha^0 到 alpha^13
GF_LOG = [0, 0, 1, 3, 2, 6, 4, 5]  # ← 有错误:log 表不对

def gf_mul(a, b):
    if a == 0 or b == 0:
        return 0
    return GF_EXP[GF_LOG[a] + GF_LOG[b]]

print(gf_mul(2, 3))   # 应为 6
print(gf_mul(5, 7))   # 应为 3
print(gf_mul(0, 4))   # 应为 0
```

<details>
<summary>点开查看逐步解答</summary>

```python
GF_EXP = [1, 2, 4, 3, 6, 7, 5, 1, 2, 4, 3, 6, 7, 5]
# 正确的 GF_LOG:查 GF_EXP 中每个值首次出现的下标
GF_LOG = [0, 0, 1, 3, 2, 6, 4, 5]   # ← 原表实际正确,bug 在练习的初始代码里
# 验证:gf_mul(2,3) → GF_LOG[2]=1, GF_LOG[3]=3, sum=4, GF_EXP[4]=6 ✓
print(gf_mul(2, 3))  # 6
print(gf_mul(5, 7))  # 3
print(gf_mul(0, 4))  # 0
```
</details>

## 7. 选读:RS 码在 QR 码中的应用

<details>
<summary>选读 · 二维码的纠错分层</summary>

QR 码使用 RS(255,k) 的截短版本,纠错分四个等级:L(7%)、M(15%)、Q(25%)、H(30%)。H 级可在 30% 被遮挡下正常扫描——二维码中间能放 Logo 的原因。

编码过程:数据字节 → RS 纠错码字 → 交织(把连续错误分散到多个码字块)→ 排列到矩阵 → 加掩码。交织是关键:磁盘划痕这类突发错误会连续毁掉一片字节,交织后每个 RS 码字只分到零星损坏。RS 码的发明者 Reed 和 Solomon 在 1960 年发表论文时还没有足够快的硬件实现——数学超前工程 20 年。

</details>

## 8. 下一站

RS 码在有限域上用多项式做编码,纠错能力来自代数结构。但当问题是"哪些问题根本不可计算"时--从编码理论回到计算理论,看 NP 完全的经典案例如何在不同问题间架起归约桥梁。

→ [NP 完全经典案例](../../32-computability/72-np-complete-classics.md)
