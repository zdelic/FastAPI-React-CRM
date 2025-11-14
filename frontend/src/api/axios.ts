// src/api/axios.ts
import axios, { AxiosInstance } from "axios";

// Globalni bridge za loader (nije Axios instanca)
export const loaderBridge: { show?: () => void; hide?: () => void } = {};

// ✅ Centralizovan base URL (Vite → CRA → fallback)
export const BASE_API_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8001"; // <- lokalni backend port

// ✅ Axios instanca
const fromEnv = process.env.REACT_APP_API_URL;
const fromWindow = typeof window !== "undefined"
  ? `${window.location.protocol}//${window.location.hostname}:8001`
  : undefined;

const baseURL = fromEnv || fromWindow || "http://127.0.0.1:8001";

const api = axios.create({ baseURL, withCredentials: true });

export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  const u = String(pathOrUrl);
  // već apsolutno
  if (/^https?:\/\//i.test(u)) {
    // ako je stari localhost → premapiraj na pravi host
    return u.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, BASE_API_URL);
  }
  // relativna putanja (npr. /uploads/...)
  if (u.startsWith("/")) return `${BASE_API_URL}${u}`;
  return `${BASE_API_URL}/${u}`;
}


// Interceptori + pozivanje loader-a (ako si ga povezao u UI-ju)
api.interceptors.request.use(
  (cfg) => {
    loaderBridge.show?.();
    return cfg;
  },
  (err) => {
    loaderBridge.hide?.();
    return Promise.reject(err);
  }
);

api.interceptors.response.use(
  (res) => {
    loaderBridge.hide?.();
    return res;
  },
  (err) => {
    loaderBridge.hide?.();
    return Promise.reject(err);
  }
);

// u src/api/axios.ts
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});



export default api;
