
@echo off
title mekkz AI - Server
cd /d "%~dp0"

echo ========================================
echo   mekkz AI Server starten
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Node.js nicht gefunden.
  echo Install: https://nodejs.org
  goto end
)

echo Alten Prozess auf Port 3000 beenden (falls vorhanden)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>nul
)

echo.
echo Starte Server auf http://127.0.0.1:3000
echo Fenster OFFEN lassen!
echo Warte auf "Ready" bevor du die Seite oeffnest.
echo.

call npm run dev -- -p 3000

:end
echo.
pause
