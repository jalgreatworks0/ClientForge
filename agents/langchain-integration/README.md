# LangChain + LM Studio Integration

**Purpose**: Advanced agent chains and workflows using LM Studio as the LLM backend

**Status**: Ready to Install

---

## 🎯 What This Provides

### Core Features

1. **LM Studio LLM Integration**
   - Use local models via OpenAI-compatible API
   - No external API calls or costs
   - Full privacy and data control

2. **Multi-Tool Agent Chains**
   - Combine filesystem, git, codebase, and database tools
   - Sequential and parallel tool execution
   - Error handling and retry logic

3. **Memory Management**
   - Conversation history with sliding window
   - Entity extraction and tracking
   - Context compression for long conversations

4. **Document Processing**
   - Load from PostgreSQL, MongoDB, Elasticsearch
   - Text splitting and chunking
   - Metadata extraction

5. **Custom Chains**
   - Code review chain
   - Database query chain
   - Documentation generation chain
   - Test generation chain

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
cd D:\clientforge-crm\agents\langchain-integration
npm install
```

**Dependencies**:
- `langchain` - Core framework
- `@langchain/openai` - OpenAI adapter (works with LM Studio)
- `@langchain/community` - Community integrations
- `hnswlib-node` - Vector similarity search
- `pg` - PostgreSQL client
- `mongodb` - MongoDB client

### Step 2: Configure Environment

Create `.env` file:

```env
# LM Studio API
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=lm-studio

# ClientForge Databases
POSTGRES_URI=postgres://localhost:5432/clientforge
MONGODB_URI=mongodb://localhost:27017/clientforge?authSource=admin
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379

# Workspace
WORKSPACE_ROOT=D:/clientforge-crm
```

### Step 3: Test Connection

```bash
node test-langchain.js
```

---

## 🚀 Usage Examples

### Example 1: Simple LLM Call

```javascript
const { ChatOpenAI } = require('@langchain/openai');

const llm = new ChatOpenAI({
  openAIApiKey: 'lm-studio',
  modelName: 'qwen2.5-30b-a3b',
  temperature: 0.2,
  configuration: {
    baseURL: 'http://localhost:1234/v1',
  },
});

const response = await llm.invoke('Explain ClientForge architecture');
console.log(response.content);
```

### Example 2: Agent with Tools

```javascript
const { AgentExecutor, createOpenAIFunctionsAgent } = require('langchain/agents');
const { ChatOpenAI } = require('@langchain/openai');
const { DynamicTool } = require('@langchain/core/tools');
const { promises as fs } = require('fs');

// Define tool
const readFileTool = new DynamicTool({
  name: 'read_file',
  description: 'Read contents of a file',
  func: async (path) => {
    const content = await fs.readFile(path, 'utf-8');
    return content.slice(0, 5000);
  },
});

// Create agent
const llm = new ChatOpenAI({
  openAIApiKey: 'lm-studio',
  modelName: 'qwen2.5-30b-a3b',
  configuration: { baseURL: 'http://localhost:1234/v1' },
});

const agent = await createOpenAIFunctionsAgent({
  llm,
  tools: [readFileTool],
  prompt: 'You are a helpful coding assistant.',
});

const executor = new AgentExecutor({
  agent,
  tools: [readFileTool],
});

// Execute
const result = await executor.invoke({
  input: 'Read the README.md and summarize it',
});

console.log(result.output);
```

### Example 3: Document QA with PostgreSQL

```javascript
const { PostgresDocumentLoader } = require('langchain-integration/loaders');
const { RetrievalQAChain } = require('langchain/chains');
const { ChatOpenAI } = require('@langchain/openai');

// Load documents from database
const loader = new PostgresDocumentLoader({
  connectionString: process.env.POSTGRES_URI,
  query: 'SELECT content, metadata FROM documents WHERE tenant_id = $1',
  params: ['tenant_123'],
});

const docs = await loader.load();

// Create QA chain
const llm = new ChatOpenAI({
  openAIApiKey: 'lm-studio',
  configuration: { baseURL: 'http://localhost:1234/v1' },
});

const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever());

const answer = await chain.call({
  query: 'What are the user permissions?',
});

console.log(answer.text);
```

### Example 4: Code Review Chain

```javascript
const { CodeReviewChain } = require('./chains/code-review-chain');

const chain = new CodeReviewChain({
  llmConfig: {
    baseURL: 'http://localhost:1234/v1',
    modelName: 'qwen2.5-30b-a3b',
  },
});

