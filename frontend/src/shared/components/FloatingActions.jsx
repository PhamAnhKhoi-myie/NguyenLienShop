import { translate } from '../i18n/index';
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
            <div className="fixed bottom-4 left-3 z-30 flex items-center gap-2 sm:bottom-12 sm:left-6 sm:flex-col sm:gap-8">
                <a
                    href={zaloLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={translate('text.chat_zalo')}
                    className="flex h-11 w-11 items-center justify-center transition hover:scale-110 sm:h-14 sm:w-14"
                >
                    <img
                        src={zaloIcon}
                        alt={translate('text.zalo')}
                        className="h-11 w-11 object-contain sm:h-14 sm:w-14"
                    />
                </a>

                <a
                    href={`tel:${phoneNumber}`}
                    title={translate('text.call')}
                    className="flex h-11 w-11 animate-[phone-ring_1.4s_ease-in-out_infinite] items-center justify-center transition hover:scale-110 sm:h-14 sm:w-14"
                >
                    <img
                        src={phoneIcon}
                        alt={translate('text.phone_number')}
                        className="h-11 w-11 object-contain sm:h-14 sm:w-14"
                    />
                </a>

                <button
                    type="button"
                    onClick={scrollToTop}
                    title={translate('text.go_to_top')}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-lg transition hover:scale-110 hover:shadow-xl sm:h-14 sm:w-14"
                >
                    <ArrowUp className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
            </div>

            <button
                type="button"
                onClick={openChatBot}
                title={translate('text.chat_with_ai')}
                className="fixed bottom-4 right-3 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl transition hover:scale-105 hover:shadow-2xl sm:bottom-12 sm:right-12 sm:h-20 sm:w-20"
            >
                <img
                    src={chatbotIcon}
                    alt={translate('text.chat_bot')}
                    className="h-11 w-11 object-contain sm:h-16 sm:w-16"
                />
            </button>
        </>
    );
}

export default FloatingActions;
