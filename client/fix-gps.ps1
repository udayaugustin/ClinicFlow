# Simple GPS Location Fix Script for Windows
Write-Host "Windows GPS Location Fix Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check Location Service
Write-Host "1. Checking Windows Location Service..." -ForegroundColor Blue
$locationService = Get-Service -Name "lfsvc" -ErrorAction SilentlyContinue

if ($locationService) {
    Write-Host "Location Service Status: $($locationService.Status)" -ForegroundColor White
    if ($locationService.Status -ne "Running") {
        Write-Host "Location Service is not running!" -ForegroundColor Red
        try {
            Start-Service -Name "lfsvc" -ErrorAction SilentlyContinue
            Write-Host "Attempted to start Location Service" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not start Location Service - run as Administrator" -ForegroundColor Red
        }
    }
} else {
    Write-Host "Location Service not found" -ForegroundColor Red
}

Write-Host ""

# Clear DNS Cache
Write-Host "2. Clearing DNS cache..." -ForegroundColor Blue
try {
    ipconfig /flushdns | Out-Null
    Write-Host "DNS cache cleared" -ForegroundColor Green
} catch {
    Write-Host "Could not clear DNS cache" -ForegroundColor Red
}

Write-Host ""

# Instructions
Write-Host "MANUAL STEPS TO FIX GPS ACCURACY:" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Windows Settings (Press Win+I):" -ForegroundColor Cyan
Write-Host "1. Go to Privacy and Security > Location" -ForegroundColor White
Write-Host "2. Turn ON Location services" -ForegroundColor White
Write-Host "3. Turn ON Allow apps to access your location" -ForegroundColor White
Write-Host "4. Turn ON Allow desktop apps to access your location" -ForegroundColor White
Write-Host ""

Write-Host "Browser Settings:" -ForegroundColor Cyan
Write-Host "1. Open your browser settings" -ForegroundColor White
Write-Host "2. Find Privacy/Site Settings/Location" -ForegroundColor White
Write-Host "3. Allow location for your ClinicFlow site" -ForegroundColor White
Write-Host "4. Clear browser cache and cookies" -ForegroundColor White
Write-Host ""

Write-Host "Device Settings:" -ForegroundColor Cyan
Write-Host "1. Turn OFF Battery Saver mode" -ForegroundColor White
Write-Host "2. Make sure Wi-Fi is enabled" -ForegroundColor White
Write-Host "3. Go near a window or outdoors" -ForegroundColor White
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Complete the manual steps above" -ForegroundColor White
Write-Host "2. Restart your browser" -ForegroundColor White
Write-Host "3. Test location in your ClinicFlow app" -ForegroundColor White
Write-Host ""

Write-Host "Press Enter to continue..." -ForegroundColor Gray
Read-Host