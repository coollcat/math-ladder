---
title: 过拟合、欠拟合与验证
lesson_id: ml-math/overfitting
prereqs:
  - ml-math/linear-regression
  - learning-theory/generalization-gap
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
  - overfitting
  - underfitting
  - model-complexity
applications:
  - sales-forecasting
  - credit-risk-monitoring
exits:
  - data-ai
---

# 过拟合、欠拟合与验证

## 1. 从一个场景开始

你给 6 个历史成交点拟合房价曲线。用直线：训练误差不小，但看着挺稳；换成 5 次多项式：训练误差**精确归零**，六个点一颗不漏。你正要庆祝，第二周来了三套新房源——5 次曲线的预测离谱到不敢看，直线反而八九不离十。

**把训练数据背得越熟，未必越会考试。** 这一课讲清楚这对矛盾如何量化、如何提前发现、如何控制。

## 2. 直觉解释

模型容量像学生的复习方式：

- **欠拟合**（容量不足）：死记公式不懂变通——训练集上都考不好，新题更糟；
- **过拟合**（容量过剩）：把练习册每道题的答案连标点都背下来——模拟考满分，正式考崩盘；
- **恰到好处**：抓住了规律本身。

第 41 章已经给出理论名字（泛化鸿沟、偏差—方差权衡）。本章补上实操三板斧：

1. **切分数据**：训练集用来学、验证集用来监考——监考卷绝不能提前泄露；
2. **监控两条曲线**：训练误差持续下降而验证误差开始回升的那一刻，就是过拟合的案发时间；
3. **调节复杂度旋钮**：换更简单的模型、加正则化、或提前收手。

## 3. 正式定义

把数据随机切成两部分：$\mathcal{D}_{train}$ 用于估计参数，$\mathcal{D}_{val}$ 只用于评估。

$$E_{train}=\frac{1}{\lvert\mathcal{D}_{train}\rvert}\sum_{i\in train}L(y_i,\hat y_i),\qquad E_{val}=\frac{1}{\lvert\mathcal{D}_{val}\rvert}\sum_{i\in val}L(y_i,\hat y_i)$$

| 症状 | $E_{train}$ | $E_{val}$ | 药方 |
| --- | --- | --- | --- |
| 欠拟合 | 高 | 高（两者接近） | 加大容量、加特征、训久一点 |
| 过拟合 | 很低 | 明显更高且随容量增大上升 | 减容量、正则化、更多数据 |
| 健康区间 | 较低 | 与训练误差接近且最低 | 就停在这里 |

复杂度扫描的经典图像：横轴是模型容量，两条误差曲线先同降（欠拟合区）、后分叉（过拟合区），$E_{val}$ 的最低点即最佳容量的落点。

## 4. 分步例题

**例**：6 个带噪声的样本来自二次规律 $y=x^2+1$ 加小扰动；另留 5 个干净点做验证（与动手实验同一套数据，这里直接读结论）：

1. 一次模型：训练 MSE $\approx0.20$，验证 MSE $\approx0.09$——双双偏高，欠拟合；
2. 二次模型：训练 MSE $=0.045$，验证 MSE $\approx0.000$——两线皆低，健康；
3. 五次模型：训练 MSE $=0.0000$（六个参数恰好穿过六个带噪点），验证 MSE 反弹到 $0.189$——过拟合实锤；
4. 决策规则一目了然：选**验证误差最低**的二次模型，而不是训练误差最低的五次；
5. 复盘：五次多项式的自由参数有 6 个，与样本数持平——它不是在"学规律"，是在"画等高线绕开每个噪声钉子"。

## 5. 动手实验

### 实验 1：容量扫描——亲手找出最佳次数

先把连续形状看清楚：蓝线是训练误差，随容量上升缓慢下降；橙虚线是验证误差，先降后升。拖动陡升系数，体会“剪刀口”张开的时刻。下面再用 Python 算出五个离散次数的精确成绩单。

