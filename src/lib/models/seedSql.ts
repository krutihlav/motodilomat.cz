import { CANONICAL_MODELS, type CanonicalModel } from './seed';

const str = (value: string) => `'${value.replace(/'/g, "''")}'`;
const nullable = (value: string | number | null) =>
  value === null ? 'null' : typeof value === 'number' ? String(value) : str(value);
const textArray = (values: string[]) =>
  values.length === 0 ? `'{}'::text[]` : `array[${values.map(str).join(', ')}]::text[]`;

function row(model: CanonicalModel): string {
  return `  (${[
    str(model.slug),
    str(model.slug),
    str(model.brand),
    str(model.name),
    str(model.family),
    nullable(model.displacement),
    textArray(model.typeNumbers),
    textArray(model.aliases),
    String(model.needsVerification),
    nullable(model.note),
  ].join(', ')})`;
}

/** SQL seedu kanonických modelů (idempotentní upsert podle id). */
export function renderSeedSql(models: readonly CanonicalModel[] = CANONICAL_MODELS): string {
  return `-- Seed kanonických modelů (Fáze 3). GENEROVÁNO ze src/lib/models/seed.ts:
-- npx tsx scripts/generate-models-seed.ts - needitovat ručně.
-- ČZ modely (typy 355, 450, 453, 455, 470-472, 476, 477, 487, 488) se záměrně
-- neseedují, Simson je mimo rozsah.
insert into models
  (id, slug, brand, name, family, displacement, type_numbers, aliases, needs_verification, note)
values
${models.map(row).join(',\n')}
on conflict (id) do update set
  slug = excluded.slug,
  brand = excluded.brand,
  name = excluded.name,
  family = excluded.family,
  displacement = excluded.displacement,
  type_numbers = excluded.type_numbers,
  aliases = excluded.aliases,
  needs_verification = excluded.needs_verification,
  note = excluded.note;
`;
}
