import React, { useRef, useEffect, useState } from "react";
import { Palette, Eraser, Trash2 } from "lucide-react";
import { DrawingData } from "../types/game";

interface DrawingCanvasProps {
  isDrawer: boolean;
  onDraw: (data: DrawingData) => void;
  onClear: () => void;
  drawingData: DrawingData[];
}

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

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Set default styles
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    // Redraw all drawing data
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

  const startDrawing = (e: React.MouseEvent) => {
    if (!isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale coordinates to match canvas resolution
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledPrevX = (x - e.movementX) * scaleX;
    const scaledPrevY = (y - e.movementY) * scaleY;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawingData: DrawingData = {
      x: scaledX,
      y: scaledY,
      prevX: scaledPrevX,
      prevY: scaledPrevY,
      color,
      lineWidth: tool === "erase" ? lineWidth * 2 : lineWidth,
      type: tool,
    };

    drawStroke(ctx, drawingData);
    onDraw(drawingData);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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
    <div className="flex flex-col items-center">
      {isDrawer && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Palette size={20} className="text-gray-600" />
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? "border-gray-800" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-20"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTool("draw")}
              className={`p-2 rounded-lg ${
                tool === "draw" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              <Palette size={16} />
            </button>
            <button
              onClick={() => setTool("erase")}
              className={`p-2 rounded-lg ${
                tool === "erase" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              <Eraser size={16} />
            </button>
            <button
              onClick={clearCanvas}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className={`border-2 border-gray-300 rounded-lg bg-white ${
          isDrawer ? "cursor-crosshair" : "cursor-not-allowed"
        }`}
        style={{ maxWidth: "100%", height: "auto" }}
      />
    </div>
  );
};

export default DrawingCanvas;
