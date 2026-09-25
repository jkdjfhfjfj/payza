const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

// Payzaapi requires the RAW bytes of the body for signature verification,
// so this route parses its own body instead of using the app-wide JSON parser.
router.post('/payza', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from('');
  const signature = req.get('X-Payza-Signature') || '';

  let payload = {};
  try {
    payload = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch (e) {
    payload = { parse_error: true, raw: rawBody.toString('utf8').slice(0, 500) };
  }

  let verified = false;
  try {
    const settings = await db.getSettings();
    if (settings.webhook_secret && signature) {
      const expected = crypto.createHmac('sha256', settings.webhook_secret).update(rawBody).digest('hex');
      verified =
        expected.length === signature.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
  } catch (e) {
    verified = false;
  }

  try {
    await db.logWebhookEvent({
      event: payload.event,
      reference: payload.reference,
      payload,
      signature,
      verified,
    });
  } catch (e) {
    console.error('[webhook] failed to store event', e);
  }

  // Reply fast so Payzaapi doesn't treat this as a failed delivery and retry.
  res.status(200).send('OK');
});

module.exports = router;
