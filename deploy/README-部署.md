# 数学阶梯 · Linux 部署手册

> 面向维护者。目标：把 `math-ladder-build.zip` 变成「站点可访问 + 云同步可用」。
> 所有命令都按 **Ubuntu 20.04+ / Debian 11+** 写（CentOS/RHEL 的差异在文末「常见问题」里点出），
> 可以直接复制粘贴。以 `sudo` 开头的用 root 或 sudo 权限跑。

---

## 0. 先决定：要不要云同步

| | 纯静态 | 静态 + 云同步（推荐） |
| --- | --- | --- |
| 服务器上要不要 Node | 不要 | 要（20+，只跑同步服务） |
| 学习进度 / 笔记本 / 代码仓库 | 只存在访客浏览器里，换设备要手动导出 `.json` | 登录后自动上云，换设备跟着账号走 |
| 账号与登录 | **登录不可用**（账号校验只在服务端），一切按游客：课程 / 浮窗 / 判题 / 进度记录全开 | 账号库在服务端 `server/data/accounts.json`，改账号不用重新出包 |
| 后端挂了会怎样 | —— | 站点照常能学，同步暂时停，数据留本地，恢复后自动补上 |
| 备份责任 | 无（数据都在用户自己浏览器里） | **要定期备份 `server/data/`** —— 它是唯一账本，丢了所有人的进度与笔记本就没了（见第 7 节） |
| 包里要有什么 | 只有 `build/`（`构建Linux部署包.bat --no-server`） | `build/` + `server/` + `deploy/`（`构建Linux部署包.bat` 默认，`server/data/` 账本不进包） |

**两条路共用大部分步骤。** 不装同步服务就跳过第 3、4 节里带「云同步」标记的部分。

---

## 1. 目录约定（全文一致，改就三处一起改）

| 路径 | 是什么 |
| --- | --- |
| `/var/www/math-ladder` | 站点根目录 —— zip 解压到这里 |
| `/var/www/math-ladder/build` | 静态产物，**nginx 的 `root` 必须指到这一层** |
| `/var/www/math-ladder/server/sync-server.mjs` | 同步服务（零依赖，不用 `npm install`） |
| `/var/www/math-ladder/server/data/accounts.json` | 账号库（服务端私有，**已 gitignore**） |
| `/var/www/math-ladder/server/data/tokens.json` | 登录令牌（30 天有效，每次请求顺延） |
| `/var/www/math-ladder/server/data/store/<user>.json` | 每个账号一份数据 |
| `/etc/systemd/system/math-ladder-sync.service` | 服务 unit |
| `/etc/nginx/conf.d/math-ladder.conf` | nginx 配置 |

端口：**8787**，只监听 `127.0.0.1`，由 nginx 反代，外部直连不到。

---

## 2. 装依赖

```bash
sudo apt-get update
sudo apt-get install -y nginx unzip curl
```

### 2.1 Node（只要云同步就需要）

```bash
# 用 NodeSource 装。⚠️ 不要直接 apt-get install nodejs：
# Ubuntu 22.04 源里那个是 v12，跑不起来，而且会把 /usr/bin/node 占住。
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v     # 必须是 v20 以上
command -v node    # 记住这个路径，第 4 节要填进 systemd unit
```

网络不通 NodeSource 时，用二进制包：

```bash
cd /tmp
curl -fsSL -o node20.tar.xz https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v20.18.0/node-v20.18.0-linux-x64.tar.xz
sudo tar -xJf node20.tar.xz -C /opt
sudo ln -sf /opt/node-v20.18.0-linux-x64/bin/node /usr/local/bin/node
node -v
```

---

## 3. 上传与解压

```bash
sudo mkdir -p /var/www/math-ladder
sudo unzip -q math-ladder-build.zip -d /var/www/math-ladder

# 确认层级对不对：这里必须直接看到 index.html
ls /var/www/math-ladder/build/index.html

# 带后端的包还会多两样
ls /var/www/math-ladder            # build/  server/  deploy/
```

> ⚠️ 如果 `ls` 出来是 `/var/www/math-ladder/math-ladder-build/build/...` 这种多一层的结构，
> 说明 zip 里带了外层目录，把内容往上挪一层再继续。

---

## 4. 起云同步服务

### 4.1 数据目录与权限

```bash
sudo mkdir -p /var/www/math-ladder/server/data
sudo chown -R www-data:www-data /var/www/math-ladder/server
```

