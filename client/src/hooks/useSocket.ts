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
      transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      timeout: 20000, // 20 second timeout
      forceNew: true, // Force new connection
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

    socketRef.current.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
    });

    socketRef.current.on("reconnect_failed", () => {
      console.error("Failed to reconnect after maximum attempts");
    });

    //@ts-ignore
    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket");
        setIsConnected(false);
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]); // Include serverUrl to handle URL changes

  return socketRef.current;
};
