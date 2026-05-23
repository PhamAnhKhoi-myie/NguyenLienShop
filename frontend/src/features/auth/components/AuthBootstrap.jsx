import { useEffect } from 'react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

let bootstrapPromise = null;
let lastBootstrapResult = null;
let lastBootstrapAt = 0;

const BOOTSTRAP_CACHE_MS = 1000;

const bootstrapAuthSession = async () => {
    const now = Date.now();

    if (
        lastBootstrapResult &&
        now - lastBootstrapAt < BOOTSTRAP_CACHE_MS
    ) {
        return lastBootstrapResult;
    }

    if (!bootstrapPromise) {
        bootstrapPromise = authApi
            .refresh()
            .then(async (refreshResponse) => {
                const accessToken = refreshResponse.data?.accessToken;

                if (!accessToken) {
                    throw new Error('Missing access token');
                }

                useAuthStore.getState().setAccessToken(accessToken);

                const meResponse = await authApi.getMe();
                const result = {
                    accessToken,
                    user: meResponse.data,
                };

                lastBootstrapResult = result;
                lastBootstrapAt = Date.now();

                return result;
            })
            .finally(() => {
                bootstrapPromise = null;
            });
    }

    return bootstrapPromise;
};

export default function AuthBootstrap({ children }) {
    const setAuth = useAuthStore((state) => state.setAuth);
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const finishAuthBootstrap = useAuthStore(
        (state) => state.finishAuthBootstrap
    );

    useEffect(() => {
        let isMounted = true;

        bootstrapAuthSession()
            .then(({ accessToken, user }) => {
                if (isMounted) {
                    setAuth({
                        accessToken,
                        user,
                    });
                }
            })
            .catch(() => {
                if (isMounted) {
                    clearAuth();
                }
            })
            .finally(() => {
                if (isMounted) {
                    finishAuthBootstrap();
                }
            });

        return () => {
            isMounted = false;
        };
    }, [clearAuth, finishAuthBootstrap, setAuth]);

    return children;
}
