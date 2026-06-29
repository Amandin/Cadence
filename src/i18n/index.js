import baseSource from './translations.csv?raw';
import randomSource from './translations-random.csv?raw';

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

function mergeCsvSources(sources) {
  let locales = [];
  const records = [];

  for (const source of sources) {
    const [header = [], ...sourceRecords] = parseCsv(source.trim());
    const sourceLocales = header.slice(1);
    if (!locales.length) locales = sourceLocales;
    records.push(...sourceRecords.map((record) => ({ record, sourceLocales })));
  }

  return { locales, records };
}

const { locales: localeColumns, records } = mergeCsvSources([baseSource, randomSource]);
const dictionary = records.reduce((acc, record) => {
  const [key, ...values] = record.record;
  if (!key) return acc;
  acc[key] = record.sourceLocales.reduce((entry, locale, index) => {
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
