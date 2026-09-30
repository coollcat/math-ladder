# 云同步后端 · 服务形态与运维细节,,> 从 `AGENTS.md` 下沉而来（2026-09-30 文档瘦身）。**三条降级纪律与 API 契约表仍在,> `AGENTS.md`「云同步后端」一节，那是改代码时的硬约束**；这份是运维与排障细节。,> 正式口径见 `REGISTRATION.md`，部署步骤见 `deploy/README-部署.md`。

服务形态与运维：

- 启动 `node server/sync-server.mjs --port 8787 --data ./server/data`（默认端口 8787，
  只监听 `127.0.0.1`，由 nginx 反代 `/api/`；环境变量 `ML_SYNC_PORT` / `ML_SYNC_DATA` 同样认）。
- **路由自带 `/api` 前缀**（`POST /api/login`、`POST /api/logout`、`GET|PUT /api/sync`），
  所以 nginx 的 `proxy_pass http://127.0.0.1:8787;` **不能加尾斜杠** —— 加了会把前缀剥掉，
  表现是后端全 404，而服务本身一切正常。服务默认支持跨域（`OPTIONS` 预检 204，回显 `Origin`
  而非写死 `*`，因为带 `Authorization` 的跨域请求在部分浏览器上不接受 `*`）；加 `--no-cors` 关闭。
- 服务端数据全在 `server/data/`：`accounts.json`（账号库）/ `tokens.json`（令牌，30 天有效）
  / `store/<user>.json`（每账号数据）。**已加 .gitignore，绝不入库**；备份就是打包这一个目录。
- **改账号不必重新出包**（账号不在 bundle 里了），在服务器上跑 `--add-user` 即可。
  ⚠️ 建号命令已经换了：云同步模式用 `server/sync-server.mjs --add-user/--list-users/--remove-user`，
  **`scripts/add-user.mjs` 只管得上纯静态模式那份 `src/data/accounts.json`（前端已不再 import）** ——
  拿它建号在站点上登不进去。
- **本地开发要测登录，得自己把后端起起来**（dev server 不带它）：
  `node server/sync-server.mjs --port 8787 --data ./server/data` 常驻一个终端，
  再 `set ML_SYNC_API=http://127.0.0.1:8787/api && npm start`。
  不设 `ML_SYNC_API` 时前端按同源 `/api` 走，而 dev server（3000 端口）上没有这个路由，
  现象是登录永远「连不上服务器」。
