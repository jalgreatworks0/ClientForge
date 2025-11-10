# ClientForge CRM Directory Structure Creation Script
$baseDir = "d:\clientforge-crm"

# AI Directory Structure
$aiDirs = @(
    "ai\albedo\core\engine",
    "ai\albedo\core\nlp",
    "ai\albedo\core\memory",
    "ai\albedo\core\reasoning",
    "ai\albedo\actions",
    "ai\albedo\training",
    "ai\albedo\models",
    "ai\ml\lead-scoring\models",
    "ai\ml\lead-scoring\training",
    "ai\ml\lead-scoring\inference",
    "ai\ml\forecasting\revenue",
    "ai\ml\forecasting\sales",
    "ai\ml\forecasting\churn",
    "ai\ml\recommendation\product",
    "ai\ml\recommendation\next-action",
    "ai\ml\recommendation\content",
    "ai\ml\anomaly-detection",
    "ai\computer-vision\ocr",
    "ai\computer-vision\document-extraction",
    "ai\computer-vision\signature-detection",
    "ai\voice\transcription",
    "ai\voice\commands",
    "ai\voice\synthesis",
    "ai\embeddings\customer-similarity",
    "ai\embeddings\semantic-search",
    "ai\embeddings\knowledge-base",
    "ai\agents\sales-agent",
    "ai\agents\support-agent",
    "ai\agents\data-analyst",
    "ai\agents\workflow-automation",
    "ai\shared\preprocessing",
    "ai\shared\feature-engineering",
    "ai\shared\evaluation",
    "ai\shared\deployment"
)

# Backend Directory Structure
$backendDirs = @(
    "backend\api\rest\v1\routes",
    "backend\api\rest\v1\controllers",
    "backend\api\rest\v1\validators",
    "backend\api\rest\v1\middleware",
    "backend\api\rest\v2",
    "backend\api\graphql\schema",
    "backend\api\graphql\resolvers",
    "backend\api\graphql\directives",
    "backend\api\websocket\events",
    "backend\api\websocket\rooms",
    "backend\api\websocket\handlers",
    "backend\core\contacts\domain",
    "backend\core\contacts\services",
    "backend\core\contacts\repositories",
    "backend\core\contacts\events",
    "backend\core\deals",
    "backend\core\accounts",
    "backend\core\campaigns",
    "backend\core\analytics",
    "backend\core\automation",
    "backend\core\calendar",
    "backend\core\documents",
    "backend\core\emails",
    "backend\core\notifications",
    "backend\core\permissions",
    "backend\core\reports",
    "backend\core\tasks",
    "backend\core\teams",
    "backend\core\territories",
    "backend\core\workflows",
    "backend\services\auth",
    "backend\services\cache",
    "backend\services\email",
    "backend\services\file-storage",
    "backend\services\queue",
    "backend\services\search",
    "backend\services\sms",
    "backend\services\webhook",
    "backend\middleware",
    "backend\utils\audit",
    "backend\utils\crypto",
    "backend\utils\dates",
    "backend\utils\formatters",
    "backend\utils\helpers",
    "backend\utils\validators",
    "backend\workers\email-processor",
    "backend\workers\data-sync",
    "backend\workers\report-generator",
    "backend\workers\ml-training",
    "backend\workers\cleanup"
)

# Database Directory Structure
$databaseDirs = @(
    "database\migrations\core",
    "database\migrations\features",
    "database\migrations\data",
    "database\seeds\development",
    "database\seeds\staging",
    "database\seeds\demo",
    "database\schemas\postgresql",
    "database\schemas\mongodb",
    "database\schemas\redis",
    "database\schemas\elasticsearch",
    "database\models\sequelize",
    "database\models\mongoose",
    "database\models\prisma",
    "database\queries\complex",
    "database\queries\reports",
    "database\queries\analytics",
    "database\indexes",
    "database\procedures",
    "database\triggers",
    "database\views",
    "database\backup"
)

