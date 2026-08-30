---
title: 公式速查表
description: 卷一公式的紧凑索引，按主题分节，忘了就回来翻
lesson_id: python-tools/formula-sheet
prereqs: []
introduces_math: []
introduces_builtin: []
introduces_import: []
---

# 公式速查表

本页是卷一出现过的公式的一行版索引：不解释、不推导、只给结论。想看某个公式的来龙去脉，去对应章节的正文。

## 算术与运算律

| 名称 | 公式 / 规则 |
| --- | --- |
| 加法交换律 | $a+b=b+a$ |
| 乘法交换律 | $a\times b=b\times a$ |
| 加法结合律 | $(a+b)+c=a+(b+c)$ |
| 乘法结合律 | $(a\times b)\times c=a\times(b\times c)$ |
| 分配律 | $a\times(b+c)=a\times b+a\times c$ |
| 减法与除法 | 不满足交换律和结合律 |
| 运算优先级 | 括号 → 乘方/开方 → 乘除 → 加减；同级从左到右 |

## 分数与小数

| 名称 | 公式 |
| --- | --- |
| 约分 | $\dfrac{a\times k}{b\times k}=\dfrac{a}{b}$ |
| 分数乘法 | $\dfrac{a}{b}\times\dfrac{c}{d}=\dfrac{a\times c}{b\times d}$ |
| 分数除法 | $\dfrac{a}{b}\div\dfrac{c}{d}=\dfrac{a}{b}\times\dfrac{d}{c}$ |
| 分数加减 | $\dfrac{a}{b}\pm\dfrac{c}{d}=\dfrac{a\times d\pm b\times c}{b\times d}$ |
| 分数变小数 | 分子除以分母 |
| 小数变分数 | 看位值：一位小数分母为 10，两位为 100……再约分 |
| 百分数互化 | 小数 ×100 加 % 变百分数；百分数去掉 % 再 ÷100 变小数 |

## 幂、根与对数

| 名称 | 公式 |
| --- | --- |
| 同底相乘 | $a^m\cdot a^n=a^{m+n}$ |
| 同底相除 | $a^m\div a^n=a^{m-n}$ |
| 幂的幂 | $(a^m)^n=a^{m\times n}$ |
| 积的幂 | $(ab)^n=a^n b^n$ |
| 零次幂 | $a^0=1$（$a\neq0$） |
| 负指数 | $a^{-n}=\dfrac{1}{a^n}$ |
| 分数指数 | $a^{m/n}=\sqrt[n]{a^m}$ |
| 根式的乘积 | $\sqrt{ab}=\sqrt{a}\times\sqrt{b}$（$a,b\ge0$） |
| 根式的商 | $\sqrt{\dfrac{a}{b}}=\dfrac{\sqrt{a}}{\sqrt{b}}$（$a,b>0$） |
| 对数的加法 | $\log_a(xy)=\log_a x+\log_a y$ |
| 对数的减法 | $\log_a(x/y)=\log_a x-\log_a y$ |
| 指数提出去 | $\log_a x^k=k\log_a x$ |
| 回到本体 | $a^{\log_a x}=x,\quad \log_a 1=0$ |

## 代数式与方程

| 名称 | 公式 |
| --- | --- |
| 平方差 | $a^2-b^2=(a+b)(a-b)$ |
| 完全平方（加） | $(a+b)^2=a^2+2ab+b^2$ |
| 完全平方（减） | $(a-b)^2=a^2-2ab+b^2$ |
| 判别式 | $\Delta=b^2-4ac$：正则两实根，零则一根，负则无实根 |
| 求根公式 | $x=\dfrac{-b\pm\sqrt{b^2-4ac}}{2a}$（$ax^2+bx+c=0$，$a\neq0$） |

## 几何

| 名称 | 公式 |
| --- | --- |
| 三角形内角和 | $\alpha+\beta+\gamma=180^\circ$ |
| 三角形面积 | $S=\dfrac{1}{2}\times\text{底}\times\text{高}$ |
| 勾股定理 | 直角三角形中 $a^2+b^2=c^2$（c 为斜边） |
| 圆的周长 | $C=2\pi r$ |
| 圆的面积 | $S=\pi r^2$ |
| 弧长（圆心角 θ°） | $l=\dfrac{\theta}{360}\times 2\pi r$ |
| 弧长（弧度制） | $l=r\theta$ |
| 扇形面积（θ°） | $S=\dfrac{\theta}{360}\times\pi r^2$ |
| 扇形面积（弧度制） | $S=\dfrac{1}{2}r^2\theta$ |

## 三角函数

| 名称 | 公式 |
| --- | --- |
| 基本恒等式 | $\sin^2 a+\cos^2 a=1$ |
| 正切定义 | $\tan a=\dfrac{\sin a}{\cos a}$ |
| 和角公式（正弦） | $\sin(a+b)=\sin a\cos b+\cos a\sin b$ |
| 和角公式（余弦） | $\cos(a+b)=\cos a\cos b-\sin a\sin b$ |
| 二倍角（正弦） | $\sin 2a=2\sin a\cos a$ |
| 二倍角（余弦） | $\cos 2a=\cos^2 a-\sin^2 a$（三形态与降幂的来历见[倍角公式与降幂](../07-trigonometry/42-double-angle.md)） |

## 数列

