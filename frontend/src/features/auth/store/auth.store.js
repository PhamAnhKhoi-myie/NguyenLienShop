import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    accessToken: null,
    user: null,
    isAuthReady: false,
    setAuth: ({ accessToken, user }) =>
        set({
            accessToken,
            user,
            isAuthReady: true,
        }),
    setAccessToken: (accessToken) =>
        set({
            accessToken,
        }),
    setUser: (user) =>
        set({
            user,
            isAuthReady: true,
        }),
    finishAuthBootstrap: () =>
        set({
            isAuthReady: true,
        }),
    clearAuth: () =>
        set({
            accessToken: null,
            user: null,
            isAuthReady: true,
        }),
}));
