export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Read a function response. HTML (or any non-JSON success) means the API is
 * not mounted, so callers may fall back to the client store. A JSON error
 * from the API is an ApiError and must not be hidden by that fallback.
 */
export async function readApiJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    if (contentType.includes("text/html")) {
      throw new Error("API unavailable");
    }
    let message = `Error ${res.status}`;
    if (contentType.includes("application/json")) {
      try {
        const body = (await res.json()) as { error?: unknown };
        if (body && typeof body.error === "string" && body.error.trim()) {
          message = body.error.trim();
        }
      } catch {
        // Keep the status message when the error body is not JSON.
      }
    }
    throw new ApiError(res.status, message);
  }

  if (!contentType.includes("application/json")) {
    throw new Error("API unavailable");
  }
  return res.json() as Promise<T>;
}

export function shouldUseLocalFallback(err: unknown): boolean {
  return !(err instanceof ApiError);
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  if (err.status === 429) return "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.";
  if (err.status === 413) return "La configuración es demasiado grande para guardarla.";
  return err.message || fallback;
}
