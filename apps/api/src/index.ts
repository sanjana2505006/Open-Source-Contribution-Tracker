import './config/dotenv.js';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { closePool, getPool } from './infrastructure/db/pool.js';
import { runMigrations } from './infrastructure/db/migrate.js';

import { getAgentStartupMessage } from './services/agentLlm.js';

async function main() {
  const env = loadEnv();

  await runMigrations(env);
  getPool(env);

  const app = createApp(env);

  console.log(getAgentStartupMessage(env));

  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${env.PORT} is already in use. Stop the other API process:\n` +
          `  lsof -ti :${env.PORT} | xargs kill\n` +
          `Then run npm run dev again (only one instance).`,
      );
      process.exit(1);
    }
    throw err;
  });

  const shutdown = async () => {
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
