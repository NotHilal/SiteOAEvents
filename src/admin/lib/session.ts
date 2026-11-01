// Admin session — same storage as the old Espace OA (sessionStorage
// "oa_session", filled by POST /api/auth/login), so both admins share one
// login while they coexist. The token is "<base64url payload>.<signature>";
// the payload carries `exp` (ms), checked here to drop expired sessions
// before the API answers 401.

export type AdminSession = {
  access_token: string;
  user: { email: string; role: string };
};

const KEY = "oa_session";

function tokenExpiry(token: string): number | null {
  try {
    const [payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!parsed?.access_token) return null;
    const exp = tokenExpiry(parsed.access_token);
    if (exp && Date.now() > exp) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: AdminSession | null) {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("oa-session"));
}

export async function login(email: string, password: string): Promise<AdminSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Connexion impossible.");
  writeSession(data.session);
  return data.session;
}

export function logout() {
  writeSession(null);
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** fetch() for the admin API routes: adds the bearer token, parses JSON,
 *  throws ApiError with the server's message, logs out on 401. */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout();
    throw new ApiError("Session expirée, reconnectez-vous.", 401);
  }
  if (!res.ok) throw new ApiError(data.message || data.error || `Erreur ${res.status}`, res.status, data);
  return data as T;
}
