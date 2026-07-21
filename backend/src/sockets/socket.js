import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Job from "../models/jobModel.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // was missing entirely — any client that could guess/observe a jobId could
  // join its room and receive candidate names/emails/scores with no login at
  // all. Require the same access token used for REST calls to even connect.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Also verify the connected user actually owns this job before letting
    // them join its room — a valid token alone shouldn't grant access to
    // every other HR user's candidate data.
    socket.on("job:subscribe", async (jobId) => {
      try {
        const job = await Job.findOne({ _id: jobId, createdBy: socket.userId }).select("_id");
        if (job) socket.join(`job:${jobId}`);
      } catch {
        // malformed jobId etc. — just don't join the room
      }
    });
    socket.on("job:unsubscribe", (jobId) => socket.leave(`job:${jobId}`));
  });

  return io;
};

// throws loudly if called before initSocket — better than emitting into undefined
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized — call initSocket(httpServer) first");
  return io;
};
