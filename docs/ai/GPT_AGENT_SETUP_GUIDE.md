# GPT Agent Setup Guide - VS Code with Continue

**Version**: 1.0
**Last Updated**: 2025-11-11
**Setup Time**: 10 minutes
**Status**: Complete

## Overview

This guide walks you through setting up the GPT Architect agent in VS Code using the Continue extension. Once configured, you'll have a GPT-powered coding assistant with access to all local drives (C:\, D:\, E:\, etc.) that works alongside Claude Code.

## Prerequisites

✅ **VS Code** installed (version 1.80+)
✅ **OpenAI API Key** configured in `.env` (already done)
✅ **Node.js** 18+ installed
✅ **PowerShell** 5.1+ (for Windows scripts)

## Setup Steps

### 1. Install Continue Extension

**Option A: Via VS Code**
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "Continue"
4. Click "Install" on the Continue extension by Continue
5. Reload VS Code if prompted

**Option B: Via Command Line**
```bash
code --install-extension Continue.continue
```

### 2. Open the All-Drives Workspace

```powershell
cd d:\clientforge-crm
npm run agent:open-workspace
```

This opens VS Code with the `ClientForge-AllDrives.code-workspace` configuration, giving the GPT agent access to:
- **D:\clientforge-crm** (primary project)
- **C:\ Drive** (full access)
- **D:\ Drive** (full access)
- **E:\ Drive** (if exists)

### 3. Verify Continue Configuration

The Continue extension should automatically pick up the configuration from:
```
C:\Users\ScrollForge\.continue\config.json
```

**Configured Models**:
- **GPT-Architect (o1)** - Advanced reasoning for complex tasks
- **GPT-4o** - Main coding model
- **GPT-4o-mini** - Fast operations and autocomplete

### 4. Test the Setup

**Open Continue Chat**:
- Press `Ctrl+L` to open the Continue sidebar
- Or click the Continue icon in the left sidebar

**Run Test Command**:
```
C-G OVERRIDE - Create a test file at C:\Dev\scratch\gpt-test.txt with content "GPT agent working!"
```

**Expected Behavior**:
1. Continue analyzes the request
2. Runs `npm run agent:override-check` to verify C-G OVERRIDE
3. Creates the file at C:\Dev\scratch\gpt-test.txt
4. Logs the action to `logs/agent-change-log/2025-11-11.log`
5. Reports success

**Verify**:
```bash
# Check file was created
cat C:\Dev\scratch\gpt-test.txt

# Check audit log
cat d:\clientforge-crm\logs\agent-change-log\2025-11-11.log
```

## Custom Commands

Continue is configured with these custom commands:

### 1. C-G | Plan & Implement (All Drives)

**Purpose**: Full-featured implementation with safety checks

**Usage**:
1. Select code or position cursor
2. Open Continue chat (Ctrl+L)
3. Type: `C-G | Plan & Implement (All Drives)`
4. Describe your task

**Features**:
- Searches codebase before creating files
- Enforces C-G OVERRIDE for cross-drive writes
- Runs verification suite after changes
- Produces detailed summary with diffs

**Example**:
```
C-G | Plan & Implement (All Drives)

Task: Add error fingerprinting to the alert router
```

### 2. C-G | Write Tests for Selection

**Purpose**: Generate unit tests for selected code

**Usage**:
1. Select the code you want to test
2. Open Continue chat (Ctrl+L)
3. Type: `C-G | Write Tests for Selection`

**Output**:
- Jest unit tests following repo conventions
- Edge cases and error scenarios
- Aims for 90%+ code coverage

### 3. C-G | Create Runbook from Error ID

**Purpose**: Generate operational runbooks for error IDs

**Usage**:
```
C-G | Create Runbook from Error ID

Error ID: DB-001
```

**Output**:
- Triage steps
- Resolution procedures
- Prevention strategies
- Monitoring queries
- Diagnostic commands

### 4. C-G | Explain Code

**Purpose**: Detailed code explanation

**Usage**:
1. Select code to explain
2. Open Continue chat (Ctrl+L)
3. Type: `C-G | Explain Code`

**Output**:
- High-level purpose
- Step-by-step breakdown
- Patterns and algorithms
- Potential improvements

## Safety & Governance

### C-G OVERRIDE Keyword

**Rule**: Any write outside `D:\clientforge-crm` **requires** `C-G OVERRIDE`

**Examples**:

✅ **Approved**:
```
C-G OVERRIDE - Create utility at C:\Dev\utils\helper.ts
```

❌ **Blocked**:
```
Create utility at C:\Dev\utils\helper.ts
# Missing C-G OVERRIDE
```

### Audit Logging

All cross-drive writes are logged:
```
d:\clientforge-crm\logs\agent-change-log\YYYY-MM-DD.log
```

**Log Format**:
```
[2025-11-11 10:30:45] TASK=req_abc123 PATH=C:\Dev\test.txt REASON=User requested
```

**View Logs**:
```bash
# Today's log
cat d:\clientforge-crm\logs\agent-change-log\$(date +%Y-%m-%d).log

# Search for specific path
grep "C:\\Dev" d:\clientforge-crm\logs\agent-change-log\*.log
```

### Restricted Paths

These paths are **always blocked** (even with C-G OVERRIDE):
- `C:\Windows\*`
- `C:\Program Files\*`
- `C:\Program Files (x86)\*`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Open Continue chat |
| `Ctrl+Shift+L` | Accept diff suggestion |
| `Ctrl+Shift+Backspace` | Reject diff suggestion |
| `Ctrl+Alt+G` | Focus Continue input |
| `Ctrl+P` | Quick file open |
| `Ctrl+Shift+P` | Command palette |

