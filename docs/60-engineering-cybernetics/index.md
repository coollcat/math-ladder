---
title: 第 60 章 · 工程控制论与系统工程
description: 把反馈、信息、稳定性和工程组织放回同一个系统里分析。
volume: 5
layer: L9
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
---

# 工程控制论与系统工程

火箭姿态、电网频率、生产线节拍和城市交通看似不同，其实都在问同一组问题：关键状态是什么？哪些量能测？扰动从哪里进入？反馈怎样减小偏差而不放大噪声？

本章扩展第 52 章的控制视角，但不重复 PID 和 LQR 的基础推导，而是进入钱学森《工程控制论》强调的系统科学层面：控制规律、信息反馈、稳定调节和工程实现必须一起分析。

本章你会学到：

1. [从反馈控制到工程控制论](./10-feedback-to-engineering-cybernetics.md)——火箭遇阵风时姿态会偏，电网负荷突增时频率会掉；
2. [系统、环境、信息和调节](./15-systems-information-regulation.md)——高峰期一个路口延长红灯，几条街外的车流也会变化；
3. [黑箱建模与输入输出关系](./20-blackbox-input-output.md)——地面测试台上的航天部件不允许随便拆开；
4. [状态、观测与扰动](./25-state-observation-disturbance.md)——航天测控屏上常显示几十条曲线，但真正的火箭姿态、速度和燃料质量不可能全部直接看到；
5. [反馈放大器的稳定性问题](./30-feedback-amplifier-stability.md)——音响功放本该让信号更稳更干净，但设计不良时会发出啸叫或低频轰鸣；
6. [频率响应与 Bode 图直觉](./35-frequency-response-bode.md)——给结构缓慢加热，它跟得上；
7. [Nyquist 稳定判据直观](./40-nyquist-stability-tour.md)——飞行控制系统认证时，工程师不能只试几个输入；
8. [灵敏度函数](./45-sensitivity-function.md)——天线跟踪卫星时，风扰会让视轴偏移；
9. [鲁棒控制的权衡](./50-robust-control-tradeoff.md)——可回收火箭从稠密大气进入真空，质量、气动力和执行器效率都在变；
10. [大系统分解与协调](./55-large-system-decomposition.md)——一个区域电网包含成千上万机组、负荷和线路；
11. [分层控制：调度、监督、局部回路](./60-hierarchical-control.md)——电网调度中心提前一天定机组组合，几分钟级监督频率偏差，毫秒级逆变器稳住电压；
12. [系统工程的需求闭环](./65-requirements-closed-loop.md)——卫星项目常在总装时才发现：热控按旧轨道设计，电源按新载荷设计，两份文档都“合格”，整机却不成立；
13. [可靠性、冗余与故障树](./70-reliability-redundancy-fault-tree.md)——飞机常有多台看似重复的飞控计算机，因为单个通道可能因芯片、软件、电源或传感器同时失灵；
14. [可观测性、诊断和维护决策](./75-diagnosis-maintenance-decision.md)——风机可以等坏了再修，但吊车进场一次很贵；
15. [最优调度与资源分配](./80-optimal-scheduling-allocation.md)——地面站只有有限通信窗口，工厂只有固定工时；
16. [排队论与吞吐量](./81-queueing-throughput.md)——安检口利用率 90% 时队伍可能很长；
17. [信息反馈在组织系统中的作用](./85-information-feedback-organizations.md)——事故后若只追责个人，流程缺陷会留下；
18. [自动化、人和安全边界](./90-automation-human-safety-boundary.md)——自动驾驶宣传里最危险的一句话是“几乎不需要人接管”；
19. [工程控制论方法地图](./95-engineering-cybernetics-method-map.md)——拿到一个大系统问题，最大风险不是不会公式，而是用错层级：给战略问题做毫秒控制，或给实时失稳写年度报告。

## 学习线

1. **系统建模**：环境与调节、黑箱、状态观测（10–25）；
2. **稳定性与频率**：放大器失稳、Bode、Nyquist、灵敏度和鲁棒性（30–50）；
3. **大系统与组织**：分解协调、分层控制、需求闭环、可靠性与诊断（55–75）；
4. **资源与人机安全**：调度、排队、组织反馈、自动化边界和方法地图（80–95）。

## 历史坐标

钱学森 1954 年出版 *Engineering Cybernetics*，把飞行器工程中的稳定、控制和导航问题整理成可计算的系统方法。它不是孤立奇迹：Nyquist、Bode 和 Wiener 已经铺开道路，Kalman 等人随后继续发展状态空间方法。这里的贡献是历史学科脉络中的接合工作，不应神化个人。

## 前置回望

控制主干默认你已读过第 52 章的开环闭环、状态空间、特征值稳定性与 PID 四课，本章不重复基础推导；排队论与可靠性话题只用到第 36 章的基础概率和一点计数直觉，调度与分配靠第 43 章的优化框架兜底。其余工程化内容（需求闭环、故障树、组织反馈）在本章从零讲起。

