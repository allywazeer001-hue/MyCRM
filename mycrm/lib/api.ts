import axios, { AxiosInstance, AxiosError } from "axios";

// Relative /api/v1 works via Next.js rewrites on any host — no hardcoded URLs.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// DEBUG — remove once LAN access is confirmed working
if (typeof window !== "undefined") console.log("[CRM] API URL:", API_URL);

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  // No withCredentials — we use JWT in localStorage, not cookies.
  // withCredentials caused aborted-request errors when the session expired mid-flight.
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      // Don't refresh on auth routes — prevents loops
      if (original.url?.includes("/auth/")) {
        return Promise.reject(error);
      }

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        // Refresh failed — fall through to clear session
      }

      // Clear session and redirect without aborting in-flight requests
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("crm-auth");
        // Use setTimeout so the current request chain settles before navigating
        setTimeout(() => { window.location.href = "/login"; }, 100);
      }
    }

    return Promise.reject(error);
  }
);
