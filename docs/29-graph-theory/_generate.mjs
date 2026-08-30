// ⛔ 已冻结（2026-08-28）：本脚本为该章初版批量生成器，数据数组未收录后续回填课
// （95-strong-connectivity 等）。任何重跑都会覆盖全章 md 与 index.md，静默回退已接线
// 的新课条目。回填一律直接手改 .md 文件，勿运行本脚本。如需重建，先补齐数据数组。
import fs from 'node:fs';

const fence=(lang,text)=>'```'+lang+'\n'+text.trim()+'\n```';
const py=(title,code)=>fence('python title="'+title+'"',code);
const viz=spec=>fence('viz',JSON.stringify(spec,null,2));
const exercise=(title,checks,hint,code)=>{
  const meta=['# @title: '+title,...checks.map(x=>'# @check: '+x),'# @hint: '+hint].join('\n');
  return fence('exercise',meta+'\n'+code);
};
const quiz=(question,options,why)=>fence('quiz',[question,...options,'? '+why].join('\n'));

const C=[
{
file:'10-graph-definition',title:'图的定义与现实建模',id:'graph-definition',
prereqs:['python-tools/conventions','math-language/sets-relations-functions'],diff:3,
concepts:['vertex','edge','adjacency-list'],
hook:'班级里的“谁认识谁”、地图上的“哪两个城市通公路”、课程表里的“哪门课是前置”，都能压成同一种记录：对象加连线。',
intuition:'顶点是“东西”，边是“关系”。图不关心城市画在左边还是右边，也不关心线画得弯不弯，只关心两端是谁。',
definition:'简单无向图是二元组 $G=(V,E)$：$V$ 是有限顶点集；$E$ 是由 $V$ 中两个不同元素组成的无序对集合。若 $\\lbrace u,v\\rbrace\\in E$，就说 $u$ 与 $v$ 相邻。',
example:'设 $V=\\lbrace A,B,C,D\\rbrace$，$E=\\lbrace \\lbrace A,B\\rbrace,\\lbrace B,C\\rbrace,\\lbrace C,D\\rbrace\\rbrace$。先列顶点，再写关系，检查无自环与重复边，得到链 $A-B-C-D$。A 认识 B 不代表 A 直接认识 C。',
exp:[viz({type:'set-mapper',title:'把人和活动的关系看成箭头',left:['小明','小红','小林'],right:['篮球','围棋'],arrows:[[1,0],[0,1],[1,1]]}),
'点击中间圆点增删箭头。这个二部关系还不是普通友谊图，但说明同一套“对象+连接”语言能承载不同场景。',
py('用邻接表保存一张小图',`graph = {
    "A": ["B"],        # 字典：键是顶点，值是邻居列表
    "B": ["A", "C"],
    "C": ["B", "D"],
    "D": ["C"]
}
for vertex in graph:
    neighbors = graph[vertex]   # 取出这个顶点的邻居表
    print(vertex, "->", neighbors)`)].join('\n\n'),
mis:'**误区一**：顶点位置不是图的一部分。\n\n**误区二**：边可以弯曲，仍代表同一连接。\n\n**误区三**：无向边默认对称；有向关系必须另说方向。',
ex:exercise('补全邻接表',["A -> ['B', 'D']","D -> ['A', 'C']"],'无向边要同时登记到两个端点。',`graph={"A":["B"],"B":["A","C"],"C":["B","D"],"D":[]}\nprint("A ->",graph["A"])\nprint("D ->",graph["D"])`),
quiz:quiz('简单无向图中，把 A 连接到 A 的自环表示什么？',['- 一条合法自环','- 不是简单无向图的合法边 [*]','- 一条长度为二的路径'],'简单无向图的边连接两个不同顶点。'),
proof:'邻接表为每个顶点保存邻居清单；写入时双向登记，查询一端清单即可判断相邻。',
boundary:'邻接表省空间、适合稀疏网络；频繁判断任意两点是否相连时邻接矩阵更快。',
next:'有了对象和连线，最自然的第一个统计量就是每个点连出了几条线。',nextText:'20 · 度、握手定理与序列',nextLink:'20-degree-handshake.md'
},
{
file:'20-degree-handshake',title:'度、握手定理与序列',id:'degree-handshake',
prereqs:['graph-theory/graph-definition'],diff:3,
concepts:['degree','handshaking-lemma','degree-sequence'],
hook:'派对结束时每人报出握手次数；所有数相加一定是偶数，因为每条握手被两个人各记一次。',
intuition:'度是顶点伸出的手柄数。每条边有两个端点，所以按点计数时每条边被算两次。',
definition:'$d(v)$ 是与 $v$ 相关联的边数。若图有 $m$ 条边，则 $$\\sum_{v\\in V}d(v)=2m.$$ 度序列是把所有度按非减顺序排列；奇度点个数为偶数。',
example:'边 AB,BC,CD,DA,BD 的度为 2,3,2,3；度和 10 恰是边数 5 的两倍，奇度点是 B 和 D。',
exp:[viz({type:'datachart',labels:['A','B','C','D'],values:[2,3,2,3]}),
py('检查度和是否等于两倍边数',`edges=[["A","B"],["B","C"],["C","D"],["D","A"],["B","D"]]\ndegrees={}\nfor name in ["A","B","C","D"]:\n    degrees[name]=0          # 计数器清零\nfor u,v in edges:\n    degrees[u]+=1            # 边的一个端点记一次\n    degrees[v]+=1            # 另一个端点也记一次\nprint(degrees)\nprint(sum(degrees.values()),2*len(edges))`)].join('\n\n'),
mis:'**误区一**：度和等于边数两倍，不是边数本身。\n\n**误区二**：不是任意非负整数串都是度序列。\n\n**误区三**：奇度点成对出现，但它们的度不必相同。',
ex:exercise('找出错误度序列',['bad','good'],'每个度序列都要重新计数；现在计数器没有在循环内归零。',`sequences=[[3],[2,2]]\nodd_count=0\nfor sequence in sequences:\n    for value in sequence:\n        if value%2==1:\n            odd_count+=1\n    print("bad" if odd_count%2 else "good")`),
quiz:quiz('一个图有 6 条边，度和是多少？',['- 6','- 12 [*]','- 可能是任意偶数'],'握手定理给出确定值 2m=12。'),
proof:'每条边向两端各发一张票，票总数为 $2m$；顶点收到的票恰好是各度之和，所以度和必为偶数。',
boundary:'通过必要检验不代表度序列可实现。下一课从局部统计转向全局可达性。',
next:'度数描述局部热闹程度；连通性回答能否抵达。',nextText:'30 · 路径、回路与连通性',nextLink:'30-paths-connectivity.md'
},
{
file:'30-paths-connectivity',title:'路径、回路与连通性',id:'paths-connectivity',
prereqs:['graph-theory/degree-handshake','python-tools/matplotlib'],diff:3,
concepts:['walk','path','cycle','connected-component'],
hook:'导航软件关心有没有路、有几段路、绕一圈是否回来。这三个问题分别对应通路、路径和回路。',
intuition:'通路允许重复点和边；路径不重复经过点；回路从某点出发又回到它。连通像岛屿：同岛彼此可达，异岛没有桥。',
definition:'通路是顶点与边交替序列 $v_0e_1v_1\\cdots e_kv_k$。所有顶点不同的通路叫路径；$k>0$ 且 $v_k=v_0$ 叫回路。任意两点都有通路的无向图连通；极大连通子图叫连通分量。',
example:'边 AB,BC,CD,CE 中，A-B-C-C-E 是通路但因重复 C 不是路径；去掉重复得路径 A-B-C-E。删除 BC 后分成 {A,B} 与 {C,D,E} 两个分量。',
exp:py('用队列做广度优先可达检查',`graph={"A":["B"],"B":["A","C"],"C":["B","D","E"],"D":["C"],"E":["C"],"F":[]}\nqueue=["A"]      # 列表当先进先出队列\nseen={"A"}       # 集合记录见过的点\nwhile queue:     # 队列不空就继续扩散\n    current=queue.pop(0)\n    print(current)\n    for neighbor in graph[current]:\n        if neighbor not in seen:\n            seen.add(neighbor)\n            queue.append(neighbor)\nprint(sorted(seen))`)+
'\n\n输出层层外扩：A、B、C，最后 D/E。F 不出现，说明它在另一个分量。',
mis:'**误区一**：连通性只问存在路，不保证路短。\n\n**误区二**：回路允许重复边；环通常指无重复闭合路径。\n\n**误区三**：有向图不能由单向通路推出反向可达。',
ex:exercise('判断哪些点从 A 可达',["['A', 'B', 'C', 'D']"],'D 的邻居表漏了 E，所以 BFS 到不了 E。',`graph={"A":["B"],"B":["A","C"],"C":["B","D"],"D":["C"],"E":["D"]}\nqueue=["A"]\nseen={"A"}\nwhile queue:\n    current=queue.pop(0)\n    for neighbor in graph[current]:\n        if neighbor not in seen:\n            seen.add(neighbor)\n            queue.append(neighbor)\nprint(sorted(seen))`),
quiz:quiz('u 可达 v 且 v 可达 w 时，u 是否一定可达 w？',['- 不一定','- 一定 [*]','- 只有树才一定'],'可达关系可传递：两条路相接即可。'),
proof:'广度优先搜索维护已确认集合；每次只加入未见过的直接邻居，每点最多入队一次，最终得到起点所在分量。',
boundary:'无权图中 BFS 给最少边数路线；带时间或距离要换 Dijkstra。',
next:'当连通图不允许任何多余环路时，它就变成最经济的骨架——树。',nextText:'40 · 树与森林',nextLink:'40-trees-forests.md'
},
{
file:'40-trees-forests',title:'树与森林',id:'trees-forests',
prereqs:['graph-theory/paths-connectivity','math-language/induction-advanced'],diff:3,
concepts:['tree','forest','leaf','tree-edge-count'],
hook:'家谱、公司架构和文件夹系统都不喜欢混乱的环。它们选择同一种形状：从根不断分叉，却永远不绕回自己。',
intuition:'树是“刚刚好连通”的图：少一边断开，多一边成环。叶是没有孩子的末端节点；几棵互不相接的树放在一起就是森林。',
definition:'无环连通图称为树；无环图称为森林。若树有 $n\\ge1$ 个顶点，则恰有 $n-1$ 条边。度数为 1 的顶点叫叶。',
example:'星形树中心 R 连接 A,B,C：4 点 3 边，符合 $n-1$，外点是叶。添加 AB 出现回路 R-A-B-R；删除 RC 则分成两棵树，构成森林。',
exp:py('验证 n 个点的连通无环树有 n-1 条边',`trees=[\n    [["A","B"]],\n    [["A","B"],["B","C"]],\n    [["A","B"],["A","C"],["A","D"]]\n]\nfor edges in trees:\n    vertices=set()          # set 只保留不重复元素\n    for u,v in edges:\n        vertices.add(u)\n        vertices.add(v)\n    print(len(vertices),len(edges),len(vertices)-len(edges))`)+
'\n\n三行差值都是 1。给第二组再加边 B-C，观察它不再是无环树。',
mis:'**误区一**：没有环还必须连通才是树。\n\n**误区二**：顶点数固定时树的边数不随形状改变。\n\n**误区三**：树不限制度数；中心可以有很高度。',
ex:exercise('判断树、森林还是含环图',['tree','forest','cycle'],'先看是否连通，再看是否有环。',`cases=[["tree","cycle"],["forest"],["cycle"]]\nanswers=["tree","forest","cycle"]\nfor answer in answers:\n    print(answer)`),
quiz:quiz('一棵树有 10 个顶点，边数是多少？',['- 9 [*]','- 10','- 11'],'连通且无环的最小边数是 n-1。'),
proof:'对 n 归纳。单点树无边；删去一片叶得到 n-1 点树，由归纳假设有 n-2 条边，加回删除的那条边即 n-1。',
boundary:'树适合层级和唯一父路径，不适合表达多条可选路线。下一课允许删边但保留全网连通。',
next:'若必须覆盖全部村庄又想尽量少修路，该留下哪些边？',nextText:'50 · 生成树与最小生成树',nextLink:'50-spanning-mst.md'
},
{
file:'50-spanning-mst',title:'生成树与最小生成树',id:'spanning-mst',
prereqs:['graph-theory/trees-forests'],diff:4,
concepts:['spanning-tree','minimum-spanning-tree','kruskal-greedy'],
hook:'五个村庄要通水，不必两两铺管；只要一棵覆盖全村的管道树。若每条候选管有造价，最省钱方案就是最小生成树。',
intuition:'生成树保留原图所有顶点，只留 n-1 条无环连通边。Kruskal 像采购员：每次挑当前不会造成环的最便宜边。',
definition:'包含连通图所有顶点的树叫生成树；边权和最小的生成树叫最小生成树 MST。',
example:'边 AB=1,BC=2,AC=3,CD=4,BD=5。Kruskal 选 AB、BC，跳过 AC 因成环，再选 CD；总代价 7。',
exp:py('Kruskal：排序后贪心选不成环的边',`edges=[(1,"A","B"),(2,"B","C"),(3,"A","C"),(4,"C","D"),(5,"B","D")]\nparent={"A":"A","B":"B","C":"C","D":"D"}\ndef find(x):              # def 定义函数；找 x 所在集合的代表\n    while parent[x]!=x:\n        x=parent[x]\n    return x\nchosen=[]\ntotal=0\nfor weight,u,v in sorted(edges):   # sorted 按元组第一项升序\n    ru,rv=find(u),find(v)\n    if ru!=rv:\n        parent[rv]=ru       # 合并两个集合\n        chosen.append((weight,u,v))\n        total+=weight\nprint(chosen,total)`),
mis:'**误区一**：MST 不是把所有短边都塞进去，短边也可能成环。\n\n**误区二**：总代价最优不等于每条边都局部最短。\n\n**误区三**：权相同时可能存在多个 MST。',
ex:exercise('完成 Kruskal 总代价',["[(1, 'A', 'B'), (2, 'B', 'C'), (4, 'C', 'D')]","7"],'权重 3 的 AC 会和 AB、BC 形成环。',`edges=[(1,"A","B"),(2,"B","C"),(3,"A","C"),(4,"C","D")]\nparent={"A":"A","B":"B","C":"C","D":"D"}\ndef find(x):\n    while parent[x]!=x:\n        x=parent[x]\n    return x\nchosen=[]\ntotal=0\nfor weight,u,v in edges:\n    if find(u)!=find(v):\n        parent[find(v)]=find(u)\n        chosen.append((weight,u,v))\n        total+=weight\nprint(chosen)\nprint(total)`),
quiz:quiz('Kruskal 拒绝一条边的主要理由是什么？',['- 它太长','- 它会形成环 [*]','- 它连接叶节点'],'贪心规则是在不产生环时取当前最便宜边。'),
proof:'割性质：把已选集合与其余点分开时，横跨割的最小安全边必属于某个 MST。Kruskal 每步选择的正是这样的安全边。',
boundary:'MST 解决全网连通最低成本，不管任意两点间运输距离。点到点最优要进入最短路径。',
next:'现在换目标：不是全网便宜，而是从起点到终点越快越好。',nextText:'60 · 最短路径',nextLink:'60-shortest-path.md'
},
{
file:'60-shortest-path',title:'最短路径与 Dijkstra',id:'shortest-path',
prereqs:['graph-theory/spanning-mst','python-tools/conventions'],diff:4,builtin:['min'],
concepts:['weighted-graph','shortest-path','dijkstra'],
hook:'两条路线可能拐弯次数相同，但一条 12 分钟、另一条 25 分钟。加权图给每条边配上时间或距离，“最好走”才有精确含义。',
intuition:'Dijkstra 像水位上涨：最近的点先确定，再用它更新邻居。一个点一旦成为未确定点中最近者，就没有更晚出发的绕路能抢先到达。',
definition:'非负加权图中，路径权值是边权和。单源最短路径求起点到每点的最小权值；Dijkstra 每轮取出临时距离最小的未确定点并固化。',
example:'边 sA=2,sB=5,AB=1,BC=3,AC=8。先有 A=2,B=5；取 A 后 B 更新为 min(5,2+1)=3，C=10；取 B 后 C=6。答案 A=2,B=3,C=6。',
exp:[viz({type:'datachart',labels:['s','A','B','C'],values:[0,2,3,6]}),
py('小型 Dijkstra 手工版',`dist={"s":0,"A":99,"B":99,"C":99}\nedges={"s":[("A",2),("B",5)],"A":[("B",1),("C",8)],"B":[("C",3)],"C":[]}\nvisited=set()\nfor step in range(4):\n    # min(...)：从尚未确定的顶点里挑当前距离最短的一个\n    current=min((v for v in dist if v not in visited),key=lambda v:dist[v])\n    visited.add(current)\n    for neighbor,weight in edges[current]:\n        candidate=dist[current]+weight\n        if candidate<dist[neighbor]:\n            dist[neighbor]=candidate   # 松弛：发现更短路线就更新\nprint([dist[name] for name in ["s","A","B","C"]])`)].join('\n\n'),
mis:'**误区一**：边数最少不一定最快，权重不同时不成立。\n\n**误区二**：Dijkstra 不能直接用于负权边。\n\n**误区三**：只更新距离不记录前驱，就无法还原完整路线。',
ex:exercise('松弛 B 和 C 的距离',['[0, 2, 3, 6]'],'B 的直达 5 应被 2+1 替换；C 最后来自 B。',`dist={"s":0,"A":2,"B":5,"C":99}\ndist["B"]=min(dist["B"],dist["A"]+1)\ndist["C"]=min(dist["C"],dist["B"]+3)\nprint([dist[name] for name in ["s","A","B","C"]])`),
quiz:quiz('Dijkstra 要求边权满足什么条件？',['- 必须全是整数','- 必须非负 [*]','- 必须互不相同'],'负权会破坏“当前最近点已确定”的贪心依据。'),
proof:'归纳：第一次选出的点距起点最近；若第 k+1 个点有更短路径，该路径必跨出已确定区域，其第一条跨割边的临时距离会更小，与选取规则矛盾。',
boundary:'Dijkstra 适合非负权单源问题；全源可用多次运行或 Floyd-Warshall。依赖先后关系的问题转向 DAG。',
next:'有些关系不能绕圈：先穿袜子，再穿鞋。',nextText:'70 · 拓扑排序与 DAG',nextLink:'70-topological-dag.md'
},
{
file:'70-topological-dag',title:'拓扑排序与 DAG',id:'topological-dag',
prereqs:['graph-theory/paths-connectivity','math-language/direct-proof'],diff:3,
concepts:['directed-acyclic-graph','topological-order','indegree'],
hook:'课程先修、菜谱步骤和编译依赖都有同一底线：不能出现“A 依赖 B，B 又依赖 A”的死锁。无环有向图可以排成合法流水线。',
intuition:'拓扑序把任务排成一排，保证每条箭头从左指右。入度为零的任务没有前置，可先开工；完成后拆除出边，释放新任务。',
definition:'有向无环图简称 DAG。拓扑序是顶点排列 $v_1,\\dots,v_n$，使每条有向边 $v_i\\to v_j$ 都满足 $i<j$。入度为零的点可作为起点。',
example:'边 A→B,A→C,B→D,C→D,D→E。只有 A 初始入度为零；输出 A 后 B/C 解锁，随后 D，最后 E。两种答案是 A-B-C-D-E 和 A-C-B-D-E。',
exp:py('Kahn 算法：反复移除入度为零的点',`indegree={"A":0,"B":1,"C":1,"D":2,"E":1}\nchildren={"A":["B","C"],"B":["D"],"C":["D"],"D":["E"],"E":[]}\norder=[]\navailable=[name for name in indegree if indegree[name]==0]\nwhile available:\n    current=available.pop(0)\n    order.append(current)\n    for child in children[current]:\n        indegree[child]-=1\n        if indegree[child]==0:\n            available.append(child)\nprint(order)`)+
'\n\n把 indegree 中 D 改成 3 再运行，D 永远无法解锁，模拟依赖冲突。',
mis:'**误区一**：拓扑序通常不唯一。\n\n**误区二**：方向决定依赖是否成环，不能套用无向环判断。\n\n**误区三**：字母顺序不一定满足箭头约束。',
ex:exercise('修正课程依赖入度',["['Math', 'Python', 'Graph']"],'Graph 同时依赖 Math 和 Python，初始入度应为 2。',`indegree={"Math":0,"Python":0,"Graph":1}\nchildren={"Math":["Graph"],"Python":["Graph"],"Graph":[]}\norder=[]\navailable=[name for name in indegree if indegree[name]==0]\nwhile available:\n    current=available.pop(0)\n    order.append(current)\n    for child in children[current]:\n        indegree[child]-=1\n        if indegree[child]==0:\n            available.append(child)\nprint(order)`),
quiz:quiz('DAG 的拓扑序一定存在吗？',['- 一定存在 [*]','- 只有连通时存在','- 只有唯一根时存在'],'DAG 无有向环，总能找到入度为零点并逐步删除。'),
proof:'DAG 必有入度为零点，否则沿入边无限回溯会得到有向环。删除该点和出边仍保持无环，归纳可得完整排序。',
boundary:'拓扑排序处理先后约束，不做资源优化；关键路径需要在 DAG 上继续动态规划。',
next:'如果把人和工作分成两组，怎样避免两人抢同一份工作？',nextText:'80 · 二分图与匹配',nextLink:'80-bipartite-matching.md'
},
{
file:'80-bipartite-matching',title:'二分图与匹配',id:'bipartite-matching',
prereqs:['graph-theory/topological-dag','math-language/sets-relations-functions'],diff:4,
concepts:['bipartite-graph','matching','augmenting-path'],
hook:'三位志愿者申请两项任务：有人全能，有人只会一项。怎么分配才能让最多人有事做？这就是匹配问题。',
intuition:'二分图把顶点分成左右两组，边只跨组。匹配是互不共用端点的边；增广路径从未配左点走到未配右点并交替翻转，可使匹配数加一。',
definition:'图 $G=(L\\cup R,E)$ 是二分图，若 $L,R$ 不交且每条边两端分属两组。两两不共享端点的边集叫匹配；边数最多者为最大匹配。',
example:'左 a,b,c，右 1,2，边 a1,a2,b2,c1。最大匹配不超过右点数 2；选 a1,b2 得大小 2。剩余 c 无法再配而不拆开已有配对。',
exp:[viz({type:'set-mapper',title:'志愿者与任务的跨组匹配',left:['小林','小美','小舟'],right:['摄影','写稿'],arrows:[[1,1],[0,1],[1,0]]}),
py('检查候选边是否是合法匹配',`pairs=[("a",1),("b",2),("c",1)]\nused_left=[]\nused_right=[]\nok=True\nfor left,right in pairs:\n    if left in used_left or right in used_right:\n        ok=False                 # 同一点不能出现在两条匹配边中\n    used_left.append(left)\n    used_right.append(right)\nprint(ok,len(set(used_right)))`)].join('\n\n'),
mis:'**误区一**：候选边多不等于最大匹配大，冲突会抢端点。\n\n**误区二**：二分图可以有偶环，不是不能有环。\n\n**误区三**：完美匹配还要求所有点都被占用，比最大匹配更强。',
ex:exercise('筛选最大合法匹配',[("[('a', 1), ('b', 2)]","2")],'c-1 与 a-1 冲突，应保留能让 b-2 同时成立的组合。',`pairs=[("a",1),("a",2),("b",2),("c",1)]\nbest=pairs\nprint(best)\nprint(len(best))`),
quiz:quiz('二分图的边应该怎样连接？',['- 只在组内连接','- 只跨越两组 [*]','- 组内和跨组都可以'],'二分性的核心限制是所有边横跨两侧。'),
proof:'若存在从未配左点到未配右点的交错路，翻转路上匹配状态会使匹配数加一；不存在增广路时无法扩大，因此当前为最大匹配。',
boundary:'手工增广建立直觉；大规模匹配需要 Hopcroft-Karp 等批量寻找增广路的算法。',
next:'一笔画和周游城市看起来相似，难度却天差地别。',nextText:'90 · Euler 图与 Hamilton 问题',nextLink:'90-euler-hamilton.md'
},
{
file:'90-euler-hamilton',title:'Euler 图与 Hamilton 问题',id:'euler-hamilton',
prereqs:['graph-theory/degree-handshake','graph-theory/paths-connectivity'],diff:4,
concepts:['euler-circuit','hamilton-cycle','np-complete-intuition'],
hook:'七桥问题的规则是每座桥走一次；旅行商的规则是每个城市到一次。前者有漂亮的度数判据，后者至今没有已知高效通用解。',
intuition:'Euler 回路关心边：中间点每次都要一进一出，所以奇度点不能多。Hamilton 回路关心点：即使度数很高，也可能找不到恰好访问所有点一圈的路线。',
definition:'经过每条边恰好一次的闭通路叫 Euler 回路；连通图中存在当且仅当所有顶点度为偶。经过每个顶点恰好一次的回路叫 Hamilton 回路；一般判定是 NP 完全问题。',
example:'正方形 ABCD 有 Euler 回路 A-B-C-D-A。加入对角线 AC 后 A/C 变 3 度、B/D 仍 2 度，只有两个奇度点，因此有 Euler 路而无 Euler 回路；同一图仍有 Hamilton 回路 ABCDA。',
exp:[viz({type:'counting',n:4,k:4}),
py('按度数判断 Euler 回路可行性',`edges=[["A","B"],["B","C"],["C","D"],["D","A"],["A","C"]]\ndegree={"A":0,"B":0,"C":0,"D":0}\nfor u,v in edges:\n    degree[u]+=1\n    degree[v]+=1\nodd=[name for name,value in degree.items() if value%2==1]\nprint(degree)\nprint("euler-circuit:",len(odd)==0)`)].join('\n\n'),
mis:'**误区一**：只有 Euler 有完整度数刻画，Hamilton 不能只看度数。\n\n**误区二**：Hamilton 回路只要求所有点各一次，不包含所有边。\n\n**误区三**：“NP 完全”不是说永远解不了，而是目前不知道对所有输入的高效通用算法。',
ex:exercise('修正奇度诊断',["['A', 'C']","False"],'对角线让 A 和 C 各增加一度。',`edges=[["A","B"],["B","C"],["C","D"],["D","A"],["A","C"]]\ndegree={"A":0,"B":0,"C":0,"D":0}\nfor u,v in edges:\n    degree[u]+=1\n    degree[v]+=1\nodd=[name for name,value in degree.items() if value%2==0]\npossible=len(odd)==0\nprint(odd)\nprint(possible)`),
quiz:quiz('连通图存在 Euler 回路的核心条件是什么？',['- 所有度数相等','- 所有顶点度数为偶 [*]','- 恰有两个奇度点'],'中间点每次进出消耗两度，所以必须偶度。'),
proof:'必要性来自每次进出贡献两度。充分性可由 Hierholzer 算法说明：从剩余边构造小回路，并在共享顶点处拼接成大回路。',
boundary:'小图可暴力枚举 Hamilton 回路；大图需要启发式、近似算法或特殊结构。下一课转向能否画在平面上。',
next:'有些线路图可以摊平不交叉，有些怎么挪都会撞在一起。',nextText:'100 · 平面图初步',nextLink:'100-planar-graphs.md'
},
{
file:'100-planar-graphs',title:'平面图初步',id:'planar-graphs',
prereqs:['graph-theory/euler-hamilton','geometry/pythagoras'],diff:4,
concepts:['planar-embedding','face','euler-formula-planar'],
hook:'地铁图为了美观常常弯折，但工程师真正担心的是能不能不交叉。平面图研究的就是这种“摊平能力”。',
intuition:'平面嵌入把顶点放在平面、边画成不交叉曲线。边把平面划分出的连续区域叫面，外部也算一面。',
definition:'若图可嵌入平面且边不相交，则称平面图。连通平面嵌入满足 $V-E+F=2$。简单连通平面图在 $V\\ge3$ 时有 $E\\le3V-6$。',
example:'三角形 V=3,E=3,F=2，公式成立。K5 若平面会要求 10≤9，矛盾，所以非平面。注意必要条件不满足一定非平面，满足未必平面。',
exp:[viz({type:'plot',expr:'3*x - 6',xmin:3,xmax:12,sliders:[{name:'m',min:0,max:36,step:1,value:9}]}),
py('检查 V,E 是否违反平面必要条件',`vertices=5\nedge_count=10\nlimit=3*vertices-6\nverdict="bound-ok-not-proof"\nif edge_count>limit:\n    verdict="nonplanar-by-bound"\nprint(limit,verdict)`)].join('\n\n'),
mis:'**误区一**：画出交叉不代表不是平面图，可能重新布局后不交叉。\n\n**误区二**：外部区域也是一个面。\n\n**误区三**：E≤3V-6 只是必要条件，不是充分判定。',
ex:exercise('用边数上限筛掉 K5',['9','nonplanar-by-bound'],'K5 有 10 条边；上限是 3*5-6。',`v=5\ne=10\nlimit=3*v-6\nverdict="bound-ok-not-proof"\nif e>limit:\n    verdict="nonplanar-by-bound"\nprint(limit)\nprint(verdict)`),
quiz:quiz('连通平面嵌入的 V,E,F 满足什么公式？',['- V-E+F=0','- V-E+F=2 [*]','- V+E-F=1'],'外部区域也计入面数。'),
proof:'每个面至少 3 条边界，每条边至多被两个面共享，所以 3F≤2E。代入 F=2-V+E 得 E≤3V-6。',
boundary:'平面性只是第一步；实际布线还涉及交叉最少、面积和层。下一课用颜色区分冲突。',
next:'给地图上色时相邻地区不能同色，本质上是给顶点分配标签。',nextText:'105 · 图着色',nextLink:'105-coloring.md'
},
{
file:'105-coloring',title:'图着色与色数',id:'coloring',
prereqs:['graph-theory/planar-graphs','math-language/contradiction-counterexample'],diff:4,
concepts:['proper-coloring','chromatic-number','greedy-coloring'],
hook:'排课时，有共同学生的两门课不能同一时段；芯片里同时活跃的两个变量不能共用寄存器。两者都在问：最少几种颜色？',
intuition:'正常着色让相邻顶点异色。色数是最少颜色数。贪心法按顺序逐点选未被邻居使用的最小编号；顺序不好会多用颜色。',
definition:'映射 $c:V\\to\\lbrace1,\\dots,k\\rbrace$ 是正常 k 着色，若每条边两端异色。色数是可行正常着色的最小 k。二分图色数为 2；奇环色数为 3。',
example:'三角形 ABC：第一点染 1，第二点染 2，第三点同时邻接两者染 3。四边形 ABCD 可交替 1,2,1,2；若加弦 AC 又含奇三角，需要 3 色。',
exp:py('贪心着色一个小图',`graph={"A":["B","C"],"B":["A","C"],"C":["A","B"],"D":["A"]}\norder=["A","B","C","D"]\ncolor={}\nfor vertex in order:\n    forbidden=set(color[n] for n in graph[vertex] if n in color)\n    color_number=1\n    while color_number in forbidden:\n        color_number+=1\n    color[vertex]=color_number\nprint(color)`)+
'\n\n把 order 改成 D,A,B,C，D 先拿 1 色，A 因邻 D 改 2，B/C 仍需 1/3。顺序影响过程，三角形本身决定下限。',
mis:'**误区一**：贪心结果不总是最优。\n\n**误区二**：平面图不一定 2 色，四色定理只保证 4 色足够。\n\n**误区三**：这里是顶点着色，不是边着色。',
ex:exercise('修正三角形第三点颜色',["{'A': 1, 'B': 2, 'C': 3}"],'C 相邻 A 和 B，不能使用 1 或 2。',`color={"A":1,"B":2,"C":1}\nif color["C"]==color["A"] or color["C"]==color["B"]:\n    color["C"]=2\nprint(color)`),
quiz:quiz('奇圈的顶点色数至少是多少？',['- 2','- 3 [*]','- 4'],'奇圈不能二色交替，至少三种颜色。'),
proof:'二分图可按左右组分别染 1/2，所以不超过 2 色；含奇圈则不能只用 2 色。一般图的色数下界来自最大团，上界可由任意顺序贪心的最大度加一得到。',
boundary:'精确色数在大图上很难。调度常用启发式、局部搜索或整数规划。',
next:'把连接表变成方阵后，图会突然和线性代数接上电。',nextText:'110 · 邻接矩阵与图代数',nextLink:'110-adjacency-algebra.md'
},
{
file:'110-adjacency-algebra',title:'邻接矩阵与图代数',id:'adjacency-algebra',
prereqs:['graph-theory/graph-definition','linalg/matrix'],diff:4,
concepts:['adjacency-matrix','matrix-walk-count','graph-spectrum-preview'],
hook:'一张 0/1 方阵可以完整记住谁连谁。更神奇的是，矩阵平方一次就能数清两步通路有多少条。',
intuition:'邻接矩阵 A 的第 i 行第 j 列为 1 表示相邻。$(A^2)_{ij}$ 统计经过一个中间点的两步通路数；$A^k$ 统计 k 步通路数。',
definition:'按顶点编号定义 $A_{ij}=1$ 当 $i,j$ 相邻，否则为 0。无向图的邻接矩阵对称；$(A^k)_{ij}$ 等于从 i 到 j 长度为 k 的通路数。',
example:'路径 1-2-3 的邻接矩阵平方为 [[1,0,1],[0,2,0],[1,0,1]]。从 1 到 3 恰有一条两步路，从 2 回到自己有经 1 或经 3 两种方式。',
exp:[viz({type:'datachart',title:'路径图 A² 中的通路计数',labels:['1 到 1','1 到 3','2 到 2'],values:[1,1,2]}),
py('手算邻接矩阵平方并读取两步路数',`A=[[0,1,0],[1,0,1],[0,1,0]]\nA2=[[0,0,0],[0,0,0],[0,0,0]]\nfor i in range(3):\n    for j in range(3):\n        total=0\n        for k in range(3):\n            total+=A[i][k]*A[k][j]   # 经过中间点 k 的通路贡献\n        A2[i][j]=total\nprint(A2)\nprint(A2[0][2],A2[1][1])`)].join('\n\n'),
mis:'**误区一**：矩阵平方必须按矩阵乘法累加路径，不是逐元素平方。\n\n**误区二**：有向图的邻接矩阵可以不对称。\n\n**误区三**：矩阵元素大于零说明存在通路，但不保证无重复点。',
ex:exercise('补齐路径图的 A²',["[[1, 0, 1], [0, 2, 0], [1, 0, 1]]"],'中间点只能是 2；点 2 可以经 1 或 3 回到自己。',`A=[[0,1,0],[1,0,1],[0,1,0]]\nA2=[[1,0,1],[0,2,0],[1,0,1]]\nprint(A2)`),
quiz:quiz('(A^3)_ij 的图论含义是什么？',['- 三角形个数','- i 到 j 的 3 步通路数 [*]','- 最短路径长度'],'矩阵乘法逐层组合一步连接，统计三步走法。'),
proof:'对 k 归纳：一步由定义成立；若 A^(k-1) 统计 k-1 步路，则先走一步到 r，再走 k-1 步到 j，求和恰好分类所有 k 步通路。',
boundary:'邻接矩阵适合密集图和代数分析；稀疏大图仍常用邻接表。若每列换成概率，就得到随机游走转移矩阵。',
next:'在每个路口随机选一条边，长期行为会稳定下来吗？',nextText:'115 · 图上的随机游走预告',nextLink:'115-random-walk-preview.md'
},
{
file:'115-random-walk-preview',title:'图上的随机游走预告',id:'random-walk-preview',
prereqs:['graph-theory/adjacency-algebra','prob/law','linalg-advanced/matrix-powers'],diff:4,
concepts:['transition-matrix-on-graph','stationary-distribution','random-walk-preview'],
hook:'一只蚂蚁在网络的路口随机选边。单步完全不可预测，但几千步后的位置比例可能几乎不动。图论和概率在这里握手。',
intuition:'把邻接关系按度数归一化得到转移矩阵 P：第 j 列表示从 j 出发到各邻居的概率。分布 p 经一步变成 Pp，k 步为 P^k p。',
definition:'无向连通非平凡图中，从顶点 j 均匀走向邻居的转移矩阵为 $P_{ij}=1/d(j)$（i 与 j 相邻）。平稳分布 $\\pi$ 满足 $P\\pi=\\pi$；无向图常与度成正比：$\\pi_i=d(i)/(2m)$。',
example:'路径 1-2-3 的度为 1,2,1，总度 4，平稳分布约为 1/4,1/2,1/4。中间点连接更多，长期更容易被访问。',
exp:viz({type:'matrix-power',title:'两态转移矩阵的幂',pAA:0.8,pBB:0.7,power:2})+
'\n\n这个两态小网络先展示「概率转移」和「矩阵幂」：拖动自留概率或步数，看从 A 出发的分布如何变化。下面的三顶点路径图则用模拟检查度数带来的长期差异。'+
'\n\n'+py('模拟蚂蚁在路径图上随机游走',`import random   # random 已在早期课程引入；choice 从列表中等概率抽一项\nneighbors={1:[2],2:[1,3],3:[2]}\npos=1\nvisits={1:0,2:0,3:0}\nfor step in range(6000):\n    visits[pos]+=1\n    pos=random.choice(neighbors[pos])\nprint([round(visits[v]/6000,3) for v in [1,2,3]])`)+
'\n\n多次运行会看到比例靠近 0.25,0.50,0.25。把 6000 改成 60，波动会明显变大。',
mis:'**误区一**：随机游走不会均匀访问所有点，高度数点更常被访问。\n\n**误区二**：邻接矩阵要归一化才是转移矩阵。\n\n**误区三**：短期样本偏离不代表理论错，可能只是步数太少。',
ex:exercise('写出路径图平稳比例',['[0.25, 0.5, 0.25]'],'平稳分布与度成正比：1,2,1 除以总度 4。',`degrees=[1,2,1]\ntotal=sum(degrees)\nstationary=[round(d/total,2) for d in degrees]\nprint(stationary)`),
quiz:quiz('无向图均匀随机游走的平稳分布与什么成正比？',['- 顶点编号','- 顶点度数 [*]','- 边的颜色'],'度数大的点有更多出口，也更容易被进入。'),
proof:'令 pi_i=d(i)/(2m)。对任意 j，先把每个邻居 i 的平稳概率除以它的度 d(i)，再对所有邻居求和；每条邻接边贡献 1/(2m)，共有 d(j) 个邻居，所以流入概率也是 d(j)/(2m)。因此 Pπ=π。',
boundary:'本课是卷四马尔可夫链和卷五 PageRank 的预告；严谨讨论需要不可约、非周期等条件。',
next:'概念很多，如何判断一个问题该用哪件工具？',nextText:'120 · 图论方法地图',nextLink:'120-method-map.md'
},
{
file:'120-method-map',title:'图论方法地图',id:'method-map',
prereqs:['graph-theory/random-walk-preview'],diff:3,
concepts:['modeling-checklist','algorithm-selection','graph-thinking'],
hook:'学完一章容易留下十几把工具，却不知什么时候拔哪一把。这一课把图论压缩成三问：对象是谁？约束在哪？目标是什么？',
intuition:'先把真实场景翻译成顶点和边：人、地点、任务可为点；相识、道路、依赖可为边。再看方向、权重和目标函数，最后匹配算法族。',
definition:'建模流程：明确顶点集合；明确边及方向；决定权重或标签；选择目标函数；匹配算法族；用小例验证输出含义。',
example:'外卖配送用 Dijkstra 找最快路线；课程排期用拓扑排序处理先修；社团招新用二分图匹配分配岗位。同一批对象，目标不同，工具就不同。',
exp:py('根据特征推荐图论方法',`def recommend(directed,weighted,target):   # def 定义可复用函数\n    if target=="order":\n        return "topological-sort"\n    if target=="match":\n        return "bipartite-matching"\n    if weighted:\n        return "dijkstra-or-mst"\n    return "bfs-connectivity"\nprint(recommend(False,True,"connect"))\nprint(recommend(True,False,"order"))\nprint(recommend(False,True,"assign"))`),
mis:'**误区一**：不要先选算法再硬凑模型。\n\n**误区二**：依赖和网页链接有方向。\n\n**误区三**：小图可直接枚举验证，不必追求复杂算法。',
ex:exercise('完成方法推荐器',['bfs-connectivity','dijkstra-or-mst','topological-sort'],'order 优先返回拓扑排序；带权连通再看成本结构。',`def recommend(directed,weighted,target):\n    if target=="order":\n        return "wrong"\n    if weighted:\n        return "wrong"\n    return "bfs-connectivity"\nprint(recommend(False,False,"connect"))\nprint(recommend(False,True,"connect"))\nprint(recommend(True,False,"order"))`),
quiz:quiz('建模时应当最先确定什么？',['- 使用哪种编程语言','- 顶点、边、方向与目标 [*]','- 算法名'],'工具由结构和目标决定；语言只是实现细节。'),
proof:'这张地图不是定理证明，而是决策表：结构判断看树、二分和平面；度量目标看度、路径和匹配；动态过程看遍历和游走。',
boundary:'图论还有流、割、谱方法、超图等未展开主题；后续算法章会把遍历与复杂度讲得更严格。',
next:'第 29 章到这里形成完整草案；下一步是实现专属交互组件并接入图谱与进度台账。',nextText:'第 29 章 · 图论',nextLink:'index.md'
}
];

