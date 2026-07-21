create index if not exists business_members_invited_by_idx
  on public.business_members(invited_by)
  where invited_by is not null;
