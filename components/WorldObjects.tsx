import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Creature } from '../types';

// --- ASSETS & TEXTURES ---
const TEXTURE_URLS = {
  dinoSkin: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg', // Tech/Sci-fi skin
  reptile: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg',
  grass: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg',
  rock: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg', // Fixed broken texture
  lava: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/lava/lavatile.jpg',
};

// --- CREATURES ---

export const SpaceDino: React.FC<{ creature: Creature }> = ({ creature }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  
  const texture = useTexture(TEXTURE_URLS.reptile);
  
  // AI State
  const [target, setTarget] = useState(new THREE.Vector3(creature.position.x, creature.position.y, creature.position.z));
  const [state, setState] = useState<'IDLE' | 'WALK'>('IDLE');
  const nextDecisionTime = useRef(0);
  
  // Random seed based on ID
  const seed = useMemo(() => parseInt(creature.id) || Math.random() * 100, [creature.id]);

  useFrame((stateCtx) => {
    const t = stateCtx.clock.elapsedTime;

    if (groupRef.current) {
        // AI Logic
        if (t > nextDecisionTime.current) {
            if (Math.random() > 0.4) {
                // Pick new random target within 15 units of original spawn
                const r = 15;
                const x = creature.position.x + (Math.random() * r * 2 - r);
                const z = creature.position.z + (Math.random() * r * 2 - r);
                setTarget(new THREE.Vector3(x, creature.position.y, z));
                setState('WALK');
            } else {
                setState('IDLE');
            }
            nextDecisionTime.current = t + 3 + Math.random() * 5; // Wait 3-8 seconds
        }

        // Movement Logic
        if (state === 'WALK') {
            const currentPos = groupRef.current.position;
            const dir = new THREE.Vector3().subVectors(target, currentPos);
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize();
                // Move
                currentPos.add(dir.multiplyScalar(0.03)); // Speed
                
                // Rotate to face target smoothly
                const targetRotation = Math.atan2(dir.x, dir.z);
                // Simple lerp for rotation
                let rotDiff = targetRotation - groupRef.current.rotation.y;
                // Normalize angle
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                groupRef.current.rotation.y += rotDiff * 0.05;

                // Walk cycle
                groupRef.current.position.y = creature.position.y + Math.sin(t * 10) * 0.1;
            } else {
                setState('IDLE');
            }
        } else {
            // Idle Bobbing
            groupRef.current.position.y = creature.position.y + Math.sin(t * 1.5 + seed) * 0.05;
        }
    }

    // Animation Logic (Breathing/Tail)
    if (bodyRef.current) {
        const breathScale = 1 + Math.sin(t * 2 + seed) * 0.015;
        bodyRef.current.scale.set(breathScale, 1, breathScale);
    }
    if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 0.3 + seed) * 0.15;
    }
    if (tailRef.current) {
        const wagSpeed = state === 'WALK' ? 10 : 3;
        tailRef.current.rotation.z = Math.sin(t * wagSpeed + seed) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[creature.position.x, creature.position.y, creature.position.z]} scale={creature.scale}>
      
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 1.5, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.7, 2.5, 8, 16]} />
        <meshStandardMaterial map={texture} color={creature.color} roughness={0.5} />
      </mesh>

      {/* Head Group */}
      <group ref={headGroupRef} position={[0, 2.8, 0.6]}>
        <mesh castShadow>
          <boxGeometry args={[1.1, 1, 1.6]} />
          <meshStandardMaterial map={texture} color={creature.color} />
        </mesh>
        {/* Eyes */}
        <group position={[0, 0.1, 0.85]}>
          <mesh position={[0.3, 0, 0]}> <sphereGeometry args={[0.12]} /> <meshStandardMaterial color="black" /> </mesh>
          <mesh position={[-0.3, 0, 0]}> <sphereGeometry args={[0.12]} /> <meshStandardMaterial color="black" /> </mesh>
        </group>
        {/* Snout detail */}
         <mesh position={[0, -0.2, 0.9]}>
             <boxGeometry args={[0.6, 0.3, 0.2]} />
             <meshStandardMaterial color="#333" />
         </mesh>
      </group>

      {/* Tail */}
      <mesh ref={tailRef} position={[0, 0.5, -1.2]} rotation={[-0.8, 0, 0]}>
         <coneGeometry args={[0.3, 2.5, 16]} />
         <meshStandardMaterial map={texture} color={creature.color} />
      </mesh>
      
      {/* Spikes */}
      <mesh position={[0, 3, -0.5]} rotation={[-0.5, 0, 0]}>
          <coneGeometry args={[0.1, 0.5, 4]} />
          <meshStandardMaterial color="#fff" />
      </mesh>
       <mesh position={[0, 2.5, -0.8]} rotation={[-0.8, 0, 0]}>
          <coneGeometry args={[0.1, 0.5, 4]} />
          <meshStandardMaterial color="#fff" />
      </mesh>

      {/* Name Tag */}
      <Text position={[0, 4.5, 0]} fontSize={0.6} color="white" anchorX="center" anchorY="middle" outlineWidth={0.05}>
        {creature.name}
      </Text>
    </group>
  );
};