## Dual Agent Workflow

### Claude Code (CLI)
**Use for**:
- Complex multi-file refactoring
- Architecture changes
- Session-based work with comprehensive logs
- Project initialization and verification

**Example**:
```bash
claude-code "Implement alert routing webhooks with full tests and documentation"
```

### GPT Architect (VS Code)
**Use for**:
- Quick inline edits
- Test generation
- Code explanations
- IDE-integrated workflows
- Autocomplete and suggestions

**Example**:
```
C-G | Write Tests for Selection
# (with code selected in editor)
```

### Coordination
- Both agents follow same governance policies
- Both log cross-drive writes to same audit trail
- Session logs shared in `logs/session-logs/`
- Git commits identify which agent made changes

## Troubleshooting

### Issue: Continue Extension Not Loading

**Symptoms**:
- Continue sidebar doesn't appear
- Ctrl+L doesn't work

**Solution**:
1. Verify extension installed:
   ```bash
   code --list-extensions | grep Continue
   ```
2. Reload VS Code: `Ctrl+R`
3. Check extension logs: View → Output → Continue

### Issue: API Key Not Working

**Symptoms**:
- "Invalid API key" error
- Continue can't connect to OpenAI

**Solution**:
1. Verify `.env` has valid key:
   ```bash
   grep OPENAI_API_KEY d:\clientforge-crm\.env
   ```
2. Restart VS Code to reload environment
3. Check Continue config:
   ```bash
   cat C:\Users\ScrollForge\.continue\config.json
   ```

### Issue: Override Check Fails

**Symptoms**:
```
❌ Cross-drive write blocked
```

**Solution**:
1. Ensure `C-G OVERRIDE` is in your prompt (case-insensitive)
2. Use absolute paths (not relative)
3. Test manually:
   ```bash
   npm run agent:override-check -- "C-G OVERRIDE test" "C:\test.txt"
   ```

### Issue: Audit Log Not Created

**Symptoms**:
- Log directory doesn't exist
- PowerShell script fails

**Solution**:
1. Create log directory:
   ```bash
   mkdir d:\clientforge-crm\logs\agent-change-log
   ```
2. Check PowerShell execution policy:
   ```powershell
   Get-ExecutionPolicy
   # Should be RemoteSigned or Unrestricted

   # If not, set it:
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## Advanced Configuration

### Model Selection

Edit `C:\Users\ScrollForge\.continue\config.json` to change models:

```json
{
  "models": [
    {
      "title": "Your Model Name",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}"
    }
  ]
}
```

### Custom Commands

Add your own commands in the config:

```json
{
  "customCommands": [
    {
      "name": "Your Command",
      "prompt": "Your prompt template with {{{ input }}}",
      "description": "What this command does"
    }
  ]
}
```

### Context Providers

Enable/disable context sources:

```json
{
  "contextProviders": [
    {"name": "code", "params": {}},
    {"name": "docs", "params": {}},
    {"name": "terminal", "params": {}},
    {"name": "problems", "params": {}}
  ]
}
```

## Verification Checklist

After setup, verify everything works:

- [ ] Continue extension installed and loaded
- [ ] Ctrl+L opens Continue chat
- [ ] Custom commands appear in Continue UI
- [ ] Override check script works:
  ```bash
  npm run agent:override-check -- "C-G OVERRIDE test" "C:\test.txt"
  ```
- [ ] Audit logging script works:
  ```bash
  npm run agent:log-edit -- "C:\test.txt" "test" "test_123"
  ```
- [ ] Test file creation with C-G OVERRIDE succeeds
- [ ] Audit log entry created in `logs/agent-change-log/`
- [ ] VS Code workspace loads all drives

## Next Steps

1. ✅ Complete setup verification
2. ✅ Read [GPT Agent Policy](./GPT_AGENT_POLICY.md)
3. ✅ Try custom commands with sample tasks
4. ✅ Configure additional models if needed
5. ✅ Set up team members with same configuration

## Resources

- **Policy**: [GPT_AGENT_POLICY.md](./GPT_AGENT_POLICY.md)
- **Continue Docs**: https://continue.dev/docs
- **Workspace**: [.vscode/ClientForge-AllDrives.code-workspace](../../.vscode/ClientForge-AllDrives.code-workspace)
- **Config**: `C:\Users\ScrollForge\.continue\config.json`
- **Scripts**: [scripts/agents/](../../scripts/agents/)
- **Audit Logs**: [logs/agent-change-log/](../../logs/agent-change-log/)

## Support

**Issues?**
1. Check [Troubleshooting](#troubleshooting) section
2. Review [GPT_AGENT_POLICY.md](./GPT_AGENT_POLICY.md)
3. Check Continue extension logs
4. Verify npm scripts work individually

**Questions?**
- Continue documentation: https://continue.dev/docs
- OpenAI API docs: https://platform.openai.com/docs

---

**Setup Complete!** 🎉

You now have:
- ✅ GPT Architect agent in VS Code
- ✅ All-drives access with safety controls
- ✅ Audit logging for cross-drive writes
- ✅ Custom commands for common tasks
- ✅ Keyboard shortcuts configured
- ✅ Dual-agent workflow with Claude Code

**Quick Start**:
```bash
# Open workspace
npm run agent:open-workspace

# Press Ctrl+L in VS Code
# Type: C-G | Plan & Implement (All Drives)
# Describe your task
```

Happy coding! 🚀
