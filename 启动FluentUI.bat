@echo off
chcp 65001 >nul
title 数学阶梯 · 雅致UI
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

rem 就绪探测用 node fetch：不走系统代理，不受 Clash/TUN 影响
node -e "fetch('http://127.0.0.1:9453').then(r=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 (
  echo 检测到雅致UI已在运行，直接打开浏览器。
  start "" http://localhost:9453
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo 正在启动雅致UI服务（新窗口）...
start "math-ladder-ui-fluent" cmd /k "chcp 65001 >nul && node ui\server.mjs --skin fluent --port 9453"

echo 等待服务就绪（最多 120 秒）...
set /a TRIES=0
:waitloop
node -e "fetch('http://127.0.0.1:9453').then(r=>process.exit(0)).catch(()=>process.exit(1))" >nul 2>nul
if not errorlevel 1 goto ready
timeout /t 2 /nobreak >nul
set /a TRIES+=1
if %TRIES% LSS 60 goto waitloop

echo [警告] 等待超时，服务可能启动失败。请查看 math-ladder-ui-fluent 窗口里的报错。
pause
exit /b 1

:ready
echo 服务已就绪，正在打开浏览器...
start "" http://localhost:9453
echo 关闭本窗口不会停止 UI；要停止请在 math-ladder-ui-fluent 窗口按 Ctrl+C。
timeout /t 5 /nobreak >nul
