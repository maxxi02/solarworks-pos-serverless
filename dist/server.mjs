"use strict";
import "dotenv/config";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT) || 8080;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const httpServer = createServer(handle);
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // allow Next.js frontend
        },
    });
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);
        socket.on("join-room", ({ room, username }) => {
            socket.join(room);
            // Save username on socket
            socket.data.username = username;
            socket.data.room = room;
            console.log(`${username} joined ${room}`);
            socket.to(room).emit("user_joined", `${username} joined room`);
        });
        socket.on("message", ({ message }) => {
            const username = socket.data.username;
            const room = socket.data.room;
            socket.to(room).emit("message", {
                sender: username,
                message,
            });
        });
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
    httpServer.listen(port, () => {
        console.log(`Server running on http://${hostname}:${port}`);
    });
});
