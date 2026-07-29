@echo off
chcp 65001 > nul
cd /d "%~dp0"

where node > nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js не установлен.
  echo   Скачай и поставь с https://nodejs.org (кнопка LTS), потом запусти этот файл снова.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   Первый запуск: доустанавливаю нужное, это займёт минуту...
  call npm install
)

node src/index.js
echo.
pause
