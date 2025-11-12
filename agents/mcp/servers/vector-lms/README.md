# Vector-LMS MCP Server

Vector memory server using LM Studio embeddings for offline semantic search.

## Features
- Local embeddings via LM Studio REST API
- SQLite vector storage (portable, versioned)
- Cosine similarity search
- Namespace isolation

## Endpoints
- `GET /health` - Health check
- `POST /upsert` - Add/update vector
  ```json
  { "namespace": "docs", "id": "doc1", "text": "..." }
  ```
- `POST /search` - Semantic search
  ```json
  { "namespace": "docs", "query": "...", "k": 5 }
  ```
- `DELETE /namespace/:namespace` - Clear namespace

## Configuration
Set in `.env`:
- `LMSTUDIO_URL` - LM Studio REST endpoint (default: http://127.0.0.1:1234)
- `VECTOR_DB_PATH` - SQLite database path
- `VECTOR_EMBED_MODEL` - Embedding model name
- `VECTOR_DIM` - Embedding dimensions (e.g., 768)

## Running
```bash
npm start
# Or from project root:
npm run mcp:vector
```
