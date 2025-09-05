import axios from "axios";

/** ⬇️ DODANO: bridge za globalni loader (puni se u App.tsx) */
type LoaderBridge = { show?: () => void; hide?: () => void };
export const loaderBridge: LoaderBridge = {};

/** ⬇️ DODANO: helper koji odlučuje kada palimo loader */
const shouldShow = (config: any) => {
  const explicit = config?.meta?.showLoader === true;
  const ct = String(
    config?.headers?.["Content-Type"] ?? config?.headers?.["content-type"] ?? ""
  );
  const isMultipart = ct.includes("multipart/form-data");
  const hasUploadProgress = typeof config?.onUploadProgress === "function";
  return explicit || isMultipart || hasUploadProgress;
};

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// ➜ uvijek dodaj Bearer token iz localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  /** ⬇️ DODANO: prikaz loadera na odlasku requesta */
  if (shouldShow(config)) {
    loaderBridge.show?.();
  }

  return config;
});

/** ⬇️ DODANO: response interceptor za gašenje loadera (staviti NAKON tvog 401 handlera ili PRIJE – radi u oba smjera, ali bolje NAKON da se izvrši prvi zbog LIFO) */
api.interceptors.response.use(
  (res) => {
    if (shouldShow(res.config)) {
      loaderBridge.hide?.();
    }
    return res;
  },
  (err) => {
    if (err?.config && shouldShow(err.config)) {
      loaderBridge.hide?.();
    }
    return Promise.reject(err);
  }
);

// ➜ ako istekne token, probaj refresh + retry; ako ne uspije, logout
let isRefreshing = false;
let waiters: Array<(t: string | null) => void> = [];

const notifyAll = (t: string | null) => {
  waiters.forEach(fn => fn(t));
  waiters = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config || {};

    // Nije 401 → pusti dalje
    if (status !== 401) return Promise.reject(err);

    // Ako je pao baš /refresh ili smo već probali retry za ovaj request → hard logout
    if ((original as any)._retry || String(original.url || "").includes("/refresh")) {
      localStorage.removeItem("token");
      window.location.href = "/";
      return Promise.reject(err);
    }

    // Označi da ćemo probati refresh za ovaj request
    (original as any)._retry = true;

    // Ako refresh već traje, stani u red i čekaj novi token
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push((newToken) => {
          if (!newToken) return reject(err);
          (original.headers = original.headers || {});
          (original.headers as any).Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    // Kreni raditi refresh
    isRefreshing = true;
    try {
      // ❗ backend treba da postoji: POST /refresh → { access_token: "..." }
      const r = await axios.post("http://127.0.0.1:8000/refresh", {}, { withCredentials: true });
      const newToken = r.data?.access_token;
      if (!newToken) throw new Error("No access_token from /refresh");

      // Spremi i obavijesti sve čekajuće
      localStorage.setItem("token", newToken);
      notifyAll(newToken);

      // Retry originalnog requesta s novim tokenom
      (original.headers = original.headers || {});
      (original.headers as any).Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      // Refresh nije uspio → svi out, hard logout
      notifyAll(null);
      localStorage.removeItem("token");
      window.location.href = "/";
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
export default api;