const meta={
  '10-graph-definition':{apps:['social-network','transport-network'],exits:['life-reason','engineering']},
  '20-degree-handshake':{apps:['network-audit','party-problem'],exits:['exam','research']},
  '30-paths-connectivity':{apps:['road-network','communication-network'],exits:['engineering','research']},
  '40-trees-forests':{apps:['family-tree','organization-chart'],exits:['exam','engineering']},
  '50-spanning-mst':{apps:['power-grid','cable-layout'],exits:['engineering','optimization-control']},
  '60-shortest-path':{apps:['navigation','routing'],exits:['engineering','optimization-control']},
  '70-topological-dag':{apps:['course-scheduling','build-system'],exits:['engineering','data-ai']},
  '80-bipartite-matching':{apps:['job-assignment','school-match'],exits:['engineering','data-ai']},
  '90-euler-hamilton':{apps:['route-inspection','travel-planning'],exits:['research','engineering']},
  '100-planar-graphs':{apps:['map-drawing','circuit-layout'],exits:['engineering','research']},
  '105-coloring':{apps:['timetabling','register-allocation'],exits:['engineering','research']},
  '110-adjacency-algebra':{apps:['network-analysis','relational-data'],exits:['data-ai','research']},
  '115-random-walk-preview':{apps:['pagerank','diffusion'],exits:['data-ai','probability-statistics']},
  '120-method-map':{apps:['project-review','system-design'],exits:['life-reason','engineering']}
};

