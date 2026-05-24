import { Outlet } from 'react-router-dom';

import Header from './Header';
import Footer from './Footer';
import backgroundImage from '../assets/images/background.png';

function MainLayout() {
    return (
        <div
            className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text-main)]"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="flex min-h-screen flex-col bg-white/[0.85]">
                <Header />

                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
                    <Outlet />
                </main>

                <Footer />
            </div>
        </div>
    );
}

export default MainLayout;