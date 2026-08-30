# REGISTRATION.md · 账号与进度机制说明

> 本文档面向站点维护者（站内访客不需要说明页：默认账号直接展示在登录页上）。

## 机制一句话

**账号不搞申请流程。** 站内无注册页、无申请页：登录页直接展示默认账号（`admin` / `ml-2026`），开箱即用。论文 PDF 下载与学习进度对**所有人**开放——论文下载不设任何门禁；进度未登录存**本地游客空间**，登录后存**账号空间**（同一浏览器多账号互不混淆）。

## 账号管理

账号库是 [`src/data/accounts.json`](src/data/accounts.json)，只存 `user / name / salt / hash`（SHA-256 加盐哈希，**不存明文密码**）。

| 操作 | 命令 |
| --- | --- |
| 开通 / 重置密码 | `node scripts/add-user.mjs <用户名> <显示名> <密码>` |
| 列出账号 | `node scripts/add-user.mjs --list` |
| 删除账号 | `node scripts/add-user.mjs --remove <用户名>` |

用户名限 2–32 位字母/数字/下划线/连字符，密码至少 6 位；写入为原子操作（临时文件 + 改名）。

## 能力矩阵

| 能力 | 未登录（游客空间） | 已登录（账号空间） |
| --- | --- | --- |
| 课程内容浏览、文献页面链接、浮窗运行与即时判题反馈 | ✅ | ✅ |
| 论文 PDF 下载（各章 `999-references.md` 的 paper 卡片） | ✅ | ✅ |
| 练习草稿 / 随手算草稿（浮窗内自动保存） | ✅ | ✅ |
| 学习进度记录（已学完标记、练习通过记录） | ✅ 本地 `:guest` 空间 | ✅ `:<用户名>` 空间 |
| 进度清除 | ✅ 当前空间 | ✅ 当前空间 |

## 进度命名空间的实现位置

| 位置 | 职责 |
| --- | --- |
| `src/auth/index.js` | 登录态读写（localStorage `ml-auth`）、自实现 SHA-256（与 node 端 `node:crypto` 算法一致、已做一致性测试）、`safeRedirect`（防 open redirect，含 `/\` 规范化绕过拦截） |
| `src/data/accounts.json` | 账号库（构建时打进 bundle；私有部署场景可接受，**不要把生产密码哈希库公开分发**） |
| `src/pages/login.js` | 登录页（展示默认账号凭据）；登录成功后跳回 `?redirect=` 指定的站内页面 |
| `src/pyrunner/enhancer.js` | `progressNS()` / `nsKey()`：进度与练习通过记录按 `ml-progress:<空间>` / `ml-exercises:<空间>` 存储；旧版无命名空间 key 首扫自动迁移到游客空间；文末进度按钮标记后 dispatch `ml-progress-changed` 事件，右栏进度条监听同步 |
| `src/theme/TOCItems/index.js` | 右栏挂件（swizzle wrap）：前置知识面板 + 学习进度条，位于目录上方；与文末进度共用存储 |
| `scripts/references-data.json` + `scripts/gen-references.mjs` | 参考资料条目数据与生成器；PDF 链接以 `@pdf64`（base64）写入条目，避免静态 HTML 源码直接可读（混淆非加密） |

## 安全边界（务必知晓）

- 静态站没有服务端会话，一切皆本地：**登录态与进度都在浏览器 localStorage 里**，任何人打开 DevTools 都能改写。
- 论文 PDF 链接在条目中以 base64（`@pdf64`）写入、客户端解码，**这只是让静态 HTML 源码不再一眼可读的混淆，不是加密**。技术用户仍可从 bundle 中还原链接。
- 账号库哈希随构建进入 bundle，攻击者拿到 salt+hash 后可离线暴力破解弱密码；请要求用户使用足够长的密码，并定期轮换。
- 因此：**真正的机密文件不要靠任何前端手段保护**——放在未公开的存储位置，或加服务端鉴权。

## 相关文档

- 维护与架构总说明：[AGENTS.md](AGENTS.md)
- 参考资料条目生成：`scripts/references-data.json`（数据）+ `scripts/gen-references.mjs`（生成器）
