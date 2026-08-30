@echo off
chcp 65001 >nul
title 数学阶梯 · 构建 Linux 部署包
setlocal EnableExtensions

rem ==========================================================================
rem  数学阶梯 · Linux 部署包构建脚本
rem
rem  干什么：在本机（Windows）把站点构建好，打成 math-ladder-build.zip，
rem          上传到 Linux 服务器解压即可用 —— 服务器上不用装 Node、不用构建，
rem          省掉那台机器扛不住的构建开销（内存/CPU）。
rem
rem  目标平台：x86_64 Linux、glibc >= 2.31（Ubuntu 20.04+ / Debian 11+ 等）
rem           产物是纯静态文件（HTML/CSS/JS/字体/PDF），与服务器 glibc 版本无关，
rem           任意静态服务器（nginx / caddy / python -m http.server）都能托管。
rem
rem  用法：
rem    构建Linux部署包.bat                  npm ci -> 构建 -> 打包（默认跳过 validate，省内存）
rem    构建Linux部署包.bat --skip-install   跳过依赖安装（node_modules 已装好时）
rem    构建Linux部署包.bat --full           构建前先跑 npm run validate
rem    构建Linux部署包.bat --clear          构建前先跑 npm run clear（清 docusaurus 缓存）
rem    构建Linux部署包.bat --loose           把死链检查降为警告（课文还在补写、链到未写页面时用）
rem    构建Linux部署包.bat --no-papers        不打进论文 PDF 归档（build/papers 有几百 MB，
rem                                           加上它能让包从约 390MB 降到约 36MB）
rem    构建Linux部署包.bat --no-pause       结尾不暂停（被别的脚本调用时用）
rem
rem  环境变量（可选）：
rem    NODE_MEM=8192        Node 堆上限（MB），构建爆堆就调大
rem    OUT_ZIP=xxx.zip      自定义输出包名
rem    NPM_REGISTRY=...     自定义 npm 源，默认 https://registry.npmmirror.com
rem ==========================================================================

cd /d "%~dp0"
if errorlevel 1 (
  echo [错误] 无法进入脚本所在目录：%~dp0
  exit /b 1
)

rem ---------- 参数解析 ----------
set "DO_INSTALL=1"
set "DO_VALIDATE=0"
set "DO_CLEAR=0"
set "DO_LOOSE=0"
set "DO_NOPAPERS=0"
set "NO_PAUSE=0"
:parse
if "%~1"=="" goto parsed
if /i "%~1"=="--skip-install" set "DO_INSTALL=0"
if /i "%~1"=="--full"         set "DO_VALIDATE=1"
if /i "%~1"=="--clear"        set "DO_CLEAR=1"
if /i "%~1"=="--loose"        set "DO_LOOSE=1"
if /i "%~1"=="--no-papers"    set "DO_NOPAPERS=1"
if /i "%~1"=="--no-pause"     set "NO_PAUSE=1"
shift
goto parse
:parsed

if "%NPM_REGISTRY%"=="" set "NPM_REGISTRY=https://registry.npmmirror.com"
if "%NODE_MEM%"==""     set "NODE_MEM=8192"
if "%OUT_ZIP%"==""      set "OUT_ZIP=math-ladder-build.zip"

set "NODE_OPTIONS=--max-old-space-size=%NODE_MEM%"
set "npm_config_registry=%NPM_REGISTRY%"
set "npm_config_audit=false"
set "npm_config_fund=false"

echo.
echo ============================================================
echo  数学阶梯 · Linux 部署包构建
echo  项目目录： %CD%
echo  输出文件： %OUT_ZIP%
echo  npm 源   ： %NPM_REGISTRY%
echo  Node 堆  ： %NODE_MEM% MB
echo ============================================================

rem ---------- 环境检查 ----------
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] 没有找到 Node.js，请先安装：https://nodejs.org
  goto fail
)
node -e "process.exit(parseInt(process.version.slice(1)) < 20 ? 1 : 0)" >nul 2>nul
if errorlevel 1 (
  echo.
  echo [错误] Node.js 版本过低（Docusaurus 3 需要 v20+），当前：
  node -v
  goto fail
)
for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
for /f "delims=" %%v in ('npm -v')  do set "NPM_VER=%%v"
echo [环境] Node %NODE_VER% / npm %NPM_VER%

rem ---------- [1/4] 依赖安装 ----------
echo.
echo [1/4] 依赖安装
if "%DO_INSTALL%"=="0" (
  echo       指定了 --skip-install，跳过安装
) else (
  echo       npm ci（registry: %NPM_REGISTRY%）
  call npm ci --registry=%NPM_REGISTRY% --no-audit --no-fund
  if errorlevel 1 (
    echo [错误] 依赖安装失败。常见原因：网络抖动 / 镜像源抽风 / lock 文件与 package.json 不同步。
    echo        可先手动跑一次 npm install 同步 lock，或删掉 node_modules 重来。
    goto fail
  )
)

