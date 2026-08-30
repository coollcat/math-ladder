# 数学阶梯

**数学阶梯 · 从数感到前沿**是一条交互式数学路径：从基础数量直觉出发，经过中学工具和大学核心，通向现代应用数学。每个知识点都配一段**可以在浏览器里直接运行、修改的 Python 代码**。

长期路线见 [VISION.md](./VISION.md)；具体课程进度见 [ROADMAP.md](./ROADMAP.md)。

**五卷一览**：卷一 数学地基（00–17，已完成）→ 卷二 高等数学核心（20–100）→ 卷三 离散数学与计算（110–190）→ 卷四 概率统计与信息（220–280）→ 卷五 应用 AI 与前沿（300–430），详见 [VISION.md](./VISION.md)。

## 三步跑起来

前置：安装 [Node.js](https://nodejs.org)（18 以上，装一次即可）。

**方式 A（最简单）**：双击 `启动.bat`，等浏览器自动打开。

**方式 B（命令行）**：

```bat
cd math-ladder
npm install     :: 仅第一次需要
npm start       :: 启动后浏览器打开 http://localhost:9452
```

> 打不开 `localhost` 就换 **http://127.0.0.1:9452**（服务器已配置双栈监听，两个地址都通；若你开着 Clash 等代理的 TUN 模式，请把 localhost 加入直连或临时关闭 TUN）。

看到页面后：左侧选课程 → 正文里点代码块的 **▶ 运行** → 改改数字再跑一遍。就这么学。首页的「知识树」可以点击任意章节，只看它的先修（绿）与托起（橙）关系，双击进入该章；整站的逐课依赖在 `/tree` 和 `/graph` 两页。

## 独立阅读前端（雅致版）

除了上面的主站（9452），仓库还内置一套**独立阅读前端**（静态展示全部课文，公式完整渲染；判题练习与 Python 浮窗仍以主站为准，页面内有一键跳转）：

| 入口 | 双击 | 端口 | 风格 |
| --- | --- | --- | --- |
| 雅致版 | `启动FluentUI.bat` | http://localhost:9453 | 微软 Fluent / Windows 11：云母质感、亚克力侧栏、柔和光影 |

该前端共用 `ui/` 目录下的自研渲染管线（`node ui/server.mjs`，零框架），互不干扰、也不影响主站。学习进度存在浏览器本地存储（key：`ml-ui-progress`）。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm start` | 开发预览（改文件自动刷新） |
| `npm run build` | 发布构建，构建前自动做课程闭环校验 |
| `npm run validate` | 单独跑校验：依赖顺序 / 方法准入 / 禁用 API |
| `npm run serve` | 本地预览 build 产物 |
| `npm run clear` | 清理缓存（页面异常时先跑这个） |
| `npm run ui:fluent` | 启动雅致版前端（9453） |

## 第一次点"▶ 运行"会发生什么

浏览器会下载约 10 MB 的网页版 Python（Pyodide）。源站依次尝试：npmmirror → jsDelivr → gcore 镜像，任一成功即可；之后有浏览器缓存，秒开。公式与字体全部本地化，不依赖外网。

## 排错清单（Windows 实测踩过的坑）

| 症状 | 原因与解法 |
| --- | --- |
| `npm start` 报 Missing script | 用的是旧版代码，拉取后重试；本项目已内置 `start` |
| 页面能开但公式是乱码源码 | KaTeX 字体没加载：确认访问的是 9452 端口本站而非缓存页 |
| 点 ▶ 运行一直转圈 | 首次要下载约 10 MB 运行时；运行器会自动换源（npmmirror → jsDelivr → gcore） |
| 本机测试返回诡异的空 404 | 检查代理软件（Clash/v2ray）：TUN 或系统代理可能拦截 localhost。浏览器一般不受影响，命令行测试建议用 `node -e "fetch(...)"` 而非 PowerShell |
| 端口被占用 `EADDRINUSE` | `npm start -- --port 9453`；或用 `netstat -ano \| findstr :9452` 找到占用进程 |
| 改了配置页面行为诡异 | `npm run clear` 后重启 |

## 给协作者 / AI 的写作规范

九段式模板、编号规则、front matter 字段、方法准入制度的单一事实来源是 [LESSON_TEMPLATE.md](./LESSON_TEMPLATE.md)；AI 协作指南见 [AGENTS.md](./AGENTS.md)。
