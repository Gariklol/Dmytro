import React, { useState, useEffect, useCallback } from 'react';
import { ThreeGame } from './components/ThreeGame';
import { GameUI } from './components/GameUI';
import { GameState, Creature, Position, LoreEntry, Language } from './types';
import * as geminiService from './services/geminiService';

const CREATURES: Creature[] = [
  { id: '1', type: 'DINO', position: { x: -10, y: 0, z: -10 }, color: '#84cc16', scale: 1.5, name: 'Rexy', personality: 'Hungry but friendly' },
  { id: '2', type: 'ALIEN_CAT', position: { x: 5, y: 0, z: -15 }, color: '#22d3ee', scale: 1, name: 'GlipGlop', personality: 'Philosopher' },
  { id: '3', type: 'DINO', position: { x: -5, y: 0, z: 10 }, color: '#fb923c', scale: 2, name: 'Donk', personality: 'Sleepy' },
  { id: '4', type: 'FLOATING_JELLY', position: { x: 8, y: 0, z: 8 }, color: '#a78bfa', scale: 1.2, name: 'Jellie', personality: 'Hyperactive' },
  { id: '5', type: 'DINO', position: { x: 25, y: 0, z: 5 }, color: '#f43f5e', scale: 1.8, name: 'Spike', personality: 'Tough guy' },
  { id: '6', type: 'ALIEN_CAT', position: { x: -20, y: 0, z: 20 }, color: '#facc15', scale: 0.9, name: 'MewMew', personality: 'Curious' },
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const [interactionText, setInteractionText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [flashTrigger, setFlashTrigger] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('en');
  
  // Lore / Journal State
  const [loreLog, setLoreLog] = useState<LoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kawai_dino_lore');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('kawai_dino_lore', JSON.stringify(loreLog));
  }, [loreLog]);

  const addLoreEntry = (entry: Omit<LoreEntry, 'id' | 'timestamp'>) => {
    setLoreLog(prev => {
      if (prev.some(e => e.title === entry.title)) return prev;
      return [{
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      }, ...prev];
    });
  };

  // Initial Welcome
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setGameState(GameState.INTERACTING);
      const intro = await geminiService.generateIntro(language);
      setInteractionText(intro);
      setIsLoading(false);
    };
    init();
  }, []); // Runs once on mount. To support language switch re-intro, we'd need more logic, but let's keep simple.

  const handleInteract = useCallback(async (target: Creature | 'MONOLITH') => {
    setFlashTrigger(Date.now());
    setGameState(GameState.INTERACTING);
    setIsLoading(true);
    setInteractionText(null);

    if (target === 'MONOLITH') {
        // Monolith Interaction
        const lore = await geminiService.generateLore('The Great Cataclysm of Pastel-Prime', 'HISTORY', language);
        setInteractionText(lore.content);
        addLoreEntry({
          title: lore.title,
          content: lore.content,
          type: 'HISTORY'
        });
    } else {
        // Creature Interaction
        const dialogue = await geminiService.interactWithCreature(target.type, target.name, language);
        setInteractionText(dialogue);

        const hasLore = loreLog.some(l => l.title.includes(target.name));
        
        if (!hasLore) {
           geminiService.generateLore(target.name, 'BIOLOGY', language).then(lore => {
             addLoreEntry({
               title: lore.title,
               content: lore.content,
               type: 'BIOLOGY'
             });
           });
        }
    }

    setIsLoading(false);
  }, [loreLog, language]);

  const closeInteraction = () => {
    setGameState(GameState.PLAYING);
    setInteractionText(null);
  };

  const handlePlayerMove = useCallback((pos: Position) => {
    setPlayerPos(pos);
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      <ThreeGame 
        onInteract={handleInteract} 
        gameState={gameState} 
        creatures={CREATURES}
        onPlayerMove={handlePlayerMove}
      />
      <GameUI 
        gameState={gameState} 
        interactionText={interactionText} 
        isLoading={isLoading}
        onCloseInteraction={closeInteraction}
        playerPos={playerPos}
        creatures={CREATURES}
        loreLog={loreLog}
        flashTrigger={flashTrigger}
        language={language}
        setLanguage={setLanguage}
      />
    </div>
  );
};

export default App;