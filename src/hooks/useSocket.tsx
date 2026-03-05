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

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "https://rendezvous-server-gpmv.onrender.com";

const HEARTBEAT_INTERVAL = 30000;          // 30 seconds
const ACTIVITY_DEBOUNCE = 5000;            // 5 seconds
const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// ─── Types ───────────────────────────────────────────────────────────────────

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
    attendanceId: string;
    userId: string;
    status: string;
    totalHours?: number;
    approvedBy: string;
}

export interface AttendanceRejectedData {
    attendanceId: string;
    userId: string;
    status: string;
    rejectionReason: string;
    rejectedBy: string;
}

export interface AttendanceStatusChangedData {
    attendanceId: string;
    userId: string;
    status: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    isActive: boolean;

    // ─── Presence ────────────────────────────────────────────────
    emitOnline: () => void;
    emitActivity: () => void;

    // ─── Chat emitters ────────────────────────────────────────────
    emitChatConversationsLoad: () => void;
    emitChatMessagesLoad: (conversationId: string, cursor?: string) => void;
    emitChatMessageSend: (conversationId: string, content: string) => void;
    emitChatDirectGetOrCreate: (targetUserId: string, targetUserName: string, targetUserAvatar?: string) => void;
    emitChatTypingUpdate: (conversationId: string, isTyping: boolean) => void;
    emitChatMessagesRead: (conversationId: string) => void;

    // ─── Printer Status ──────────────────────────────────────────
    printerStatus: { usb: boolean; bt: boolean };

    // ─── Status listeners ─────────────────────────────────────────
    onStatusChanged: (cb: (data: UserStatusUpdate) => void) => void;
    offStatusChanged: (cb?: (data: UserStatusUpdate) => void) => void;
    onActivityUpdated: (cb: (data: UserActivityUpdate) => void) => void;
    offActivityUpdated: (cb?: (data: UserActivityUpdate) => void) => void;

