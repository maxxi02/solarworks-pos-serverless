"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { printerManager, PrinterManagerStatus } from "@/lib/printers/printerManager";
export interface ReceiptBuildItem {
    name: string;
    price: number;
    quantity: number;
    hasDiscount?: boolean;
    menuType?: 'food' | 'drink';
}

export interface ReceiptBuildInput {
    orderNumber: string;
    customerName: string;
    cashier: string;
    timestamp: Date;
    orderType: "dine-in" | "takeaway";
    tableNumber?: string;
    orderNote?: string;
    items: ReceiptBuildItem[];
    subtotal: number;
    discountTotal: number;
    total: number;
    paymentMethod: "cash" | "gcash" | "split";
    splitPayment?: { cash: number; gcash: number };
    amountPaid?: number;
    change?: number;
    seniorPwdCount?: number;
    seniorPwdIds?: string[];
    isReprint?: boolean;
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    receiptMessage?: string;
}

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "https://rendezvous-server-gpmv.onrender.com";

const HEARTBEAT_INTERVAL = 30000;
const ACTIVITY_DEBOUNCE = 5000;
const INACTIVITY_TIMEOUT = 2 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserStatusUpdate {
    userId: string;
    isOnline: boolean;
    lastSeen: Date;
}
export interface UserActivityUpdate {
    userId: string;
    lastSeen: Date;
}
export interface AttendanceApprovedData {
    attendanceId: string; userId: string; status: string; totalHours?: number; approvedBy: string;
}
export interface AttendanceRejectedData {
    attendanceId: string; userId: string; status: string; rejectionReason: string; rejectedBy: string;
}
export interface AttendanceStatusChangedData {
    attendanceId: string; userId: string; status: string;
}
export interface CustomerOrderItem {
    _id: string; name: string; price: number; quantity: number;
    description?: string; category?: string; menuType?: 'food' | 'drink';
    imageUrl?: string; ingredients: Array<{ name: string; quantity: string; unit: string }>;
}
export interface CustomerOrder {
    orderId: string; customerName: string; items: CustomerOrderItem[];
    orderNote?: string; orderType: 'dine-in' | 'takeaway'; tableNumber?: string;
    subtotal: number; total: number; timestamp: Date;
}

export interface PrintJob {
    jobId: string;
    target: 'receipt' | 'kitchen' | 'both';
    input: ReceiptBuildInput;
}

export interface PrintJobResult {
    jobId: string;
    success: boolean;
    receipt?: boolean;
    kitchen?: boolean;
    error?: string;
}

// NEW: Companion App's live printer connection state
export interface CompanionPrinterStatus {
    usb: boolean;   // USB receipt printer connected in the Companion App
    bt: boolean;    // Bluetooth kitchen printer connected in the Companion App
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    isActive: boolean;

    // Presence
    emitOnline: () => void;
    emitActivity: () => void;

    // Chat
    emitChatConversationsLoad: () => void;
    emitChatMessagesLoad: (conversationId: string, cursor?: string) => void;
    emitChatMessageSend: (conversationId: string, content: string) => void;
    emitChatDirectGetOrCreate: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
    emitChatTypingUpdate: (conversationId: string, isTyping: boolean) => void;
    emitChatMessagesRead: (conversationId: string) => void;

    // Status
    onStatusChanged: (cb: (data: UserStatusUpdate) => void) => void;
    offStatusChanged: (cb?: (data: UserStatusUpdate) => void) => void;
    onActivityUpdated: (cb: (data: UserActivityUpdate) => void) => void;
    offActivityUpdated: (cb?: (data: UserActivityUpdate) => void) => void;

    // Attendance
    onAttendanceApproved: (cb: (data: AttendanceApprovedData) => void) => void;
    offAttendanceApproved: (cb?: (data: AttendanceApprovedData) => void) => void;
    onAttendanceRejected: (cb: (data: AttendanceRejectedData) => void) => void;
    offAttendanceRejected: (cb?: (data: AttendanceRejectedData) => void) => void;
    onAttendanceStatusChanged: (cb: (data: AttendanceStatusChangedData) => void) => void;
    offAttendanceStatusChanged: (cb?: (data: AttendanceStatusChangedData) => void) => void;

