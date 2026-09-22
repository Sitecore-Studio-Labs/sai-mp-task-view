import { afterEach, describe, expect, it } from "vitest";

import { closePool, getPool, resolveSsl } from "../pool";

describe("getPool", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(async () => {
    await closePool();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => getPool()).toThrow("DATABASE_URL is not configured");
  });

  it("reuses a singleton pool", () => {
    process.env.DATABASE_URL = "postgresql://ci:ci@127.0.0.1:5432/ci";
    expect(getPool()).toBe(getPool());
  });
});

describe("resolveSsl", () => {
  it("disables TLS for loopback hosts", () => {
    expect(resolveSsl("postgresql://ci:ci@127.0.0.1:5432/ci")).toBe(false);
    expect(resolveSsl("postgresql://ci:ci@localhost:5432/ci")).toBe(false);
  });

  it("enables TLS for Azure hosts", () => {
    expect(
      resolveSsl(
        "postgresql://app_user:pass@example.postgres.database.azure.com:5432/taskview?sslmode=require",
      ),
    ).toEqual({ rejectUnauthorized: true });
  });

  it("honours sslmode=require on localhost", () => {
    expect(resolveSsl("postgresql://ci:ci@127.0.0.1:5432/ci?sslmode=require")).toEqual({
      rejectUnauthorized: true,
    });
  });
});
