import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SOCKET_HOST || "http://localhost:5000", {
  autoConnect: false,
  withCredentials: true,
});

export default socket;
