import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = "https://chatme-backend-nyim.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: JSON.parse(localStorage.getItem("authUser")) || null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Check authentication and handle socket connection
  checkAuth: async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) return set({ isCheckingAuth: false });

      const res = await axiosInstance.get("/api/auth/check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data) {
        set({ authUser: res.data });
        get().connectSocket();
      }
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
      localStorage.removeItem("authUser");
      localStorage.removeItem("jwtToken");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Sign up user
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/api/auth/signup", data);
      set({ authUser: res.data.user });
      localStorage.setItem("authUser", JSON.stringify(res.data.user));
      localStorage.setItem("jwtToken", res.data.token); // Save JWT token
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Login user
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/api/auth/login", data);
      set({ authUser: res.data.user });
      localStorage.setItem("authUser", JSON.stringify(res.data.user));
      localStorage.setItem("jwtToken", res.data.token); // Save JWT token
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Logout user
  logout: async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      set({ authUser: null });
      localStorage.removeItem("authUser");
      localStorage.removeItem("jwtToken"); // Clear JWT token
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    }
  },

  // Update user profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axiosInstance.put("/api/auth/update-profile", data, {
        headers: {
          Authorization: `Bearer ${token}`, // Add JWT token to request headers
        },
      });
      set({ authUser: res.data });
      localStorage.setItem("authUser", JSON.stringify(res.data)); // Save updated user info
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in updateProfile:", error);
      const errorMessage =
        error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Connect to socket and handle online users
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    // Ensure a new socket connection is created if it doesn't exist or is disconnected
    if (socket?.connected) {
      socket.disconnect();
    }

    const newSocket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });

    newSocket.connect();
    set({ socket: newSocket });

    // Listen for online users
    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  // Disconnect from socket
  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
    }
    set({ onlineUsers: [], socket: null });
  },
}));
