import { ArrowUp } from 'lucide-react';

import zaloIcon from '../../assets/images/zalo-icon.png';
import phoneIcon from '../../assets/images/phone-icon.png';
import chatbotIcon from '../../assets/images/chatbot-icon.png';

function FloatingActions() {
    const phoneNumber = '0900000000';
    const zaloLink = 'https://zalo.me/0900000000';

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const openChatBot = () => {
        console.log('Open chatbot');
    };

    return (
        <>
            <div className="fixed bottom-12 left-6 z-50 flex flex-col items-center gap-8">
                <a
                    href={zaloLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Chat Zalo"
                    className="flex h-14 w-14 items-center justify-center transition hover:scale-110"
                >
                    <img
                        src={zaloIcon}
                        alt="Zalo"
                        className="h-14 w-14 object-contain"
                    />
                </a>

                <a
                    href={`tel:${phoneNumber}`}
                    title="Gọi điện thoại"
                    className="flex h-14 w-14 animate-[phone-ring_1.4s_ease-in-out_infinite] items-center justify-center transition hover:scale-110"
                >
                    <img
                        src={phoneIcon}
                        alt="Số điện thoại"
                        className="h-14 w-14 object-contain"
                    />
                </a>

                <button
                    type="button"
                    onClick={scrollToTop}
                    title="Lên đầu trang"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-lg transition hover:scale-110 hover:shadow-xl"
                >
                    <ArrowUp className="h-8 w-8" />
                </button>
            </div>

            <button
                type="button"
                onClick={openChatBot}
                title="Chat với AI"
                className="fixed bottom-12 right-12 z-50 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition hover:scale-105 hover:shadow-2xl"
            >
                <img
                    src={chatbotIcon}
                    alt="Chat bot"
                    className="h-16 w-16 object-contain"
                />
            </button>
        </>
    );
}

export default FloatingActions;