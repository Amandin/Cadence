import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';

const ITERATIONS = 100_000;

function usage() {
  console.error('Usage : npm run account:create -- pseudo "Prénom" [--admin]');
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
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      const input = chunk.toString('utf8');
      if (input.includes('\u0003')) {
        cleanup();
        reject(new Error('Annulé.'));
        return;
      }
      if (input.includes('\r') || input.includes('\n')) {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (input.includes('\b') || input.includes('\u007f')) {
        if (value) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      const printable = [...input].filter((character) => character >= ' ').join('');
      if (printable) {
        value += printable;
        process.stdout.write('*'.repeat([...printable].length));
      }
    };
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on('data', onData);
  });
}

const [usernameArgument, displayNameArgument, ...flags] = process.argv.slice(2);
const username = String(usernameArgument || '').trim().normalize('NFKC').toLowerCase();
const displayName = String(displayNameArgument || '').trim();
if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]{2,47}$/u.test(username) || !displayName) usage();
const replace = flags.includes('--replace');

const password = await hiddenPrompt('Mot de passe : ');
const confirmation = process.env.CADENCE_ACCOUNT_PASSWORD ? password : await hiddenPrompt('Confirmer : ');
if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
if (password.length < 14) throw new Error('Le mot de passe doit contenir au moins 14 caractères.');

const salt = randomBytes(18);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const now = new Date().toISOString();
const role = flags.includes('--admin') ? 'admin' : 'member';
const values = [hash.toString('base64'), salt.toString('base64'), ITERATIONS, role, displayName];
const sql = replace
  ? `UPDATE accounts SET password_hash = ${sqlValue(values[0])}, password_salt = ${sqlValue(values[1])}, password_iterations = ${sqlValue(values[2])}, role = ${sqlValue(values[3])}, display_name = ${sqlValue(values[4])}, disabled = 0, failed_login_count = 0, locked_until = NULL WHERE username = ${sqlValue(username)};`
  : `INSERT INTO accounts (id, username, email, display_name, password_hash, password_salt, password_iterations, role, created_at) VALUES (${[
      randomUUID(), username, `${username}@local.invalid`, displayName, ...values, now,
    ].map(sqlValue).join(', ')});`;

console.log('\nSQL à exécuter sur D1 (aucun mot de passe en clair) :\n');
console.log(sql);
