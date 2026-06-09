# MEKKZ Bild-Server — kostenlos über Ollama (kein Pollinations)
# Doppelklick oder: npm run bild-server

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host ""
Write-Host "=== mekkz AI Bild-Server (kostenlos) ===" -ForegroundColor Cyan
Write-Host ""

# 1) Ollama prüfen
try {
  $null = Invoke-WebRequest -Uri "http://127.0.0.1:11434/" -UseBasicParsing -TimeoutSec 5
  Write-Host "[OK] Ollama laeuft" -ForegroundColor Green
} catch {
  Write-Host "[!!] Ollama laeuft nicht — App aus dem Startmenue starten" -ForegroundColor Red
  Start-Process "$env:LOCALAPPDATA\Programs\Ollama\Ollama.exe" -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 8
}

# 2) Worker starten (Port 8787)
$worker = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue
if (-not $worker) {
  Write-Host "[..] Starte Image-Worker auf Port 8787..." -ForegroundColor Yellow
  Start-Process -FilePath "node" -ArgumentList "workers/mekkz-image-server.mjs" -WorkingDirectory $root -WindowStyle Minimized
  Start-Sleep -Seconds 2
}

try {
  $health = Invoke-RestMethod -Uri "http://127.0.0.1:8787/health" -TimeoutSec 5
  Write-Host "[OK] Worker laeuft (Modell: $($health.model))" -ForegroundColor Green
} catch {
  Write-Host "[!!] Worker nicht erreichbar" -ForegroundColor Red
  exit 1
}

# 3) Tunnel (localtunnel — gratis)
Write-Host "[..] Oeffne Tunnel fuer mekkzai.com..." -ForegroundColor Yellow
Write-Host ""
Write-Host "WICHTIG: Dieses Fenster OFFEN lassen!" -ForegroundColor Magenta
Write-Host "URL unten in Vercel als MEKKZ_IMAGE_WORKER_URL eintragen (/generate anhaengen)" -ForegroundColor Magenta
Write-Host ""

npx --yes localtunnel --port 8787
