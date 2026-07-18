import User from "../models/userModel.js";
import { AppError } from "../utils/appError.js";
import generateTokens from "../utils/tokens.js";
import bcrypt from "bcryptjs";

export const registrationService = async (
  email,
  username,
  password,
  companyname,
  phone,
) => {
  // Array to store missing Fields
  const missingFields = [];
  if (!email) missingFields.push("email"); // It will be pushed inside array if the field is missing
  if (!username) missingFields.push("username");
  if (!password) missingFields.push("password");
  if (!companyname) missingFields.push("companyname");
  if (!phone) missingFields.push("phone");

  // If there is any field pushed inside missingFields then throw error
  if (missingFields.length) {
    throw new AppError(400, "Missing required fields", missingFields);
  }
  // Check if the user already exist
  const checkUser = await User.findOne(email);
  if (checkUser) {
    throw new AppError(400, "User already Exists");
  }

  // Hash Passowrd
  const hashPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    username,
    email,
    password: hashPassword,
    companyName,
    phone,
  });

  // Generate Tokens, hash and save refresh token
  const { accessToken, refreshToken } = await generateTokens(
    user._id,
    user.email,
  );
  const hashRefreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshToken = hashRefreshToken;
  await user.save();

  // Return destructured response to avoid exposing sensitive data and set cookies
  return {
    user: {
      _id: user._id,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};
