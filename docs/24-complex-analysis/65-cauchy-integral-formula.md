---
title: Cauchy 积分公式
lesson_id: complex-analysis/cauchy-integral-formula
prereqs:
  - complex-analysis/cauchy-goursat
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
  - cauchy-integral-formula
applications:
  - boundary-value-reconstruction
exits:
  - research
  - engineering
---

# Cauchy 积分公式

## 1. 开场钩子

只知道一个解析函数在圆边界上的值，能算出圆心处的值吗？对实函数通常不能；对解析函数却能。Cauchy 积分公式说：边界信息足够还原内部，而且公式里只有一个漂亮的因子。

## 2. 直觉解释

上一课的例外是 $\oint 1/z\,dz=2\pi i$。把分母换成 $z-z_0$，这个小洞就像一根探针：当分子是解析函数 $f(z)$ 时，它会把 $f(z_0)$ 从围道上“采样”出来。

若 $f$ 在闭曲线 $C$ 及其内部解析，$z_0$ 位于内部，则

$$f(z_0)=\frac{1}{2\pi i}\oint_C\frac{f(z)}{z-z_0}\,dz.$$

分母的奇点正好提供 $2\pi i$ 的基本配额；分子仍然携带边界信息。

## 3. 正式定义与推论

Cauchy 积分公式还可以逐次求导：

$$f^{(n)}(z_0)=\frac{n!}{2\pi i}\oint_C\frac{f(z)}{(z-z_0)^{n+1}}\,dz.$$

这说明解析函数只要一阶可导就自动有无穷阶导数。这是复分析与实分析最惊人的差别之一。

| 名称 | 条件 | 结论 |
| --- | --- | --- |
| 积分公式 | $f$ 在围道及其内部解析 | 边界积分还原 $f(z_0)$ |
| 导数公式 | 同上 | 内部无穷可导并可由边界表示 |
| 方向检查 | 围道为正向 | 反向时积分整体变号 |

## 4. 分步例题

计算

$$\oint_{|z|=2}\frac{e^z}{z-1}\,dz.$$

1. 被积函数唯一奇点是 $z_0=1$；
2. $z_0$ 位于圆 $|z|=2$ 内部；
3. 取 $f(z)=e^z$，它在圆内解析；
4. 由 Cauchy 公式，积分等于 $2\pi i f(1)$；
5. 所以答案是 $2\pi ie$。

若围道改为不包含 1 的小圆，比如 $|z|=0.5$，被积函数在圆内解析，积分为零。

## 5. 动手实验

### 实验 1（viz）：$1/z$ 的基本配额

```viz
{
  "type": "green-theorem",
  "title": "1/z 的场：原点藏着一个洞",
  "p": "-y/(x^2+y^2)",
  "q": "x/(x^2+y^2)",
  "radius": 1
}
```

拖动半径滑块。只要圆形围道不越过原点，环流读数始终接近 $2\pi$，与半径大小无关——这正是基本积分 $\oint_C \frac{dz}{z}=2\pi i$ 留下的净额（这里看的是它的大小）。

### 实验 2（python）：验证基本积分

```python title="单位圆上 1/z 的围道积分"
import math                          # 标准库 math：cos / sin / pi

N = 20000                            # 把圆周切成 20000 小段，段越多积分越准
total = 0 + 0j                       # 0j 表示复数零：复数用 j 结尾，不是 i
for k in range(N):                   # 逐段累加
    t1 = 2 * math.pi * k / N         # 第 k 段的起点角度
    t2 = 2 * math.pi * (k + 1) / N   # 该段的终点角度
    z1 = math.cos(t1) + 1j * math.sin(t1)   # 单位圆上的点：1j 是虚数单位字面量
    dz = (math.cos(t2) - math.cos(t1)) + 1j * (math.sin(t2) - math.sin(t1))   # 该段的复数增量 dz
    total += dz / z1                 # 累加 dz/z；围道绕原点一圈，积分应得 2πi
print(round(total.real, 3), round(total.imag, 3))   # .real / .imag 取复数的实部与虚部
```

