
import React, { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import ParticleSystem from './components/ParticleSystem';
import Controls from './components/Controls';
import HandTracker from './components/HandTracker';
import { ParticleConfig, ShapeType, GestureData, GestureMode } from './types';

// --- Interaction Rig Component ---
const InteractionRig: React.FC<{ 
  gestureRef: React.MutableRefObject<GestureData>; 
  sceneGroupRef: React.RefObject<THREE.Group>;
  orbitRef: React.RefObject<OrbitControlsImpl>;
  enabled: boolean;
}> = ({ gestureRef, sceneGroupRef, orbitRef, enabled }) => {
  
  // Smoothing refs
  const currentScale = useRef(1.0);
  const currentRoll = useRef(0);
  const lastHandPos = useRef<{x: number, y: number} | null>(null);

  useFrame((state, delta) => {
    if (!enabled || !sceneGroupRef.current) return;

    const data = gestureRef.current;
    
    // Smooth Lerp Factor
    const lerpSpeed = delta * 5; 

    // 1. SCALING & STABILITY LOGIC
    // If we are rotating (VIEW or Z), we lock the scale to 1.0 to prevent diffusion.
    if (data.mode === GestureMode.ROTATE_VIEW || data.mode === GestureMode.ROTATE_Z) {
      currentScale.current = THREE.MathUtils.lerp(currentScale.current, 1.0, lerpSpeed);
    } 
    else if (data.mode === GestureMode.SCALE_UP || data.mode === GestureMode.SCALE_DOWN) {
      currentScale.current = THREE.MathUtils.lerp(currentScale.current, data.scaleTarget, lerpSpeed);
    } 
    else {
      // IDLE - slowly return to 1.0
      currentScale.current = THREE.MathUtils.lerp(currentScale.current, 1.0, lerpSpeed * 0.5);
    }
    
    sceneGroupRef.current.scale.setScalar(currentScale.current);

    // 2. XY ROTATION (Mode: VIEW - Thumb+Index)
    if (data.mode === GestureMode.ROTATE_VIEW && orbitRef.current) {
      // Calculate delta this frame
      if (lastHandPos.current && data.detected) {
         const dx = data.x - lastHandPos.current.x;
         const dy = data.y - lastHandPos.current.y;
         
         // Sensitivity: High value because dx/dy are small normalized changes
         // Increased from 5.0 to 12.0 for bigger amplitude
         const sensitivity = 12.0; 
         
         // Apply rotation directly (orbit controls accumulate angle)
         orbitRef.current.setAzimuthalAngle(orbitRef.current.getAzimuthalAngle() - dx * sensitivity);
         orbitRef.current.setPolarAngle(orbitRef.current.getPolarAngle() - dy * sensitivity);
         orbitRef.current.update();
      }
      // Update last pos
      lastHandPos.current = { x: data.x, y: data.y };
    } 
    else {
      // Reset tracker when not in view mode so next interaction starts fresh
      lastHandPos.current = null;
    }

    // 3. Z-AXIS ROLL (Mode: ROLL - Thumb+Index+Middle)
    if (data.mode === GestureMode.ROTATE_Z) {
      // Map hand angle directly to object roll
      const targetRoll = -data.rotationZ + Math.PI / 2; 
      currentRoll.current = THREE.MathUtils.lerp(currentRoll.current, targetRoll, lerpSpeed);
      sceneGroupRef.current.rotation.z = currentRoll.current;
    } else {
      // Return roll to 0 when released
      currentRoll.current = THREE.MathUtils.lerp(currentRoll.current, 0, lerpSpeed * 0.5);
      sceneGroupRef.current.rotation.z = currentRoll.current;
    }
  });

  return null;
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ParticleConfig>({
    count: 15000,
    size: 0.15,
    color: '#00ffff',
    colorPalette: ['#8B4513', '#2E8B57', '#3CB371', '#90EE90', '#FFD700'], 
    speed: 0.5,
    noiseStrength: 0.2,
    shape: ShapeType.SPHERE,
  });

  const [gesturesEnabled, setGesturesEnabled] = useState(false);

  // Mutable ref for Gesture Data (Shared between Tracker and 3D Scene)
  const gestureRef = useRef<GestureData>({
    mode: GestureMode.IDLE,
    detected: false,
    scaleTarget: 1.0,
    rotationZ: 0,
    x: 0,
    y: 0,
    fingersCount: 0
  });

  const orbitControlsRef = useRef<OrbitControlsImpl>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);

  // Toggle OrbitControls auto-rotate based on interaction
  const isInteracting = gestureRef.current.mode !== GestureMode.IDLE && gestureRef.current.detected;

  return (
    <div className="relative w-full h-screen bg-black">
      
      <HandTracker enabled={gesturesEnabled} gestureRef={gestureRef} />

      <Canvas
        camera={{ position: [0, 0, 40], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false }}
      >
        <color attach="background" args={['#050505']} />
        
        <Suspense fallback={null}>
          <group ref={sceneGroupRef} position={[0, 0, 0]}>
             <ParticleSystem config={config} />
          </group>
          
          <Stars 
            radius={100} 
            depth={50} 
            count={5000} 
            factor={4} 
            saturation={0} 
            fade 
            speed={1} 
          />

          <InteractionRig 
            gestureRef={gestureRef} 
            sceneGroupRef={sceneGroupRef} 
            orbitRef={orbitControlsRef}
            enabled={gesturesEnabled}
          />
        </Suspense>

        <OrbitControls 
          ref={orbitControlsRef}
          enableDamping 
          dampingFactor={0.05} 
          autoRotate={!isInteracting && gesturesEnabled ? false : true} // Stop rotation when interacting
          autoRotateSpeed={1.0}
          maxDistance={100}
          minDistance={10}
          enabled={!gesturesEnabled || gestureRef.current.mode === GestureMode.IDLE} // Disable mouse when hand acting
        />
        
        <ambientLight intensity={0.5} />
      </Canvas>

      <Controls 
        config={config} 
        setConfig={setConfig} 
        gesturesEnabled={gesturesEnabled}
        onToggleGestures={() => setGesturesEnabled(!gesturesEnabled)}
      />
    </div>
  );
};

export default App;
