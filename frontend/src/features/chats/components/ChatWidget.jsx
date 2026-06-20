import {
    Bot,
    ClipboardList,
    ExternalLink,
    LogIn,
    MessageCircle,
    Package,
    Phone,
    Send,
    ShoppingCart,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../../shared/components/Button';
import { ROUTES } from '../../../shared/constants/routes';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { getPrimaryImage } from '../../../shared/utils/getPrimaryImage';
import { useAuthStore } from '../../auth/store/auth.store';
import QuickAddProductModal from '../../products/components/QuickAddProductModal';
import { chatApi } from '../api/chat.api';

const DEFAULT_QUICK_REPLIES = [
    'Tìm túi bao xoài',
    'Hỏi phí ship',
    'Kiểm tra đơn hàng',
];

const INITIAL_MESSAGES = [
    {
        id: 'welcome',
        role: 'assistant',
        content:
            'Chào bạn, mình là trợ lý bán hàng của NguyenLienShop. Bạn cần tìm sản phẩm, hỏi phí ship hay kiểm tra đơn hàng?',
        quick_replies: DEFAULT_QUICK_REPLIES,
    },
];

const orderStatusLabels = {
    PENDING: 'Chờ xác nhận/thanh toán',
    PAID: 'Đã thanh toán',
    PROCESSING: 'Đang chuẩn bị',
    SHIPPED: 'Đang giao',
    DELIVERED: 'Đã giao',
    FAILED: 'Thanh toán thất bại',
    CANCELED: 'Đã hủy',
};

const makeId = () =>
    window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

function getPriceText(product) {
    const min = Number(product?.min_price || 0);
    const max = Number(product?.max_price || 0);

    if (!min && !max) {
        return 'Liên hệ';
    }

    if (min === max || !max) {
        return formatCurrency(min);
    }

    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

function getLatestSupport(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const relatedData = messages[index]?.related_data;

        if (relatedData?.type === 'support') {
            return relatedData.item;
        }

        if (relatedData?.type === 'policy') {
            return relatedData.support;
        }
    }

    return null;
}

function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-muted)] shadow-sm">
                Đang kiểm tra thông tin...
            </div>
        </div>
    );
}

function ChatProductCard({ product, onQuickAdd }) {
    const image = getPrimaryImage(product.image || product.images);
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--color-border)] bg-white p-2.5 shadow-sm">
            <Link
                to={`${ROUTES.PRODUCTS}/${product.id}`}
                className="flex h-20 w-[4.5rem] items-center justify-center rounded-md bg-[var(--color-background)]"
            >
                {image?.url && !imageFailed ? (
                    <img
                        src={image.url}
                        alt={image.alt || product.name}
                        className="h-full w-full object-contain p-1.5"
                        loading="lazy"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <Package className="h-7 w-7 text-[var(--color-text-muted)]" />
                )}
            </Link>

            <div className="min-w-0">
                <Link
                    to={`${ROUTES.PRODUCTS}/${product.id}`}
                    className="line-clamp-2 text-sm font-semibold text-[var(--color-text-main)] hover:text-[var(--color-primary-hover)]"
                >
                    {product.name}
                </Link>
                <p className="mt-1 text-sm font-semibold text-[var(--color-primary-hover)]">
                    {getPriceText(product)}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span
                        className={cn(
                            'h-2 w-2 rounded-full',
                            product.in_stock
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-gray-400'
                        )}
                    />
                    {product.in_stock ? 'Còn hàng' : 'Hết hàng'}
                </div>
                <div className="mt-2 flex gap-2">
                    <Link
                        to={`${ROUTES.PRODUCTS}/${product.id}`}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-background)]"
                    >
                        Xem
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                        type="button"
                        disabled={!product.in_stock}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[var(--color-primary)] px-2 text-xs font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                        onClick={() => onQuickAdd(product)}
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Giỏ
                    </button>
                </div>
            </div>
        </div>
    );
}

function OrderCard({ order }) {
    if (!order) {
        return null;
    }

    const status = String(order.status || '').toUpperCase();

    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">
                        Đơn {order.order_code || `#${order.id?.slice(-6)}`}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {order.item_count || 0} dòng hàng · {order.total_items || 0}{' '}
                        sản phẩm
                    </p>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--color-secondary)] px-2 py-1 text-xs font-medium text-[var(--color-primary-hover)]">
                    {orderStatusLabels[status] || order.status}
                </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
                <span className="text-sm text-[var(--color-text-muted)]">
                    Tổng tiền
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-main)]">
                    {formatCurrency(order.total_amount)}
                </span>
            </div>
            <Link
                to={`${ROUTES.ORDERS}/${order.id}`}
                className="mt-3 inline-flex h-8 items-center justify-center gap-1 rounded-md border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-background)]"
            >
                <ClipboardList className="h-3.5 w-3.5" />
                Xem đơn hàng
            </Link>
        </div>
    );
}

