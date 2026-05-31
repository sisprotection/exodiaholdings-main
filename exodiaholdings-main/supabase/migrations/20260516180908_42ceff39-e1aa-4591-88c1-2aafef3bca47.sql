-- Per-user recovery record
CREATE TABLE public.vault_recovery (
  user_id uuid PRIMARY KEY,
  id_path text NOT NULL,
  selfie_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_recovery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recovery record"
  ON public.vault_recovery FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER vault_recovery_touch
  BEFORE UPDATE ON public.vault_recovery
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Private bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('vault-recovery', 'vault-recovery', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Recovery files: user reads own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault-recovery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Recovery files: user writes own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault-recovery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Recovery files: user updates own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vault-recovery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Recovery files: user deletes own folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault-recovery' AND auth.uid()::text = (storage.foldername(name))[1]);