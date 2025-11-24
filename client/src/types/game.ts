export interface User {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isDrawer: boolean;
  isSpectator?: boolean;
}

export interface Game {
  id: string;
  roomCode: string;
  ownerId: string | null;
  players: User[];
  spectators?: User[]; // Array of spectators
  playersReady: string[]; // Array of player IDs who are ready for next game
  bannedPlayers?: string[]; // Array of banned player IDs
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
  canvasState?: FabricCanvasState; // Full canvas state for Fabric.js
  hints: string;
}

export interface DrawingData {
  // Legacy format (for backward compatibility)
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  lineWidth?: number;
  type?: "draw" | "erase" | "line" | "circle" | "rectangle" | "fill";
  endX?: number;
  endY?: number;

  // Fabric.js format
  fabricObject?: any; // Fabric.js serialized object
  action?: "add" | "modify" | "remove" | "clear";
}

export interface FabricCanvasState {
  version: string;
  objects: any[];
}

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}
