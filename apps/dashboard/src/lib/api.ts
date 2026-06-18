// Cliente HTTP del backend Express. JWT persistido en localStorage.

const TOKEN_KEY = "derma_token";
const BASE = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { raw?: boolean } = {},
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* body no json */
    }
    if (res.status === 401) clearToken();
    throw new ApiError(res.status, msg);
  }
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}

export const api = {
  get:   <T>(path: string) => request<T>("GET",    path),
  post:  <T>(path: string, body?: unknown) => request<T>("POST",   path, body),
  put:   <T>(path: string, body?: unknown) => request<T>("PUT",    path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH",  path, body),
  del:   <T>(path: string) => request<T>("DELETE", path),
  raw:   (path: string)    => request<Response>("GET", path, undefined, { raw: true }),
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export { BASE as API_BASE };
