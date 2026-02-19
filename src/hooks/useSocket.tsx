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

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
});

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

    useEffect(() => {
        if (!userId) return;

        const SOCKET_URL = process.env.SOCKET_URL!;

        const socket = io(SOCKET_URL, {
            auth: { userId, userName, userAvatar },
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            socket.emit("user:online");
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        socket.on("reconnect", () => {
            setIsConnected(true);
            socket.emit("user:online");
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [userId, userName, userAvatar]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}