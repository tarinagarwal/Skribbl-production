import React, { useState } from "react";
import { Users, ArrowRight, Plus } from "lucide-react";

interface JoinGameProps {
  onJoinGame: (roomCode: string, playerName: string) => void;
  onCreateRoom: (playerName: string) => void;
}

const JoinGame: React.FC<JoinGameProps> = ({ onJoinGame, onCreateRoom }) => {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [drawTime, setDrawTime] = useState(80);
  const [maxRounds, setMaxRounds] = useState(3);
  const [mode, setMode] = useState<"join" | "create">("join");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", { mode, playerName, roomCode });

    if (playerName.trim()) {
      if (mode === "create") {
        console.log("Creating room for player:", playerName.trim());
        onCreateRoom(playerName.trim());
      } else if (mode === "join" && roomCode.trim()) {
        console.log(
          "Joining room:",
          roomCode.trim(),
          "with player:",
          playerName.trim()
        );
        onJoinGame(roomCode.trim().toUpperCase(), playerName.trim());
      }
    } else {
      console.log("Player name is required");
      alert("Please enter your name");
    }
  };

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-6xl mb-4">🎨</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            Skribbl
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Draw, guess, and have fun!
          </p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all text-sm sm:text-base ${
              mode === "join"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-2 px-2 sm:px-4 rounded-md font-medium transition-all text-sm sm:text-base ${
              mode === "create"
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Create Room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              required
              maxLength={20}
            />
          </div>

          {mode === "join" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                  required
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={generateRoomCode}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  title="Generate random room code"
                >
                  <Users size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs sm:text-sm text-blue-800">
                  🎮 A new room will be created automatically with a random room
                  code that you can share with friends!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Draw Time
                  </label>
                  <select
                    value={drawTime}
                    onChange={(e) => setDrawTime(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={80}>80 seconds</option>
                    <option value={120}>2 minutes</option>
                    <option value={180}>3 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rounds
                  </label>
                  <select
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={2}>2 rounds</option>
                    <option value={3}>3 rounds</option>
                    <option value={4}>4 rounds</option>
                    <option value={5}>5 rounds</option>
                    <option value={8}>8 rounds</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {mode === "create" ? (
              <>
                <Plus size={16} className="sm:w-5 sm:h-5" />
                Create Room
              </>
            ) : (
              <>
                <ArrowRight size={16} className="sm:w-5 sm:h-5" />
                Join Room
              </>
            )}
          </button>
        </form>

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
          <p>
            {mode === "create"
              ? "Create a new room and invite friends!"
              : "Enter a room code to join an existing game!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;
