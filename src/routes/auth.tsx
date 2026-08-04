import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Panel } from "@/components/game/ui";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Anmelden – Legends Grid Online" },
      { name: "description", content: "Melde dich an, übernimm ein Team in einer Liga mit 20 Teams und fahre stündliche Live-Rennen." },
      { property: "og:title", content: "Anmelden – Legends Grid Online" },
      { property: "og:description", content: "Konto anlegen, Liga beitreten und stündliche Live-Rennen fahren." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/online", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/online` },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Bestätigungsmail verschickt – bitte Link im Postfach anklicken.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/online", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/online` });
    if (result.error) {
      toast.error("Google-Anmeldung fehlgeschlagen");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/online", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-4">
      <h1 className="font-display text-3xl font-bold uppercase">Legends Grid Online</h1>
      <Panel title={mode === "login" ? "Anmelden" : "Konto erstellen"}>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            Prüfe dein Postfach und klicke den Bestätigungslink. Danach kannst du dich anmelden.
          </p>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <label className="label-xs" htmlFor="email">E-Mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2"
              />
            </div>
            <div>
              <label className="label-xs" htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2"
              />
            </div>
            <Button variant="primary" disabled={busy}>{mode === "login" ? "Anmelden" : "Registrieren"}</Button>
          </form>
        )}
        <div className="mt-3 space-y-2">
          <Button variant="ghost" onClick={google}>Mit Google anmelden</Button>
          <button
            className="block text-xs text-muted-foreground underline"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setSent(false); }}
          >
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
          </button>
          <Link to="/" className="block text-xs text-muted-foreground underline">Zurück zur Solo-Karriere</Link>
        </div>
      </Panel>
    </main>
  );
}
