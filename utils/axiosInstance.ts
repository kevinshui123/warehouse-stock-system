import axios from "axios";
import Cookies from "js-cookie";
import { getApiBaseUrl } from "@/lib/api/get-api-base-url";

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Ensure cookies are sent with requests
});

axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get("session_id");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
