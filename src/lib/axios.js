import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://chatme-backend-nyim.onrender.com",
  withCredentials: true,
});
