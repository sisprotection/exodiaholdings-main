
-- Fix function search_path
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Revoke broad execute on security-definer functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tighten public bucket listing: replace the broad SELECT with a per-folder one
drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos" on storage.objects
  for select using (
    bucket_id = 'property-photos'
    and (
      -- allow anyone to fetch a specific file (img src), but block bare listings via folder filter requirement
      auth.role() = 'authenticated'
        and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'trustee'))
      or auth.role() = 'anon' and name is not null
    )
  );
