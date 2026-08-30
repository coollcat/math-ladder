---
title: FFT：DFT 背后的分治魔法
lesson_id: digital-signal-processing/fft-divide-conquer
prereqs:
  - digital-signal-processing/dft-leakage
  - fourier/dft
volume: 5
layer: L8
track:
  - analysis-change
  - scientific-computing
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - fast-fourier-transform
  - butterfly-operation
applications:
  - realtime-spectrum
  - audio-codec
exits:
  - engineering
  - data-ai
---

# FFT：DFT 背后的分治魔法

## 1. 从一个场景开始

语音助手的耳朵要在毫秒级吐出一段音频的频谱：录音机里每一帧 2048 个样本，都要立刻翻译成上千个频率桶的能量读数。按上一课的定义硬算 DFT，这一步要做约 **400 万次乘法**——一秒钟就算几十帧的话，CPU 直接烧穿。而上世纪 60 年代图基与库利发明的快速傅里叶变换（FFT），把这件事降到约 **11000 次**：同样的活，省下三百多倍力气。

这不是小优化，是从「实验室能算」到「芯片里实时跑」的分水岭。今天手机上的降噪、JPEG 图片、Wi-Fi 芯片收发信号，背后全有这道分治魔法的影子。

## 2. 直觉解释

DFT 硬算慢在哪？$N$ 个输出桶 × 每桶扫 $N$ 个样本 = $N^2$ 次乘法。FFT 的突破口是一条观察：**桶与桶之间的劳动大量重复**。

把它劈开看：把样本按位置切成偶数位（第 0、2、4……个）和奇数位（第 1、3、5……个）两队。代入定义折腾一番代数（第 3 节完成），会发现两件惊人的事：

1. 偶数队自己单独作一个 $N/2$ 点的小 DFT，奇数队也一样——各自只需要 $(N/2)^2$ 次乘法；
2. 这两只小 DFT 的结果，靠**一遍简单的加减拼接**就能组装出全部 $N$ 个桶——拼接本身几乎免费。

于是总成本从 $N^2$ 缩成 $2\times(N/2)^2 + N$。更妙的是，两队还能继续劈：偶数队里又有偶数位和奇数位……像切豆腐一样一路劈到每队只剩 1 个样本（此时"1 点 DFT"就是它自己）。$N$ 层劈开、每层拼一轮，总工作量正比于 $N\log_2 N$——这就是**分治**在信号世界里开出的花。

$N=4096$ 时这笔账：硬算约 1677 万次乘法，分治只需 24576 次——差距 683 倍，而且 $N$ 越大倍率越吓人。

## 3. 正式定义

记 $N$ 点 DFT 的旋转因子为 $W_N = e^{-2\pi i/N}$（第 12 章复数的老朋友：模长 1、转一小步的单位圆旋钮）。它的两条性质是全部魔法的来源：

- **周期性**：$W_N^{k+N} = W_N^k$——旋钮转满一圈回到原地；
- **对称性**：$W_N^{k+N/2} = -W_N^k$——转半圈正好相反（平方验证：$(W_N^{N/2})^2 = e^{-2\pi i} = 1$）。

把样本拆成偶队列 $e_m = x_{2m}$ 与奇队列 $o_m = x_{2m+1}$（各 $N/2$ 个），分别作 $N/2$ 点 DFT 得 $E[m]$、$O[m]$。代入原定义、利用上面两条性质整理，得到**蝴蝶合并公式**：

$$X[k] = E[k \bmod N/2] + W_N^k\, O[k \bmod N/2], \qquad X[k+N/2] = E[k \bmod N/2] - W_N^k\, O[k \bmod N/2]$$

（$\bmod$ 表示取余：半长结果只有 $N/2$ 份，后半段翻回头来重复使用。）公式形状像一只蝴蝶的两翼：**同一对 $E,O$，符号一正一负**。每份 $E,O$ 各喂一只蝴蝶，每层 $N/2$ 只、共 $\log_2 N$ 层——乘法总数正比于 $N\log_2 N / 2$。