    // Orders
    emitPosJoin: () => void;
    emitCustomerOrder: (order: CustomerOrder) => void;
    onNewCustomerOrder: (cb: (order: CustomerOrder) => void) => void;
    offNewCustomerOrder: (cb?: (order: CustomerOrder) => void) => void;

    // Browser printer manager (kept for backward compat)
    printerStatus: PrinterManagerStatus;
    connectUSBPrinter: () => Promise<boolean>;
    connectBluetoothPrinter: () => Promise<boolean>;
    printReceipt: (input: ReceiptBuildInput) => Promise<boolean>;
    printKitchenOrder: (input: ReceiptBuildInput) => Promise<boolean>;

    // Companion App printing
    // companionStatus → live USB/BT state reported by the Companion App
    // printBoth       → emits print:request, waits up to 10 s for print:job:result
    companionStatus: CompanionPrinterStatus;
    printBoth: (input: ReceiptBuildInput) => Promise<{ receipt: boolean; kitchen: boolean }>;
}

const defaultContext: SocketContextValue = {
    socket: null, isConnected: false, isActive: true,
    emitOnline: () => { }, emitActivity: () => { },
    emitChatConversationsLoad: () => { }, emitChatMessagesLoad: () => { },
    emitChatMessageSend: () => { }, emitChatDirectGetOrCreate: () => { },
    emitChatTypingUpdate: () => { }, emitChatMessagesRead: () => { },
    onStatusChanged: () => { }, offStatusChanged: () => { },
    onActivityUpdated: () => { }, offActivityUpdated: () => { },
    onAttendanceApproved: () => { }, offAttendanceApproved: () => { },
    onAttendanceRejected: () => { }, offAttendanceRejected: () => { },
    onAttendanceStatusChanged: () => { }, offAttendanceStatusChanged: () => { },
    emitPosJoin: () => { }, emitCustomerOrder: () => { },
    onNewCustomerOrder: () => { }, offNewCustomerOrder: () => { },
    printerStatus: { usb: 'disconnected', bluetooth: 'disconnected' },
    connectUSBPrinter: async () => false,
    connectBluetoothPrinter: async () => false,
    printReceipt: async () => false,
    printKitchenOrder: async () => false,
    companionStatus: { usb: false, bt: false },
    printBoth: async () => ({ receipt: false, kitchen: false }),
};

const SocketContext = createContext<SocketContextValue>(defaultContext);

// ─── Provider ────────────────────────────────────────────────────────────────

interface SocketProviderProps {
    children: ReactNode;
    userId: string;
    userName: string;
    userAvatar?: string;
}

