---
title: 收敛定理
lesson_id: measure-lebesgue/convergence-theorems
prereqs:
  - measure-lebesgue/lebesgue-integral
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
  - monotone-convergence-theorem
  - dominated-convergence-theorem
  - fatou-lemma
applications:
  - limit-exchange-in-probability
exits:
  - research
---

# 收敛定理

## 1. 从一个场景开始

严格分析里还有一张老通行证叫一致收敛：它要求函数列全员齐步走。勒贝格的新积分机带来了转机——只要满足一些宽松得多的条件，"极限"与"积分"就能自由换序。本章直接看这些新条件什么时候够用。

这不是技术细节，而是整个分析的命脉：傅里叶系数要换序、概率期望要换序、微分方程解的估计要换序。本课交付两张通行证——**单调收敛定理**与**控制收敛定理**——外加一个著名的"尖峰反例"，告诉你没有通行证时闸门为什么必须关着。

## 2. 直觉解释

**通行证一（单调爬升）**：函数列 $f_1\le f_2\le\cdots$ 一路向上爬向 $f$。每一步的积分都从下方托住后继（积分对非负函数天然单调），于是面积跟着一起爬、并交出极限：

$$\int f_n\nearrow \int f$$

不需要任何一致性——爬得快慢不均也没关系。

**通行证二（天花板压顶）**：函数列可以乱蹦，只要全体被一个可积函数 $g$ 压住（$|f_n|\le g$），换序依然合法。$g$ 像一张总质量有限的篷布，谁也别想带着质量逃出天外。

**反例剧场（尖峰）**：让 $f_n$ 在原点立起一座三角形尖峰——高度 $n$ 越来越高，底宽 $\tfrac{2}{n}$ 越来越窄，面积恒等于 1。任何固定点上的函数值最终都掉到 0（逐点极限是零函数），但积分永远停在 1：

$$\int f_n\,dx=1\quad\text{而}\quad\int\lim_n f_n\,dx=0$$

尖峰把质量"挤"进了一个越来越窄的区域，最后塞进了测度为零的单点里——质量凭空消失。两张通行证防的正是这场蒸发：单调爬升不许回落，压顶篷布不许逃逸。

## 3. 正式定义

**单调收敛定理（MCT）**：若 $0\le f_1\le f_2\le\cdots$ 逐点收敛于 $f$，则

$$\lim_{n\to\infty}\int f_n\,d\mu=\int f\,d\mu$$

允许积分为 $+\infty$；条件一个都不能少：非负、单调、逐点。

**控制收敛定理（DCT）**：若 $f_n\to f$ 逐点成立，且存在可积函数 $g$ 使 $|f_n(x)|\le g(x)$ 对一切 $n$ 与 $x$ 成立，则 $f$ 可积且

$$\lim_{n\to\infty}\int f_n\,d\mu=\int f\,d\mu$$

**Fatou 引理**：若非负可测函数列只满足逐点下极限条件，则

$$\int\liminf_n f_n\,d\mu\le\liminf_n\int f_n\,d\mu$$

它不承诺等号：尖峰列左边为 0、右边为 1。Fatou 的价值在于给出一条几乎不设前提的单向闸门，也是证明 DCT 的常用中间站。

| 条件 | MCT | DCT |
| --- | --- | --- |
| 收敛方式 | 单调上升 | 任意（逐点即可） |
| 额外担保 | 无需控制函数 | 必须有可积天花板 $g$ |
| 尖峰反例为何被拒 | 不单调（先涨后落回 0） | 找不到可积的 $g$：最矮的天花板自己就不可积 |

## 4. 分步例题

**例**：核算三角尖峰 $f_n(x)=n\cdot\Bigl(1-n\,\lvert x\rvert\Bigr)$ 在 $\lvert x\rvert\le\tfrac1n$ 时的面积（区间外取 0）。

1. 峰顶在 $x=0$，高度 $f_n(0)=n$；
2. 底边从 $-\tfrac{1}{n}$ 到 $\tfrac{1}{n}$，宽度 $\tfrac{2}{n}$；
3. 三角形面积 $=\tfrac{1}{2}\times\tfrac{2}{n}\times n=1$，与 $n$ 无关；
4. 固定任一点 $x\neq0$：当 $n>1/\lvert x\rvert$ 后尖峰缩回原点，$f_n(x)=0$——逐点极限处处为零；
5. 结论：$\lim_n\int f_n=1\neq 0=\int\lim_n f_n$。换序失败，且失败得明明白白。

## 5. 动手实验

### 实验 1：拖动 n，看高斯尖峰怎么"挤"质量

```viz
{
  "type": "plot",
  "title": "n·exp(-(n·x)²)：越来越高的钟形尖峰",
  "expr": "n*exp(-(n*x)^2)",
  "xmin": -3,
  "xmax": 3,
  "sliders": [
    { "name": "n", "min": 1, "max": 30, "step": 1, "value": 1 }
  ]
}
```

把 `n` 从 1 拉到 30：曲线在原点蹿起、两侧塌平。每个固定位置的值都趋于 0，但曲线下的总面积始终约等于 1.772（$\sqrt{\pi}$，高斯积分）——质量被挤进针尖，一滴没少。

### 实验 2：亲手核算三角尖峰的账本

```python title="尖峰列的高度与面积"
# sliders: n=10 [1:100:1]
height = n                  # 峰顶高度
base = 1 / n                # ← 问题在这：底边真的只朝一边伸吗？
area = 0.5 * base * height  # 三角形面积公式
print(height)
print(round(area, 4))       # round(x, 4)：四舍五入到 4 位小数
```

