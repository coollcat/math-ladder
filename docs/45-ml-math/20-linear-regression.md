---
title: 线性回归：从数据到预测线
lesson_id: ml-math/linear-regression
prereqs:
  - ml-math/loss
  - linalg-advanced/least-squares
  - optimization/gradient-descent
volume: 5
layer: L10
track:
  - information-learning
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - linear-regression
  - training-loop
applications:
  - insurance-pricing
  - sales-forecasting
exits:
  - data-ai
---

# 线性回归：从数据到预测线

## 1. 从一个场景开始

中介手里有一摞成交记录：面积和总价。来了一套 88 平的挂盘房，报价该参考什么？最朴素的想法：**把历史数据画成散点图，穿一条趋势线，顺着线读出 88 平对应的价格。**

这条线就是线性回归——机器学习里最古老、也最经久不衰的模型。它值得精读的原因是：**训练一个模型的全部流程（模型、损失、优化、评估）在它身上小到可以手算**。

## 2. 直觉解释

第 6 章的 fit 组件你已经玩过：拖动数据点，直线会"追着跑"。那条追人的线背后有两个等价的故事：

- **几何故事**（第 21 章）：把 $y$ 向量投影到由特征张成的平面上，投影即最优预测；
- **优化故事**（本章主线）：定义损失 $E(w,b)$，在参数地形上找谷底——线性回归的损失恰好是一只完美的凸碗，梯度下降稳稳落底。

两个故事给出同一条线。本章用第二个故事走完整训练闭环：**定模型 → 定损失 → 求最小 → 验效果**——以后每遇到一个新模型（逻辑回归、神经网络……），都把这四步重演一遍。

## 3. 正式定义

模型：$\hat{y}=wx+b$，其中 $w$ 叫权重（斜率）、$b$ 叫偏置（截距）。

损失：对数据 $(x_i,y_i)_{i=1}^n$ 取均方误差：

$$E(w,b)=\frac{1}{n}\sum_{i=1}^{n}\bigl(y_i-wx_i-b\bigr)^2$$

它是 $(w,b)$ 的二次函数——一只开口向上的碗，必有唯一谷底。令两个偏导为零可解出**正规方程**：

$$w=\frac{nS_{xy}-S_xS_y}{nS_{xx}-S_x^2},\qquad b=\frac{S_y-wS_x}{n}$$

其中 $S_x=\sum x_i$，$S_y=\sum y_i$，$S_{xx}=\sum x_i^2$，$S_{xy}=\sum x_i y_i$。两条下山路：解公式（一步到位）或梯度下降（通用套路，深度学习同款）。

## 4. 分步例题

**例**：四个成交样本：$(1,3),(2,4),(3,6),(4,7)$（面积按十平米计，价格按十万计）。

1. 备料：$n=4$，$S_x=10$，$S_y=20$；
2. 再备两项：$S_{xx}=1+4+9+16=30$；$S_{xy}=3+8+18+28=57$；
3. 代入斜率：$w=\dfrac{4\times57-10\times20}{4\times30-100}=\dfrac{228-200}{120-100}=\dfrac{28}{20}=1.4$；
4. 截距：$b=\dfrac{20-1.4\times10}{4}=1.5$；
5. 训练好的模型 $\hat{y}=1.4x+1.5$。验收：四个预测值 $2.9,4.3,5.7,7.1$，残差 $0.1,-0.3,0.3,-0.1$，平方和 $=0.2$，MSE $=0.05$；
6. 顺手检查一条性质：直线必过重心 $(\bar x,\bar y)=(2.5,5)$——代入验证 $1.4\times2.5+1.5=5$ ✓。

## 5. 动手实验

### 实验 1：拖点看线——损失地形的实时反馈

```viz
{
  "type": "least-squares-fit",
  "title": "残差的平方和驱动紫线追向谷底",
  "points": [[1, 3], [2, 4], [3, 6], [4, 7]]
}
```

红色竖线段是每个点的残差。把右上角的点往上拖，看斜率如何立刻响应——你手动执行的就是"最小化 MSE"这件事本身。

### 实验 2：梯度下降训练闭环

```python title="用梯度下降把 w、b 送进谷底"
xs = [1, 2, 3, 4]
ys = [3, 4, 6, 7]
n = len(xs)

def mse(w, b):
    total = 0.0
    for i in range(n):
        err = ys[i] - (w * xs[i] + b)
        total = total + err * err
    return total / n

w, b = 0.0, 0.0          # 从零开始猜
eta = 0.05               # 学习率（曲率窗口内）
for step in range(300):
    pred_errs = [ys[i] - (w * xs[i] + b) for i in range(n)]
    gw = -2 / n * sum(xs[i] * pred_errs[i] for i in range(n))   # 对 w 的偏导
    gb = -2 / n * sum(pred_errs[i] for i in range(n))           # 对 b 的偏导
    w = w - eta * gw            # 与上一课同一句更新式
    b = b - eta * gb
    if step in (0, 9, 49, 299):
        print(f"step {step + 1}: w={round(w, 3)}, b={round(b, 3)}, mse={round(mse(w, b), 4)}")

print("正规方程对照: w=1.4, b=1.5, mse=0.05")
```

三百步后 `w` 收敛到约 1.4、`b` 到 1.5，与正规方程一字不差——凸碗地形上梯度下降没有悬念。损失曲线一路下滑并压平：

