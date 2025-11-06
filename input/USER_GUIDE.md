# 🎮 COMMAND CENTER - Quick User Guide

**For**: User coordinating between Claude Desktop and Claude Code

---

## 🚀 QUICK START

### When Starting a Task

1. **Tell Command Center (Claude Desktop)** what you need:
   ```
   "I need to fix the AuthService tests"
   OR
   "Create a new email campaign feature"
   OR
   "Refactor the database layer"
   ```

2. **Command Center will**:
   - Design the solution
   - Write all the code
   - Create a task file in `input/pending/`
   - Tell you: "✅ Task ready for Claude Code"

3. **You then**:
   - Switch to Claude Code
   - Say: "Execute task from input/pending/task-XXX-name.md"

4. **Claude Code will**:
   - Read the task
   - Apply all changes
   - Run tests
   - Report results

5. **You then**:
   - Switch back to Command Center
   - Report: "Task completed - [results]"
   - Command Center creates next task (if needed)

---

## 📝 COMMAND EXAMPLES

### To Command Center (Claude Desktop)

```
"Create task: Fix AuthService tests"
"Create task: Add email validation to user signup"
"Create task: Optimize database queries for contacts"
"What should we work on next?"
"Show me the current task queue"
```

### To Claude Code (Terminal)

```
"Execute task from input/pending/task-001-test-fix-auth-service.md"
"Run tests for the changes you just made"
"Show me what you changed"
"Verify everything is working"
```

---

## 🎯 WORKFLOW AT A GLANCE

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  YOU: "I need X"                                             │
│                                                               │
│  ↓                                                            │
│                                                               │
│  COMMAND CENTER: Designs & creates task in input/pending/    │
│                                                               │
│  ↓                                                            │
│                                                               │
│  YOU: Switch to Claude Code                                  │
│                                                               │
│  ↓                                                            │
│                                                               │
│  CLAUDE CODE: Executes task & reports results                │
│                                                               │
│  ↓                                                            │
│                                                               │
│  YOU: Switch back to Command Center                          │
│                                                               │
│  ↓                                                            │
│                                                               │
│  COMMAND CENTER: Analyzes results, creates next task         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 FOLDER NAVIGATION

### Check Pending Tasks
```bash
# View what's ready for Claude Code
dir input\pending
ls input/pending/
```

### Check Completed Tasks
```bash
# View what's been done
dir input\completed
ls input/completed/
```

### Read Task Details
```bash
# Read a task file
type input\pending\task-001-name.md
cat input/pending/task-001-name.md
```

---

## 🎯 TASK PRIORITIES

When multiple tasks exist:
- **HIGH**: Do first (security, blockers, critical bugs)
- **MEDIUM**: Do next (features, improvements)
- **LOW**: Do when time allows (optimizations, nice-to-haves)

---

## 💬 COMMUNICATION TIPS

### Good Commands (Clear & Specific)
✅ "Create task to fix the AuthService unit tests - they're failing because of mocking issues"
✅ "Create task to add email validation with proper error messages"
✅ "Create task to optimize the contact list query - it's too slow"

### Vague Commands (Less Effective)
❌ "Fix the tests"
❌ "Make it better"
❌ "Add some validation"

**Why**: Command Center needs specifics to design the right solution!

---

## 🔄 TYPICAL SESSION FLOW

### Example: Fixing Tests

1. **You → Command Center**:
   "AuthService tests are failing. Last session showed mocking issues with singleton services."

2. **Command Center → You**:
   "✅ Task 001 ready: Fix AuthService tests using module mocking pattern
   Location: input/pending/task-001-test-fix-auth-service.md
   Ready for Claude Code execution."

3. **You → Claude Code**:
   "Execute task from input/pending/task-001-test-fix-auth-service.md"

4. **Claude Code → You**:
   "✅ Task completed:
   - Modified: tests/unit/auth/auth-service.test.ts
   - Tests: 30/30 passing
   - Coverage: 92%
   - No errors"

5. **You → Command Center**:
   "Task 001 complete - all AuthService tests passing!"

6. **Command Center → You**:
   "Excellent! Next task: Fix PasswordService tests?
   Or would you like to work on something else?"

---

## 🛠️ TROUBLESHOOTING

### "Can't find task file"
- Check you're in the right directory: `d:/clientforge-crm/`
- Verify file exists: `dir input\pending`
- Use full path if needed

### "Claude Code can't execute task"
- Ensure task file is well-formed
- Check all code blocks are valid
- Verify file paths are correct

### "Task fails during execution"
- Claude Code will report the error
- Report back to Command Center
- Command Center will create a fix task

---

## 📊 MONITORING PROGRESS

Check these files for status:
- `input/docs/current-task.md` - What's active now
- `input/docs/handoff-log.md` - Full history
- `logs/session-logs/` - Detailed session logs

---

## 🎓 BEST PRACTICES

1. **Be Specific**: Give Command Center full context
2. **One Task at a Time**: Let Claude Code finish before starting next
3. **Report Back**: Always tell Command Center the results
4. **Check Quality**: Verify tests pass, no errors
5. **Document**: Command Center will handle session logs

---

## 🚨 WHEN TO USE WHICH CLAUDE

### Use Command Center (Claude Desktop) For:
- Planning & strategy
- Designing solutions
- Writing code & documentation
- Creating task files
- Analyzing results
- Making architectural decisions

### Use Claude Code (Terminal) For:
- Executing task files
- Running tests
- Verifying functionality
- Debugging runtime issues
- Applying changes to project files

---

## ✅ SUCCESS INDICATORS

**Task was successful when**:
- ✅ All tests passing
- ✅ Zero TypeScript errors
- ✅ Zero lint errors
- ✅ Code follows conventions
- ✅ Documentation updated
- ✅ Claude Code reports success

---

**Happy coordinating! 🚀**

**Command Center**: Ready to create tasks
**Claude Code**: Ready to execute tasks
**You**: The conductor orchestrating both!
