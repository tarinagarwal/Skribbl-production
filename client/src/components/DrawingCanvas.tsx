import React, { useRef, useEffect, useState } from "react";
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

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawer,
  onDraw,
  onClear,
  drawingData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const colors = [
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
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set fixed canvas size for consistent coordinates
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Set default styles
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    drawingData.forEach((data) => {
      drawStroke(ctx, data);
    });
  }, []);

  useEffect(() => {
    // Redraw all drawing data when it changes
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    drawingData.forEach((data) => {
      drawStroke(ctx, data);
    });
  }, [drawingData]);

  const drawStroke = (ctx: CanvasRenderingContext2D, data: DrawingData) => {
    if (data.type === "erase") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = data.color;
    }

    ctx.lineWidth = data.lineWidth;
    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
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

    // Calculate relative position within the displayed canvas
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;

    // Convert to absolute canvas coordinates
    const x = relativeX * CANVAS_WIDTH;
    const y = relativeY * CANVAS_HEIGHT;

    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x));
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y));

    return { x: clampedX, y: clampedY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;

    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setLastPoint(coords);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer) return;

    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords || !lastPoint) return;

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

    drawStroke(ctx, drawingData);
    onDraw(drawingData);
    setLastPoint(coords);
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearCanvas = () => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

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
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 ${
                      color === c ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
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
                  className={`p-2 rounded-lg transition-colors ${
                    tool === "draw"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  title="Draw"
                >
                  <Palette size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setTool("erase")}
                  className={`p-2 rounded-lg transition-colors ${
                    tool === "erase"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                  title="Eraser"
                >
                  <Eraser size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
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
          className={`border-2 border-gray-300 rounded-lg bg-white max-w-full ${
            isDrawer ? "cursor-crosshair" : "cursor-not-allowed"
          }`}
          style={{
            touchAction: "none", // Prevent scrolling on touch
            width: "100%",
            maxWidth: "800px",
            height: "auto",
            aspectRatio: "4/3", // Maintain 800:600 aspect ratio
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

export default DrawingCanvas;
