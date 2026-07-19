import jwt from "jsonwebtoken";

// payload must be an object, e.g. { id: user._id, email: user.email } —
// every call site needs updating to match (see authService.js)
export default function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
}
