const express = require('express');
const router = express.Router();
const { queries } = require('../database');
const { verificaToken } = require('../middleware/auth');
const {
  inviaEmail,
  templateRicezioneRichiesta,
  templateEsitoPrenotazione,
} = require('../services/email');

// ─────────────────────────────────────────────────────────────
// ROUTE PUBBLICA - Per i clienti
// ─────────────────────────────────────────────────────────────

// POST /api/prenotazioni
router.post('/', async (req, res) => {
  const { nome, email, telefono, num_persone, data, orario, note } = req.body;

  if (!nome || !email || !num_persone || !data || !orario) {
    return res.status(400).json({
      errore: 'Campi obbligatori mancanti.',
      campiObbligatori: ['nome', 'email', 'num_persone', 'data', 'orario']
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ errore: 'Indirizzo email non valido.' });
  }

  const persone = parseInt(num_persone);
  if (isNaN(persone) || persone < 1 || persone > 50) {
    return res.status(400).json({ errore: 'Numero di persone non valido (1-50).' });
  }

  const dataPrenotazione = new Date(data);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  if (dataPrenotazione < oggi) {
    return res.status(400).json({ errore: 'Non è possibile prenotare per una data passata.' });
  }

  try {
    const result = await queries.inserisci({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono ? telefono.trim() : null,
      num_persone: persone,
      data,
      orario,
      note: note ? note.trim() : null,
    });

    const nuovaPrenotazione = await queries.perId(result.lastID);

    try {
      const emailResult = await inviaEmail(
        email,
        templateRicezioneRichiesta(nuovaPrenotazione)
      );

      res.status(201).json({
        messaggio: 'Prenotazione ricevuta con successo! Controlla la tua email.',
        prenotazione: {
          id: nuovaPrenotazione.id,
          nome: nuovaPrenotazione.nome,
          email: nuovaPrenotazione.email,
          data: nuovaPrenotazione.data,
          orario: nuovaPrenotazione.orario,
          num_persone: nuovaPrenotazione.num_persone,
          status: nuovaPrenotazione.status,
        },
        ...(emailResult.previewUrl && { emailPreview: emailResult.previewUrl })
      });
    } catch (emailErr) {
      console.error('⚠️ Errore invio email al cliente:', emailErr.message);
      res.status(201).json({
        messaggio: 'Prenotazione ricevuta. (Nota: invio email non riuscito)',
        prenotazione: { id: nuovaPrenotazione.id, status: nuovaPrenotazione.status }
      });
    }

  } catch (err) {
    console.error('❌ Errore creazione prenotazione:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE PROTETTE - Solo admin
// ─────────────────────────────────────────────────────────────

// GET /api/prenotazioni
router.get('/', verificaToken, async (req, res) => {
  try {
    const prenotazioni = await queries.tutteLePrenotazioni();
    const stats = await queries.stats();
    res.json({ prenotazioni, stats });
  } catch (err) {
    console.error('❌ Errore lettura prenotazioni:', err);
    res.status(500).json({ errore: 'Errore interno del server.' });
  }
});

// GET /api/prenotazioni/:id
router.get('/:id', verificaToken, async (req, res) => {
  const prenotazione = await queries.perId(parseInt(req.params.id));
  if (!prenotazione) {
    return res.status(404).json({ errore: 'Prenotazione non trovata.' });
  }
  res.json(prenotazione);
});

// PATCH /api/prenotazioni/:id/status
router.patch('/:id/status', verificaToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidi = ['confirmed', 'rejected', 'pending'];
  if (!statusValidi.includes(status)) {
    return res.status(400).json({ errore: 'Status non valido.', statusAccettati: statusValidi });
  }

  const prenotazione = await queries.perId(parseInt(id));
  if (!prenotazione) {
    return res.status(404).json({ errore: 'Prenotazione non trovata.' });
  }

  await queries.aggiornaStatus(status, parseInt(id));
  const prenotazioneAggiornata = await queries.perId(parseInt(id));

  if (status === 'confirmed' || status === 'rejected') {
    try {
      const confermata = status === 'confirmed';
      const emailResult = await inviaEmail(
        prenotazione.email,
        templateEsitoPrenotazione(prenotazione, confermata)
      );

      res.json({
        messaggio: `Prenotazione ${confermata ? 'confermata' : 'negata'}. Email inviata al cliente.`,
        prenotazione: prenotazioneAggiornata,
        ...(emailResult.previewUrl && { emailPreview: emailResult.previewUrl })
      });
    } catch (emailErr) {
      console.error('⚠️ Errore invio email esito:', emailErr.message);
      res.json({
        messaggio: 'Status aggiornato. (Nota: invio email non riuscito)',
        prenotazione: prenotazioneAggiornata
      });
    }
  } else {
    res.json({ messaggio: 'Status aggiornato.', prenotazione: prenotazioneAggiornata });
  }
});

module.exports = router;
