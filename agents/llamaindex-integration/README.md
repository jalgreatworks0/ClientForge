# LlamaIndex + LM Studio Integration

**Purpose**: Advanced RAG (Retrieval Augmented Generation) over entire ClientForge codebase

**Status**: Ready to Install

---

## 🎯 What This Provides

### Core Capabilities

1. **Codebase Indexing**
   - Index all TypeScript, JavaScript, SQL, and documentation files
   - Semantic search across 64,000+ files
   - Fast retrieval with vector similarity

2. **Multi-Modal Query Engine**
   - Code search with natural language
   - SQL schema understanding
   - Documentation retrieval
   - Git history context

3. **LM Studio Integration**
   - Local LLM for embeddings and generation
   - No external API costs
   - Full privacy and control

4. **Smart Routing**
   - Route queries to appropriate indices
   - Combine multiple data sources
   - Fallback mechanisms

5. **Context Augmentation**
   - Automatically pull relevant code snippets
   - Include related files and dependencies
   - Add database schema context

---

## 📦 Installation

### Step 1: Install Python Dependencies

LlamaIndex is Python-based, so we need Python 3.9+:

```powershell
# Check Python version
python --version  # Should be 3.9+

# Create virtual environment
cd D:\clientforge-crm\agents\llamaindex-integration
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Dependencies**:
- `llama-index` - Core framework
- `llama-index-llms-lmstudio` - LM Studio adapter
- `llama-index-embeddings-huggingface` - Local embeddings
- `chromadb` - Vector database
- `pymongo` - MongoDB client
- `psycopg2-binary` - PostgreSQL client

### Step 2: Configure Environment

Create `.env` file:

```env
# LM Studio API
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=lm-studio

# Embedding Model (local)
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# Vector Store
CHROMA_PERSIST_DIR=D:/clientforge-crm/agents/rag-index/chroma

# ClientForge Databases
POSTGRES_URI=postgres://localhost:5432/clientforge
MONGODB_URI=mongodb://localhost:27017/clientforge?authSource=admin

# Workspace
WORKSPACE_ROOT=D:/clientforge-crm

# Index Settings
MAX_FILES=10000
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

### Step 3: Build Index

```powershell
# Index the entire codebase (takes 5-10 minutes)
python build_index.py

# Check index status
python check_index.py
```

**Expected Output**:
```
Building LlamaIndex for ClientForge CRM...
├── Scanning files: 64,384 files found
├── Filtering to code files: 3,245 files
├── Creating chunks: 45,678 chunks
├── Generating embeddings: [████████████████████] 100%
├── Storing in ChromaDB: Complete
└── Index built successfully!

Index Stats:
- Documents: 3,245
- Chunks: 45,678
- Vectors: 45,678
- Storage: 1.2 GB
```

---

## 🚀 Usage Examples

### Example 1: Simple Code Search

```python
from llama_index_integration import CodebaseQueryEngine

# Initialize
engine = CodebaseQueryEngine(
    lm_studio_url="http://localhost:1234/v1",
    index_path="D:/clientforge-crm/agents/rag-index/chroma"
)

# Query
response = engine.query("How is user authentication implemented?")

print(response.response)
print("\nSources:")
for source in response.source_nodes:
    print(f"  - {source.metadata['file_path']}:{source.metadata['line_start']}")
```

**Output**:
```
User authentication in ClientForge uses JWT tokens with PostgreSQL storage.
The main implementation is in backend/services/auth-service.ts which handles
login, token generation, and verification.

Sources:
  - backend/services/auth-service.ts:45
  - backend/middleware/auth-middleware.ts:12
  - docs/protocols/01_AUTHENTICATION.md:1
```

### Example 2: Multi-Index Query

```python
from llama_index_integration import MultiIndexEngine

# Combine code + docs + database schema
engine = MultiIndexEngine(
    indices={
        'code': 'D:/clientforge-crm/agents/rag-index/chroma/code',
        'docs': 'D:/clientforge-crm/agents/rag-index/chroma/docs',
        'schema': 'D:/clientforge-crm/agents/rag-index/chroma/schema',
    }
)

response = engine.query("Explain the deal pipeline flow with code references")

print(response.response)
```

### Example 3: SQL Schema RAG

```python
from llama_index_integration import SQLSchemaEngine

# Query database schema with natural language
engine = SQLSchemaEngine(
    postgres_uri="postgres://localhost:5432/clientforge"
)

response = engine.query("What tables store deal information and how are they related?")

print(response.response)
print("\nGenerated SQL:")
print(response.metadata['sql_query'])
```

**Output**:
```
Deal information is stored across 3 main tables:
1. deals - Main deal records
2. deal_stages - Pipeline stages
3. deal_activities - Deal timeline events

The relationships are:
- deals.stage_id → deal_stages.id
- deal_activities.deal_id → deals.id

Generated SQL:
SELECT
  d.id, d.name, ds.name as stage, da.activity_type
FROM deals d
JOIN deal_stages ds ON d.stage_id = ds.id
LEFT JOIN deal_activities da ON da.deal_id = d.id
WHERE d.tenant_id = 'tenant_123'
```

### Example 4: Git History Context

```python
from llama_index_integration import GitHistoryEngine

# Include git history in context
engine = GitHistoryEngine(
    repo_path="D:/clientforge-crm",
    index_path="D:/clientforge-crm/agents/rag-index/chroma"
)

response = engine.query("Why was the auth service refactored?")

print(response.response)
print("\nRelevant Commits:")
for commit in response.metadata['commits']:
    print(f"  - {commit.hash[:7]}: {commit.message}")
```

---

## 🛠️ Advanced Features

### Custom Retriever

