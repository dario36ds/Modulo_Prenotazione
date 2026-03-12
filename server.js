require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initEmailTransporter } = require('./services/email');
const { db, queries, initDatabase } = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;



// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*', // In produzione: restringi al tuo dominio es. 'https://pizzeriadamario.it'
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve i file statici del frontend dalla cartella /frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ─────────────────────────────────────────────────────────────
// Routes API
// ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/prenotazioni', require('./routes/prenotazioni'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    pizzeria: process.env.PIZZERIA_NAME,
    timestamp: new Date().toISOString()
  });
});

// Fallback: tutte le altre route servono il frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─────────────────────────────────────────────────────────────
// Avvio server
// ─────────────────────────────────────────────────────────────

const cron = require('node-cron');

async function pulisciPrenotazioniScadute() {
  try {
    const oggi = new Date().toISOString().split('T')[0];
    const result = await db.query(
      `DELETE FROM prenotazioni WHERE data < $1`,
      [oggi]
    );
    console.log(`🧹 Eliminate ${result.rowCount} prenotazioni scadute`);
  } catch (err) {
    console.error('⚠️ Errore pulizia prenotazioni:', err);
  }
}


async function avvia() {
  try {

    await initEmailTransporter();

    // Pulisci prenotazioni scadute OGNI GIORNO alle 00:00
    cron.schedule('0 0 * * *', pulisciPrenotazioniScadute);
    console.log('⏰ Pulizia automatica programmata (ogni notte alle 00:00)');


    app.listen(PORT, () => {
      console.log('');
      console.log('🍕 ═══════════════════════════════════════════════');
      console.log(`🍕  ${process.env.PIZZERIA_NAME || 'Pizzeria'} - Server avviato`);
      console.log('🍕 ═══════════════════════════════════════════════');
      console.log(`🌐  Frontend:   http://localhost:${PORT}`);
      console.log(`🔧  Admin:      http://localhost:${PORT}/admin.html`);
      console.log(`📡  API:        http://localhost:${PORT}/api`);
      console.log(`👤  Login:      admin / pizza123`);
      console.log('🍕 ═══════════════════════════════════════════════');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Errore avvio server:', err);
    process.exit(1);
  }
}

avvia();
