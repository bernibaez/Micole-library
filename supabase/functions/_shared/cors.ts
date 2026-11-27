const DEFAULT_ALLOWED_HEADERS =
  'authorization, x-client-info, apikey, content-type, range, if-none-match';

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedRaw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  const allowedList = allowedRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  let allowOrigin = '*';
  if (allowedList.length > 0) {
    allowOrigin = allowedList.includes(origin) ? origin : allowedList[0];
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers':
      'Content-Length, Content-Range, Accept-Ranges, Content-Disposition, Content-Type',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: buildCorsHeaders(req) });
  }
  return null;
}
