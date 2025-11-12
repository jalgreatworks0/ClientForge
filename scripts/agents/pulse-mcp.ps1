$Out = "D:\clientforge-crm\.claude\INBOX\mcp_status.json"

try {
  $health = Invoke-RestMethod "http://localhost:8765/health" -TimeoutSec 3 -EA Stop
  @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    status = "ok"
    uptime = $health.uptime
    servers = $health.servers
    version = $health.version
  } | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $Out
  Write-Host "MCP pulse: OK ($($health.servers) servers)"
} catch {
  @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    status = "down"
    error = $_.Exception.Message
  } | ConvertTo-Json | Out-File -Encoding utf8 $Out
  Write-Host "MCP pulse: DOWN"
}
