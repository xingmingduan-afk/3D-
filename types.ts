
export enum ShapeType {
  SPHERE = 'Sphere',
  FLOWER = 'Flower',
  HEART = 'Heart',
  TREE = 'Tree',
  SNOWMAN = 'Snowman',
  GALAXY = 'Galaxy'
}

export interface ParticleConfig {
  count: number;
  size: number;
  color: string; // Primary fallback color
  colorPalette: string[]; // Gradient colors (5 steps)
  speed: number;
  noiseStrength: number;
  shape: ShapeType;
}

export interface AIConfigResponse {
  colorHex: string;
  colorPalette: string[];
  speed: number;
  noiseStrength: number;
  reasoning: string;
  shapeMatch: ShapeType;
}

// --- Gesture Interaction Types ---

export enum GestureMode {
  IDLE = 'IDLE',           // No specific gesture detected
  ROTATE_VIEW = 'VIEW',    // Thumb + Index (XY Rotation)
  ROTATE_Z = 'ROLL',       // Thumb + Index + Middle (Z Rotation)
  SCALE_UP = 'EXPAND',     // 5 Fingers Open
  SCALE_DOWN = 'SHRINK',   // Fist (0 Fingers)
}

export interface GestureData {
  mode: GestureMode;
  detected: boolean;
  scaleTarget: number;     // For Scale Mode
  rotationZ: number;       // For Roll Mode (radians)
  x: number;               // Normalized X (0-1)
  y: number;               // Normalized Y (0-1)
  fingersCount: number;    // Debug info
}
