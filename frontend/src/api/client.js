import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive the httpOnly refresh-token cookie
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh-on-401: if a single call is already refreshing, let concurrent
// 401s share that same promise instead of each firing their own refresh.
let refreshPromise = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRoute =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/register") ||
      original?.url?.includes("/auth/refresh-token");

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = apiClient.post("/auth/refresh-token").finally(() => {
            refreshPromise = null;
          });
        }
        const res = await refreshPromise;
        const newToken = res.data.data.accessToken;
        useAuthStore.getState().setSession(res.data.data.user, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshErr) {
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

// ---------- auth ----------
export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload).then((r) => r.data.data),
  login: (payload) => apiClient.post("/auth/login", payload).then((r) => r.data.data),
  refresh: () => apiClient.post("/auth/refresh-token").then((r) => r.data.data),
  logout: () => apiClient.post("/auth/logout").then((r) => r.data.data),
};

// ---------- jobs ----------
export const jobsApi = {
  create: (payload) => apiClient.post("/jobs", payload).then((r) => r.data.data),
  list: () => apiClient.get("/jobs").then((r) => r.data.data),
  getById: (jobId) => apiClient.get(`/jobs/${jobId}`).then((r) => r.data.data),
  updateScoringWeights: (jobId, priorityScore) =>
    apiClient.patch(`/jobs/${jobId}/scoring-weights`, { priorityScore }).then((r) => r.data.data),
};

// ---------- candidates ----------
export const candidatesApi = {
  upload: (jobId, files, onUploadProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("resumes", file));
    return apiClient
      .post(`/candidates/${jobId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      })
      .then((r) => r.data.data);
  },
  // every candidate for the job, any status — powers the progress screen
  listAll: (jobId) =>
    apiClient.get(`/candidates/${jobId}`, { params: { view: "all" } }).then((r) => r.data.data),
  // top-N by score, HR-excluded ones filtered out — the results screen
  listTop: (jobId, limit) =>
    apiClient.get(`/candidates/${jobId}`, { params: limit ? { limit } : {} }).then((r) => r.data.data),
  getById: (jobId, candidateId) =>
    apiClient.get(`/candidates/${jobId}/${candidateId}`).then((r) => r.data.data),
  update: (jobId, candidateId, payload) =>
    apiClient.patch(`/candidates/${jobId}/${candidateId}`, payload).then((r) => r.data.data),
};

// ---------- email ----------
export const emailApi = {
  sendBulk: (jobId, payload) => apiClient.post(`/jobs/${jobId}/send`, payload).then((r) => r.data.data),
};
