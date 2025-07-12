import { useState, useEffect } from "react";
import { useSocket } from "./hooks/useSocket";
import { Game, User, DrawingData, ChatMessage } from "./types/game";
import JoinGame from "./components/JoinGame";
import GameLobby from "./components/GameLobby";
import GameBoard from "./components/GameBoard";
import GameFinished from "./components/GameFinished";

// Get server URL from environment variable or default to production
const getServerUrl = () => {
  // In development, use local server
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
  }
  // In production, use deployed server
  return "https://skribbl-production.onrender.com";
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

  // Monitor socket connection status
  useEffect(() => {
    if (!socket) return;

    const checkConnection = () => {
      setSocketConnected(socket.connected);
    };

    socket.on("connect", checkConnection);
    socket.on("disconnect", checkConnection);

    // Initial check
    checkConnection();

    return () => {
      socket.off("connect", checkConnection);
      socket.off("disconnect", checkConnection);
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
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          drawingData: [...prev.drawingData, drawingData],
        };
      });
    });

    socket.on("clear-canvas", () => {
      setGame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          drawingData: [],
        };
      });
    });

    socket.on("chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    //@ts-ignore
    socket.on("correct-guess", (data) => {
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

    socket.on("next-turn", (gameData: Game) => {
      setGame(gameData);
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
    console.log("handleCreateRoom called:", { playerName, socketConnected });
    if (socket && socketConnected) {
      // Generate a random room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log("Generated room code:", roomCode);
      socket.emit("join-game", { roomCode, playerName, settings });
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

  const handleDraw = (drawingData: DrawingData) => {
    if (socket && game) {
      socket.emit("drawing", { gameId: game.id, drawingData });
    }
  };

  const handleClearCanvas = () => {
    if (socket && game) {
      socket.emit("clear-canvas", { gameId: game.id });
    }
  };

  const handleSendMessage = (message: string) => {
    if (socket && game) {
      socket.emit("chat-message", { gameId: game.id, message });
    }
  };

  const handleWordSelect = (word: string) => {
    if (socket && game) {
      socket.emit("word-select", { gameId: game.id, word });
    }
  };
  const handlePlayAgain = () => {
    setGame(null);
    setCurrentUser(null);
    setMessages([]);
    setGameState("join");
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
  if (gameState === "join") {
    return (
      <JoinGame onJoinGame={handleJoinGame} onCreateRoom={handleCreateRoom} />
    );
  }

  if (gameState === "lobby" && game) {
    return (
      <GameLobby
        game={game}
        currentUser={currentUser}
        onStartGame={handleStartGame}
      />
    );
  }

  if (gameState === "playing" && game) {
    return (
      <GameBoard
        game={game}
        currentUser={currentUser}
        onDraw={handleDraw}
        onClear={handleClearCanvas}
        onSendMessage={handleSendMessage}
        messages={messages}
        onWordSelect={handleWordSelect}
      />
    );
  }

  if (gameState === "finished" && game) {
    return (
      <GameFinished
        game={game}
        currentUser={currentUser}
        onPlayAgain={handlePlayAgain}
        onRestartGame={handleRestartGame}
        onToggleReady={handleToggleReady}
      />
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
