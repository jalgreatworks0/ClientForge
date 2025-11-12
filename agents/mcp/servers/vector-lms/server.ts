import express from "express";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";

const LM = process.env.LMSTUDIO_URL || "http://127.0.0.1:1234";
const DB_PATH = process.env.VECTOR_DB_PATH || path.join(__dirname, "data", "vector.sqlite");
const EMBED_MODEL = process.env.VECTOR_EMBED_MODEL || "nomic-embed-text-v1";
const DIM = parseInt(process.env.VECTOR_DIM || "768", 10);

let db: Database<sqlite3.Database, sqlite3.Statement>;

async function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY,
      namespace TEXT,
      text TEXT,
      embedding BLOB,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vectors_namespace ON vectors(namespace);
  `);
  console.log(`[Vector-LMS] Database initialized: ${DB_PATH}`);
}

async function embed(texts: string[]): Promise<number[][]> {
  try {
    const body = {
      input: texts,
      model: EMBED_MODEL
    };
    const r = await fetch(`${LM}/api/v0/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Embeddings failed: ${r.status} ${t}`);
    }

    const j: any = await r.json();
    return (j?.data || []).map((d: any) => d.embedding);
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message.includes('ECONNREFUSED')) {
      throw new Error('LM Studio not responding. Please start LM Studio with REST API enabled on port 1234.');
    }
    throw error;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

async function upsert(namespace: string, id: string, text: string) {
  const [vec] = await embed([text]);
  const buf = Buffer.from(Float32Array.from(vec).buffer);
  await db.run(
    `INSERT INTO vectors (id, namespace, text, embedding)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET namespace=excluded.namespace, text=excluded.text, embedding=excluded.embedding`,
    id, namespace, text, buf
  );
}

async function search(namespace: string, query: string, topK = 5) {
  const [qvec] = await embed([query]);
  const rows = await db.all(
    `SELECT id, text, embedding FROM vectors WHERE namespace = ?`,
    namespace
  );

  const scored = rows.map((r: any) => {
    const arr = new Float32Array(Buffer.from(r.embedding));
    return {
      id: r.id,
      text: r.text,
      score: cosine(Array.from(arr), qvec)
    };
  }).sort((a, b) => b.score - a.score).slice(0, topK);

  return scored;
}

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await db.get("SELECT 1 as ok");
    res.json({
      ok: true,
      model: EMBED_MODEL,
      dim: DIM,
      dbPath: DB_PATH
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e)
    });
  }
});

app.post("/upsert", async (req, res) => {
  try {
    const { namespace = "default", id, text } = req.body;
    if (!id || !text) {
      return res.status(400).json({ error: "id and text required" });
    }
    await upsert(namespace, id, text);
    res.json({ ok: true, id, namespace });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { namespace = "default", query, k = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query required" });
    }
    const results = await search(namespace, query, k);
    res.json({ ok: true, results, count: results.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.delete("/namespace/:namespace", async (req, res) => {
  try {
    const { namespace } = req.params;
    const result = await db.run(`DELETE FROM vectors WHERE namespace = ?`, namespace);
    res.json({ ok: true, deleted: result.changes });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 8772;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[MCP Vector-LMS] Server running on port ${PORT}`);
    console.log(`[MCP Vector-LMS] Using model: ${EMBED_MODEL} (dim: ${DIM})`);
    console.log(`[MCP Vector-LMS] Database: ${DB_PATH}`);
    console.log(`[MCP Vector-LMS] LM Studio URL: ${LM}`);
  });
}).catch(err => {
  console.error(`[MCP Vector-LMS] Failed to start:`, err);
  process.exit(1);
});
