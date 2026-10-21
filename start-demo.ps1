# Starts everything for a live FixMate demo on this laptop:
#   Docker databases -> API (port 3000) -> admin website (5173) -> mobile app via Expo (8081)
# Run from the project folder:   powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
# Each server opens in its own window. Close those windows (or press Ctrl+C in them) to stop.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Wait-Http($url, $seconds) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $seconds) {
    try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { Start-Sleep 2 }
  }
  return $false
}
function Docker-Up {
  $job = Start-Job { docker version --format '{{.Server.Version}}' 2>$null }
  $ok = (Wait-Job $job -Timeout 10) -and (Receive-Job $job)
  Remove-Job $job -Force
  return [bool]$ok
}

# If backend/.env points DATABASE_URL and REDIS_URL at cloud services (Neon, Upstash),
# Docker is not needed at all.
$envFile = Join-Path $root 'backend\.env'
$envText = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { '' }
$dbUrl = ([regex]::Match($envText, '(?m)^\s*DATABASE_URL\s*=\s*"?([^"\r\n]+)')).Groups[1].Value
$redisUrl = ([regex]::Match($envText, '(?m)^\s*REDIS_URL\s*=\s*"?([^"\r\n]+)')).Groups[1].Value
$usesLocal = ($dbUrl -match 'localhost|127\.0\.0\.1') -or ($redisUrl -match 'localhost|127\.0\.0\.1')

# ---------- 1. Docker ----------
if (-not $usesLocal) {
  Step 'backend/.env uses cloud database + Redis - skipping Docker'
} else {
Step 'Checking Docker Desktop'
if (-not (Docker-Up)) {
  if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    Start-Process (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe')
  }
  Write-Host 'Waiting for Docker to start (up to 3 minutes)...'
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while (-not (Docker-Up) -and $sw.Elapsed.TotalSeconds -lt 180) { Start-Sleep 5 }
  if (-not (Docker-Up)) {
    Write-Host @'
Docker did not start. If you see "Inference manager ... dockerInference" error:
  1. Click Quit in the Docker error box
  2. Run:  wsl --shutdown
  3. Run:  Remove-Item "$env:LOCALAPPDATA\Docker\run\dockerInference" -Force
  4. Open Docker Desktop again, then run this script again.
'@ -ForegroundColor Yellow
    exit 1
  }
}
Write-Host 'Docker is running.' -ForegroundColor Green

# ---------- 2. Databases ----------
Step 'Starting PostgreSQL and Redis'
Push-Location $root
docker compose up -d --wait | Out-Null
Pop-Location
Write-Host 'Databases are healthy.' -ForegroundColor Green
}

# ---------- 3. Network address for the phone ----------
Step 'Finding this laptop''s Wi-Fi address (the phone must be on the same Wi-Fi/hotspot)'
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '169.254*' } | Select-Object -First 1).IPAddress
if (-not $ip) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
      $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback'
    } | Select-Object -First 1).IPAddress
}

# USB mode: if an Android phone with USB debugging is plugged in, tunnel the ports through the cable.
# Then the phone needs no Wi-Fi and the firewall doesn't matter.
$adb = Join-Path $env:LOCALAPPDATA 'Android\sdk\platform-tools\adb.exe'
$usb = $false
if (Test-Path $adb) {
  $devices = & $adb devices | Select-String -Pattern '\tdevice$'
  if ($devices) {
    & $adb reverse tcp:3000 tcp:3000 | Out-Null
    & $adb reverse tcp:8081 tcp:8081 | Out-Null
    $usb = $true
    $ip = '127.0.0.1'
    Write-Host 'Phone found on USB - using the cable (no Wi-Fi needed).' -ForegroundColor Green
  }
}
Write-Host "Laptop address for the phone: $ip" -ForegroundColor Green

# Free the ports if an old run is still holding them.
foreach ($port in 3000, 5173, 8081) {
  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# ---------- 4. API ----------
Step 'Building and starting the API (new window)'
$backend = Join-Path $root 'backend'
Push-Location $backend
npm run build | Out-Null
npx prisma migrate deploy | Out-Null
Pop-Location
Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
  '-NoExit', '-Command',
  "`$host.UI.RawUI.WindowTitle = 'FixMate API'; `$env:PUBLIC_BASE_URL = 'http://${ip}:3000'; node dist/main.js"
)
if (Wait-Http "http://${ip}:3000/api/v1/health" 60) { Write-Host 'API is up.' -ForegroundColor Green }
else { Write-Host 'API did not answer yet - check the "FixMate API" window.' -ForegroundColor Yellow }

# ---------- 5. Admin website ----------
Step 'Starting the admin website (new window)'
Start-Process powershell -WorkingDirectory (Join-Path $root 'admin') -ArgumentList @(
  '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'FixMate Admin'; npm run dev"
)

# ---------- 6. Mobile app ----------
Step 'Starting the mobile app with Expo (new window - the QR code appears there)'
Start-Process powershell -WorkingDirectory (Join-Path $root 'mobile') -ArgumentList @(
  '-NoExit', '-Command',
  "`$host.UI.RawUI.WindowTitle = 'FixMate Mobile (scan QR)'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME = '$ip'; `$env:EXPO_PUBLIC_API_URL = 'http://${ip}:3000'; npx expo start --lan --port 8081"
)

if (Wait-Http 'http://localhost:5173' 60) { Start-Process 'http://localhost:5173' }
Start-Process "http://localhost:3000/api/docs"

# USB mode: open FixMate in Expo Go on the phone automatically once Metro is ready.
if ($usb -and (Wait-Http 'http://127.0.0.1:8081/status' 120)) {
  & $adb shell am force-stop host.exp.exponent | Out-Null
  & $adb shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8081' host.exp.exponent | Out-Null
  Write-Host 'Opened FixMate on the phone.' -ForegroundColor Green
}

Write-Host @"

=====================================================================
 FixMate demo is starting
---------------------------------------------------------------------
 Phone app : open Expo Go -> scan the QR code in the "FixMate Mobile" window
             (or Enter URL manually: exp://${ip}:8081)
 Web (same app in a browser) : press  w  in the Expo window -> http://localhost:8081
 Admin website : http://localhost:5173
 API docs      : http://localhost:3000/api/docs

 Demo logins
   Customer  customer@fixmate.lk  / Customer@123
   Provider  dilshan@fixmate.lk   / Provider@123   (CoolAir AC - AC repair)
   Admin     admin@fixmate.lk     / Admin@12345
=====================================================================
"@ -ForegroundColor Green
