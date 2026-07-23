create or replace function public.get_dashboard_payload(
  p_start date,
  p_end date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select auth.uid() as user_id
  )
  select jsonb_build_object(
    'period_transactions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'type', t.type,
          'amount', t.amount,
          'note', t.note,
          'date', t.date,
          'created_at', t.created_at,
          'category_id', t.category_id,
          'account_id', t.account_id,
          'source_name', t.source_name,
          'person_name', t.person_name,
          'item_name', t.item_name,
          'categories', case
            when c.id is null then null
            else jsonb_build_object('id', c.id, 'name', c.name, 'color', c.color)
          end,
          'accounts', case
            when a.id is null then null
            else jsonb_build_object('name', a.name)
          end
        ) order by t.date asc, t.created_at asc
      )
      from public.transactions t
      left join public.categories c
        on c.id = t.category_id
       and c.user_id = t.user_id
      left join public.accounts a
        on a.id = t.account_id
       and a.user_id = t.user_id
      where t.user_id = (select user_id from viewer)
        and t.date >= p_start
        and t.date <= p_end
    ), '[]'::jsonb),
    'recent_transactions', coalesce((
      select jsonb_agg(row_data order by row_date desc, row_created_at desc)
      from (
        select
          jsonb_build_object(
            'id', t.id,
            'type', t.type,
            'amount', t.amount,
            'note', t.note,
            'date', t.date,
            'created_at', t.created_at,
            'source_name', t.source_name,
            'person_name', t.person_name,
            'item_name', t.item_name,
            'categories', case
              when c.id is null then null
              else jsonb_build_object('id', c.id, 'name', c.name, 'color', c.color)
            end,
            'accounts', case
              when a.id is null then null
              else jsonb_build_object('name', a.name)
            end
          ) as row_data,
          t.date as row_date,
          t.created_at as row_created_at
        from public.transactions t
        left join public.categories c
          on c.id = t.category_id
         and c.user_id = t.user_id
        left join public.accounts a
          on a.id = t.account_id
         and a.user_id = t.user_id
        where t.user_id = (select user_id from viewer)
        order by t.date desc, t.created_at desc
        limit 12
      ) rows
    ), '[]'::jsonb),
    'recent_transfers', coalesce((
      select jsonb_agg(row_data order by row_date desc, row_created_at desc)
      from (
        select
          jsonb_build_object(
            'id', tr.id,
            'amount', tr.amount,
            'note', tr.note,
            'transfer_date', tr.transfer_date,
            'created_at', tr.created_at,
            'from_account', case
              when fa.id is null then null
              else jsonb_build_object('name', fa.name)
            end,
            'to_account', case
              when ta.id is null then null
              else jsonb_build_object('name', ta.name)
            end
          ) as row_data,
          tr.transfer_date as row_date,
          tr.created_at as row_created_at
        from public.account_transfers tr
        left join public.accounts fa
          on fa.id = tr.from_account_id
         and fa.user_id = tr.user_id
        left join public.accounts ta
          on ta.id = tr.to_account_id
         and ta.user_id = tr.user_id
        where tr.user_id = (select user_id from viewer)
        order by tr.transfer_date desc, tr.created_at desc
        limit 12
      ) rows
    ), '[]'::jsonb),
    'investments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'name', i.name,
          'type', i.type,
          'quantity', i.quantity,
          'purchase_price', i.purchase_price,
          'current_price', i.current_price,
          'purchased_at', i.purchased_at,
          'asset_id', i.asset_id,
          'symbol', i.symbol,
          'image_url', i.image_url,
          'price_source', i.price_source,
          'current_price_original', i.current_price_original,
          'current_price_currency', i.current_price_currency,
          'price_updated_at', i.price_updated_at,
          'price_change_24h', i.price_change_24h,
          'is_live_priced', i.is_live_priced
        ) order by i.created_at desc
      )
      from public.investments i
      where i.user_id = (select user_id from viewer)
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.created_at asc)
      from (
        select *
        from public.goals
        where user_id = (select user_id from viewer)
        order by created_at asc
        limit 6
      ) g
    ), '[]'::jsonb),
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'balance', a.balance))
      from public.accounts a
      where a.user_id = (select user_id from viewer)
        and a.status = 'active'
    ), '[]'::jsonb),
    'setup_counts', coalesce((
      select to_jsonb(counts)
      from public.get_dashboard_setup_counts() counts
    ), jsonb_build_object(
      'accounts', 0,
      'income_transactions', 0,
      'expense_transactions', 0,
      'income_categories', 0,
      'expense_categories', 0,
      'goals', 0,
      'investments', 0
    ))
  );
$$;

revoke all on function public.get_dashboard_payload(date, date) from public;
grant execute on function public.get_dashboard_payload(date, date) to authenticated;