> 用户 `www-data` 是 Debian/Ubuntu 的 nginx 用户；CentOS/RHEL 换成 `nginx`（下面所有 `www-data` 都要跟着换）。

`data/store/`（每账号一份数据）服务启动时会自动创建，这里连 `data/` 一起建好，
纯粹是为了**先把属主设对** —— 少了这一步，服务起来后写不进文件，症状是登录成功但进度从不落盘。

### 4.2 建第一个账号

必须以服务运行的用户来建，否则 `accounts.json` 的属主是 root，服务起来后追加不进去。

```bash
sudo -u www-data node /var/www/math-ladder/server/sync-server.mjs --add-user alice 阿丽 '一个够长的密码'

sudo -u www-data node /var/www/math-ladder/server/sync-server.mjs --list-users

# 显示名可以省（省略时显示名 = 用户名）
sudo -u www-data node /var/www/math-ladder/server/sync-server.mjs --add-user bob '另一个够长的密码'

# 建号时要显式带上 --data，且必须和 unit 里的指向同一个目录（见下面的警告）
sudo -u www-data node /var/www/math-ladder/server/sync-server.mjs --add-user carol 卡罗 '密码' --data ./server/data
```

- 用户名限 2–32 位 `[a-z0-9_-]`（登录时会 `trim().toLowerCase()` 规范化），密码至少 6 位 —— 别嫌短，服务端没有强制复杂度但字典密码一样会被撞。
- 密码里有特殊字符就用单引号包住。
- 命令会进 shell history，建完顺手 `history -d $((HISTCMD-1))` 删掉那一条。

> ⚠️ **`--data` 是相对当前工作目录解析的**，跑子命令时的 cwd 就是你的 shell 所在目录 ——
> 如果你不在 `/var/www/math-ladder` 下、又不带 `--data`，账号会建到**别处**，
> 症状是「`--list-users` 看得到这个号，但登录永远 401」。最稳的写法是照上面第三条那样显式带上
> `--data ./server/data`，并先 `cd /var/www/math-ladder`。

### 4.3 装 systemd unit 并启动

```bash
sudo cp /var/www/math-ladder/deploy/math-ladder-sync.service /etc/systemd/system/

# 把 ExecStart 里的 node 路径改成这台机器的真实路径（默认写的是 /usr/bin/node）
sudo sed -i "s#^ExecStart=.*#ExecStart=$(command -v node) server/sync-server.mjs --port 8787 --data ./server/data#" \
  /etc/systemd/system/math-ladder-sync.service

# 在 Windows 上编辑过 unit 文件的话先去掉 CRLF，systemd 对 \r 很敏感
sudo sed -i 's/\r$//' /etc/systemd/system/math-ladder-sync.service

sudo systemctl daemon-reload
sudo systemctl enable --now math-ladder-sync     # 开机自启 + 立刻启动
sudo systemctl status math-ladder-sync --no-pager
```

看到 `Active: active (running)` 就成了。

### 4.4 先单独验收后端（别急着配 nginx）

```bash
# 账号不存在、密码错，都只回这一句 —— 拿 401 就说明后端活着
curl -s -X POST http://127.0.0.1:8787/api/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"nobody","pass":"wrong"}'
# 期望： {"ok":false,"error":"bad-credentials"}

# 换成第 4.2 步建的账号与密码，应该拿到 token
curl -s -X POST http://127.0.0.1:8787/api/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"alice","pass":"一个够长的密码"}'
# 期望： {"ok":true,"token":"<64位hex>","user":"alice","name":"阿丽"}
```

> 别把 token 贴到工单、群聊里 —— 它等价于账号的钥匙，30 天内有效。

### 4.2 首次上线：把纯静态时代的老账号平移过来

之前用 `scripts/add-user.mjs` 开通过账号的（纯静态时代），凭据还在 `src/data/accounts.json`（salt + 哈希）。
**不迁移的话老账号一个都登不进去**——服务端账号库是空的，登录只会得到 `bad-credentials`。

```bash
# 在项目根目录跑；注意用服务运行用户（同 4.1 的属主问题）
sudo -u www-data node server/sync-server.mjs --import-accounts \
  src/data/accounts.json --names scripts/accounts-index.json --data ./server/data
```

- **老密码全部不用改**：salt 与 hash 原样搬运（两侧哈希口径一致：`sha256(salt + ':' + 密码)`），已实测验证；
- `--names` 指向**本地明文台账**（`scripts/accounts-index.json`，gitignored、不在部署包里的话从本机拷一份上去）：
  旧账号库只存索引哈希、不存明文用户名，服务端要用它反推每个哈希对应的用户名；
  台账里查不到名字的账号会被**跳过并列出**（没有明文就反推不出来），不会瞎猜；
