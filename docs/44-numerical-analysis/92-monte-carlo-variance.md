---
title: 蒙特卡洛方法与方差缩减
lesson_id: numerical-analysis/monte-carlo-variance
prereqs:
  - probability-advanced/inverse-transform-sampling
volume: 5
layer: L6
track:
  - scientific-computing
  - optimization-control
stage: university-core
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - monte-carlo-method
  - variance-reduction
applications:
  - high-dimensional-integration
  - financial-simulation
exits:
  - engineering
  - data-ai
---

# 蒙特卡洛方法与方差缩减

## 1. 从一个场景开始

赌场老板打了个赌：往一块边长为 $1$ 的正方形木板上随意撒豆子，落在以左下角为圆心、半径为 $1$ 的**四分之一圆盘**里的比例，应当等于圆盘面积与方框面积之比——也就是 $\dfrac{\pi}{4}$。换句话说，**数豆子就能称出圆周率**。

撒两百颗，比例晃得厉害；撒二十亿颗，又贵得离谱。这一课回答三个递进的问题：为什么平均能当积分用？误差凭什么按 $\dfrac{1}{\sqrt{N}}$ 收缩？以及最实用的一问——能不能不加班加点，让每一颗豆子都更聪明？

## 2. 直觉解释

蒙特卡洛的心脏只有一句话：**平均就是积分**。若 $U$ 是 $[0,1]$ 上均匀的随机数，那么

$$\mathbb{E}[f(U)] \;=\; \int_0^1 f(x)\,dx$$

左边按概率加权平均，右边是曲线下的面积——同一个数的两种记账法。于是任何积分都能外包给抽签机，剩下的工作只是数平均值与盯紧误差。

误差有多大？中心极限定理（第 36 章）管着它：

$$\text{标准误}=\frac{\sigma}{\sqrt{N}}$$

这份合同有两处惊人的条款。其一，**很慢**：想多一位准确数字要付一百倍的豆子——$\sqrt{N}$ 是出了名的守财奴；其二，却是惊喜：**与维度无关**。二维网格求积要布下 $n^2$ 个点、十维要 $n^{10}$ 个（维数灾难），而蒙特卡洛不管积分区间多高维，依旧只看 $N$ 本身。高维积分的现实世界里，它是唯一的常驻选手。

既然加 $N$ 又贵又慢，聪明人转向另一本账：**压低 $\sigma$**。这就是方差缩减——不用更多豆子，而是设计抽样方式让每次估计天生更稳。两大招式：对偶变量（成对下单互相抵消）与控制变量（带着已知答案的参照物对账）。

```viz
{
  "type": "plot",
  "title": "被积函数 4√(1−x²)：底部宽为 1，平均高度就是 π",
  "expr": "4 * sqrt(1 - x^2)",
  "expr2": "pi",
  "label": "被积函数",
  "label2": "参考线 y=π",
  "xmin": 0,
  "xmax": 1
}
```

曲线的面积为 $\pi$，底边长为 $1$，所以它的**平均高度恰好等于圆周率**。蒙特卡洛估的就是这条虚线的位置：豆子越多，估出的水平面越稳。

## 3. 正式定义

设 $X_1,\dots,X_n$ 独立同分布于密度 $p$，要估 $\mu=\mathbb{E}_p[f(X)]$：

$$\hat{\mu}_n=\frac{1}{n}\sum_{i=1}^{n}f(X_i),\qquad \mathrm{Var}(\hat{\mu}_n)=\frac{\sigma_f^2}{n},\qquad \sigma_f^2=\mathrm{Var}(f(X))$$

两种缩减术的定义：

| 招式 | 构造 | 有效方差 |
| --- | --- | --- |
| 对偶变量 | $\bar{Y}=\dfrac{f(U)+f(1-U)}{2}$，一对豆子共用一个随机数 | 单份 $\tfrac{\sigma_f^2+\mathrm{Cov}}{2}$；$f$ 单调时 Cov 为负，稳赚 |
| 控制变量 | $Y=f(X)+c\,(g(X)-\mu_g)$，$g$ 的期望 $\mu_g$ 已知 | 取 $c^\ast=-\dfrac{\mathrm{Cov}(f,g)}{\mathrm{Var}(g)}$ 时 $\mathrm{Var}(Y)=\sigma_f^2(1-\rho^2)$ |