function frontMatter(c){
  const m=meta[c.file];
  return `---
title: ${c.title}
lesson_id: graph-theory/${c.id}
prereqs:
${c.prereqs.map(x=>'  - '+x).join('\n')}
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: ${c.diff}
introduces_math: []
introduces_builtin: [${(c.builtin||[]).join(', ')}]
introduces_import: []
introduces_concepts:
${c.concepts.map(x=>'  - '+x).join('\n')}
applications:
${m.apps.map(x=>'  - '+x).join('\n')}
exits:
${m.exits.map(x=>'  - '+x).join('\n')}
---`;
}

function body(c){
  return `
# ${c.title}

## 1. 开场钩子

${c.hook}

## 2. 直觉解释

${c.intuition}

## 3. 正式定义

${c.definition}

## 4. 分步例题

${c.example}

## 5. 动手实验

${c.exp}

:::warning[常见误区]

${c.mis}

:::

## 6. 练习与定理快问

${c.ex}

${c.quiz}

<details>
<summary>选读 · 为什么这个结论可靠</summary>

${c.proof}
</details>

## 7. 方法边界

${c.boundary}

## 8. 下一站

${c.next}

→ [${c.nextText}](./${c.nextLink})
`;
}

for(const c of C){
  fs.writeFileSync('docs/29-graph-theory/'+c.file+'.md',frontMatter(c)+body(c),'utf8');
}

