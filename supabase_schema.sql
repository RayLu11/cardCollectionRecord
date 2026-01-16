-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for cards
-- FIXED SCHEMA: No custom attributes allowed per requirements.
create table cards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  set_name text,
  condition text check (condition in ('Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table cards enable row level security;

create policy "Cards are viewable by everyone." on cards
  for select using (true);

create policy "Users can insert their own cards." on cards
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own cards." on cards
  for update using (auth.uid() = user_id);

create policy "Users can delete their own cards." on cards
  for delete using (auth.uid() = user_id);

-- Set up Storage
insert into storage.buckets (id, name)
  values ('card-images', 'card-images');

create policy "Card images are publicly accessible." on storage.objects
  for select using (bucket_id = 'card-images');

create policy "Users can upload card images." on storage.objects
  for insert with check (bucket_id = 'card-images' and auth.uid() = owner);

create policy "Users can update their own card images." on storage.objects
  for update using (bucket_id = 'card-images' and auth.uid() = owner);
