@echo off
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
)

start "" /b cmd /c "npm.cmd run server"
call npm.cmd run dev -- --host 0.0.0.0 --port 5173 --strictPort
pause
