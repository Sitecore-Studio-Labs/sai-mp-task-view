# Encryption at Rest — Technical Evidence

> **Last updated:** 2026-07-08

This document provides verifiable evidence of encryption-at-rest for all sensitive data in the application, covering application-layer encryption (Jira and Wrike OAuth tokens) and infrastructure-layer encryption (Azure PostgreSQL).

---

## 1. Application-Layer Encryption (Jira OAuth Tokens)

### 1.1 Algorithm & Implementation

| Property           | Value                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Algorithm**      | AES-256-GCM (authenticated encryption with associated data)                                |
| **Key size**       | 256 bits (32 bytes)                                                                        |
| **IV length**      | 96 bits (12 bytes) — GCM recommended                                                       |
| **Auth tag**       | 128 bits (16 bytes)                                                                        |
| **Key derivation** | SHA-256 hash of `ENCRYPTION_KEY`, or fallback `JIRA_CLIENT_SECRET` / `WRIKE_CLIENT_SECRET` |
| **Output format**  | `base64(IV ‖ AuthTag ‖ Ciphertext)`                                                        |
| **Source file**    | [`libs/shared/src/lib/encryption.ts`](../../libs/shared/src/lib/encryption.ts)             |

### 1.2 Code Reference — Encryption Module

**File:** `libs/shared/src/lib/encryption.ts`

```typescript
const getEncryptionKey = (): Buffer => {
  const secret =
    process.env.ENCRYPTION_KEY ?? process.env.JIRA_CLIENT_SECRET ?? process.env.WRIKE_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is required for token encryption (or set JIRA_CLIENT_SECRET / WRIKE_CLIENT_SECRET).",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
};
```

### 1.3 Encrypted Columns

Both columns are in `jira_connections` (defined in [`db/schema.sql`](../../db/schema.sql), lines 4–16):

| Column                    | What it stores                                 |
| ------------------------- | ---------------------------------------------- |
| `access_token_encrypted`  | AES-256-GCM encrypted Jira OAuth access token  |
| `refresh_token_encrypted` | AES-256-GCM encrypted Jira OAuth refresh token |

**Plaintext tokens never touch the database.** The application encrypts before every write and decrypts after every read.

**Write path (all platforms):** [`libs/token-storage/src/PostgresTokenStore.ts`](../../libs/token-storage/src/PostgresTokenStore.ts) → `saveConnection()` calls `encrypt()` on access and refresh tokens.

**Jira-specific callers:** OAuth callback and token refresh in `apps/jira`.

**Wrike-specific callers:** OAuth callback [`apps/wrike/src/app/api/auth/wrike/callback/route.ts`](../../apps/wrike/src/app/api/auth/wrike/callback/route.ts); token refresh via `authStrategy.getValidToken()` in `apps/wrike`.

### 1.4 Decrypt Path (Token Load)

**File:** `libs/token-storage/src/PostgresTokenStore.ts` → `getConnection()`

Decrypts `access_token_encrypted` and `refresh_token_encrypted`. On failure, marks the connection `inactive` so the user must re-authenticate.

### 1.5 Key Management

| Aspect           | Current Implementation                                                                                                                                | Recommended Improvement                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Key source**   | `ENCRYPTION_KEY` env var preferred; falls back to `JIRA_CLIENT_SECRET` or `WRIKE_CLIENT_SECRET` for platform-only deployments → SHA-256 → 32-byte key | Use a dedicated `ENCRYPTION_KEY` in all production deployments; avoid coupling to OAuth client secrets                    |
| **Key rotation** | Not automated — changing the derivation secret invalidates all stored tokens; affected connections auto-deactivate on next decrypt attempt            | Implement key versioning: store key version with ciphertext; support decrypting with old key + re-encrypting with new key |
| **Key storage**  | Environment variable (never committed to repo)                                                                                                        | Consider a secrets manager (e.g. Vercel environment variables are encrypted at rest)                                      |

---

## 2. Application-Layer Encryption (Wrike OAuth Tokens)

Wrike uses the **same** `encrypt()` / `decrypt()` module and AES-256-GCM format as Jira. Tokens are stored in `wrike_connections` (see [`db/schema.sql`](../../db/schema.sql)).

| Column                    | What it stores                                  |
| ------------------------- | ----------------------------------------------- |
| `access_token_encrypted`  | AES-256-GCM encrypted Wrike OAuth access token  |
| `refresh_token_encrypted` | AES-256-GCM encrypted Wrike OAuth refresh token |

