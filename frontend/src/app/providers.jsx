import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../shared/api/queryClient';
import AuthBootstrap from '../features/auth/components/AuthBootstrap';

export default function Providers({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthBootstrap>{children}</AuthBootstrap>
        </QueryClientProvider>
    );
}
