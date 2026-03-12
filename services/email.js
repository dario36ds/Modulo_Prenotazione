const nodemailer = require('nodemailer');

let transporter = null;
let testAccountInfo = null;

// Inizializza il transporter email
// In locale usa Ethereal (email fake visibili su sito web)
// In produzione usa le credenziali reali dal .env
async function initEmailTransporter() {
  if (transporter) return transporter;

  const useRealEmail = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (useRealEmail) {
    // ✅ PRODUZIONE: usa credenziali reali (Gmail, SendGrid, ecc.)
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('📧 Email: modalità PRODUZIONE configurata');
  } else {
    // 🧪 LOCALE: crea account Ethereal temporaneo
    // Le email vengono "inviate" ma puoi vederle su https://ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    testAccountInfo = testAccount;

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('');
    console.log('📧 Email: modalità TEST (Ethereal) attiva');
    console.log('   Le email non vengono inviate davvero.');
    console.log(`   Username Ethereal: ${testAccount.user}`);
    console.log(`   Password Ethereal: ${testAccount.pass}`);
    console.log('   Vai su https://ethereal.email/login per vedere le email inviate');
    console.log('');
  }

  return transporter;
}

// Template email: conferma ricezione richiesta (inviata subito al cliente)
function templateRicezioneRichiesta(prenotazione) {
  const pizzeriaName = process.env.PIZZERIA_NAME || 'La nostra Pizzeria';

  return {
    subject: `🍕 Richiesta ricevuta - ${pizzeriaName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Georgia, serif; background: #fdf6ec; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: #c0392b; padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px; }
          .body p { color: #444; line-height: 1.7; margin: 0 0 16px; }
          .riepilogo { background: #fdf6ec; border-left: 4px solid #c0392b; border-radius: 0 8px 8px 0; padding: 20px 24px; margin: 24px 0; }
          .riepilogo h3 { color: #c0392b; margin: 0 0 14px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          .riepilogo table { width: 100%; border-collapse: collapse; }
          .riepilogo td { padding: 6px 0; color: #444; font-size: 15px; }
          .riepilogo td:first-child { font-weight: bold; color: #222; width: 140px; }
          .footer { background: #f8f8f8; padding: 20px 32px; text-align: center; border-top: 1px solid #eee; }
          .footer p { color: #999; font-size: 12px; margin: 0; }
          .badge { display: inline-block; background: #fff3cd; color: #856404; border: 1px solid #ffc107; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: bold; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍕 ${pizzeriaName}</h1>
            <p>Sistema di Prenotazione Tavoli</p>
          </div>
          <div class="body">
            <p>Ciao <strong>${prenotazione.nome}</strong>,</p>
            <p>Abbiamo ricevuto la tua richiesta di prenotazione. La stiamo elaborando e ti risponderemo al più presto con una conferma.</p>
            <div class="badge">⏳ In attesa di conferma</div>
            <div class="riepilogo">
              <h3>Riepilogo richiesta</h3>
              <table>
                <tr><td>Nome:</td><td>${prenotazione.nome}</td></tr>
                <tr><td>Data:</td><td>${formatData(prenotazione.data)}</td></tr>
                <tr><td>Orario:</td><td>${prenotazione.orario}</td></tr>
                <tr><td>Numero persone:</td><td>${prenotazione.num_persone}</td></tr>
                ${prenotazione.note ? `<tr><td>Note:</td><td>${prenotazione.note}</td></tr>` : ''}
              </table>
            </div>
            <p>Riceverai una email di conferma o disdetta non appena il nostro staff avrà verificato la disponibilità.</p>
            <p>Per qualsiasi necessità, contattaci a <a href="mailto:${process.env.PIZZERIA_EMAIL}" style="color:#c0392b;">${process.env.PIZZERIA_EMAIL}</a>.</p>
            <p style="margin-top:24px;">A presto,<br><strong>Il team di ${pizzeriaName}</strong> 🍕</p>
          </div>
          <div class="footer">
            <p>Questa è un'email automatica, non rispondere direttamente a questo indirizzo.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

// Template email: esito prenotazione (confermata o negata)
function templateEsitoPrenotazione(prenotazione, confermata) {
  const pizzeriaName = process.env.PIZZERIA_NAME || 'La nostra Pizzeria';

  const colore = confermata ? '#27ae60' : '#c0392b';
  const emoji = confermata ? '✅' : '❌';
  const titolo = confermata ? 'Prenotazione Confermata!' : 'Prenotazione Non Disponibile';
  const messaggio = confermata
    ? `Siamo lieti di confermare la tua prenotazione. Ti aspettiamo!`
    : `Ci dispiace, purtroppo non siamo riusciti ad accettare la tua richiesta per la data e l'orario scelti. Ti invitiamo a contattarci per trovare un'alternativa.`;
  const badge = confermata ? '✅ Confermata' : '❌ Non disponibile';
  const badgeColor = confermata ? '#d4edda' : '#f8d7da';
  const badgeTextColor = confermata ? '#155724' : '#721c24';
  const badgeBorder = confermata ? '#c3e6cb' : '#f5c6cb';

  return {
    subject: `${emoji} ${titolo} - ${pizzeriaName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Georgia, serif; background: #fdf6ec; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: ${colore}; padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; letter-spacing: 1px; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
          .body { padding: 32px; }
          .body p { color: #444; line-height: 1.7; margin: 0 0 16px; }
          .riepilogo { background: #fdf6ec; border-left: 4px solid ${colore}; border-radius: 0 8px 8px 0; padding: 20px 24px; margin: 24px 0; }
          .riepilogo h3 { color: ${colore}; margin: 0 0 14px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          .riepilogo table { width: 100%; border-collapse: collapse; }
          .riepilogo td { padding: 6px 0; color: #444; font-size: 15px; }
          .riepilogo td:first-child { font-weight: bold; color: #222; width: 140px; }
          .footer { background: #f8f8f8; padding: 20px 32px; text-align: center; border-top: 1px solid #eee; }
          .footer p { color: #999; font-size: 12px; margin: 0; }
          .badge { display: inline-block; background: ${badgeColor}; color: ${badgeTextColor}; border: 1px solid ${badgeBorder}; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: bold; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍕 ${pizzeriaName}</h1>
            <p>${emoji} ${titolo}</p>
          </div>
          <div class="body">
            <p>Ciao <strong>${prenotazione.nome}</strong>,</p>
            <p>${messaggio}</p>
            <div class="badge">${badge}</div>
            <div class="riepilogo">
              <h3>Dettagli prenotazione</h3>
              <table>
                <tr><td>Nome:</td><td>${prenotazione.nome}</td></tr>
                <tr><td>Data:</td><td>${formatData(prenotazione.data)}</td></tr>
                <tr><td>Orario:</td><td>${prenotazione.orario}</td></tr>
                <tr><td>Numero persone:</td><td>${prenotazione.num_persone}</td></tr>
                ${prenotazione.note ? `<tr><td>Note:</td><td>${prenotazione.note}</td></tr>` : ''}
              </table>
            </div>
            ${confermata
              ? `<p>📍 Ricordati di portare questa email come riferimento. Non vediamo l'ora di vederti!</p>`
              : `<p>Puoi contattarci direttamente a <a href="mailto:${process.env.PIZZERIA_EMAIL}" style="color:#c0392b;">${process.env.PIZZERIA_EMAIL}</a> per verificare altre disponibilità.</p>`
            }
            <p style="margin-top:24px;">Cordiali saluti,<br><strong>Il team di ${pizzeriaName}</strong> 🍕</p>
          </div>
          <div class="footer">
            <p>Questa è un'email automatica, non rispondere direttamente a questo indirizzo.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

// Formatta la data da YYYY-MM-DD a DD/MM/YYYY
function formatData(dataStr) {
  const [anno, mese, giorno] = dataStr.split('-');
  return `${giorno}/${mese}/${anno}`;
}

// Funzione principale per inviare email
async function inviaEmail(destinatario, template) {
  const transport = await initEmailTransporter();

  const mailOptions = {
    from: `"${process.env.PIZZERIA_NAME || 'Pizzeria'}" <${process.env.PIZZERIA_EMAIL || 'noreply@pizzeria.it'}>`,
    to: destinatario,
    subject: template.subject,
    html: template.html,
  };

  const info = await transport.sendMail(mailOptions);

  // Se siamo in modalità test, mostra il link per vedere l'email
  if (testAccountInfo) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📧 Email inviata (TEST) → ${previewUrl}`);
    return { success: true, previewUrl };
  }

  console.log(`📧 Email inviata a: ${destinatario}`);
  return { success: true };
}

module.exports = {
  initEmailTransporter,
  inviaEmail,
  templateRicezioneRichiesta,
  templateEsitoPrenotazione,
};