**Wrike-only deployments:** Set `WRIKE_CLIENT_SECRET` in `.env.local`; `getEncryptionKey()` derives the encryption key from it when `ENCRYPTION_KEY` and `JIRA_CLIENT_SECRET` are absent.

**Encrypt path:** `PostgresTokenStore.saveConnection()` from the Wrike OAuth callback.

**Decrypt path:** `PostgresTokenStore.getConnection()` via `getWrikeApiContext()` in [`apps/wrike/src/services/wrikeService.ts`](../../apps/wrike/src/services/wrikeService.ts).

---

## 3. Session Token Security

### 3.1 Session Token Generation

**Jira** — `apps/jira/src/app/api/auth/jira/callback/route.ts`:

```typescript
const sessionToken = crypto.randomBytes(32).toString("hex");
```

**Wrike** — `apps/wrike/src/app/api/auth/wrike/callback/route.ts` (same pattern).

- 256 bits of cryptographic randomness — computationally infeasible to guess or brute-force.

### 3.2 Cookie Security Flags

**Jira** sets `jira_session_token`; **Wrike** sets `wrike_session`. Both use:

```typescript
response.cookies.set("jira_session_token", sessionToken, {
  httpOnly: true, // Not accessible via JavaScript (XSS protection)
  secure: true, // Only sent over HTTPS
  sameSite: "none", // Required for cross-origin iframe embedding
  path: "/",
  expires: expiry, // 30 days (Jira) or 7 days (Wrike)
});
```

**Cookie clearing:** `apps/jira/src/helpers/cookies.ts` and `apps/wrike/src/helpers/cookies.ts`.

### 3.3 What is NOT in the cookie

The browser cookie contains **only** the opaque session token. Platform OAuth tokens are **never** stored in cookies, localStorage, or any client-accessible storage.

---

## 4. Infrastructure-Layer Encryption (Azure PostgreSQL)

### 4.1 Azure Database for PostgreSQL encryption at rest

Azure Database for PostgreSQL encrypts data at rest and in transit:

| Layer                 | Encryption                 | Standard                             |
| --------------------- | -------------------------- | ------------------------------------ |
| **Database storage**  | AES-256 encryption at rest | Azure-managed encryption             |
| **Backups**           | Encrypted at rest          | Azure automated backups              |
| **Data in transit**   | TLS 1.2+                   | Connections use `sslmode=require`    |
| **Connection string** | `sslmode=require`          | Unencrypted connections are rejected |

**Reference:** [Azure Database for PostgreSQL security](https://learn.microsoft.com/azure/postgresql/)

---

## 5. Encryption Summary Matrix

| Data                | At Rest                                         | In Transit                                     | Key Management                                      |
| ------------------- | ----------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Jira access token   | AES-256-GCM (app layer) + AES-256 (Azure infra) | TLS 1.2+ (API ↔ Azure PostgreSQL)              | `ENCRYPTION_KEY` or `JIRA_CLIENT_SECRET` → SHA-256  |
| Jira refresh token  | AES-256-GCM (app layer) + AES-256 (Azure infra) | TLS 1.2+ (API ↔ Azure PostgreSQL)              | `ENCRYPTION_KEY` or `JIRA_CLIENT_SECRET` → SHA-256  |
| Wrike access token  | AES-256-GCM (app layer) + AES-256 (Azure infra) | TLS 1.2+ (API ↔ Azure PostgreSQL)              | `ENCRYPTION_KEY` or `WRIKE_CLIENT_SECRET` → SHA-256 |
| Wrike refresh token | AES-256-GCM (app layer) + AES-256 (Azure infra) | TLS 1.2+ (API ↔ Azure PostgreSQL)              | `ENCRYPTION_KEY` or `WRIKE_CLIENT_SECRET` → SHA-256 |
| Session token       | AES-256 (Azure infra)                           | TLS 1.2+ (browser ↔ API), `secure` cookie flag | N/A (opaque random value)                           |
| Webhook event data  | AES-256 (Azure infra)                           | TLS 1.2+ (platform ↔ API ↔ Azure PostgreSQL)   | N/A (non-sensitive metadata)                        |
| Sync logs           | AES-256 (Azure infra)                           | TLS 1.2+ (API ↔ Azure PostgreSQL)              | N/A (audit metadata)                                |
| Database backups    | AES-256 (AWS managed)                           | N/A (at rest)                                  | AWS-managed keys                                    |
