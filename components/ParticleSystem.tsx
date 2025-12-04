import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateParticles, PARTICLE_COUNT } from '../utils/geometry';
import { ParticleConfig } from '../types';

interface ParticleSystemProps {
  config: ParticleConfig;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ config }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Current positions (displayed)
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  
  // Target positions (for morphing)
  const targetPositions = useMemo(() => generateParticles(config.shape), [config.shape]);
  
  // Colors attribute
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  // Material setup
  const material = useMemo(() => new THREE.PointsMaterial({
    size: config.size,
    color: 0xffffff, // White because we multiply with vertex colors
    vertexColors: true, 
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false,
  }), []);

  // Calculate colors based on target positions and palette
  useEffect(() => {
    if (!pointsRef.current) return;

    const c1 = new THREE.Color(config.colorPalette[0]); // Bottom
    const c2 = new THREE.Color(config.colorPalette[1]);
    const c3 = new THREE.Color(config.colorPalette[2]);
    const c4 = new THREE.Color(config.colorPalette[3]);
    const c5 = new THREE.Color(config.colorPalette[4]); // Top

    // Determine bounds of the target shape to map the gradient
    let minY = Infinity;
    let maxY = -Infinity;
    
    // Quick pass to find bounds of the target shape
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = targetPositions[i * 3 + 1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const height = maxY - minY || 1; 

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = targetPositions[i * 3 + 1];
      
      // Normalize height 0 to 1
      let t = (y - minY) / height;
      t = Math.max(0, Math.min(1, t)); // Clamp

      const finalColor = new THREE.Color();
      
      if (t < 0.25) {
        finalColor.lerpColors(c1, c2, t / 0.25);
      } else if (t < 0.5) {
        finalColor.lerpColors(c2, c3, (t - 0.25) / 0.25);
      } else if (t < 0.75) {
        finalColor.lerpColors(c3, c4, (t - 0.5) / 0.25);
      } else {
        finalColor.lerpColors(c4, c5, (t - 0.75) / 0.25);
      }

      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }

    if (pointsRef.current.geometry.attributes.color) {
      pointsRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [config.colorPalette, targetPositions, colors]);


  // Update material params when config changes
  useEffect(() => {
    if (pointsRef.current) {
      material.size = config.size;
    }
  }, [config.size, material]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;

    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    const currentPositions = positionAttribute.array as Float32Array;

    const time = state.clock.getElapsedTime();
    const lerpFactor = 0.05; // Speed of morphing
    const speed = config.speed;
    const noiseStrength = config.noiseStrength;
    const hasNoise = noiseStrength > 0.01;

    // Optimization: Cache these lookups
    const tPositions = targetPositions;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // 2. Morphing: Move towards target shape
      currentPositions[i3] += (tPositions[i3] - currentPositions[i3]) * lerpFactor;
      currentPositions[i3 + 1] += (tPositions[i3 + 1] - currentPositions[i3 + 1]) * lerpFactor;
      currentPositions[i3 + 2] += (tPositions[i3 + 2] - currentPositions[i3 + 2]) * lerpFactor;

      // 3. Noise/Life: Add subtle movement based on noiseStrength
      if (hasNoise) {
        const nS = noiseStrength * 0.1;
        const noiseX = Math.sin(time * speed + currentPositions[i3 + 1] * 0.5) * nS;
        const noiseY = Math.cos(time * speed + currentPositions[i3] * 0.5) * nS;
        const noiseZ = Math.sin(time * speed + currentPositions[i3 + 2] * 0.5) * nS;
        
        currentPositions[i3] += noiseX;
        currentPositions[i3 + 1] += noiseY;
        currentPositions[i3 + 2] += noiseZ;
      }
    }

    positionAttribute.needsUpdate = true;
    
    // Auto-rotate the whole system
    pointsRef.current.rotation.y += 0.001 * config.speed;
  });

  // Initial population
  useEffect(() => {
    if(pointsRef.current) {
        const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
        const startPos = generateParticles(config.shape);
        for(let i=0; i<arr.length; i++) arr[i] = startPos[i];
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, []); // Only run once on mount

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};

export default ParticleSystem;