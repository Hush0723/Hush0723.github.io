@echo off
setlocal
cd /d "%~dp0"
set "KT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%KT_NODE%" goto start
where node >nul 2>nul
if errorlevel 1 goto no_node
set "KT_NODE=node"

:start
echo Starting Knowledge Tree...
echo Open http://localhost:5173 after startup.
"%KT_NODE%" "scripts\dev.mjs"
set "KT_EXIT=%ERRORLEVEL%"
echo.
if "%KT_EXIT%"=="0" echo Knowledge Tree is ready.
if not "%KT_EXIT%"=="0" echo Startup failed with exit code %KT_EXIT%.
echo Press any key to close this window.
pause >nul
exit /b %KT_EXIT%

:no_node
echo Node.js was not found. Install Node.js 22 or later.
echo Press any key to close this window.
pause >nul
exit /b 1
