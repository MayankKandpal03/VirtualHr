import "./loadEnv.js"; // must stay the very first import — loads process.env before anything else evaluates
import http from "http";
import app from "./app.js";
import connectionDB from "./config/connectionDB.js";
import { initSocket } from "./sockets/socket.js";

const port = process.env.PORT;

const httpServer = http.createServer(app);
initSocket(httpServer);

connectionDB().then(() => {
  httpServer.listen(port, () => {
    console.log("Server is running at port:", port);
  });
});