export function SocketProvider({ children, userId, userName, userAvatar }: SocketProviderProps) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isActive, setIsActive] = useState(true);

    // Browser printer manager state (unchanged from original)
    const [printerStatus, setPrinterStatus] = useState<PrinterManagerStatus>({
        usb: 'disconnected',
        bluetooth: 'disconnected',
    });

    // NEW: Companion App printer state — updated via socket event
    const [companionStatus, setCompanionStatus] = useState<CompanionPrinterStatus>({
        usb: false,
        bt: false,
    });

    // Pending printBoth promises keyed by jobId
    const pendingJobs = useRef<Map<string, {
        resolve: (r: { receipt: boolean; kitchen: boolean }) => void;
        reject: (e: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }>>(new Map());

    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const activityDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Browser Printer Status Sync ─────────────────────────────────────────
    useEffect(() => {
        const unsubscribe = printerManager.onStatusChange(setPrinterStatus);
        printerManager.autoConnectAll();
        return unsubscribe;
    }, []);

    // ─── Socket Connection ────────────────────────────────────────────────────
    useEffect(() => {
        if (!userId) return;

        const socket = io(SOCKET_URL, {
            auth: { userId, userName, userAvatar },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            socket.emit("user:online");
            console.log("✅ Connected:", socket.id);
        });

        socket.on("disconnect", (reason) => {
            setIsConnected(false);
            // Assume companion printers offline when socket drops
            setCompanionStatus({ usb: false, bt: false });
            if (reason === "io server disconnect") socket.connect();
        });

        socket.on("reconnect", () => {
            setIsConnected(true);
            socket.emit("user:online");
            socket.emit("chat:conversations:load");
        });

        socket.on("connect_error", (e) => console.error("❌ Connection error:", e.message));

        // ── NEW: Companion App reports its printer connection state ────────────
        // Server relays companion:printer:status → pos:cashiers room.
        socket.on("companion:printer:status", (status: { usb: boolean; bt: boolean }) => {
            setCompanionStatus(status);
            console.log("[Socket] Companion printer status:", status);
        });

        // ── NEW: Companion replies after executing a print job ─────────────────
        // Resolves the Promise that printBoth() created.
        socket.on("print:job:result", (result: PrintJobResult) => {
            const pending = pendingJobs.current.get(result.jobId);
            if (!pending) return;

            clearTimeout(pending.timer);
            pendingJobs.current.delete(result.jobId);

            if (result.success) {
                pending.resolve({
                    receipt: result.receipt ?? false,
                    kitchen: result.kitchen ?? false,
                });
            } else {
                pending.reject(new Error(result.error ?? "Print failed"));
            }
        });

        // Heartbeat
        heartbeatRef.current = setInterval(() => {
            if (socket.connected) socket.emit("user:activity");
        }, HEARTBEAT_INTERVAL);

        const handleVisibilityChange = () => {
            if (!document.hidden && socket.connected) socket.emit("user:online");
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            // Reject any pending print jobs so callers don't hang forever
            pendingJobs.current.forEach(({ reject, timer }) => {
                clearTimeout(timer);
                reject(new Error("Socket disconnected"));
            });
            pendingJobs.current.clear();
            socket.disconnect();
            socket.removeAllListeners();
            socketRef.current = null;
        };
    }, [userId, userName, userAvatar]);

    // ─── Activity Tracking ────────────────────────────────────────────────────
    useEffect(() => {
        const handleActivity = () => {
            setIsActive(true);
            if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
            activityDebounceRef.current = setTimeout(() => {
                if (socketRef.current?.connected) socketRef.current.emit("user:activity");
            }, ACTIVITY_DEBOUNCE);
            if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
            activityTimeoutRef.current = setTimeout(() => setIsActive(false), INACTIVITY_TIMEOUT);
        };
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(e =>
            window.addEventListener(e, handleActivity, { passive: true })
        );
        handleActivity();
        return () => {
            ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(e =>
                window.removeEventListener(e, handleActivity)
            );
            if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
            if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
        };
    }, []);

    // ─── Emitters ─────────────────────────────────────────────────────────────
    const emitOnline = () => socketRef.current?.connected && socketRef.current.emit("user:online");
    const emitActivity = () => socketRef.current?.connected && socketRef.current.emit("user:activity");
    const emitChatConversationsLoad = () => socketRef.current?.emit("chat:conversations:load");
    const emitChatMessagesLoad = (conversationId: string, cursor?: string) =>
        socketRef.current?.emit("chat:messages:load", { conversationId, cursor });
    const emitChatMessageSend = (conversationId: string, content: string) =>
        socketRef.current?.emit("chat:message:send", { conversationId, content });
    const emitChatDirectGetOrCreate = (targetUserId: string, targetUserName: string, targetUserAvatar?: string) =>
        socketRef.current?.emit("chat:direct:get-or-create", { targetUserId, targetUserName, targetUserAvatar: targetUserAvatar ?? "" });
    const emitChatTypingUpdate = (conversationId: string, isTyping: boolean) =>
        socketRef.current?.emit("chat:typing:update", { conversationId, isTyping });
    const emitChatMessagesRead = (conversationId: string) =>
        socketRef.current?.emit("chat:messages:read", { conversationId });
    const emitPosJoin = () => socketRef.current?.emit('pos:join');
    const emitCustomerOrder = (order: CustomerOrder) => socketRef.current?.emit('order:new:trigger', order);

    // ─── Listeners ────────────────────────────────────────────────────────────
    const onStatusChanged = (cb: (d: UserStatusUpdate) => void) => socketRef.current?.on("user:status:changed", cb);
    const offStatusChanged = (cb?: (d: UserStatusUpdate) => void) => socketRef.current?.off("user:status:changed", cb);
    const onActivityUpdated = (cb: (d: UserActivityUpdate) => void) => socketRef.current?.on("user:activity:updated", cb);
    const offActivityUpdated = (cb?: (d: UserActivityUpdate) => void) => socketRef.current?.off("user:activity:updated", cb);
    const onAttendanceApproved = (cb: (d: AttendanceApprovedData) => void) => socketRef.current?.on("attendance:approved", cb);
    const offAttendanceApproved = (cb?: (d: AttendanceApprovedData) => void) => socketRef.current?.off("attendance:approved", cb);
    const onAttendanceRejected = (cb: (d: AttendanceRejectedData) => void) => socketRef.current?.on("attendance:rejected", cb);
    const offAttendanceRejected = (cb?: (d: AttendanceRejectedData) => void) => socketRef.current?.off("attendance:rejected", cb);
    const onAttendanceStatusChanged = (cb: (d: AttendanceStatusChangedData) => void) => socketRef.current?.on("attendance:status:changed", cb);
    const offAttendanceStatusChanged = (cb?: (d: AttendanceStatusChangedData) => void) => socketRef.current?.off("attendance:status:changed", cb);
    const onNewCustomerOrder = (cb: (order: CustomerOrder) => void) => socketRef.current?.on('order:new', cb);
    const offNewCustomerOrder = (cb?: (order: CustomerOrder) => void) => socketRef.current?.off('order:new', cb);

    // ─── Browser Printer Actions (unchanged) ─────────────────────────────────
    const connectUSBPrinter = () => printerManager.connectUSB();
    const connectBluetoothPrinter = () => printerManager.connectBluetooth();

    const generateJobId = () =>
        `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const printReceipt = async (input: ReceiptBuildInput): Promise<boolean> => {
        if (!socketRef.current?.connected) return false;
        socketRef.current.emit("print:request", { jobId: generateJobId(), target: "receipt", input });
        return true;
    };

    const printKitchenOrder = async (input: ReceiptBuildInput): Promise<boolean> => {
        if (!socketRef.current?.connected) return false;
        const hasFood = input.items.some(item => item.menuType === 'food');
        if (!hasFood) return true; // Pretend success since nothing to cook
        socketRef.current.emit("print:request", { jobId: generateJobId(), target: "kitchen", input });
        return true;
    };

    // ── NEW: Promise-based printBoth ───────────────────────────────────────────
    // Emits print:request and waits up to 10 s for the companion's
    // print:job:result reply. Returns which printers actually fired.
    const printBoth = (input: ReceiptBuildInput): Promise<{ receipt: boolean; kitchen: boolean }> => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket?.connected) {
                reject(new Error("Companion App not connected"));
                return;
            }

            const jobId = generateJobId();

            const timer = setTimeout(() => {
                pendingJobs.current.delete(jobId);
                reject(new Error("Print timeout — Companion App did not respond in 10 s"));
            }, 10_000);

            pendingJobs.current.set(jobId, { resolve, reject, timer });

            const hasFood = input.items.some(item => item.menuType === 'food');
            const target = hasFood ? "both" : "receipt";

            socket.emit("print:request", { jobId, target, input });
            console.log("[Socket] print:request emitted", jobId, "target:", target);
        });
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SocketContext.Provider value={{
            socket: socketRef.current, isConnected, isActive,
            emitOnline, emitActivity,
            emitChatConversationsLoad, emitChatMessagesLoad, emitChatMessageSend,
            emitChatDirectGetOrCreate, emitChatTypingUpdate, emitChatMessagesRead,
            onStatusChanged, offStatusChanged, onActivityUpdated, offActivityUpdated,
            onAttendanceApproved, offAttendanceApproved, onAttendanceRejected, offAttendanceRejected,
            onAttendanceStatusChanged, offAttendanceStatusChanged,
            emitPosJoin, emitCustomerOrder, onNewCustomerOrder, offNewCustomerOrder,
            printerStatus, connectUSBPrinter, connectBluetoothPrinter,
            printReceipt, printKitchenOrder,
            companionStatus,
            printBoth,
        }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}