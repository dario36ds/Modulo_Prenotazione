const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login
// Effettua il login admin e restituisce un JWT
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ errore: 'Username e password sono obbligatori.' });
  }

  // Confronto con le credenziali nel .env
  const usernameCorretto = username === process.env.ADMIN_USERNAME;
  const passwordCorretta = password === process.env.ADMIN_PASSWORD;

  if (!usernameCorretto || !passwordCorretta) {
    return res.status(401).json({ errore: 'Credenziali non valide.' });
  }

  // Genera il token JWT (scade in 8 ore)
  const token = jwt.sign(
    { username, ruolo: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    messaggio: 'Login effettuato con successo.',
    token,
    scadeIn: '8 ore'
  });
});

// POST /api/auth/verifica
// Verifica se un token è ancora valido (usato dal frontend per check iniziale)
router.post('/verifica', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valido: false });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valido: true });
  } catch {
    res.status(403).json({ valido: false });
  }
});

module.exports = router;
