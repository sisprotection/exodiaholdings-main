import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listMyLoveNotes } from "@/lib/heir.functions";
import { Heart, Sparkles, Home } from "lucide-react";
import sealUrl from "@/assets/hall-seal.jpg";

export const Route = createFileRoute("/_authenticated/for-khadija")({
  head: () => ({ meta: [{ title: "For Khadija 💛" }] }),
  component: ForKhadijaPage,
});

function ForKhadijaPage() {
  const fetchNotes = useServerFn(listMyLoveNotes);

  const { data: notes = [] } = useQuery({
    queryKey: ["my-love-notes"],
    queryFn: () => fetchNotes(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["heir-visible-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, nickname, city, state, property_type, asset_class, notes, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["heir-photos", properties.map((p) => p.id).join(",")],
    enabled: properties.length > 0,
    queryFn: async () => {
      const ids = properties.map((p) => p.id);
      const { data, error } = await supabase
        .from("property_photos")
        .select("id, property_id, storage_path")
        .in("property_id", ids)
        .order("sort_order");
      if (error) throw error;
      const paths = (data ?? []).map((p) => p.storage_path);
      if (paths.length === 0) return [];
      const { data: signed } = await supabase.storage.from("property-photos").createSignedUrls(paths, 3600);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return (data ?? []).map((p) => ({ ...p, url: map.get(p.storage_path) ?? "" }));
    },
  });

  const firstPhotoFor = (propertyId: string) =>
    photos.find((p) => p.property_id === propertyId)?.url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-rose-950/10">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex flex-col items-center text-center">
          <img src={sealUrl} alt="Hall family seal" className="size-28 rounded-full border-2 border-gold/40 object-cover gold-glow" />
          <p className="mt-6 text-xs uppercase tracking-[0.4em] text-rose-300/80">A Letter from Daddy</p>
          <h1 className="mt-3 font-display text-4xl text-gold-soft sm:text-5xl">
            Khadija, this is all for you.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Every brick. Every key. Every plan. Daddy is building this so that one day you walk into
            your future already standing on a foundation of love.
          </p>
        </header>

        <div className="gold-rule mx-auto mt-10 w-full max-w-md" />

        {/* Love notes */}
        <section className="mt-12">
          <h2 className="flex items-center justify-center gap-2 font-display text-2xl text-gold-soft">
            <Heart className="size-5 text-rose-300" /> Notes from Daddy
          </h2>
          {notes.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Daddy hasn't written a note yet — but he's thinking about you right now. 💛
            </p>
          ) : (
            <ul className="mt-6 space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="rounded-2xl border border-rose-400/20 bg-card/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-xl text-gold-soft">{n.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Visible properties */}
        <section className="mt-14">
          <h2 className="flex items-center justify-center gap-2 font-display text-2xl text-gold-soft">
            <Sparkles className="size-5 text-gold" /> What Daddy is building
          </h2>
          {properties.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Daddy will share things here as soon as they're ready for you to see.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {properties.map((p) => {
                const photo = firstPhotoFor(p.id);
                return (
                  <article key={p.id} className="overflow-hidden rounded-2xl border border-gold/20 bg-card/80">
                    {photo ? (
                      <img src={photo} alt={p.nickname || "Family property"} className="h-44 w-full object-cover" />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-secondary/40">
                        <Home className="size-10 text-gold/50" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display text-xl text-gold-soft">
                        {p.nickname || `A ${p.property_type} in ${p.city}`}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {p.city}, {p.state}
                      </p>
                      {p.notes && (
                        <p className="mt-3 text-sm text-foreground/80 line-clamp-3">{p.notes}</p>
                      )}
                      <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Last updated {new Date(p.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Daddy loves you, Khadija. Always. 💛
        </footer>
      </div>
    </div>
  );
}
