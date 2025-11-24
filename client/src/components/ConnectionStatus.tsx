import React from "react";
import { Wifi, WifiOff, Loader } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isReconnecting = false,
}) => {
  if (isConnected && !isReconnecting) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
          isReconnecting ? "bg-yellow-500 text-white" : "bg-red-500 text-white"
        }`}
      >
        {isReconnecting ? (
          <>
            <Loader size={16} className="animate-spin" />
            <span className="text-sm font-medium">Reconnecting...</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span className="text-sm font-medium">Disconnected</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
