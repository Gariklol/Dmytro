export enum GameState {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  INTERACTING = 'INTERACTING'
}

export type Language = 'en' | 'uk';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Creature {
  id: string;
  type: 'DINO' | 'ALIEN_CAT' | 'FLOATING_JELLY';
  position: Position;
  color: string;
  scale: number;
  name: string;
  personality: string;
}

export interface InteractionResult {
  speaker: string;
  text: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  type: 'HISTORY' | 'BIOLOGY';
}