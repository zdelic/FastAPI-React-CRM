// src/utils/auth.ts
export type Role = "admin" | "bauleiter" | "polier" | "sub";

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getRoleFromToken(): Role | null {
  const token = getToken();
  if (!token) return null;
  try {
    const b64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!b64) return null;
    const payload = JSON.parse(atob(b64)) as { role?: Role };
    return (payload.role ?? null) as Role | null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem("token");
}
