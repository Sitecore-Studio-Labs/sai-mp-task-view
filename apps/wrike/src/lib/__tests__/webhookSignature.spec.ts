import { describe, expect, it } from "vitest";

import {
  hmacSha256Hex,
  isSafeWrikeHookSecret,
  verifyWrikeWebhookSignature,
} from "@/lib/webhookSignature";

describe("webhookSignature", () => {
  const secret = "test-webhook-secret-16";

  it("verifies a matching X-Hook-Signature", () => {
    const body = JSON.stringify([{ eventType: "TaskCreated", taskId: "IEAAA" }]);
    const signature = hmacSha256Hex(secret, body);
    expect(verifyWrikeWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a mismatched signature", () => {
    const body = '{"ok":true}';
    expect(verifyWrikeWebhookSignature(body, "deadbeef", secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWrikeWebhookSignature("{}", null, secret)).toBe(false);
  });

  it("accepts alphanumeric handshake secrets within length limit", () => {
    expect(isSafeWrikeHookSecret("abc123XYZ")).toBe(true);
  });

  it("rejects handshake secrets that look like JSON or are too long", () => {
    expect(isSafeWrikeHookSecret('{"a":1}')).toBe(false);
    expect(isSafeWrikeHookSecret("a".repeat(101))).toBe(false);
  });
});
