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

module.exports = {
  normalizeAfricanPhone,
  isValidAfricanPhone
};
const { parsePhoneNumberFromString } = require('libphonenumber-js');

// African ISO country codes
const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD',
  'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET',
  'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG',
  'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW',
  'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG',
  'TN', 'UG', 'ZM', 'ZW'
]);

function normalizeAfricanPhone(input, defaultCountry = 'KE') {
  if (input === undefined || input === null) return null;

  const value = String(input).trim();

  if (!value) return null;

  try {
    const phone = parsePhoneNumberFromString(value, defaultCountry);

    if (!phone) return null;

    // Must belong to an African country
    if (!AFRICAN_COUNTRIES.has(phone.country)) {
      return null;
    }

    // Must be a valid phone number for that country
    if (!phone.isValid()) {
      return null;
    }

    // Return international format without "+"
    return phone.number.slice(1);
  } catch (error) {
    return null;
  }
}

function isValidAfricanPhone(input, defaultCountry = 'KE') {
  return normalizeAfricanPhone(input, defaultCountry) !== null;
}

module.exports = {
  normalizeAfricanPhone,
  isValidAfricanPhone
};