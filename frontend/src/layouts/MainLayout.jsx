import { Outlet } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';

function MainLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text-main)]">
            <Header />

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}

export default MainLayout;