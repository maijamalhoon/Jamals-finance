begin;

create table if not exists public.notification_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_id),
  constraint notification_states_id_length_check
    check (char_length(notification_id) between 1 and 240)
);

create index if not exists notification_states_user_snoozed_idx
  on public.notification_states(user_id, snoozed_until)
  where snoozed_until is not null;

alter table public.notification_states enable row level security;

create policy "Users can read their notification states"
  on public.notification_states
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their notification states"
  on public.notification_states
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their notification states"
  on public.notification_states
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their notification states"
  on public.notification_states
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_alerts_enabled boolean not null default true,
  payable_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can read their notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.notification_states from anon;
revoke all on table public.notification_preferences from anon;
grant select, insert, update, delete on table public.notification_states to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;

drop trigger if exists notification_states_touch_updated_at
  on public.notification_states;
create trigger notification_states_touch_updated_at
before update on public.notification_states
for each row execute function public.touch_updated_at();

drop trigger if exists notification_preferences_touch_updated_at
  on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
before update on public.notification_preferences
for each row execute function public.touch_updated_at();

commit;
