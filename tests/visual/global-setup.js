import { createServer } from 'vite';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:4173';

async function serverAlreadyRunning() {
  try {
    const response = await fetch(baseURL);
    return response.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (await serverAlreadyRunning()) return undefined;

  const server = await createServer({
    configFile: path.resolve('vite.config.js'),
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });
  await server.listen();

  return async () => {
    await server.close();
  };
}