const review = await chain.run({
  filePath: 'D:/clientforge-crm/backend/services/auth-service.ts',
  focusAreas: ['security', 'performance', 'maintainability'],
});

console.log(review);
/*
{
  securityIssues: [...],
  performanceIssues: [...],
  suggestions: [...],
  score: 8.5
}
*/
```

---

## 🛠️ Custom Chains Included

### 1. Code Review Chain

**File**: `chains/code-review-chain.js`

**Features**:
- Security vulnerability detection
- Performance bottleneck identification
- Code smell detection
- Best practice recommendations

**Usage**:
```javascript
const chain = new CodeReviewChain({ llmConfig });
const review = await chain.run({ filePath, focusAreas });
```

### 2. Database Query Chain

**File**: `chains/database-query-chain.js`

**Features**:
- Natural language to SQL
- Query validation
- Result formatting
- Tenant isolation verification

**Usage**:
```javascript
const chain = new DatabaseQueryChain({ llmConfig, dbConfig });
const result = await chain.run({ query: 'Find all active users' });
```

### 3. Documentation Generation Chain

**File**: `chains/documentation-chain.js`

**Features**:
- JSDoc generation
- README generation
- API documentation
- Changelog updates

**Usage**:
```javascript
const chain = new DocumentationChain({ llmConfig });
const docs = await chain.run({ filePath, docType: 'jsdoc' });
```

### 4. Test Generation Chain

**File**: `chains/test-generation-chain.js`

**Features**:
- Unit test generation
- Integration test generation
- Test data generation
- Coverage gap identification

**Usage**:
```javascript
const chain = new TestGenerationChain({ llmConfig });
const tests = await chain.run({ filePath, testType: 'unit' });
```

---

## 🧩 Custom Tools

### Filesystem Tools

- `read_file` - Read file contents
- `write_file` - Write to files
- `list_files` - List directory contents
- `search_files` - Search for text in files
- `glob_pattern` - Pattern-based file finding

### Git Tools

- `git_status` - Repository status
- `git_diff` - Show changes
- `git_log` - Commit history
- `git_blame` - Blame analysis
- `git_branch` - Branch info

### Database Tools

- `query_postgresql` - Execute SQL queries
- `query_mongodb` - Execute MongoDB queries
- `search_elasticsearch` - Full-text search
- `cache_redis` - Redis operations

### Codebase Tools

- `find_definition` - Find symbol definitions
- `find_references` - Find all usages
- `dependency_graph` - Show dependencies
- `call_graph` - Show call relationships

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LangChain Integration                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  LM Studio   │      │    Tools     │      │    Chains    │
│  (LLM API)   │      │  (MCP-based) │      │   (Custom)   │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────┐
│              ClientForge CRM Backend                      │
│  PostgreSQL │ MongoDB │ Elasticsearch │ Redis │ Files    │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### LLM Configuration

```javascript
const llmConfig = {
  baseURL: 'http://localhost:1234/v1',
  modelName: 'qwen2.5-30b-a3b',
  temperature: 0.2,
  maxTokens: 4096,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
};
```

### Memory Configuration

```javascript
const memoryConfig = {
  type: 'buffer_window',
  k: 10, // Keep last 10 messages
  returnMessages: true,
  inputKey: 'input',
  outputKey: 'output',
};
```

### Vector Store Configuration

```javascript
const vectorStoreConfig = {
  type: 'hnswlib',
  space: 'cosine',
  numDimensions: 384, // For all-MiniLM-L6-v2
  directory: 'D:/clientforge-crm/agents/rag-index',
};
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Individual Components

```bash
# Test LLM connection
node test-langchain.js --test llm

# Test tools
node test-langchain.js --test tools

# Test chains
node test-langchain.js --test chains

# Test memory
node test-langchain.js --test memory
```

---

## 📚 Resources

**LangChain Docs**: https://js.langchain.com/docs
**LM Studio API**: http://localhost:1234/v1/docs
**MCP Servers**: `D:/clientforge-crm/agents/mcp/servers/`

---

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Configure environment**: Create `.env` file
3. **Test connection**: `node test-langchain.js`
4. **Try examples**: Copy from this README
5. **Build custom chains**: Extend for your use cases

---

Built with ❤️ for ClientForge CRM
**Version**: 1.0.0
**Last Updated**: 2025-11-08