数值结果为 `-0.001 6.283`（实部是离散化噪声，本质为 0），除以 $2\pi i$ 后等于 1。

### 实验 3（python）：用边界值还原 e^z 在 z=1 的值

```python title="边界积分近似 f(1)"
import math                          # 标准库 math：exp / cos / sin

N = 20000                            # 分段数
acc = 0 + 0j                         # 复数累加器
for k in range(N):                   # 逐段累加
    t1 = 2 * math.pi * k / N
    t2 = 2 * math.pi * (k + 1) / N
    z1 = 2 * (math.cos(t1) + 1j * math.sin(t1))   # 半径 2 的圆：比单位圆放大一倍
    dz = 2 * ((math.cos(t2) - math.cos(t1)) + 1j * (math.sin(t2) - math.sin(t1)))   # 增量同样放大一倍
    # 复指数公式：e^(a+bi)=e^a(cos b+i sin b)，不能用 cos(a)+i sin(a) 代替
    exp_z1 = math.exp(z1.real) * (math.cos(z1.imag) + 1j * math.sin(z1.imag))   # 按欧拉公式展开 e^z
    acc += exp_z1 / (z1 - 1) * dz    # 被积函数 e^z/(z−1)：奇点 z=1 在圆内
value = acc / (2 * math.pi * 1j)     # 除以 2πi，把积分还原成 f(1)
print(round(value.real, 3), round(value.imag, 3))   # 应得 e ≈ 2.718
```

结果接近 $e\approx2.718$，输出坐标为 `2.718 0.0`。

```quiz
圆内奇点 z=1，函数是 e^z 除以 z 减 1。闭路积分等于什么？
- 0
- 2*pi*i*e [*]
- e
? 把无奇点的 e^z 看作 Cauchy 公式里的 f，积分等于 2*pi*i*f(1)。
```

:::warning[常见误区]

**误区一**：你以为任何分式都能直接套公式。必须把分子分离成“在围道内解析的函数”除以 $z-z_0$。

**误区二**：你以为奇点不在曲线上就安全。奇点在内部时仍会贡献非零积分。

**误区三**：你以为公式只用于计算积分。它还是推导泰勒展开、Liouville 定理和解析延拓的基础工具。

:::

## 6. 练习

```exercise
# @title: 练习：选择正确的 Cauchy 公式因子
# @check: 25.133
# @hint: 积分等于 2*pi*f(2) 的虚部系数；先用复数形式算，再取模长。
import math      # 标准库 math（本题其实用不到，保留导入是为了和正文一致）

z0 = 2           # 奇点位置；圆把它围在里面
f_value = z0 ** 2   # 被积函数 f(z)=z² 在奇点处的值
integral = 1j * f_value   # ← 基本因子 2π 漏了：公式是 2πi·f(z₀)
magnitude = abs(integral)   # abs 对复数取模长
print(round(magnitude, 3))   # 与 @check 对位
```

<details>
<summary>点开查看逐步解答</summary>

对 $\displaystyle\oint_{|z|=3}\frac{z^2}{z-2}\,dz$ 使用 Cauchy 公式：

$$2\pi i f(2)=2\pi i\cdot4=8\pi i.$$

模长为 $8\pi\approx25.133$。代码应写 `integral = 2 * math.pi * 1j * f_value`，再对结果取模长。
</details>

## 7. 选读：为什么无穷阶可导是免费赠品

<details>
<summary>选读 · 从一次采样到高阶采样</summary>

把公式中的差商看作移动采样器：$\frac{1}{z-z_0}$ 负责取值，$\frac{1}{(z-z_0)^2}$、$\frac{1}{(z-z_0)^3}$ 等负责提取变化率。只要围道可以缩小到 $z_0$ 附近而不碰到分子奇点，这些积分都有意义，于是各阶导数都存在。
</details>

## 8. 下一站

当奇点出现时，普通泰勒级数不够用了。下一课引入 Laurent 级数：负幂项负责描述洞，正幂项负责描述周围规整的部分。

→ [Laurent 级数与孤立奇点](./70-laurent-singularities.md)