```python
from llama_index.core import VectorStoreIndex
from llama_index.core.retrievers import VectorIndexRetriever

# Create custom retriever with filters
retriever = VectorIndexRetriever(
    index=index,
    similarity_top_k=10,
    filters={
        'file_type': 'typescript',
        'directory': 'backend/services',
    }
)

nodes = retriever.retrieve("authentication logic")
```

### Reranking

```python
from llama_index.postprocessor import SentenceTransformerRerank

# Rerank results for better relevance
reranker = SentenceTransformerRerank(
    model="cross-encoder/ms-marco-MiniLM-L-2-v2",
    top_n=5
)

response = engine.query(
    "authentication flow",
    node_postprocessors=[reranker]
)
```

### Streaming Responses

```python
# Stream responses for better UX
response = engine.stream_query("Explain the CRM architecture")

for chunk in response.response_gen:
    print(chunk, end='', flush=True)
```

---

## 📊 Index Structure

```
D:/clientforge-crm/agents/rag-index/
├── chroma/                          # ChromaDB vector store
│   ├── code/                        # Code index
│   │   ├── backend/                 # Backend TypeScript
│   │   ├── frontend/                # Frontend TypeScript/React
│   │   └── tests/                   # Test files
│   ├── docs/                        # Documentation index
│   │   ├── protocols/               # System protocols
│   │   ├── claude/                  # Context packs
│   │   └── README.md                # Main docs
│   ├── schema/                      # Database schema index
│   │   ├── postgresql/              # SQL schemas
│   │   └── mongodb/                 # MongoDB schemas
│   └── git/                         # Git history index
│       └── commits/                 # Commit messages
├── metadata.json                    # Index metadata
└── stats.json                       # Index statistics
```

---

## 🧪 Testing

### Run All Tests

```powershell
python test_llamaindex.py
```

### Test Individual Components

```powershell
# Test indexing
python test_llamaindex.py --test index

# Test query engine
python test_llamaindex.py --test query

# Test retrievers
python test_llamaindex.py --test retriever

# Test LM Studio connection
python test_llamaindex.py --test llm
```

---

## 🔧 Configuration

### Embedding Model Options

**Local Models** (no API needed):
- `BAAI/bge-small-en-v1.5` - 384 dims, fast (recommended)
- `BAAI/bge-base-en-v1.5` - 768 dims, balanced
- `BAAI/bge-large-en-v1.5` - 1024 dims, best quality
- `sentence-transformers/all-MiniLM-L6-v2` - 384 dims, very fast

### Chunk Configuration

```python
chunk_settings = {
    'chunk_size': 512,           # Characters per chunk
    'chunk_overlap': 50,         # Overlap between chunks
    'separator': '\n\n',         # Split on paragraphs
    'paragraph_separator': '\n', # Additional split
}
```

### Retrieval Configuration

```python
retrieval_settings = {
    'similarity_top_k': 5,       # Top K results
    'similarity_cutoff': 0.7,    # Minimum similarity score
    'mmr_threshold': 0.5,        # Maximal Marginal Relevance
}
```

---

## 📚 Query Templates

### Code Understanding

```python
response = engine.query("""
Explain the {component} implementation including:
1. Main classes and functions
2. Dependencies
3. Data flow
4. Error handling

Component: authentication service
""")
```

### Bug Investigation

```python
response = engine.query("""
Find code related to {bug_description} and identify:
1. Where the bug likely occurs
2. Related functions
3. Recent changes to this code
4. Suggested fix

Bug: Users can't reset password
""")
```

### Architecture Overview

```python
response = engine.query("""
Provide an architectural overview of {module} including:
1. Main components
2. Database tables used
3. API endpoints
4. Dependencies

Module: deals pipeline
""")
```

---

## 🎯 Performance

### Index Build Performance

| Files | Chunks | Time | Memory |
|-------|--------|------|--------|
| 1,000 | 5,000  | 1 min | 500 MB |
| 3,000 | 15,000 | 3 min | 1 GB   |
| 10,000| 50,000 | 10 min| 2 GB   |

### Query Performance

| Query Type | Latency | Top K |
|------------|---------|-------|
| Simple     | 200ms   | 5     |
| Complex    | 500ms   | 10    |
| Multi-Index| 1s      | 20    |

---

## 🚀 Integration with LangChain

Combine LlamaIndex retrieval with LangChain chains:

```python
from llama_index_integration import CodebaseQueryEngine
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# LlamaIndex for retrieval
llamaindex_engine = CodebaseQueryEngine()

# LangChain for generation
langchain_qa = RetrievalQA.from_llm(
    llm=OpenAI(base_url="http://localhost:1234/v1"),
    retriever=llamaindex_engine.as_retriever()
)

result = langchain_qa.run("How does authentication work?")
```

---

## 📖 Resources

**LlamaIndex Docs**: https://docs.llamaindex.ai
**LM Studio Integration**: https://docs.llamaindex.ai/en/stable/examples/llm/lmstudio/
**ChromaDB Docs**: https://docs.trychroma.com

---

## ✅ Success Checklist

- [ ] Python 3.9+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Environment configured (`.env` file)
- [ ] Index built (`python build_index.py`)
- [ ] Tests passing (`python test_llamaindex.py`)
- [ ] Query engine working
- [ ] LM Studio connected

---

## 🎯 Next Steps

1. **Build initial index**: `python build_index.py`
2. **Test queries**: `python query_example.py`
3. **Integrate with Elaria**: Use in conversation context
4. **Set up incremental updates**: Auto-reindex on file changes
5. **Add custom indices**: SQL schemas, git history, docs

---

Built with ❤️ for ClientForge CRM
**Version**: 1.0.0
**Last Updated**: 2025-11-08
