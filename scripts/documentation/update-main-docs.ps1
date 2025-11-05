# Update Main Documentation Script
# ClientForge CRM v3.0
# Abstract Creatives LLC

<#
.SYNOPSIS
    Interactive script to update all main documentation files

.DESCRIPTION
    This script helps AI assistants and developers update the main documentation
    files in the correct order with proper formatting.

.PARAMETER Mode
    The update mode: 'all', 'specific', 'session-end', 'changelog-only'

.EXAMPLE
    .\update-main-docs.ps1 -Mode all
    Updates all main documentation files

.EXAMPLE
    .\update-main-docs.ps1 -Mode session-end
    Updates docs at end of session (MAP + CHANGELOG)

.EXAMPLE
    .\update-main-docs.ps1 -Mode changelog-only
    Updates only the changelog
#>

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('all', 'specific', 'session-end', 'changelog-only', 'interactive')]
    [string]$Mode = 'interactive'
)

# Configuration
$DocsPath = "D:\clientforge-crm\docs"
$RootPath = "D:\clientforge-crm"
$LogsPath = "$RootPath\logs\session-logs"

# Ensure logs directory exists
if (-not (Test-Path $LogsPath)) {
    New-Item -ItemType Directory -Path $LogsPath -Force | Out-Null
}

# Color functions
function Write-Header {
    param([string]$Text)
    Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

# Main Documentation Files
$MainDocs = @{
    "00_MAP.md" = @{
        Title = "Complete File/Folder Map"
        Description = "Updates the complete directory and file mapping"
        UpdateFrequency = "High - When any files/folders change"
    }
    "01_ARCHITECTURE.md" = @{
        Title = "System Architecture Overview"
        Description = "Updates architecture diagrams and component descriptions"
        UpdateFrequency = "Medium - When architecture changes"
    }
    "02_AI-SYSTEMS.md" = @{
        Title = "AI Tools and Systems Guide"
        Description = "Updates AI features, models, and integrations"
        UpdateFrequency = "Medium - When AI features change"
    }
    "03_API.md" = @{
        Title = "API Documentation Summary"
        Description = "Updates REST, GraphQL, and WebSocket APIs"
        UpdateFrequency = "High - When endpoints change"
    }
    "04_DEPLOYMENT.md" = @{
        Title = "Deployment Guide Summary"
        Description = "Updates deployment configurations and procedures"
        UpdateFrequency = "Low - When deployment config changes"
    }
    "05_SECURITY.md" = @{
        Title = "Security Overview"
        Description = "Updates security features and compliance"
        UpdateFrequency = "Low - When security changes"
    }
    "06_DEVELOPMENT.md" = @{
        Title = "Development Guide"
        Description = "Updates development tools and processes"
        UpdateFrequency = "Low - When dev tools change"
    }
    "07_CHANGELOG.md" = @{
        Title = "Version History and Changes"
        Description = "Updates version history (UPDATE EVERY SESSION)"
        UpdateFrequency = "Very High - Every significant change"
    }
    "08_TROUBLESHOOTING.md" = @{
        Title = "Common Issues and Solutions"
        Description = "Updates common problems and solutions"
        UpdateFrequency = "Medium - When new issues discovered"
    }
}

# Check if main docs exist
function Test-MainDocsExist {
    Write-Header "Checking Main Documentation Files"

    $allExist = $true
    foreach ($doc in $MainDocs.Keys | Sort-Object) {
        $path = Join-Path $DocsPath $doc
        if (Test-Path $path) {
            Write-Success "$doc exists"
        } else {
            Write-Error "$doc NOT FOUND - needs to be created"
            $allExist = $false
        }
    }

    return $allExist
}

# Create session log
function New-SessionLog {
    Write-Header "Create Session Log"

    $date = Get-Date -Format "yyyy-MM-dd"
    $time = Get-Date -Format "HH:mm"

    $taskName = Read-Host "Enter task name (e.g., 'create-folder-structure')"

    $logFileName = "$date-$taskName.md"
    $logPath = Join-Path $LogsPath $logFileName

    $template = @"
# Session Log: $date - $taskName

**Date**: $date
**Time**: $time
**AI Assistant**: Claude Code
**Task**: [Brief description of what was accomplished]

## Changes Made

### Files Created
- ``path/to/file.ts`` - Purpose of file

### Files Modified
- ``path/to/file.ts`` - What was changed

### Folders Created
- ``path/to/folder/`` - Purpose of folder

## Documentation Updated
- [ ] 00_MAP.md
- [ ] 01_ARCHITECTURE.md
- [ ] 02_AI-SYSTEMS.md
- [ ] 03_API.md
- [ ] 04_DEPLOYMENT.md
- [ ] 05_SECURITY.md
- [ ] 06_DEVELOPMENT.md
- [ ] 07_CHANGELOG.md
- [ ] 08_TROUBLESHOOTING.md

## Summary
[Brief summary of work completed]

## Next Steps
- [Suggested next actions]
- [Unfinished work]
- [Known issues]

## Notes
- [Any important observations]
- [Performance considerations]
- [Technical debt created]

---

**Session Duration**: [Start] - [End]
**Status**: Completed
**By**: Abstract Creatives LLC - ClientForge CRM Team
"@

    $template | Out-File -FilePath $logPath -Encoding UTF8

    Write-Success "Session log created: $logPath"
    Write-Info "Please fill in the details in the session log file"

    return $logPath
}

# Update 00_MAP.md
function Update-MapDoc {
    Write-Header "Updating 00_MAP.md"

    Write-Info "Generating directory structure..."

    $mapPath = Join-Path $DocsPath "00_MAP.md"

    Write-Info "MAP file will be created at: $mapPath"
    Write-Info "You need to manually generate the complete file structure"
    Write-Info "Run: tree /F /A > structure.txt (Windows) or use PowerShell commands"

    Write-Host "`nDo you want to open the MAP file for editing? (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq 'Y' -or $response -eq 'y') {
        if (Test-Path $mapPath) {
            Start-Process "notepad.exe" $mapPath
        } else {
            Write-Error "MAP file doesn't exist yet. Create it first."
        }
    }
}

