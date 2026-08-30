---
title: 多元函数与等高线
lesson_id: multivariable/level-sets
prereqs:
  - calculus/chain
  - linalg/matrix
volume: 2
layer: L7
track:
  - analysis-change
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - multivariable-function
  - level-set
applications:
  - terrain-maps
  - loss-surfaces
exits:
  - data-ai
  - engineering
---

# 多元函数与等高线

## 1. 从一个场景开始

一张山的地图不会把每座山峰画成浮雕，而是画一圈圈等高线。每条线上的海拔相同；线越密，山坡越陡。多元函数 $f(x,y)$ 也需要这样一张地图。

## 2. 直觉解释

一元函数 $f(x)$ 的图像是一条曲线；二元函数 $f(x,y)$ 的图像是一片曲面。纸面画不下第三维时，就把高度相同的点连成线：

$$\lbrace (x,y):f(x,y)=c\rbrace.$$

这条线叫等高线，也叫水平集。它把三维曲面压缩成二维地图。

## 3. 正式定义

二元函数给每个有序对 $(x,y)$ 分配唯一实数 $f(x,y)$。

| 符号 | 名称 | 含义 |
| --- | --- | --- |
| $D$ | 定义域 | 允许输入的 $(x,y)$ 集合 |
| $c$ | 高度 | 固定的函数值 |
| 等高线 | 水平集 | 满足 $f(x,y)=c$ 的点集 |

同一张图可以画许多高度 $c$。等高线不一定闭合，也不一定只有一条。

## 4. 分步例题

取

$$f(x,y)=x^2+y^2.$$

1. $f(1,2)=1+4=5$；
2. $f(2,1)=4+1=5$；
3. 所以 $(1,2)$ 和 $(2,1)$ 在同一条等高线上；
4. 高度 $c=5$ 的等高线满足 $x^2+y^2=5$，是半径 $\sqrt5$ 的圆。

若换成 $g(x,y)=x^2-y^2$，等高线变成双曲线。函数不同，地图的几何性格也不同。

## 5. 动手实验

### 实验 1：等高线地图

```viz
{
  "type": "contour-map",
  "title": "f(x,y)=x²+y² 的等高地图",
  "expr": "x^2 + y^2",
  "point": [1, 2]
}
```

拖动紫点。读数是当前高度；白线是等高线。把点从 $(1,2)$ 拖到 $(2,1)$，读数不变。

### 实验 2：从地图回到变化率预告

```viz
{
  "type": "gradient-probe",
  "title": "等高线密集处的方向",
  "expr": "x^2 + y^2",
  "point": [1, 0.5],
  "angle": 30
}
```

紫色箭头预告下一课的主角：梯度。先观察它与白色等高线几乎垂直；橙色方向是你选的探路方向。

### 实验 3：Python 检查同高点

```python title="判断两点是否同高"
def f(x, y):
    return x * x + y * y

height1 = f(1, 2)
height2 = f(2, 1)
same_level = height1 == height2   # == 判断相等，结果是 True 或 False
print(height1)
print(height2)
print(same_level)
```

输出 `5`、`5`、`True`。

## 6. 练习

```exercise
# @title: 练习：修正函数并判断同高
# @check: 5
# @check: 5
# @check: True
# @hint: 目标函数的高度是两个分量的平方和，不要把第二项写成减法。
def f(x, y):
    return x * x - y * y

height1 = f(1, 2)
height2 = f(2, 1)
same_level = height1 == height2
print(height1)
print(height2)
print(same_level)
```

<details>
<summary>点开查看逐步解答</summary>

把减号改成加号：

```python
def f(x, y):
    return x * x + y * y
```

于是：

```text
f(1,2)=1+4=5
f(2,1)=4+1=5
same_level=True
```

两点都在 $x^2+y^2=5$ 这条等高线上。

可执行复查：

```python
def f(x, y):
    return x * x + y * y

height1 = f(1, 2)
height2 = f(2, 1)
same_level = height1 == height2
print(height1)
print(height2)
print(same_level)
```

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为等高线是曲线的图像。等高线是曲面的俯视地图；曲面本身还需要高度轴。

**误区二**：你以为等高线越密，函数值越大。密度代表变化快慢；高度要看读数。

**误区三**：你以为交换 $x,y$ 一定改变高度。对称函数 $x^2+y^2$ 就不改变；是否同高要代入计算。

:::

## 8. 快问快答

```quiz
等高线上的两个点有什么共同点？
- 横坐标相同
- 函数值相同 [*]
- 到原点距离相同
? 等高线由 f(x,y)=c 定义，c 固定；坐标和距离都可能不同。
```

## 9. 选读：切片如何生成等高线

<details>
<summary>选读 · 用水平面切曲面</summary>

想象曲面 $z=f(x,y)$ 悬在空间中。用水平面 $z=c$ 去切它，交线在 $xy$ 平面上的投影就是等高线。若曲面像山峰，低高度是闭合小圈；若曲面像斜坡，等高线近似平行直线。

</details>

## 10. 下一站

地图能看高度，但那些险要地点（比如两道山脊交汇的垭口）未必有一个公认的"趋于值"。下一课先给"趋于一个点"立规矩：路径一变命运就变的二元极限，与它的连续通行证。

→ [二元极限与连续：路径一变命运就变](./15-two-var-limits.md)
