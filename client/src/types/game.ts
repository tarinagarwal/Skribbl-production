export interface User {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isDrawer: boolean;
}

export interface Game {
  id: string;
  roomCode: string;
  ownerId: string | null;
  players: User[];
  playersReady: string[]; // Array of player IDs who are ready for next game
  currentWord: string | null;
  wordChoices: string[] | null;
  currentDrawer: User | null;
  round: number;
  maxRounds: number;
  drawTime: number;
  status: "waiting" | "playing" | "finished";
  gamePhase: "choosing" | "drawing" | "results";
  timeLeft: number;
  drawingData: DrawingData[];
  hints: string;
}

export interface DrawingData {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  color: string;
  lineWidth: number;
  type: "draw" | "erase";
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}