```viz
{
  "type": "plot",
  "title": "容量扫描示意图：训练误差与验证误差分道扬镳",
  "expr": "0.05 + 0.15/x",
  "expr2": "0.02 + 0.10/x + c*x^2",
  "label": "train",
  "label2": "validation",
  "xmin": 1,
  "xmax": 5,
  "sliders": [
    { "name": "c", "min": 0.002, "max": 0.03, "step": 0.001, "value": 0.01 }
  ]
}
```

```python title="多项式次数从 1 扫到 5：训练误差与验证误差的分道扬镳"
xs = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0]
ys = [2.10, 1.12, 1.30, 0.78, 1.60, 1.90]      # 真规律 y=x^2+1 加噪声
x_val = [-0.8, -0.4, 0.0, 0.4, 0.8]            # 监考卷：模型从未见过的点
y_val = [v * v + 1 for v in x_val]

def gauss_solve(a, b):
    """高斯消元解线性方程组（第 21 章的老朋友）"""
    n = len(b)
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))   # lambda：临时小函数，选主元
        a[col], a[pivot] = a[pivot], a[col]
        b[col], b[pivot] = b[pivot], b[col]
        for row in range(col + 1, n):
            factor = a[row][col] / a[col][col]
            for k in range(col, n):
                a[row][k] = a[row][k] - factor * a[col][k]
            b[row] = b[row] - factor * b[col]
    out = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = sum(a[i][k] * out[k] for k in range(i + 1, n))
        out[i] = (b[i] - s) / a[i][i]
    return out

def ls_fit(degree):
    """最小二乘拟合 degree 次多项式：解正规方程（思路同第 20 课）"""
    rows = degree + 1
    S = [0.0] * (2 * rows)                     # S[m] = sum(x^m)
    T = [0.0] * rows                           # T[j] = sum(y * x^j)
    for i in range(len(xs)):
        power = 1.0
        for m in range(2 * rows):
            S[m] = S[m] + power
            power = power * xs[i]
        power = 1.0
        for j in range(rows):
            T[j] = T[j] + ys[i] * power
            power = power * xs[i]
    a_mat = [[S[r + c] for c in range(rows)] for r in range(rows)]
    return gauss_solve(a_mat, T)

def eval_poly(cs, t):
    return sum(c * t ** k for k, c in enumerate(cs))   # enumerate：下标与值一起给

for degree in [1, 2, 3, 4, 5]:
    cs = ls_fit(degree)
    e_train = sum((eval_poly(cs, xs[i]) - ys[i]) ** 2 for i in range(len(xs))) / len(xs)
    e_val = sum((eval_poly(cs, x_val[j]) - y_val[j]) ** 2 for j in range(len(x_val))) / len(x_val)
    print(f"degree={degree}: train={round(e_train, 4)}, val={round(e_val, 3)}")
```

读表：`degree=1` 两头都差（欠拟合）；`degree=2` 验证误差几乎归零——真实规律是二次，被监考卷干净地认了出来；`degree=5` 训练误差归零（六个参数正好穿过六个点）而验证误差反弹到约 0.19——**过拟合实锤**。（更高次数还会撞上病态正规方程，呼应第 44 章的条件数。）

### 实验 2：两条曲线的岔路口

```python title="训练/验证误差随容量变化的示意曲线"
import matplotlib.pyplot as plt

degrees = [1, 2, 3, 4, 5]
train_err = [0.20, 0.045, 0.040, 0.040, 0.0]
val_err = [0.093, 0.000, 0.003, 0.003, 0.189]

plt.plot(degrees, train_err, marker="o", label="train")
plt.plot(degrees, val_err, marker="s", label="validation")
plt.axvline(2, color="gray", linestyle="--")
plt.xlabel("model capacity (degree)")
plt.ylabel("mse")
plt.legend()
plt.grid(True)
```

灰线处验证误差触底：左边欠拟合区两条线挤在一起，右边过拟合区张开剪刀口。**读图能力 = 读出剪刀开口的方向。**

### 快问快答

```quiz
验证集误差远高于训练集误差，最可能发生了什么？
- 学习率太小
- 过拟合：模型记住了训练数据的细节，没学到可迁移的规律 [*]
- 数据太多了
? 训练与验证的落差正是泛化鸿沟的直接测量；差距越大说明记忆成分越多。
```

