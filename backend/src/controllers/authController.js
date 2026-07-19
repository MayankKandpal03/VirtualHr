import {
  loginService,
  refreshTokensService,
  registrationService,
  logoutService,
} from "../services/authService.js";
import ApiResponse from "../utils/apiResponse.js";
import { asyncWrap } from "../utils/appError.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // keep in sync with REFRESH_TOKEN_EXPIRY
};

export const registrationController = asyncWrap(async (req, res) => {
  const { email, username, password, companyName, phone } = req.body; // from client's JSON body

  const { user, accessToken, refreshToken } = await registrationService(
    email,
    username,
    password,
    companyName,
    phone,
  );

  res
    .status(201)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(201, { user, accessToken }, "User created and logged in"));
    // was `{ user, accesstoken }` — undeclared variable, threw on every request
});

export const loginController = asyncWrap(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await loginService(email, password);

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { user, accessToken }, "Logged in"));
});

export const tokenRefreshController = asyncWrap(async (req, res) => {
  const { accessToken, refreshToken, user } = await refreshTokensService(
    req.cookies?.refreshToken, // was req.cookie (no "s") — cookie-parser attaches to req.cookies
  );

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { user, accessToken }, "Token refreshed"));
});

export const logoutController = asyncWrap(async (req, res) => {
  await logoutService(req.user.id); // req.user set by protect middleware — route must be behind it
  res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out"));
});