rem ---------- [2/4] 前置检查 ----------
echo.
echo [2/4] 前置检查
if "%DO_CLEAR%"=="1" (
  echo       清理构建缓存 npm run clear
  call npm run clear
  if errorlevel 1 echo [警告] 缓存清理失败，继续构建
)
if "%DO_VALIDATE%"=="1" (
  echo       运行 npm run validate
  call npm run validate
  if errorlevel 1 (
    echo [错误] 课程校验未通过，已中止构建
    goto fail
  )
) else (
  echo       跳过 validate（省内存、省时间）。需要校验请加 --full
)

rem ---------- [3/4] 构建 ----------
echo.
echo [3/4] 构建静态站点（这一步最耗时，别关窗口）
if "%DO_LOOSE%"=="1" (
  set "ML_ON_BROKEN_LINKS=warn"
  echo       --loose：死链只警告，不再中断构建（默认 throw）
)
echo       开始： %date% %time%
node "node_modules\@docusaurus\core\bin\docusaurus.mjs" build
if errorlevel 1 (
  echo [错误] 构建失败，看上面的报错
  goto fail
)
if not exist "build\index.html" (
  echo [错误] 构建跑完了但没生成 build\index.html
  goto fail
)
echo       结束： %date% %time%
for /f "delims=" %%n in ('dir /s /b /a-d "build" ^| find /c /v ""') do echo       文件数： %%n

rem ---------- [4/4] 打包 ----------
echo.
echo [4/4] 打包 %OUT_ZIP%
if "%DO_NOPAPERS%"=="1" echo       已排除 build/papers（PDF 按钮自动回落到原站下载）
if exist "%OUT_ZIP%" del /f /q "%OUT_ZIP%"
if exist "%OUT_ZIP%" (
  echo [错误] 删不掉旧的 %OUT_ZIP%，可能被别的程序占用
  goto fail
)

set "TAR_EXE=%SystemRoot%\System32\tar.exe"
set "TAR_EXTRA="
if "%DO_NOPAPERS%"=="1" set "TAR_EXTRA=--exclude=build/papers"
if exist "%TAR_EXE%" (
  "%TAR_EXE%" -a -c -f "%OUT_ZIP%" %TAR_EXTRA% build
) else (
  echo       未找到 tar.exe，改用 PowerShell 打包
  if "%DO_NOPAPERS%"=="1" echo       [注意] PowerShell 打包路径不支持 --no-papers，PDF 仍会打进去
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path 'build').Path, (Join-Path (Get-Location).Path '%OUT_ZIP%'), [System.IO.Compression.CompressionLevel]::Optimal, $true)"
)
if errorlevel 1 (
  echo [错误] 打包失败
  goto fail
)
if not exist "%OUT_ZIP%" (
  echo [错误] 打包后找不到 %OUT_ZIP%
  goto fail
)

rem ---------- 校验并汇报 ----------
set "ZIP_SIZE="
set "ZIP_ENTRIES="
for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "'{0:N1} MB' -f ((Get-Item '%OUT_ZIP%').Length/1MB)" 2^>nul`) do set "ZIP_SIZE=%%s"
for /f "usebackq delims=" %%n in (`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[System.IO.Compression.ZipFile]::OpenRead((Get-Item '%OUT_ZIP%').FullName); $c=$z.Entries.Count; $z.Dispose(); $c" 2^>nul`) do set "ZIP_ENTRIES=%%n"

echo.
echo ------------------------------------------------------------
echo  构建完成
echo  输出文件： %CD%\%OUT_ZIP%
if defined ZIP_SIZE    echo  压缩包大小： %ZIP_SIZE%
if defined ZIP_ENTRIES echo  压缩包条目： %ZIP_ENTRIES%
echo ------------------------------------------------------------
echo.
echo  上传到 Linux 服务器后（x86_64 / glibc^>=2.31，无需 Node）：
echo    unzip -q %OUT_ZIP% ^&^& ls build
echo    nginx 参考配置：
echo      server { listen 80; server_name _; root /var/www/math-ladder/build;
echo              index index.html; try_files $uri $uri/ /index.html; }
echo    临时预览： cd build ^&^& python3 -m http.server 8080
echo.

if "%NO_PAUSE%"=="1" goto done
echo %CMDCMDLINE% | findstr /I /C:"%~f0" >nul 2>nul
if errorlevel 1 goto done
pause
goto done

:fail
echo.
echo 构建失败，未生成新的部署包。
echo %CMDCMDLINE% | findstr /I /C:"%~f0" >nul 2>nul
if errorlevel 1 exit /b 1
pause
exit /b 1

:done
endlocal
exit /b 0