| 名字 | 含义 |
| --- | --- |
| 旋转因子 $W_N^k$ | 单位圆上转过 $2\pi k/N$ 的复数旋钮 |
| 偶 / 奇子变换 | 偶数位、奇数位样本各自的小号 DFT |
| 蝴蝶操作 | 一加一减共享同一对子结果的合并动作 |
| 分治 | 大问题切成同样形状的小问题，最后拼回去 |

## 4. 分步例题

**例**：手算 4 点信号 $x = [1, 2, 3, 4]$ 的 FFT。

1. 劈队：偶位子序列 $[x_0, x_2] = [1, 3]$，奇位子序列 $[x_1, x_3] = [2, 4]$；
2. 算出两只 2 点 DFT（只有两项，$W_2 = -1$，一步到位）：$E = [1+3,\, 1-3] = [4, -2]$；同理 $O = [6, -2]$；
3. 合并 $k=0$（$W_4^0 = 1$）：$X[0] = E[0] + O[0] = 10$，下半翼 $X[2] = E[0] - O[0] = -2$；
4. 合并 $k=1$（$W_4^1 = -i$）：$W\cdot O[1] = (-i)(-2) = 2i$，于是 $X[1] = -2 + 2i$，下半翼 $X[3] = -2 - 2i$；
5. 对照硬算验证（把定义式逐桶代入）：$X = [10,\ -2+2i,\ -2,\ -2-2i]$ ✓——六次子变换乘法加四次蝴蝶乘法，远少于 $4^2 = 16$ 次。

注意第 4 步那份纯粹的美好：实数信号的输出天然共轭对称（$X[3]$ 是 $X[1]$ 的镜影）——下半翼的减号正是这份对称性的搬运工。

## 5. 动手实验

### 实验 1（python 滑杆）：两种算法的成本谈判桌

拖动样本数 $N$（不用真的算 DFT，只数乘法次数）——看直接法的账单指数蹿升、分治法稳步爬坡：

```python title="滑动 N，数一数两种算法各要多少次乘法"
# sliders: n_samples=1024 [64:4096:64]
n = n_samples                          # 一帧采样的个数

direct = n * n                         # 直接 DFT：每个桶都扫一遍全部样本
levels = n.bit_length() - 1            # bit_length：二进制位数，恰为 log2 的整数部分
fast = (n // 2) * levels               # 分治：每层 N/2 只蝴蝶 × 共 log2 N 层

print("N =", n)
print("直接法乘法:", direct)
print("分治法乘法:", fast)
print("省了", round(direct / fast), "倍")
```

几档锚点帮你定位手感：$N=256$ 时省 64 倍，$N=1024$ 省 205 倍，$N=4096$ 已经拉开 683 倍。实时频谱分析正是踩着这条曲线才成立的。

### 实验 2（python）：亲手造一台迷你 FFT，并与硬算对质

