import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(persist((set) => ({
  user: null,
  role: 'public',
  language: 'English',
  textScale: 1,
  savedStations: [],
  savedLocations: [],
  alertStatuses: {},
  offline: !navigator.onLine,
  setUser: (user) => set({ user, role: user?.role || 'public' }),
  setRole: (role) => set({ role }),
  logout: () => { localStorage.removeItem('jaldrishti-session'); set({ user: null, role: 'public' }); },
  setLanguage: (language) => set({ language }),
  setTextScale: (textScale) => set({ textScale }),
  toggleSavedStation: (id) => set((state) => ({ savedStations: state.savedStations.includes(id) ? state.savedStations.filter((item) => item !== id) : [...state.savedStations, id] })),
  saveLocation: (location) => set((state) => ({ savedLocations: state.savedLocations.includes(location) ? state.savedLocations : [...state.savedLocations, location] })),
  updateAlertStatus: (id, status) => set((state) => ({ alertStatuses: { ...state.alertStatuses, [id]: status } })),
  setOffline: (offline) => set({ offline }),
}), { name: 'jaldrishti-preferences', partialize: ({ role, language, textScale, savedStations, savedLocations, alertStatuses, user }) => ({ role, language, textScale, savedStations, savedLocations, alertStatuses, user }) }));
