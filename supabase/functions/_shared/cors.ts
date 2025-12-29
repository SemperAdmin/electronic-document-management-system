/**
 * CORS Configuration for Supabase Edge Functions
 *
 * This module provides CORS headers and handling for cross-origin requests
 * from the Naval Letter Formatter (NLF) application.
 */

// Allowed origins for NLF integration
// In production, this should be set via environment variable NLF_ORIGIN
const allowedOrigins = [
  'https://semperadmin.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
];

/**
 * Get CORS headers for a specific request origin.
 * Returns headers that allow the origin if it's in the allowlist.
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the origin is allowed
  const nlfOrigin = Deno.env.get('NLF_ORIGIN');
  const origins = nlfOrigin ? [nlfOrigin, ...allowedOrigins] : allowedOrigins;

  const origin = origins.includes(requestOrigin || '')
    ? requestOrigin
    : origins[0];

  return {
    'Access-Control-Allow-Origin': origin || origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Default CORS headers (for non-preflight responses)
 */
export const corsHeaders = getCorsHeaders(null);

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a Response if this is an OPTIONS request, null otherwise.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }
  return null;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
  data: Record<string, unknown>,
  status: number,
  requestOrigin: string | null
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...getCorsHeaders(requestOrigin),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(
  error: string,
  status: number,
  requestOrigin: string | null
): Response {
  return jsonResponse({ error }, status, requestOrigin);
}
