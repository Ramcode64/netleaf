import { describe, it, expect } from "vitest";
import { htmlToMarkdown, htmlToText, extractMetadata } from "./markdown.js";

const sampleHtml = `
<html lang="en">
  <head>
    <title>Test Page</title>
    <meta name="description" content="A test description" />
  </head>
  <body>
    <nav>Navigation stuff</nav>
    <main>
      <h1>Hello World</h1>
      <p>This is a paragraph with <strong>bold</strong> text.</p>
      <ul><li>Item 1</li><li>Item 2</li></ul>
      <pre><code>const x = 1;</code></pre>
    </main>
    <footer>Footer stuff</footer>
    <script>alert('should be removed')</script>
  </body>
</html>
`;

describe("htmlToMarkdown", () => {
  it("converts headings", () => {
    const md = htmlToMarkdown(sampleHtml);
    expect(md).toContain("# Hello World");
  });

  it("converts bold text", () => {
    const md = htmlToMarkdown(sampleHtml);
    expect(md).toContain("**bold**");
  });

  it("removes nav and footer", () => {
    const md = htmlToMarkdown(sampleHtml);
    expect(md).not.toContain("Navigation stuff");
    expect(md).not.toContain("Footer stuff");
  });

  it("removes script tags", () => {
    const md = htmlToMarkdown(sampleHtml);
    expect(md).not.toContain("alert");
  });

  it("converts code blocks", () => {
    const md = htmlToMarkdown(sampleHtml);
    expect(md).toContain("const x = 1;");
  });
});

describe("htmlToText", () => {
  it("returns plain text without tags", () => {
    const text = htmlToText(sampleHtml);
    expect(text).toContain("Hello World");
    expect(text).not.toContain("<h1>");
  });
});

describe("extractMetadata", () => {
  it("extracts title and description", () => {
    const meta = extractMetadata(sampleHtml, "https://example.com");
    expect(meta.title).toBe("Test Page");
    expect(meta.description).toBe("A test description");
    expect(meta.language).toBe("en");
  });
});
