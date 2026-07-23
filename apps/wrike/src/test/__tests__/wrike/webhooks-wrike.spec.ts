import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  env: { WRIKE_WEBHOOK_SECRET: undefined as string | undefined },
}));

const insertMock = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseServerClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

import { POST } from "@/app/api/webhooks/wrike/route";
import { env } from "@/lib/config";
import { hmacSha256Hex } from "@/lib/webhookSignature";

function makeRequest(
  body: string,
  opts?: { projectKey?: string; headers?: Record<string, string> },
) {
  const url = new URL("http://localhost/api/webhooks/wrike");
  if (opts?.projectKey) url.searchParams.set("projectKey", opts.projectKey);
  return new NextRequest(url.toString(), {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...opts?.headers },
  });
}

describe("POST /api/webhooks/wrike", () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    (env as { WRIKE_WEBHOOK_SECRET?: string }).WRIKE_WEBHOOK_SECRET = undefined;
  });

  it("stores task events for the projectKey query param", async () => {
    const payload = JSON.stringify([
      {
        eventType: "TaskTitleChanged",
        taskId: "IEAAABC6KQAB5FKW",
        lastUpdatedDate: "2016-11-22T10:25:50Z",
      },
    ]);

    const res = await POST(makeRequest(payload, { projectKey: "folder-1" }));
    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledWith({
      issue_key: "IEAAABC6KQAB5FKW",
      project_key: "folder-1",
      event_type: "TaskTitleChanged",
      occurred_at: "2016-11-22T10:25:50Z",
    });
  });

  it("skips inserts when projectKey is missing", async () => {
    const payload = JSON.stringify([{ eventType: "TaskCreated", taskId: "T1" }]);
    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 200 for empty accessibility probes", async () => {
    const res = await POST(makeRequest(""));
    expect(res.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("completes the secure webhook handshake", async () => {
    const secret = "secure-webhook-secret-1";
    (env as { WRIKE_WEBHOOK_SECRET?: string }).WRIKE_WEBHOOK_SECRET = secret;
    const body = JSON.stringify({ requestType: "WebHook secret verification" });
    const challenge = "challengeToken99";
    const signature = hmacSha256Hex(secret, body);

    const res = await POST(
      makeRequest(body, {
        headers: {
          "x-hook-secret": challenge,
          "x-hook-signature": signature,
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Hook-Secret")).toBe(hmacSha256Hex(secret, challenge));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects events with an invalid signature when secret is configured", async () => {
    (env as { WRIKE_WEBHOOK_SECRET?: string }).WRIKE_WEBHOOK_SECRET = "secure-webhook-secret-1";
    const payload = JSON.stringify([{ eventType: "TaskCreated", taskId: "T1" }]);
    const res = await POST(
      makeRequest(payload, {
        projectKey: "folder-1",
        headers: { "x-hook-signature": "invalid" },
      }),
    );
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
