import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("job:subscribe", (jobId) => socket.join(`job:${jobId}`));
    socket.on("job:unsubscribe", (jobId) => socket.leave(`job:${jobId}`));
  });

  return io;
};

// throws loudly if called before initSocket — better than emitting into undefined
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized — call initSocket(httpServer) first");
  return io;
};
