import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isBootstrapped: false, // true once we've tried to restore a session on load

      setSession: (user, accessToken) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
      setBootstrapped: () => set({ isBootstrapped: true }),
    }),
    {
      name: "virtualhr-auth",
      // Only persist the user for a nicer reload experience — the access token is
      // short-lived and always re-minted from the httpOnly refresh cookie on boot.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
