import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

// Import routes
import authRoutes from "./routes/authRoute.js";
import jobRoutes from "./routes/jobRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

// Use routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/candidates", candidateRoutes);
app.use("/api/v1/jobs", emailRoutes);

// 404 for any route that didn't match above
app.use((req, res) => {
  res.status(404).json({
    statusCode: 404,
    data: null,
    success: false,
    message: "Route not found",
    errors: [],
  });
});

// Central error handler — 4 args is what makes Express treat this as an
// error handler; it must be registered last, after every other app.use()/route.
app.use((err, req, res, next) => {
  console.error(err); // swap for a real logger later

  // Multer errors (file too large, too many files) don't carry the AppError
  // shape (no statusCode/isOperational), so they were falling through to a
  // bare 500 "Internal Server Error" instead of a message the UI can show.
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "One of the files is too large (max 8MB each)"
        : err.code === "LIMIT_FILE_COUNT"
          ? "Too many files in one upload (max 50)"
          : err.message;
    return res.status(400).json({ statusCode: 400, data: null, success: false, message, errors: [] });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal Server Error";
  const errors = Array.isArray(err.errors) ? err.errors : [];

  res.status(statusCode).json({ statusCode, data: null, success: false, message, errors });
});

export default app;
