const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initEmailTransporter } = require('./services/email');
const { initDatabase } = require('./database');

const DB_PATH = path.join(__dirname, 'pizzeria.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Errore apertura database:', err);
    process.exit(1);
  }
});


// Wrapper promise per usare db in modo asincrono
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
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

module.exports = { db, queries };
