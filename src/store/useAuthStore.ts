import { create } from 'zustand';

interface AuthState {
  role: 'user' | 'technician';
  isTechnicianOnboarded: boolean;
  userData: any | null;
  setRole: (role: 'user' | 'technician') => void;
  setOnboarded: (status: boolean) => void;
  setUserData: (data: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: 'user',
  isTechnicianOnboarded: false,
  userData: null,
  setRole: (role) => set({ role }),
  setOnboarded: (status) => set({ isTechnicianOnboarded: status }),
  setUserData: (data) => set({ userData: data }),
}));
