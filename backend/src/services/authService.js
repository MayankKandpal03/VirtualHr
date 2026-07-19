import User from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import generateTokens from "../utils/tokens.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Shared by registration, login, and refresh — generates a token pair,
// hashes + persists the refresh token, returns both tokens.
const issueSession = async (user) => {
  const { accessToken, refreshToken } = await generateTokens({
    id: user._id,
    email: user.email,
  }); // was generateTokens(user._id, user.email) — payload needs to be ONE object, not two args
  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  await user.save();
  return { accessToken, refreshToken };
};

export const registrationService = async (
  email,
  username,
  password,
  companyName, // was "companyname" in one place, "companyName" in others — picked one
  phone,
) => {
  const missingFields = [];
  if (!email) missingFields.push("email");
  if (!username) missingFields.push("username");
  if (!password) missingFields.push("password");
  if (!companyName) missingFields.push("companyName");
  if (!phone) missingFields.push("phone");

  if (missingFields.length) {
    throw new AppError(400, "Missing required fields", missingFields);
  }

  const checkUser = await User.findOne({ email }); // was User.findOne(email) with no await — always truthy, blocked every registration
  if (checkUser) {
    throw new AppError(400, "User already exists");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    password: hashPassword,
    companyName,
    phone,
  });

  const { accessToken, refreshToken } = await issueSession(user);

  return {
    user: { _id: user._id, email: user.email, username: user.username },
    accessToken,
    refreshToken,
  };
};

export const loginService = async (email, password) => {
  if (!email || !password) {
    throw new AppError(400, "Fill all fields");
  }

  // was User.findOne(email).select("+password") with no await —
  // "user" was a Query object (always truthy), so "Invalid credentials" never fired
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError(400, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError(400, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await issueSession(user);

  // was `return { loggedInUser, ... }` — loggedInUser was never defined anywhere, guaranteed ReferenceError
  return {
    user: { _id: user._id, email: user.email, username: user.username },
    accessToken,
    refreshToken,
  };
};

export const refreshTokensService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new AppError(401, "Refresh token missing");
  }

  let decoded;
  try {
    // was declared with `const decode` INSIDE the try block, then read OUTSIDE it —
    // undefined by scoping, separate from the missing-await bug that was also there
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id).select("+refreshToken"); // was User.findOne(decode._id) with no await
  if (!user || !user.refreshToken) {
    throw new AppError(401, "Invalid refresh token");
  }

  const isValid = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
  if (!isValid) {
    // presented an old, already-rotated token — treat as compromised
    user.refreshToken = undefined;
    await user.save();
    throw new AppError(401, "Refresh token reuse detected — please log in again");
  }

  const { accessToken, refreshToken } = await issueSession(user); // rotate on every use

  return {
    accessToken,
    refreshToken,
    user: { _id: user._id, email: user.email, username: user.username },
  };
};

export const logoutService = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};
