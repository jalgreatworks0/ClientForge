$files = @('ai-router-mcp-server.js', 'env-manager-mcp-server.js', 'api-tester-mcp-server.js')

foreach ($file in $files) {
  $content = Get-Content $file -Raw
  
  # Fix empty require statements
  $content = $content -replace 'const \{\} = require\(''@modelcontextprotocol/sdk/types\.js''\);', 'const { CallToolRequestSchema, ListToolsRequestSchema } = require(''@modelcontextprotocol/sdk/types.js'');'
  $content = $content -replace 'const \{  \} = require\(''fs''\)\.promises;', 'const fs = require(''fs'').promises;'
  $content = $content -replace 'const \{  \} = require\(''path''\);', 'const path = require(''path'');'
  
  Set-Content $file $content -NoNewline
  Write-Host "Fixed $file"
}

Write-Host "`nAll imports fixed!"
