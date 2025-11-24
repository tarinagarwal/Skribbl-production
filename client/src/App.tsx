import { useState, useEffect } from "react";
import { useCallback } from "react";
import { useSocket } from "./hooks/useSocket";
import { Game, User, DrawingData, ChatMessage } from "./types/game";
import JoinGame from "./components/JoinGame";
import GameLobby from "./components/GameLobby";
import GameBoard from "./components/GameBoard";
import GameFinished from "./components/GameFinished";
import ConnectionStatus from "./components/ConnectionStatus";
import soundManager from "./utils/sounds";

// Get server URL from environment variable or default to production
const getServerUrl = () => {
  // Always prefer environment variable if set
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  // In development, use local server
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  // In production, use deployed server
  return "https://skribbl-production-y971.onrender.com";
};

function App() {
  const socket = useSocket(getServerUrl());
  const [game, setGame] = useState<Game | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<
    "join" | "lobby" | "playing" | "finished"
  >("join");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showRoundEnd, setShowRoundEnd] = useState(false);

  // Monitor socket connection status
  useEffect(() => {
    if (!socket) return;

    const checkConnection = () => {
      setSocketConnected(socket.connected);
      if (socket.connected) {
        setIsReconnecting(false);
      }
    };

    const handleReconnecting = () => {
      setIsReconnecting(true);
    };

    socket.on("connect", checkConnection);
    socket.on("disconnect", checkConnection);
    socket.on("reconnect_attempt", handleReconnecting);

    // Initial check
    checkConnection();

    return () => {
      socket.off("connect", checkConnection);
      socket.off("disconnect", checkConnection);
      socket.off("reconnect_attempt", handleReconnecting);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    //@ts-ignore
    socket.on("game-joined", (data) => {
      setCurrentUser(data.user);
    });

    socket.on("game-update", (gameData: Game) => {
      setGame(gameData);
      if (gameData.status === "waiting") {
        setGameState("lobby");
      } else if (gameData.status === "playing") {
        setGameState("playing");
      } else if (gameData.status === "finished") {
        setGameState("finished");
      }
    });

    socket.on("game-started", (gameData: Game) => {
      setGame(gameData);
      setGameState("playing");
      setMessages([]);
    });

    socket.on("drawing", (drawingData: DrawingData) => {
      console.log("Received drawing data:", drawingData);
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          drawingData: [...prev.drawingData, drawingData],
        };
      });
    });

    // Clear canvas is now handled through drawing event with action: "clear"
    // Keeping this for backward compatibility
    socket.on("clear-canvas", () => {
      console.log("Received clear canvas event (legacy)");
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          drawingData: [{ action: "clear" }],
        };
      });
    });

    socket.on("chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    //@ts-ignore
    socket.on("correct-guess", (data) => {
      soundManager.playCorrectGuess();
      setMessages((prev) => [
        ...prev,
        {
          userId: "system",
          userName: "System",
          message: `🎉 ${data.userName} guessed correctly! The word was "${data.word}"`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });
    //@ts-ignore
    socket.on("round-end", (data) => {
      soundManager.playRoundEnd();
      setShowRoundEnd(true);
    });

    socket.on("next-turn", (gameData: Game) => {
      soundManager.playNewTurn();
      setGame(gameData);
      setShowRoundEnd(false); // Hide round end screen when next turn starts
      setMessages((prev) => [
        ...prev,
        {
          userId: "system",
          userName: "System",
          message: `🎨 ${gameData.currentDrawer?.name} is now drawing!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    //@ts-ignore

    socket.on("word-choices", (data) => {
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          wordChoices: data.words,
          gamePhase: "choosing",
          timeLeft: 10,
        };
      });
    });

    //@ts-ignore
    socket.on("word-selected", (data) => {
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWord: data.word,
          wordChoices: null,
          gamePhase: "drawing",
          timeLeft: prev.drawTime,
        };
      });
    });
    //@ts-ignore
    socket.on("hint-update", (data) => {
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hints: data.hints,
        };
      });
    });

    //@ts-ignore
    socket.on("player-left", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          userId: "system",
          userName: "System",
          message: `👋 ${data.playerName} left the game${
            data.newOwnerId ? " - Ownership transferred" : ""
          }`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on("game-restarted", (gameData: Game) => {
      setGame(gameData);
      setGameState("lobby");
      setMessages([]);
      setShowRoundEnd(false);
    });

    socket.on("timer-update", (data: { timeLeft: number }) => {
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeLeft: data.timeLeft,
        };
      });
    });

    return () => {
      socket.off("game-joined");
      socket.off("game-update");
      socket.off("game-started");
      socket.off("drawing");
      socket.off("clear-canvas");
      socket.off("chat-message");
      socket.off("correct-guess");
      socket.off("next-turn");
      socket.off("word-choices");
      socket.off("word-selected");
      socket.off("hint-update");
      socket.off("player-left");
      socket.off("game-restarted");
      socket.off("timer-update");
      socket.off("round-end");
    };
  }, [socket]);

  const handleJoinGame = (roomCode: string, playerName: string) => {
    console.log("handleJoinGame called:", {
      roomCode,
      playerName,
      socketConnected,
    });
    if (socket && socketConnected) {
      console.log("Emitting join-game event");
      socket.emit("join-game", { roomCode, playerName });
    } else {
      console.error("Socket not connected. Connected:", socketConnected);
      alert("Connection error. Please refresh the page.");
    }
  };

  const handleCreateRoom = (
    playerName: string,
    settings?: { drawTime: number; maxRounds: number }
  ) => {
    console.log("handleCreateRoom called:", {
      playerName,
      settings,
      socketConnected,
    });
    if (socket && socketConnected) {
      // Generate a random room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log("Generated room code:", roomCode);
      socket.emit("join-game", {
        roomCode,
        playerName,
        settings: settings || { drawTime: 80, maxRounds: 3 },
      });
    } else {
      console.error("Socket not connected. Connected:", socketConnected);
      alert("Connection error. Please refresh the page.");
    }
  };

  const handleStartGame = () => {
    if (socket && game) {
      socket.emit("start-game", { gameId: game.id });
    }
  };

  const handleDraw = useCallback(
    (drawingData: DrawingData) => {
      if (socket && game) {
        socket.emit("drawing", { gameId: game.id, drawingData });
      }
    },
    [socket, game]
  );

  const handleClearCanvas = useCallback(() => {
    if (socket && game) {
      socket.emit("clear-canvas", { gameId: game.id });
    }
  }, [socket, game]);

  const handleSendMessage = useCallback(
    (message: string) => {
      if (socket && game) {
        socket.emit("chat-message", { gameId: game.id, message });
      }
    },
    [socket, game]
  );

  const handleWordSelect = useCallback(
    (word: string) => {
      if (socket && game) {
        socket.emit("word-select", { gameId: game.id, word });
      }
    },
    [socket, game]
  );
  const handlePlayAgain = () => {
    setGame(null);
    setCurrentUser(null);
    setMessages([]);
    setGameState("join");
    setShowRoundEnd(false);
  };

  const handleRestartGame = (settings?: {
    drawTime: number;
    maxRounds: number;
  }) => {
    if (socket && game) {
      socket.emit("restart-game", { gameId: game.id, settings });
    }
  };

  const handleToggleReady = () => {
    if (socket && game) {
      socket.emit("toggle-ready", { gameId: game.id });
    }
  };

  const handleRoundEndContinue = () => {
    setShowRoundEnd(false);
  };

  if (gameState === "join") {
    return (
      <>
        <ConnectionStatus
          isConnected={socketConnected}
          isReconnecting={isReconnecting}
        />
        <JoinGame onJoinGame={handleJoinGame} onCreateRoom={handleCreateRoom} />
      </>
    );
  }

  if (gameState === "lobby" && game) {
    return (
      <>
        <ConnectionStatus
          isConnected={socketConnected}
          isReconnecting={isReconnecting}
        />
        <GameLobby
          game={game}
          currentUser={currentUser}
          onStartGame={handleStartGame}
        />
      </>
    );
  }

  if (gameState === "playing" && game) {
    return (
      <>
        <ConnectionStatus
          isConnected={socketConnected}
          isReconnecting={isReconnecting}
        />
        <GameBoard
          game={game}
          currentUser={currentUser}
          onDraw={handleDraw}
          onClear={handleClearCanvas}
          onSendMessage={handleSendMessage}
          messages={messages}
          onWordSelect={handleWordSelect}
          showRoundEnd={showRoundEnd}
          onRoundEndContinue={handleRoundEndContinue}
        />
      </>
    );
  }

  if (gameState === "finished" && game) {
    return (
      <>
        <ConnectionStatus
          isConnected={socketConnected}
          isReconnecting={isReconnecting}
        />
        <GameFinished
          game={game}
          currentUser={currentUser}
          onPlayAgain={handlePlayAgain}
          onRestartGame={handleRestartGame}
          onToggleReady={handleToggleReady}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default App;
