# Chroma Vector Database Integration

**Updated**: 2025-11-07
**Status**: ✅ Production Ready
**Version**: 1.0.0

---

## Overview

Elaria Command Center now uses **ChromaDB** for persistent vector storage, replacing the previous in-memory Map-based approach. This ensures embeddings persist across server restarts and provides professional-grade vector search capabilities.

---

## Key Improvements

### Before (In-Memory)
```javascript
this.vectorStore = new Map(); // Lost on restart
```

### After (Persistent Chroma)
```javascript
this.chromaClient = new ChromaClient({ path: './chroma_data' });
this.collection = await this.chromaClient.getOrCreateCollection({
  name: 'elaria_embeddings'
});
```

### Benefits
- ✅ **Persistent Storage** - Embeddings survive server restarts
- ✅ **Optimized Search** - Uses HNSW algorithm for fast nearest neighbor search
- ✅ **Scalable** - Handles millions of vectors efficiently
- ✅ **Professional** - Industry-standard vector database
- ✅ **Metadata Support** - Rich filtering and search capabilities
- ✅ **Cosine Similarity** - Built-in similarity metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Elaria Command Center                  │
│                                                     │
│  ┌─────────────┐      ┌──────────────┐            │
│  │ LM Studio   │─────▶│ Embeddings   │            │
│  │ SDK         │      │ Client       │            │
│  └─────────────┘      └──────┬───────┘            │
│                              │                     │
│                              ▼                     │
│                       ┌──────────────┐            │
│                       │  ChromaDB    │            │
│                       │  Collection  │            │
│                       └──────┬───────┘            │
│                              │                     │
│                              ▼                     │
│                       ┌──────────────┐            │
│                       │ Persistent   │            │
│                       │ Storage      │            │
│                       │ (chroma_data)│            │
│                       └──────────────┘            │
└─────────────────────────────────────────────────────┘
```

---

## Installation

Chroma is already installed as a dependency:

```bash
cd D:\clientforge-crm\agents\elaria_command_center
npm install chromadb --save
```

**Package version**: `chromadb@latest` (automatically compatible with Node.js 18+)

---

## Usage

### 1. Basic Initialization

```javascript
import { EmbeddingsClient } from './src/embeddings-rag.js';

const client = new EmbeddingsClient(
  'ws://localhost:1234',      // LM Studio URL
  './chroma_data'             // Persistent storage path
);

// Initialize Chroma collection
await client.initialize('my_embeddings');
```

### 2. Store Documents

```javascript
// Store a single document
await client.storeDocument(
  'doc1',
  'ClientForge CRM is a customer relationship management system.',
  { type: 'product', category: 'overview' }
);

// Documents are now persisted to disk at ./chroma_data
```

### 3. Semantic Search

```javascript
// Search across all stored documents
const results = await client.searchDocuments(
  'How do I manage customers?',
  5  // Top 5 results
);

console.log(results.results);
// [
//   { id: 'doc1', text: '...', similarity: 0.92, metadata: {...} },
//   { id: 'doc3', text: '...', similarity: 0.87, metadata: {...} },
//   ...
// ]
```

### 4. Get Stats

```javascript
const stats = await client.getStats();
console.log(stats);
// {
//   documentsStored: 42,
//   embeddingModel: 'text-embedding-nomic-embed-text-v1.5',
//   chromaPath: './chroma_data',
//   collectionName: 'elaria_embeddings',
//   persistent: true
// }
```

### 5. Clear Store

```javascript
// Delete entire collection (use with caution!)
await client.clearStore();
```

---

## CRM Knowledge Base Integration

The `CRMKnowledgeBase` class now uses Chroma for persistent knowledge:

```javascript
import { CRMKnowledgeBase } from './src/embeddings-rag.js';

const kb = new CRMKnowledgeBase('./crm_chroma_data');

// Initialize with context pack (persists to Chroma)
await kb.initialize();

// Query the knowledge base
const answer = await kb.queryPolicy('What is the refund policy?');
console.log(answer.answer);

// Knowledge base persists across restarts!
```

### Context Pack Loading

On first initialization, Elaria loads documents from:
```
D:\clientforge-crm\05_SHARED_AI\context_pack\
```

All documents are embedded and stored in Chroma. Subsequent restarts skip re-embedding and use the persisted vectors.

---

## Testing

### Run the persistence test:

```bash
cd D:\clientforge-crm\agents\elaria_command_center
node test-chroma-persistence.js
```

**Test validates**:
- ✅ Chroma initialization
- ✅ Document storage
- ✅ Semantic search
- ✅ Data persistence across client restarts
- ✅ Collection cleanup

**Expected output**:
```
╔════════════════════════════════════════╗
║  Chroma Persistence Test              ║
╚════════════════════════════════════════╝

