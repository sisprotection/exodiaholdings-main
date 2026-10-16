-- Make property-photos bucket private
update storage.buckets set public = false where id = 'property-photos';

-- Replace permissive photo read policy with owner/trustee only
drop policy if exists "Public read property photos" on storage.objects;
drop policy if exists "Owner upload property photos" on storage.objects;
drop policy if exists "Owner delete property photos" on storage.objects;

create policy "Owner trustee read property photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'property-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role(auth.uid(), 'trustee')
    )
  );

create policy "Owner upload property photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner delete property photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lock down user_roles: deny any client-side modifications. Only service_role
-- (and SECURITY DEFINER functions like handle_new_user) may modify.
create policy "No client inserts on user_roles" on public.user_roles
  for insert to authenticated, anon with check (false);
create policy "No client updates on user_roles" on public.user_roles
  for update to authenticated, anon using (false) with check (false);
create policy "No client deletes on user_roles" on public.user_roles
  for delete to authenticated, anon using (false);
