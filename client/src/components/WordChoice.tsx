import React, { useState, useEffect } from "react";
import { Clock, Palette } from "lucide-react";

interface WordChoiceProps {
  words: string[];
  timeLeft: number;
  onWordSelect: (word: string) => void;
  isDrawer: boolean;
}

const WordChoice: React.FC<WordChoiceProps> = ({
  words,
  timeLeft,
  onWordSelect,
  isDrawer,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Remove client-side auto-selection, let server handle it

  const handleWordSelect = (word: string) => {
    setSelectedWord(word);
    onWordSelect(word);
  };

  if (!isDrawer) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Palette className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              {timeLeft > 0 ? "Choosing Word..." : "Get Ready!"}
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              The drawer is selecting a word to draw
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2">
                <Clock size={16} className="sm:w-5 sm:h-5 text-blue-600" />
                <span className="font-bold text-base sm:text-lg text-gray-800">
                  {timeLeft}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Palette className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Choose a Word
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Select a word to draw
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2">
              <Clock
                size={16}
                className={timeLeft <= 3 ? "text-red-500" : "text-blue-600"}
              />
              <span
                className={`font-bold text-base sm:text-lg ${
                  timeLeft <= 3 ? "text-red-500" : "text-gray-800"
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {words.map((word, index) => (
            <button
              key={word}
              onClick={() => handleWordSelect(word)}
              className="w-full p-3 sm:p-4 text-left bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 text-base sm:text-lg">
                  {word}
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {word.length} letter{word.length !== 1 ? "s" : ""}
                </span>
              </div>
            </button>
          ))}
        </div>

        {timeLeft <= 3 && (
          <div className="mt-4 text-center text-xs sm:text-sm text-red-500">
            ⚠️ Time running out! First word will be auto-selected
          </div>
        )}
      </div>
    </div>
  );
};

export default WordChoice;
