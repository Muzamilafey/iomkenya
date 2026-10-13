// Calling codes of African countries (longest-prefix matched).
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

/** Normalises Kenyan mobile numbers to 254XXXXXXXXX; returns null if invalid. */
export function normalizeKenyanPhone(input: string | undefined | null): string | null {
  if (!input) return null;
  let digits = input.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('254')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[17]\d{8}$/.test(digits)) return null;
  return `254${digits}`;
}

export const isValidKenyanPhone = (input: string | undefined | null) => normalizeKenyanPhone(input) !== null;

/**
 * Normalises a phone number from any African country to international digits
 * (no "+"). Numbers without a country code are treated as Kenyan.
 */
export function normalizeAfricanPhone(input: string | undefined | null): string | null {
  if (!input) return null;
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^0\d/.test(digits) || /^[17]\d{8}$/.test(digits)) return normalizeKenyanPhone(digits);
  if (!/^\d+$/.test(digits)) return null;

  const code = AFRICAN_CALLING_CODES.filter((c) => digits.startsWith(c)).sort((a, b) => b.length - a.length)[0];
  if (!code) return null;
  if (code === '254') return normalizeKenyanPhone(digits);

  const national = digits.slice(code.length);
  if (national.startsWith('0') || national.length < 6 || digits.length > 15) return null;
  return digits;
}

export const isValidAfricanPhone = (input: string | undefined | null) => normalizeAfricanPhone(input) !== null;

/** 254712345678 → 0712 345 678 */
export function formatKenyanPhone(input: string | undefined | null): string {
  const n = normalizeKenyanPhone(input);
  if (!n) return input || '';
  const local = `0${n.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** Kenyan numbers → 0712 345 678; other African numbers → +255712345678. */
export function formatPhone(input: string | undefined | null): string {
  const n = normalizeAfricanPhone(input);
  if (!n) return input || '';
  return n.startsWith('254') ? formatKenyanPhone(n) : `+${n}`;
}
