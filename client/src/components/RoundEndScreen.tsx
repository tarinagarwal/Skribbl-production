import React, { useEffect, useState } from "react";
import { Trophy, Clock, ArrowRight } from "lucide-react";

interface RoundEndScreenProps {
  word: string;
  drawer: string;
  timeLeft: number;
  round: number;
  maxRounds: number;
  onContinue: () => void;
}

const RoundEndScreen: React.FC<RoundEndScreenProps> = ({
  word,
  drawer,
  timeLeft,
  round,
  maxRounds,
  onContinue,
}) => {
  const [showScreen, setShowScreen] = useState(true);

  useEffect(() => {
    // Auto-continue after 5 seconds
    const timer = setTimeout(() => {
      setShowScreen(false);
      onContinue();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  const handleContinue = () => {
    setShowScreen(false);
    onContinue();
  };

  if (!showScreen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-xs sm:max-w-md lg:max-w-lg text-center">
        <div className="mb-4 sm:mb-6">
          <div className="text-3xl sm:text-4xl lg:text-6xl mb-3 sm:mb-4">
            {timeLeft > 0 ? "⏰" : "🎨"}
          </div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2">
            {timeLeft > 0 ? "Time's Up!" : "Round Complete!"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Round {round} of {maxRounds}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="text-sm sm:text-base text-gray-600 mb-2">
            The word was:
          </div>
          <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-purple-600 mb-2 sm:mb-3 break-words hyphens-auto leading-tight">
            "{word}"
          </div>
          <div className="text-xs sm:text-sm text-gray-500 break-words">
            Drawn by {drawer}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <ArrowRight size={16} className="sm:w-5 sm:h-5" />
            Continue
          </button>

          <div className="text-xs sm:text-sm text-gray-500">
            Auto-continuing in a few seconds...
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundEndScreen;
