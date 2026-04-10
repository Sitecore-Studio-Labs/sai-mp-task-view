# Encryption at Rest — Technical Evidence

> **Last updated:** 2026-04-02

This document provides verifiable evidence of encryption-at-rest for all sensitive data in the application, covering both application-layer encryption (Jira tokens) and infrastructure-layer encryption (Supabase/PostgreSQL).

---

## 1. Application-Layer Encryption (Jira OAuth Tokens)

### 1.1 Algorithm & Implementation

| Property           | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| **Algorithm**      | AES-256-GCM (authenticated encryption with associated data) |
| **Key size**       | 256 bits (32 bytes)                                         |
| **IV length**      | 96 bits (12 bytes) — GCM recommended                        |
| **Auth tag**       | 128 bits (16 bytes)                                         |
| **Key derivation** | SHA-256 hash of `JIRA_CLIENT_SECRET` environment variable   |
| **Output format**  | `base64(IV ‖ AuthTag ‖ Ciphertext)`                         |
| **Source file**    | [`src/utils/encryption.ts`](../../src/utils/encryption.ts)  |

### 1.2 Code Reference — Encryption Module

**File:** `src/utils/encryption.ts` (lines 1–41)

```typescript
// Key derivation (line 7-14)
const getEncryptionKey = (): Buffer => {
  const secret = process.env.JIRA_CLIENT_SECRET;
  if (!secret) {
    throw new Error("JIRA_CLIENT_SECRET is required for token encryption.");
  }
  return crypto.createHash("sha256").update(secret).digest();
};

// Encrypt (lines 17-26)
export const encrypt = (plainText: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

// Decrypt (lines 28-41)
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
```

### 1.3 Encrypted Columns

Both columns are in `jira_connections` (defined in [`supabase/schema.sql`](../../supabase/schema.sql), lines 4–16):

| Column                    | What it stores                                 |
| ------------------------- | ---------------------------------------------- |
| `access_token_encrypted`  | AES-256-GCM encrypted Jira OAuth access token  |
| `refresh_token_encrypted` | AES-256-GCM encrypted Jira OAuth refresh token |

**Plaintext tokens never touch the database.** The application encrypts before every write and decrypts after every read.

### 1.4 Encrypt Path (Token Save)

**File:** `src/services/jiraService.ts`, function `saveUserJiraConnection()` (lines 105–147)

```typescript
access_token_encrypted: encrypt(token.accessToken),   // line 122
refresh_token_encrypted: encrypt(token.refreshToken),  // line 123
```

Called from:

- OAuth callback: [`src/app/api/auth/jira/callback/route.ts`](../../src/app/api/auth/jira/callback/route.ts) (line 45)
- Token refresh: [`src/services/jiraService.ts` → `refreshUserJiraToken()`](../../src/services/jiraService.ts) (line 224)

### 1.5 Decrypt Path (Token Load)

**File:** `src/services/jiraService.ts`, function `getUserJiraConnection()` (lines 59–103)

```typescript
accessToken = decrypt(data.access_token_encrypted); // line 76
refreshToken = decrypt(data.refresh_token_encrypted); // line 77
```

**Failure handling (lines 78–88):** If decryption fails (e.g. key rotation or data corruption), the connection is automatically marked `inactive` and the user must re-authenticate. This prevents stale encrypted data from persisting.

### 1.6 Key Management

| Aspect           | Current Implementation                                                                                                                    | Recommended Improvement                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Key source**   | `JIRA_CLIENT_SECRET` env var → SHA-256 → 32-byte key                                                                                      | Migrate to a dedicated `ENCRYPTION_KEY` env var or use a KMS (e.g. AWS KMS, GCP KMS)                                      |
| **Key rotation** | Not automated — changing `JIRA_CLIENT_SECRET` invalidates all stored tokens; affected connections auto-deactivate on next decrypt attempt | Implement key versioning: store key version with ciphertext; support decrypting with old key + re-encrypting with new key |
| **Key storage**  | Environment variable (never committed to repo)                                                                                            | Consider a secrets manager (e.g. Vercel environment variables are encrypted at rest)                                      |

---

## 2. Session Token Security

### 2.1 Session Token Generation

**File:** `src/app/api/auth/jira/callback/route.ts` (line 52)

```typescript
const sessionToken = crypto.randomBytes(32).toString("hex");
```

- 256 bits of cryptographic randomness — computationally infeasible to guess or brute-force.

### 2.2 Cookie Security Flags

**File:** `src/app/api/auth/jira/callback/route.ts` (lines 65–71)

```typescript
response.cookies.set("jira_session_token", sessionToken, {
  httpOnly: true, // Not accessible via JavaScript (XSS protection)
  secure: true, // Only sent over HTTPS
  sameSite: "none", // Required for cross-origin iframe embedding
  path: "/",
  expires: expiry, // 30 days
});
```

**Cookie clearing** uses identical security flags: [`src/helpers/cookies.ts`](../../src/helpers/cookies.ts) (lines 3–11).

### 2.3 What is NOT in the cookie

The browser cookie contains **only** the opaque session token. The actual Jira OAuth tokens are **never** stored in cookies, localStorage, or any client-accessible storage.

---

## 3. Infrastructure-Layer Encryption (Supabase)

### 3.1 Supabase Encryption at Rest

Supabase runs on AWS infrastructure. All Supabase projects include:

| Layer                 | Encryption                 | Standard                                                         |
| --------------------- | -------------------------- | ---------------------------------------------------------------- |
| **Database storage**  | AES-256 encryption at rest | AWS EBS encryption (enabled by default on all Supabase projects) |
| **Backups**           | Encrypted at rest          | Same AWS encryption; daily automated backups                     |
| **Data in transit**   | TLS 1.2+                   | All connections to Supabase enforce SSL/TLS                      |
| **Connection string** | `sslmode=require`          | Enforced by Supabase; unencrypted connections are rejected       |

**Reference:** [Supabase Security Documentation](https://supabase.com/docs/guides/platform/security)

---

## 4. Encryption Summary Matrix

| Data               | At Rest                                            | In Transit                                     | Key Management                 |
| ------------------ | -------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Jira access token  | AES-256-GCM (app layer) + AES-256 (Supabase infra) | TLS 1.2+ (API ↔ Supabase)                      | `JIRA_CLIENT_SECRET` → SHA-256 |
| Jira refresh token | AES-256-GCM (app layer) + AES-256 (Supabase infra) | TLS 1.2+ (API ↔ Supabase)                      | `JIRA_CLIENT_SECRET` → SHA-256 |
| Session token      | AES-256 (Supabase infra)                           | TLS 1.2+ (browser ↔ API), `secure` cookie flag | N/A (opaque random value)      |
| Webhook event data | AES-256 (Supabase infra)                           | TLS 1.2+ (Jira ↔ API ↔ Supabase)               | N/A (non-sensitive metadata)   |
| Sync logs          | AES-256 (Supabase infra)                           | TLS 1.2+ (API ↔ Supabase)                      | N/A (audit metadata)           |
| Database backups   | AES-256 (AWS managed)                              | N/A (at rest)                                  | AWS-managed keys               |
