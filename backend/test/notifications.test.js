const test = require('node:test');
const assert = require('node:assert/strict');
const notifications = require('../src/services/notificationService');

test('email body escapes applicant-supplied HTML', () => {
  const { html, text } = notifications._render({
    agencyName: 'Agency',
    heading: 'New application',
    intro: 'Intro',
    rows: [['Applicant', '<script>alert(1)</script>']],
    link: 'https://example.com/admin/applications/1',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(text.includes('Applicant: <script>alert(1)</script>'));
});

test('sending is skipped (not thrown) when SMTP is not configured', async (t) => {
  const Settings = require('../src/models/Settings');
  const original = Settings.getSingleton;
  Settings.getSingleton = async () => ({ agencyName: 'Agency', smtp: { host: '' }, notificationEmails: [] });
  t.after(() => (Settings.getSingleton = original));
  const result = await notifications.sendAdminEmail({ subject: 'x', heading: 'x', intro: 'x', rows: [] });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'SMTP not configured');
  assert.equal(notifications.configStatus({}).configured, false);
});

test('portal SMTP settings take priority and never expose the password', () => {
  const { encrypt, decrypt } = require('../src/utils/secretBox');
  const enc = encrypt('s3cret!');
  assert.notEqual(enc, 's3cret!');
  assert.equal(decrypt(enc), 's3cret!');
  assert.equal(decrypt('v1:tampered:x:y'), null);

  const status = notifications.configStatus({
    smtp: { host: 'smtp.example.com', port: 465, secure: true, user: 'u', passEncrypted: enc, from: 'A <a@b.c>' },
  });
  assert.equal(status.configured, true);
  assert.equal(status.source, 'portal');
  assert.equal(status.passwordSet, true);
  assert.ok(!JSON.stringify(status).includes('s3cret'));
  assert.ok(!JSON.stringify(status).includes(enc));

  // Host without a From address is incomplete.
  assert.equal(notifications.configStatus({ smtp: { host: 'smtp.example.com', from: '' } }).configured, false);
});