# Frontend Directory Structure
$frontendDirs = @(
    "frontend\apps\crm-web\src\components\common",
    "frontend\apps\crm-web\src\components\layout",
    "frontend\apps\crm-web\src\components\forms",
    "frontend\apps\crm-web\src\components\charts",
    "frontend\apps\crm-web\src\views\contacts",
    "frontend\apps\crm-web\src\views\deals",
    "frontend\apps\crm-web\src\views\analytics",
    "frontend\apps\crm-web\src\views\settings",
    "frontend\apps\crm-web\src\hooks",
    "frontend\apps\crm-web\src\services",
    "frontend\apps\crm-web\src\store",
    "frontend\apps\crm-web\src\styles",
    "frontend\apps\crm-web\src\utils",
    "frontend\apps\crm-web\src\ai-companion",
    "frontend\apps\crm-web\public",
    "frontend\apps\mobile-app\ios",
    "frontend\apps\mobile-app\android",
    "frontend\apps\mobile-app\shared",
    "frontend\apps\admin-panel",
    "frontend\apps\customer-portal",
    "frontend\packages\ui-components\buttons",
    "frontend\packages\ui-components\modals",
    "frontend\packages\ui-components\tables",
    "frontend\packages\ui-components\forms",
    "frontend\packages\design-system\tokens",
    "frontend\packages\design-system\themes",
    "frontend\packages\design-system\icons",
    "frontend\packages\shared-logic",
    "frontend\micro-frontends\shell",
    "frontend\micro-frontends\contacts-mfe",
    "frontend\micro-frontends\analytics-mfe",
    "frontend\micro-frontends\ai-assistant-mfe"
)

# Deployment Directory Structure
$deploymentDirs = @(
    "deployment\docker\development",
    "deployment\docker\production",
    "deployment\docker\nginx",
    "deployment\kubernetes\base\deployments",
    "deployment\kubernetes\base\services",
    "deployment\kubernetes\base\configmaps",
    "deployment\kubernetes\base\secrets",
    "deployment\kubernetes\overlays\development",
    "deployment\kubernetes\overlays\staging",
    "deployment\kubernetes\overlays\production",
    "deployment\kubernetes\helm\clientforge",
    "deployment\terraform\modules\networking",
    "deployment\terraform\modules\compute",
    "deployment\terraform\modules\database",
    "deployment\terraform\modules\monitoring",
    "deployment\terraform\environments\dev",
    "deployment\terraform\environments\staging",
    "deployment\terraform\environments\production",
    "deployment\terraform\providers\aws",
    "deployment\terraform\providers\azure",
    "deployment\terraform\providers\gcp",
    "deployment\ansible\playbooks",
    "deployment\ansible\roles",
    "deployment\ansible\inventory",
    "deployment\ci-cd\github-actions",
    "deployment\ci-cd\gitlab-ci",
    "deployment\ci-cd\jenkins",
    "deployment\ci-cd\azure-devops"
)

# Integrations Directory Structure
$integrationsDirs = @(
    "integrations\crm\salesforce",
    "integrations\crm\hubspot",
    "integrations\crm\pipedrive",
    "integrations\communication\email\gmail",
    "integrations\communication\email\outlook",
    "integrations\communication\email\sendgrid",
    "integrations\communication\messaging\slack",
    "integrations\communication\messaging\teams",
    "integrations\communication\messaging\whatsapp",
    "integrations\communication\calling\twilio",
    "integrations\communication\calling\vonage",
    "integrations\productivity\calendar\google-calendar",
    "integrations\productivity\calendar\outlook-calendar",
    "integrations\productivity\storage\google-drive",
    "integrations\productivity\storage\dropbox",
    "integrations\productivity\storage\onedrive",
    "integrations\productivity\project-management\jira",
    "integrations\productivity\project-management\asana",
    "integrations\productivity\project-management\monday",
    "integrations\analytics\google-analytics",
    "integrations\analytics\mixpanel",
    "integrations\analytics\segment",
    "integrations\payment\stripe",
    "integrations\payment\paypal",
    "integrations\payment\square",
    "integrations\ai-services\openai",
    "integrations\ai-services\anthropic",
    "integrations\ai-services\google-ai",
    "integrations\ai-services\huggingface",
    "integrations\webhooks\handlers",
    "integrations\webhooks\validators",
    "integrations\webhooks\processors"
)

# Monitoring Directory Structure
$monitoringDirs = @(
    "monitoring\metrics\prometheus",
    "monitoring\metrics\grafana",
    "monitoring\metrics\custom-dashboards",
    "monitoring\logging\elasticsearch",
    "monitoring\logging\logstash",
    "monitoring\logging\kibana",
    "monitoring\logging\winston-config",
    "monitoring\tracing\jaeger",
    "monitoring\tracing\zipkin",
    "monitoring\tracing\opentelemetry",
    "monitoring\alerting\rules",
    "monitoring\alerting\channels",
    "monitoring\alerting\escalation",
    "monitoring\health-checks\api-health",
    "monitoring\health-checks\database-health",
    "monitoring\health-checks\service-health",
    "monitoring\performance\apm",
    "monitoring\performance\profiling",
    "monitoring\performance\load-testing"
)

