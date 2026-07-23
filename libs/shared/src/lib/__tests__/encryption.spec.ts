import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decrypt, encrypt } from "../encryption";

describe("encryption", () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;
  const originalSecret = process.env.JIRA_CLIENT_SECRET;

  beforeEach(() => {
    delete process.env.ENCRYPTION_KEY;
    process.env.JIRA_CLIENT_SECRET = "test-client-secret";
  });

  afterEach(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
    } else {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    }
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

  it("throws when neither ENCRYPTION_KEY nor JIRA_CLIENT_SECRET is set", () => {
    delete process.env.ENCRYPTION_KEY;
    delete process.env.JIRA_CLIENT_SECRET;

    const expected =
      "ENCRYPTION_KEY is required for token encryption (or set JIRA_CLIENT_SECRET / WRIKE_CLIENT_SECRET). Set it in your .env.local file.";

    expect(() => encrypt("token")).toThrow(expected);
    expect(() => decrypt("dGVzdA==")).toThrow(expected);
  });

  it("fails decryption when ciphertext is tampered", () => {
    const cipherText = encrypt("sensitive-value");
    const buffer = Buffer.from(cipherText, "base64");
    buffer[buffer.length - 1] ^= 0xff;

    expect(() => decrypt(buffer.toString("base64"))).toThrow();
  });
});