// --- PLAYER CHARACTER ---

export const KawaiPlayer: React.FC<{ position: THREE.Vector3, rotation: THREE.Euler, isMoving: boolean }> = ({ position, rotation, isMoving }) => {
  const group = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    if (group.current) {
      // Smooth lerp for position is handled in ThreeGame via ref mutation, 
      // but we follow the prop here for rendering geometry relative to the ref
      group.current.position.lerp(position, 0.4); 
      group.current.rotation.copy(rotation);

      const t = state.clock.getElapsedTime();
      const speed = 15;

      // Walking Animation
      if (isMoving) {
         if(leftLeg.current) leftLeg.current.rotation.x = Math.sin(t * speed) * 0.8;
         if(rightLeg.current) rightLeg.current.rotation.x = Math.cos(t * speed) * 0.8;
         
         // Arms swing opposite to legs
         if(leftArm.current) {
             leftArm.current.rotation.x = Math.cos(t * speed) * 0.7;
             leftArm.current.rotation.z = 0.3; 
         }
         if(rightArm.current) {
             rightArm.current.rotation.x = Math.sin(t * speed) * 0.7;
             rightArm.current.rotation.z = -0.3;
         }
      } else {
        // Reset limbs
        if(leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0, 0.1);
        if(rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, 0, 0.1);
        if(leftArm.current) {
            leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, 0, 0.1);
            leftArm.current.rotation.z = THREE.MathUtils.lerp(leftArm.current.rotation.z, 0.2, 0.1); // Idle pose
        } 
        if(rightArm.current) {
            rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, 0, 0.1);
            rightArm.current.rotation.z = THREE.MathUtils.lerp(rightArm.current.rotation.z, -0.2, 0.1); // Idle pose
        }
      }
    }
  });

  const skinColor = "#ffe0bd";
  const hairColor = "#ff69b4"; // Hot Pink
  const suitColor = "#f0f9ff"; // White/Light Blue
  const accentColor = "#db2777"; // Deep Pink
  const darkAccent = "#1e293b"; // Dark Blue/Grey

  return (
    <group ref={group}>
      {/* --- HEAD --- */}
      <group position={[0, 2.5, 0]}> {/* Taller stature */}
        <mesh castShadow>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.3} />
        </mesh>
        
        {/* Hair - Main Bun/Volume */}
        <mesh position={[0, 0.1, -0.1]}>
           <sphereGeometry args={[0.42, 32, 32, 0, Math.PI * 2, 0, Math.PI/1.8]} />
           <meshToonMaterial color={hairColor} />
        </mesh>
        
        {/* Long Ponytail */}
        <group position={[0, 0, -0.4]} rotation={[0.2, 0, 0]}>
            <mesh position={[0, -0.3, 0]}>
                <coneGeometry args={[0.25, 1.2, 32]} />
                <meshToonMaterial color={hairColor} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
                <torusGeometry args={[0.1, 0.05, 16, 32]} rotation={[Math.PI/2, 0, 0]}/>
                <meshStandardMaterial color={accentColor} />
            </mesh>
        </group>

        {/* Side Bangs */}
        <mesh position={[0.38, 0, 0.1]} rotation={[0, 0, -0.2]}>
           <capsuleGeometry args={[0.1, 0.6]} />
           <meshToonMaterial color={hairColor} />
        </mesh>
        <mesh position={[-0.38, 0, 0.1]} rotation={[0, 0, 0.2]}>
           <capsuleGeometry args={[0.1, 0.6]} />
           <meshToonMaterial color={hairColor} />
        </mesh>
        
        {/* Front Bangs */}
        <mesh position={[0, 0.35, 0.32]} rotation={[0.4, 0, 0]}>
            <capsuleGeometry args={[0.38, 0.2, 4, 8]} />
            <meshToonMaterial color={hairColor} />
        </mesh>

        {/* Face (Eyes) */}
        <group position={[0, 0, 0.35]}>
           <mesh position={[-0.14, 0, 0]} scale={[1, blink ? 0.1 : 1, 1]}>
             <capsuleGeometry args={[0.08, 0.11, 4, 8]} />
             <meshBasicMaterial color="#0f172a" />
           </mesh>
           {/* Eyelash Left */}
           <mesh position={[-0.24, 0.08, -0.02]} rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshBasicMaterial color="#0f172a" />
           </mesh>

           <mesh position={[0.14, 0, 0]} scale={[1, blink ? 0.1 : 1, 1]}>
             <capsuleGeometry args={[0.08, 0.11, 4, 8]} />
             <meshBasicMaterial color="#0f172a" />
           </mesh>
           {/* Eyelash Right */}
           <mesh position={[0.24, 0.08, -0.02]} rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.1, 0.02, 0.02]} />
              <meshBasicMaterial color="#0f172a" />
           </mesh>

           {/* Blush */}
           <mesh position={[-0.25, -0.15, -0.05]}>
              <circleGeometry args={[0.06]} />
              <meshBasicMaterial color="#fda4af" transparent opacity={0.6} />
           </mesh>
           <mesh position={[0.25, -0.15, -0.05]}>
              <circleGeometry args={[0.06]} />
              <meshBasicMaterial color="#fda4af" transparent opacity={0.6} />
           </mesh>
        </group>
      </group>

      {/* --- BODY (Space Suit) --- */}
      <group position={[0, 1.5, 0]}>
         {/* Neck */}
         <mesh position={[0, 0.65, 0]}>
             <cylinderGeometry args={[0.1, 0.1, 0.2]} />
             <meshStandardMaterial color={skinColor} />
         </mesh>

         {/* Upper Torso / Chest */}
         <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.18, 0.45]} />
            <meshStandardMaterial color={suitColor} />
         </mesh>
         
         {/* Chest Armor (Stylized) */}
         <group position={[0, 0.42, 0.15]} rotation={[0.2, 0, 0]}>
             <mesh position={[-0.08, 0, 0]}>
                 <sphereGeometry args={[0.14, 16, 16]} />
                 <meshStandardMaterial color={suitColor} roughness={0.4} />
             </mesh>
             <mesh position={[0.08, 0, 0]}>
                 <sphereGeometry args={[0.14, 16, 16]} />
                 <meshStandardMaterial color={suitColor} roughness={0.4} />
             </mesh>
             <mesh position={[0, 0.05, 0.1]}>
                 <boxGeometry args={[0.1, 0.1, 0.05]} />
                 <meshStandardMaterial color={accentColor} />
             </mesh>
         </group>

         {/* Waist */}
         <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.2]} />
            <meshStandardMaterial color={darkAccent} /> 
         </mesh>

         {/* Hips / Skirt */}
         <mesh position={[0, -0.2, 0]} castShadow>
             <cylinderGeometry args={[0.18, 0.4, 0.45]} />
             <meshStandardMaterial color={accentColor} side={THREE.DoubleSide} />
         </mesh>
         
         {/* Backpack (Jetpack) */}
         <group position={[0, 0.4, -0.2]}>
             <mesh>
                 <boxGeometry args={[0.3, 0.45, 0.15]} />
                 <meshStandardMaterial color="#94a3b8" />
             </mesh>
             <mesh position={[-0.1, -0.25, 0]}>
                 <cylinderGeometry args={[0.04, 0.06, 0.2]} />
                 <meshStandardMaterial color="#64748b" />
             </mesh>
             <mesh position={[0.1, -0.25, 0]}>
                 <cylinderGeometry args={[0.04, 0.06, 0.2]} />
                 <meshStandardMaterial color="#64748b" />
             </mesh>
         </group>
      </group>

      {/* --- LIMBS --- */}
      <group position={[0, 1.85, 0]}>
         {/* Arms - Slimmer */}
         <group position={[-0.24, 0, 0]} ref={leftArm}>
            <mesh position={[0, -0.25, 0]}>
               <capsuleGeometry args={[0.07, 0.6]} />
               <meshStandardMaterial color={suitColor} />
            </mesh>
            <mesh position={[0, -0.55, 0]}> {/* Glove */}
                <capsuleGeometry args={[0.075, 0.2]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>
         </group>
         
         <group position={[0.24, 0, 0]} ref={rightArm}>
            <mesh position={[0, -0.25, 0]}>
               <capsuleGeometry args={[0.07, 0.6]} />
               <meshStandardMaterial color={suitColor} />
            </mesh>
            <mesh position={[0, -0.55, 0]}> {/* Glove */}
                 <capsuleGeometry args={[0.075, 0.2]} />
                <meshStandardMaterial color={accentColor} />
            </mesh>
         </group>
      </group>

      <group position={[0, 1.1, 0]}>
         {/* Legs - Longer and shapelier boots */}
         <group position={[-0.12, 0, 0]} ref={leftLeg}>
            <mesh position={[0, -0.45, 0]}> {/* Leggings */}
               <capsuleGeometry args={[0.09, 0.9]} />
               <meshStandardMaterial color="#1e293b" /> 
            </mesh>
            <mesh position={[0, -0.8, 0.02]}> {/* High Boot */}
                <capsuleGeometry args={[0.1, 0.5]} /> 
                <meshStandardMaterial color="white" />
            </mesh>
             <mesh position={[0, -1.05, 0.08]}> {/* Foot */}
                <boxGeometry args={[0.12, 0.1, 0.25]} />
                <meshStandardMaterial color="white" />
            </mesh>
         </group>

         <group position={[0.12, 0, 0]} ref={rightLeg}>
             <mesh position={[0, -0.45, 0]}>
               <capsuleGeometry args={[0.09, 0.9]} />
               <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, -0.8, 0.02]}> {/* High Boot */}
                <capsuleGeometry args={[0.1, 0.5]} /> 
                <meshStandardMaterial color="white" />
            </mesh>
             <mesh position={[0, -1.05, 0.08]}> {/* Foot */}
                <boxGeometry args={[0.12, 0.1, 0.25]} />
                <meshStandardMaterial color="white" />
            </mesh>
         </group>
      </group>
    </group>
  );
};

