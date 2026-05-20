# Before It's Gone — Windows installer / updater
# Usage: irm https://astersworld.xyz/install.ps1 | iex
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo       = "AetherAssembly/Before-Its-Gone"
$ApiUrl     = "https://api.github.com/repos/$Repo/releases/latest"
$ReleasesUrl = "https://github.com/$Repo/releases"

function Info    { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Success { param($msg) Write-Host "✓  $msg"  -ForegroundColor Green }
function Die     { param($msg) Write-Host "✗  $msg"  -ForegroundColor Red -Stream stderr; exit 1 }

Info "Checking latest release..."

try {
  $Release = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "before-its-gone-installer" }
} catch {
  Die "Failed to reach GitHub. Check your internet connection."
}

$Version = $Release.tag_name
Info "Latest version: $Version"

$Asset = $Release.assets | Where-Object { $_.name -match 'setup.*\.exe$' } | Select-Object -First 1

if (-not $Asset) {
  Die "No Windows installer found for $Version. Download manually: $ReleasesUrl"
}

$TempFile = Join-Path $env:TEMP $Asset.name

Info "Downloading $($Asset.name)..."
try {
  Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $TempFile -UseBasicParsing
} catch {
  Die "Download failed: $_"
}

Info "Launching installer..."
$proc = Start-Process -FilePath $TempFile -PassThru -Wait
Remove-Item $TempFile -Force -ErrorAction SilentlyContinue

if ($proc.ExitCode -ne 0) {
  Die "Installer exited with code $($proc.ExitCode)."
}

Success "Before It's Gone $Version installed successfully"
