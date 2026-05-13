import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decrypt, encrypt } from "../encryption";

describe("encryption", () => {
  const originalSecret = process.env.JIRA_CLIENT_SECRET;

  beforeEach(() => {
    process.env.JIRA_CLIENT_SECRET = "test-client-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JIRA_CLIENT_SECRET;
    } else {
      process.env.JIRA_CLIENT_SECRET = originalSecret;
    }
  });

  it("round-trips plain text through encrypt and decrypt", () => {
    const plainText = "access-token-12345";

    expect(decrypt(encrypt(plainText))).toBe(plainText);
  });

  it("produces different ciphertext for the same input", () => {
    const plainText = "same-input";

    expect(encrypt(plainText)).not.toBe(encrypt(plainText));
  });

  it("throws when JIRA_CLIENT_SECRET is missing", () => {
    delete process.env.JIRA_CLIENT_SECRET;

    expect(() => encrypt("token")).toThrow("JIRA_CLIENT_SECRET is required for token encryption.");
    expect(() => decrypt("dGVzdA==")).toThrow(
      "JIRA_CLIENT_SECRET is required for token encryption.",
    );
  });

  it("fails decryption when ciphertext is tampered", () => {
    const cipherText = encrypt("sensitive-value");
    const buffer = Buffer.from(cipherText, "base64");
    buffer[buffer.length - 1] ^= 0xff;

    expect(() => decrypt(buffer.toString("base64"))).toThrow();
  });
});