# Update 07_CHANGELOG.md
function Update-ChangelogDoc {
    Write-Header "Updating 07_CHANGELOG.md"

    $changelogPath = Join-Path $DocsPath "07_CHANGELOG.md"

    $date = Get-Date -Format "yyyy-MM-dd"
    $version = Read-Host "Enter version (e.g., 3.0.0, 3.0.1, or 'Unreleased')"

    Write-Host "`nWhat type of changes? (Select numbers separated by commas):"
    Write-Host "1. Added (new features)"
    Write-Host "2. Changed (changes in existing functionality)"
    Write-Host "3. Fixed (bug fixes)"
    Write-Host "4. Removed (removed features)"
    Write-Host "5. Security (security improvements)"

    $changeTypes = Read-Host "`nEnter numbers (e.g., 1,3,5)"

    $entry = @"

## [$version] - $date

"@

    if ($changeTypes -match '1') {
        $entry += @"

### Added
- [Description of what was added]

"@
    }

    if ($changeTypes -match '2') {
        $entry += @"

### Changed
- [Description of what was changed]

"@
    }

    if ($changeTypes -match '3') {
        $entry += @"

### Fixed
- [Description of what was fixed]

"@
    }

    if ($changeTypes -match '4') {
        $entry += @"

### Removed
- [Description of what was removed]

"@
    }

    if ($changeTypes -match '5') {
        $entry += @"

### Security
- [Description of security improvements]

"@
    }

    Write-Success "Changelog entry template created"
    Write-Info "Entry to add to CHANGELOG:"
    Write-Host $entry -ForegroundColor Gray

    Write-Host "`nAdd this to the CHANGELOG now? (Y/N): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host

    if ($response -eq 'Y' -or $response -eq 'y') {
        if (Test-Path $changelogPath) {
            # Read existing content
            $existingContent = Get-Content $changelogPath -Raw

            # Find where to insert (after the header)
            $headerEnd = $existingContent.IndexOf("`n## ")

            if ($headerEnd -gt 0) {
                $newContent = $existingContent.Substring(0, $headerEnd) + $entry + $existingContent.Substring($headerEnd)
                $newContent | Out-File -FilePath $changelogPath -Encoding UTF8 -NoNewline
                Write-Success "Changelog updated successfully"
            } else {
                # Append to end if no existing entries
                $entry | Add-Content -Path $changelogPath -Encoding UTF8
                Write-Success "Changelog entry added"
            }
        } else {
            Write-Error "CHANGELOG file doesn't exist yet. Create it first."
        }
    }
}

