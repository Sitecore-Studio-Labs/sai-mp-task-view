import crypto from "crypto";

/**
 * Computes HMAC-SHA256 hex digest used by Wrike secure webhooks.
 * @see https://developers.wrike.com/docs/webhooks#secure-webhooks
 */
export function hmacSha256Hex(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

/**
 * Verifies the `X-Hook-Signature` header on an incoming Wrike webhook request.
 * Signature is `hmacSha256(key: secret, value: rawBody)` as a hex string.
 */
export function verifyWrikeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = hmacSha256Hex(secret, rawBody);
  const sigBuf = Buffer.from(signatureHeader);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Wrike handshake challenge: reject secrets that look like injection / oracle abuse.
 */
export function isSafeWrikeHookSecret(challenge: string): boolean {
  if (!challenge || challenge.length > 100) return false;
  // Reject JSON-like characters that could turn the endpoint into a signing oracle.
  return !/[{}\[\]"\\]/.test(challenge);
}
