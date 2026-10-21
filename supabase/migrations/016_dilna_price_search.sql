-- Okamžité vyhledání cen dílů pro interní aplikaci PureBikes Dílna (dilna.purebikes.cz).
-- Jen čtení. Volá se přes PostgREST RPC s anon klíčem + tajným tokenem z Vaultu
-- (secret 'dilna_token'), takže bez tokenu funkce nic nevrátí.
-- Dílna posílá jen název dílu a model stroje – žádná data zákazníků.

create or replace function public.dilna_norm(t text) returns text
language sql immutable parallel safe
set search_path = public
as $$
  select translate(lower(coalesce(t, '')),
    'áäčďéěëíňóöřšťúůüýžľĺŕ',
    'aacdeeeinoorstuuuyzllr')
$$;

-- p_query: název dílu, jak ho píše dílna („sada spojkových lamel“)
-- p_brand / p_model / p_type: model stroje z dílny (např. 'Jawa', '175', '356')
-- fit: 'model' = nabídka je v Motodílomatu přiřazená k modelu stroje,
--      'brand' = v názvu je aspoň značka, 'other' = jen shoda názvu dílu
create or replace function public.dilna_part_prices(
  p_token text, p_query text,
  p_brand text default null, p_model text default null, p_type text default null)
returns table (shop text, name text, price integer, url text, in_stock boolean, fit text, last_seen_at timestamptz)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  stems text[];
  target text[];
  brand_n text := nullif(split_part(dilna_norm(p_brand), ' ', 1), '');
  type_n text := nullif(btrim(coalesce(p_type, '')), '');
  model_n text := nullif(btrim(dilna_norm(p_model)), '');
begin
  if p_token is null or p_token is distinct from
     (select decrypted_secret from vault.decrypted_secrets where name = 'dilna_token' limit 1) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- vzory slov (regex bez diakritiky): krátké slovo musí sedět celé („píst“ ≠ „pístnice“),
  -- delší slovo stačí začátkem 4 znaků (spojkových → spoj…, lamel → lame…), čísla kdekoli
  select coalesce(array_agg(distinct case
      when w ~ '[0-9]' then regexp_replace(w, '([.])', '\\\1', 'g')
      when length(w) >= 5 then '\m' || left(w, 4)
      else '\m' || w || '\M' end), '{}')
    into stems
  from regexp_split_to_table(dilna_norm(left(p_query, 200)), '[^a-z0-9,.]+') w
  where length(w) >= 3
    and w not in ('sada', 'set', 'komplet', 'kompletni', 'pro', 'par', 'kus', 'nova', 'novy', 'nove',
                  'original', 'originalni', 'jawa', 'motocykl', 'motorka')
    and w is distinct from brand_n;
  if cardinality(stems) = 0 then return; end if;

  -- modely Motodílomatu odpovídající stroji: přednostně podle typového čísla
  select coalesce(array_agg(m.id), '{}') into target
  from models m
  where (type_n is not null and type_n = any(m.type_numbers)
         and (length(type_n) >= 3 or brand_n is null or dilna_norm(m.brand) like '%' || brand_n || '%'))
     or (type_n is null and brand_n is not null and model_n is not null
         and dilna_norm(m.brand) like '%' || brand_n || '%'
         and (dilna_norm(m.name) like '%' || model_n || '%'
              or model_n = any (select dilna_norm(a) from unnest(m.aliases) a)));

  return query
  with c as (
    select sp.id, s.name as shop_name, sp.name, sp.price, sp.url, sp.in_stock, sp.last_seen_at,
      (select count(*) from unnest(stems) st where dilna_norm(sp.name) ~ st)::int as hits,
      exists (select 1 from shop_product_models x where x.shop_product_id = sp.id and x.model_id = any (target)) as fit_model
    from shop_products sp
    join shops s on s.id = sp.shop_id
    where sp.price > 0
  ), best as (select max(hits) as mx from c)
  select c.shop_name, c.name, c.price, c.url, c.in_stock,
    case when c.fit_model then 'model'
         when brand_n is not null and dilna_norm(c.name) like '%' || brand_n || '%' then 'brand'
         else 'other' end,
    c.last_seen_at
  from c, best
  where c.hits = best.mx and c.hits >= greatest(1, ceil(cardinality(stems) * 0.6))
  order by c.fit_model desc, (brand_n is not null and dilna_norm(c.name) like '%' || brand_n || '%') desc, c.price
  limit 40;
end;
$$;

revoke all on function public.dilna_part_prices(text, text, text, text, text) from public;
grant execute on function public.dilna_part_prices(text, text, text, text, text) to anon;
