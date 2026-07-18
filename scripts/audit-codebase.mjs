import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = join(root, 'src');
const publicRoot = join(root, 'public');
const sourceExtensions = new Set(['.js', '.jsx', '.css']);
const moduleExtensions = ['.js', '.jsx', '.css'];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function display(path) {
  return relative(root, path).replaceAll('\\', '/');
}

const sourceFiles = walk(sourceRoot).filter((path) => sourceExtensions.has(extname(path)));
const isTestFile = (path) => path.includes('.test.') || path.replaceAll('\\', '/').includes('.tests/');
const productionFiles = sourceFiles.filter((path) => !isTestFile(path));
const productionSet = new Set(productionFiles);

function resolveImport(importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(importer), specifier.split('?')[0]);
  const candidates = extname(base)
    ? [base]
    : [...moduleExtensions.map((extension) => `${base}${extension}`), ...moduleExtensions.map((extension) => join(base, `index${extension}`))];
  return candidates.find((candidate) => productionSet.has(candidate)) || null;
}

function importedSpecifiers(source) {
  const matches = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) matches.push(match[1]);
  }
  return matches;
}

const imports = new Map(productionFiles.map((path) => {
  const source = readFileSync(path, 'utf8');
  return [path, importedSpecifiers(source).map((specifier) => resolveImport(path, specifier)).filter(Boolean)];
}));

const reachable = new Set();
function visit(path) {
  if (!path || reachable.has(path)) return;
  reachable.add(path);
  for (const dependency of imports.get(path) || []) visit(dependency);
}
visit(join(sourceRoot, 'main.jsx'));

const testSources = sourceFiles
  .filter(isTestFile)
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');
const orphanModules = productionFiles
  .filter((path) => ['.js', '.jsx'].includes(extname(path)))
  .filter((path) => !reachable.has(path))
  .map((path) => ({ path, testOnly: testSources.includes(`./${relative(sourceRoot, path).replaceAll('\\', '/')}`) }))
  .sort((a, b) => display(a.path).localeCompare(display(b.path)));

function lineCount(path) {
  return readFileSync(path, 'utf8').split(/\r?\n/).length;
}

const largeFiles = sourceFiles
  .map((path) => ({ path, lines: lineCount(path), bytes: statSync(path).size }))
  .filter(({ path, lines }) => lines > (extname(path) === '.css' ? 1000 : 500))
  .sort((a, b) => b.lines - a.lines);

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
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const csvFiles = [join(sourceRoot, 'i18n', 'translations.csv'), join(sourceRoot, 'i18n', 'translations-random.csv')];
const translationRows = csvFiles.flatMap((path) => parseCsv(readFileSync(path, 'utf8')).slice(1));
const translationKeys = new Set(translationRows.map(([key]) => key));
const productionSource = productionFiles
  .filter((path) => ['.js', '.jsx'].includes(extname(path)))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

const publicFiles = walk(publicRoot);
const assetReferenceSource = [
  ...productionFiles.map((path) => readFileSync(path, 'utf8')),
  readFileSync(join(root, 'index.html'), 'utf8'),
  ...publicFiles.filter((path) => ['.js', '.json', '.webmanifest', '.css', '.html'].includes(extname(path))).map((path) => readFileSync(path, 'utf8')),
].join('\n');
const unreferencedAssets = publicFiles
  .filter((path) => !['.js', '.webmanifest', '.html'].includes(extname(path)))
  .filter((path) => !path.endsWith('OFL.txt'))
  .filter((path) => {
    const relativePath = relative(publicRoot, path).replaceAll('\\', '/');
    return !assetReferenceSource.includes(`/${relativePath}`) && !assetReferenceSource.includes(relativePath);
  })
  .sort((a, b) => display(a).localeCompare(display(b)));
const usedTranslationKeys = new Set([...productionSource.matchAll(/(?<![A-Za-z0-9_$])t\(\s*['"]([a-z][a-zA-Z0-9_.-]+)['"]/g)].map((match) => match[1]));
const missingTranslationKeys = [...usedTranslationKeys].filter((key) => !translationKeys.has(key)).sort();
const unusedTranslationKeys = [...translationKeys].filter((key) => !usedTranslationKeys.has(key)).sort();

const cssFiles = productionFiles.filter((path) => extname(path) === '.css');
const cssSource = cssFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
const definedVariables = new Set([...cssSource.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1]));
const variableUsageSource = `${cssSource}\n${productionSource}`;
const usedVariables = new Set([...variableUsageSource.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)].map((match) => match[1]));
const unusedVariables = [...definedVariables].filter((name) => !usedVariables.has(name)).sort();
const undefinedVariables = [...usedVariables].filter((name) => !definedVariables.has(name)).sort();
const hardcodedColors = [...cssSource.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/g)].length;
const hardcodedColorCounts = [...cssSource.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/g)]
  .map((match) => match[0].toLowerCase())
  .reduce((counts, color) => counts.set(color, (counts.get(color) || 0) + 1), new Map());

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

console.log('Audit statique Cadence');
console.log(`Modules de production atteignables : ${reachable.size}/${productionFiles.length}`);

section('Modules hors graphe de production');
if (!orphanModules.length) console.log('Aucun.');
for (const item of orphanModules) console.log(`${item.testOnly ? '[test-only]' : '[orphelin]'} ${display(item.path)}`);

section('Fichiers massifs');
if (!largeFiles.length) console.log('Aucun au-dessus des seuils (JS/JSX 500, CSS 1000 lignes).');
for (const item of largeFiles) console.log(`${String(item.lines).padStart(5)} lignes  ${display(item.path)}`);

section('Assets publics sans référence statique');
if (!unreferencedAssets.length) console.log('Aucun.');
for (const path of unreferencedAssets) console.log(display(path));

section('i18n');
console.log(`${translationKeys.size} clés, ${usedTranslationKeys.size} références littérales.`);
console.log(`Clés manquantes : ${missingTranslationKeys.length}`);
for (const key of missingTranslationKeys) console.log(`  ${key}`);
console.log(`Clés sans référence littérale : ${unusedTranslationKeys.length} (inclut les clés dynamiques et de compatibilité).`);

section('CSS / skins');
console.log(`${definedVariables.size} variables définies, ${usedVariables.size} utilisées, ${hardcodedColors} couleurs codées en dur.`);
console.log(`Couleurs répétées : ${[...hardcodedColorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([color, count]) => `${color} ×${count}`).join(', ')}`);
console.log(`Variables définies mais non utilisées : ${unusedVariables.length}`);
for (const name of unusedVariables) console.log(`  ${name}`);
console.log(`Variables utilisées sans définition locale : ${undefinedVariables.length}`);
for (const name of undefinedVariables) console.log(`  ${name}`);

if (missingTranslationKeys.length) process.exitCode = 1;
