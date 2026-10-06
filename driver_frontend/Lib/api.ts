import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "https://bestfoodmarket.onrender.com/api";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

// Attach token + country header on every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const country = await AsyncStorage.getItem("country");
    config.headers["X-Country-Code"] = country || "IE";
  } catch {}
  return config;
});

// Handle 401 → clear token
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await AsyncStorage.removeItem("token");
      } catch {}
    }
    return Promise.reject(err);
  }
);
