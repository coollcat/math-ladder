---
title: DCT 与 JPEG：图像如何被压缩
lesson_id: digital-signal-processing/dct-jpeg
prereqs:
  - digital-signal-processing/windows-tradeoff
  - fourier/orthogonality
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
  - dct-ii
  - energy-compaction
  - jpeg-quantization
applications:
  - image-compression
  - video-codec
exits:
  - engineering
  - data-ai
---

# DCT 与 JPEG：图像如何被压缩

## 1. 从一个场景开始

手机相册里一张 1200 万像素的照片只占 4 MB——按"每像素一个灰度值"的死脑筋存法，光亮度通道就得 12 MB，还不算彩色信息。它凭什么小这么多？放大一张存了很久的 JPEG 到像素级：画面被切成一格一格的 **8×8 小方块**，方块内部常有一种细微的斑纹——这就是 JPEG 的工位痕迹。

JPEG 的全部魔法一句话：**把每一小块图像翻译成条纹图案的组合，然后发现绝大多数条纹根本不重要，扔掉也没人看得出来**。负责这次翻译的机器叫离散余弦变换（DCT）——傅里叶家族里最擅长压缩的一位实数亲眷。

## 2. 直觉解释

DCT 的想法和上一课的 FFT 同宗：把信号拆成一组基波形的叠加。区别在两点：

1. **基函数全是余弦**（没有复数、没有虚部）：把有限长的信号镜像成偶对称再作傅里叶，虚部全部相消，剩下的就是一摞纯实数的余弦条纹——频率从 0 开始逐条加密；
2. **能量会挤成一团**。自然照片大多是平缓的天空、皮肤、墙面——代表「整体明暗」的低频条纹吃掉了绝大部分能量，那些细密的高频条纹几乎全是零星碎屑。

压缩就是针对这团不均匀下手的：

- **变换**：8×8 像素块 → 8×8 张余弦条纹的配方表（每格数字=对应条纹的用量）；
- **量化**：每格用量除以一个大数再四舍五入——人眼对高频条纹本来就迟钝，量化表给高频配更大的除数，一取整高频就大量归零；
- **编码**：串起来的零太多太规整了，用游程+熵编码收拾得干干净净。

解码端逆着走一遍：查表乘回除数、反变换回像素。**信息丢弃只发生在量化那一步**——这是有损压缩的心脏。

## 3. 正式定义

$N$ 点一维 DCT-II 定义为

$$F[u] = \alpha(u) \sum_{n=0}^{N-1} x[n]\, \cos\left(\frac{(2n+1)\,u\,\pi}{2N}\right), \qquad \alpha(0)=\sqrt{\tfrac{1}{N}},\quad \alpha(u)=\sqrt{\tfrac{2}{N}}\ (u \ne 0)$$

| 符号 | 含义 |
| --- | --- |
| $x[n]$ | 输入样本（比如一行 8 个像素灰度） |
| $u$ | 频率编号：$u=0$ 是"全场平均"，越大条纹越密 |
| $\cos(\cdot)$ | 第 $u$ 号基条纹在第 $n$ 个位置上的值 |
| $\alpha(u)$ | 归一化因子：让正变换与逆变换互为镜子 |

关键一步别省：$\alpha$ 里藏着 $\sqrt{2/N}$。它是基函数们互相正交后的"单位长度校准"（第 16 章正交性的老话题）：少了它，所有系数都会被吹大或缩掉一截，量化的刀口就全偏了。

二维版本是先对行、再对列各做一次一维 DCT：$F[u][v]$ 表示横向频率 $u$、纵向频率 $v$ 的斜条纹用量。JPEG 把每个 8×8 块都过一遍这套流水线，再用一张标准量化表（高频区数值大）逐格相除取整。

## 4. 分步例题

**例**：一行 8 个像素 $x = [55, 30, 30, 30, 55, 30, 30, 30]$（两处亮点），算它的 DCT 配方并执行一次粗暴量化。

1. **DC（$u=0$）**：$\alpha(0)\sum x[n] = \sqrt{1/8}\times 290 \approx 102.5 \approx 103$——全场平均能量的总账；
2. **$u=1$**：最宽的条纹。两个亮点恰好处在这条条纹的正负瓣上部分抵消，加上其他像素的贡献后 $F[1] \approx 9.8 \approx 10$;
3. **$u=2$**：这条条纹的节点正好骑在亮点的位置上——贡献为零附近，$F[2]\approx 0$；
4. **$u=3$**：$F[3]\approx 17.3 \approx 17$；更高频几乎全可忽略。能量上 DC 一家占了约 **92%**——挤成一小团，预言成立；
5. **量化**（JPEG 亮度表前四档 16, 11, 10, 16）：$103/16 \to 6$、$10/11 \to 1$、$0/10 \to 0$、$17/16 \to 1$。存储的只是四个小小的整数；
6. **还原**：$6\times16=96$（差 −7）、$1\times11=11$（差 +1）、$0$、$1\times16=16$（差 −1）。除数大的地方伤得重——人眼恰好对此最宽容。

