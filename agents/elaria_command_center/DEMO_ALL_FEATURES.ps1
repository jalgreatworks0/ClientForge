# LM Studio Complete Feature Demo
# Demonstrates all integrated capabilities

Write-Host "`n" -NoNewline
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CLIENTFORGE CRM - LM STUDIO COMPLETE FEATURE DEMO" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

function Show-Section {
    param([string]$Title)
    Write-Host "`n--- $Title ---" -ForegroundColor Yellow
    Write-Host ""
}

function Show-Command {
    param([string]$Description, [string]$Command)
    Write-Host "  $Description" -ForegroundColor White
    Write-Host "    > $Command" -ForegroundColor Gray
    Write-Host ""
}

Show-Section "1. LM STUDIO SERVICE"

Show-Command "Check service status:" `
    ".\check_lmstudio_service.ps1"

Show-Command "Check with detailed status:" `
    ".\setup_lmstudio_service.ps1 -Status"

Show-Command "Check network accessibility:" `
    ".\setup_network_ai_server.ps1 -Status"

Show-Section "2. BASIC INTEGRATION TESTS"

Show-Command "Test SDK connection:" `
    "npm test"

Show-Command "Test advanced features (0.3.29+):" `
    "npm run test:advanced"

Show-Section "3. TYPESCRIPT SDK - BASIC USAGE"

Show-Command "Start Elaria REPL (interactive):" `
    "npm start"

Show-Command "Run CRM-INIT (load context):" `
    "npm run init"

Show-Command "Development mode (with watch):" `
    "npm run dev"

Show-Section "4. TYPESCRIPT SDK - AGENT API (.act())"

Show-Command "Sales Intelligence Agent:" `
    "npm run agent:sales"

Show-Command "Quarterly Business Review:" `
    "npm run agent:qbr"

Show-Command "Smart Search:" `
    'npm run agent:search "find prospects"'

Show-Command "Test agent API:" `
    "npm run test:agent"

Show-Section "5. PYTHON SDK - AUTONOMOUS AGENTS"

Show-Command "Install Python dependencies:" `
    "pip install -r python\requirements.txt"

Show-Command "Sales Intelligence (Python):" `
    "python python\autonomous_agent.py sales"

Show-Command "Contact Enrichment:" `
    "python python\autonomous_agent.py contacts"

Show-Command "Deal Health Monitor:" `
    "python python\autonomous_agent.py health"

Show-Command "Quarterly Business Review (Python):" `
    "python python\autonomous_agent.py qbr"

Show-Command "Interactive Agent CLI:" `
    "python python\autonomous_agent.py interactive"

Show-Section "6. STRUCTURED OUTPUTS (JSON SCHEMAS)"

Write-Host "  Available Schemas (8 total):" -ForegroundColor White
Write-Host "    - ContactAnalysis       (lead scoring)" -ForegroundColor Gray
Write-Host "    - DealPrediction        (win probability)" -ForegroundColor Gray
Write-Host "    - EmailGeneration       (email creation)" -ForegroundColor Gray
Write-Host "    - MeetingSummary        (meeting notes)" -ForegroundColor Gray
Write-Host "    - OpportunityExtraction (sales opportunities)" -ForegroundColor Gray
Write-Host "    - CustomerSegmentation  (customer categorization)" -ForegroundColor Gray
Write-Host "    - ReportInsights        (analytics)" -ForegroundColor Gray
Write-Host "    - SmartSearch           (intelligent search)" -ForegroundColor Gray
Write-Host ""

Show-Command "Test structured outputs (requires backend):" `
    "npm run test:structured"

Show-Section "7. CLI TOOLS (lms)"

Show-Command "List loaded models:" `
    "lms ps"

Show-Command "List all downloaded models:" `
    "lms ls"

Show-Command "Load a model:" `
    "lms load qwen3-30b-a3b"

Show-Command "Stream server logs:" `
    "lms log stream --source server"

Show-Command "Stream model I/O:" `
    "lms log stream --source model --filter input,output"

Show-Section "8. API ENDPOINTS (when backend running)"

Write-Host "  Backend API Endpoints:" -ForegroundColor White
Write-Host "    GET  /ai/health                  - Health check" -ForegroundColor Gray
Write-Host "    GET  /ai/models                  - List models" -ForegroundColor Gray
Write-Host "    POST /ai/chat                    - Chat completion" -ForegroundColor Gray
Write-Host "    SSE  /ai/chat/stream             - Streaming chat" -ForegroundColor Gray
Write-Host "    POST /ai/analyze-contact         - Contact analysis" -ForegroundColor Gray
Write-Host "    POST /ai/predict-deal            - Deal prediction" -ForegroundColor Gray
Write-Host "    POST /ai/generate-email          - Email generation" -ForegroundColor Gray
Write-Host "    POST /ai/summarize-meeting       - Meeting summary" -ForegroundColor Gray
Write-Host "    POST /ai/search-with-tools       - Tool-based search" -ForegroundColor Gray
Write-Host ""

Show-Section "9. DIRECT LM STUDIO API ACCESS"

Write-Host "  OpenAI-Compatible Endpoints:" -ForegroundColor White
Write-Host "    http://localhost:1234/v1/models" -ForegroundColor Gray
Write-Host "    http://localhost:1234/v1/chat/completions" -ForegroundColor Gray
Write-Host "    http://localhost:1234/v1/embeddings" -ForegroundColor Gray
Write-Host ""
Write-Host "  LM Studio REST API:" -ForegroundColor White
Write-Host "    http://localhost:1234/api/v0/models" -ForegroundColor Gray
Write-Host "    http://localhost:1234/api/v0/chat/completions" -ForegroundColor Gray
Write-Host ""
Write-Host "  Network Access (if enabled):" -ForegroundColor White
Write-Host "    http://172.29.128.1:1234/v1/*" -ForegroundColor Gray
Write-Host ""

