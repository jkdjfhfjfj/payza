const express = require('express');
const router = express.Router();
const { payzaRequest, PayzaConfigError } = require('../payzaClient');
const db = require('../db');
const { CURRENCIES } = require('../currencies');

// Wraps an async handler so thrown errors reach Express's error middleware.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------- Reference data ----------
router.get('/currencies', (req, res) => res.json({ success: true, currencies: CURRENCIES }));

// ---------- Settings ----------
router.get('/settings', h(async (req, res) => {
  const s = await db.getSettings();
  res.json({
    success: true,
    settings: {
      public_key: s.public_key || '',
      secret_key_set: Boolean(s.secret_key),
      secret_key_preview: s.secret_key ? `${s.secret_key.slice(0, 10)}••••••••` : '',
      webhook_secret_set: Boolean(s.webhook_secret),
      base_url: s.base_url || 'https://payzaapi.co.ke/api/v1',
      mode: s.public_key ? (s.public_key.startsWith('pk_live_') ? 'live' : 'test') : null,
    },
  });
}));

router.post('/settings', h(async (req, res) => {
  const { public_key, secret_key, webhook_secret, base_url } = req.body;
  const saved = await db.saveSettings({ public_key, secret_key, webhook_secret, base_url });
  res.json({
    success: true,
    settings: {
      public_key: saved.public_key || '',
      secret_key_set: Boolean(saved.secret_key),
      webhook_secret_set: Boolean(saved.webhook_secret),
      base_url: saved.base_url,
    },
  });
}));

// ---------- Dashboard ----------
router.get('/dashboard/stats', h(async (req, res) => {
  const stats = await db.transactionStats();
  res.json({ success: true, stats });
}));

router.get('/transactions', h(async (req, res) => {
  const rows = await db.listTransactions({ limit: Number(req.query.limit) || 50, kind: req.query.kind });
  res.json({ success: true, transactions: rows });
}));

router.get('/webhook-events', h(async (req, res) => {
  const rows = await db.listWebhookEvents({ limit: Number(req.query.limit) || 50 });
  res.json({ success: true, events: rows });
}));

// ---------- Payments ----------
router.post('/pay', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/pay', { data: req.body });
  await db.logTransaction({
    kind: 'pay',
    reference: body?.data?.reference || req.body.reference,
    currency: req.body.currency || 'KES',
    amount: req.body.amount,
    status: body?.data?.status,
    ok: Boolean(body?.success),
    request: req.body,
    response: body,
  });
  res.status(status).json(body);
}));

router.get('/verify/:reference', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', `/verify/${encodeURIComponent(req.params.reference)}`);
  await db.logTransaction({
    kind: 'verify',
    reference: req.params.reference,
    currency: body?.data?.currency,
    amount: body?.data?.amount,
    status: body?.data?.status,
    ok: Boolean(body?.success),
    request: { reference: req.params.reference },
    response: body,
  });
  res.status(status).json(body);
}));

// ---------- Refunds ----------
router.post('/refund', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/refund', { data: req.body });
  await db.logTransaction({
    kind: 'refund',
    reference: body?.refund?.reference || req.body.reference,
    currency: body?.refund?.currency,
    amount: req.body.amount,
    status: body?.refund?.status,
    ok: Boolean(body?.success),
    request: req.body,
    response: body,
  });
  res.status(status).json(body);
}));

router.get('/refunds', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/refunds', { params: req.query });
  res.status(status).json(body);
}));

// ---------- Payouts ----------
router.post('/payout', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/payout', { data: req.body });
  await db.logTransaction({
    kind: 'payout',
    reference: body?.payout?.reference,
    currency: req.body.currency || 'KES',
    amount: req.body.amount,
    status: body?.payout?.status,
    ok: Boolean(body?.success),
    request: req.body,
    response: body,
  });
  res.status(status).json(body);
}));

router.get('/payouts', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/payouts', { params: req.query });
  res.status(status).json(body);
}));

router.get('/payout-methods', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/payout-methods', { params: req.query });
  res.status(status).json(body);
}));

router.get('/banks', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/banks', { params: req.query });
  res.status(status).json(body);
}));

// ---------- Customers ----------
router.post('/customers', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/customers', { data: req.body });
  res.status(status).json(body);
}));

router.get('/customers', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/customers', { params: req.query });
  res.status(status).json(body);
}));

// ---------- Plans ----------
router.post('/plans', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/plans', { data: req.body });
  res.status(status).json(body);
}));

router.get('/plans', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/plans', { params: req.query });
  res.status(status).json(body);
}));

// ---------- Subscriptions ----------
router.post('/subscriptions', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/subscriptions', { data: req.body });
  res.status(status).json(body);
}));

router.get('/subscriptions', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/subscriptions', { params: req.query });
  res.status(status).json(body);
}));

router.post('/subscription-cancel', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/subscription-cancel', { data: req.body });
  res.status(status).json(body);
}));

// ---------- Invoices ----------
router.post('/invoices', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/invoices', { data: req.body });
  await db.logTransaction({
    kind: 'invoice',
    reference: body?.invoice?.invoice_number,
    currency: req.body.currency || 'KES',
    amount: body?.invoice?.total,
    status: body?.invoice?.status,
    ok: Boolean(body?.success),
    request: req.body,
    response: body,
  });
  res.status(status).json(body);
}));

router.get('/invoices', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/invoices', { params: req.query });
  res.status(status).json(body);
}));

router.get('/invoice', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/invoice', { params: req.query });
  res.status(status).json(body);
}));

router.post('/invoice', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/invoice', { data: req.body });
  res.status(status).json(body);
}));

// ---------- POS ----------
router.post('/pos/session-open', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/pos/session-open', { data: req.body });
  res.status(status).json(body);
}));

router.post('/pos/session-close', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/pos/session-close', { data: req.body });
  res.status(status).json(body);
}));

router.post('/pos/sale', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/pos/sale', { data: req.body });
  await db.logTransaction({
    kind: 'pos_sale',
    reference: body?.sale?.reference,
    currency: body?.sale?.currency || 'KES',
    amount: body?.sale?.total,
    status: body?.success ? 'completed' : 'failed',
    ok: Boolean(body?.success),
    request: req.body,
    response: body,
  });
  res.status(status).json(body);
}));

router.get('/pos/sales', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/pos/sales', { params: req.query });
  res.status(status).json(body);
}));

router.post('/pos/refund', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/pos/refund', { data: req.body });
  res.status(status).json(body);
}));

// ---------- Webhook delivery log (Payzaapi's own record) ----------
router.get('/webhooks', h(async (req, res) => {
  const { status, body } = await payzaRequest('get', '/webhooks', { params: req.query });
  res.status(status).json(body);
}));

router.post('/webhooks-resend', h(async (req, res) => {
  const { status, body } = await payzaRequest('post', '/webhooks-resend', { data: req.body });
  res.status(status).json(body);
}));

// ---------- Error handler for this router ----------
router.use((err, req, res, next) => {
  if (err instanceof PayzaConfigError) {
    return res.status(412).json({ success: false, message: err.message });
  }
  console.error('[api error]', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Something went wrong.' });
});

module.exports = router;
