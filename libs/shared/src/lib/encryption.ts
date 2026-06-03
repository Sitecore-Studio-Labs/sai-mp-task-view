import crypto from "crypto";

// NOTE: This is a minimal example of symmetric encryption to demonstrate
// how to store tokens in encrypted form. For production use,
// prefer a dedicated KMS and rotation strategy.

const getEncryptionKey = (): Buffer => {
  // ENCRYPTION_KEY is the platform-agnostic key used by all adapters.
  // Falls back to JIRA_CLIENT_SECRET for backwards compatibility with existing Jira deployments.
  const secret = process.env.ENCRYPTION_KEY ?? process.env.JIRA_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is required for token encryption. Set it in your .env.local file.",
    );
  }

  // Derive a 32-byte key from the secret.
  return crypto.createHash("sha256").update(secret).digest();
};

export const encrypt = (plainText: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // AES-GCM recommended IV length

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decrypt = (cipherText: string): string => {
  const key = getEncryptionKey();
  const buffer = Buffer.from(cipherText, "base64");

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
