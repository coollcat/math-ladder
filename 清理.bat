@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ============================================
 REM 数学阶梯 · 项目清理工具
 REM 只删可再生的缓存与产物, 不碰任何源码/文档
 REM 本文件必须保存为 UTF-8 无 BOM + CRLF, 勿改编码/换行
 REM ============================================

if not exist "package.json" (
    echo [错误] 未找到 package.json, 请把本脚本放在项目根目录运行。
    pause
    exit /b 1
)

:menu
cls
echo ==============================================
echo   数学阶梯 · 项目清理工具
echo ==============================================
echo.
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul && echo   [提醒] 检测到 node 进程在运行, 建议先关闭 dev server 再清理。
echo.
call :showsize "node_modules\.cache" "Rspack/webpack 构建缓存"
call :showsize ".docusaurus"         "开发服务器缓存"
call :showsize "build"               "生产构建产物"
echo.
echo   [1] 轻量清理: 仅构建缓存 —— 下次构建自动重建, 最安全
echo   [2] 标准清理: 轻量 + 开发缓存 + 构建产物 —— 部署前需重新 build
echo   [3] 深度清理: 标准 + 删除 node_modules 并重装依赖 —— 需联网等几分钟
echo   [0] 退出
echo.
choice /c 1230 /n /m "  选择: "

if errorlevel 4 goto end
if errorlevel 3 goto deep
if errorlevel 2 goto std
if errorlevel 1 goto light

:light
echo.
echo   正在删除 node_modules\.cache ...
if exist "node_modules\.cache" rd /s /q "node_modules\.cache"
del /q /f "*.log" 2>nul
echo   完成。首次重新构建会稍慢, 属正常现象。
echo.
pause
goto menu

:std
echo.
echo   正在清理缓存与构建产物 ...
if exist "node_modules\.cache" rd /s /q "node_modules\.cache"
if exist ".docusaurus" rd /s /q ".docusaurus"
if exist "build" rd /s /q "build"
if exist "build_g2" rd /s /q "build_g2"
del /q /f "*.log" 2>nul
echo   完成。需要部署时先执行: npm run build
echo.
pause
goto menu

:deep
echo.
echo   即将删除整个 node_modules 并重新 npm install。
echo   请确认: 1 已关闭 dev server   2 网络可用   预计几分钟
choice /c yn /n /m "  确认继续? [y/n]: "
if errorlevel 2 goto menu
if exist "node_modules" rd /s /q "node_modules"
echo   正在重装依赖 ...
call npm install --no-audit --no-fund
echo.
echo   提示: 若安装日志出现 allow-scripts 相关提示,
echo   执行一次: npm approve-scripts @swc/core
echo   完成。
echo.
pause
goto menu

:end
endlocal
exit /b 0

REM ---- 子过程: 显示目录大小 ----
:showsize
if exist "%~1\" (
    for /f %%A in ('powershell -NoProfile -Command "[math]::Round((Get-ChildItem -LiteralPath '%~1' -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum/1MB)" 2^>nul') do set "SZ=%%A"
    echo   [!SZ! MB] %~2
) else (
    echo   [  无   ] %~2
)
exit /b 0