:::note[生产状态]

19 门正式课已完成。现有交互全部来自已实现组件或浮窗 Python；`COMPONENT_SPEC.md` 只登记未来可视化候选，不在正文引用。

:::

## 实战挑战 · 瓦特调速器的静差账本

**背景**。1788 年，James Watt 在合伙人 Matthew Boulton 的建议下，把锥摆式离心调速器装上 Boulton & Watt 的旋转式蒸汽机——现存最早几乎原样的一台是伯明翰 Soho 工厂的"Lap Engine"，如今陈列在伦敦科学博物馆。这类装置更早的雏形可追溯到 17 世纪惠更斯用于风车和水车的离心调节器。飞球的道理很朴素：转速偏高→飞球外张上浮→蒸汽阀门关小→转速回落。1868 年，James Clerk Maxwell 发表《On Governors》（*Proceedings of the Royal Society of London*, 16: 270–283），第一次把"调速器+机器"当作耦合动力学系统做线性化稳定性分析；Routh（1875）与 Hurwitz（1895）随后给出判根的一般方法。反馈控制的数学由此起步。

**题目**。这台调速器是**纯比例控制**：蒸汽功率 $P = K_p(100 - n)$，其中 $n$ 是实际转速（转/分），目标 100 转/分，$K_p=40$。平衡时蒸汽功率恰好抵消负载 $L$。

**(a)** 轻载 $L=80$ 时，平衡转速是多少？

**(b)** 重载 $L=160$ 时，平衡转速又是多少？

**(c)** 从轻载到重载的**静差**（droop）百分数是多少？——这正是纯比例控制躲不开的代价：稳态必须留一点误差，阀门才撑得住开度。第一问已示范推导方向：

```exercise
# @title: 实战挑战：比例调速的静差
# @check: 98.00
# @check: 96.00
# @check: 2.00
# @hint: 平衡要求 kp*(setpoint-n)=load，解出 n。静差 = (轻载转速-重载转速)/目标转速*100。
kp = 40
setpoint = 100
loads = [80, 160]

for load in loads:
    speed = setpoint + load / kp   # 错：负荷越重反而转得越快？符号反了
    print(f"{speed:.2f}")

print("droop")                     # 错：这里应输出静差百分数的数值
```

<details>
<summary>点开查看逐步解答</summary>

平衡方程 $K_p(100-n)=L$ 解得 $n=100-L/K_p$：

```python
kp = 40
setpoint = 100
loads = [80, 160]
speeds = []

for load in loads:
    speed = setpoint - load / kp   # 负载越重，能维持的转速越低
    speeds.append(speed)
    print(f"{speed:.2f}")

droop = (speeds[0] - speeds[-1]) / setpoint * 100   # 轻载到重载掉了几个百分点
print(f"{droop:.2f}")
```

**(a)** $100-80/40=98.00$ 转/分；(b) $100-160/40=96.00$ 转/分；(c) 静差 $(98-96)/100\times100=2.00\%$。

负载一变，纯比例回路必然带着非零误差工作——想消除静差就要在控制器里加**积分作用**，这正是 PID 中 I 的职责；而想让回路又快又稳，就得像 Maxwell 那样关心相位滞后和稳定裕度。

</details>

相关课程：[从反馈控制到工程控制论](./10-feedback-to-engineering-cybernetics.md)、[反馈放大器的稳定性问题](./30-feedback-amplifier-stability.md)、[灵敏度函数](./45-sensitivity-function.md)、[自动化、人和安全边界](./90-automation-human-safety-boundary.md)。

## 实战挑战 · 闭环增益：负反馈的分母是加

负反馈放大器的闭环增益 $G = \frac{A}{1+AB}$，分母里是**加号**。开环增益 $A=100$、反馈系数 $B=0.1$ 时，$G = \frac{100}{11} \approx 9.09$。下面这题把分母写成了减号，修到输出 `9.09`：

```exercise
# @title: 实战挑战：负反馈的分母是加
# @check: 9.09
# @hint: 负反馈闭环增益 G = A/(1+AB)，分母是 1 + AB。
A = 100.0    # 开环增益
B = 0.1      # 反馈系数
G = A / (1 - A * B)    # ← 问题在这：该是 1 + AB
print(round(G, 2))
```

<details>
<summary>点开查看逐步解答</summary>

负反馈的闭环增益分母是 $1 + AB$：

```python
G = A / (1 + A * B)    # 100 / (1 + 10)
print(round(G, 2))     # 9.09
```

改完：$G = \frac{100}{1+10} = 9.09$。初始代码分母 $1-10=-9$，得 $-11.11$——负号意味着系统极性翻转、走向正反馈，那是振荡和失稳的温床。工程控制论里"负反馈稳定、正反馈失稳"的分水岭，就藏在这个符号里。

</details>
