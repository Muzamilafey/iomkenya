// Calling codes of African countries (longest-prefix matched, so keep codes unambiguous).
const AFRICAN_CALLING_CODES = [
  '20', '27',
  '211', '212', '213', '216', '218',
  '220', '221', '222', '223', '224', '225', '226', '227', '228', '229',
  '230', '231', '232', '233', '234', '235', '236', '237', '238', '239',
  '240', '241', '242', '243', '244', '245', '248', '249',
  '250', '251', '252', '253', '254', '255', '256', '257', '258',
  '260', '261', '263', '264', '265', '266', '267', '268', '269',
  '291'
];

/**
 * Normalises Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts 07…, 01…, 7…, 1…, +254…, 254… (spaces and dashes ignored).
 * Returns null when the input is not a valid Kenyan mobile number.
 * Used where only Kenyan numbers work (M-Pesa STK push).
 */
function normalizeKenyanPhone(input) {
  if (input === undefined || input === null) return null;
  let digits = String(input).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith('254')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  if (!/^[17]\d{8}$/.test(digits)) return null;
  return `254${digits}`;
}

function isValidKenyanPhone(input) {
  return normalizeKenyanPhone(input) !== null;
}

/**
 * Normalises a phone number from any African country to international digits
 * without "+" (e.g. 255712345678). Numbers without a country code (07…, 01…,
 * 7…, 1…) are treated as Kenyan. Returns null if not a valid African number.
 */
function normalizeAfricanPhone(input) {
  if (input === undefined || input === null) return null;
  let digits = String(input).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^0\d/.test(digits) || /^[17]\d{8}$/.test(digits)) {
    // Local Kenyan format (no country code).
    return normalizeKenyanPhone(digits);
  }
  if (!/^\d+$/.test(digits)) return null;

  const code = AFRICAN_CALLING_CODES.filter((c) => digits.startsWith(c)).sort((a, b) => b.length - a.length)[0];
  if (!code) return null;
  if (code === '254') return normalizeKenyanPhone(digits);

  const national = digits.slice(code.length);
  if (national.startsWith('0') || national.length < 6 || digits.length > 15) return null;
  return digits;
}

function isValidAfricanPhone(input) {
  return normalizeAfricanPhone(input) !== null;
}

module.exports = {
  normalizeKenyanPhone,
  isValidKenyanPhone,
  normalizeAfricanPhone,
  isValidAfricanPhone
};
