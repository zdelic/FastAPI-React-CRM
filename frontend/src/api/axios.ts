import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

/** 🔑 Base URL — Vercel/Vite */
export const API_URL =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:8000";

/** Jedan axios klijent */
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

/** Absolute URL helper za slike i ostale /uploads/... putanje */
export const absoluteUrl = (path: string) =>
  path?.startsWith("http") ? path : `${API_URL.replace(/\/$/, "")}${path}`;

/** Token interceptor */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    const headers = (config.headers ??= new AxiosHeaders());
    headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export const loaderBridge = api;

export default api;