Phase 1: Initializing Chroma and adding test documents...
  ✓ Stored: doc1
  ✓ Stored: doc2
  ✓ Stored: doc3
  ✓ Stored: doc4
  ✓ Stored: doc5

Stats after insertion:
  Documents: 5
  Collection: test_embeddings
  Persistent: true
  Path: ./test_chroma_data

Phase 2: Testing semantic search...
✓ Query: "How do I manage customer relationships?"
  1. [doc3] Similarity: 0.876
     Contact management allows you to organize and segment your customer databa...

Phase 3: Testing persistence (new client instance)...
✓ PERSISTENCE TEST PASSED!
  Documents survived client restart

✓ Search works with persisted data!
  Top result: doc4

╔════════════════════════════════════════╗
║  Test Summary                          ║
╚════════════════════════════════════════╝
✓ Chroma initialization works
✓ Document storage works
✓ Semantic search works
✓ Data persists across client restarts
✓ Collection cleanup works
```

---

## File Structure

```
elaria_command_center/
├── src/
│   └── embeddings-rag.js         # Updated with Chroma integration
├── chroma_data/                  # Persistent vector storage (gitignored)
│   └── [collection files]
├── test-chroma-persistence.js    # Test script
├── .gitignore                    # Updated to ignore chroma_data/
├── package.json                  # chromadb added to dependencies
└── CHROMA_INTEGRATION.md         # This file
```

---

## Configuration

### Default Paths

- **Chroma Data**: `./chroma_data` (relative to elaria_command_center/)
- **CRM Knowledge Base**: `./crm_chroma_data`
- **Test Data**: `./test_chroma_data`

### Custom Paths

```javascript
// Use absolute path for shared storage
const client = new EmbeddingsClient(
  'ws://localhost:1234',
  'D:/clientforge-crm/shared_vectors'
);
```

### Collection Names

- **Default**: `elaria_embeddings`
- **CRM KB**: `crm_knowledge_base`
- **Test**: `test_embeddings`

---

## Performance Characteristics

### Storage
- **Format**: Optimized binary format with HNSW index
- **Size**: ~1.5KB per 768-dimensional vector + document text
- **Example**: 1000 documents ≈ 2-3 MB

### Search Speed
- **Small collections** (<10K docs): <10ms
- **Medium collections** (10K-100K docs): 10-50ms
- **Large collections** (100K-1M docs): 50-200ms

### Embedding Generation
- **Model**: nomic-embed-text-v1.5 (768 dimensions)
- **Speed**: ~50-100ms per document (via LM Studio)
- **Batch**: Process multiple documents in parallel

---

## Troubleshooting

### Issue: "Collection not found"

**Cause**: Chroma data directory doesn't exist or was deleted

**Fix**:
```javascript
// Re-initialize will create new collection
await client.initialize('elaria_embeddings');
```

### Issue: "LM Studio connection failed"

**Cause**: LM Studio not running or no embedding model loaded

**Fix**:
1. Start LM Studio
2. Load an embedding model (nomic-embed-text-v1.5 recommended)
3. Ensure it's listening on port 1234

### Issue: "Permission denied" when accessing chroma_data

**Cause**: File system permissions

**Fix**:
```bash
# Windows
icacls chroma_data /grant Users:F

# Linux/Mac
chmod -R 755 chroma_data
```

### Issue: "Cannot find module 'chromadb'"

**Cause**: chromadb not installed

**Fix**:
```bash
npm install chromadb --save
```

---

## Migration from In-Memory

### Old Code (In-Memory)
```javascript
const client = new EmbeddingsClient();
await client.storeDocument('doc1', 'text');
// Data lost on restart
```

### New Code (Persistent)
```javascript
const client = new EmbeddingsClient('ws://localhost:1234', './chroma_data');
await client.initialize();
await client.storeDocument('doc1', 'text');
// Data persists on disk
```

### Migration Steps
1. ✅ Install chromadb: `npm install chromadb`
2. ✅ Update imports (already done)
3. ✅ Add `.initialize()` calls (already done)
4. ✅ Test with `node test-chroma-persistence.js`
5. ✅ Update .gitignore to exclude chroma_data/

**No data migration needed** - Old in-memory data was transient

---

## Best Practices

### 1. Initialize Once
```javascript
// ✅ Good - Initialize once at startup
const client = new EmbeddingsClient();
await client.initialize('my_collection');

