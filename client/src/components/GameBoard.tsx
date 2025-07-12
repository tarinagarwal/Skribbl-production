import React, { useState, useEffect } from "react";
import { Clock, Trophy, Users, Eye, Pencil } from "lucide-react";
import { Game, User, DrawingData, ChatMessage } from "../types/game";
import DrawingCanvas from "./DrawingCanvas";
import ChatBox from "./ChatBox";
import WordChoice from "./WordChoice";

interface GameBoardProps {
  game: Game;
  currentUser: User | null;
  onDraw: (data: DrawingData) => void;
  onClear: () => void;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  onWordSelect?: (word: string) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  game,
  currentUser,
  onDraw,
  onClear,
  onSendMessage,
  messages,
  onWordSelect,
}) => {
  const [timeLeft, setTimeLeft] = useState(game.timeLeft);
  const isDrawer = currentUser?.id === game.currentDrawer?.id;

  useEffect(() => {
    setTimeLeft(game.timeLeft);
  }, [game.timeLeft]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const getWordDisplay = () => {
    if (isDrawer) {
      return game.currentWord;
    }

    if (game.hints) {
      return game.hints;
    }

    if (game.currentWord && game.gamePhase === "drawing") {
      return game.currentWord
        .split("")
        .map((char) => (char === " " ? " " : "_"))
        .join(" ");
    }

    return "";
  };

  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

  return (
    <>
      {game.gamePhase === "choosing" && game.wordChoices && onWordSelect && (
        <WordChoice
          words={game.wordChoices}
          timeLeft={timeLeft}
          onWordSelect={onWordSelect}
          isDrawer={isDrawer}
        />
      )}

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" />
                  <span
                    className={`font-bold text-lg ${
                      timeLeft <= 10 ? "text-red-500" : "text-gray-800"
                    }`}
                  >
                    {timeLeft}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-yellow-600" />
                  <span className="text-gray-800">
                    Round {game.round}/{game.maxRounds}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-600">
                  {game.gamePhase === "choosing"
                    ? isDrawer
                      ? "Choose a word to draw"
                      : `${game.currentDrawer?.name} is choosing a word`
                    : isDrawer
                    ? "You are drawing"
                    : `${game.currentDrawer?.name} is drawing`}
                </div>
                <div className="text-xl font-bold text-gray-800 font-mono">
                  {getWordDisplay()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Players List */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users size={20} className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Players</h3>
              </div>

              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      player.id === currentUser?.id
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={player.avatar}
                        alt={`${player.name}'s avatar`}
                        className="w-10 h-10 rounded-full"
                      />
                      {player.id === game.currentDrawer?.id && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1">
                          <Pencil size={10} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium text-gray-800 text-sm">
                        {index + 1}. {player.name}
                        {player.id === currentUser?.id && (
                          <span className="text-blue-600 ml-1">(You)</span>
                        )}
                        {player.id === game.ownerId && (
                          <span
                            className="ml-1 text-yellow-600"
                            title="Room Owner"
                          >
                            👑
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.score} points
                      </div>
                    </div>

                    {player.id !== game.currentDrawer?.id && (
                      <Eye size={16} className="text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Drawing Canvas */}
            <div className="lg:col-span-2">
              <DrawingCanvas
                isDrawer={isDrawer}
                onDraw={onDraw}
                onClear={onClear}
                drawingData={game.drawingData}
              />
            </div>

            {/* Chat Box */}
            <div className="h-96 lg:h-auto">
              <ChatBox
                messages={messages}
                onSendMessage={onSendMessage}
                currentUserId={currentUser?.id || ""}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameBoard;