两条阅读提示：对偶变量从不吃亏（单调函数保证负相关），控制变量的上限近乎魔法——参照物挑得好时相关性 $\rho\to1$，方差几乎被抽干。两者的共同前提都是**先用免费信息把随机性驯服一部分**，再让剩下的随机性去干活。

## 4. 分步例题

**例**：用豆子称 $\pi$。令 $f(u)=4\sqrt{1-u^2}$，则目标积分

$$\pi=\int_0^1 f(u)\,du=\mathbb{E}[f(U)]$$

1. 认清工具：每个 $u_i$ 由 `random.random()` 均匀抽取，$f(u_i)$ 就是"这颗豆子的高度"；
2. 汇总报价：$\hat{\pi}=\frac{1}{N}\sum f(u_i)$；
3. 给出不确定度预算：理论 $\sigma_f\approx0.89$（由 $\mathrm{Var}=E[f^2]-\pi^2=\frac{32}{3}-\pi^2\approx0.80$ 开方），取 $N=20000$ 得标准误约 $\frac{0.89}{141}\approx0.0063$；
4. 实测验收：固定种子的仿真给出报价 $\hat{\pi}\approx3.130$，偏差约 $0.012$——一次运行可以偏离一两个标准误那么远（$0.012$ 约为两个标准误）：中心极限定理许诺的是**典型尺度**，不是保票（稍后代码复现）；
5. 反向使用公式：想要 ±0.0005 的精度需 $N\approx(0.89/0.0005)^2\approx320$ 万颗——守财奴本色暴露无遗，方差缩减登场的动机就此写好。

## 5. 动手实验

### 实验 1：真的能靠抽签称出 π 吗

```python title="两万颗豆子：蒙特卡洛版 π 报价单"
import random                       # 随机器（第 0 章登记过）
random.seed(2024)                   # 固定种子：全站任何人重跑结果一致

N = 20000                           # 豆子总数
acc = 0.0                           # 高度累加器
sq_acc = 0.0                        # 高度平方累加器（自估方差用）
for t in range(N):
    u = random.random()             # 均匀撒在 0 到 1 上
    f = 4 * (1 - u * u) ** 0.5      # 这颗豆子底下垫着的被积函数值
    acc += f
    sq_acc += f * f

est_pi = acc / N                    # 报价一：π 的估计
sd_emp = (sq_acc / N - est_pi ** 2) ** 0.5   # 自算的样本标准差 σ
print(round(est_pi, 3))             # 报价本身
print(round(sd_emp, 4))             # σ 的实测值
print(round(sd_emp / N ** 0.5, 4))  # 标准误 = σ / √N
print(abs(est_pi - 3.141592653589793) < 0.05)   # 与真值的距离在预算带内吗？
```

对照脚本输出的意义：`3.13` 距真值约 $0.012$——果然是一次典型的两标准误抖动；自算 σ 约 `0.9035`（理论预告 $0.89$ 的近亲）；标准误 `0.0064` 恰好用公式 $\sigma/\sqrt{N}$ 复现了第 3 步的手算预算；末行 `True` 只是宽口径体检（$\pm0.05$），真正的工程交付物永远是「点估计 + 误差棒」这对组合。种子锁死后这套输出全球通用——随机的方法，确定的教学。

### 实验 2：对偶变量——让豆子互为砝码

估 $\displaystyle\int_0^1 e^x\,dx=e-1$：朴素平均与对偶配对各跑一份账，共用同一批随机数公平竞赛。