```python title="8 点 FFT 分治实现，与定义式硬算逐桶比对"
import math                            # pi、cos、sin 登场

x = [1, 3, 2, 5, 8, 7, 1, 2]           # 待分析的 8 个样本

def dft_direct(sig):                   # 定义式硬算：返回 (实部, 虚部) 列表
    n = len(sig)
    out = []
    for k in range(n):
        re, im = 0.0, 0.0
        for t in range(n):
            ang = -2 * math.pi * k * t / n
            re = re + sig[t] * math.cos(ang)
            im = im - sig[t] * math.sin(ang)
        out.append((re, im))           # 圆括号打包一对复数的实虚部
    return out

def fft(sig):                          # 分治版：劈偶奇 → 递归 → 蝴蝶拼装
    n = len(sig)
    if n == 1:                         # 递归出口：1 点 DFT 就是它自己
        return [(sig[0], 0.0)]
    ev = fft([sig[t] for t in range(0, n, 2)])   # 步长 2 从 0 起：偶位队
    od = fft([sig[t] for t in range(1, n, 2)])   # 步长 2 从 1 起：奇位队
    out = [(0.0, 0.0)] * n             # 先铺 n 个占位元组，稍后按桶填入
    half = n // 2                      # 地板除：n 的一半
    for k in range(half):
        ang = -2 * math.pi * k / n
        wR, wI = math.cos(ang), math.sin(ang)      # twiddle 旋钮的实虚部
        oR = wR * od[k][0] - wI * od[k][1]         # 复数乘 w·O：实部
        oI = wI * od[k][0] + wR * od[k][1]         # 复数乘 w·O：虚部
        out[k] = (ev[k][0] + oR, ev[k][1] + oI)             # 上翼：加
        out[k + half] = (ev[k][0] - oR, ev[k][1] - oI)      # 下翼：减
    return out

slow = dft_direct(x)
fast = fft(x)

worst = 0.0
for k in range(len(x)):
    dr = abs(slow[k][0] - fast[k][0])      # abs：复数差的幅度先取实虚再合
    di = abs(slow[k][1] - fast[k][1])
    worst = max(worst, dr, di)             # 内置 max 在第 19 章已登场

peak = 1                                  # 找能量最强的输出桶
for k in range(1, len(x)):
    if fast[k][0] ** 2 + fast[k][1] ** 2 > fast[peak][0] ** 2 + fast[peak][1] ** 2:
        peak = k

print("最强桶:", peak)
print("两种算法最大偏差:", round(worst, 12))       # 浮点尘埃级别 ≈ 0
```

这组数据的最强谱峰落在 1 号桶、偏差四舍五入后是干净的 0——偷工减料的分治机给出的是分毫不差的同一套谱：省下大半乘法的同时没撒一个谎。

### 快问快答

```quiz
FFT 快过的根本原因是什么？
- 把浮点精度调低了所以更快
- 桶与桶之间的计算被偶奇拆分高度复用，N² 次乘法缩成约 N·log₂N [*]
- 它只算了半个频谱，另一半靠猜
? 核心是分治复用：偶奇子变换的结果被上下两翼各用一次，旋转因子的周期性与对称性又砍掉重复旋钮。精度毫厘未损。
```

## 6. 练习

下面的半成品把蝴蝶的两翼装成了同一个手势（能跑，但下半区抄错了上半区的作业）——修到五条输出全部命中：

```exercise
# @title: 练习：别让蝴蝶的两翼举起同一只手
# @check: 10
# @check: -2
# @check: 2
# @check: -2
# @check: -2
# @hint: 上下两翼共用同一对 E、O——差别只在那个符号：上翼相加，下翼必须相减（对称性 W 的半圈反转）。
import math                                 # cos / sin / pi 出场

ER, EI = [4, -2], [0, 0]                    # 偶位子序列 [1,3] 的两点 DFT
ORr, OI = [6, -2], [0, 0]                   # 奇位子序列 [2,4] 的两点 DFT

def butterfly(top_sign, bottom_sign):       # 装配 4 点 DFT：两端各自的手势
    XR, XI = [], []
    for k in range(2):
        ang = -2 * math.pi * k / 4          # 全长 N=4 的 twiddle 角度
        wR, wI = math.cos(ang), math.sin(ang)
        tR = wR * ORr[k] - wI * OI[k]       # 复数乘法 w·O 的实部
        tI = wI * ORr[k] + wR * OI[k]       # 复数乘法 w·O 的虚部
        XR.append(ER[k] + top_sign * tR)    # 上翼端点排前半区
        XI.append(EI[k] + top_sign * tI)
        XR.append(ER[k] + bottom_sign * tR) # 下翼端点排后半区
        XI.append(EI[k] + bottom_sign * tI)
    return XR, XI

XR, XI = butterfly(1, 1)                    # ← 问题在这：下翼也要用减号
print(round(XR[0]))
print(round(XR[1]))
print(round(XI[1]))
print(round(XR[2]))
print(round(XI[3]))
```

<details>
<summary>点开查看逐步解答</summary>

注意输出排布：蝴蝶循环里每个 k 先压入上翼再压入下翼，所以列表顺序是 $[X_0,\ X_2,\ X_1,\ X_3]$——`XR[1]` 位住的是 $X[2]$、`XI[2]` 位住的才是 $X[1]$ 的虚部。

