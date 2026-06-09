import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = path.resolve(
  fileURLToPath(new URL('../../../../', import.meta.url)),
);

dotenv.config({ path: path.join(monorepoRoot, '.env') });
