import bcrypt from "bcryptjs";
import { AppError, asyncWrap } from "../utils/appError.js";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protect = async (req, res, next) => {
  const token =
    req.cookie?.accessToken || req.header("Authorization")?.split(" ")[1];
  if (!token) {
    throw new AppError(400, "Not authorized");
  }
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  // Extract id to find user
  const user = await User.findById(decodedToken?._id);
  if (!user) throw new AppError("Invalid Request", 401);
  req.user = user;
  next();   
};