错误现象学：全加手势下 `XR[1]`（即 $X[2]$ 位）报 10，真身却是 −2；尾部 `XI[3]` 报 +2，真身 −2。上下两翼输出一模一样，正是「下半区抄成加号」的指纹。

修复只需一行手势改动：`XR, XI = butterfly(1, -1)`。修复后 $X[0]=10$、$X[2]=4-6=-2$、$X[1]=-2+2i$、$X[3]=-2-2i$，五行打印依次 10、−2、2、−2、−2，与第 4 节手算逐项吻合；顺带验收了共轭对称——下翼减号就是对称性的执行者。

```python
import math

ER, EI = [4, -2], [0, 0]
ORr, OI = [6, -2], [0, 0]

def butterfly(top_sign, bottom_sign):
    XR, XI = [], []
    for k in range(2):
        ang = -2 * math.pi * k / 4          # 全长 N=4 的 twiddle 角度
        wR, wI = math.cos(ang), math.sin(ang)
        tR = wR * ORr[k] - wI * OI[k]
        tI = wI * ORr[k] + wR * OI[k]
        XR.append(ER[k] + top_sign * tR)      # 上翼
        XI.append(EI[k] + top_sign * tI)
        XR.append(ER[k] + bottom_sign * tR)   # 下翼（sign 取 −1）
        XI.append(EI[k] + bottom_sign * tI)
    return XR, XI

XR, XI = butterfly(1, -1)          # 上翼加、下翼减——蝴蝶合拢
print(round(XR[0]))                # 10
print(round(XR[1]))                # -2（X[2] 的实部）
print(round(XI[2]))                # 2（X[1] 的虚部）
print(round(XR[2]))                # -2（X[1] 的实部）
print(round(XI[3]))                # -2（X[3] 的虚部）
```
</details>

## 7. 边界与适用条件

- 本课的教科书版 FFT 要求样本数恰为 2 的幂（才能对半劈到底）；其他长度有混合基与素数算法（如 Bluestein）接盘，思想同源但实现更绕；
- FFT 算的是标准 DFT，**频谱泄漏一家不少地带过来了**——它加速的是账房，不改物理：想要干净的峰，仍需窗函数课的功夫；
- 递归写法每层都要新建列表，常数开销不小；工程版会先用"位反转序"重排输入，把整幅蝶形图折成不占额外内存的原地蝴蝶阵列；
- 实信号的输出天然共轭对称，只需算一半桶——许多库悄悄这样白送性能，读文档时别惊讶。

## 8. 选读：蝶形图——分治算法的电路写真

以 8 点为例，数据流可以画成一只三层的蝶形电路（左进右出，上翼加、下翼减）：

```text
输入劈队        第一轮 W₂        第二轮 W₄        第三轮 W₈      输出
x0 ──────────── ● ────────────── ● ────────────── ● ───────── X0
                │⊕               │⊕               │⊕
x4 ──────────── ⊖ ───┐           │                 │
                     ↓           ↓                 ↓
x2 ──────── ● ──────⊕ ……
x6 ──────── ⊖
……
```

三层对应的正是三轮蝴蝶：第一层的旋钮只有 $W_2=\pm 1$（相当于翻转正负号），第二层用 $W_4$（转 90°），第三层用 $W_8$（转 45°）。越往右旋钮越密，像钟表的时针、分针、秒针各司其职。所谓"位反转重排"，就是把输入按二进制位左右镜像后塞进这张网，让每一轮都能就地读写——好看的结构最终都替机器省下了房间。

## 9. 下一站

分治把频谱从奢侈品变成了日用品。下一课讲 JPEG：图像压缩不走复数这一趟，而是借余弦这套实数亲眷的基（DCT），把照片的能量挤到左上角再大胆扔掉细节；更远处，本站还能继续追「快速」这条线——把今天的偶奇拆分思想带回排序与多项式乘法的战场，同样是 $N\log_2 N$ 的天下。记住核心直觉：**发现自己在大量重复劳动，就该考虑切块了。**