# Interactive mode
function Start-InteractiveMode {
    Write-Header "ClientForge CRM - Documentation Update Tool"
    Write-Host "Abstract Creatives LLC`n" -ForegroundColor Cyan

    Write-Host "This tool helps you update the main documentation files.`n"

    # Check if docs exist
    $docsExist = Test-MainDocsExist

    if (-not $docsExist) {
        Write-Error "`nSome documentation files are missing!"
        Write-Info "You need to create the missing files first."
        Write-Host "`nWould you like to see the template for missing files? (Y/N): " -NoNewline -ForegroundColor Yellow
        $response = Read-Host

        if ($response -eq 'Y' -or $response -eq 'y') {
            Write-Host "`nCheck the docs/ folder for .template.md files"
        }
        return
    }

    Write-Host "`nWhat would you like to update?`n"
    Write-Host "1. Session End Update (MAP + CHANGELOG + Session Log) - RECOMMENDED"
    Write-Host "2. Update CHANGELOG only"
    Write-Host "3. Update MAP only"
    Write-Host "4. Update specific documentation file"
    Write-Host "5. Update all main documentation"
    Write-Host "6. Create session log only"
    Write-Host "7. Exit`n"

    $choice = Read-Host "Enter your choice (1-7)"

    switch ($choice) {
        '1' {
            Write-Header "Session End Update"
            Write-Info "This will update MAP, CHANGELOG, and create a session log"
            Write-Info "This is the RECOMMENDED option before ending a session`n"

            # Create session log
            $logPath = New-SessionLog

            # Update MAP
            Update-MapDoc

            # Update CHANGELOG
            Update-ChangelogDoc

            Write-Success "`nSession end update complete!"
            Write-Info "Don't forget to:"
            Write-Info "  1. Fill in the session log: $logPath"
            Write-Info "  2. Review and complete the MAP if needed"
            Write-Info "  3. Review and complete the CHANGELOG entry"
            Write-Info "  4. Update any other main docs if needed"
        }
        '2' {
            Update-ChangelogDoc
        }
        '3' {
            Update-MapDoc
        }
        '4' {
            Write-Host "`nAvailable documentation files:`n"
            $i = 1
            $sortedDocs = $MainDocs.Keys | Sort-Object
            foreach ($doc in $sortedDocs) {
                Write-Host "$i. $doc - $($MainDocs[$doc].Title)"
                $i++
            }

            $fileChoice = Read-Host "`nEnter file number to edit"
            $selectedDoc = $sortedDocs[$fileChoice - 1]

            if ($selectedDoc) {
                $path = Join-Path $DocsPath $selectedDoc
                if (Test-Path $path) {
                    Start-Process "notepad.exe" $path
                    Write-Success "Opened $selectedDoc for editing"
                } else {
                    Write-Error "File not found: $selectedDoc"
                }
            }
        }
        '5' {
            Write-Info "Opening all main documentation files for review..."
            foreach ($doc in $MainDocs.Keys | Sort-Object) {
                $path = Join-Path $DocsPath $doc
                if (Test-Path $path) {
                    Start-Process "notepad.exe" $path
                    Start-Sleep -Milliseconds 500
                }
            }
            Write-Success "All main docs opened"
        }
        '6' {
            New-SessionLog
        }
        '7' {
            Write-Info "Exiting..."
            return
        }
        default {
            Write-Error "Invalid choice"
        }
    }
}

# Main execution
switch ($Mode) {
    'interactive' {
        Start-InteractiveMode
    }
    'session-end' {
        Write-Header "Session End Update"
        New-SessionLog
        Update-MapDoc
        Update-ChangelogDoc
    }
    'changelog-only' {
        Update-ChangelogDoc
    }
    'all' {
        Write-Header "Updating All Main Documentation"
        foreach ($doc in $MainDocs.Keys | Sort-Object) {
            Write-Info "Review and update: $doc"
        }
        Write-Info "Please review each file manually"
    }
}

Write-Host "`n"
Write-Success "Documentation update tool completed"
Write-Info "Remember: Keep docs synchronized with code changes!"
Write-Host "`n"