:::warning[常见误区]

**误区一**："验证集表现差就回去在验证集上调参直到满意。" 反复偷看监考卷会让验证集退化成第二个训练集——最终评估必须留第三份从未谋面的测试集（或交叉验证轮换）。

**误区二**："过拟合是因为数据脏/算法烂。" 它是容量与数据量失衡的必然现象：给足数据或限制容量都能缓解，不丢人但要管。

**误区三**："训练误差为零就该报警。" 在无噪数据或插值任务上零训练误差完全正常；判断标准永远是**验证侧的表现**而非训练侧的分数。

:::

## 6. 练习

**练习 1**（概念）：同事汇报"模型 A 训练误差 0.01，模型 B 训练误差 0.05"，并主张选 A。你还需要哪两个数字才能做决定？

<details>
<summary>点开查看逐步解答</summary>

需要 A 与 B 各自的**验证误差**。若 A 是 0.30、B 是 0.07，该选 B——A 的鸿沟说明它在背题。一句话：**比较模型只看监考成绩，训练成绩只用来诊断症状。**
</details>

**练习 2**（判题）：初始代码把全部数据都拿来训练又拿来做评估——既当运动员又当裁判，验证误差必然虚低。请改成"前 4 个训练、后 2 个验证"的诚实评估：

```exercise
# @title: 练习：切分训练集与验证集
# @check: 0.025
# @check: 0.065
# @hint: 训练用 xs[:4]，验证用 xs[4:]；两边各自算均方误差。
xs = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
ys_true = [2.1, 3.9, 6.2, 7.8, 10.3, 11.8]

w, b = 2.0, 0.0                       # 已经训练好的模型（本练习聚焦评估环节）

def mse_over(idx_list):
    total = 0.0
    for i in idx_list:
        err = ys_true[i] - (w * xs[i] + b)
        total = total + err * err
    return total / len(idx_list)

all_idx = list(range(6))
e_train = mse_over(all_idx)           # ← 错了：用全部 6 个点冒充训练误差
e_val = mse_over(all_idx)             # ← 更错：验证集就是训练集自己

print(round(e_train, 3))
print(round(e_val, 3))
```

修好后两行输出 `0.025` 和 `0.065`：验证误差比训练误差高一截——真实的泛化鸿沟浮出水面。

**练习 3**：实验 1 中把 ys 全部改成完美的 $y=x^2+1$ 取值（去掉噪声），再看五个次数的成绩单，想想"过拟合还可怕吗"。

<details>
<summary>点开查看逐步解答</summary>

噪声消失后，三次与五次模型只要系数正确就退化为同一个二次函数，训练与验证误差同时趋近零——没有噪声就没有可背的"细节"，容量再大也无害。这印证了过拟合的本质：**对噪声的记忆力**。真实世界永远有噪声，所以容量管理永远必要。
</details>

## 7. 选读：L2 正则化的一瞥

<details>
<summary>选读 · 给损失加上"体积税"</summary>

治过拟合最常用的药方是在损失后追加一项权重惩罚：

$$E_{new}(w,b)=E_{mse}(w,b)+\lambda w^2$$

直觉：平坦平缓的解（权重普遍偏小）对输入扰动不那么敏感，等于强制模型"抓大放小"。$\lambda$ 就是复杂度税的税率——由验证集挑选：$\lambda$ 太小照旧过拟合，太大集体欠拟合，中间某处验证误差最低。这个"损失 + 惩罚"的写法你其实见过：拉格朗日乘数法里约束优化正是这样被改写成无约束问题的——第 43 章与本章在此握手。系统展开留给"L1、L2 正则化与稀疏性"专课。

</details>

## 8. 下一站

监督学习的骨架到此立起来了：损失当目标、回归当发动机、验证当纪律。这些积木在深度学习里将层层堆叠成神经网络——那里，过拟合与正则化的博弈会以更大的规模重演。

→ [第 46 章 · 深度学习](../46-deep-learning/index.md)
