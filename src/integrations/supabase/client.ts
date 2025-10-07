import axios from "axios";

// Connect frontend → backend (adjust port if needed)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
