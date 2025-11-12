import axios, { AxiosInstance } from "axios";

// Bridge za loader – kao ranije
export const loaderBridge: { show?: () => void; hide?: () => void } = {};

const baseURL =
  // Vite
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env?.VITE_API_URL) ||
  // CRA
  process.env.REACT_APP_API_URL ||
  // fallback za lokalni rad
  "http://127.0.0.1:8000";

const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true, // ako koristiš kolačiće/sesiju
});

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

export default api;
