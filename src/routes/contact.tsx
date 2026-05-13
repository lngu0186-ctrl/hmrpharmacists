import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  component: Contact,
  head: () => ({
    meta: [
      { title: "Contact — HMR Pharmacist Exchange" },
      { name: "description", content: "Get in touch with the HMR Pharmacist Exchange team." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold">Contact us</h1>
        <p className="mt-3 text-muted-foreground">For platform questions, partnership enquiries, or feedback. For clinical questions, please speak with your healthcare provider.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <Item icon={<Mail className="h-4 w-4" />} title="Email" body="hello@hmrpharmacists.com.au" />
            <Item icon={<MessageSquare className="h-4 w-4" />} title="Response time" body="We aim to respond within 2 business days." />
          </div>

          <form className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); toast.success("Thanks — we'll be in touch."); }}>
            <div><Label className="text-xs">Name</Label><Input className="mt-1.5" required /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" className="mt-1.5" required /></div>
            <div><Label className="text-xs">Message</Label><Textarea className="mt-1.5 min-h-32" required /></div>
            <Button type="submit" disabled={submitted}>{submitted ? "Sent" : "Send message"}</Button>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}

function Item({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
