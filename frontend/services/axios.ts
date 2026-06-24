import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach Bearer token if it exists in localStorage (fallback if cookie is not used)
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