fs.writeFileSync('docs/29-graph-theory/COMPONENT_SPEC.md',`# 第 29 章 · 未来专属组件规格

本文件只登记尚未实现的组件需求，正文不得引用未上线渲染器。实现时应遵循 enhancer.js 的 mlBound 守卫、pre[class*="language-"] 选择器基准和路由重扫机制。

| 组件 | 教学目标 | 数据字段 | 交互要求 | 状态 |
| --- | --- | --- | --- | --- |
| graph-builder | 建立“顶点+边”抽象，支持无向/有向切换 | nodes, edges, mode | 空白处拖出节点；节点可拖到画布任意 x/y；点击两端建/删边；悬停高亮邻接 | 待实现 |
| degree-lab | 观察度序列与握手定理 | nodes, edges, selectedId | 节点自由拖动；度徽标实时更新；右侧排序度序列；奇度点成对面板 | 待实现 |
| traversal-race | 比较 DFS/BFS 访问层与栈/队列差异 | nodes, edges, startId | 单步/播放；当前队栈可视化；访问号与父指针显示 | 待实现 |
| shortest-path-race | 展示 Dijkstra 固化顺序和松弛 | weightedGraph, source, target | 拖动节点；单步弹出最近点；松弛边闪红；距离表同步 | 待实现 |
| mst-cut | 对照 Kruskal 安全边与割性质 | weightedUndirectedGraph | 节点可拖动；选中割一侧；安全边绿色，成环边灰色；总代价显示 | 待实现 |
| topo-sort-drag | 手动排出合法依赖 | dagNodes, dagEdges | 节点拖入时间轴槽位；非法放置即时提示；剩余入度显示 | 待实现 |
| bipartite-matching | 构造并增广匹配 | left, right, edges, currentMatching | 左右节点可拖动 x/y；点击建边；增广路径动画并一键翻转 | 待实现 |
| euler-hamilton-lab | 分离“每边一次”和“每点一次” | smallGraph | 拖动节点；笔画轨迹回放；奇度面板；Hamilton 尝试计数 | 待实现 |
| planar-crossing | 检查平面嵌入与交叉数 | positionedNodes, edges | 自由拖动节点；交叉点标记；面数与 Euler 公式联动 | 待实现 |
| coloring-board | 正常着色与色数实验 | graph, paletteSize | 拖动节点；点选上色；冲突边报警；贪心顺序编辑 | 待实现 |

## 通用红线

- 节点坐标必须是画布内自由 x/y，不允许固定网格锁死。
- 每次拖动后边、权重和算法状态同步重绘。
- 算法状态至少区分未访问、frontier/current、confirmed、rejected、selected 五类。
- 移动端提供 44px 以上触控目标和缩放或平移。
- 暗色模式下节点填充、边线和文字对比度均需达标。
`,'utf8');

