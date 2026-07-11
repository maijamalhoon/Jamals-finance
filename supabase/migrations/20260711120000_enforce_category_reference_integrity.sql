do $category_reference_preflight$
begin
  if exists (
    select 1
    from public.transactions as txn
    join public.categories as category
      on category.id = txn.category_id
    where txn.category_id is not null
      and txn.user_id is distinct from category.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cannot enforce category ownership: cross-owner transaction/category references exist.';
  end if;

  if exists (
    select 1
    from public.categories as child
    join public.categories as parent
      on parent.id = child.parent_id
    where child.parent_id is not null
      and child.user_id is distinct from parent.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Cannot enforce category ownership: cross-owner category-parent references exist.';
  end if;
end;
$category_reference_preflight$;

do $category_owner_key$
declare
  category_id_attnum smallint;
  category_user_id_attnum smallint;
begin
  select attnum
  into category_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'id'
    and not attisdropped;

  select attnum
  into category_user_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'user_id'
    and not attisdropped;

  if category_id_attnum is null or category_user_id_attnum is null then
    raise exception 'Cannot enforce category ownership: required categories columns are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and contype in ('p', 'u')
      and conkey = array[category_id_attnum, category_user_id_attnum]::smallint[]
  ) then
    if exists (
      select 1
      from pg_constraint
      where conname = 'categories_id_user_id_key'
        and conrelid = 'public.categories'::regclass
    ) then
      raise exception 'Constraint categories_id_user_id_key exists with an unexpected definition.';
    end if;

    execute 'alter table public.categories add constraint categories_id_user_id_key unique (id, user_id)';
  end if;
end;
$category_owner_key$;

do $transaction_category_owner_fk$
declare
  constraint_name text;
  transaction_category_id_attnum smallint;
  transaction_user_id_attnum smallint;
  category_id_attnum smallint;
  category_user_id_attnum smallint;
begin
  select attnum into transaction_category_id_attnum
  from pg_attribute
  where attrelid = 'public.transactions'::regclass
    and attname = 'category_id'
    and not attisdropped;

  select attnum into transaction_user_id_attnum
  from pg_attribute
  where attrelid = 'public.transactions'::regclass
    and attname = 'user_id'
    and not attisdropped;

  select attnum into category_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'id'
    and not attisdropped;

  select attnum into category_user_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'user_id'
    and not attisdropped;

  if transaction_category_id_attnum is null
    or transaction_user_id_attnum is null
    or category_id_attnum is null
    or category_user_id_attnum is null
  then
    raise exception 'Cannot enforce transaction category ownership: required columns are missing.';
  end if;

  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and confrelid = 'public.categories'::regclass
      and contype = 'f'
      and conkey in (
        array[transaction_category_id_attnum]::smallint[],
        array[transaction_category_id_attnum, transaction_user_id_attnum]::smallint[]
      )
      and not (
        conkey = array[transaction_category_id_attnum, transaction_user_id_attnum]::smallint[]
        and confkey = array[category_id_attnum, category_user_id_attnum]::smallint[]
        and confdeltype = 'r'
      )
  loop
    execute format(
      'alter table public.transactions drop constraint %I',
      constraint_name
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and confrelid = 'public.categories'::regclass
      and contype = 'f'
      and conkey = array[transaction_category_id_attnum, transaction_user_id_attnum]::smallint[]
      and confkey = array[category_id_attnum, category_user_id_attnum]::smallint[]
      and confdeltype = 'r'
  ) then
    if exists (
      select 1
      from pg_constraint
      where conname = 'transactions_category_owner_fkey'
        and conrelid = 'public.transactions'::regclass
    ) then
      raise exception 'Constraint transactions_category_owner_fkey exists with an unexpected definition.';
    end if;

    execute $ddl$
      alter table public.transactions
        add constraint transactions_category_owner_fkey
        foreign key (category_id, user_id)
        references public.categories(id, user_id)
        on delete restrict
    $ddl$;
  end if;
end;
$transaction_category_owner_fk$;

do $category_parent_owner_fk$
declare
  constraint_name text;
  category_parent_id_attnum smallint;
  category_user_id_attnum smallint;
  category_id_attnum smallint;
begin
  select attnum into category_parent_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'parent_id'
    and not attisdropped;

  select attnum into category_user_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'user_id'
    and not attisdropped;

  select attnum into category_id_attnum
  from pg_attribute
  where attrelid = 'public.categories'::regclass
    and attname = 'id'
    and not attisdropped;

  if category_parent_id_attnum is null
    or category_user_id_attnum is null
    or category_id_attnum is null
  then
    raise exception 'Cannot enforce category parent ownership: required columns are missing.';
  end if;

  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and confrelid = 'public.categories'::regclass
      and contype = 'f'
      and conkey in (
        array[category_parent_id_attnum]::smallint[],
        array[category_parent_id_attnum, category_user_id_attnum]::smallint[]
      )
      and not (
        conkey = array[category_parent_id_attnum, category_user_id_attnum]::smallint[]
        and confkey = array[category_id_attnum, category_user_id_attnum]::smallint[]
        and confdeltype = 'r'
      )
  loop
    execute format(
      'alter table public.categories drop constraint %I',
      constraint_name
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and confrelid = 'public.categories'::regclass
      and contype = 'f'
      and conkey = array[category_parent_id_attnum, category_user_id_attnum]::smallint[]
      and confkey = array[category_id_attnum, category_user_id_attnum]::smallint[]
      and confdeltype = 'r'
  ) then
    if exists (
      select 1
      from pg_constraint
      where conname = 'categories_parent_owner_fkey'
        and conrelid = 'public.categories'::regclass
    ) then
      raise exception 'Constraint categories_parent_owner_fkey exists with an unexpected definition.';
    end if;

    execute $ddl$
      alter table public.categories
        add constraint categories_parent_owner_fkey
        foreign key (parent_id, user_id)
        references public.categories(id, user_id)
        on delete restrict
    $ddl$;
  end if;
end;
$category_parent_owner_fk$;