- 已存在的账号默认跳过，要覆盖加 `--force`；
- 这是**一次性迁移命令**：跑完 `src/data/accounts.json` 与 `scripts/add-user.mjs` 退场
  （纯静态模式下账号系统已不可用），之后建号一律走 `--add-user`。

迁移完用 `--list-users` 核对名单，再**用老密码登录一次**确认能进。

---

## 5. 配 nginx

```bash
sudo cp /var/www/math-ladder/deploy/nginx-math-ladder.conf /etc/nginx/conf.d/math-ladder.conf

# 有域名就换掉 server_name（没域名用 _ 也行，靠 IP 访问）
sudo sed -i 's/^\( *\)server_name _;/\1server_name math.example.com;/' /etc/nginx/conf.d/math-ladder.conf

# Debian 自带的 default 站点会抢占 default_server，用不上就挪走
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t                 # 必须通过，报错会告诉你哪一行
sudo systemctl reload nginx
```

**不装云同步的话**：编辑 `/etc/nginx/conf.d/math-ladder.conf`，把 `location /api/ { ... }`
那一整段删掉（或整段前面加 `#`），然后再 `sudo nginx -t && sudo systemctl reload nginx`。
留着也不会让站点出错，只是 `/api/*` 会返回 502。

---

## 6. 整体验收

```bash
# 1) 静态首页
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1/
# 期望： 200 text/html

# 2) /api 经 nginx 反代后可达（不装后端的话这一步是 502，属正常）
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST http://127.0.0.1/api/login \
  -H 'Content-Type: application/json' -d '{"user":"nobody","pass":"wrong"}'
# 期望： 401   ← 拿到 401 才算通：它说明请求真的到了后端，且后端按规范没区分账号是否存在

# 3) 静态资源缺失时必须返回 404，不能回落到 index.html
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1/assets/js/definitely-not-here.js
# 期望： 404 且 content_type 不是 text/html。
# 若返回 200 + text/html，说明 try_files 把静态资源也回落到 index.html 了 ——
# 那样真缺文件时表现为「页面白屏」，而不是一个一眼能看出来的 404。

curl -sI http://127.0.0.1/ | grep -i cache-control     # html 应该是 no-cache
```

用 node 打（**不要用 PowerShell 的 `Invoke-WebRequest` 打 localhost，系统代理会返回假 404**）：

```bash
node -e "fetch('http://127.0.0.1/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:'nobody',pass:'wrong'})}).then(r=>console.log(r.status)).then(()=>0).catch(e=>console.log('ERR',e.message))"
# 期望： 401
```

浏览器侧最终确认（换成本机浏览器打开站点）：

1. 打开首页，样式正常（纸张底纹、顶栏都在）；
2. 登录页用第 4.2 步的账号登录 → 成功，右下角「数据」圆钮里出现云端状态行；
3. 随便在一课末尾点「学完了」→ 约 2 秒后看服务端文件：

```bash
sudo cat /var/www/math-ladder/server/data/store/alice.json     # 应该能看到 progress 里的那条
```

4. 换一个浏览器（或隐身窗口）登录同一账号 → 进度自动出现，即云同步成立。

---

## 7. 备份与恢复服务端数据

**`server/data/` 是唯一账本。** 账号库、登录令牌、还有每个用户的**全部学习数据**
（进度、笔记本、代码仓库）只存在这里 —— **这个目录丢了，所有人的笔记本和进度就全没了，
而且没有任何别的副本可以找回来**（用户的浏览器里那份会因为重新登录被云端的空数据覆盖回去）。
它不在 git 里、不在 `build/` 里、也没有第二份镜像。

所以：

- **定期备份这一个目录**（命令在下面）；
- 更新站点时**只替换 `build/`**，别用整包覆盖它（见第 8 节）；
- 备份文件别放 `build/` 下面 —— 那是公开静态目录，谁都能下载。

站点静态产物在 `build/` 里，重建一次就有，**不用备份**。

```bash
# 备份（停一下服务最省心：服务写盘是原子的，不停也只会多打一个临时文件，
#       但停了能保证打包出来的是一个完整一致的版本）
sudo systemctl stop math-ladder-sync
sudo tar -czf /root/ml-data-$(date +%F-%H%M).tar.gz -C /var/www/math-ladder/server data
sudo systemctl start math-ladder-sync

ls -lh /root/ml-data-*.tar.gz
```

