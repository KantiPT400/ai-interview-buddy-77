import axios from "axios";

// Connect frontend → backend (adjust port if needed)
export const api = axios.create({
  baseURL: "http://localhost:4000/api",
});