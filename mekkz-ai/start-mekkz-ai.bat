@echo off
title mekkz AI - Server
cd /d "%~dp0"

echo ========================================
echo   mekkz AI Server starten
echo ========================================
echo.

echo Pruefe Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FEHLER: Node.js wurde nicht gefunden.
  echo Installiere Node.js LTS von https://nodejs.org
  echo.
  goto end
)

echo Node Version:
node -v
echo npm Version:
call npm -v
if errorlevel 1 (
  echo.
  echo FEHLER: npm funktioniert nicht.
  echo Versuche CMD statt PowerShell und starte diese Datei neu.
  echo.
  goto end
)

echo.
echo Starte Server...
echo Browser: http://127.0.0.1:3000
echo.
echo WICHTIG: Dieses Fenster OFFEN lassen!
echo Zum Beenden: Strg + C
echo.

call npm run dev
if errorlevel 1 (
  echo.
  echo FEHLER: Server konnte nicht starten.
  echo.
)

:end
echo.
echo Fenster bleibt offen. Druecke eine Taste zum Schliessen...
pause >nul
