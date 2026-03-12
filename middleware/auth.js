const jwt = require('jsonwebtoken');

function verificaToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ errore: 'Accesso negato. Token non fornito.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(403).json({ errore: 'Token non valido o scaduto. Effettua nuovamente il login.' });
  }
}

module.exports = { verificaToken };
