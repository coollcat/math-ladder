@echo off
chcp 65001 >nul
title 数学阶梯
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有找到 Node.js，请先安装：https://nodejs.org
  pause
  exit /b 1
)
node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" >nul 2>nul
if errorlevel 1 (
  echo [错误] Node.js 版本过低（需要 v18 以上），当前：
  node -v
  pause
  exit /b 1
)

if not exist node_modules (
  echo 首次运行：正在安装依赖，大约 1-2 分钟...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [错误] 安装失败，请检查网络后重新运行本脚本。
    pause
    exit /b 1
  )
)

rem ---------- 云同步后端（可选增强，本地默认拉起） ----------
rem 站点本身纯静态；要把登录与云同步（进度/笔记本/代码仓库上云）在本地跑通，
rem 需要这个服务在 8787 端口常驻。server\data 是账号与学习数据的唯一账本，绝不清理。
set "SYNC_NEED=1"
node -e "fetch('http://127.0.0.1:8787/').then(r=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 (
  echo 检测到云同步服务已在运行（8787 端口），跳过。
  set "SYNC_NEED=0"
)
if "%SYNC_NEED%"=="1" (
  if exist "server\sync-server.mjs" (
    echo 正在启动云同步服务（新窗口，端口 8787）...
    start "math-ladder-sync" cmd /k "chcp 65001 >nul && node server\sync-server.mjs --port 8787 --data ./server/data"
  ) else (
    echo [提示] 没找到 server\sync-server.mjs，本次不带云同步：登录不可用，其余功能照常。
  )
)

rem 就绪探测用 node fetch：不走系统代理，不受 Clash/TUN 影响
node -e "fetch('http://127.0.0.1:9452').then(r=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 (
  echo 检测到网站已在运行，直接打开浏览器。
  start "" http://localhost:9452
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo 正在启动网站服务（新窗口）...
rem ML_SYNC_API 指到本地同步服务（8787）；写法上 && 前不留空格，环境变量值才不带尾空格
start "math-ladder-server" cmd /k "chcp 65001 >nul && set ML_SYNC_API=http://127.0.0.1:8787/api&& npm start"

echo 等待服务就绪（最多 120 秒）...
set /a TRIES=0
:waitloop
node -e "fetch('http://127.0.0.1:9452').then(r=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 goto ready
timeout /t 2 /nobreak >nul
set /a TRIES+=1
if %TRIES% LSS 60 goto waitloop

echo [警告] 等待超时，服务可能启动失败。请查看 math-ladder-server 窗口里的报错。
pause
exit /b 1

:ready
echo 服务已就绪，正在打开浏览器...
start "" http://localhost:9452
echo 关闭本窗口不会停止网站；要停止请在 math-ladder-server 窗口按 Ctrl+C。
echo.
echo 本地建账号（云同步登录用，建完不用重启任何服务）：
echo   node server\sync-server.mjs --add-user 用户名 显示名 密码 --data ./server/data
timeout /t 5 /nobreak >nul