恢复：

```bash
sudo systemctl stop math-ladder-sync
sudo tar -xzf /root/ml-data-2026-09-04-1200.tar.gz -C /var/www/math-ladder/server
sudo chown -R www-data:www-data /var/www/math-ladder/server/data
sudo systemctl start math-ladder-sync
```

> ⚠️ 恢复会**整体覆盖**账号库与令牌 —— 备份之后新建的账号会消失、所有人要重新登录。
> 恢复前先 `sudo -u www-data node .../sync-server.mjs --list-users` 记一份名单对着看。

每天自动备份（root 的 crontab）：

```bash
sudo crontab -e
# 加这一行（注意 \% 要转义，crontab 里 % 是换行符）
0 4 * * * tar -czf /root/ml-data-$(date +\%F).tar.gz -C /var/www/math-ladder/server data
```

备份文件放哪都行，但**别放在 `build/` 下面**（那是公开静态目录，谁都能下载）。

---

## 8. 更新站点（出新版本时）

**只替换 `build/`。绝对不要用整包覆盖 `server/data/`** —— 那会把线上的账号和用户学习数据冲掉。

```bash
# 上传新的 zip 到 /tmp 之后
sudo rm -rf /var/www/math-ladder/build
sudo unzip -q /tmp/math-ladder-build.zip -d /var/www/math-ladder

# 新包带了新版同步服务的话才升级 server/（data/ 不动，所以账号与数据都在）
# sudo cp -r /tmp/new/server/sync-server.mjs /var/www/math-ladder/server/
# sudo systemctl restart math-ladder-sync

ls /var/www/math-ladder/build/index.html
```

同步服务不用重启（`build/` 与它无关）；改了 `server/*.mjs` 才需要 `sudo systemctl restart math-ladder-sync`。

---

## 9. HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d math.example.com          # 会自动改 conf.d/math-ladder.conf 并配好续期
sudo systemctl reload nginx
```

前端的 API 基址默认就是同源的 `/api`，开了 HTTPS 之后照样走同源，不需要额外配置。

---

## 10. 常见问题

### 服务起不来

```bash
sudo systemctl status math-ladder-sync --no-pager
sudo journalctl -u math-ladder-sync -n 50 --no-pager
```

| 现象 | 原因与处理 |
| --- | --- |
| `203/EXEC` | `ExecStart` 里的 node 路径不对。用 `command -v node` 查完，按 4.3 的 `sed` 改一遍。 |
| `code=exited, status=1`，日志里有 `EACCES` / `EROFS` | `server/data/` 属主不对或目录不存在。重跑 4.1 的两行。 |
| `EADDRINUSE` | 8787 被占了：`sudo ss -lntp \| grep 8787`，关掉占位的进程或换端口（换端口要同时改 unit 与 nginx）。 |
| 日志里 `Cannot find module .../sync-server.mjs` | 包里没有 `server/`。这个包是用 `构建Linux部署包.bat --no-server` 打的，重新出包（不带该参数即默认带 `server/`）。 |
| 改了 unit 之后没生效 | 忘了 `sudo systemctl daemon-reload`。 |

### 试错几次才会 429（限流的确切口径）

按 IP 记在服务端内存：**第 1–5 次失败都返回 401**，第 5 次失败之后进入 30 秒冷却，
冷却期间的**第 6 次**才返回 `429 {"ok":false,"error":"too-many","retryAfter":<秒>}`。
冷却时长从 30 秒起、每轮翻倍、封顶 15 分钟。

所以「连错 5 次，第 5 次还是 401」是**对的**，不是坏了 —— 再试一次就会看到 429。
冷却状态只存在服务进程的内存里，**重启服务即清空**。

### `/api` 返回 404

服务端对任何没实现的路径都回 `404 {"ok":false,"error":"not-found"}` —— 拿到这个说明
请求**已经到了后端**，只是路径不对（多半是 `/api` 前缀或方法写错了）。

若走 nginx 才是 404、直连后端正常，依次排查：

```bash
# ① 配置到底有没有被 nginx 读到
sudo nginx -T | grep -n "math-ladder"

# ② 后端活着吗（直连，绕过 nginx）
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8787/api/login \
  -H 'Content-Type: application/json' -d '{"user":"nobody","pass":"wrong"}'
