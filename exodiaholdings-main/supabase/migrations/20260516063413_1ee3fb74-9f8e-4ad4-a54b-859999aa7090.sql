
-- 1. asset_class enum + column
do $$ begin
  create type public.asset_class as enum ('real_estate','digital','business','vehicle','financial','collectible','other');
exception when duplicate_object then null; end $$;

alter table public.properties
  add column if not exists asset_class public.asset_class not null default 'other';

update public.properties set asset_class = case property_type
  when 'house' then 'real_estate'::public.asset_class
  when 'condo' then 'real_estate'::public.asset_class
  when 'land' then 'real_estate'::public.asset_class
  when 'commercial' then 'real_estate'::public.asset_class
  when 'website' then 'digital'::public.asset_class
  when 'domain' then 'digital'::public.asset_class
  when 'intellectual_property' then 'digital'::public.asset_class
  when 'business' then 'business'::public.asset_class
  when 'vehicle' then 'vehicle'::public.asset_class
  when 'financial_account' then 'financial'::public.asset_class
  when 'collectible' then 'collectible'::public.asset_class
  when 'equipment' then 'business'::public.asset_class
  else 'other'::public.asset_class
end;

-- 2. payments ledger
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payments_property_idx on public.payments(property_id, paid_on);

alter table public.payments enable row level security;

create policy "Owners manage payments"
  on public.payments for all to authenticated
  using (exists (select 1 from public.properties p where p.id = payments.property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = payments.property_id and p.owner_id = auth.uid()));

create policy "View payments for accessible properties"
  on public.payments for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = payments.property_id
      and (p.owner_id = auth.uid() or public.has_role(auth.uid(), 'trustee'::public.app_role))
  ));
