const axios = require('axios');
const env = require('../config/env');

const BASE_URLS = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

const http = axios.create({
  baseURL: BASE_URLS[env.mpesa.environment],
  timeout: 30000,
});

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function assertConfigured() {
  if (!env.mpesa.isConfigured) {
    const err = new Error('M-Pesa is not configured on this server');
    err.statusCode = 503;
    throw err;
  }
}

// Daraja expects YYYYMMDDHHmmss in East Africa Time.
function timestamp(date = new Date()) {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    eat.getUTCFullYear() +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

function password(ts) {
  return Buffer.from(`${env.mpesa.shortcode}${env.mpesa.passkey}${ts}`).toString('base64');
}

async function getAccessToken() {
  assertConfigured();
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const auth = Buffer.from(`${env.mpesa.consumerKey}:${env.mpesa.consumerSecret}`).toString('base64');
  const { data } = await http.get('/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` },
  });
  cachedToken = data.access_token;
  // Refresh a minute before Daraja's stated expiry.
  cachedTokenExpiresAt = Date.now() + (Number(data.expires_in || 3599) - 60) * 1000;
  return cachedToken;
}

/**
 * Sends an STK push. Resolves with Daraja's response body
 * ({ MerchantRequestID, CheckoutRequestID, ResponseCode, ... }).
 */
async function stkPush({ phone, amount, accountReference, description }) {
  const token = await getAccessToken();
  const ts = timestamp();
  const body = {
    BusinessShortCode: env.mpesa.shortcode,
    Password: password(ts),
    Timestamp: ts,
    TransactionType: env.mpesa.transactionType,
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: env.mpesa.shortcode,
    PhoneNumber: phone,
    CallBackURL: env.mpesa.callbackUrl,
    AccountReference: String(accountReference).slice(0, 12),
    TransactionDesc: String(description || 'Application fee').slice(0, 13),
  };
  console.log(`[mpesa] STK push → ${phone.replace(/\d{4}$/, '****')} KES ${body.Amount} ref ${body.AccountReference}`);
  const { data } = await http.post('/mpesa/stkpush/v1/processrequest', body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`[mpesa] STK push accepted: ${data.CheckoutRequestID} (ResponseCode ${data.ResponseCode})`);
  return data;
}

/**
 * Queries the status of an STK push. Returns
 * { pending: true } while Safaricom is still processing, otherwise
 * { pending: false, resultCode, resultDesc, raw }.
 */
async function stkQuery(checkoutRequestId) {
  const token = await getAccessToken();
  const ts = timestamp();
  try {
    const { data } = await http.post(
      '/mpesa/stkpushquery/v1/query',
      {
        BusinessShortCode: env.mpesa.shortcode,
        Password: password(ts),
        Timestamp: ts,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (data.ResultCode === undefined || data.ResultCode === null) {
      return { pending: true, raw: data };
    }
    return { pending: false, resultCode: String(data.ResultCode), resultDesc: data.ResultDesc, raw: data };
  } catch (err) {
    // "The transaction is being processed" comes back as an HTTP error.
    const data = err.response?.data;
    if (data?.errorCode === '500.001.1001' || /being processed/i.test(data?.errorMessage || '')) {
      return { pending: true, raw: data };
    }
    throw err;
  }
}

function configStatus() {
  return {
    configured: env.mpesa.isConfigured,
    environment: env.mpesa.environment,
    shortcodeSet: Boolean(env.mpesa.shortcode),
    callbackUrlSet: Boolean(env.mpesa.callbackUrl),
    callbackUrlIsHttps: env.mpesa.callbackUrl.startsWith('https://'),
    transactionType: env.mpesa.transactionType,
  };
}

module.exports = { stkPush, stkQuery, configStatus, timestamp };