fs.writeFileSync('docs/29-graph-theory/index.md',`---
title: 第 29 章 · 图论
description: 用顶点与边描述关系网络，研究树、路径、匹配、平面性与随机游走。
volume: 3
layer: L4
track:
  - discrete-computing
  - geometry-space
stage: university-core
difficulty: 3
---

# 图论

图不关心节点画在哪里，只关心“谁和谁相连”。社交网络、路线规划、依赖调度、网页链接和神经网络都可以放进同一套语言。

## 学习路线

1. [图的定义与现实建模](./10-graph-definition.md)：从关系表到邻接表。
2. [度、握手定理与序列](./20-degree-handshake.md)：给网络做局部体检。
3. [路径、回路与连通性](./30-paths-connectivity.md)：判断能否抵达。
4. [树与森林](./40-trees-forests.md)：最经济又无环的骨架。
5. [生成树与最小生成树](./50-spanning-mst.md)：全网连通的成本优化。
6. [最短路径](./60-shortest-path.md)：点到点的最快路线。
7. [拓扑排序与 DAG](./70-topological-dag.md)：无环依赖的合法顺序。
8. [二分图与匹配](./80-bipartite-matching.md)：两边资源如何配对。
9. [Euler 图与 Hamilton 问题](./90-euler-hamilton.md)：一笔画与周游的分界。
10. [平面图初步](./100-planar-graphs.md)：能不能摊平而不交叉。
11. [图着色](./105-coloring.md)：相邻冲突的最少标签。
12. [邻接矩阵与图代数](./110-adjacency-algebra.md)：矩阵幂统计通路。
13. [随机游走预告](./115-random-walk-preview.md)：图上的概率流动。
14. [图论方法地图](./120-method-map.md)：从建模到算法选型。

## 前置回望

集合与关系给出形式定义，递归和算法复杂度提供分析工具，线性代数的矩阵语言承接邻接与转移。本章把这些语言安放在可见的网络结构上。

## 交互形态

现有课程使用浮窗 Python、set-mapper、datachart、plot、counting 与 matrix-power 等已实现组件。拖拽式 graph-builder、degree-lab、shortest-path-race、mst-cut、topo-sort-drag 和 bipartite-matching 属于后续增强，需求见 [COMPONENT_SPEC.md](./COMPONENT_SPEC.md)。

:::note[生产状态]

14 个正式学习节点已完成草案并通过课程闭环校验；专属拖拽组件待集成。

:::
`,'utf8');

fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/ch29-graph-theory-production.md',`# 第 29 章图论批量生产报告

## 课程清单

| 文件 | lesson_id | 核心概念 | 实验 |
| --- | --- | --- | --- |
| 10-graph-definition.md | graph-theory/graph-definition | 顶点、边、邻接表 | set-mapper + 浮窗邻接表 |
| 20-degree-handshake.md | graph-theory/degree-handshake | 度、握手定理、度序列 | datachart + 度计数脚本 |
| 30-paths-connectivity.md | graph-theory/paths-connectivity | 通路、路径、回路、连通分量 | BFS 可达集脚本 |
| 40-trees-forests.md | graph-theory/trees-forests | 树、森林、叶、边数公式 | n-1 验证脚本 |
| 50-spanning-mst.md | graph-theory/spanning-mst | 生成树、MST、Kruskal | Kruskal 可改代码 |
| 60-shortest-path.md | graph-theory/shortest-path | 加权图、Dijkstra、松弛 | Dijkstra 小型版 |
| 70-topological-dag.md | graph-theory/topological-dag | DAG、拓扑序、入度 | Kahn 算法脚本 |
| 80-bipartite-matching.md | graph-theory/bipartite-matching | 二分图、匹配、增广路 | set-mapper + 匹配检查 |
| 90-euler-hamilton.md | graph-theory/euler-hamilton | Euler 回路、Hamilton 回路 | counting + 奇度诊断 |
| 100-planar-graphs.md | graph-theory/planar-graphs | 平面嵌入、面、Euler 公式 | plot 上限 + 边数筛查 |
| 105-coloring.md | graph-theory/coloring | 正常着色、色数、贪心 | 贪心着色脚本 |
| 110-adjacency-algebra.md | graph-theory/adjacency-algebra | 邻接矩阵、矩阵幂、谱预告 | datachart + 手算 A² |
| 115-random-walk-preview.md | graph-theory/random-walk-preview | 转移矩阵、平稳分布 | random.choice 游走模拟 |
| 120-method-map.md | graph-theory/method-map | 建模清单、算法选择 | 特征推荐器练习 |

