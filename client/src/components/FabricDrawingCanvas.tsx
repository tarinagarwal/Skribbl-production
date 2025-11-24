import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "fabric";
import {
  Palette,
  Eraser,
  Trash2,
  Undo,
  Redo,
  Circle,
  Square,
  Minus,
} from "lucide-react";
import { DrawingData } from "../types/game";

interface FabricDrawingCanvasProps {
  isDrawer: boolean;
  onDraw: (data: DrawingData) => void;
  onClear: () => void;
  drawingData: DrawingData[];
}

// Fixed canvas dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const FabricDrawingCanvas: React.FC<FabricDrawingCanvasProps> = ({
  isDrawer,
  onDraw,
  onClear,
  drawingData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<
    "draw" | "erase" | "line" | "circle" | "rectangle"
  >("draw");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<any[]>([]);
  const historyStepRef = useRef(0);
  const isRemoteUpdateRef = useRef(false);

  // Memoized colors array
  const colors = React.useMemo(
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

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#ffffff",
      isDrawingMode: isDrawer,
      selection: false, // Disable object selection for drawing game
    });

    // Configure drawing brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = lineWidth;
    }

    fabricCanvasRef.current = canvas;

    // Save initial state
    saveHistory();

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Update drawing mode when isDrawer changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.isDrawingMode = isDrawer && tool === "draw";
    }
  }, [isDrawer, tool]);

  // Update brush properties
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;

    if (tool === "erase") {
      canvas.freeDrawingBrush.color = "#ffffff";
      canvas.freeDrawingBrush.width = lineWidth * 2;
    } else {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = lineWidth;
    }
  }, [color, lineWidth, tool]);

  // Save history
  const saveHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isRemoteUpdateRef.current) return;

    const json = canvas.toJSON();

    // Remove future history if we're not at the end
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(
        0,
        historyStepRef.current + 1
      );
    }

    historyRef.current.push(json);
    historyStepRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyStepRef.current--;
    }

    setCanUndo(historyStepRef.current > 0);
    setCanRedo(false);
  }, []);

  // Handle object added (drawing completed)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleObjectAdded = (e: any) => {
      if (!isDrawer || isRemoteUpdateRef.current) return;

      saveHistory();

      // Send to server
      const fabricObject = e.target.toJSON();
      onDraw({
        fabricObject,
        action: "add",
      });
    };

    canvas.on("object:added", handleObjectAdded);

    return () => {
      canvas.off("object:added", handleObjectAdded);
    };
  }, [isDrawer, onDraw, saveHistory]);

  // Handle remote drawing data
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || drawingData.length === 0) return;

    const lastData = drawingData[drawingData.length - 1];

    if (lastData.action === "clear") {
      isRemoteUpdateRef.current = true;
      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      canvas.renderAll();
      historyRef.current = [];
      historyStepRef.current = 0;
      saveHistory();
      isRemoteUpdateRef.current = false;
      return;
    }

    if (lastData.fabricObject && lastData.action === "add") {
      isRemoteUpdateRef.current = true;

      // Add the object to canvas
      Canvas.prototype.enlivenObjects(
        [lastData.fabricObject],
        (objects: any[]) => {
          objects.forEach((obj) => {
            canvas.add(obj);
          });
          canvas.renderAll();
          isRemoteUpdateRef.current = false;
        },
        ""
      );
    }
  }, [drawingData, saveHistory]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyStepRef.current <= 0) return;

    historyStepRef.current--;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isRemoteUpdateRef.current = true;
    const state = historyRef.current[historyStepRef.current];
    canvas.loadFromJSON(state, () => {
      canvas.renderAll();
      isRemoteUpdateRef.current = false;
    });

    setCanUndo(historyStepRef.current > 0);
    setCanRedo(true);

    // Send undo to server
    onDraw({
      action: "clear",
    });
    // Send current state
    setTimeout(() => {
      const currentState = canvas.toJSON();
      onDraw({
        fabricObject: currentState,
        action: "add",
      });
    }, 100);
  }, [onDraw]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;

    historyStepRef.current++;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isRemoteUpdateRef.current = true;
    const state = historyRef.current[historyStepRef.current];
    canvas.loadFromJSON(state, () => {
      canvas.renderAll();
      isRemoteUpdateRef.current = false;
    });

    setCanUndo(true);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);

    // Send redo to server
    onDraw({
      action: "clear",
    });
    // Send current state
    setTimeout(() => {
      const currentState = canvas.toJSON();
      onDraw({
        fabricObject: currentState,
        action: "add",
      });
    }, 100);
  }, [onDraw]);

  // Clear canvas
  const handleClear = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();

    historyRef.current = [];
    historyStepRef.current = 0;
    saveHistory();

    setCanUndo(false);
    setCanRedo(false);

    onClear();
  }, [onClear, saveHistory]);

  // Memoized color buttons
  const colorButtons = React.useMemo(
    () =>
      colors.map((c) => (
        <button
          key={c}
          onClick={() => setColor(c)}
          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex-shrink-0 transition-transform hover:scale-110 ${
            color === c ? "border-gray-800 scale-110" : "border-gray-300"
          }`}
          style={{ backgroundColor: c }}
          disabled={!isDrawer}
        />
      )),
    [colors, color, isDrawer]
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
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

              <div className="flex gap-2 flex-wrap">
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
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    canUndo
                      ? "bg-gray-200 hover:bg-gray-300"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title="Undo"
                >
                  <Undo size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    canRedo
                      ? "bg-gray-200 hover:bg-gray-300"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  title="Redo"
                >
                  <Redo size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={handleClear}
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

export default React.memo(FabricDrawingCanvas);
