export async function register() {
  // Force env validation to run at server startup before the first request is served.
  // config.ts calls validateEnv() which throws with a human-readable error if any
  // required variable is missing, so a misconfigured deployment fails immediately
  // rather than at the first request that needs the missing var.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/config");
  }
}
