# Error Handling

This guide describes the error handling conventions for platform adapters and API routes.

---

## Error hierarchy

```text
Error
└── PlatformApiError          (@mp/task-core)  — base for all adapter failures
    ├── JiraClientError       (apps/jira)      — Jira-specific subclass
    └── WrikeAuthError        (apps/wrike)     — Wrike-specific subclass (and so on per platform)
```

Each platform app creates its own subclass (`<Platform>AuthError`, `<Platform>ClientError`) so catch blocks in platform-only code can be scoped. All shared code checks `instanceof PlatformApiError` — subclasses are caught automatically.

### `PlatformApiError` (`libs/task-core/src/types/errors.ts`)

The base error class for all platform adapter failures. Every error that propagates out of a service adapter must be (or extend) `PlatformApiError`.

```ts
class PlatformApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly platformCode?: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {}
}
```

| Field          | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `message`      | Human-readable error summary                                               |
| `statusCode`   | HTTP status code to return to the client (e.g. `400`, `401`, `403`, `404`) |
| `platformCode` | Raw error code string from the platform API (e.g. `"FIELD_REQUIRED"`)      |
| `fieldErrors`  | Per-field validation errors (e.g. `{ summary: "is required" }`)            |

### `JiraClientError` (`apps/jira/src/platforms/jira/JiraAdapter.ts`)

Jira-specific subclass. No additional fields — it exists so catch blocks in Jira-only code can be scoped to Jira errors when necessary. All shared code checks `instanceof PlatformApiError` instead.

```ts
class JiraClientError extends PlatformApiError {}
```

---

## `BasePlatformAdapter.handleError`

Located in `libs/task-core/src/platforms/base/BasePlatformAdapter.ts`.

The simplest pattern — delegate every catch block to this static method:

```ts
// Simple catch block pattern
catch (err) {
  BasePlatformAdapter.handleError(err); // always throws — never returns
}
```

**Axios interceptor pattern (used in JiraAdapter):** For adapters that use Axios, you can centralise error wrapping in the response error interceptor instead of every catch block:

```ts
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 + token refresh first, then:
    if (error.response) {
      throw new JiraClientError(
        formatJiraErrorResponse(error.response.data),
        error.response.status,
      );
    }
    return Promise.reject(error);
  },
);
```

Both patterns are valid. The interceptor approach avoids repeating error translation in every method but requires the Axios instance to be centralised.

Behaviour:

| Input                        | Output                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Already a `PlatformApiError` | Re-thrown as-is                                           |
| Axios error with a response  | Wrapped into `PlatformApiError(message, response.status)` |
| Any other `Error`            | Wrapped into `PlatformApiError(message, 500)`             |
| Non-Error thrown value       | Wrapped into `PlatformApiError("Unknown error", 500)`     |

The return type is `never` — calling `handleError` always throws.

---

## `extractPlatformError.ts`

Located at `apps/<platform>/src/lib/extractPlatformError.ts`.

Each platform has its own error response envelope. This file provides helpers to parse that envelope and throw a correctly typed `PlatformApiError`.

### Jira example (`apps/jira/src/lib/extractPlatformError.ts`)

Jira returns errors in this shape:

```json
{
  "errorMessages": ["Issue does not exist"],
  "errors": { "summary": "Field required" }
}
```

The file exports two functions:

```ts
// Parse Jira's error envelope → { message, fieldErrors? }
function extractJiraError(data: unknown): { message: string; fieldErrors?: Record<string, string> };

// Parse and throw as PlatformApiError
function throwJiraApiError(data: unknown, statusCode: number): never;
```

Usage inside a raw adapter method:

```ts
const res = await this.client.post("/rest/api/3/issue", body, { ... });
if (!res.ok) {
  throwJiraApiError(await res.json(), res.status);
}
```

### Adding a new platform

Create `apps/<platform>/src/lib/extractPlatformError.ts` with:

```ts
export function throwPlatformApiError(data: unknown, statusCode: number): never {
  // parse the platform's error envelope
  const message = /* extract message from data */;
  const fieldErrors = /* extract field errors if any */;
  throw new PlatformApiError(message, statusCode, undefined, fieldErrors);
}
```

---

## `platformRoute.ts` — route-level error translation

Located at `apps/<platform>/src/lib/platformRoute.ts`.

The `withAdapter` and `withAdapterOrEmpty` helpers catch `PlatformApiError` and forward its `statusCode` to the HTTP response:

```ts
catch (err) {
  if (err instanceof PlatformApiError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  // fallback 500
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
```

Because `JiraClientError extends PlatformApiError`, no Jira-specific catch is needed here. This pattern carries forward to any new platform app — the route helper works without modification.

---

## Rules

1. **All adapter errors must be `PlatformApiError` or a subclass.** The route helpers only understand `PlatformApiError`. Any error that escapes an adapter without being wrapped becomes a 500.

2. **Use `BasePlatformAdapter.handleError` in every catch block of the raw HTTP adapter.** Do not wrap errors manually unless you need to attach `fieldErrors` — use `throwPlatformApiError` from `extractPlatformError.ts` for that.

3. **Do not import platform-specific error classes in `libs/`.** `JiraClientError` (and any future `WrikeClientError`, etc.) must stay inside `apps/<platform>/`. Shared code uses `PlatformApiError` only.

4. **Do not add `instanceof JiraClientError` checks in shared route helpers.** Every new platform would require a code change. Use `instanceof PlatformApiError` instead — subclasses are caught automatically.

5. **Field errors belong in `fieldErrors`, not the message string.** This allows the UI to display per-field validation feedback when the platform supports it.