// --- ENVIRONMENT OBJECTS ---

const StarField: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  const [stars1, stars2] = useMemo(() => {
    const generate = (count: number, radius: number) => {
        const arr = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            const r = radius + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            arr[i*3] = r * Math.sin(phi) * Math.cos(theta);
            arr[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            arr[i*3+2] = r * Math.cos(phi);
        }
        return arr;
    };
    // Two layers: Distant stars (white) and slightly closer dust/stars (cyan tint)
    return [generate(4000, 400), generate(2000, 250)];
  }, []);

  useFrame((state, delta) => {
      if (groupRef.current) {
          // Rotate the whole sky slowly
          groupRef.current.rotation.y += delta * 0.005;
      }
  });

  return (
    <group ref={groupRef}>
        {/* Distant stars */}
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={stars1.length / 3} array={stars1} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={2} color="#ffffff" transparent opacity={0.9} sizeAttenuation depthWrite={false} />
        </points>
        
        {/* Closer "Space Dust" Stars */}
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={stars2.length / 3} array={stars2} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={1.5} color="#a5f3fc" transparent opacity={0.6} sizeAttenuation depthWrite={false} />
        </points>
    </group>
  );
};

const Rock: React.FC<{ position: [number, number, number], scale: number | [number, number, number], rotation?: [number, number, number] }> = ({ position, scale, rotation = [0, 0, 0] }) => {
    const texture = useTexture(TEXTURE_URLS.rock);
    
    return (
        <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow name="climbable">
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial map={texture} color="#808080" roughness={0.9} />
        </mesh>
    );
};

