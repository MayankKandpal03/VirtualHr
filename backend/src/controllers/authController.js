// Imports
import { registrationService } from "../services/authService.js";
import ApiResponse from "../utils/apiResponse.js";
import { asyncWrap } from "../utils/appError.js";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
  // Send response 
  res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, { user, accessToken }, "User created and logged in"),
    );
});
