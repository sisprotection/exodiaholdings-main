import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recoverVault } from "@/lib/vaultRecovery.functions";
import { toast } from "sonner";
import { Camera, ShieldCheck, ShieldAlert, Upload, X } from "lucide-react";
import { lockVault } from "@/lib/vaultCrypto";

async function fileToDataUrl(file: File | Blob): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

// =================== SETUP (inside unlocked vault) ===================

export function RecoverySetupCard() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: rec, isLoading } = useQuery({
    queryKey: ["vault-recovery", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("vault_recovery").select("*").maybeSingle();
      return data;
    },
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;
    const fd = new FormData(e.currentTarget);
    const idFile = fd.get("id_image") as File | null;
    const selfieFile = fd.get("selfie_image") as File | null;
    if (!idFile?.size || !selfieFile?.size) { toast.error("Please attach both your ID and a selfie"); return; }
    setBusy(true);
    try {
      const idPath = `${userId}/id-${Date.now()}.${idFile.name.split(".").pop() || "jpg"}`;
      const selfiePath = `${userId}/selfie-${Date.now()}.${selfieFile.name.split(".").pop() || "jpg"}`;
      const up1 = await supabase.storage.from("vault-recovery").upload(idPath, idFile, { upsert: true });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from("vault-recovery").upload(selfiePath, selfieFile, { upsert: true });
      if (up2.error) throw up2.error;
      const { error } = await supabase.from("vault_recovery").upsert({
        user_id: userId, id_path: idPath, selfie_path: selfiePath,
      });
      if (error) throw error;
      toast.success("Recovery armed — you can now reset your passphrase with a selfie");
      qc.invalidateQueries({ queryKey: ["vault-recovery", userId] });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save recovery");
    } finally { setBusy(false); }
  };

  if (isLoading) return null;

  return (
    <section className="mt-10 rounded-lg border border-gold/30 bg-card p-6">
      <div className="flex items-start gap-3">
        {rec ? <ShieldCheck className="size-5 text-gold" /> : <ShieldAlert className="size-5 text-destructive" />}
        <div className="flex-1">
          <h2 className="font-display text-xl text-gold-soft">Face + ID Recovery</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a photo of your government ID and a clear selfie. If you ever forget your passphrase, you can verify with a live selfie and reset.
            {" "}
            <strong className="text-foreground">A successful reset permanently wipes your encrypted entries</strong> — the key is gone forever, no one can decrypt the old data. This is the privacy tradeoff for true zero-knowledge.
          </p>
          {rec && (
            <p className="mt-2 text-xs uppercase tracking-wider text-gold">Recovery is currently armed.</p>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground hover:border-gold">
          <span className="block uppercase tracking-wider text-[10px] text-gold">Government ID photo</span>
          <input name="id_image" type="file" accept="image/*" required className="mt-1 w-full text-xs" />
        </label>
        <label className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground hover:border-gold">
          <span className="block uppercase tracking-wider text-[10px] text-gold">Reference selfie</span>
          <input name="selfie_image" type="file" accept="image/*" capture="user" required className="mt-1 w-full text-xs" />
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            <Upload className="size-3.5" /> {busy ? "Saving…" : rec ? "Replace Recovery Images" : "Arm Recovery"}
          </button>
        </div>
      </form>
    </section>
  );
}

// =================== RECOVERY (from lock screen) ===================

export function RecoveryDialogButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-3 w-full text-center text-xs uppercase tracking-wider text-muted-foreground underline-offset-4 hover:text-gold hover:underline">
        Forgot passphrase? Recover with ID + Selfie
      </button>
      {open && <RecoveryDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function RecoveryDialog({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<"camera" | "verifying" | "matched" | "failed">("camera");
  const [reason, setReason] = useState<string>("");
  const recover = useServerFn(recoverVault);

  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      } catch {
        setPhase("failed"); setReason("Camera access denied. Allow camera permission and try again.");
      }
    })();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = async () => {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.85));
    const dataUrl = await fileToDataUrl(blob);
    setPhase("verifying");
    try {
      const result = await recover({ data: { liveSelfieDataUrl: dataUrl } });
      if (result.matched) {
        lockVault();
        setPhase("matched"); setReason(result.reason);
      } else {
        setPhase("failed"); setReason(result.reason);
      }
    } catch (err: any) {
      setPhase("failed"); setReason(err?.message ?? "Verification failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg rounded-lg border border-gold/40 bg-card p-6 gold-glow">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-gold-soft">Identity Recovery</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>

        {phase === "camera" && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Position your face in the frame. We'll compare it to your stored ID and selfie.</p>
            <div className="mt-4 overflow-hidden rounded-md border border-border bg-black">
              <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
            </div>
            <button onClick={capture} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow">
              <Camera className="size-4" /> Capture & Verify
            </button>
          </>
        )}
        {phase === "verifying" && <p className="mt-6 text-center text-sm text-muted-foreground">Verifying identity…</p>}
        {phase === "matched" && (
          <div className="mt-4 rounded-md border border-gold/40 bg-gold/5 p-4 text-sm">
            <p className="text-gold-soft"><ShieldCheck className="mr-1 inline size-4" /> Identity confirmed.</p>
            <p className="mt-2 text-muted-foreground">{reason}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground">Set a new passphrase</button>
          </div>
        )}
        {phase === "failed" && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="text-destructive"><ShieldAlert className="mr-1 inline size-4" /> Could not verify.</p>
            <p className="mt-2 text-muted-foreground">{reason}</p>
            <button onClick={() => { setPhase("camera"); setReason(""); }} className="mt-4 w-full rounded-md border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-gold">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
