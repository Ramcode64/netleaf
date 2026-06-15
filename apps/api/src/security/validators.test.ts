import { describe, it, expect } from "vitest";
import { isSafeRegexPattern, httpUrl } from "./validators.js";

describe("isSafeRegexPattern", () => {
  it("allows simple patterns", () => {
    expect(isSafeRegexPattern("/admin")).toBe(true);
    expect(isSafeRegexPattern("\\.(pdf|zip)$")).toBe(true);
    expect(isSafeRegexPattern("^https://example\\.com")).toBe(true);
  });

  it("rejects patterns longer than 200 chars", () => {
    expect(isSafeRegexPattern("a".repeat(201))).toBe(false);
  });

  it("rejects nested quantifiers — (a+)+", () => {
    expect(isSafeRegexPattern("(a+)+")).toBe(false);
    expect(isSafeRegexPattern("([a-z]+)*")).toBe(false);
    expect(isSafeRegexPattern("(.*){2,}")).toBe(false);
  });

  it("rejects alternation + quantifier — (a|aa)+", () => {
    expect(isSafeRegexPattern("(a|aa)+")).toBe(false);
    expect(isSafeRegexPattern("(a|a?)+")).toBe(false);
    expect(isSafeRegexPattern("([a-z]+|[A-Z]+)*")).toBe(false);
    expect(isSafeRegexPattern("(foo|bar)+")).toBe(false);
  });

  it("rejects consecutive quantifiers — a++", () => {
    expect(isSafeRegexPattern("a++")).toBe(false);
    expect(isSafeRegexPattern("a+?")).toBe(false);
  });

  it("rejects invalid regex syntax", () => {
    expect(isSafeRegexPattern("[unclosed")).toBe(false);
    expect(isSafeRegexPattern("(unclosed")).toBe(false);
  });
});

describe("httpUrl", () => {
  it("accepts http and https URLs", () => {
    const schema = httpUrl();
    expect(schema.safeParse("https://example.com").success).toBe(true);
    expect(schema.safeParse("http://example.com/path?q=1").success).toBe(true);
  });

  it("rejects non-http(s) schemes", () => {
    const schema = httpUrl();
    expect(schema.safeParse("file:///etc/passwd").success).toBe(false);
    expect(schema.safeParse("ftp://example.com").success).toBe(false);
    expect(schema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(schema.safeParse("data:text/html,<h1>x</h1>").success).toBe(false);
  });

  it("rejects non-URLs", () => {
    const schema = httpUrl();
    expect(schema.safeParse("not-a-url").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });
});