# Tests Directory Structure
$testsDirs = @(
    "tests\unit\backend",
    "tests\unit\frontend",
    "tests\unit\ai",
    "tests\integration\api",
    "tests\integration\database",
    "tests\integration\services",
    "tests\e2e\cypress",
    "tests\e2e\playwright",
    "tests\e2e\scenarios",
    "tests\performance\load",
    "tests\performance\stress",
    "tests\performance\spike",
    "tests\security\vulnerability-scans",
    "tests\security\penetration",
    "tests\security\compliance",
    "tests\ai-testing\model-validation",
    "tests\ai-testing\accuracy-testing",
    "tests\ai-testing\bias-detection",
    "tests\fixtures",
    "tests\mocks",
    "tests\utils"
)

# Documentation Directory Structure
$docsDirs = @(
    "docs\architecture\decisions",
    "docs\architecture\diagrams",
    "docs\architecture\patterns",
    "docs\api\rest",
    "docs\api\graphql",
    "docs\api\websocket",
    "docs\guides\user-manual",
    "docs\guides\admin-guide",
    "docs\guides\developer-guide",
    "docs\guides\ai-features",
    "docs\development\setup",
    "docs\development\coding-standards",
    "docs\development\contributing",
    "docs\development\troubleshooting",
    "docs\deployment\local",
    "docs\deployment\cloud",
    "docs\deployment\on-premise",
    "docs\modules\contacts",
    "docs\modules\deals",
    "docs\modules\ai-companion",
    "docs\modules\analytics",
    "docs\integrations",
    "docs\security",
    "docs\runbooks"
)

# Config Directory Structure
$configDirs = @(
    "config\app",
    "config\database",
    "config\services",
    "config\security",
    "config\ai",
    "config\features",
    "config\limits"
)

# Security Directory Structure
$securityDirs = @(
    "security\policies\access-control",
    "security\policies\data-protection",
    "security\policies\compliance",
    "security\certificates\development",
    "security\certificates\production",
    "security\encryption\keys",
    "security\encryption\algorithms",
    "security\scanning\sast",
    "security\scanning\dast",
    "security\scanning\dependency-check",
    "security\compliance\gdpr",
    "security\compliance\hipaa",
    "security\compliance\sox",
    "security\compliance\pci-dss",
    "security\incident-response\playbooks",
    "security\incident-response\logs",
    "security\incident-response\reports"
)

# Packages Directory Structure
$packagesDirs = @(
    "packages\@clientforge\core",
    "packages\@clientforge\ai-engine",
    "packages\@clientforge\auth",
    "packages\@clientforge\database",
    "packages\@clientforge\email",
    "packages\@clientforge\queue",
    "packages\@clientforge\cache",
    "packages\@clientforge\logger",
    "packages\@clientforge\metrics",
    "packages\@clientforge\security",
    "packages\@clientforge\validation",
    "packages\@clientforge\types",
    "packages\@clientforge\constants",
    "packages\@clientforge\utils",
    "packages\@clientforge\sdk"
)

# Scripts Directory Structure
$scriptsDirs = @(
    "scripts\setup",
    "scripts\build",
    "scripts\deploy",
    "scripts\maintenance",
    "scripts\migration",
    "scripts\monitoring",
    "scripts\development"
)

# Combine all directories
$allDirs = $aiDirs + $backendDirs + $databaseDirs + $frontendDirs + $deploymentDirs + $integrationsDirs + $monitoringDirs + $testsDirs + $docsDirs + $configDirs + $securityDirs + $packagesDirs + $scriptsDirs

# Create all directories
Write-Host "Creating ClientForge CRM directory structure..." -ForegroundColor Cyan
$count = 0

foreach ($dir in $allDirs) {
    $fullPath = Join-Path $baseDir $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        $count++
    }
}

Write-Host "Created $count directories successfully!" -ForegroundColor Green
Write-Host "Directory structure complete at: $baseDir" -ForegroundColor Green