```python title="训练损失曲线"
import matplotlib.pyplot as plt

xs = [1, 2, 3, 4]
ys = [3, 4, 6, 7]
n = len(xs)
eta = 0.05

losses = []
w, b = 0.0, 0.0
for step in range(60):
    pred_errs = [ys[i] - (w * xs[i] + b) for i in range(n)]
    losses.append(sum(e * e for e in pred_errs) / n)
    gw = -2 / n * sum(xs[i] * pred_errs[i] for i in range(n))
    gb = -2 / n * sum(pred_errs[i] for i in range(n))
    w = w - eta * gw
    b = b - eta * gb

plt.plot(range(60), losses, marker="o", markersize=3)
plt.xlabel("step")
plt.ylabel("mse")
plt.grid(True)
```

前十几步陡降、随后贴地爬行——这是学习率固定时凸问题的标准姿态。

### 快问快答

```quiz
最小二乘回归线一定经过哪个点？
- 原点 (0, 0)
- 数据重心（x 的均值, y 的均值） [*]
- 第一个数据点
? 把正规方程两式相加整理可得 ȳ = w·x̄ + b：拟合线穿过均值点，就像天平的支点。
```

:::warning[常见误区]

**误区一**："回归发现的是因果关系。" 回归只描述相关性：冰淇淋销量与溺水人数同步上涨，罪魁是夏天。因果结论需要第 42 章的工具。

**误区二**："训练集 MSE 为零说明模型完美。" 四个点最多被三次多项式精确穿过（插值！），MSE 为零往往意味着模型复杂到把噪声也背了——泛化堪忧，第四课展开。

**误区三**："线性回归只能拟合直线形状的数据。" 对特征做变换（如加入 $x^2$ 列）后它照样弯——"线性"指的是**对参数**线性，不是对自变量。

:::

## 6. 练习

**练习 1**（概念）：用例题的模型 $\hat{y}=1.4x+1.5$ 给 35 平米（$x=3.5$）的房子估价，并算出它与真实价 7 的残差。

<details>
<summary>点开查看逐步解答</summary>

$\hat{y}=1.4\times3.5+1.5=6.4$（64 万），若真实成交 70 万则残差 $7-6.4=0.6$。注意 $x=3.5$ 在训练数据范围内（内插），预测尚可信；若问 $x=20$（200 平），已属外推，风险自负。
</details>

**练习 2**（判题）：初始代码的正规方程漏乘了样本数 $n$，导致斜率截距全歪。修好后应输出训练好的三个数：

```exercise
# @title: 练习：修好正规方程
# @check: 1.4
# @check: 1.5
# @check: 0.2
# @hint: 分子分母都要乘 n：w = (n*Sxy - Sx*Sy) / (n*Sxx - Sx^2)；残差平方和别除以 n。
pts = [[1, 3], [2, 4], [3, 6], [4, 7]]
n = len(pts)
sx = sum(p[0] for p in pts)
sy = sum(p[1] for p in pts)
sxx = sum(p[0] * p[0] for p in pts)
sxy = sum(p[0] * p[1] for p in pts)

m = (sxy - sx * sy) / (sxx - sx * sx)      # ← 少乘了 n
b = (sy - m * sx) / n

preds = [m * p[0] + b for p in pts]
sse = sum((p[1] - r) ** 2 for p, r in zip(pts, preds))

print(round(m, 2))
print(round(b, 2))
print(round(sse, 2))
```

三行命中 `1.4 / 1.5 / 0.2` 后，你等于同时跑通了几何与优化两条故事线。

**练习 3**：实验 2 中把 eta 改成 0.3 再训练，观察损失是否震荡甚至发散，并用第 43 章的收敛窗口解释现象。

<details>
<summary>点开查看逐步解答</summary>

这组数据的曲率矩阵最大特征值约 16.7（由 $\sum x^2=30,\sum x=10,n=4$ 组成），稳定窗口上限约 $2/16.7\approx0.12$。$\eta=0.3$ 越窗，更新因子绝对值超过 1，损失上下乱跳不降反升。**换数据 = 换地形 = 重估步长**，这就是实践中要做特征缩放的原因。
</details>

## 7. 选读：为什么损失碗是完美的

<details>
<summary>选读 · 二次型视角</summary>

把 $E(w,b)$ 展开，交叉项与平方项拼成一个二次型 $\tfrac12\theta^{\mathsf T}A\theta+\cdots$，其中 $\theta=(w,b)$，

$$A=\frac{2}{n}\begin{pmatrix}S_{xx} & S_x\\ S_x & n\end{pmatrix}$$

它的行列式 $\frac{4}{n^2}(nS_{xx}-S_x^2)>0$ 当且仅当各 $x_i$ 不全相同——此时 $A$ 正定，碗严格凸、谷底唯一（第 21 章正定课的直接应用）。这也解释了练习 3 的窗口：正定的曲率矩阵给出有限的特征值上限，学习率必须装进 $2/\lambda_{\max}$ 以内。
</details>

## 8. 下一站

房价是"多少钱"的问题。换一个问题——"用户会不会点击"，答案不再是数字而是概率。把直线的输出压进 0 和 1 之间，就得到逻辑回归。

→ [逻辑回归与交叉熵](./30-logistic-regression.md)
