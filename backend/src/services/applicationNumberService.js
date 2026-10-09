const Counter = require('../models/Counter');

/**
 * Generates the next application number, e.g. APP-2026-000001.
 * The sequence is per prefix per year and incremented atomically.
 */
async function generateApplicationNumber(prefix = 'APP', date = new Date()) {
  const cleanPrefix = (String(prefix || 'APP').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'APP').slice(0, 10);
  const year = date.getFullYear();
  const seq = await Counter.next(`${cleanPrefix}-${year}`);
  return `${cleanPrefix}-${year}-${String(seq).padStart(6, '0')}`;
}

module.exports = { generateApplicationNumber };
