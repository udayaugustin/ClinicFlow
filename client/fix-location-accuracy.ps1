# Windows Location Accuracy Fix Script
# Run this in PowerShell as Administrator to fix common GPS/location issues

Write-Host "=== Windows Location Accuracy Fix Script ===" -ForegroundColor Cyan
Write-Host "This script will help fix common GPS/location accuracy issues." -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Some fixes may not work." -ForegroundColor Yellow
    Write-Host "For best results, right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "1. Checking Windows Location Services..." -ForegroundColor Blue
$locationService = Get-Service -Name "lfsvc" -ErrorAction SilentlyContinue

if ($locationService) {
    if ($locationService.Status -ne "Running") {
        Write-Host "   ❌ Location Service is stopped. Attempting to start..." -ForegroundColor Red
        if ($isAdmin) {
            try {
                Start-Service -Name "lfsvc"
                Write-Host "   ✅ Location Service started successfully!" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to start Location Service. Error: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "   ⚠️  Need Administrator privileges to start Location Service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✅ Location Service is running" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Location Service not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Checking Network Location Provider..." -ForegroundColor Blue
$nlpService = Get-Service -Name "NlaSvc" -ErrorAction SilentlyContinue

if ($nlpService -and $nlpService.Status -eq "Running") {
    Write-Host "   ✅ Network Location Awareness is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ Network Location Awareness has issues" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Checking Location Privacy Settings..." -ForegroundColor Blue

# Check if location is enabled in Windows 10/11
$locationEnabled = $null
try {
    $locationEnabled = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" -Name "Value" -ErrorAction SilentlyContinue
    if ($locationEnabled.Value -eq "Allow") {
        Write-Host "   ✅ Location access is enabled in Windows" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Location access is disabled in Windows Settings" -ForegroundColor Red
        Write-Host "   📋 To fix: Settings > Privacy > Location > Allow apps to access your location = ON" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check location privacy settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4. Clearing Location Cache..." -ForegroundColor Blue

$locationCachePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Windows\LocationProvider",
    "$env:PROGRAMDATA\Microsoft\Windows\LocationProvider"
)

foreach ($path in $locationCachePaths) {
    if (Test-Path $path) {
        try {
            Get-ChildItem $path -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            Write-Host "   ✅ Cleared cache: $path" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Could not clear cache: $path" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "5. Flushing DNS and Network Cache..." -ForegroundColor Blue

try {
    ipconfig /flushdns | Out-Null
    Write-Host "   ✅ DNS cache flushed" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Could not flush DNS cache" -ForegroundColor Red
}

try {
    netsh winsock reset | Out-Null
    Write-Host "   ✅ Winsock reset (requires restart)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Could not reset Winsock" -ForegroundColor Red
}

Write-Host ""
Write-Host "6. Browser-specific fixes..." -ForegroundColor Blue

# Check for common browser location data
$chromeProfilePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default"
$edgeProfilePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default"

if (Test-Path $chromeProfilePath) {
    Write-Host "   📋 Chrome detected. Clear site data for better location accuracy:" -ForegroundColor Yellow
    Write-Host "      1. Chrome Settings > Privacy > Clear browsing data > Advanced" -ForegroundColor Gray
    Write-Host "      2. Select 'Cookies and site data' and 'Site settings'" -ForegroundColor Gray
    Write-Host "      3. Clear data for your ClinicFlow site" -ForegroundColor Gray
}

if (Test-Path $edgeProfilePath) {
    Write-Host "   📋 Edge detected. Clear site data for better location accuracy:" -ForegroundColor Yellow
    Write-Host "      1. Edge Settings > Privacy > Clear browsing data > Advanced" -ForegroundColor Gray
    Write-Host "      2. Select 'Cookies and site data' and 'Site settings'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== MANUAL STEPS REQUIRED ===" -ForegroundColor Magenta
Write-Host ""

Write-Host "Windows Settings:" -ForegroundColor Cyan
Write-Host "1. Press Win+I, go to Privacy & Security > Location" -ForegroundColor White
Write-Host "2. Turn ON 'Location services'" -ForegroundColor White
Write-Host "3. Turn ON 'Allow apps to access your location'" -ForegroundColor White
Write-Host "4. Turn ON 'Allow desktop apps to access your location'" -ForegroundColor White
Write-Host ""

Write-Host "Device Settings:" -ForegroundColor Cyan
Write-Host "1. Disable 'Battery Saver' mode (can disable GPS)" -ForegroundColor White
Write-Host "2. Ensure Wi-Fi is enabled (helps with location accuracy)" -ForegroundColor White
Write-Host "3. Check Windows Update for GPS driver updates" -ForegroundColor White
Write-Host ""

Write-Host "Browser Settings:" -ForegroundColor Cyan
Write-Host "1. Allow location permissions for your ClinicFlow site" -ForegroundColor White
Write-Host "2. Clear browser cache and cookies" -ForegroundColor White
Write-Host "3. Try accessing the site in incognito/private mode" -ForegroundColor White
Write-Host ""

Write-Host "Physical Environment:" -ForegroundColor Cyan
Write-Host "1. Go outdoors or near a window for initial location request" -ForegroundColor White
Write-Host "2. Wait 30-60 seconds for GPS to acquire satellite lock" -ForegroundColor White
Write-Host "3. Avoid areas with tall buildings or heavy interference" -ForegroundColor White
Write-Host ""

Write-Host "=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. Restart your computer to apply network changes" -ForegroundColor White
Write-Host "2. Complete the manual steps above" -ForegroundColor White
Write-Host "3. Test location accuracy in your ClinicFlow app" -ForegroundColor White
Write-Host "4. Use the 'Run Diagnostics' button for detailed analysis" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")