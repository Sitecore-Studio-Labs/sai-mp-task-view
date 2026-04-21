export type JiraBffTransportOptions = {
  baseUrl?: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => Promise<void>;
};

/**
 * Shared fetch to `/api/jira/*` with Bearer + one 401 refresh retry (parity with `apiClient`).
 */
export class JiraBffClient {
  constructor(private readonly opts: JiraBffTransportOptions = {}) {}

  private authHeaders(): HeadersInit {
    const token = this.opts.getAccessToken?.();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private mergeHeaders(init?: RequestInit): Headers {
    const merged = new Headers(this.authHeaders());
    if (init?.headers) {
      const extra = new Headers(init.headers);
      extra.forEach((value, key) => merged.set(key, value));
    }
    return merged;
  }

  private toUrl(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.opts.baseUrl ?? ""}${p}`;
  }

  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = this.toUrl(path);
    const headers = this.mergeHeaders(init);
    if (init?.body instanceof FormData) {
      headers.delete("Content-Type");
    }
    const run = () =>
      fetch(url, {
        ...init,
        credentials: "include",
        headers,
      });

    let res = await run();
    if (res.status === 401 && this.opts.onUnauthorized) {
      await this.opts.onUnauthorized();
      res = await run();
    }
    return res;
  }
}
