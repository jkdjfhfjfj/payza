require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Mount the raw-body webhook receiver BEFORE the JSON body parser,
// since signature verification needs the exact original bytes.
app.use('/webhooks', require('./routes/webhookReceiver'));

app.use(express.json({ limit: '2mb' }));

// Optional shared-password gate for the console itself (not the Payzaapi keys).
app.post('/api/unlock', (req, res) => {
  const required = process.env.CONSOLE_PASSWORD;
  res.json({ success: !required || req.body.password === required });
});
app.get('/api/health', (req, res) => res.json({ success: true, locked: Boolean(process.env.CONSOLE_PASSWORD) }));

if (process.env.CONSOLE_PASSWORD) {
  app.use('/api', (req, res, next) => {
    if (req.path === '/unlock' || req.path === '/health') return next();
    const provided = req.get('X-Console-Password');
    if (provided === process.env.CONSOLE_PASSWORD) return next();
    return res.status(401).json({ success: false, message: 'Console is locked.' });
  });
}

app.use('/api', require('./routes/api'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Payza console listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
