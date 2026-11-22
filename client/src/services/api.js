import axios from "axios";

const API = axios.create({
  baseURL: "https://explorex-backend-jyd0.onrender.com/api",
});

// Automatically attach JWT token and handle FormData
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set the correct multipart boundary for FormData.
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default API;