const AlienTree: React.FC<{ position: [number, number, number], scale: number }> = ({ position, scale }) => {
    const texture = useTexture(TEXTURE_URLS.rock); 
    
    return (
        <group position={position} scale={scale}>
            <mesh position={[0, 2, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.5, 4, 6]} />
                <meshStandardMaterial map={texture} color="#5c4033" />
            </mesh>
            <mesh position={[0, 4, 0]}>
                <coneGeometry args={[1.5, 4, 8]} />
                <meshStandardMaterial color="#0d9488" roughness={0.8} />
            </mesh>
            <mesh position={[0, 5.5, 0]}>
                <coneGeometry args={[1.2, 3, 8]} />
                <meshStandardMaterial color="#2dd4bf" roughness={0.8} />
            </mesh>
        </group>
    );
};

export const GameWorld: React.FC = () => {
  // Procedural Generation
  const landscape = useMemo(() => {
    const trees = [];
    const rocks = [];
    
    // Dense Forest Generation
    for(let i=0; i<150; i++) {
        const r = 30 + Math.random() * 120; 
        const theta = Math.random() * Math.PI * 2;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        trees.push({ pos: [x, 0, z] as [number, number, number], scale: 0.8 + Math.random() * 1.2 });
    }

    // Large Rocks / Climbable Terrain
    for(let i=0; i<40; i++) {
        const r = 20 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);
        // Random rotation
        const rx = Math.random() * Math.PI;
        const ry = Math.random() * Math.PI;
        rocks.push({ 
            pos: [x, -0.5, z] as [number, number, number], 
            scale: [2 + Math.random()*5, 2 + Math.random()*3, 2 + Math.random()*5] as [number, number, number],
            rot: [rx, ry, 0] as [number, number, number]
        });
    }

    return { trees, rocks };
  }, []);

  const groundTexture = useTexture(TEXTURE_URLS.grass);
  
  useEffect(() => {
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(64, 64);
  }, [groundTexture]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[50, 100, 20]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Dark Space Void & Fog */}
      <fog attach="fog" args={['#0b0c15', 20, 140]} />
      <color attach="background" args={['#0b0c15']} />

      <StarField />

      {/* Main Ground - Tagged as walkable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]} name="walkable">
        <planeGeometry args={[400, 400, 64, 64]} />
        <meshStandardMaterial 
          map={groundTexture} 
          color="#4ade80"
          roughness={1}
        />
      </mesh>

      {landscape.trees.map((t, i) => (
          <AlienTree key={`tree-${i}`} position={t.pos} scale={t.scale} />
      ))}
      
      {landscape.rocks.map((r, i) => (
          <Rock key={`rock-${i}`} position={r.pos} scale={r.scale} rotation={r.rot} />
      ))}

      {/* Monolith Area */}
      <group position={[15, 0, 15]}>
         <mesh position={[0, 4, 0]} castShadow name="walkable">
            <boxGeometry args={[4, 8, 4]} />
            <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.5} />
         </mesh>
         <pointLight position={[0, 4, 0]} color="#0ea5e9" intensity={3} distance={20} />
         <Text position={[0, 9, 0]} fontSize={1} color="#fff" outlineWidth={0.05}>ANCIENT RELIC</Text>
      </group>
    </>
  );
};