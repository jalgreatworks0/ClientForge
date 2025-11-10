; Elaria ClientForge Command Center - Hotkeys
; Install AutoHotkey: https://www.autohotkey.com/
; Add to Startup: Copy to "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"

#NoEnv
SendMode Input
SetWorkingDir %A_ScriptDir%

; ============================================
; ELARIA COMMAND CENTER HOTKEYS
; ============================================

; Win + E + C = Load CRM Context Pack
^!c::
{
    Send, Load the crm_pack context{Enter}
    TrayTip, Elaria, Loading CRM Context Pack..., 2, 1
    return
}

; Win + E + S = Security Scan
^!s::
{
    Send, Scan workspace for security vulnerabilities{Enter}
    TrayTip, Elaria, Running security scan..., 2, 1
    return
}

; Win + E + T = Run Tests
^!t::
{
    Send, Run tests with coverage{Enter}
    TrayTip, Elaria, Running tests..., 2, 1
    return
}

; Win + E + G = Git Status
^!g::
{
    Send, Show git status{Enter}
    TrayTip, Elaria, Checking git status..., 2, 1
    return
}

; Win + E + D = Deploy Full Stack
^!d::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\deploy_full.ps1"
    TrayTip, Elaria, Starting deployment..., 2, 1
    return
}

; Win + E + B = Backup Session
^!b::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\session_backup.ps1"
    TrayTip, Elaria, Creating session backup..., 2, 1
    return
}

; Win + E + R = Reload Context
^!r::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\reload_context.ps1"
    TrayTip, Elaria, Reloading context..., 2, 1
    return
}

; Win + E + A = Start All Services
^!a::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\start_all.ps1"
    TrayTip, Elaria, Starting full stack..., 2, 1
    return
}

; Win + E + U = Audit Full
^!u::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\audit_full.ps1"
    TrayTip, Elaria, Running full audit..., 2, 1
    return
}

; Win + E + I = CRM-INIT
^!i::
{
    Send, CRM-INIT{Enter}
    TrayTip, Elaria, Initializing command center..., 2, 1
    return
}

; ============================================
; UTILITY HOTKEYS
; ============================================

; Ctrl + Alt + H = Show Hotkey Help
^!h::
{
    MsgBox, 64, Elaria Hotkeys,
    (
    🧠 ELARIA COMMAND CENTER HOTKEYS

    Ctrl+Alt+I = CRM-INIT (Initialize)
    Ctrl+Alt+C = Load CRM Context Pack
    Ctrl+Alt+S = Security Scan
    Ctrl+Alt+T = Run Tests
    Ctrl+Alt+G = Git Status
    Ctrl+Alt+D = Deploy Full Stack
    Ctrl+Alt+B = Backup Session
    Ctrl+Alt+R = Reload Context
    Ctrl+Alt+A = Start All Services
    Ctrl+Alt+U = Audit Full
    Ctrl+Alt+H = Show This Help
    )
    return
}

; Show tray tip on startup
TrayTip, Elaria Hotkeys Loaded, Press Ctrl+Alt+H for help, 3, 1