// ❌ Bad - Don't initialize on every operation
async function search(query) {
  const client = new EmbeddingsClient();
  await client.initialize(); // Wasteful!
  return client.searchDocuments(query);
}
```

### 2. Use Meaningful Collection Names
```javascript
// ✅ Good - Descriptive names
await client.initialize('customer_support_kb');
await client.initialize('product_documentation');

// ❌ Bad - Generic names
await client.initialize('data');
await client.initialize('stuff');
```

### 3. Add Rich Metadata
```javascript
// ✅ Good - Detailed metadata for filtering
await client.storeDocument('doc1', text, {
  type: 'support_ticket',
  category: 'billing',
  priority: 'high',
  date: '2025-11-07',
  author: 'john@example.com'
});

// ❌ Bad - No metadata
await client.storeDocument('doc1', text);
```

### 4. Backup Chroma Data
```bash
# Backup before major operations
robocopy D:\clientforge-crm\agents\elaria_command_center\chroma_data D:\backups\chroma_2025-11-07 /MIR
```

---

## Advanced Features

### 1. Multiple Collections

```javascript
// Different collections for different purposes
const supportKB = new EmbeddingsClient('ws://localhost:1234', './chroma_data');
await supportKB.initialize('support_tickets');

const productKB = new EmbeddingsClient('ws://localhost:1234', './chroma_data');
await productKB.initialize('product_docs');
```

### 2. Metadata Filtering (Future)

```javascript
// TODO: Add filtering support
const results = await client.searchDocuments(
  'billing issues',
  5,
  { type: 'support_ticket', priority: 'high' }
);
```

### 3. Hybrid Search (Future)

```javascript
// TODO: Combine semantic + keyword search
const results = await client.hybridSearch(
  'customer refund policy',
  { keywords: ['refund', 'policy'], semanticWeight: 0.7 }
);
```

---

## API Reference

### `EmbeddingsClient`

#### Constructor
```javascript
new EmbeddingsClient(baseUrl, chromaPath)
```
- `baseUrl` (string): LM Studio WebSocket URL (default: `'ws://localhost:1234'`)
- `chromaPath` (string): Path to Chroma data directory (default: `'./chroma_data'`)

#### Methods

**`async initialize(collectionName)`**
- Initializes Chroma client and collection
- Creates collection if it doesn't exist
- Returns: `{ success, collectionName, path }` or `{ success: false, error }`

**`async generateEmbedding(text, options)`**
- Generates embedding vector for text
- Returns: `{ success, embedding, dimensions, text }` or `{ success: false, error }`

**`async storeDocument(id, text, metadata)`**
- Stores document with embedding in Chroma
- Returns: `{ success, id, message }` or `{ success: false, error }`

**`async searchDocuments(query, topK)`**
- Searches for similar documents
- Returns: `{ success, query, results, totalSearched }` or `{ success: false, error }`

**`async clearStore()`**
- Deletes entire collection
- Returns: `{ success, message }` or `{ success: false, error }`

**`async getStats()`**
- Gets collection statistics
- Returns: `{ documentsStored, embeddingModel, chromaPath, collectionName, persistent }`

---

## Security

### Protected Paths
```gitignore
# .gitignore
chroma_data/
*.chroma
```

### Sensitive Data
- ⚠️ **Never commit chroma_data/** to git
- ⚠️ **Backup chroma_data/** before major changes
- ⚠️ **Encrypt chroma_data/** for production deployments

### Access Control
- Chroma data is stored locally (no cloud exposure)
- Use file system permissions to control access
- Consider encryption at rest for sensitive embeddings

---

## Next Steps

1. ✅ **Test Integration**: Run `node test-chroma-persistence.js`
2. ✅ **Load Knowledge Base**: Run `node src/embeddings-rag.js init`
3. ⏳ **Query Knowledge**: Run `node src/embeddings-rag.js query "your question"`
4. ⏳ **Integrate with Elaria**: Use in production workflows
5. ⏳ **Monitor Performance**: Track search latency and storage size

---

## Support

**Issues**: Report to ClientForge development team
**Documentation**: See [README.md](README.md) for Elaria overview
**Chroma Docs**: https://docs.trychroma.com/
**LM Studio Docs**: https://lmstudio.ai/docs

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

**Status**: Production Ready - Persistent Vector Storage Enabled
