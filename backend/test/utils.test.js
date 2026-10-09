const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeKenyanPhone } = require('../src/utils/phoneUtils');
const { checkApplicationCompleteness } = require('../src/utils/applicationCompleteness');
const { toCsv } = require('../src/utils/csv');
const { parseMpesaDate, statusForResultCode } = require('../src/services/paymentProcessingService');
const { timestamp } = require('../src/services/mpesaService');
const { _buildUpdate: buildUpdate } = require('../src/controllers/applicationController');

test('normalizeKenyanPhone accepts all common formats', () => {
  for (const input of ['0712345678', '712345678', '+254712345678', '254712345678', '0712 345 678', '0712-345-678']) {
    assert.equal(normalizeKenyanPhone(input), '254712345678', input);
  }
  assert.equal(normalizeKenyanPhone('0112345678'), '254112345678');
  for (const bad of ['', null, '0812345678', '07123', '07123456789', 'abc', '+1 555 123 4567']) {
    assert.equal(normalizeKenyanPhone(bad), null, String(bad));
  }
});

function completeApp(overrides = {}) {
  return {
    applicant: { fullName: 'Amina Hassan', dateOfBirth: new Date('1990-01-01') },
    familyMembers: [],
    refugeeInfo: { refugeeId: 'KAK-123', settlementName: 'Kakuma' },
    manifest: { hasManifest: false },
    sponsor: { fullName: 'Ali Hassan', relationship: 'Brother/Sister', phone: '254712345678' },
    documents: [{ type: 'APPLICANT_PASSPORT_PHOTO' }, { type: 'SPONSOR_PASSPORT_PHOTO' }],
    consent: { accuracyConfirmed: true, termsAccepted: true },
    ...overrides,
  };
}

test('completeness passes for a complete application', () => {
  assert.deepEqual(checkApplicationCompleteness(completeApp(), { manifestRequired: false }), []);
});

test('completeness flags missing manifest when required by settings', () => {
  const missing = checkApplicationCompleteness(completeApp(), { manifestRequired: true }).map((m) => m.field);
  assert.deepEqual(missing.sort(), ['MANIFEST_CARD', 'manifest.manifestNumber']);
});

test('completeness flags incomplete family members, bad phone and consent', () => {
  const app = completeApp({
    familyMembers: [{ fullName: 'Child', relationship: '', dateOfBirth: null }],
    sponsor: { fullName: 'Ali', relationship: 'Friend', phone: '0812' },
    consent: { accuracyConfirmed: true, termsAccepted: false },
  });
  const fields = checkApplicationCompleteness(app, {}).map((m) => m.field);
  assert.ok(fields.includes('familyMembers.0'));
  assert.ok(fields.includes('sponsor.phone'));
  assert.ok(fields.includes('consent.termsAccepted'));
});

test('toCsv escapes quotes/commas and neutralises formulas', () => {
  const csv = toCsv(['a', 'b'], [['=SUM(A1)', 'x, "y"']]);
  assert.equal(csv, 'a,b\r\n\'=SUM(A1),"x, ""y"""\r\n');
});

test('M-Pesa result codes map to payment statuses', () => {
  assert.equal(statusForResultCode('0'), 'PAID');
  assert.equal(statusForResultCode('1032'), 'CANCELLED');
  assert.equal(statusForResultCode('1037'), 'EXPIRED');
  assert.equal(statusForResultCode('1'), 'FAILED');
});

test('M-Pesa dates are parsed as East Africa Time', () => {
  assert.equal(parseMpesaDate('20261009131522').toISOString(), '2026-10-09T10:15:22.000Z');
  assert.equal(parseMpesaDate('bad'), undefined);
  assert.equal(timestamp(new Date('2026-10-09T10:15:22Z')), '20261009131522');
});

test('buildUpdate whitelists fields and normalises the sponsor phone', () => {
  const set = buildUpdate({
    applicant: { fullName: '  Amina  ', evil: 'x' },
    sponsor: { phone: '0712 345 678', relationship: 'Parent' },
    status: 'SUBMITTED',
    currentStep: 3,
  });
  assert.equal(set['applicant.fullName'], 'Amina');
  assert.equal(set['sponsor.phone'], '254712345678');
  assert.equal(set.currentStep, 3);
  assert.equal(set.status, undefined);
  assert.equal(set['applicant.evil'], undefined);
});

test('buildUpdate rejects future dates and invalid relationships', () => {
  assert.throws(() => buildUpdate({ applicant: { dateOfBirth: '2999-01-01' } }));
  assert.throws(() => buildUpdate({ sponsor: { relationship: 'Boss' } }));
  assert.throws(() => buildUpdate({ currentStep: 8 }));
});
