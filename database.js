const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prenotazioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT,
      num_persone INTEGER NOT NULL,
      data TEXT NOT NULL,
      orario TEXT NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  console.log('✅ Database inizializzato');
}

async function dbRun(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return { lastID: Number(result.lastInsertRowid), changes: result.rowsAffected };
}

async function dbGet(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] ?? null;
}

async function dbAll(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

const queries = {
  inserisci: (dati) => dbRun(
    `INSERT INTO prenotazioni (nome, email, telefono, num_persone, data, orario, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [dati.nome, dati.email, dati.telefono, dati.num_persone, dati.data, dati.orario, dati.note]
  ),
  tutteLePrenotazioni: () => dbAll(
    `SELECT * FROM prenotazioni ORDER BY data ASC, orario ASC`
  ),
  perId: (id) => dbGet(
    `SELECT * FROM prenotazioni WHERE id = ?`, [id]
  ),
  aggiornaStatus: (status, id) => dbRun(
    `UPDATE prenotazioni SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    [status, id]
  ),
  stats: () => dbGet(
    `SELECT
      COUNT(*) as totale,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as in_attesa,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confermate,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as negate
    FROM prenotazioni`
  )
};

module.exports = { db, queries, initDatabase };