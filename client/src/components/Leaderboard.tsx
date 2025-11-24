import React, { useState, useEffect } from "react";
import { Trophy, TrendingUp, Award, Target } from "lucide-react";

interface PlayerStats {
  user_id: string;
  name: string;
  avatar: string;
  games_played: number;
  games_won: number;
  total_score: number;
  correct_guesses: number;
  words_drawn: number;
}

interface LeaderboardProps {
  serverUrl: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ serverUrl }) => {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/leaderboard`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (player: PlayerStats) => {
    if (player.games_played === 0) return 0;
    return Math.round((player.games_won / player.games_played) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-500" size={32} />
        <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
      </div>

      {stats.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No players yet. Be the first to play!
        </p>
      ) : (
        <div className="space-y-3">
          {stats.map((player, index) => (
            <div
              key={player.user_id}
              className={`flex items-center gap-4 p-4 rounded-lg ${
                index === 0
                  ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200"
                  : index === 1
                  ? "bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200"
                  : index === 2
                  ? "bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex-shrink-0 w-8 text-center">
                {index === 0 ? (
                  <Trophy className="text-yellow-500" size={24} />
                ) : index === 1 ? (
                  <Award className="text-gray-400" size={24} />
                ) : index === 2 ? (
                  <Award className="text-orange-600" size={24} />
                ) : (
                  <span className="font-bold text-gray-600">{index + 1}</span>
                )}
              </div>

              <img
                src={player.avatar}
                alt={player.name}
                className="w-12 h-12 rounded-full"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{player.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Target size={14} />
                    {player.total_score} pts
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={14} />
                    {getWinRate(player)}% win rate
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {player.games_played} games
                </div>
                <div className="text-xs text-gray-500">
                  {player.games_won} wins
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
