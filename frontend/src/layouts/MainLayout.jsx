import { Outlet } from 'react-router-dom';
import { useState } from 'react';

import Header from './Header';
import Footer from './Footer';
import Breadcrumb from '../shared/components/Breadcrumb';
import FloatingActions from '../shared/components/FloatingActions';
import ChatWidget from '../features/chats/components/ChatWidget';
import backgroundImage from '../assets/images/background.png';

function MainLayout() {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <div
            className="relative flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text-main)]"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="pointer-events-none absolute inset-0 bg-white/[0.35] backdrop-blur-[1px]" />

            <div className="relative z-10 flex min-h-screen flex-col bg-white/[0.80]">
                <Header />

                <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-6 sm:pt-[68px]">
                    <Breadcrumb />
                    <Outlet />
                </main>

                <Footer />
                <FloatingActions onChatClick={() => setIsChatOpen(true)} />
                <ChatWidget open={isChatOpen} onOpenChange={setIsChatOpen} />
            </div>
        </div>
    );
}

export default MainLayout;
