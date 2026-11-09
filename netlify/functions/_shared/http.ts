import {
  GENERATE_RATE_LIMIT,
  MAX_JSON_BODY_BYTES,
  RATE_LIMIT_WINDOW_MS,
  WRITE_RATE_LIMIT,
} from "../../../shared/limits";

export class HttpError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;

  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.headers = headers;
  }
}

export function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: extraHeaders,
    },
  );
}

export async function handleRequest(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonError(err.status, err.message, err.headers);
    }
    throw err;
  }
}

export async function readJsonBody(req: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new HttpError(413, "Payload too large");
    }
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new HttpError(413, "Payload too large");
  }
  if (bytes.byteLength === 0) return {};

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      const windowStart = now - windowMs;
      const prev = (hits.get(key) ?? []).filter((stamp) => stamp > windowStart);
      if (prev.length >= max) {
        hits.set(key, prev);
        const retryAfterSec = Math.max(1, Math.ceil((prev[0]! + windowMs - now) / 1000));
        return { ok: false, retryAfterSec };
      }
      prev.push(now);
      hits.set(key, prev);
      return { ok: true };
    },
  };
}

export const generateLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, GENERATE_RATE_LIMIT);
export const writeLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, WRITE_RATE_LIMIT);

export function enforceRateLimit(
  limiter: { check: (key: string, now?: number) => RateLimitResult },
  key: string,
): void {
  const result = limiter.check(key);
  if (!result.ok) {
    throw new HttpError(429, "Too many requests", { "Retry-After": String(result.retryAfterSec) });
  }
}

export function clientKey(ip: string | undefined, bucket: string): string {
  return `${bucket}:${ip?.trim() || "unknown"}`;
}