function SupportCard({ support }) {
    if (!support) {
        return null;
    }

    return (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-semibold text-[var(--color-text-main)]">
                Cần shop hỗ trợ trực tiếp?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
                {support.zalo && (
                    <a
                        href={support.zalo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[var(--color-primary)] px-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Zalo
                    </a>
                )}
                {support.phone && (
                    <a
                        href={`tel:${support.phone}`}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-green-300 bg-white px-2 text-xs font-medium text-[var(--color-primary-hover)] hover:bg-green-100"
                    >
                        <Phone className="h-3.5 w-3.5" />
                        {support.phone}
                    </a>
                )}
            </div>
        </div>
    );
}

function PolicyCard({ data }) {
    const topicLabels = {
        shipping: 'Vận chuyển',
        payment: 'Thanh toán',
        return: 'Đổi trả',
    };
    const item = data?.item || {};

    return (
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-3 text-sm shadow-sm">
            <p className="font-semibold text-[var(--color-text-main)]">
                {topicLabels[data.topic] || 'Thông tin hỗ trợ'}
            </p>
            {data.topic === 'shipping' && (
                <div className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
                    <p>
                        Đối tác:{' '}
                        <span className="font-medium text-[var(--color-text-main)]">
                            {item.shipping_partner || 'Đang cập nhật'}
                        </span>
                    </p>
                    <p>
                        Phí mặc định:{' '}
                        <span className="font-medium text-[var(--color-text-main)]">
                            {Number(item.default_shipping_fee || 0) > 0
                                ? formatCurrency(item.default_shipping_fee)
                                : 'Tính ở checkout'}
                        </span>
                    </p>
                </div>
            )}
            {data.topic === 'payment' && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Phương thức: {(item.methods || ['COD']).join(', ')}
                </p>
            )}
            {data.topic === 'return' && (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Cần mã đơn và hình ảnh sản phẩm để shop kiểm tra.
                </p>
            )}
            <SupportCard support={data.support} />
        </div>
    );
}

function RelatedData({ data, onQuickAdd }) {
    if (!data) {
        return null;
    }

    if (data.type === 'products') {
        const items = Array.isArray(data.items) ? data.items : [];

        if (items.length === 0) {
            return null;
        }

        return (
            <div className="mt-2 space-y-2">
                {items.slice(0, 4).map((product) => (
                    <ChatProductCard
                        key={product.id}
                        product={product}
                        onQuickAdd={onQuickAdd}
                    />
                ))}
            </div>
        );
    }

    if (data.type === 'order') {
        return (
            <div className="mt-2">
                <OrderCard order={data.item} />
            </div>
        );
    }

    if (data.type === 'policy') {
        return (
            <div className="mt-2">
                <PolicyCard data={data} />
            </div>
        );
    }

    if (data.type === 'support') {
        return (
            <div className="mt-2">
                <SupportCard support={data.item} />
            </div>
        );
    }

    return null;
}

function ChatMessage({ message, onQuickAdd }) {
    const isUser = message.role === 'user';

    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%]', isUser && 'flex justify-end')}>
                <div
                    className={cn(
                        'rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm',
                        isUser
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'border border-[var(--color-border)] bg-white text-[var(--color-text-main)]'
                    )}
                >
                    {message.content}
                </div>
                {!isUser && (
                    <RelatedData
                        data={message.related_data}
                        onQuickAdd={onQuickAdd}
                    />
                )}
            </div>
        </div>
    );
}

