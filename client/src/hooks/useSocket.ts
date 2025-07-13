import { useEffect, useRef, useState } from "react";
//@ts-ignore
import { io, Socket } from "socket.io-client";

export const useSocket = (serverUrl: string) => {
  //@ts-ignore
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log("Connecting to socket server:", serverUrl);
    socketRef.current = io(serverUrl, {
      transports: ["polling", "websocket"], // Try polling first for better compatibility
      timeout: 20000, // 20 second timeout
      forceNew: false, // Don't force new connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current?.id);
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });
    //@ts-ignore
    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message || error);
      setIsConnected(false);
    });
    //@ts-ignore
    socketRef.current.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });
    //@ts-ignore
    socketRef.current.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error.message || error);
    });
    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket");
        setIsConnected(false);
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]); // Include serverUrl dependency

  return socketRef.current;
};
