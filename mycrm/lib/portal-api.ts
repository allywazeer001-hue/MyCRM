import axios, { AxiosInstance, AxiosError } from "axios";

// Relative /api/v1 works via Next.js rewrites on any host — no hardcoded URLs.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const portalApi: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

const isPadminUrl = (url?: string) =>
  typeof url === "string" && (url.startsWith("/portal/padmin") || url.includes("/portal/padmin"));

portalApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    if (isPadminUrl(config.url)) {
      // padmin routes are CRM admin-only — always use the main CRM access_token
      const crmToken = localStorage.getItem("access_token");
      if (crmToken) config.headers.Authorization = `Bearer ${crmToken}`;
    } else {
      // Portal user routes — use portal-access-token
      const portalToken = localStorage.getItem("portal-access-token");
      if (portalToken) config.headers.Authorization = `Bearer ${portalToken}`;
    }
  }
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (original.url?.includes("/portal/auth/")) {
        return Promise.reject(error);
      }

      // padmin routes use CRM auth — never redirect to portal login on failure
      if (isPadminUrl(original.url)) {
        return Promise.reject(error);
      }

      try {
        const refreshToken = localStorage.getItem("portal-refresh-token");
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/portal/auth/refresh`, { refreshToken });
          localStorage.setItem("portal-access-token", data.accessToken);
          localStorage.setItem("portal-refresh-token", data.refreshToken);
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return portalApi(original);
        }
      } catch {
        // refresh failed
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("portal-access-token");
        localStorage.removeItem("portal-refresh-token");
        window.location.href = "/portal/login";
      }
    }

    return Promise.reject(error);
  }
);
