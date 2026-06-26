import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  if (process.env.NODE_ENV === "production") {
    console.error("Warning: NEXT_PUBLIC_API_URL environment variable is missing in production! API requests will fail or fallback to localhost.");
  } else {
    console.info("NEXT_PUBLIC_API_URL is not set; falling back to http://localhost:3000/api for local development.");
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  xsrfCookieName: "csrfToken",
  xsrfHeaderName: "X-CSRF-Token",
});

// Helper to extract a cookie value by name on the client side
const getCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

// Request interceptor to attach Bearer token and CSRF token manually
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      // 1. Attach JWT token (fallback if cookies are not used)
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. Attach CSRF token (bypasses Axios cross-origin / cross-port safeguard)
      const csrfToken = getCookie("csrfToken");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization errors or format standard outputs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we receive a 401 Unauthorized, we can trigger state clearance
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      // Optional: redirect to login if we are inside dashboard (handled in context)
    }
    return Promise.reject(error);
  }
);

export default apiClient;
