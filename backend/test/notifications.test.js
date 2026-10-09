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

test('sending is skipped (not thrown) when SMTP is not configured', async () => {
  const result = await notifications.sendAdminEmail({ subject: 'x', heading: 'x', intro: 'x', rows: [] });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'SMTP not configured');
  assert.equal(notifications.configStatus().configured, false);
});
