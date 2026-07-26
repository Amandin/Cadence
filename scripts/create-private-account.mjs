import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';

const ITERATIONS = 310_000;

function usage() {
  console.error('Usage : npm run account:create -- adresse@email.fr "Prénom" [--admin]');
  process.exit(1);
}

function sqlValue(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function hiddenPrompt(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const password = process.env.CADENCE_ACCOUNT_PASSWORD;
    if (!password) throw new Error('CADENCE_ACCOUNT_PASSWORD est requis hors terminal interactif.');
    return password;
  }
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = '';
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Annulé.'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (key.name === 'backspace') {
        if (value) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (!key.ctrl && !key.meta && character) {
        value += character;
        process.stdout.write('*');
      }
    };
    const cleanup = () => {
      process.stdin.off('keypress', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on('keypress', onKeypress);
  });
}

const [emailArgument, displayNameArgument, ...flags] = process.argv.slice(2);
const email = String(emailArgument || '').trim().toLowerCase();
const displayName = String(displayNameArgument || '').trim();
if (!email.includes('@') || !displayName) usage();

const password = await hiddenPrompt('Mot de passe : ');
const confirmation = process.env.CADENCE_ACCOUNT_PASSWORD ? password : await hiddenPrompt('Confirmer : ');
if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
if (password.length < 14) throw new Error('Le mot de passe doit contenir au moins 14 caractères.');

const salt = randomBytes(18);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const now = new Date().toISOString();
const role = flags.includes('--admin') ? 'admin' : 'member';
const sql = `INSERT INTO accounts (id, email, display_name, password_hash, password_salt, password_iterations, role, created_at) VALUES (${[
  randomUUID(),
  email,
  displayName,
  hash.toString('base64'),
  salt.toString('base64'),
  ITERATIONS,
  role,
  now,
].map(sqlValue).join(', ')});`;

console.log('\nSQL à exécuter sur D1 (aucun mot de passe en clair) :\n');
console.log(sql);
