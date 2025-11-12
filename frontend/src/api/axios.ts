import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

// 🔹 1) Jedan centralni API_URL – i za axios i za absoluteUrl
// - Lokalno: REACT_APP_API_URL nije postavljen → pada na http://127.0.0.1:8000
// - Na Vercel-u: REACT_APP_API_URL je postavljen → koristi Railway backend
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// (STARI KOD – možemo obrisati, jer CRA uopće ne koristi import.meta):
// export const baseURL =
//   (import.meta as any)?.env?.VITE_API_URL || "http://localhost:8000";

// 🔹 2) Base URL koji koristi isti API_URL
export const baseURL = API_URL;

// 3) Loader bridge (App.tsx ga puni i smije ga “gasiti”)
export const loaderBridge: {
  show?: () => void;
  hide?: () => void;
} = {};

// 4) Axios instanca
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 5) Proširenje configa s hideLoader flagom
declare module "axios" {
  export interface AxiosRequestConfig {
    hideLoader?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    hideLoader?: boolean;
  }
}

// 6) Request interceptor (token + opcionalni loader)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      const headers = (config.headers ??= new AxiosHeaders());
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!config.hideLoader) {
      try {
        loaderBridge.show?.();
      } catch {}
    }
    return config;
  },
  (error) => {
    try {
      loaderBridge.hide?.();
    } catch {}
    return Promise.reject(error);
  }
);

// 7) Response interceptor (zatvori loader + 401)
api.interceptors.response.use(
  (response) => {
    if (!response.config.hideLoader) {
      try {
        loaderBridge.hide?.();
      } catch {}
    }
    return response;
  },
  (error) => {
    try {
      if (!error?.config?.hideLoader) loaderBridge.hide?.();
    } catch {}
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// 8) Helper za apsolutni URL (slike itd.)
//    Sada koristi isti baseURL (API_URL) – radi i lokalno i na Vercel-u
export const absoluteUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${baseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

export default api;
