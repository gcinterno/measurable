import axios from "axios";

import { API_URL } from "@/lib/api/config";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
