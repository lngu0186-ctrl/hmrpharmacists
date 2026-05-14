import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown / safeHref", () => {
  it("renders headings, lists, paragraphs", () => {
    const html = renderMarkdown("# Title\n\nHello **world**\n\n- a\n- b");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain("<li>a</li>");
  });

  it("escapes HTML in content", () => {
    const html = renderMarkdown("Hello <script>alert(1)</script>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("blocks javascript: URLs", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).toMatch(/href="#"/);
  });

  it("blocks data: URLs", () => {
    const html = renderMarkdown("[x](data:text/html,<script>1</script>)");
    expect(html).not.toMatch(/href="data:/i);
  });

  it("allows http(s), mailto, tel, anchor, relative", () => {
    expect(renderMarkdown("[a](https://example.com)")).toContain('href="https://example.com"');
    expect(renderMarkdown("[a](mailto:x@y.com)")).toContain('href="mailto:x@y.com"');
    expect(renderMarkdown("[a](tel:+61400000000)")).toContain('href="tel:+61400000000"');
    expect(renderMarkdown("[a](/find)")).toContain('href="/find"');
    expect(renderMarkdown("[a](#section)")).toContain('href="#section"');
  });
});
