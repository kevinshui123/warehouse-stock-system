/**
 * CORS Utility
 * Centralized CORS handling for API routes
 * Supports dynamic origin validation for development and production
 */

import type { NextRequest } from "next/server";

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function productionOrigins(): string[] {
  const fromEnv = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_API_URL]
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map(normalizeOrigin);
  if (fromEnv.length > 0) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return [`https://${vercel}`];
  return [];
}

/**
 * Check if an origin is allowed for CORS
 * Allows localhost for development and configured production origins
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  for (const allowed of productionOrigins()) {
    if (origin === allowed) return true;
  }

  if (process.env.NODE_ENV === "development") {
    const localhostRegex = /^https?:\/\/localhost(:\d+)?$/;
    if (localhostRegex.test(origin)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve CORS Allow-Origin value. Never returns "" (invalid with credentials).
 * If env allow-list misses the browser Origin but request is same-origin as this API, reflect Origin.
 */
export function getAllowedOrigin(
  request: NextRequest,
  originHeader: string | null,
): string | null {
  if (originHeader && isAllowedOrigin(originHeader)) {
    return originHeader;
  }
  const list = productionOrigins();
  if (list[0]) return list[0];

  if (originHeader) {
    try {
      const apiOrigin = new URL(request.url).origin;
      if (originHeader === apiOrigin) {
        return originHeader;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Create CORS headers for API responses
 * @param request - The Next.js request object
 * @returns Headers object with CORS configuration
 */
export function createCorsHeaders(request: NextRequest): Headers {
  const originHeader = request.headers.get("origin");
  const headers = new Headers();
  const allow = getAllowedOrigin(request, originHeader);

  if (allow) {
    headers.set("Access-Control-Allow-Origin", allow);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 * @param request - The Next.js request object
 * @returns Response with CORS headers
 */
export function handleCorsPreflight(request: NextRequest): Response {
  const headers = createCorsHeaders(request);
  return new Response(null, { status: 200, headers });
}
