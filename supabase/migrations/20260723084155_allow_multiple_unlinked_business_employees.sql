alter table public.business_employees
  drop constraint business_employees_member_key;

create unique index business_employees_member_key
  on public.business_employees(business_id,member_user_id)
  where member_user_id is not null;
