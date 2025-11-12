$Out = "D:\clientforge-crm\.claude\INBOX\lmstudio_status.json"

try {
  $models = Invoke-RestMethod "http://localhost:1234/v1/models" -TimeoutSec 3 -EA Stop
  @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    status = "ok"
    models = $models.data | Select-Object -First 5 id
  } | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $Out
  Write-Host "LM Studio pulse: OK ($($models.data.Count) models)"
} catch {
  @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    status = "down"
    error = $_.Exception.Message
  } | ConvertTo-Json | Out-File -Encoding utf8 $Out
  Write-Host "LM Studio pulse: DOWN"
}
