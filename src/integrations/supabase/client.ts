import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
});

// Optional: sanity check during build or runtime
console.log("🔍 Using API Base URL:", import.meta.env.VITE_API_BASE_URL)