## 5. 动手实验

### 实验 1（python 滑杆）：亲手执行一次"量化置零"

一块 8×8 的假想照片：平缓的明暗渐变，叠着每 4 列一道竖条纹。完整走一遍 DCT → 阈值剪枝 → 逆变换重建的全流程，拖动滑杆控制"只保留能量前几名"：

```python title="8x8 块的 DCT 剪枝重建实验"
# sliders: thr_div=20 [4:64:4]
import math                              # sqrt / cos / pi 都靠它

P = []                                   # 一行行搭出 8×8 的假想照片
for r in range(8):
    row = []                             # 当前行拼装中
    for c in range(8):
        stripe = 25 if c % 4 == 0 else 0 # 每 4 列加一道 +25 的竖亮条
        row.append(30 + r * 12 + stripe)
    P.append(row)

def alpha(u):                            # 归一化因子：DC 用 sqrt(1/8)，其余 sqrt(2/8)
    return math.sqrt(1 / 8) if u == 0 else math.sqrt(2 / 8)

def dct_cell(u, v):                      # 二维 DCT 的一个格子：行与列各乘一条余弦
    s = 0.0
    for r in range(8):
        for c in range(8):
            s = s + P[r][c] * math.cos((2 * r + 1) * u * math.pi / 16) \
                      * math.cos((2 * c + 1) * v * math.pi / 16)
    return s * alpha(u) * alpha(v)

cells = []                               # 收集全部 64 个系数
for u in range(8):
    for v in range(8):
        val = dct_cell(u, v)
        cells.append((abs(val), val, u, v))   # 首位存绝对值当排序键，原值随身携带

total = 0.0                              # 总能量 = 所有系数的平方和
for m, val, u, v in cells:
    total = total + val * val
cells.sort(reverse=True)                 # 元组排序：按首位（绝对值）从大到小

thr = cells[0][0] / thr_div              # 阈值 = 最强系数 ÷ 滑杆档位
keep = []                                # 只留够格的条纹配方
for t in cells:
    if t[0] >= thr:
        keep.append(t)
kept_energy = 0.0                        # 保留者的能量总账
for m, val, u, v in keep:
    kept_energy = kept_energy + val * val

rec = [[0.0] * 8 for r in range(8)]      # 空画布：只用保留条纹重建图像
for m, val, u, v in keep:
    for r in range(8):
        for c in range(8):
            rec[r][c] = rec[r][c] + val \
                * math.cos((2 * r + 1) * u * math.pi / 16) \
                * math.cos((2 * c + 1) * v * math.pi / 16)

mae = 0.0                                # 平均绝对误差
worst = 0.0                              # 最大绝对误差
for r in range(8):
    for c in range(8):
        d = abs(rec[r][c] - P[r][c])
        mae = mae + d
        worst = max(worst, d)
mae = mae / 64

print("最强格子能量占比:", round(cells[0][1] ** 2 / total * 100), "%")
print("保留", len(keep), "/ 64 格，合计能量", round(kept_energy / total * 100), "%")
print("重建平均误差:", round(mae, 1), "最大误差:", round(worst, 1))
```

默认档位下这块图只留 5 条纹配方就能拼回原样：最强一格独吞约 88% 的能量，留下来的成员合计扛住近 100%；平均每个像素只错不到 4 个灰阶（灰度满量程 255），最大的错处也不足 10——这就是"能量集中"四个字的兑现方式。把滑杆拖到"狠砍"端，方块会开始出现抹不匀的污渍——JPEG 方块斑纹的雏形。

### 实验 2（viz）：条纹家族的粗细分级

```viz
{
  "type": "plot",
  "title": "低频条纹宽缓（能量主场） vs 高频条纹细密（最先出局）",
  "expr": "cos(2*pi*x)",
  "expr2": "cos(7*pi*x)",
  "xmin": 0,
  "xmax": 1,
  "label": "u=2 宽纹",
  "label2": "u=7 细纹"
}
```

蓝线（$u=2$）是最宽的那批基条纹——自然照片的能量几乎全押在它们身上；橙色细线是 $u=7$——8×8 块里横向编号最高的条纹，一条里塞满 7 个半周期，多在给噪点和锐边打杂。量化表只是把这层偏见写成了数字。

### 快问快答

```quiz
JPEG 压缩中真正造成"信息丢失"的是哪一步？
- 把图像切成 8×8 小块
- DCT 变换本身
- 量化取整这一步 [*]
? 切块和 DCT 都是可逆的记账动作——丢信息发生在除以量化表再取整时：余数被扔掉，且越靠近高频扔得越狠。
```

这里留给边界选读与下一站

