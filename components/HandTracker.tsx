
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { GestureData, GestureMode } from '../types';

interface HandTrackerProps {
  enabled: boolean;
  gestureRef: React.MutableRefObject<GestureData>;
}

const HandTracker: React.FC<HandTrackerProps> = ({ enabled, gestureRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<string>("Initializing AI...");
  const [currentMode, setCurrentMode] = useState<GestureMode>(GestureMode.IDLE);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // 1. Initialize MediaPipe
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (isMounted) {
          handLandmarkerRef.current = landmarker;
          setStatus("AI Ready. Waiting for Camera...");
        }
      } catch (err) {
        console.error(err);
        setStatus("AI Init Failed.");
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // 2. Camera Setup
  useEffect(() => {
    if (!enabled) return;
    
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 30 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
             videoRef.current?.play();
             setStatus("Tracking Active");
          };
        }
      } catch (err) {
        setStatus("Camera Error");
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  // 3. Logic & Drawing Loop
  useEffect(() => {
    if (!enabled || !handLandmarkerRef.current) return;

    const loop = () => {
      const now = performance.now();
      // Throttle to 30fps (approx 33ms) to save CPU
      if (now - lastTimeRef.current >= 33 && videoRef.current && videoRef.current.readyState >= 2) {
        lastTimeRef.current = now;
        
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, now);
        const ctx = canvasRef.current?.getContext('2d');
        
        // Clear HUD
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          // Mirror transform for drawing
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvasRef.current.width, 0);
        }

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          processGestures(landmarks, ctx);
        } else {
          // No hand
          const data = gestureRef.current;
          data.detected = false;
          data.mode = GestureMode.IDLE;
          data.x = 0;
          data.y = 0;
          setCurrentMode(GestureMode.IDLE);
        }

        if (ctx) ctx.restore();
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [enabled]);

  const processGestures = (landmarks: NormalizedLandmark[], ctx: CanvasRenderingContext2D | null) => {
    // 1. Check Finger States
    const wrist = landmarks[0];
    
    const isExtended = (tipIdx: number, pipIdx: number) => {
      const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
      const dPip = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
      return dTip > dPip;
    };

    const thumbOpen = isExtended(4, 2);
    const indexOpen = isExtended(8, 6);
    const middleOpen = isExtended(12, 10);
    const ringOpen = isExtended(16, 14);
    const pinkyOpen = isExtended(20, 18);

    const fingerCount = [thumbOpen, indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;
    
    // 2. Determine Mode
    let mode = GestureMode.IDLE;
    
    // Priority: Specific Rotation Gestures > Generic Scale Gestures
    if (thumbOpen && indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
      mode = GestureMode.ROTATE_Z; // 3 Fingers (Victory + Thumb)
    } else if (thumbOpen && indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
      mode = GestureMode.ROTATE_VIEW; // 2 Fingers (Gun/L shape)
    } else if (fingerCount === 5) {
      mode = GestureMode.SCALE_UP;
    } else if (fingerCount === 0) {
      mode = GestureMode.SCALE_DOWN;
    }

    // 3. Update Gesture Data
    const data = gestureRef.current;
    data.detected = true;
    data.mode = mode;
    data.fingersCount = fingerCount;

    const handCenter = landmarks[9]; // Middle finger MCP
    data.x = handCenter.x;
    data.y = handCenter.y;

    // Planar Roll Angle (Index vs Middle)
    if (mode === GestureMode.ROTATE_Z) {
      const dx = landmarks[12].x - landmarks[8].x;
      const dy = landmarks[12].y - landmarks[8].y;
      data.rotationZ = Math.atan2(dy, dx);
    }

    // Scale Targets
    if (mode === GestureMode.SCALE_UP) data.scaleTarget = 3.0;
    else if (mode === GestureMode.SCALE_DOWN) data.scaleTarget = 1.0;

    setCurrentMode(mode);

    // 4. Draw HUD
    if (ctx && canvasRef.current) {
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;

      // Draw Skeleton
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      drawConnectors(ctx, landmarks, w, h);

      // Draw Mode Indicator on Hand
      ctx.fillStyle = mode === GestureMode.IDLE ? '#aaaaaa' : '#00ff00';
      ctx.font = "16px Arial";
      ctx.fillText(mode, landmarks[0].x * w, landmarks[0].y * h);

      // Draw Tips
      [4, 8, 12, 16, 20].forEach(idx => {
         const lm = landmarks[idx];
         ctx.beginPath();
         ctx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
         ctx.fill();
      });
    }
  };

  const drawConnectors = (ctx: CanvasRenderingContext2D, landmarks: NormalizedLandmark[], w: number, h: number) => {
    const connections = [
      [0,1],[1,2],[2,3],[3,4], // Thumb
      [0,5],[5,6],[6,7],[7,8], // Index
      [0,9],[9,10],[10,11],[11,12], // Middle
      [0,13],[13,14],[14,15],[15,16], // Ring
      [0,17],[17,18],[18,19],[19,20] // Pinky
    ];
    ctx.beginPath();
    connections.forEach(([i, j]) => {
      ctx.moveTo(landmarks[i].x * w, landmarks[i].y * h);
      ctx.lineTo(landmarks[j].x * w, landmarks[j].y * h);
    });
    ctx.stroke();
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${enabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/50 bg-black/80 shadow-[0_0_20px_rgba(0,150,255,0.4)]">
        <div className="relative w-48 h-36">
          <video 
            ref={videoRef} 
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-50"
            playsInline muted
          />
          <canvas 
            ref={canvasRef}
            width={320}
            height={240}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        
        {/* Status Bar */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-2">
           <div className="flex justify-between items-end">
             <div className="flex flex-col">
               <span className="text-[10px] text-gray-400 font-mono tracking-tight">{status}</span>
               <span className={`text-xs font-bold uppercase tracking-widest ${
                 currentMode === GestureMode.IDLE ? 'text-gray-500' : 
                 'text-blue-400'
               }`}>
                 {currentMode}
               </span>
             </div>
             <div className="text-white text-lg opacity-80">
               {currentMode === GestureMode.ROTATE_VIEW && "👁️"}
               {currentMode === GestureMode.ROTATE_Z && "🔄"}
               {currentMode === GestureMode.SCALE_UP && "💥"}
               {currentMode === GestureMode.SCALE_DOWN && "✊"}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HandTracker;
