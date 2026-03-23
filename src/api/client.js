import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dtms_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function safeRequest(request, fallbackMessage) {
  try {
    const response = await request();
    return response.data;
  } catch (error) {
    if (!error.response) {
      throw new Error("Unable to reach server. Please confirm backend is running.");
    }
    const message = error.response?.data?.message || fallbackMessage || "Request failed";
    throw new Error(message);
  }
}

export function showApiError(error, fallbackMessage) {
  toast.error(error.message || fallbackMessage || "Something went wrong");
}

export default api;
