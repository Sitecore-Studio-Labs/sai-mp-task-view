import crypto from "crypto";

/**
 * Verifies the HMAC-SHA256 signature on an incoming Jira webhook request.
 *
 * Jira sends the signature in the `X-Hub-Signature` header as `sha256=<hex>`.
 * The signature is computed over the raw (unparsed) request body with the
 * shared secret configured when registering the webhook.
 *
 * Uses `crypto.timingSafeEqual` to prevent timing-oracle attacks.
 *
 * @returns true if the signature is valid, false if absent or incorrect.
 */
export function verifyJiraWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  // Both buffers must be the same length for timingSafeEqual; pad if needed.
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
