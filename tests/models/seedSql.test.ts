import {readFileSync} from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {renderSeedSql} from '../../src/lib/models/seedSql';

describe('013_seed_models.sql', () => {
  it('odpovídá src/lib/models/seed.ts (přegeneruj: npx tsx scripts/generate-models-seed.ts)', () => {
    const file = path.join(__dirname, '..', '..', 'supabase', 'migrations', '013_seed_models.sql');
    expect(readFileSync(file, 'utf8')).toBe(renderSeedSql());
  });
});
