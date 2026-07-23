drop policy if exists ai_preferences_owner_select on public.ai_preferences;
drop policy if exists ai_preferences_owner_insert on public.ai_preferences;
drop policy if exists ai_preferences_owner_update on public.ai_preferences;
drop policy if exists ai_preferences_owner_delete on public.ai_preferences;

create policy ai_preferences_owner_select
  on public.ai_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_preferences_owner_insert
  on public.ai_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy ai_preferences_owner_update
  on public.ai_preferences
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ai_preferences_owner_delete
  on public.ai_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
