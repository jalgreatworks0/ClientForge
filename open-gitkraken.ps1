# Open ClientForge CRM repository in GitKraken
Write-Host "🦑 Opening ClientForge CRM in GitKraken..." -ForegroundColor Cyan

$gitkrakenPath = "C:\Program Files\GitKraken\GitKraken.exe"
$repoPath = "D:\clientforge-crm"

if (Test-Path $gitkrakenPath) {
    Start-Process $gitkrakenPath -ArgumentList "--path `"$repoPath`""
    Write-Host "✅ GitKraken launched!" -ForegroundColor Green
} else {
    Write-Host "⚠️  GitKraken not found at: $gitkrakenPath" -ForegroundColor Yellow
    Write-Host "Please launch GitKraken manually and open: $repoPath" -ForegroundColor White
}
