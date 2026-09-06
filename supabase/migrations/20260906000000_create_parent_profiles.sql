create or replace function public.create_parent_profile_for_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'parent'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case
          when nullif(trim(public.profiles.full_name), '') is null then excluded.full_name
          else public.profiles.full_name
        end;

  return new;
end;
$$;

revoke execute on function public.create_parent_profile_for_auth_user() from public;

drop trigger if exists on_auth_user_created_create_parent_profile on auth.users;
create trigger on_auth_user_created_create_parent_profile
after insert on auth.users
for each row execute procedure public.create_parent_profile_for_auth_user();

drop trigger if exists on_auth_user_confirmed_create_parent_profile on auth.users;
create trigger on_auth_user_confirmed_create_parent_profile
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null)
execute procedure public.create_parent_profile_for_auth_user();

insert into public.profiles (id, email, full_name, role)
select
  users.id,
  users.email,
  coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(users.raw_user_meta_data ->> 'name'), ''),
    split_part(users.email, '@', 1)
  ),
  'parent'
from auth.users as users
where users.email is not null
on conflict (id) do nothing;
