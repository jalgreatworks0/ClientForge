# Pull last N structured errors and write compact signal
$Out = "D:\clientforge-crm\.claude\INBOX\errors.json"
$items = @()

# Tail error log (swap with Mongo query if preferred)
$logFile = "D:\clientforge-crm\logs\error.log"
if (Test-Path $logFile) {
  $tail = Get-Content $logFile -Tail 50 -EA SilentlyContinue
  foreach ($line in $tail) {
    try {
      $j = $line | ConvertFrom-Json
      if ($j.problem.errorId) {
        $items += [pscustomobject]@{
          ts = $j.timestamp
          id = $j.problem.errorId
          sev = $j.severity
          path = $j.problem.instance
          corr = $j.problem.correlationId
        }
      }
    } catch {}
  }
}

@{
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  items = $items
} | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $Out

Write-Host "Errors pulse: $($items.Count) items"
