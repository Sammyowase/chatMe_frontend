import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import Cookies from 'js-cookie';


const BASE_URL = "https://chatme-backend-nyim.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Check authentication and connect socket
  checkAuth: async () => {
    try {
      const token = Cookies.get("jwtToken");
      console.log("Checking auth with token:", token);

      if (!token) {
        set({ isCheckingAuth: false, authUser: null });
        return;
      }

      const res = await axiosInstance.get("/api/auth/check", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (res.data) {
        set({ authUser: res.data });
        get().connectSocket();
      }
    } catch (error) {
      console.error("Error in checkAuth:", error.response?.data || error.message);
      set({ authUser: null });
      Cookies.remove("jwtToken");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Sign up user
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/api/auth/signup", data, {
        withCredentials: true,
      });
      console.log("Signup Response:", res.data);

      if (res.data?.user) {
        set({ authUser: res.data.user });
        toast.success("Account created successfully");
        get().connectSocket();
      } else {
        throw new Error("Signup response missing user");
      }
    } catch (error) {
      console.error("Signup Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Signup failed. Try again.");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Login user
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/api/auth/login", data, {
        withCredentials: true,
      });
      console.log("Login Response:", res.data);

      if (res.data?.user) {
        set({ authUser: res.data.user });
        toast.success("Logged in successfully");
        get().connectSocket();
      } else {
        throw new Error("Login response missing user");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Login failed. Try again.");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Logout user
  logout: async () => {
    try {
      await axiosInstance.post("/api/auth/logout", {}, { withCredentials: true });
      set({ authUser: null });
      Cookies.remove("jwtToken");
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      console.error("Logout Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Logout failed. Try again.");
    }
  },

  // Update user profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/api/auth/update-profile", data, {
        withCredentials: true,
      });

      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile Update Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Profile update failed.");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Connect to WebSocket
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    if (socket?.connected) {
      socket.disconnect();
    }

    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
    });

    newSocket.on("connect", () => console.log("Socket connected:", newSocket.id));
    newSocket.on("connect_error", (err) => console.error("Socket connection error:", err));
    newSocket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

    set({ socket: newSocket });
  },

  // Disconnect from WebSocket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
    }
    set({ onlineUsers: [], socket: null });
  },
}));
