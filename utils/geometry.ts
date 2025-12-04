
import * as THREE from 'three';
import { ShapeType } from '../types';

export const PARTICLE_COUNT = 15000;

// Helper: Random float between min and max
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper: Point on sphere
const getSpherePoint = (r: number) => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

export const generateParticles = (type: ShapeType): Float32Array => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  
  if (type === ShapeType.HEART) {
    let idx = 0;
    const scale = 12; 
    const maxAttempts = PARTICLE_COUNT * 20;
    let attempt = 0;

    // Use all particles for the heart shape
    while (idx < PARTICLE_COUNT && attempt < maxAttempts) {
      attempt++;
      // Heart formula
      const x = random(-1.5, 1.5);
      const y = random(-1.5, 1.5);
      const z = random(-1.5, 1.5);
      const x2 = x * x;
      const y2 = y * y;
      const z2 = z * z;
      const y3 = y * y * y;
      const a = x2 + 2.25 * z2 + y2 - 1;
      
      if (Math.pow(a, 3) - (x2 * y3) - (0.1125 * z2 * y3) <= 0) {
        positions[idx * 3] = x * scale;
        positions[idx * 3 + 1] = y * scale;
        positions[idx * 3 + 2] = z * scale;
        idx++;
      }
    }
    
    // Fallback fill if rejection sampling didn't find enough points
    while(idx < PARTICLE_COUNT) {
      positions[idx * 3] = 0;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = 0;
      idx++;
    }
    return positions;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let x = 0, y = 0, z = 0;

    switch (type) {
      case ShapeType.SPHERE: {
        const p = getSpherePoint(15);
        x = p.x; y = p.y; z = p.z;
        break;
      }
      case ShapeType.FLOWER: {
        const seed = Math.random();
        
        // Distribution Strategy:
        // 10% Stem
        // 15% Stamen (Hidden inside bud, but keeps density)
        // 75% Petals (Layered for visual richness)
        
        if (seed < 0.10) {
          // --- Stem ---
          // S-curved cylinder from y=-18 to y=0
          const t = Math.random(); // 0 (bottom) to 1 (top)
          const yPos = -18 + t * 18;
          
          // Taper: thicker at bottom
          const r = 0.5 + (1 - t) * 0.4; 
          const theta = Math.random() * Math.PI * 2;
          
          // Gentle S-curve offset
          const curveX = Math.sin(t * Math.PI) * 1.5;
          const curveZ = Math.cos(t * Math.PI * 0.5) * 0.5;

          x = Math.cos(theta) * r + curveX;
          z = Math.sin(theta) * r + curveZ;
          y = yPos;

          // Add random thorns or bumps
          if (Math.random() < 0.1) {
             const thornLen = 0.5;
             x += Math.cos(theta) * thornLen;
             z += Math.sin(theta) * thornLen;
          }

          // Add leaves on stem
          if (t > 0.3 && t < 0.7 && Math.random() > 0.95) {
             // Generate a leaf particle
             // Leaf extends out from stem
             const leafU = Math.random(); // Distance from stem
             const leafV = (Math.random() - 0.5) * 2; // Width
             const side = (yPos < -9 ? 1 : -1); // Alternate sides
             
             const lLen = 8;
             const lWid = 3 * Math.sin(leafU * Math.PI);
             
             // Leaf coordinate frame attached to stem
             let lx = side * leafU * lLen;
             let ly = leafU * 3 + (leafV * lWid * 0.2); // Angle up slightly
             let lz = leafV * lWid;
             
             // Curl down at tip
             ly -= (leafU * leafU) * 4;

             x += lx;
             y += ly;
             z += lz;
          }

        } else if (seed < 0.25) {
          // --- Stamen (Inside the Bud) ---
          // Compact sphere core
          const r = 1.5 * Math.sqrt(Math.random());
          const theta = i * 2.39996; // Golden angle
          const heightBias = Math.random();
          const domeY = Math.sqrt(1 - (r/1.5)*(r/1.5)) * 2.0 * heightBias;

          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
          y = domeY + 1.0; // Lifted slightly

        } else {
          // --- Petals (Bud Shape) ---
          // We define 3 layers of petals, all tightly packed and curving inward
          
          const petalSeed = Math.random();
          let layerConfig = {
             count: 6,
             radiusOffset: 0.5,
             tilt: 0.2, 
             length: 10,
             width: 4.5,
             yBase: 0,
             inwardCurl: 0.8
          };

          // Layer selection
          if (petalSeed < 0.30) {
             // Inner Layer: Very tight, almost closed
             layerConfig = { count: 5, radiusOffset: 0.5, tilt: 0.1, length: 9, width: 4.0, yBase: 0.5, inwardCurl: 1.2 };
          } else if (petalSeed < 0.65) {
             // Middle Layer: Hugging the inner layer
             layerConfig = { count: 7, radiusOffset: 1.2, tilt: 0.25, length: 11, width: 5.5, yBase: 0.2, inwardCurl: 1.0 };
          } else {
             // Outer Layer: Wrapping everything
             layerConfig = { count: 9, radiusOffset: 2.0, tilt: 0.4, length: 12, width: 7.0, yBase: -0.5, inwardCurl: 0.8 };
          }

          // Assign particle to a specific petal in the layer
          const petalIdx = Math.floor(Math.random() * layerConfig.count);
          const anglePerPetal = (Math.PI * 2) / layerConfig.count;
          // Offset each layer so petals interlock
          const angleOffset = (layerConfig.length % 2) * (anglePerPetal / 2); 
          const baseAngle = petalIdx * anglePerPetal + angleOffset;

          // Parametric Surface for a single petal
          const u = Math.random(); // 0 (base) -> 1 (tip)
          const v = (Math.random() - 0.5) * 2; // -1 (left) -> 1 (right)

          // Shape Profile: Wider at middle/top to cover the bud
          const widthProfile = Math.sin(Math.pow(u, 0.7) * Math.PI) * layerConfig.width;
          
          // Cupping: Deep concave shape to wrap around
          const cupping = (v * v) * 2.5 * u; 

          // Local Coordinates
          let lx = v * widthProfile;
          let ly = u * layerConfig.length;
          let lz = cupping;

          // Apply Tilt & Inward Curl
          // Base tilt is small. As we go up (u increases), we reduce tilt to curve INWARD.
          // effectiveTilt = startTilt - (u * curlFactor)
          // Negative tilt means curving towards center
          const effectiveTilt = layerConfig.tilt - (Math.pow(u, 1.5) * layerConfig.inwardCurl);

          const cosT = Math.cos(effectiveTilt);
          const sinT = Math.sin(effectiveTilt);

          let rx = lx;
          let ry = ly * cosT - lz * sinT;
          let rz = ly * sinT + lz * cosT;

          // Move outward from center
          rz += layerConfig.radiusOffset;
          ry += layerConfig.yBase;

          // Apply Rotation around Y axis
          const cosA = Math.cos(baseAngle);
          const sinA = Math.sin(baseAngle);

          x = rx * cosA - rz * sinA;
          z = rx * sinA + rz * cosA;
          y = ry;
        }
        break;
      }
      case ShapeType.TREE: {
        const p = Math.random();
        if (p < 0.1) { // Trunk
          x = random(-1, 1);
          z = random(-1, 1);
          y = random(-10, 0);
        } else { // Leaves
          const h = Math.random() * 25; 
          const maxR = 10 * (1 - h / 25);
          const theta = Math.random() * Math.PI * 2;
          const r = Math.random() * maxR;
          x = r * Math.cos(theta);
          z = r * Math.sin(theta);
          y = h - 5;
        }
        break;
      }
      case ShapeType.SNOWMAN: {
        const rand = Math.random();
        const headY = 7;
        const headRadius = 5.5;
        if (rand < 0.45) { // Body
           const p = getSpherePoint(9); 
           x = p.x; y = p.y - 6; z = p.z;
        } else if (rand < 0.70) { // Head
           const p = getSpherePoint(headRadius);
           x = p.x; y = p.y + headY; z = p.z;
        } else if (rand < 0.85) { // Hat
           const hatPart = Math.random();
           const hatBaseY = headY + headRadius * 0.8; 
           if (hatPart < 0.4) { // Brim
             const r = Math.sqrt(Math.random()) * 7; 
             const theta = Math.random() * Math.PI * 2;
             x = r * Math.cos(theta); z = r * Math.sin(theta); y = hatBaseY + random(-0.2, 0.2); 
           } else { // Cylinder
             const r = Math.sqrt(Math.random()) * 4; 
             const theta = Math.random() * Math.PI * 2;
             const h = Math.random() * 7;
             x = r * Math.cos(theta); z = r * Math.sin(theta); y = hatBaseY + h;
           }
        } else if (rand < 0.90) { // Arms
           const side = Math.random() > 0.5 ? 1 : -1;
           const t = Math.random(); 
           const startX = side * 7; const endX = side * 16;
           x = startX + (endX - startX) * t; y = 0 + (t * 4); z = random(-1, 1); 
        } else { // Face
           const feature = Math.random();
           if (feature < 0.3) { // Eyes
             const eyeSide = Math.random() > 0.5 ? 1 : -1;
             const p = getSpherePoint(0.4);
             x = (eyeSide * 1.8) + p.x; y = (headY + 1.5) + p.y; z = (Math.sqrt(headRadius*headRadius - 1.8*1.8 - 1.5*1.5) + 0.5) + p.z;
           } else if (feature < 0.6) { // Nose
             const noseBaseRadius = 0.5; const noseLength = 3.5; const t = Math.random();
             const currentR = noseBaseRadius * (1 - t); const theta = Math.random() * Math.PI * 2;
             x = currentR * Math.cos(theta); y = headY + currentR * Math.sin(theta); z = headRadius + (t * noseLength);
           } else { // Mouth
             const t = random(-2, 2); x = t; const curveY = (t * t) * 0.15; 
             y = (headY - 1.5) + curveY + random(-0.1, 0.1);
             z = Math.sqrt(headRadius*headRadius - x*x - 2*2) + random(0, 0.2);
           }
        }
        break;
      }
      case ShapeType.GALAXY: {
        const planetRatio = 0.40; 
        if (i < PARTICLE_COUNT * planetRatio) {
           const r = 10; const p = getSpherePoint(r);
           x = p.x; y = p.y; z = p.z;
        } else {
           const angle = Math.random() * Math.PI * 2;
           const r = random(12, 16);
           x = Math.cos(angle) * r; z = Math.sin(angle) * r; y = random(-0.2, 0.2);
           const tilt = 20 * (Math.PI / 180);
           const tiltedY = y * Math.cos(tilt) - z * Math.sin(tilt);
           const tiltedZ = y * Math.sin(tilt) + z * Math.cos(tilt);
           y = tiltedY; z = tiltedZ;
        }
        break;
      }
      default:
        x = random(-10, 10);
        y = random(-10, 10);
        z = random(-10, 10);
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
};
