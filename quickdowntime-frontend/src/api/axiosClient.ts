// src/api/axiosClient.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(err);
  }
);

export default client;
