-- =====================================================
-- AI Usage Tracking Tables (SQLite)
-- For local development with SQLite database
-- =====================================================

-- Claude API usage tracking
CREATE TABLE IF NOT EXISTS claude_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_claude_usage_user_id ON claude_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_claude_usage_created_at ON claude_usage(created_at DESC);

-- OpenAI API usage tracking
CREATE TABLE IF NOT EXISTS openai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_openai_usage_user_id ON openai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_openai_usage_created_at ON openai_usage(created_at DESC);

-- Email tracking table
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_id INTEGER,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, sent, failed, opened, clicked
  sent_at DATETIME,
  opened_at DATETIME,
  clicked_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);

-- AI Action Log (track all actions executed by Albedo)
CREATE TABLE IF NOT EXISTS ai_action_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- create_contact, send_email, create_task, etc.
  input_message TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_parameters TEXT, -- JSON
  result TEXT, -- JSON
  success INTEGER NOT NULL DEFAULT 1, -- 0 or 1
  error_message TEXT,
  model TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_action_log_user_id ON ai_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_action_type ON ai_action_log(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_action_log_created_at ON ai_action_log(created_at DESC);

-- AI Conversation History (for context and debugging)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  conversation_id TEXT NOT NULL, -- UUID for grouping related messages
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER,
  cost REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_conversation_id ON ai_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Total AI usage by user (combines Claude + OpenAI)
CREATE VIEW IF NOT EXISTS v_ai_usage_summary AS
SELECT
  u.id as user_id,
  u.username,
  COUNT(DISTINCT c.id) + COUNT(DISTINCT o.id) as total_requests,
  COALESCE(SUM(c.cost), 0) + COALESCE(SUM(o.cost), 0) as total_cost,
  COALESCE(SUM(c.input_tokens + c.output_tokens), 0) + COALESCE(SUM(o.input_tokens + o.output_tokens), 0) as total_tokens
FROM users u
LEFT JOIN claude_usage c ON u.id = c.user_id
LEFT JOIN openai_usage o ON u.id = o.user_id
GROUP BY u.id, u.username;

-- Recent AI actions
CREATE VIEW IF NOT EXISTS v_recent_ai_actions AS
SELECT
  a.id,
  u.username,
  a.action_type,
  a.tool_name,
  a.success,
  a.cost,
  a.latency_ms,
  a.created_at
FROM ai_action_log a
JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 100;

-- Email status summary
CREATE VIEW IF NOT EXISTS v_email_stats AS
SELECT
  user_id,
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened_count,
  SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked_count,
  ROUND(CAST(SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) AS REAL) / NULLIF(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) * 100, 2) as open_rate,
  ROUND(CAST(SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) AS REAL) / NULLIF(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) * 100, 2) as click_rate
FROM emails
GROUP BY user_id;
