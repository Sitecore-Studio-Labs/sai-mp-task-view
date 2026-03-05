# Jira webhooks – instant UI refresh

When issues are created, updated, or deleted in Jira, the Context Panel can update automatically via webhooks and Supabase Realtime (no polling). Follow the steps below in order.

---

## 1. Register the webhook endpoint first

Before anything else, **register your webhook with Jira** so Jira knows where to send events. Do this after Jira is connected in the app.

The app exposes **POST /api/jira/webhooks**, which calls Jira’s API to register a dynamic webhook using your OAuth app. You must pass a **publicly reachable callback URL** (e.g. your deployed app or an ngrok URL). Jira will send `POST` requests to that URL whenever matching events occur.

### How to invoke

**From a terminal (PowerShell or Bash):**

```bash
# Local dev with ngrok (replace with your ngrok URL)
curl -X POST http://localhost:3000/api/jira/webhooks -H "Content-Type: application/json" -d "{\"url\":\"https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app/api/webhooks/jira\"}"

# Or use default URL (uses NEXT_PUBLIC_APP_URL or VERCEL_URL from env)
curl -X POST http://localhost:3000/api/jira/webhooks -H "Content-Type: application/json"
```

**From the browser console** (while on your app’s origin, e.g. `http://localhost:3000`):

```javascript
const res = await fetch("/api/jira/webhooks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app/api/webhooks/jira",
  }),
});
const data = await res.json();
console.log(data);  // { results: [ { createdWebhookId: 123 } ] }
```

**Request body (optional):**

- **`url`** – Full callback URL. If omitted, the app uses `{NEXT_PUBLIC_APP_URL or VERCEL_URL}/api/webhooks/jira`.
- **`webhooks`** – Array of `{ events: string[], jqlFilter?: string }`. If omitted, one webhook is registered for `jira:issue_created`, `jira:issue_updated`, `jira:issue_deleted` with a permissive JQL filter.

**Example: custom URL and JQL filter (e.g. one project):**

```bash
curl -X POST http://localhost:3000/api/jira/webhooks -H "Content-Type: application/json" -d "{\"url\":\"https://your-ngrok.ngrok-free.app/api/webhooks/jira\",\"webhooks\":[{\"events\":[\"jira:issue_created\",\"jira:issue_updated\",\"jira:issue_deleted\"],\"jqlFilter\":\"project = KAN\"}]}"
```

**Response:** `200` with `{ results: Array<{ createdWebhookId?: number, errors?: string[] }> }`. Each entry is either a created webhook id or errors. Webhooks expire after 30 days; re-register or use Jira’s refresh API to extend.

**Required OAuth scope:** The app requests `manage:jira-webhook` when you connect Jira. If you added this scope later, **disconnect Jira and connect again** so a new token is issued; otherwise registration returns 401/403.

---

## 2. Database and Realtime

Your webhook **receiver** is **POST /api/webhooks/jira**. It writes incoming events to Supabase so the UI can react via Realtime. Set that up next.

### Create the table

Run the migration that adds `jira_webhook_events` (see `supabase/schema.sql`) in the Supabase SQL Editor or via CLI.

### Enable Realtime for the table

The UI only receives new events if the table is in the **supabase_realtime** publication:

- **Dashboard:** Open your project → **Database** → **Publications**. Select **supabase_realtime** and add the table **`jira_webhook_events`**.
- **Or SQL Editor:** Run:
  ```sql
  alter publication supabase_realtime add table public.jira_webhook_events;
  ```

Without this step, the webhook handler will store events but the task list won’t update in real time.

---

## 3. When sync runs

Sync is enabled only when **Jira is connected** and a **project is selected** in the task list. If Jira is disconnected or no project is selected, the Realtime subscription is not active.

---

## 4. Optional: sync-signal fallback

If Realtime is unavailable, clients can poll **GET /api/jira/sync-signal?projectKey=KEY**. The response includes `lastEventAt`; when it changes, invalidate the same queries as in `useJiraWebhookSync`.

---

## 5. Troubleshooting: webhook registered but UI doesn’t update

### Check that the webhook reaches your app

When you create or update an issue in Jira, check the **Next.js server logs** (terminal where you run `npm run dev`):

- **`[webhooks/jira] Stored event: issue_created KAN-123 KAN`** – The webhook hit your app and was stored. If the UI still doesn’t update, see Realtime and UI checks below.
- **`[webhooks/jira] POST body missing or invalid`** or **no log at all** – The request didn’t reach your app or didn’t contain valid JSON (e.g. ngrok returning HTML).

### ngrok and “no request received”

With **ngrok free**, requests that don’t look like a browser (e.g. Jira’s webhook) can get a **“Visit Site”** page instead of being forwarded. Your app never sees the POST. To fix:

- **Preferred:** Use a **public URL** (e.g. deploy to Vercel) and register that URL with Jira, or use a tunnel that doesn’t block server requests (e.g. **cloudflared**).
- Or use **paid ngrok** and disable the browser warning in the ngrok dashboard if your plan allows.

### Realtime

The table **`jira_webhook_events`** must be in the **supabase_realtime** publication. In the Dashboard go to **Database → Publications → supabase_realtime** and add `jira_webhook_events` if it’s not there. Or run in SQL Editor:

```sql
alter publication supabase_realtime add table public.jira_webhook_events;
```

Without this, the UI won’t get notified of new rows.

### UI and browser console

- The task list only refreshes when you’re on the **task list view** with a **project selected**. Open the app, select the same project where you created the issue, and keep that tab open when you trigger the webhook.
- In the **browser DevTools console** you should see:
  - **`[useJiraWebhookSync] Subscribed to jira_webhook_events for project KAN`** when the list is open with that project selected.
  - **`[useJiraWebhookSync] Invalidating queries for KAN-xxx KAN`** when a webhook event is received for that project.
- If you see **`[useJiraWebhookSync] Supabase client is null`**, check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your env.
