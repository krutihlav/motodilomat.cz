#!/usr/bin/env tsx
/**
 * Vygeneruje supabase/migrations/013_seed_models.sql ze src/lib/models/seed.ts
 * (zdroj pravdy). Test tests/models/seedSql.test.ts hlídá, že soubor odpovídá.
 *
 *   npx tsx scripts/generate-models-seed.ts
 */
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderSeedSql} from '../src/lib/models/seedSql';

const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations',
  '013_seed_models.sql',
);

writeFileSync(target, renderSeedSql());
console.log(`Zapsáno ${target}`);
