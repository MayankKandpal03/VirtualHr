import mongoose from "mongoose";

export default async function connectionDB() {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connection to database successfull");
  } catch (error) {
    console.log("Connection to database failed, Error:\n", error);
    process.exit(1)
  }
}
