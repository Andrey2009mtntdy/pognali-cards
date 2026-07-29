@echo off
chcp 65001 > nul
cd /d "%~dp0"

where node > nul 2>&1
if errorlevel 1 (
  echo.
  echo   Node.js не установлен. Скачай с https://nodejs.org (кнопка LTS).
  echo.
  pause
  exit /b 1
)

node tools/extract-template.mjs
echo.
pause
