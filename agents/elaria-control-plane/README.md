# Elaria Control Plane - CLI for LM Studio

**Direct CLI interface to Elaria (LM Studio) with autonomous tool execution.**

This bypasses LM Studio's broken MCP system by using the OpenAI-compatible API with custom tool parsing and execution.

---

## 🚀 Quick Start

### 1. Prerequisites

- **LM Studio** running on `http://localhost:1234`
- **Model loaded** (Qwen2.5-30B-A3B recommended)
- **Node.js 18+** installed

### 2. Install Dependencies

```bash
cd D:\clientforge-crm\agents\elaria-control-plane
npm install
```

### 3. Test Connection

```bash
npm test
```

Expected output:
```
✓ PASS - LM Studio connection
✓ PASS - Tool execution
✓ PASS - LM Studio chat
✓ PASS - Tool call parsing
✓ PASS - File read tool
✓ PASS - Git integration
✓ PASS - Project analysis
✓ PASS - Tool registry

✓ All tests passed! Elaria Control Plane is ready.
```

### 4. Start Interactive Mode

```bash
npm start
```

Or run a single command:

```bash
node index.js "analyze the ClientForge backend structure"
```

---

## 💡 How It Works

### The Problem

LM Studio's native MCP support (v0.3.17+) has connection issues and doesn't reliably execute tools.

### The Solution

**Elaria Control Plane** bypasses MCP entirely:

1. **Direct API**: Uses LM Studio's OpenAI-compatible API (`/v1/chat/completions`)
2. **Custom Tool Parser**: Parses tool calls from model responses using a custom protocol
3. **Local Tool Execution**: Executes tools directly in Node.js
4. **Feedback Loop**: Feeds results back to the model for continued reasoning

### Architecture

```
┌─────────────────────────────────────────────┐
│  USER                                       │
│  "Analyze the backend structure"           │
└────────────────┬────────────────────────────┘
                 ↓
┌────────────────────────────────────────────┐
│  ELARIA CONTROL PLANE (This CLI)          │
│  - Sends prompt to LM Studio              │
│  - Parses tool calls from response        │
│  - Executes tools locally                 │
│  - Sends results back to LM Studio        │
│  - Repeats until task complete            │
└────────┬────────────────────┬──────────────┘
         ↓                    ↓
┌──────────────────┐  ┌──────────────────────┐
│  LM STUDIO       │  │  TOOL EXECUTORS      │
│  (Elaria Brain)  │  │  - File operations   │
│  - Reasoning     │  │  - Git commands      │
│  - Planning      │  │  - Search files      │
│  - Decisions     │  │  - Analyze project   │
└──────────────────┘  └──────────────────────┘
```

---

## 🔧 Available Tools

Elaria has access to 10 powerful tools:

| Tool | Description | Example Parameters |
|------|-------------|-------------------|
| `list_files` | List files matching pattern | `{"pattern": "**/*.ts"}` |
| `read_file` | Read file contents | `{"filePath": "README.md"}` |
| `write_file` | Write content to file | `{"filePath": "test.txt", "content": "..."}` |
| `search_files` | Search text across files | `{"query": "function"}` |
| `git_status` | Get git repository status | `{"directory": "D:\\clientforge-crm"}` |
| `git_log` | Get git commit history | `{"limit": 10}` |
| `git_diff` | Get git diff of changes | `{"file": "package.json"}` |
| `run_command` | Run safe shell commands | `{"command": "npm test"}` |
| `analyze_project` | Analyze project structure | `{"directory": "D:\\clientforge-crm"}` |
| `query_database` | Query database schema | `{"query": "schema"}` |

---

## 📝 Usage Examples

### Interactive Mode

```bash
npm start
```

Then type commands:

```
Elaria > What TypeScript files are in the backend?
Elaria > Read the README.md file
Elaria > Show me recent git commits
Elaria > Analyze the project structure
Elaria > Search for "logger" in TypeScript files
```

### Single Command Mode

```bash
# Analyze backend
node index.js "Analyze the backend directory structure"

# Check git status
node index.js "What changed recently in git?"

# Read specific file
node index.js "Read the package.json file and summarize dependencies"

# Complex task
node index.js "Find all TypeScript files with 'auth' in the name, then analyze the authentication service"
```

### Programmatic Usage

```javascript
import { ElariaAgent } from './elaria-agent.js';

const agent = new ElariaAgent({
  baseURL: 'http://localhost:1234/v1',
  model: 'qwen2.5-30b-a3b',
});

const result = await agent.execute('Analyze the ClientForge backend');

console.log(result.summary);
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# LM Studio server URL
export LM_STUDIO_URL=http://localhost:1234/v1

# Model name
export LM_STUDIO_MODEL=qwen2.5-30b-a3b

# Max iterations before timeout
export MAX_ITERATIONS=10
```

### Customizing the System Prompt

Edit `elaria-agent.js` → `getDefaultSystemPrompt()` to customize how Elaria behaves.

