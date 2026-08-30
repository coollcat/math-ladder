---
title: 系统工程的需求闭环
lesson_id: engineering-cybernetics/requirements-closed-loop
prereqs:
  - engineering-cybernetics/hierarchical-control
volume: 5
layer: L11
track:
  - optimization-control
  - scientific-computing
stage: research-elective
difficulty: 4
introduces_math: []
introduces_builtin: []
introduces_import: []
introduces_concepts:
  - requirement-traceability
applications:
  - satellite-development
  - emergency-response-systems
exits:
  - engineering
---

# 系统工程的需求闭环

## 1. 开场钩子

卫星项目常在总装时才发现：热控按旧轨道设计，电源按新载荷设计，两份文档都“合格”，整机却不成立。需求不是开头写完的清单，而要像控制回路一样持续验证。

## 2. 直觉解释

需求闭环包括四步：把目标转成可测需求；向下追踪到子系统、接口和试验；用分析、测试和使用反馈验证；变更时反向评估所有受影响项。没有最后一步，文档只是档案。

## 3. 正式定义

设需求集合为 $R=\lbrace r_1,\dots,r_m\rbrace$，实现集合为 $I=\lbrace i_1,\dots,i_n\rbrace$。追踪映射 $A(r)$ 给出满足某需求的实现项，验证函数 $V$ 返回通过或不通过。形式覆盖率是：

$$\rho=\frac{|\lbrace r:A(r)\neq\varnothing,V(r)=1\rbrace|}{m}.$$

覆盖率只是下限，还要检查接口、冲突、异常场景和维护证据。

## 4. 分步例题

急救系统提出三个需求：呼叫到出发不超过 90 秒；高峰可用车辆率不低于 85%；每次派车都有位置回传。对应实现分别是调度算法、值班策略和车载终端。若 R2 只在非高峰测试，形式覆盖率为 2/3，但高峰证据缺失，不能宣布闭环。

## 5. 动手实验

### 实验 1：需求追踪矩阵

```python title="有限条目的覆盖与缺口"
# sliders: claimed_verified=3 [0:3:1]
requirements = ["response", "peak-fleet", "location"] # 列表长度就是条目终点
verification = {"response": "pass", "peak-fleet": "not-tested", "location": "field-pass"}
covered = [name for name in requirements if verification[name] != "not-tested"]
gaps = [name for name in requirements if verification[name] == "not-tested"]

coverage = len(covered) / len(requirements)
print(f"需求总数={len(requirements)}")
print(f"台账声称已验={claimed_verified}")
print(f"证据支持覆盖={coverage:.2f}")
print("缺口=" + ", ".join(gaps))
```

拖动 `claimed_verified` 不改变字典，这是刻意设计：台账数字必须和真实证据一致。

### 实验 2：变更传播映射

```viz
{
  "type": "set-mapper",
  "left": ["续航提高", "峰值功率提高", "新增城市路线", "噪声上限收紧"],
  "right": ["电池与热控", "逆变器与保护", "调度与充电", "电机与隔音"],
  "arrows": [[0, 0], [1, 1], [2, 2], [3, 3]]
}
```

变更不是单点修改。先列出受影响面，再判断哪些试验必须重做。

## 6. 练习

```exercise
# @title: 练习：计算需求覆盖率与接口缺口
# @check: 0.75
# @check: 2
# @hint: 覆盖率=已验证需求数/总需求数；未验证接口要单独计数。
total_requirements = 8
verified_requirements = 6
unverified_interfaces = 2
coverage = total_requirements / verified_requirements
open_gaps = unverified_interfaces - 1
print(round(coverage, 2))
print(open_gaps)
```

<details>
<summary>点开查看逐步解答</summary>

覆盖率是 $6/8=0.75$。若两个未验证项都是接口需求，接口缺口就是 2；初始代码把除法方向写反，又把缺口减了 1。

</details>

## 7. 常见误区

:::warning[常见误区]

**误区一**：你以为需求越多越好。不可测或互相冲突的需求会制造假进度。

**误区二**：你以为测试通过就闭环。使用、维护和异常恢复也要反馈回需求。

**误区三**：你以为变更是项目管理的事。技术团队必须评估性能、安全和验证矩阵的连锁影响。

:::

## 8. 选读：V 模型中的回路

<details>
<summary>选读 · 左侧分解，右侧回收证据</summary>

V 模型左侧从用户需求到组件设计逐级分解；右侧从单元测试到系统验收逐级回收证据。真正的闭环还会把运行数据送回下一版需求，而不是停在交付日。

</details>

## 9. 快问快答

```quiz
哪句话最接近可测需求？
- 系统应尽量快速响应
- 在标准负载下，95% 请求响应时间不超过 300 毫秒 [*]
- 用户体验应当良好
? 可测需求需要条件、阈值、统计方式和判定方法。
```

## 10. 下一站

需求确定后失效仍会发生。下一课用可靠性和冗余分析故障路径。

→ [可靠性、冗余与故障树](./70-reliability-redundancy-fault-tree.md)
