/**
 * Resolves the Axios base URL for /api routes.
 * - Dev: localhost
 * - Prod: NEXT_PUBLIC_API_URL if set; otherwise same-origin "/api" (avoids CORS on Vercel)
 */
export function getApiBaseUrl(): string {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000/api";
  }
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) {
    return `${fromEnv}/api`;
  }
  return "/api";
}
