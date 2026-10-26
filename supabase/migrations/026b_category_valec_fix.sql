-- 026b: „váleček“ (bowden, brzda) nepatří do Válec a píst. Funkce se změní a uložený
-- sloupec category se přepočítá (UPDATE řádku přepočítá generované sloupce).
create or replace function catalog_category(p_name text)
returns text
language sql immutable parallel safe
set search_path = public
as $$
  select case
    when n ~ 'karbur|tryska|soupatk|plovak|jehl' then 'karburator'
    when n ~ '\mpist|\mvalec\M|\mvalce\M|\mvalcu\M' then 'valec-pist'
    when n ~ 'klikov|lozisk|gufer|tesnen' then 'klikovka'
    when n ~ 'spojk' then 'spojka'
    when n ~ 'razen|prevod|ozuben|retez' then 'prevody'
    when n ~ 'vyfuk|tlumic vyf|koleno' then 'vyfuk'
    when n ~ 'zapalov|civk|stator|svick|kabel|svet|zarov|blinkr|spinac|prepinac|regul|akumul|bateri|houkac|klakson' then 'elektro'
    when n ~ 'brzd|celist|bowden|lank' then 'brzdy'
    when n ~ 'kolo|rafek|vyplet|duse|pneu|plast|naboj' then 'kola'
    when n ~ 'vidlic|tlumic|perov|pruzin' then 'vidlice'
    when n ~ 'nadrz|sedl|blatnik|kryt|stupac|stojan|riditk|packa|packy|rukojet|gumy' then 'ram-kryty'
    else 'nezarazene'
  end
  from (select dilna_norm(p_name) as n) x
$$;

update shop_products set name = name;
