import source from './translations.csv?raw';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const [header = [], ...records] = parseCsv(source.trim());
const localeColumns = header.slice(1);
const dictionary = records.reduce((acc, record) => {
  const [key, ...values] = record;
  if (!key) return acc;
  acc[key] = localeColumns.reduce((entry, locale, index) => {
    entry[locale] = values[index] ?? '';
    return entry;
  }, {});
  return acc;
}, {});

export function t(key, params = {}, locale = 'fr') {
  const template = dictionary[key]?.[locale] || dictionary[key]?.fr || key;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, paramKey) => params[paramKey] ?? '');
}

export function getAvailableLocales() {
  return [...localeColumns];
}
