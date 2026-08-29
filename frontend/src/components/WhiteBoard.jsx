import React from 'react'
import { useRef, useEffect, useState } from 'react';
import { IoArrowUndo, IoArrowRedo } from "react-icons/io5";
import { MdDownloadForOffline } from "react-icons/md";
function WhiteBoard({ socket, showWB }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef([]);
  const cursorCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [isErasing, setIsErasing] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const sizePresets = [
    { label: "S", value: 2 },
    { label: "M", value: 4 },
    { label: "L", value: 8 }
  ];
  const strokeColor = isErasing ? "#ffffff" : color;
  const getPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    let clientX, clientY;
    
    if (event.touches && event.touches.length > 0) {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const redrawCanvas = (history) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    history.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;

      stroke.points.forEach((point, index) => {
        const x = point.x * canvas.clientWidth;
        const y = point.y * canvas.clientHeight;

        if (index == 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    })
  };

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleUpdate = (history) => {
      historyRef.current = history;
      redrawCanvas(history);
    };

    socket.on("whiteboard-update", handleUpdate);
    socket.emit("whiteboard-sync");

    return () => {
      socket.off("whiteboard-update", handleUpdate);
    }
  }, [socket]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;

        canvas.width = width;
        canvas.height = height;

        const cursorCanvas = cursorCanvasRef.current;
        if (cursorCanvas) {
          cursorCanvas.width = cursorCanvas.clientWidth;
          cursorCanvas.height = cursorCanvas.clientHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 3;
          ctxRef.current = ctx;
        }

        redrawCanvas(historyRef.current);
      }
    });

    resizeObserver.observe(canvas.parentElement || canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;

      e.preventDefault();
      if (e.shiftKey) {
        socket.emit("whiteboard-redo");
      } else {
        socket.emit("whiteboard-undo");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [socket]);

  const startDrawing = (e) => {
    drawingRef.current = true;

    const point = getPoint(e.nativeEvent);
    if (!point) return;

    currentStrokeRef.current = [{
      x: point.x / point.width,
      y: point.y / point.height
    }];
  }

  const draw = (e) => {
    const point = getPoint(e.nativeEvent);
    if (!point) return;

    const x = point.x;
    const y = point.y;

    drawCursor(x, y);

    if (!drawingRef.current || !socket) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const prev = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (prev) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prev.x * canvas.clientWidth, prev.y * canvas.clientHeight);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    currentStrokeRef.current.push({
      x: x / point.width,
      y: y / point.height
    });
  }

  const stopDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (currentStrokeRef.current.length > 1) {
      socket.emit("whiteboard-draw", {
        color: strokeColor,
        size: size,
        points: currentStrokeRef.current
      });
    }
    currentStrokeRef.current = [];
  }

  const drawCursor = (x, y) => {
    const cursorCanvas = cursorCanvasRef.current;
    const ctx = cursorCanvas?.getContext("2d");

    if (!cursorCanvas || !ctx) return;

    // clear previous cursor
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    ctx.beginPath();
    ctx.arc(x, y, Math.max(size / 2, 3), 0, Math.PI * 2);
    ctx.strokeStyle = isErasing ? "#94a3b8" : color;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const clearCursor = () => {
    const cursorCanvas = cursorCanvasRef.current;
    const ctx = cursorCanvas?.getContext("2d");

    if (!cursorCanvas || !ctx) return;

    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  };

  const clearDrawing = () => {
    if (!window.confirm("Clear the whiteboard for everyone?")) return;
    socket.emit("whiteboard-clear");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height

    const tempCtx = tempCanvas.getContext("2d")
    tempCtx.fillStyle = "#ffffff"
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

    tempCtx.drawImage(canvas, 0, 0)
    const link = document.createElement('a');
    const image = tempCanvas.toDataURL("image/png");
    link.href = image
    link.download = "whiteboard.png"
    link.click()
  }

  return (
    <div className="w-full h-full flex flex-col gap-2 bg-slate-900 p-3">
      <div className='flex flex-wrap justify-between items-center gap-y-2 flex-shrink-0'>
        <div>
          <button className='rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5  active:translate-y-0 active:scale-95 mr-2'
            onClick={() => socket.emit("whiteboard-undo")}>
            <IoArrowUndo />
          </button>
          <button className='rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5  active:translate-y-0 active:scale-95'
            onClick={() => socket.emit("whiteboard-redo")}>
            <IoArrowRedo />
          </button>
        </div>
        <div className='flex items-center gap-2'>
          {/* Below sm: single toggle button showing the active size, opens a popover */}
          <div className='relative sm:hidden'>
            <button
              onClick={() => setShowSizePicker((prev) => !prev)}
              className="h-7 w-7 flex items-center justify-center rounded-md bg-slate-800 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              <span
                className="rounded-full bg-slate-100"
                style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
              ></span>
            </button>
            {showSizePicker && (
              <div className="absolute top-full left-0 mt-2 flex gap-1 rounded-md border border-slate-700/70 bg-slate-900/95 p-1 shadow-lg z-10">
                {sizePresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setSize(preset.value);
                      setShowSizePicker(false);
                    }}
                    className={`h-7 w-7 rounded-md text-[11px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                      size === preset.value
                        ? "bg-sky-600 text-white"
                        : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* sm and up: all three size buttons shown inline */}
          <div className='hidden sm:flex gap-1'>
            {sizePresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setSize(preset.value)}
                className={`h-7 w-7 rounded-md text-[11px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
                  size === preset.value
                    ? "bg-sky-600 text-white"
                    : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsErasing((prev) => !prev)}
            className={`rounded-md px-3 py-1 text-xs transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${
              isErasing
                ? "bg-sky-600 text-white"
                : "bg-slate-800 text-slate-100 hover:bg-slate-700"
            }`}
          >
            <i className="fa-solid fa-eraser"></i>
          </button>
          <input type="color" value={color}
            onChange={(e) => { setColor(e.target.value); setIsErasing(false); }}
            className='w-8 h-8 cursor-pointer' />
        </div>
        <div className='flex gap-2 '>
          <button className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5  active:translate-y-0 active:scale-95"
            onClick={clearDrawing}>
            <i className="fa-solid fa-broom"></i>
          </button>
          <button className="rounded-md bg-slate-800 px-3 py-[0.3rem] text-[0.8rem] text-slate-100 transition-all duration-200 ease-out hover:bg-slate-700 hover:-translate-y-0.5  active:translate-y-0 active:scale-95"
            onClick={handleDownload}>
            <MdDownloadForOffline />
          </button>
          <button className="h-8 w-8 rounded-full text-slate-300 py-[0.3rem] transition hover:bg-slate-800 hover:text-white" onClick={showWB}>
              <i className="fa-regular fa-circle-xmark"></i>
          </button>
        </div>

      </div>
      <div className="relative w-full flex-1 overflow-hidden">

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-lg border cursor-crosshair border-slate-700 bg-white touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={() => {
            stopDrawing();
            clearCursor();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            startDrawing(e);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            draw(e);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopDrawing();
            clearCursor();
          }}
          onTouchCancel={() => {
            stopDrawing();
            clearCursor();
          }}
        />

        <canvas
          ref={cursorCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  )
}


export default WhiteBoard