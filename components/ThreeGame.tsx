import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GameWorld, SpaceDino, KawaiPlayer } from './WorldObjects';
import { ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Creature, GameState, Position } from '../types';

interface ThreeGameProps {
  onInteract: (target: Creature | 'MONOLITH') => void;
  gameState: GameState;
  creatures: Creature[];
  onPlayerMove: (pos: Position) => void;
}

const useKeyboard = () => {
  const [input, setInput] = useState({ forward: false, backward: false, left: false, right: false, interact: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': setInput(i => ({ ...i, forward: true })); break;
        case 'KeyS': case 'ArrowDown': setInput(i => ({ ...i, backward: true })); break;
        case 'KeyA': case 'ArrowLeft': setInput(i => ({ ...i, left: true })); break;
        case 'KeyD': case 'ArrowRight': setInput(i => ({ ...i, right: true })); break;
        case 'KeyE': setInput(i => ({ ...i, interact: true })); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': setInput(i => ({ ...i, forward: false })); break;
        case 'KeyS': case 'ArrowDown': setInput(i => ({ ...i, backward: false })); break;
        case 'KeyA': case 'ArrowLeft': setInput(i => ({ ...i, left: false })); break;
        case 'KeyD': case 'ArrowRight': setInput(i => ({ ...i, right: false })); break;
        case 'KeyE': setInput(i => ({ ...i, interact: false })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return input;
};

const GameScene: React.FC<{ 
  onInteract: ThreeGameProps['onInteract'], 
  gameState: GameState, 
  creatures: Creature[],
  onPlayerMove: (pos: Position) => void 
}> = ({ onInteract, gameState, creatures, onPlayerMove }) => {
  const input = useKeyboard();
  const playerPos = useRef(new THREE.Vector3(0, 5, 0)); // Start slightly in air
  const playerRot = useRef(new THREE.Euler(0, 0, 0));
  const { camera, scene } = useThree();
  const [isMoving, setIsMoving] = useState(false);
  
  const speed = 0.3;
  const rotationSpeed = 0.05;
  const lastInteractTime = useRef(0);
  const lastPosUpdate = useRef(0);
  
  // Physics / Climbing
  const raycaster = useRef(new THREE.Raycaster());
  const downVector = useRef(new THREE.Vector3(0, -1, 0));

  useFrame((state) => {
    if (gameState === GameState.INTERACTING) return;

    // 1. Calculate Candidate Position based on Input
    let moving = false;
    const direction = new THREE.Vector3();
    const candidatePos = playerPos.current.clone();
    
    if (input.forward) { direction.z -= 1; moving = true; }
    if (input.backward) { direction.z += 1; moving = true; }
    if (input.left) { playerRot.current.y += rotationSpeed; moving = true; }
    if (input.right) { playerRot.current.y -= rotationSpeed; moving = true; }

    if (moving) {
      direction.applyEuler(playerRot.current);
      direction.normalize().multiplyScalar(speed);
      candidatePos.add(direction);
      
      // Clamp to World Map Bounds
      candidatePos.x = THREE.MathUtils.clamp(candidatePos.x, -150, 150);
      candidatePos.z = THREE.MathUtils.clamp(candidatePos.z, -150, 150);
    }
    setIsMoving(moving);

    // 2. Vertical Collision & Climbing Check
    // Cast ray from sky downwards at the CANDIDATE position
    raycaster.current.set(new THREE.Vector3(candidatePos.x, 50, candidatePos.z), downVector.current);
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    let targetHeight = 0;
    let canMove = true;
    let isClimbing = false;

    // Find the highest valid surface (either walkable or climbable)
    const validHit = intersects.find(hit => 
        hit.object.name === 'walkable' || 
        hit.object.name === 'climbable' ||
        hit.object.parent?.name === 'walkable' ||
        hit.object.parent?.name === 'climbable'
    );

    if (validHit) {
        targetHeight = validHit.point.y;
        const objectTag = validHit.object.name || validHit.object.parent?.name;
        const heightDiff = targetHeight - playerPos.current.y;

        // Climbing / Blocking Logic
        // Rule: If height difference is large (> 1.2 units), it's an obstacle.
        // Exception: If it's tagged 'climbable' AND we are moving forward, we climb it.
        if (heightDiff > 1.2) {
             if (objectTag === 'climbable' && input.forward) {
                 canMove = true;
                 isClimbing = true;
             } else {
                 canMove = false; // Block movement (too steep / wall)
             }
        }
    } else {
        // No valid ground found? Treat as void (prevent movement or fall to 0)
        // For robustness, we default to 0 if we are "off map" but we clamped coords already.
        targetHeight = 0;
    }

    // 3. Apply Movement (X/Z)
    if (moving && canMove) {
        playerPos.current.x = candidatePos.x;
        playerPos.current.z = candidatePos.z;
    }

    // 4. Apply Height (Y) - Smooth Transition
    const lerpSpeed = isClimbing ? 0.1 : 0.25; // Slower lerp when climbing for weight
    playerPos.current.y = THREE.MathUtils.lerp(playerPos.current.y, targetHeight, lerpSpeed);

    // 5. Report Position
    if (state.clock.elapsedTime - lastPosUpdate.current > 0.1) {
        onPlayerMove({ x: playerPos.current.x, y: playerPos.current.y, z: playerPos.current.z });
        lastPosUpdate.current = state.clock.elapsedTime;
    }

    // 6. Camera Follow
    const camOffset = new THREE.Vector3(0, 6, 12);
    camOffset.applyEuler(playerRot.current);
    const camTarget = playerPos.current.clone().add(camOffset);
    
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(playerPos.current.clone().add(new THREE.Vector3(0, 2.5, 0)));

    // 7. Interaction Logic
    if (input.interact && state.clock.elapsedTime - lastInteractTime.current > 1) {
      for (const c of creatures) {
        const dist = Math.hypot(c.position.x - playerPos.current.x, c.position.z - playerPos.current.z);
        if (dist < 5) {
          onInteract(c);
          lastInteractTime.current = state.clock.elapsedTime;
          return;
        }
      }
      const monolithDist = Math.hypot(15 - playerPos.current.x, 15 - playerPos.current.z);
      if (monolithDist < 8) {
          onInteract('MONOLITH');
          lastInteractTime.current = state.clock.elapsedTime;
      }
    }
  });

  return (
    <Suspense fallback={null}>
      <Environment preset="night" />
      
      <GameWorld />
      <KawaiPlayer position={playerPos.current} rotation={playerRot.current} isMoving={isMoving} />
      
      {creatures.map(c => (
        <SpaceDino key={c.id} creature={c} />
      ))}

      <ContactShadows 
        opacity={0.6} 
        scale={80} 
        blur={3} 
        far={20} 
        resolution={512} 
        color="#000000" 
      />
    </Suspense>
  );
};

export const ThreeGame: React.FC<ThreeGameProps> = (props) => {
  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 55 }} dpr={[1, 1.5]}> 
        <GameScene {...props} />
      </Canvas>
    </div>
  );
};