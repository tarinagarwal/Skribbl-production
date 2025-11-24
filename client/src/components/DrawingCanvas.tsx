import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Palette, Eraser, Trash2 } from "lucide-react";
import { DrawingData } from "../types/game";

interface DrawingCanvasProps {
  isDrawer: boolean;
  onDraw: (data: DrawingData) => void;
  onClear: () => void;
  drawingData: DrawingData[];
}

// Fixed canvas dimensions for coordinate normalization
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Performance constants
const THROTTLE_INTERVAL = 16; // ~60fps
const MAX_HISTORY = 2000; // Increased for better sync

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawer,
  onDraw,
  onClear,
  drawingData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawTimeRef = useRef<number>(0);
  const lastProcessedIndexRef = useRef<number>(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [history, setHistory] = useState<DrawingData[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [canvasReady, setCanvasReady] = useState(false);

  // Memoized colors array to prevent re-renders
  const colors = useMemo(
    () => [
      "#000000",
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#FFA500",
      "#800080",
      "#FFC0CB",
    ],
    []
  );

  // Initialize canvas with optimized settings
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set fixed canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Optimize canvas settings
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.imageSmoothingEnabled = true; // Enable for better quality

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setCanvasReady(true);
  }, []);

  // Draw a single stroke
  const drawStroke = useCallback(
    (ctx: CanvasRenderingContext2D, data: DrawingData) => {
      if (data.type === "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = data.lineWidth;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
      }

      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    },
    []
  );

  // Redraw entire canvas from drawing data
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    const limitedDrawingData = drawingData.slice(-MAX_HISTORY);
    limitedDrawingData.forEach((data) => {
      drawStroke(ctx, data);
    });

    lastProcessedIndexRef.current = drawingData.length;
  }, [drawingData, canvasReady, drawStroke]);

  // Process new drawing data incrementally
  const processNewDrawingData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newDataCount = drawingData.length - lastProcessedIndexRef.current;
    if (newDataCount > 0) {
      // Draw only new strokes
      const newData = drawingData.slice(lastProcessedIndexRef.current);
      newData.forEach((data) => {
        drawStroke(ctx, data);
      });
      lastProcessedIndexRef.current = drawingData.length;
    }
  }, [drawingData, canvasReady, drawStroke]);

  // Initialize canvas on mount
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Handle drawing data changes
  useEffect(() => {
    if (!canvasReady) return;

    if (drawingData.length === 0) {
      // Canvas was cleared
      lastProcessedIndexRef.current = 0;
      redrawCanvas();
    } else if (drawingData.length < lastProcessedIndexRef.current) {
      // Data was reset, redraw everything
      lastProcessedIndexRef.current = 0;
      redrawCanvas();
    } else {
      // Process new data incrementally
      processNewDrawingData();
    }
  }, [drawingData, canvasReady, redrawCanvas, processNewDrawingData]);

  // Get coordinates with proper scaling
  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      let clientX, clientY;
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate relative position with proper scaling
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // Clamp coordinates to canvas bounds
      return {
        x: Math.max(0, Math.min(CANVAS_WIDTH, x)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT, y)),
      };
    },
    []
  );

  // Throttled drawing function
  const throttledDraw = useCallback(
    (coords: { x: number; y: number }) => {
      const now = performance.now();
      if (now - lastDrawTimeRef.current < THROTTLE_INTERVAL) return;

      lastDrawTimeRef.current = now;

      if (!lastPoint) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawingData: DrawingData = {
        x: coords.x,
        y: coords.y,
        prevX: lastPoint.x,
        prevY: lastPoint.y,
        color,
        lineWidth: tool === "erase" ? lineWidth * 2 : lineWidth,
        type: tool,
      };

      // Draw immediately for instant feedback
      drawStroke(ctx, drawingData);

      // Send to server
      onDraw(drawingData);
      setLastPoint(coords);
    },
    [lastPoint, color, lineWidth, tool, onDraw, drawStroke]
  );

  // Event handlers
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawer) return;

      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      setLastPoint(coords);
      setIsDrawing(true);
      lastDrawTimeRef.current = performance.now();
    },
    [isDrawer, getCoordinates]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isDrawer) return;

      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      throttledDraw(coords);
    },
    [isDrawing, isDrawer, getCoordinates, throttledDraw]
  );

  const stopDrawing = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset tracking
    lastProcessedIndexRef.current = 0;

    onClear();
  }, [isDrawer, onClear]);

  // Memoized color buttons
  const colorButtons = useMemo(
    () =>
      colors.map((c) => (
        <button
          key={c}
          onClick={() => setColor(c)}
          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 transition-transform hover:scale-110 ${
            color === c ? "border-gray-800 scale-110" : "border-gray-300"
          }`}
          style={{ backgroundColor: c }}
        />
      )),
    [colors, color]
  );

  return (
    <div className="flex flex-col items-center w-full">
      {isDrawer && (
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-4 w-full">
          <div className="flex flex-col gap-3">
            {/* Color palette */}
            <div className="flex items-center gap-2">
              <Palette
                size={16}
                className="sm:w-5 sm:h-5 text-gray-600 flex-shrink-0"
              />
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                {colorButtons}
              </div>
            </div>

            {/* Tools and size */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">Size:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-16 sm:w-20"
                />
                <span className="text-xs text-gray-500 w-6">{lineWidth}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTool("draw")}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    tool === "draw"
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  title="Draw"
                >
                  <Palette size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setTool("erase")}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    tool === "erase"
                      ? "bg-blue-500 text-white shadow-lg"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  title="Eraser"
                >
                  <Eraser size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  title="Clear canvas"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          className={`border-2 border-gray-300 rounded-lg bg-white max-w-full transition-all duration-200 ${
            isDrawer ? "cursor-crosshair hover:shadow-lg" : "cursor-not-allowed"
          }`}
          style={{
            touchAction: "none",
            width: "100%",
            maxWidth: "800px",
            height: "auto",
            aspectRatio: "4/3",
          }}
        />
      </div>

      {!isDrawer && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">👀 Watching someone draw</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(DrawingCanvas);
