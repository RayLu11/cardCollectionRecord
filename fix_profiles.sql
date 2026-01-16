-- 1. Fix missing profiles for existing users
-- This inserts a profile row for any user that exists in auth.users but not in public.profiles
INSERT INTO public.profiles (id, username)
SELECT id, COALESCE(raw_user_meta_data->>'username', email) -- Fallback to email if username is missing
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Create a Trigger to automatically create a profile on Sign Up
-- This is the "Supabase Best Practice" and avoids client-side RLS issues completely.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, COALESCE(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'email', 'User'));
  return new;
end;
$$;

-- Drop trigger if it exists to avoid errors
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
