import dotenv from "dotenv";
import app from "./app.js";
import connectionDB from "./config/connectionDB.js";

dotenv.config();

const port = process.env.PORT;
connectionDB().then(() => {
  app.listen(port, () => {
    console.log("Server is running at port:", port);
  });
});
