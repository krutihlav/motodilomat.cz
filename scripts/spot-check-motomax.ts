#!/usr/bin/env tsx
import { appendFileSync } from 'node:fs';
import { createServiceRoleClient } from '../src/lib/supabase/server';
import { shuffle } from '../src/lib/util/shuffle';

const SHOP_ID = 'motomax';
const SAMPLE_SIZE = 20;
const PAGE_SIZE = 1_000;

type SpotCheckRow = {
  name: string;
  price: number;
  url: string;
  inStock: boolean | null;
  categoryText: string | null;
};

/** Sebere id všech řádků daného shopu (stránkovaně) - lehčí než tahat celé řádky jen kvůli výběru. */
async function fetchAllIds(
  client: ReturnType<typeof createServiceRoleClient>,
  shopId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('shop_products')
      .select('id')
      .eq('shop_id', shopId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Nepodařilo se načíst id shop_products pro "${shopId}": ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }

    ids.push(...data.map((row) => row.id as string));

    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return ids;
}

function renderMarkdown(rows: SpotCheckRow[]): string {
  const lines: string[] = [];
  lines.push(`# Namátková kontrola: ${SHOP_ID} (${rows.length} položek)`);
  lines.push('');
  lines.push('Porovnej ručně s živým webem přes product_url.');
  lines.push('');
  lines.push('| Produkt | Cena | Sklad | Kategorie | product_url |');
  lines.push('|---|---|---|---|---|');

  for (const row of rows) {
    const stock = row.inStock === null ? 'neznámo' : row.inStock ? 'skladem' : 'není skladem';
    lines.push(
      `| ${row.name} | ${row.price} Kč | ${stock} | ${row.categoryText ?? '—'} | ${row.url} |`,
    );
  }

  lines.push('');
  lines.push(`_Vygenerováno ${new Date().toISOString()}_`);
  return lines.join('\n');
}

async function main() {
  const client = createServiceRoleClient();

  const ids = await fetchAllIds(client, SHOP_ID);
  if (ids.length === 0) {
    console.log(`Shop "${SHOP_ID}" nemá žádné položky v shop_products.`);
    return;
  }

  const pickedIds = shuffle(ids).slice(0, SAMPLE_SIZE);

  const { data, error } = await client
    .from('shop_products')
    .select('name, price, url, in_stock, category_text')
    .in('id', pickedIds);

  if (error) {
    throw new Error(`Nepodařilo se načíst vzorek shop_products pro "${SHOP_ID}": ${error.message}`);
  }

  const rows: SpotCheckRow[] = (data ?? []).map((row) => ({
    name: row.name as string,
    price: row.price as number,
    url: row.url as string,
    inStock: row.in_stock as boolean | null,
    categoryText: row.category_text as string | null,
  }));

  const markdown = renderMarkdown(rows);
  console.log(markdown);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${markdown}\n`);
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
