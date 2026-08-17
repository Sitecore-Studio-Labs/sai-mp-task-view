import crypto from "crypto";

/**
 * Verifies the secret token sent by Wrike during the webhook challenge handshake.
 *
 * When you register a Wrike webhook, Wrike makes a GET request to your hook URL
 * with `?secretToken=<token>` before it starts delivering events. You must respond
 * 200; this function confirms the token matches the one you registered with.
 *
 * Uses crypto.timingSafeEqual to prevent timing-oracle attacks.
 *
 * @returns true if the token matches the configured secret, false if absent or wrong.
 */
export function verifyWrikeWebhookSecret(suppliedToken: string | null, secret: string): boolean {
  if (!suppliedToken) return false;

  const supplied = Buffer.from(suppliedToken);
  const expected = Buffer.from(secret);

  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(supplied, expected);
}