    // ─── Attendance listeners ─────────────────────────────────────
    onAttendanceApproved: (cb: (data: AttendanceApprovedData) => void) => void;
    offAttendanceApproved: (cb?: (data: AttendanceApprovedData) => void) => void;
    onAttendanceRejected: (cb: (data: AttendanceRejectedData) => void) => void;
    offAttendanceRejected: (cb?: (data: AttendanceRejectedData) => void) => void;
    onAttendanceStatusChanged: (cb: (data: AttendanceStatusChangedData) => void) => void;
    offAttendanceStatusChanged: (cb?: (data: AttendanceStatusChangedData) => void) => void;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    isActive: true,
    printerStatus: { usb: false, bt: false },
    emitOnline: () => { },
    emitActivity: () => { },
    emitChatConversationsLoad: () => { },
    emitChatMessagesLoad: () => { },
    emitChatMessageSend: () => { },
    emitChatDirectGetOrCreate: () => { },
    emitChatTypingUpdate: () => { },
    emitChatMessagesRead: () => { },
    onStatusChanged: () => { },
    offStatusChanged: () => { },
    onActivityUpdated: () => { },
    offActivityUpdated: () => { },
    onAttendanceApproved: () => { },
    offAttendanceApproved: () => { },
    onAttendanceRejected: () => { },
    offAttendanceRejected: () => { },
    onAttendanceStatusChanged: () => { },
    offAttendanceStatusChanged: () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SocketProviderProps {
    children: ReactNode;
    userId: string;
    userName: string;
    userAvatar?: string;
}

export function SocketProvider({
    children,
    userId,
    userName,
    userAvatar,
}: SocketProviderProps) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [printerStatus, setPrinterStatus] = useState({ usb: false, bt: false });

    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const activityDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ─── Socket Connection ────────────────────────────────────────
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
            socket.emit("pos:join");
            console.log("✅ Connected to Socket.IO server:", socket.id);
        });

        socket.on("disconnect", (reason) => {
            setIsConnected(false);
            setPrinterStatus({ usb: false, bt: false });
            console.log("🔌 Disconnected:", reason);
            if (reason === "io server disconnect") {
                socket.connect();
            }
        });

        socket.on("companion:printer:status", (status: { usb: boolean; bt: boolean }) => {
            console.log("🖨️ Printer status updated:", status);
            setPrinterStatus(status);
        });

        socket.on("reconnect", (attemptNumber) => {
            setIsConnected(true);
            socket.emit("user:online");
            socket.emit("chat:conversations:load");
            console.log("🔄 Reconnected after", attemptNumber, "attempts");
        });

        socket.on("connect_error", (error) => console.error("❌ Connection error:", error.message));
        socket.on("reconnect_attempt", (n) => console.log("🔄 Reconnection attempt", n));
        socket.on("reconnect_error", (error) => console.error("❌ Reconnection error:", error.message));
        socket.on("reconnect_failed", () => console.error("❌ Reconnection failed"));
        socket.on("error", (error) => console.error("❌ Socket error:", error));

        // ─── Heartbeat ───────────────────────────────────────────
        heartbeatRef.current = setInterval(() => {
            if (socket.connected) socket.emit("user:activity");
        }, HEARTBEAT_INTERVAL);

        // ─── Page Visibility ─────────────────────────────────────
        const handleVisibilityChange = () => {
            if (!document.hidden && socket.connected) {
                socket.emit("user:online");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            socket.disconnect();
            socket.removeAllListeners();
            socketRef.current = null;
        };
    }, [userId, userName, userAvatar]);

    // ─── Activity Tracking ────────────────────────────────────────
    useEffect(() => {
        const handleActivity = () => {
            setIsActive(true);

            if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
            activityDebounceRef.current = setTimeout(() => {
                if (socketRef.current?.connected) {
                    socketRef.current.emit("user:activity");
                }
            }, ACTIVITY_DEBOUNCE);

            if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
            activityTimeoutRef.current = setTimeout(() => {
                setIsActive(false);
            }, INACTIVITY_TIMEOUT);
        };

        window.addEventListener("mousemove", handleActivity, { passive: true });
        window.addEventListener("keydown", handleActivity, { passive: true });
        window.addEventListener("click", handleActivity, { passive: true });
        window.addEventListener("scroll", handleActivity, { passive: true });
        window.addEventListener("touchstart", handleActivity, { passive: true });

        handleActivity();

        return () => {
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            window.removeEventListener("click", handleActivity);
            window.removeEventListener("scroll", handleActivity);
            window.removeEventListener("touchstart", handleActivity);
            if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
            if (activityDebounceRef.current) clearTimeout(activityDebounceRef.current);
        };
    }, []);

    // ─── Emitters ─────────────────────────────────────────────────

    const emitOnline = () => {
        if (socketRef.current?.connected) socketRef.current.emit("user:online");
    };
    const emitActivity = () => {
        if (socketRef.current?.connected) socketRef.current.emit("user:activity");
    };
    const emitChatConversationsLoad = () =>
        socketRef.current?.emit("chat:conversations:load");
    const emitChatMessagesLoad = (conversationId: string, cursor?: string) =>
        socketRef.current?.emit("chat:messages:load", { conversationId, cursor });
    const emitChatMessageSend = (conversationId: string, content: string) =>
        socketRef.current?.emit("chat:message:send", { conversationId, content });
    const emitChatDirectGetOrCreate = (
        targetUserId: string,
        targetUserName: string,
        targetUserAvatar?: string,
    ) =>
        socketRef.current?.emit("chat:direct:get-or-create", {
            targetUserId,
            targetUserName,
            targetUserAvatar: targetUserAvatar ?? "",
        });
    const emitChatTypingUpdate = (conversationId: string, isTyping: boolean) =>
        socketRef.current?.emit("chat:typing:update", { conversationId, isTyping });
    const emitChatMessagesRead = (conversationId: string) =>
        socketRef.current?.emit("chat:messages:read", { conversationId });

    // ─── Listeners ────────────────────────────────────────────────

    const onStatusChanged = (cb: (data: UserStatusUpdate) => void) =>
        socketRef.current?.on("user:status:changed", cb);
    const offStatusChanged = (cb?: (data: UserStatusUpdate) => void) =>
        socketRef.current?.off("user:status:changed", cb);

    const onActivityUpdated = (cb: (data: UserActivityUpdate) => void) =>
        socketRef.current?.on("user:activity:updated", cb);
    const offActivityUpdated = (cb?: (data: UserActivityUpdate) => void) =>
        socketRef.current?.off("user:activity:updated", cb);

    const onAttendanceApproved = (cb: (data: AttendanceApprovedData) => void) =>
        socketRef.current?.on("attendance:approved", cb);
    const offAttendanceApproved = (cb?: (data: AttendanceApprovedData) => void) =>
        socketRef.current?.off("attendance:approved", cb);

    const onAttendanceRejected = (cb: (data: AttendanceRejectedData) => void) =>
        socketRef.current?.on("attendance:rejected", cb);
    const offAttendanceRejected = (cb?: (data: AttendanceRejectedData) => void) =>
        socketRef.current?.off("attendance:rejected", cb);

    const onAttendanceStatusChanged = (cb: (data: AttendanceStatusChangedData) => void) =>
        socketRef.current?.on("attendance:status:changed", cb);
    const offAttendanceStatusChanged = (cb?: (data: AttendanceStatusChangedData) => void) =>
        socketRef.current?.off("attendance:status:changed", cb);

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                isConnected,
                isActive,
                printerStatus,
                emitOnline,
                emitActivity,
                emitChatConversationsLoad,
                emitChatMessagesLoad,
                emitChatMessageSend,
                emitChatDirectGetOrCreate,
                emitChatTypingUpdate,
                emitChatMessagesRead,
                onStatusChanged,
                offStatusChanged,
                onActivityUpdated,
                offActivityUpdated,
                onAttendanceApproved,
                offAttendanceApproved,
                onAttendanceRejected,
                offAttendanceRejected,
                onAttendanceStatusChanged,
                offAttendanceStatusChanged,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}