@echo off
title Ollama CPU-Modus (CUDA Fix)
echo ========================================
echo   Ollama auf CPU umstellen
echo   (Fix fuer CUDA-Fehler)
echo ========================================
echo.
echo 1) Ollama im System-Tray beenden (Rechtsklick - Quit)
echo 2) Dieses Fenster OFFEN lassen
echo 3) Ollama normal wieder starten (Startmenue)
echo.
echo Setze OLLAMA_NUM_GPU=0 fuer diese Sitzung...
set OLLAMA_NUM_GPU=0
set OLLAMA_GPU=0
echo.
echo Starte Ollama neu im CPU-Modus...
start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"
timeout /t 3 >nul
echo.
echo Teste llama3.1...
ollama run llama3.1 "Sag nur: ok" --verbose 2>&1 | findstr /i "ok error CUDA"
echo.
echo Wenn kein CUDA-Fehler mehr kommt: mekkz AI neu testen.
echo.
echo Dauerhaft CPU erzwingen (Windows):
echo   Systemsteuerung - Umgebungsvariablen - Neu:
echo   Name: OLLAMA_NUM_GPU   Wert: 0
echo   Dann PC neu starten oder Ollama beenden und neu oeffnen.
echo.
pause