```python title="同一批豆子：朴素抽签 对 打对折的对偶配对"
import math                         # 指数函数 exp 住在 math 里
import random                       # 随机器（第 0 章登记过）

true_val = math.exp(1) - 1          # 解析真值 e − 1
print(true_val)

random.seed(42)
P = 4000                            # 配对数（每对消耗一个随机数）
sum_c = 0.0; sq_c = 0.0             # 朴素法的累加器
sum_a = 0.0; sq_a = 0.0             # 对偶法的累加器
for i in range(P):
    u = random.random()
    fc = math.exp(u)                # 朴素单票
    fa = (math.exp(u) + math.exp(1 - u)) / 2   # 一对互补样本取平均
    sum_c += fc; sq_c += fc * fc
    sum_a += fa; sq_a += fa * fa

est_c = sum_c / P; est_a = sum_a / P
var_c = sq_c / P - est_c ** 2       # 两组经验方差
var_a = sq_a / P - est_a ** 2
print(round(est_c, 3), round(est_a, 3))
print(var_a < var_c / 2)            # 至少减半才配叫"缩减"
```

输出 `1.723, 1.717` 与一行 `True`：对偶版不仅更贴真值 `1.718281828459045`，经验方差还缩到了朴素版的约十五分之一——因为 $e^x$ 严格上升，$u$ 抽大时 $1-u$ 必然拖后腿，两笔误差天然对冲。方差小了十五倍，等价于免费用上千倍豆子。

### 实验 3：控制变量——带上已知的尺子去测量

选参照物 $g(x)=x$（均值 $\frac12$ 人尽皆知），$c^\ast=-\mathrm{Cov}/\mathrm{Var}$ 可由解析式算出约 $-1.6903$：

```python title="控制变量：拿已知均值校正每小时读数"
import math                         # exp、e 常数都要用
import random

random.seed(2026)
M = 4000
cov_exact = 1 - (math.exp(1) - 1) / 2      # Cov(f, X) = E[Xe^X] − μf·μX 的解析值
c_opt = -cov_exact / (1 / 12)              # 除以 Var(X)=1/12 得最优系数
print(round(cov_exact, 6), round(c_opt, 6))

acc_y = 0.0; sq_y = 0.0
for i in range(M):
    u = random.random()
    y = math.exp(u) + c_opt * (u - 0.5)    # 用参照物的偏离量修正主读数
    acc_y += y; sq_y += y * y

est_y = acc_y / M
var_y = sq_y / M - est_y ** 2
var_f_theory = (math.exp(2) - 1) / 2 - (math.exp(1) - 1) ** 2   # 主量的理论方差
print(round(est_y, 3))
print(var_y < var_f_theory / 10)
```

报价 `1.717` 同样咬住真值；校验行 `True`——修正后的方差连理论主方的十分之一都不到（实际约六十分之一，相关性 $\rho\approx0.99$ 把方差几乎吸干）。参照物越像主角，白捡的信息越多：这是控制变量的一句总纲。

### 快问快答

```quiz
标准误 σ/√N 里最令人惊讶的性质是什么？
- 积分维度越高收敛越快
- 收缩速度只看样本量，不看积分的维度 [*]
- 精度随 N 线性提升
? 网格法在高维会被 n^d 压垮，蒙特卡洛的误差公式里根本没有 d——高维积分因此成了它的主场。
```

:::warning[常见误区]

**误区一**："随机方法的答案是随机的。" 单次运行确实会抖，但工程交付物是"点估计 + 不确定度"这对组合拳：固定种子做开发，改种子做压力测试，两者缺一不可。

**误区二**："方差缩减总是划算。" 对偶变量要求函数单调否则可能空忙；控制变量若参照物与主角不相干（ρ≈0），$c^\ast$ 引入的额外噪声反而添乱。先算相关性再上户口。

**误区三**："多一位精度就多撒一百倍豆子也无所谓。" 金额算成电费你会立刻清醒：±三位数字要 $10^6$ 量级样本，±六位就是 $10^{12}$——所以真正的路线图永远是降方差，不是搬砖。

:::

## 6. 练习

**练习 1**（概念）：解释为什么"$f$ 单调"是对偶变量稳赚不赔的条件，并用一句几何直觉说明负相关从哪来。

<details>
<summary>点开查看逐步解答</summary>

$f$ 单调递增时，$u$ 越大则 $f(u)$ 越大、同时 $f(1-u)$ 越小——两个样本朝相反方向错，配对平均后偏差部分相消，协方差必为负。几何直觉：割线两端一边高一边低，谷底的抖动被天平的另一端托住；若函数非单调（比如抛物线），两侧可能一起偏高或偏低，对冲收益打折甚至消失。这也是为什么练习前的实验特意挑了严格上升的 $e^x$。
</details>

