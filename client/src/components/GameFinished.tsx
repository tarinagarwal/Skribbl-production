import React from "react";
import { Trophy, Medal, Star, RotateCcw, Play, Check, X } from "lucide-react";
import { Game } from "../types/game";

interface GameFinishedProps {
  game: Game;
  currentUser: any;
  onPlayAgain: () => void;
  onRestartGame?: (settings?: { drawTime: number; maxRounds: number }) => void;
  onToggleReady?: () => void;
}

const GameFinished: React.FC<GameFinishedProps> = ({
  game,
  currentUser,
  onPlayAgain,
  onRestartGame,
  onToggleReady,
}) => {
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
  const isOwner = currentUser?.id === game.ownerId;
  const isReady = game.playersReady?.includes(currentUser?.id);
  const allPlayersReady =
    game.players.length > 1 &&
    game.players.every((player) => game.playersReady?.includes(player.id));

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="text-yellow-500" size={24} />;
      case 1:
        return <Medal className="text-gray-400" size={24} />;
      case 2:
        return <Medal className="text-amber-600" size={24} />;
      default:
        return <Star className="text-gray-300" size={24} />;
    }
  };

  const getPositionText = (position: number) => {
    switch (position) {
      case 0:
        return "1st Place";
      case 1:
        return "2nd Place";
      case 2:
        return "3rd Place";
      default:
        return `${position + 1}th Place`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Game Finished!
          </h1>
          <p className="text-gray-600">Final Results</p>
        </div>

        <div className="space-y-4 mb-8">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                index === 0
                  ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <div className="flex-shrink-0">{getPositionIcon(index)}</div>

              <img
                src={player.avatar}
                alt={`${player.name}'s avatar`}
                className="w-12 h-12 rounded-full"
              />

              <div className="flex-1">
                <div className="font-semibold text-gray-800">{player.name}</div>
                <div className="text-sm text-gray-600">
                  {getPositionText(index)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold text-gray-800">
                  {player.score}
                </div>
                <div className="text-sm text-gray-600">points</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          {isOwner ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Ready Players ({game.playersReady?.length || 0}/
                  {game.players.length})
                </h3>
                <div className="space-y-2">
                  {game.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-blue-700">
                        {player.name}
                      </span>
                      {game.playersReady?.includes(player.id) ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onRestartGame && onRestartGame()}
                  disabled={!allPlayersReady}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 justify-center ${
                    allPlayersReady
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Play size={20} />
                  Start New Game
                </button>

                <button
                  onClick={onPlayAgain}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  New Room
                </button>
              </div>

              {!allPlayersReady && (
                <p className="text-sm text-gray-500">
                  Waiting for all players to mark themselves ready...
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Ready Players ({game.playersReady?.length || 0}/
                  {game.players.length})
                </h3>
                <div className="space-y-2">
                  {game.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-blue-700">
                        {player.name}
                        {player.id === currentUser?.id && " (You)"}
                        {player.id === game.ownerId && " 👑"}
                      </span>
                      {game.playersReady?.includes(player.id) ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onToggleReady}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 justify-center ${
                    isReady
                      ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
                      : "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                  }`}
                >
                  {isReady ? (
                    <>
                      <X size={20} />
                      Not Ready
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Ready
                    </>
                  )}
                </button>

                <button
                  onClick={onPlayAgain}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  New Room
                </button>
              </div>

              <p className="text-sm text-gray-500">
                {isReady
                  ? "Waiting for room owner to start the game..."
                  : "Mark yourself ready to play again!"}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500">Thanks for playing Skribbl!</p>
        </div>
      </div>
    </div>
  );
};

export default GameFinished;
