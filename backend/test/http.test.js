// HTTP smoke tests for routes that respond before touching the database.
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server;
let base;

test.before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => server.close());

test('GET /health', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.status, 'ok');
});

test('admin routes require authentication', async () => {
  const res = await fetch(`${base}/admin/applications`);
  assert.equal(res.status, 401);
});

test('invalid bearer token is rejected', async () => {
  const res = await fetch(`${base}/admin/dashboard/stats`, { headers: { Authorization: 'Bearer nope' } });
  assert.equal(res.status, 401);
});

test('draft routes require a valid id and token', async () => {
  const res = await fetch(`${base}/applications/not-an-id`);
  assert.equal(res.status, 404);
});

test('login validates input', async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bad', password: '' }),
  });
  assert.equal(res.status, 422);
});

test('payment initiation validates input', async () => {
  const res = await fetch(`${base}/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId: 'x', phone: '07' }),
  });
  assert.equal(res.status, 422);
});

test('M-Pesa callback without a CheckoutRequestID is acknowledged', async () => {
  const res = await fetch(`${base}/payments/mpesa/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Body: {} }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ResultCode, 0);
});

test('applicant uploads are not publicly served', async () => {
  const res = await fetch(`${base.replace('/api', '')}/uploads/anything.jpg`);
  assert.equal(res.status, 404);
});

test('unknown route returns JSON 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).success, false);
});