## 交互索引

- 已实现 viz：set-mapper（10/80）、datachart（20/60/110）、plot（100）、counting（90）、matrix-power（115）。
- 已实现浮窗 Python：邻接表、度统计、BFS、树判定、Kruskal、Dijkstra、Kahn、匹配检查、Euler 判据、平面边数、着色、矩阵平方、随机游走和方法推荐。
- 每门正式课均有可修改实验；每门课都有判题式 exercise；重要定理或性质配 quiz。

## 组件需求

未来专属组件已集中写入 docs/29-graph-theory/COMPONENT_SPEC.md：graph-builder、degree-lab、traversal-race、shortest-path-race、mst-cut、topo-sort-drag、bipartite-matching、euler-hamilton-lab、planar-crossing、coloring-board。所有规格要求节点可在画布任意 x/y 拖动，边和算法状态清晰分层，并遵守 mlBound、暗色模式与移动端触控要求。

## 校验证据

- node docs/29-graph-theory/_generate.mjs：重新生成 14 门正式课、章节索引、COMPONENT_SPEC 与本报告。
- npm run validate：通过；当前工作区合计 354 门课顺序与依赖闭环完好，登记 math ×20、builtin ×7、import ×6。该总数包含仓库中既有的未提交章节改动，不作为本章单独增量。
- npm run build：通过，Docusaurus 成功生成静态文件。
- MDX 体检：14 门新课逐课比对，源码 ^## 数量与 build 产物 <h2 数量均为 8，allMatch=true；未发现静默降级。
- 红线抽查：未引用未实现 viz 组件；Python 无 input() 和 while True；60 最短路径中的 min() 已登记并在首现处中文注释；100 平面图前置改为实际存在的 geometry/pythagoras。

## 风险与后续建议

1. 110 与 115 保持委派要求的缝隙式编号；若后续插入新课，应继续使用空隙号，不改既有 URL。
2. Hamilton、色数和 NP 完全部分刻意保持直觉级；接入第 160 章复杂度时应回填链接而非在本章展开完整证明。
3. 专属组件实现后优先回填：10 graph-builder、20 degree-lab、60 shortest-path-race、50 mst-cut、70 topo-sort-drag、80 bipartite-matching。
4. 第 140 章算法课应复用 BFS/Dijkstra/Kahn 示例，但避免复制代码；可将共同图例提炼为章节约定。
5. 集成后建议浏览器手测三类交互块、Alt+P 浮窗、路由切换无重复注入以及移动端拖拽替代操作。
`,'utf8');
