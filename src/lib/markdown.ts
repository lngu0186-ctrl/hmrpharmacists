// Tiny markdown subset renderer (no deps) — headings, paragraphs, bold/italic/links, lists.
function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s: string) {
  return escape(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline-offset-4 hover:underline">$1</a>');
}
export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^###\s+(.+)/))) { closeList(); out.push(`<h3 class="mt-6 text-lg font-semibold">${inline(m[1])}</h3>`); }
    else if ((m = line.match(/^##\s+(.+)/))) { closeList(); out.push(`<h2 class="mt-8 text-2xl font-semibold tracking-tight">${inline(m[1])}</h2>`); }
    else if ((m = line.match(/^#\s+(.+)/))) { closeList(); out.push(`<h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">${inline(m[1])}</h1>`); }
    else if ((m = line.match(/^[-*]\s+(.+)/))) {
      if (!inList) { out.push('<ul class="my-4 ml-6 list-disc space-y-1.5 text-muted-foreground">'); inList = true; }
      out.push(`<li>${inline(m[1])}</li>`);
    }
    else { closeList(); out.push(`<p class="my-4 leading-relaxed text-muted-foreground">${inline(line)}</p>`); }
  }
  closeList();
  return out.join("\n");
}
