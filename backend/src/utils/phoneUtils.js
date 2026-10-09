/**
 * Normalises Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts 07…, 01…, 7…, 1…, +254…, 254… (spaces and dashes ignored).
 * Returns null when the input is not a valid Kenyan mobile number.
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

module.exports = { normalizeKenyanPhone, isValidKenyanPhone };
