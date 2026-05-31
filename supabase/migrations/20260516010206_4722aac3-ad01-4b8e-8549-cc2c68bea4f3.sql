
-- Roles
create type public.app_role as enum ('owner', 'trustee');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles viewable by owner or trustee" on public.profiles
  for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'trustee'));
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile + assign 'owner' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enums
create type public.property_type as enum ('house', 'land', 'commercial', 'other');
create type public.property_status as enum ('owned_outright', 'financing', 'sold');
create type public.doc_type as enum ('deed', 'contract', 'receipt', 'insurance', 'tax', 'other');

-- Properties
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  address_line1 text not null,
  city text not null,
  state text not null,
  zip text not null,
  property_type property_type not null default 'house',
  status property_status not null default 'financing',
  purchase_price numeric(14,2),
  total_owed numeric(14,2) not null default 0,
  monthly_payment numeric(14,2) not null default 0,
  payment_start_date date,
  payment_day_of_month int check (payment_day_of_month between 1 and 31),
  interest_rate numeric(6,4) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.properties enable row level security;

create policy "Owners and trustees can view properties" on public.properties
  for select to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(), 'trustee'));
create policy "Owners can insert properties" on public.properties
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners can update properties" on public.properties
  for update to authenticated using (auth.uid() = owner_id);
create policy "Owners can delete properties" on public.properties
  for delete to authenticated using (auth.uid() = owner_id);

-- Photos
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.property_photos enable row level security;

create policy "View photos for accessible properties" on public.property_photos
  for select to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id
      and (p.owner_id = auth.uid() or public.has_role(auth.uid(), 'trustee')))
  );
create policy "Owners manage photos" on public.property_photos
  for all to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

-- Documents
create table public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  doc_type doc_type not null default 'other',
  uploaded_at timestamptz not null default now()
);
alter table public.property_documents enable row level security;

create policy "View docs for accessible properties" on public.property_documents
  for select to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id
      and (p.owner_id = auth.uid() or public.has_role(auth.uid(), 'trustee')))
  );
create policy "Owners manage docs" on public.property_documents
  for all to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

-- Co-owners
create table public.co_owners (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  relationship text,
  share_percent numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.co_owners enable row level security;
create policy "View co-owners for accessible properties" on public.co_owners
  for select to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id
      and (p.owner_id = auth.uid() or public.has_role(auth.uid(), 'trustee')))
  );
create policy "Owners manage co-owners" on public.co_owners
  for all to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

-- Sale records
create table public.sale_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  buyer_name text not null,
  sale_date date not null,
  sale_price numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.sale_records enable row level security;
create policy "View sale records for accessible properties" on public.sale_records
  for select to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id
      and (p.owner_id = auth.uid() or public.has_role(auth.uid(), 'trustee')))
  );
create policy "Owners manage sale records" on public.sale_records
  for all to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger properties_updated_at before update on public.properties
  for each row execute function public.touch_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Storage buckets
insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('property-documents', 'property-documents', false)
  on conflict (id) do nothing;

-- Photo storage policies (public read, owner write under user-id folder)
create policy "Public read property photos" on storage.objects
  for select using (bucket_id = 'property-photos');
create policy "Authenticated can upload own property photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Authenticated can update own property photos" on storage.objects
  for update to authenticated using (
    bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Authenticated can delete own property photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Document storage policies (owner full access, trustee read)
create policy "Owner read own documents" on storage.objects
  for select to authenticated using (
    bucket_id = 'property-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'trustee'))
  );
create policy "Owner upload own documents" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'property-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owner update own documents" on storage.objects
  for update to authenticated using (
    bucket_id = 'property-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owner delete own documents" on storage.objects
  for delete to authenticated using (
    bucket_id = 'property-documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
