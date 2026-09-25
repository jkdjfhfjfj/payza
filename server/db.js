const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set. Set it to your Neon connection string.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      public_key TEXT,
      secret_key TEXT,
      webhook_secret TEXT,
      base_url TEXT DEFAULT 'https://payzaapi.co.ke/api/v1',
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    INSERT INTO settings (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL,
      reference TEXT,
      currency TEXT,
      amount NUMERIC,
      status TEXT,
      ok BOOLEAN,
      request JSONB,
      response JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      event TEXT,
      reference TEXT,
      payload JSONB,
      signature TEXT,
      verified BOOLEAN,
      received_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions (created_at DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wh_received ON webhook_events (received_at DESC);`);
}

async function getSettings() {
  const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
  return rows[0] || {};
}

async function saveSettings({ public_key, secret_key, webhook_secret, base_url }) {
  const { rows } = await pool.query(
    `UPDATE settings SET
       public_key = COALESCE($1, public_key),
       secret_key = COALESCE($2, secret_key),
       webhook_secret = COALESCE($3, webhook_secret),
       base_url = COALESCE($4, base_url),
       updated_at = now()
     WHERE id = 1
     RETURNING *`,
    [public_key, secret_key, webhook_secret, base_url]
  );
  return rows[0];
}

async function logTransaction({ kind, reference, currency, amount, status, ok, request, response }) {
  await pool.query(
    `INSERT INTO transactions (kind, reference, currency, amount, status, ok, request, response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [kind, reference || null, currency || null, amount || null, status || null, ok, request || null, response || null]
  );
}

async function listTransactions({ limit = 50, kind } = {}) {
  if (kind) {
    const { rows } = await pool.query(
      'SELECT * FROM transactions WHERE kind = $1 ORDER BY created_at DESC LIMIT $2',
      [kind, limit]
    );
    return rows;
  }
  const { rows } = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}

async function transactionStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ok)::int AS successful,
      COUNT(*) FILTER (WHERE NOT ok)::int AS failed,
      COALESCE(SUM(amount) FILTER (WHERE ok AND kind = 'pay'), 0)::float AS total_paid_in
    FROM transactions
  `);
  const { rows: byCurrency } = await pool.query(`
    SELECT currency, COUNT(*)::int AS count
    FROM transactions
    WHERE kind = 'pay' AND currency IS NOT NULL
    GROUP BY currency
    ORDER BY count DESC
  `);
  return { ...rows[0], byCurrency };
}

async function logWebhookEvent({ event, reference, payload, signature, verified }) {
  await pool.query(
    `INSERT INTO webhook_events (event, reference, payload, signature, verified)
     VALUES ($1,$2,$3,$4,$5)`,
    [event || null, reference || null, payload || null, signature || null, verified]
  );
}

async function listWebhookEvents({ limit = 50 } = {}) {
  const { rows } = await pool.query(
    'SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}

module.exports = {
  pool,
  init,
  getSettings,
  saveSettings,
  logTransaction,
  listTransactions,
  transactionStats,
  logWebhookEvent,
  listWebhookEvents,
};
