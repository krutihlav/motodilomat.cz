#!/usr/bin/env tsx
import { appendFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../src/lib/supabase/server';

const PAGE_SIZE = 1_000;

export type ShopProductRow = {
  price: number;
  inStock: boolean | null;
  itemGroupId: string | null;
};

export type ImportSummaryStats = {
  totalRows: number;
  byAvailability: { inStock: number; outOfStock: number; unknown: number };
  price: { min: number; max: number; avg: number } | null;
  itemGroups: {
    itemsWithGroupId: number;
    itemsWithoutGroupId: number;
    distinctGroups: number;
    /** Skupiny s >1 členem - to jsou skutečné varianty (velikost/barva/...). */
    groupsWithMultipleMembers: number;
    /** Kolik položek sdílí item_group_id s aspoň jednou další položkou. */
    itemsInMultiMemberGroups: number;
  };
};

/** Čistá agregační funkce nad už načtenými řádky - testovatelná bez DB. */
export function summarizeRows(rows: ShopProductRow[]): ImportSummaryStats {
  const byAvailability = { inStock: 0, outOfStock: 0, unknown: 0 };
  const groupCounts = new Map<string, number>();
  let itemsWithoutGroupId = 0;

  for (const row of rows) {
    if (row.inStock === true) {
      byAvailability.inStock += 1;
    } else if (row.inStock === false) {
      byAvailability.outOfStock += 1;
    } else {
      byAvailability.unknown += 1;
    }

    if (row.itemGroupId) {
      groupCounts.set(row.itemGroupId, (groupCounts.get(row.itemGroupId) ?? 0) + 1);
    } else {
      itemsWithoutGroupId += 1;
    }
  }

  let groupsWithMultipleMembers = 0;
  let itemsInMultiMemberGroups = 0;
  for (const count of groupCounts.values()) {
    if (count > 1) {
      groupsWithMultipleMembers += 1;
      itemsInMultiMemberGroups += count;
    }
  }

  const prices = rows.map((row) => row.price);
  const price =
    prices.length > 0
      ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round((prices.reduce((sum, p) => sum + p, 0) / prices.length) * 100) / 100,
        }
      : null;

  return {
    totalRows: rows.length,
    byAvailability,
    price,
    itemGroups: {
      itemsWithGroupId: rows.length - itemsWithoutGroupId,
      itemsWithoutGroupId,
      distinctGroups: groupCounts.size,
      groupsWithMultipleMembers,
      itemsInMultiMemberGroups,
    },
  };
}

/** Stránkuje přes shop_products (PostgREST defaultně vrací max. 1000 řádků na dotaz). */
async function fetchAllRows(client: SupabaseClient, shopId: string): Promise<ShopProductRow[]> {
  const rows: ShopProductRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('shop_products')
      .select('price, in_stock, item_group_id:raw->>itemGroupId')
      .eq('shop_id', shopId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Nepodařilo se načíst shop_products pro "${shopId}": ${error.message}`);
    }
    if (!data || data.length === 0) {
      break;
    }

    for (const row of data as {
      price: number;
      in_stock: boolean | null;
      item_group_id: string | null;
    }[]) {
      rows.push({ price: row.price, inStock: row.in_stock, itemGroupId: row.item_group_id });
    }

    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

export function renderMarkdown(shopId: string, stats: ImportSummaryStats): string {
  const lines: string[] = [];
  lines.push(`# Souhrn importu: ${shopId}`);
  lines.push('');
  lines.push(`- **Řádků celkem:** ${stats.totalRows}`);
  lines.push(
    `- **Dostupnost:** skladem ${stats.byAvailability.inStock}, není skladem ${stats.byAvailability.outOfStock}, neznámo ${stats.byAvailability.unknown}`,
  );
  lines.push(
    stats.price
      ? `- **Cena:** min ${stats.price.min} Kč, max ${stats.price.max} Kč, průměr ${stats.price.avg} Kč`
      : '- **Cena:** žádná data',
  );
  lines.push('');
  lines.push('## item_group_id (varianty)');
  lines.push('');
  lines.push(`- Položek s vyplněným item_group_id: ${stats.itemGroups.itemsWithGroupId}`);
  lines.push(`- Položek bez item_group_id: ${stats.itemGroups.itemsWithoutGroupId}`);
  lines.push(`- Počet distinct skupin: ${stats.itemGroups.distinctGroups}`);
  lines.push(
    `- Skupin s víc než jedním členem (skutečné varianty): ${stats.itemGroups.groupsWithMultipleMembers}`,
  );
  lines.push(
    `- **Položek sdílejících item_group_id s aspoň jednou další položkou: ${stats.itemGroups.itemsInMultiMemberGroups}**`,
  );
  lines.push('');
  lines.push(`_Vygenerováno ${new Date().toISOString()}_`);
  return lines.join('\n');
}

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Použití: tsx scripts/summarize-shop-import.ts <shop_id>');
    process.exit(1);
  }

  const client = createServiceRoleClient();
  const rows = await fetchAllRows(client, shopId);
  const stats = summarizeRows(rows);
  const markdown = renderMarkdown(shopId, stats);

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