export default function ChatWidget({ open, onOpenChange }) {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const user = useAuthStore((state) => state.user);
    const isAuthReady = useAuthStore((state) => state.isAuthReady);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [sessionId, setSessionId] = useState(null);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [quickAddProduct, setQuickAddProduct] = useState(null);

    const latestAssistant = useMemo(
        () =>
            [...messages]
                .reverse()
                .find((message) => message.role === 'assistant'),
        [messages]
    );
    const quickReplies =
        latestAssistant?.quick_replies?.length > 0
            ? latestAssistant.quick_replies
            : DEFAULT_QUICK_REPLIES;
    const latestSupport = useMemo(() => getLatestSupport(messages), [messages]);

    useEffect(() => {
        if (open) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isSending, open]);

    if (!open) {
        return null;
    }

    const appendAssistantMessage = (content, extra = {}) => {
        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: makeId(),
                role: 'assistant',
                content,
                ...extra,
            },
        ]);
    };

    const ensureSession = async () => {
        if (sessionId) {
            return sessionId;
        }

        const response = await chatApi.createSession({
            title: 'Tư vấn bán hàng',
        });
        const nextSessionId = response.data?._id || response.data?.id;

        setSessionId(nextSessionId);
        return nextSessionId;
    };

    const handleSend = async (value = draft) => {
        const trimmed = value.trim();

        if (!trimmed || isSending || !isAuthReady) {
            return;
        }

        setError(null);
        setDraft('');
        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: makeId(),
                role: 'user',
                content: trimmed,
            },
        ]);

        if (!user) {
            appendAssistantMessage(
                'Bạn vui lòng đăng nhập để mình tạo phiên chat và kiểm tra thông tin đơn hàng/tài khoản giúp nhé.',
                {
                    quick_replies: ['Đăng nhập', 'Chat Zalo'],
                    related_data: latestSupport
                        ? { type: 'support', item: latestSupport }
                        : null,
                }
            );
            return;
        }

        setIsSending(true);

        try {
            const activeSessionId = await ensureSession();
            const response = await chatApi.sendMessage({
                session_id: activeSessionId,
                message: trimmed,
            });
            const assistantMessage = response.data;

            setMessages((currentMessages) => [
                ...currentMessages,
                {
                    id: assistantMessage.id || makeId(),
                    role: 'assistant',
                    content: assistantMessage.content,
                    intent: assistantMessage.intent,
                    confidence: assistantMessage.confidence,
                    related_data: assistantMessage.related_data,
                    quick_replies: assistantMessage.quick_replies,
                    created_at: assistantMessage.created_at,
                },
            ]);
        } catch (requestError) {
            const message =
                requestError.status === 401
                    ? 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại để tiếp tục chat nhé.'
                    : requestError.message ||
                      'Mình chưa gửi được tin nhắn. Bạn thử lại sau một chút nhé.';

            setError(message);
            appendAssistantMessage(message, {
                quick_replies: ['Đăng nhập', 'Chat Zalo'],
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleQuickReply = (reply) => {
        if (reply === 'Đăng nhập') {
            navigate(ROUTES.LOGIN);
            return;
        }

        if (reply === 'Chat Zalo' && latestSupport?.zalo) {
            window.open(latestSupport.zalo, '_blank', 'noopener,noreferrer');
            return;
        }

        if (reply === 'Gọi shop' && latestSupport?.phone) {
            window.open(`tel:${latestSupport.phone}`, '_self');
            return;
        }

        if (reply === 'Xem đơn hàng') {
            navigate(ROUTES.ORDERS);
            return;
        }

        handleSend(reply);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        handleSend();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            <section className="fixed bottom-24 left-3 right-3 z-40 flex h-[min(72vh,620px)] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:bottom-36 sm:left-auto sm:right-12 sm:w-[420px]">
                <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary)] px-4 py-3 text-white">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                            <Bot className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold">
                                Trợ lý NguyenLienShop
                            </h2>
                            <p className="truncate text-xs text-white/80">
                                Tìm sản phẩm, giá, tồn kho và đơn hàng
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/90 hover:bg-white/15"
                        aria-label="Đóng chat"
                        title="Đóng chat"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-background)] px-3 py-4">
                    {messages.map((message) => (
                        <ChatMessage
                            key={message.id}
                            message={message}
                            onQuickAdd={setQuickAddProduct}
                        />
                    ))}
                    {isSending && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-[var(--color-border)] bg-white p-3">
                    {isAuthReady && !user && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Bạn cần đăng nhập để chat với trợ lý và kiểm tra đơn hàng.
                            <Link
                                to={ROUTES.LOGIN}
                                className="ml-1 inline-flex items-center gap-1 font-semibold underline"
                            >
                                <LogIn className="h-3.5 w-3.5" />
                                Đăng nhập
                            </Link>
                        </div>
                    )}

                    <div className="mb-3 flex flex-wrap gap-2">
                        {quickReplies.map((reply) => (
                            <button
                                key={reply}
                                type="button"
                                disabled={isSending || !isAuthReady}
                                className="max-w-full rounded-md border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-main)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary-hover)] disabled:opacity-50"
                                onClick={() => handleQuickReply(reply)}
                            >
                                <span className="line-clamp-1">{reply}</span>
                            </button>
                        ))}
                    </div>

                    {error && (
                        <p className="mb-2 text-xs text-[var(--color-error)]">
                            {error}
                        </p>
                    )}

                    <form
                        className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2"
                        onSubmit={handleSubmit}
                    >
                        <input
                            value={draft}
                            disabled={isSending || !isAuthReady}
                            placeholder={
                                isAuthReady
                                    ? 'Nhập câu hỏi của bạn...'
                                    : 'Đang kiểm tra phiên đăng nhập...'
                            }
                            className="h-10 min-w-0 rounded-md border border-[var(--color-border)] px-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <Button
                            type="submit"
                            className="h-10 w-10 p-0"
                            disabled={!draft.trim() || isSending || !isAuthReady}
                            aria-label="Gửi tin nhắn"
                            title="Gửi tin nhắn"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </section>

            <QuickAddProductModal
                open={Boolean(quickAddProduct)}
                product={quickAddProduct}
                onClose={() => setQuickAddProduct(null)}
            />
        </>
    );
}
