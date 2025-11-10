# 🎯 Input Folder - Command Center Coordination System

**Purpose**: Coordination between Command Center (Claude Desktop) and Executor (Claude Code)

**Last Updated**: 2025-11-05

---

## 📁 FOLDER STRUCTURE

```
input/
├── README.md              # This file - workflow documentation
├── pending/              # Tasks ready for Claude Code to execute
│   ├── task-001-*.md    # Task instructions
│   ├── file-to-apply.ts # Code files to apply
│   └── ...
├── completed/            # Completed tasks (archived by Claude Code)
│   ├── task-001-*.md    # Completed task records
│   └── ...
└── docs/                 # Coordination documentation
    ├── current-task.md  # Active task tracking
    └── handoff-log.md   # Task handoff history
```

---

## 🔄 WORKFLOW

### Step 1: Command Center Creates Task

**Command Center (Claude Desktop) does:**
1. Analyze requirements & design solution
2. Generate code/documentation
3. Create task file in `pending/` with:
   - Task ID & description
   - Files to create/modify
   - Implementation code
   - Test requirements
   - Success criteria
4. Update `docs/current-task.md`
5. Notify user: "Task ready for Claude Code"

### Step 2: User Hands Off to Claude Code

**User does:**
1. Switch to Claude Code
2. Say: "Execute task from input/pending/task-XXX-name.md"
3. Claude Code reads task & executes

### Step 3: Claude Code Executes

**Claude Code does:**
1. Read task file from `pending/`
2. Apply code changes to actual project files
3. Run tests & verify functionality
4. Report results back to user
5. Move task file to `completed/` (if successful)
6. Update `docs/handoff-log.md`

### Step 4: User Reports Back to Command Center

**User does:**
1. Switch back to Claude Desktop
2. Report Claude Code's results
3. Command Center analyzes & creates next task

---

## 📋 TASK FILE FORMAT

```markdown
# Task: [Task ID] - [Task Name]

**Created**: 2025-11-05 [Time]
**Priority**: [HIGH/MEDIUM/LOW]
**Estimated Time**: [X minutes]
**Status**: PENDING

---

## 📝 TASK DESCRIPTION

[Clear description of what needs to be done]

---

## 🎯 OBJECTIVES

1. [Objective 1]
2. [Objective 2]
3. [Objective 3]

---

## 📁 FILES TO CREATE/MODIFY

### Create: `path/to/new-file.ts`
```typescript
// Complete file content here
```

### Modify: `path/to/existing-file.ts`
**Change**: [Description of change]
**Location**: [Line numbers or function name]
**Code**:
```typescript
// Code to add/replace
```

---

## ✅ SUCCESS CRITERIA

- [ ] All files created/modified correctly
- [ ] Tests pass: `npm test [specific-test]`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`

---

## 🧪 TESTING INSTRUCTIONS

```bash
# Commands to run
npm test tests/unit/auth/auth-service.test.ts
npm run type-check
```

**Expected Results**:
- All tests passing
- Zero TypeScript errors
- Zero lint errors

---

## 📊 VERIFICATION CHECKLIST

- [ ] Files created in correct locations
- [ ] Code follows project conventions
- [ ] Tests written and passing
- [ ] No breaking changes introduced
- [ ] Documentation updated (if needed)

---

## 📝 NOTES FOR EXECUTOR

[Any special instructions, gotchas, or context Claude Code needs to know]

---

**Created by**: Command Center (Claude Desktop)
**Assigned to**: Claude Code (Executor)
**Handoff Status**: ⏳ READY FOR EXECUTION
```

---

## 🎯 CURRENT TASK TRACKING

See `docs/current-task.md` for the active task being worked on.

---

## 📜 TASK NAMING CONVENTION

```
task-[ID]-[category]-[brief-description].md

Examples:
- task-001-test-fix-auth-service.md
- task-002-feature-email-campaigns.md
- task-003-refactor-database-layer.md
- task-004-docs-api-documentation.md
```

**Categories**:
- `test` - Test fixes or test creation
- `feature` - New feature implementation
- `refactor` - Code refactoring
- `docs` - Documentation work
- `bug` - Bug fixes
- `config` - Configuration changes
- `deploy` - Deployment tasks

---

## 🚨 PRIORITY LEVELS

**HIGH**: Critical path, blocks other work, security issues
**MEDIUM**: Important but not blocking, quality improvements
**LOW**: Nice-to-have, optimizations, minor enhancements

---

## 🔍 QUALITY STANDARDS

Every task must meet:
- ✅ 85%+ test coverage
- ✅ Zero TypeScript 'any' types
- ✅ OWASP Top 10 compliance
- ✅ Deep folder structure (3-4 levels)
- ✅ Follows naming conventions
- ✅ No duplication
- ✅ Documented in session log

---

## 📞 COMMUNICATION PROTOCOL

### Command Center → User
```
"✅ Task [ID] ready in input/pending/
Please hand off to Claude Code for execution."
```

### User → Claude Code
```
"Execute task from input/pending/task-[ID]-[name].md"
```

### User → Command Center
```
"Claude Code completed task [ID]:
✅ All tests passing / ❌ Issues encountered
[Results summary]"
```

---

## 🗃️ ARCHIVING COMPLETED TASKS

**When**: After Claude Code successfully executes
**Action**: Move from `pending/` to `completed/`
**Naming**: Keep same filename, add completion timestamp

```
completed/
└── task-001-test-fix-auth-service-COMPLETED-2025-11-05-1430.md
```

---

## 🛡️ SAFETY PROTOCOLS

1. **Never delete from pending/** - Move to completed instead
2. **Always backup before major changes** - Claude Code should verify
3. **Test before deploying** - Run full test suite
4. **Document all changes** - Update session logs
5. **Review task file** - Ensure clarity before handoff

---

## 📊 METRICS TRACKING

Track in `docs/handoff-log.md`:
- Total tasks created
- Tasks completed successfully
- Average execution time
- Success rate
- Common issues encountered

---

**Built with ❤️ by Abstract Creatives LLC**
**Command Center (Claude Desktop) + Executor (Claude Code)**
**Version**: 1.0.0
