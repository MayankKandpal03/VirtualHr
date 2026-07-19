// Reads:  Authorization: Bearer <accessToken>  (client sends on every request)
// Sets:   req.user = { id, role }              (available in every downstream controller)
// Note:   req is fresh per request — nothing carries over from previous requests
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "../utils/appError.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      throw new AppError(401, "Access token missing");

    const token = authHeader.split(" ")[1];
    // was JWT_ACCESS_SECRET here vs ACCESS_TOKEN_SECRET in tokens.js — picked one name, use it everywhere
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // throws JsonWebTokenError if tampered, TokenExpiredError if expired

    const user = await User.findById(decoded.id); // requires generateTokens to sign { id, email }, not a bare ObjectId
    if (!user) throw new AppError(401, "User no longer exists");

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export default protect;