**练习 2**（判题）：下面代码声称实现了对偶变量，但配对的另一端写成了复制第一端的赝品——平均完还是原值，方差纹丝不动。请改成真正的互补样本并让三项体检全部过关。

```exercise
# @title: 练习：修好对偶变量的另一半
# @check: True
# @check: 1.72
# @check: True
# @hint: 互补样本是 f(1 − u)：u 变大它变小，协方差才会转负。
import math
import random

random.seed(7)
PAIRS = 8000
tot_single = 0.0; sq_single = 0.0    # 朴素法的两本账
tot_pair = 0.0; sq_pair = 0.0        # 对偶法的两本账
for i in range(PAIRS):
    u = random.random()
    fu = math.exp(u)
    f_partner = fu                   # ← 错了：这自己抄自己，不是对偶
    pair_mean = (fu + f_partner) / 2
    tot_single += fu; sq_single += fu * fu
    tot_pair += pair_mean; sq_pair += pair_mean * pair_mean

est_single = tot_single / PAIRS
est_pair = tot_pair / PAIRS
vs = sq_single / PAIRS - est_single ** 2
vp = sq_pair / PAIRS - est_pair ** 2
tv = math.exp(1) - 1

print(vp * 2 < vs)                          # 方差至少砍半？
print(round(est_pair, 2))                   # 报价达到两位小数的准确档位
print(abs(est_pair - tv) < abs(est_single - tv))   # 对偶比朴素更靠近真值
```

修好后三行输出 `True`、`1.72`、`True`：方差真的折半有余，报价贴近真值，而且比朴素同行表现更好——三项体检构成完整的验收链，缺一条都会放过伪对偶。

**练习 3**：想把引子里 π 的标准误压到 $\pm0.0005$，豆子该加到什么数量级？先把公式的答案算出来，再估算这个样本量在上限四分之一圆里的积分邻居（梯形法则）面前是否还有竞争力。

<details>
<summary>点开查看逐步解答</summary>

需求换算：$\dfrac{\sigma}{\sqrt{N}}=0.0005$ 给出 $N=\left(\dfrac{0.89}{0.0005}\right)^2\approx3.2\times10^6$——三百多万颗豆子换一位数字。而本课梯形法只需几十个节点就进 $10^{-6}$ 档：一维光滑问题上确定性方法碾压随机法毫无悬念。蒙特卡洛的真实主场在别处：积分变量数百个的风险敞口计算、路径依赖的期权定价——那里连"画网格"三个字都不存在，随机平均是唯一活着的地基。**选型看战场，不崇拜任何单一武器。**
</details>

## 7. 选读：重要性采样——把概率往刀刃上赶

<details>
<summary>选读 · 第三种（也是最富想象力）的缩减</summary>

对偶与控制都在原分布上做文章；重要性采样干脆修改采样分布：估算 $\mathbb{E}[f]=\int f(x)p(x)dx$ 时改从含可调参数的 $q(x)$ 抽样，再用权重 $\frac{p(x)}{q(x)}$ 把平均拉回正确轨道。思路直白如商业谈判——把宝贵的样本预算集中花在被积函数真正起伏的地段，那里才是方差的产地；别浪费弹药在平原上。经典战例是稀有事件模拟（尾部风险、通信中断概率）：朴素抽样一千万次也许只有三次命中，而贴着尾部的 $q$ 让每次抽样都有话可说。附加礼物是它与贝叶斯计算的接口——第 39 章的重要性加权重用同一套数学。纪律同样明码标价：$q$ 偏得太远会让权重方差爆炸，一切收益反噬归零（"先审 $pq$ 重叠度，再谈加速比"）。

</details>

## 8. 下一站

骰子已经掷进了微积分、线性代数和金融风险库房。它们吃下的那亿万粒"均匀随机数口粮"，又是谁生产的？顺流而上看看逆变换采样在生成模型车间里如何开工——同时也是本章全部武器的实战演练场。

→ [从分布采样](../49-generative-models/20-sampling.md)
