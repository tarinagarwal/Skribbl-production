import React, { useState } from "react";
import { Users, Play, Copy, Check } from "lucide-react";
import { Game, User } from "../types/game";

interface GameLobbyProps {
  game: Game;
  currentUser: User | null;
  onStartGame: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  game,
  currentUser,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(game.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Lobby</h1>
          <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg p-3">
            <span className="text-gray-600">Room Code:</span>
            <span className="font-mono text-xl font-bold text-purple-600">
              {game.roomCode}
            </span>
            <button
              onClick={copyRoomCode}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy room code"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} className="text-gray-600" />
            <span className="font-semibold text-gray-800">
              Players ({game.players.length})
            </span>
          </div>

          <div className="space-y-3">
            {game.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  player.id === currentUser?.id
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <img
                  src={player.avatar}
                  alt={`${player.name}'s avatar`}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {player.name}
                    {player.id === currentUser?.id && (
                      <span className="text-sm text-purple-600 ml-2">
                        (You)
                      </span>
                    )}
                    {player.id === game.ownerId && (
                      <span className="ml-2 text-yellow-600" title="Room Owner">
                        👑
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Ready to play</div>
                </div>
                <div className="text-sm font-medium text-gray-600">
                  {player.score} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          {game.players.length >= 2 && currentUser?.id === game.ownerId ? (
            <button
              onClick={onStartGame}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto"
            >
              <Play size={20} />
              Start Game
            </button>
          ) : game.players.length >= 2 ? (
            <div className="text-gray-500 text-center">
              <p className="mb-2">
                Waiting for room owner to start the game...
              </p>
              <p className="text-sm">Only the room owner can start the game</p>
            </div>
          ) : (
            <div className="text-gray-500 text-center">
              <p className="mb-2">Waiting for more players...</p>
              <p className="text-sm">Minimum 2 players required</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
