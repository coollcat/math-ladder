@echo off
rem Math Ladder - Paper UI (skin=paper, port=9455)
rem Backend: ui/server.mjs + ui/render.mjs (shared with the other skins)
cd /d %~dp0
title MathLadder Paper UI - port 9455
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:9455/"
node ui/server.mjs --skin paper --port 9455
pause
