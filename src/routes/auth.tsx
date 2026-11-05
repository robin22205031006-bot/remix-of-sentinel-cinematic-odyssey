import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string; banned?: string } => ({ ...(typeof s["next"] === "string" ? { next: s["next"] } : {}), ...(typeof s["banned"] === "string" ? { banned: s["banned"] } : {}) }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Admin sign in — SCU" },
      { name: "description", content: "Sign in to manage the SCU archive." },
      { property: "og:title", content: "Admin sign in — SCU" },
      { property: "og:description", content: "Sign in to manage the SCU archive." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { next: rawNext } = Route.useSearch();
  const next = oauthReturnPath(rawNext);
  const hasNext = rawNext !== undefined && next !== "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (hasNext) window.location.assign(next);
      else nav({ to: "/characters" });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: new URL("/auth", window.location.origin).href + (hasNext ? `?next=${encodeURIComponent(next)}` : "") } });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email to confirm your account.");
    }
    } catch {
      toast.error("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-4xl font-medium">{mode === "in" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-8 grid gap-4">
        <div className="grid gap-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button disabled={busy}>{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-muted-foreground hover:text-foreground">
        {mode === "in" ? "First time? Create your account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