| 名称 | 公式 |
| --- | --- |
| 等差数列通项 | $a_n=a_1+(n-1)d$（d 为公差） |
| 等差数列求和 | $S_n=\dfrac{n(a_1+a_n)}{2}$ |
| 等比数列通项 | $a_n=a_1 r^{n-1}$（r 为公比） |
| 等比数列求和 | $S_n=a_1\times\dfrac{1-r^n}{1-r}$（$r\neq1$） |

## 计数、概率与统计

| 名称 | 公式 |
| --- | --- |
| 排列 | $P(n,k)=\dfrac{n!}{(n-k)!}$（选 k 个还排顺序） |
| 组合 | $C(n,k)=\dbinom{n}{k}=\dfrac{n!}{k!\,(n-k)!}$（只挑不排队） |
| 平均值 | $\bar{x}=\dfrac{1}{n}\displaystyle\sum_{i=1}^{n}x_i$ |
| 方差 | $\sigma^2=\dfrac{1}{n}\displaystyle\sum_{i=1}^{n}(x_i-\bar{x})^2$ |
| 标准差 | $\sigma=\sqrt{\sigma^2}$ |

## 数论

| 名称 | 公式 |
| --- | --- |
| 带余除法 | $a = q\,m + r$（$0 \le r < m$），记 $r = a \bmod m$ |
| 同余 | $a \equiv b \pmod m \iff m \mid (a-b) \iff a \bmod m = b \bmod m$ |
| 欧几里得算法 | $\gcd(a,b) = \gcd(b,\ a \bmod b)$，遇整除收工 |
| 素数分布（量级） | $n$ 以内素数约 $n/\ln n$ 个，素数平均间隔约 $\ln n$ |

## 线性代数

| 名称 | 公式 |
| --- | --- |
| 向量加法 / 数乘 | 对应分量各自相加、各自乘倍数 |
| 点积 | $u\cdot v = u_xv_x + u_yv_y = \lvert u\rvert\,\lvert v\rvert\cos\theta$ |
| 垂直判据 | $u \cdot v = 0 \iff u \perp v$（同向为正、反向为负） |
| 矩阵 × 向量 | 结果的第 $i$ 个分量 = 矩阵第 $i$ 行与向量的点积；矩阵的两列就是新基向量的落点 |
| 二阶行列式 | $\det\begin{pmatrix}a&b\\c&d\end{pmatrix} = ad - bc$＝面积缩放倍数，负号表示翻转 |
| 投影系数 | $u$ 在 $v$ 上的影子 $= \dfrac{u\cdot v}{v\cdot v}\,v$ |

## 复数

| 名称 | 公式 |
| --- | --- |
| 共轭与模 | $\overline{a+bi}=a-bi$；$\lvert z\rvert=\sqrt{a^2+b^2}$；$z\,\overline{z}=\lvert z\rvert^2$ |
| 极形式 | $z = \lvert z\rvert(\cos\theta + i\sin\theta) = \lvert z\rvert e^{i\theta}$ |
| 乘法的几何 | 模相乘，辐角相加（乘 $i$ ＝逆时针转 90°） |
| 欧拉公式 | $e^{i\theta}=\cos\theta+i\sin\theta$；取 $\theta=\pi$ 得 $e^{i\pi}+1=0$ |

## 微积分

导数表：

| 函数 | 导数 |
| --- | --- |
| $x^n$ | $nx^{n-1}$ |
| $\sin x$ | $\cos x$ |
| $\cos x$ | $-\sin x$ |
| $e^x$ | $e^x$ |
| $\ln x$ | $\dfrac{1}{x}$ |

积分表：

| 函数 | 不定积分 |
| --- | --- |
| $x^n$ | $\dfrac{x^{n+1}}{n+1}+C$（$n\neq-1$） |
| $\dfrac{1}{x}$ | $\ln\lvert x\rvert+C$ |
| $e^x$ | $e^x+C$ |
| $\sin x$ | $-\cos x+C$ |
| $\cos x$ | $\sin x+C$ |

| 名称 | 公式 |
| --- | --- |
| 牛顿–莱布尼茨公式 | $\displaystyle\int_a^b f(x)\,dx=F(b)-F(a)$，其中 $F'(x)=f(x)$ |

## 级数与泰勒展开

| 名称 | 公式 |
| --- | --- |
| 几何级数求和 | $\displaystyle\sum_{n=0}^{\infty} r^n=\frac{1}{1-r}$（$\lvert r\rvert<1$ 时收敛） |
| 正弦展开前三项 | $\sin x=x-\dfrac{x^3}{3!}+\dfrac{x^5}{5!}-\cdots$ |
| 余弦展开前三项 | $\cos x=1-\dfrac{x^2}{2!}+\dfrac{x^4}{4!}-\cdots$ |
| 指数展开前三项 | $e^x=1+x+\dfrac{x^2}{2!}+\cdots$ |

## 傅里叶

| 名称 | 公式 |
| --- | --- |
| 傅里叶系数 aₙ | $a_n=\dfrac{2}{T}\displaystyle\int_0^T f(x)\cos\Big(\dfrac{2\pi n}{T}x\Big)dx$ |
| 傅里叶系数 bₙ | $b_n=\dfrac{2}{T}\displaystyle\int_0^T f(x)\sin\Big(\dfrac{2\pi n}{T}x\Big)dx$ |
| DFT 一行版 | $X[k]=\dfrac{1}{N}\displaystyle\sum_{n=0}^{N-1}x[n]\,e^{-2\pi i kn/N}$ |