```

- 直连是 **401**、走 nginx 是 **404** → 前缀问题。本配置用的是
  `proxy_pass http://127.0.0.1:8787;`（**不带**尾斜杠），把 `/api/login` 原样透传；
  若你的服务端只认 `/login`，给 `proxy_pass` 加上尾斜杠剥掉前缀：
  `proxy_pass http://127.0.0.1:8787/;`，然后 `sudo nginx -t && sudo systemctl reload nginx`。
- 直连也是 404 → 服务端路由前缀与本手册不一致，确认 `sync-server.mjs` 里的路由写法。
- 直连 401、走 nginx 是 **502** → 后端没在监听，回到上一节。

### `/api` 返回 413

数据包超过了网关上限。本配置已给 `client_max_body_size 8m;`，若你自己改过配置请核这一行。
另外服务端对单账号数据有 **4 MB** 硬上限，超了会回 `{"ok":false,"error":"too-large"}` ——
那是设计上的防滥用，正常用到不了（一份笔记本 + 代码仓库通常几十 KB）。

### 纸张样式 / 静态资源 404

```bash
ls /var/www/math-ladder/build/index.html           # 层级对不对（见第 3 节）
sudo nginx -T | grep -n "root "                    # root 是不是指到了 .../build
sudo -u www-data test -r /var/www/math-ladder/build/index.html && echo "nginx 读得到"
```

- `root` 指到了 `/var/www/math-ladder`（少一层 `build`）是最常见的原因：
  首页 404，但 `/api` 反代完全正常，很容易误判成后端问题。
- 首页能开、但 js/css 全 404：多半是浏览器缓存了旧 `index.html`（本配置已给 html `no-cache`），
  强制刷新一次；仍不行就查 `location ^~ /assets/` 那段有没有被后来的配置覆盖。
- **CentOS/RHEL 开了 SELinux** 时静态文件会被拒（日志里 `Permission denied` 但权限看着没问题）：
  `sudo chcon -R -t httpd_sys_content_t /var/www/math-ladder/build`，
  并且放行反代：`sudo setsebool -P httpd_can_network_connect 1`。

### 外网打不开 80 端口

```bash
sudo ss -lntp | grep ':80'                          # nginx 真的在监听？
sudo ufw allow 80/tcp                               # Ubuntu 防火墙
# CentOS/RHEL： sudo firewall-cmd --add-service=http --permanent && sudo firewall-cmd --reload
```

还不行就是云厂商的**安全组 / 防火墙**没放 80（和 443）—— 去控制台看。

### 站点能开，但登录一直提示「连不上服务器」

前端的 API 基址默认是同源的 `/api`。检查：

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://你的域名/api/login \
  -H 'Content-Type: application/json' -d '{"user":"nobody","pass":"wrong"}'
```

拿到 401 就正常（那是「连得上、但凭据不对」）。拿不到就是 nginx 的 `/api` 那一段没生效。

**推荐就走同源**（前端与 API 同一个域名）：本套 nginx 配置把 `/api/` 反代到本机，
浏览器看到的始终是同源请求，不需要任何 CORS 头，也不用给服务加参数。

真要把 API 拆到别的域名/端口（前端构建时用 `ML_SYNC_API` 指定成 `http://1.2.3.4:8787/api`
这种绝对地址），服务端**默认就支持跨域**：`OPTIONS` 预检回 204，并**回显请求的 `Origin`**
（不写死 `*`，因为带 `Authorization` 头的跨域请求在部分浏览器上不接受 `*`）。
这时要改三处：服务加 `--host 0.0.0.0` 对外监听、nginx 或防火墙放行该端口、前端带 `ML_SYNC_API` 重新出包。
确定不需要跨域就给服务加 `--no-cors` 关掉它。

### 后端挂了 / 没装后端

站点照常能学、能判题、能记进度，只是同步不了；数据留在浏览器 localStorage 里，
后端恢复后自动补上。右下角「数据」圆钮的导出 / 导入 / 搬家 / 快照**始终可用**，
那是离线兜底与换设备救急的出口。

---

## 11. 相关文件

| 文件 | 说什么 |
| --- | --- |
| `../REGISTRATION.md` | 账号体系、云同步范围与合并规则、离线降级口径 |
| `../AGENTS.md` | 整体架构与目录结构（后端定位为「可选增强」） |
| `../构建Linux部署包.bat` | 出包脚本，默认把 `server/` 与 `deploy/` 打进来（`server/data/` 除外）；`--no-server` 出纯静态包 |
