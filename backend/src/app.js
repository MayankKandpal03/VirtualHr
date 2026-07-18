import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials:true
  }),
);

// Import routes
import userRoutes from "./routes/authRoute.js";

// Use routes
app.use("/api/v1/auth", userRoutes);

export default app;
