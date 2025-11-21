import React, { useState, useEffect } from 'react';
import { GameState, Position, Creature, LoreEntry, Language } from '../types';
import { Loader2, MessageCircle, Sparkles, Map, Compass, Book, X, Scroll, Globe } from 'lucide-react';

interface GameUIProps {
  gameState: GameState;
  interactionText: string | null;
  isLoading: boolean;
  onCloseInteraction: () => void;
  playerPos: Position;
  creatures: Creature[];
  loreLog: LoreEntry[];
  flashTrigger: number;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const TRANSLATIONS = {
  en: {
    title: "Kawai Space Odyssey",
    system: "System: Planet Pastel-Prime",
    journal: "Journal",
    controls: "Controls",
    move: "Move",
    interact: "Interact",
    noLore: "No discoveries yet. Explore the world!",
    discovered: "Discovered",
    loading: "Decoding Alien Signal...",
    continue: "Continue Journey",
    history: "HISTORY",
    biology: "BIOLOGY"
  },
  uk: {
    title: "Кавай Одіссея",
    system: "Система: Планета Пастель-Прайм",
    journal: "Журнал",
    controls: "Керування",
    move: "Рух",
    interact: "Дія",
    noLore: "Відкриттів ще немає. Досліджуй світ!",
    discovered: "Виявлено",
    loading: "Декодування сигналу...",
    continue: "Продовжити",
    history: "ІСТОРІЯ",
    biology: "БІОЛОГІЯ"
  }
};

const MiniMap: React.FC<{ playerPos: Position; creatures: Creature[] }> = ({ playerPos, creatures }) => {
  const mapSize = 140; // Pixels
  const range = 50; // World units radius shown in map
  const monolithPos = { x: 15, z: 15 }; 

  const getMapStyle = (worldX: number, worldZ: number) => {
    const dx = worldX - playerPos.x;
    const dz = worldZ - playerPos.z;
    const nx = dx / range;
    const nz = dz / range;
    const dist = Math.sqrt(nx*nx + nz*nz);
    
    return {
        left: `${50 + nx * 50}%`,
        top: `${50 + nz * 50}%`,
        opacity: dist > 1 ? 0 : 1,
        transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-lg border-2 border-pink-400 rounded-full shadow-2xl overflow-hidden pointer-events-auto" style={{ width: mapSize, height: mapSize }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white/80 text-[10px] font-bold z-10">N</div>
      <div className="absolute w-4 h-4 bg-cyan-400 rotate-45 shadow-[0_0_10px_#22d3ee] border border-white transition-all duration-200" style={getMapStyle(monolithPos.x, monolithPos.z)} />
      {creatures.map(c => (
          <div key={c.id} className="absolute w-2.5 h-2.5 rounded-full border border-white/50 transition-all duration-200" style={{ backgroundColor: c.color, ...getMapStyle(c.position.x, c.position.z) }} />
      ))}
      <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] transform -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-pink-500" />
    </div>
  );
};

const JournalModal: React.FC<{ loreLog: LoreEntry[]; onClose: () => void; t: any }> = ({ loreLog, onClose, t }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/70 backdrop-blur-md z-50 animate-in fade-in duration-200">
      <div className="bg-[#fdf2f8] w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-pink-300">
        <div className="bg-pink-400 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3 text-white">
            <Book className="w-8 h-8" />
            <h2 className="text-2xl font-bold font-serif">{t.journal}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-pink-500 rounded-full transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loreLog.length === 0 ? (
            <div className="text-center text-gray-400 mt-20 flex flex-col items-center gap-4">
               <Scroll className="w-16 h-16 opacity-30" />
               <p>{t.noLore}</p>
            </div>
          ) : (
            loreLog.map((entry) => (
              <div key={entry.id} className="bg-white p-5 rounded-xl shadow-sm border border-pink-100 hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-pink-600">{entry.title}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${entry.type === 'HISTORY' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                      {entry.type === 'HISTORY' ? t.history : t.biology}
                    </span>
                 </div>
                 <p className="text-gray-600 text-sm leading-relaxed italic">"{entry.content}"</p>
                 <div className="text-right mt-2 text-[10px] text-gray-400">
                    {t.discovered}: {new Date(entry.timestamp).toLocaleTimeString()}
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const GameUI: React.FC<GameUIProps> = ({ 
  gameState, 
  interactionText, 
  isLoading,
  onCloseInteraction,
  playerPos,
  creatures,
  loreLog,
  flashTrigger,
  language,
  setLanguage
}) => {
  const [showJournal, setShowJournal] = useState(false);
  const [flashOpacity, setFlashOpacity] = useState(0);
  
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (flashTrigger > 0) {
        setFlashOpacity(1);
        const timer = setTimeout(() => setFlashOpacity(0), 50);
        return () => clearTimeout(timer);
    }
  }, [flashTrigger]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      <div className="fixed inset-0 bg-white z-[100] pointer-events-none transition-opacity ease-out duration-700" style={{ opacity: flashOpacity }} />

      {/* Top HUD */}
      <div className="flex justify-between items-start pointer-events-auto w-full">
        <div className="bg-pink-500/80 backdrop-blur-md p-4 rounded-2xl border-2 border-white shadow-lg text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            {t.title}
          </h1>
          <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
            <Map className="w-3 h-3" /> {t.system}
          </p>
        </div>

        <div className="flex gap-4 items-start">
            {/* Language Switcher */}
            <button 
                onClick={() => setLanguage(language === 'en' ? 'uk' : 'en')}
                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl border border-white/30 shadow-lg backdrop-blur-md transition-all flex items-center gap-2 font-bold"
            >
                <Globe className="w-5 h-5" />
                {language.toUpperCase()}
            </button>

            {/* Journal Button */}
            <button 
              onClick={() => setShowJournal(true)}
              className="bg-purple-600/90 hover:bg-purple-500 text-white p-3 rounded-xl border border-white/30 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
                <Book className="w-5 h-5" />
                <span className="hidden md:inline font-bold text-sm">{t.journal} ({loreLog.length})</span>
            </button>

            {/* Controls */}
            <div className="bg-blue-600/80 backdrop-blur-md p-3 rounded-xl border border-white text-white text-sm shadow-lg flex flex-col items-end">
                <div className="flex items-center gap-2 mb-2 text-blue-100 font-mono text-xs">
                    <Compass className="w-4 h-4" /> 
                    {Math.round(playerPos.x)}, {Math.round(playerPos.z)}
                </div>
                <p className="font-bold mb-1 border-b border-white/30 pb-1 w-full text-right">{t.controls}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-right">
                    <span>{t.move}</span> <span>WASD</span>
                    <span>{t.interact}</span> <span>E</span>
                </div>
            </div>
        </div>
      </div>
      
      <MiniMap playerPos={playerPos} creatures={creatures} />

      {showJournal && <JournalModal loreLog={loreLog} onClose={() => setShowJournal(false)} t={t} />}

      {(gameState === GameState.INTERACTING || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm transition-all duration-300 z-40">
          <div className="bg-white/95 p-8 rounded-[2rem] max-w-lg w-full shadow-2xl border-4 border-pink-400 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-6">
              {isLoading ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-pink-300 rounded-full blur-lg opacity-50 animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-pink-500 animate-spin relative z-10" />
                  </div>
                  <p className="text-pink-600 font-bold text-lg animate-pulse">{t.loading}</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <MessageCircle className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 w-full">
                    <p className="text-gray-800 text-lg leading-relaxed font-medium font-serif italic">
                      "{interactionText}"
                    </p>
                  </div>
                  <button 
                    onClick={onCloseInteraction}
                    className="mt-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-10 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform"
                  >
                    {t.continue}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};