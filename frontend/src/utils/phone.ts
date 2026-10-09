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

/** 254712345678 → 0712 345 678 */
export function formatKenyanPhone(input: string | undefined | null): string {
  const n = normalizeKenyanPhone(input);
  if (!n) return input || '';
  const local = `0${n.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
