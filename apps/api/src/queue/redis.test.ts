import { describe, it, expect } from "vitest";
import { buildRedisConnection } from "./redis.js";

describe("buildRedisConnection", () => {
  it("parses a localhost URL", () => {
    const c = buildRedisConnection("redis://localhost:6379") as Record<string, unknown>;
    expect(c.host).toBe("localhost");
    expect(c.port).toBe(6379);
    expect(c.maxRetriesPerRequest).toBeNull();
  });

  it("parses a docker compose service-name URL", () => {
    const c = buildRedisConnection("redis://redis:6379") as Record<string, unknown>;
    expect(c.host).toBe("redis");
    expect(c.port).toBe(6379);
  });

  it("defaults to port 6379 when omitted", () => {
    const c = buildRedisConnection("redis://myhost") as Record<string, unknown>;
    expect(c.host).toBe("myhost");
    expect(c.port).toBe(6379);
  });

  it("extracts a password from an authenticated URL", () => {
    const c = buildRedisConnection("redis://:s3cr3t@host:6380") as Record<string, unknown>;
    expect(c.host).toBe("host");
    expect(c.port).toBe(6380);
    expect(c.password).toBe("s3cr3t");
  });

  it("extracts username and password", () => {
    const c = buildRedisConnection("redis://user:pass@host:6379") as Record<string, unknown>;
    expect(c.username).toBe("user");
    expect(c.password).toBe("pass");
  });

  it("url-decodes special characters in the password", () => {
    const c = buildRedisConnection("redis://:p%40ss%3Aword@host:6379") as Record<string, unknown>;
    expect(c.password).toBe("p@ss:word");
  });

  it("enables TLS for rediss:// URLs", () => {
    const c = buildRedisConnection("rediss://secure:6380") as Record<string, unknown>;
    expect(c.tls).toEqual({});
  });

  it("does not set tls for plain redis://", () => {
    const c = buildRedisConnection("redis://host:6379") as Record<string, unknown>;
    expect(c.tls).toBeUndefined();
  });
});
