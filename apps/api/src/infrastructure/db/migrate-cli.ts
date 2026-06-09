import 'dotenv/config';
import { loadEnv } from '../../config/env.js';
import { runMigrations } from './migrate.js';
import { closePool } from './pool.js';

const env = loadEnv();

runMigrations(env)
  .then(() => closePool())
  .then(() => {
    console.log('Migrations complete.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
