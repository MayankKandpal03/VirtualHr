import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // was index-only — didn't actually stop duplicates at the DB level
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    companyName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      select: false,
    },
    // protect.js already reads user.role — it existed nowhere before, so it was always undefined
    role: {
      type: String,
      enum: ["owner", "hr", "admin"],
      default: "owner",
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
