import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // ili iz .env, npr. process.env.REACT_APP_API_URL
  withCredentials: false,
});

// Automatski dodaj Bearer token na sve pozive
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`; // << VAŽNO: "Bearer " + token
  }
  return config;
});