修好后输出 10 与 1.0：底边其实左右各伸 $\tfrac{1}{n}$。把 `n` 拉到 100 再跑——面积纹丝不动，这就是"积分不跟极限走"的现场证据。

### 实验 3：两张通行证的正面样本

```python title="MCT 与 DCT 的精确账本"
samples = [1, 2, 4, 8]                 # 观察前四代函数列
mct_areas = []                         # 收集单调爬升列的积分
dct_areas = []                         # 收集受控振荡列的积分

for n in samples:
    mct_area = n / (2 * n + 1)         # f_n=x**(1+1/n) 在 [0,1] 的积分
    sign = (-1) ** n                   # (-1)**n 让正负号交替
    dct_area = 0.5 + sign * (1 / (3 * n))   # f_n=x+(-1)^n*x²/n 的积分
    mct_areas.append(round(mct_area, 6))
    dct_areas.append(round(dct_area, 6))

print(f"MCT 积分列: {mct_areas}")
print(f"DCT 积分列: {dct_areas}")
```

MCT 样本 $f_n=x^{1+1/n}$ 从下方单调升向 $x$，积分 $\tfrac{n}{2n+1}$ 精确走向 $\tfrac12$。DCT 样本在 $[0,1]$ 上被可积天花板 $g=2$ 压住，虽然积分左右轻晃，误差按 $\tfrac1{3n}$ 缩小，最终仍交还给 $\int_0^1 x\,dx=\tfrac12$。反例说明条件不能丢；这两个正面样本说明条件真的在工作。

### 快问快答

```quiz
尖峰函数列为什么不违反控制收敛定理？
- 因为它不是连续函数
- 因为找不到可积函数给整列尖峰当天花板 [*]
- 因为它不逐点收敛
? 它逐点收敛于零函数；但任何压住所有尖峰的 g 至少要在原点附近罩住全部质量，这样的 g 不可积。
```

:::warning[常见误区]

**误区一**："逐点收敛加上每个积分都收敛，就可以换序了。"
尖峰列两项条件全占：逐点趋于零、每个积分都是 1，结论照样翻车。缺的是单调或控制的**全局结构**，不是逐点的乖巧。

**误区二**："DCT 的控制函数取 $g=\sup_n f_n$ 就行了。"
上确界函数常常自己就不可积——尖峰列的 $\sup_n f_n$ 在原点附近高得没边。找 $g$ 是用 DCT 时真正的手艺活。

**误区三**："条件必须在每一点严格成立，差一点都不行。"
两定理都有"几乎处处"版本：条件在一个零测集上失效完全无妨。零测集在这里兑现了它的价值——反正积分量不到它们。

:::

## 6. 练习

**练习 1**：下面程序想验证"尖峰列面积守恒"，但把底边写丢了半边：

```exercise
# @title: 练习：尖峰列的面积守恒
# @check: 10
# @check: 1.0
# @hint: 尖峰以原点为中心，底边从 -1/n 到 1/n，宽度是 2/n。
n = 10                       # 尖峰编号
peak_height = n              # 峰顶高度
base_width = 1 / n           # ← 问题在这：底边宽度漏算了一半？
spike_area = 0.5 * base_width * peak_height   # 三角形面积 = 底 × 高 ÷ 2
print(peak_height)
print(round(spike_area, 4))
```

修好后输出 10 与 1.0。再把 `n` 改成 1000 复跑一遍：高度千倍，面积依旧——质量蒸发案的第一现场。

**练习 2**：设 $f_n(x)=n\,\mathbf{1}_{(0,\tfrac1n]}(x)$（高度 $n$ 的矩形脉冲）。求每项的积分与逐点极限，判断 MCT、DCT 各自能否适用。

<details>
<summary>点开查看逐步解答</summary>

每个脉冲面积为 $n\times\tfrac{1}{n}=1$；固定 $x>0$ 后当 $n>\tfrac{1}{x}$ 有 $f_n(x)=0$，故逐点极限为 0（$x=0$ 处恒为 0）。换序再次失败。

MCT 不适用：脉冲列不单调——第 $n+1$ 号在 $(0,\tfrac1{n+1}]$ 外比第 $n$ 号矮。DCT 不适用：任何压住全列的 $g$ 必须在每处 $(0,\tfrac1n]$ 上不低于 $n$，只能无穷大，不可积。两个定理的排除法各用了一次——这正是它们的条件互不包含的证据。
</details>

## 7. 选读：MCT 为什么是地基

<details>
<summary>选读 · 从简单函数到 MCT 的三步走</summary>

证明骨架只有三句：(1) 由单调性 $\int f_n\le\int f$ 对每个 $n$ 成立；(2) 任取简单函数 $s\le f$ 和常数 $c\in(0,1)$，可证 $\lim_n\int c\,s\,f_n\ge c\int s$（在 $s$ 取正值的有限块地盘上，$f_n$ 迟早越过 $cs$ 的每一档，用的是上一课切片地盘的测度论据）；(3) 让 $c\nearrow 1$ 并对简单函数托举取 sup，两端同时夹出等号。DCT 则由 Fatou 引理（$\int\liminf f_n\le\liminf\int f_n$）套在 $g-f_n$ 与 $g+f_n$ 两边得到。整座收敛大厦的地基，仍是第 40 课那台"简单函数托举"电梯。

</details>

## 8. 下一站

换序通行证管住了"极限与积分"的先后，还有一类换序没验票：两个积分交换次序。下一课造出乘积测度，给"交换积分次序"发资格证——验完资格，再去领这套理论最丰厚的分红。

→ [乘积测度与 Fubini：交换积分次序的资格](./55-product-fubini.md)
