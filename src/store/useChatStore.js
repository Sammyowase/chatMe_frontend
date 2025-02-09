import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axiosInstance.get("/api/messages/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ users: res.data });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong!";
      toast.error(errorMessage);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axiosInstance.get(`/api/messages/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ messages: res.data });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong!";
      toast.error(errorMessage);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const token = localStorage.getItem("jwtToken");
      const res = await axiosInstance.post(`/api/messages/send/${selectedUser._id}`, messageData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set((state) => ({
        messages: [...state.messages, res.data],
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong!";
      toast.error(errorMessage);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!selectedUser || !socket) return; // Guard clause to ensure socket is available

    // Unsubscribe from the previous user
    get().unsubscribeFromMessages();

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
