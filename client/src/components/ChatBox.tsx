import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import { ChatMessage } from "../types/game";

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  currentUserId,
}) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center gap-2">
        <MessageCircle size={16} className="sm:w-5 sm:h-5 text-blue-600" />
        <h3 className="font-semibold text-sm sm:text-base text-gray-800">
          Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.userId === currentUserId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${
                msg.userId === currentUserId
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {msg.userId !== currentUserId && (
                <div className="text-xs font-medium mb-1 opacity-70 break-words">
                  {msg.userName}
                </div>
              )}
              <div className="text-xs sm:text-sm break-words">
                {msg.message}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-gray-200"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your guess..."
            className="flex-1 px-2 sm:px-3 py-1 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Send size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