### Adding New Tools

1. Add tool function to `tools.js`:

```javascript
export async function myNewTool({ param1, param2 }) {
  try {
    // Your tool logic here
    return { success: true, result: '...' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

2. Register in `TOOLS` object:

```javascript
export const TOOLS = {
  // ... existing tools
  my_new_tool: {
    function: myNewTool,
    description: 'Does something useful',
    parameters: {
      param1: { type: 'string', description: 'First parameter', required: true },
      param2: { type: 'number', description: 'Second parameter' }
    }
  }
};
```

3. Elaria will automatically see the new tool!

---

## 🧪 Testing

Run the full test suite:

```bash
npm test
```

Test specific functionality:

```bash
# Test connection only
node test-elaria.js | grep -A 3 "Testing LM Studio connection"

# Test tool execution
node test-elaria.js | grep -A 3 "Testing tool execution"
```

---

## 🐛 Troubleshooting

### LM Studio Connection Failed

**Error**: `Failed to connect to LM Studio`

**Solutions**:
1. Make sure LM Studio is running
2. Check that server is on port 1234 (Settings → Server)
3. Verify a model is loaded
4. Test manually: `curl http://localhost:1234/v1/models`

### Model Not Responding

**Error**: `No response from model` or timeouts

**Solutions**:
1. Check GPU usage in Task Manager
2. Reduce context length if model is too large
3. Use a smaller model (Mistral-7B, Phi-3)
4. Increase timeout in `elaria-agent.js`

### Tool Parsing Failed

**Error**: `No tool calls detected`

**Solutions**:
1. Model may not understand the tool protocol
2. Try adding examples to the system prompt
3. Use a more instruction-following model (Qwen, Llama-3.1)
4. Check model temperature (should be < 0.5 for tool use)

### Max Iterations Reached

**Error**: `Max iterations reached without completion`

**Solutions**:
1. Increase `MAX_ITERATIONS` environment variable
2. Simplify the task
3. Check if model is stuck in a loop (review logs)
4. Add more specific instructions to your prompt

---

## 📊 Performance Tips

### Model Selection

Best models for tool use (in order):
1. **Qwen2.5-30B-A3B** (best reasoning, requires 24GB VRAM)
2. **Llama-3.1-70B** (good reasoning, large)
3. **Mistral-7B-Instruct** (fast, decent tool use)
4. **Phi-3-Medium** (very fast, okay tool use)

### Prompt Engineering

- Be specific: "List all TypeScript files in backend/" vs "Show me code"
- Break down complex tasks: "First analyze, then suggest improvements"
- Provide context: "In the ClientForge CRM project, ..."

### Iteration Management

- Set `maxIterations` based on task complexity:
  - Simple queries: 3-5 iterations
  - Analysis tasks: 5-10 iterations
  - Complex multi-step: 10-15 iterations

---

## 🔐 Security

### Safe Commands

Only these command prefixes are allowed in `run_command`:
- `npm`
- `git`
- `node`
- `tsc`
- `jest`
- `eslint`
- `ls` / `dir`

All other commands are blocked for security.

### File Access

Tools have access to:
- **Read**: Any file in `D:\clientforge-crm`
- **Write**: Any file in `D:\clientforge-crm`

To restrict access, modify `PROJECT_ROOT` in `tools.js`.

---

## 🚧 Known Limitations

1. **No streaming**: Responses are returned all at once (not token-by-token)
2. **Single-threaded**: One task at a time
3. **Context window**: Limited by your model's context length
4. **No memory**: Each command starts fresh (no conversation memory between commands)

### Future Improvements

- [ ] Add streaming support for real-time output
- [ ] Implement conversation memory/history
- [ ] Add multi-task parallel execution
- [ ] Integrate with ClientForge database directly
- [ ] Add web search capability
- [ ] Support for vision/image analysis

---

## 📚 Comparison with MCP

| Feature | Elaria Control Plane | LM Studio MCP |
|---------|---------------------|---------------|
| **Reliability** | ✅ Works consistently | ❌ Connection issues |
| **Tool Execution** | ✅ Direct, fast | ⚠️ Unreliable |
| **Debugging** | ✅ Full visibility | ❌ Black box |
| **Customization** | ✅ Easy to extend | ⚠️ Limited |
| **Setup** | ✅ npm install | ⚠️ Complex config |
| **Autonomous Loops** | ✅ Built-in | ❌ Not supported |

---

## 📄 License

MIT License - See LICENSE file

---

## 🙋 Support

**Issues**: Create an issue in the ClientForge CRM repository
**Documentation**: `D:\clientforge-crm\docs\LM_STUDIO_INTEGRATION.md`
**Elaria Agent Docs**: `D:\clientforge-crm\agents\elaria_command_center\README.md`

---

Built with ❤️ by ScrollForge
**Version**: 1.0.0
**Last Updated**: 2025-11-08
