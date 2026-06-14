import { describe, it, expect, beforeEach } from "vitest";
import { assertPublicUrl, SsrfError } from "./ssrf.js";

describe("assertPublicUrl — SSRF egress guard", () => {
  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_IPS;
  });

  describe("blocked schemes", () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://example.com/x",
      "gopher://example.com/x",
      "data:text/html,<script>1</script>",
    ]) {
      it(`rejects ${url}`, async () => {
        await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(SsrfError);
      });
    }
  });

  describe("blocked IP literals (no DNS needed)", () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",   // AWS/GCP metadata
      "http://127.0.0.1:5432/",                       // loopback
      "http://localhost.localdomain/",                // (resolves loopback on most hosts)
      "http://10.0.0.5/",                             // private
      "http://172.16.0.1/",                           // private
      "http://192.168.1.1/",                          // private
      "http://100.64.0.1/",                           // CGNAT
      "http://0.0.0.0/",                              // unspecified
      "http://[::1]/",                                // ipv6 loopback
      "http://[fd00::1]/",                            // ipv6 ULA
      "http://[fe80::1]/",                            // ipv6 link-local
      "http://[::ffff:169.254.169.254]/",             // ipv4-mapped metadata
    ]) {
      it(`rejects ${url}`, async () => {
        await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(SsrfError);
      });
    }
  });

  describe("allowed public IP literals", () => {
    for (const url of ["http://8.8.8.8/", "https://1.1.1.1/"]) {
      it(`allows ${url}`, async () => {
        const u = await assertPublicUrl(url);
        expect(u.protocol).toMatch(/^https?:$/);
      });
    }
  });

  describe("ALLOW_PRIVATE_IPS bypass", () => {
    it("permits loopback when explicitly enabled, but still blocks non-http schemes", async () => {
      process.env.ALLOW_PRIVATE_IPS = "true";
      await expect(assertPublicUrl("http://127.0.0.1:3000/")).resolves.toBeInstanceOf(URL);
      await expect(assertPublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfError);
    });
  });

  it("rejects malformed URLs", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toBeInstanceOf(SsrfError);
  });
});