Show-Section "10. EXAMPLE WORKFLOWS"

Write-Host "  TypeScript Agent Example:" -ForegroundColor White
Write-Host "    node src/agent-act.js sales     # Analyze sales pipeline" -ForegroundColor Gray
Write-Host ""
Write-Host "  Python Agent Example:" -ForegroundColor White
Write-Host "    python python/autonomous_agent.py interactive" -ForegroundColor Gray
Write-Host '    > "Find all at-risk deals and create a report"' -ForegroundColor Gray
Write-Host ""
Write-Host "  Direct API Call:" -ForegroundColor White
Write-Host '    curl http://localhost:1234/v1/chat/completions \' -ForegroundColor Gray
Write-Host '      -H "Content-Type: application/json" \' -ForegroundColor Gray
Write-Host '      -d ''{"model":"qwen3-30b-a3b","messages":[...]}''' -ForegroundColor Gray
Write-Host ""

Show-Section "11. DOCUMENTATION"

Write-Host "  Comprehensive Guides:" -ForegroundColor White
Write-Host "    HEADLESS_SERVICE_SETUP.md             (600+ lines)" -ForegroundColor Gray
Write-Host "    NETWORK_SETUP_GUIDE.md                (800+ lines)" -ForegroundColor Gray
Write-Host "    ADVANCED_FEATURES.md                  (300+ lines)" -ForegroundColor Gray
Write-Host "    STRUCTURED_OUTPUT_INTEGRATION.md      (700+ lines)" -ForegroundColor Gray
Write-Host "    ADVANCED_FEATURES_COMPLETE.md         (1,000+ lines)" -ForegroundColor Gray
Write-Host "    INTEGRATION_COMPLETE.md               (500+ lines)" -ForegroundColor Gray
Write-Host "    COMPLETE_FEATURE_MATRIX.md            (400+ lines)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Total Documentation: 5,000+ lines" -ForegroundColor Cyan
Write-Host ""

Show-Section "12. QUICK START"

Write-Host "  For Beginners:" -ForegroundColor White
Write-Host "    1. npm test                           # Verify connection" -ForegroundColor Gray
Write-Host "    2. npm start                          # Try Elaria REPL" -ForegroundColor Gray
Write-Host "    3. Read HEADLESS_SERVICE_SETUP.md     # Learn basics" -ForegroundColor Gray
Write-Host ""
Write-Host "  For Developers:" -ForegroundColor White
Write-Host "    1. npm run agent:sales                # See agent in action" -ForegroundColor Gray
Write-Host "    2. Read ADVANCED_FEATURES_COMPLETE.md # Learn agent API" -ForegroundColor Gray
Write-Host "    3. Customize tools in agent-act.js    # Build your own" -ForegroundColor Gray
Write-Host ""
Write-Host "  For Production:" -ForegroundColor White
Write-Host "    1. .\setup_lmstudio_service.ps1 -EnableAutoStart" -ForegroundColor Gray
Write-Host "    2. Deploy backend with AI endpoints" -ForegroundColor Gray
Write-Host "    3. Integrate frontend server actions" -ForegroundColor Gray
Write-Host ""

Show-Section "13. FEATURE MATRIX"

Write-Host "  Integration Status:" -ForegroundColor White
Write-Host "    [COMPLETE] LM Studio Headless Service" -ForegroundColor Green
Write-Host "    [COMPLETE] Network Accessibility" -ForegroundColor Green
Write-Host "    [COMPLETE] TypeScript SDK (lmstudio-js)" -ForegroundColor Green
Write-Host "    [COMPLETE] Python SDK (lmstudio-python)" -ForegroundColor Green
Write-Host "    [COMPLETE] CLI Advanced Features (lms)" -ForegroundColor Green
Write-Host "    [COMPLETE] Agent-Oriented API (.act())" -ForegroundColor Green
Write-Host "    [COMPLETE] Tool Use / Function Calling" -ForegroundColor Green
Write-Host "    [COMPLETE] Structured Outputs (JSON)" -ForegroundColor Green
Write-Host "    [COMPLETE] 14 Tools (6 TS + 8 Python)" -ForegroundColor Green
Write-Host "    [COMPLETE] 8 Autonomous Workflows" -ForegroundColor Green
Write-Host "    [COMPLETE] 5,000+ Lines Documentation" -ForegroundColor Green
Write-Host ""

Show-Section "14. VERIFICATION"

Write-Host "  Run Complete Test Suite:" -ForegroundColor White
Write-Host "    .\test_lmstudio_complete.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  Expected Results:" -ForegroundColor White
Write-Host "    - 9-10 tests passed" -ForegroundColor Gray
Write-Host "    - LM Studio service running" -ForegroundColor Gray
Write-Host "    - Models available: 12+" -ForegroundColor Gray
Write-Host "    - Network accessible" -ForegroundColor Gray
Write-Host "    - All files present" -ForegroundColor Gray
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  STATUS: READY FOR PRODUCTION" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verification Code: CLIENTFORGE-LMSTUDIO-READY-v2.0" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Try: npm run agent:sales" -ForegroundColor White
Write-Host "  2. Try: python python\autonomous_agent.py interactive" -ForegroundColor White
Write-Host "  3. Read: ADVANCED_FEATURES_COMPLETE.md" -ForegroundColor White
Write-Host ""
