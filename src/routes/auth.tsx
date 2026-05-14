import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — HMR Pharmacist Exchange" },
      {
        name: "description",
        content: "Sign in or create your account on HMR Pharmacist Exchange.",
      },
      { property: "og:url", content: "/auth" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { display_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account.");
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-elevated">
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in or create your HMR Pharmacist Exchange account.
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-6 space-y-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <Field label="Display name" value={name} onChange={setName} />
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Password" type="password" value={password} onChange={setPassword} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating…" : "Create account"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  By creating an account you agree to our terms and privacy policy.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
