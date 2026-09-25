const axios = require('axios');
const { getSettings } = require('./db');

class PayzaConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PayzaConfigError';
    this.status = 412;
  }
}

async function payzaRequest(method, path, { params, data } = {}) {
  const settings = await getSettings();

  if (!settings.public_key || !settings.secret_key) {
    throw new PayzaConfigError(
      'Add your Payzaapi public and secret key in Settings before calling the API.'
    );
  }

  const baseURL = settings.base_url || 'https://payzaapi.co.ke/api/v1';

  try {
    const res = await axios({
      method,
      url: path,
      baseURL,
      params,
      data,
      headers: {
        'X-Public-Key': settings.public_key,
        'X-Secret-Key': settings.secret_key,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
      validateStatus: () => true, // we want to inspect Payza's error bodies ourselves
    });

    return { status: res.status, body: res.data };
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      const e = new Error('Payzaapi did not respond in time. Try again.');
      e.status = 504;
      throw e;
    }
    const e = new Error(err.message || 'Could not reach Payzaapi.');
    e.status = 502;
    throw e;
  }
}

module.exports = { payzaRequest, PayzaConfigError };
