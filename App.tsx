import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings, Info, Skull, Shuffle, Wand2, Download, UserPlus, Users, Trash2, Trophy, Edit2, Share, PlusSquare, X } from 'lucide-react';
import { GameState, Deck, Player } from './types';
import { STATIC_DECKS, AI_DECK, COLORS } from './constants';
import { GameScreen } from './components/GameScreen';
import { generateDeck } from './services/geminiService';

// Audio URL para "Victory/Champions" (Sonido genérico de fanfarria deportiva para evitar copyright directo de Queen, pero cumple el propósito)
const VICTORY_SOUND_URL = "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e2.mp3"; 

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Player Management
  const [players, setPlayers] = useState<Player[]>([{ id: 1, name: '', score: 0, correct: [], skipped: [] }]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  
  // Deck & Game Data
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom AI Topic State
  const [customTopic, setCustomTopic] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIosInstall, setShowIosInstall] = useState(false);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1. Android Install Prompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 2. iOS Detection logic
    // Detects if device is iOS and not in standalone mode (browser)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setShowIosInstall(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  // --------------------------------------------------------------------------
  // PLAYER MANAGEMENT
  // --------------------------------------------------------------------------
  const addPlayer = () => {
    if (players.length >= 10) return;
    setPlayers([...players, { id: Date.now(), name: '', score: 0, correct: [], skipped: [] }]);
  };

  const removePlayer = (id: number) => {
    if (players.length <= 1) return;
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayerName = (id: number, name: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  // --------------------------------------------------------------------------
  // GAME FLOW
  // --------------------------------------------------------------------------

  const handleDeckSelect = (deck: Deck) => {
    setSelectedDeck(deck);
    if (deck.isGenerative) {
      setShowAiInput(true);
    } else {
      setGameState('SETUP'); // Ir a pantalla de agregar jugadores
    }
  };

  const handleAiDeckConfirm = () => {
    setShowAiInput(false);
    setGameState('SETUP');
  };

  const initGame = async () => {
    if (!selectedDeck) return;

    // Validate names: fill empty ones with "Jugador N"
    const validatedPlayers = players.map((p, idx) => ({
      ...p,
      name: p.name.trim() || `Jugador ${idx + 1}`
    }));
    setPlayers(validatedPlayers);

    setIsLoading(true);
    
    // Generar o Cargar Palabras
    let words: string[] = [];
    if (selectedDeck.isGenerative) {
      const topic = customTopic || "Cosas Chilangas Random";
      words = await generateDeck(topic);
    } else {
      words = [...(selectedDeck.words || [])].sort(() => 0.5 - Math.random());
    }

    if (words.length > 0) {
      setActiveWords(words);
      setCurrentPlayerIndex(0);
      // Reset scores but keep names
      setPlayers(validatedPlayers.map(p => ({ ...p, score: 0, correct: [], skipped: [] })));
      setGameState('PLAYING');
    } else {
      alert("Hubo un error cargando las palabras. Intenta de nuevo.");
    }
    setIsLoading(false);
  };

  const handleTurnEnd = (correct: string[], skipped: string[]) => {
    // Save stats for current player
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      score: correct.length,
      correct,
      skipped
    };
    setPlayers(updatedPlayers);
    setGameState('TURN_SUMMARY');
  };

  const nextTurn = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      // Re-shuffle words for next player so they don't get exact same order if possible, 
      // or just reset pointer? Let's re-shuffle the full deck for fairness/randomness
      setActiveWords([...activeWords].sort(() => 0.5 - Math.random())); 
      setGameState('PLAYING');
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    setGameState('SCORE');
    // Play Victory Sound
    if (!audioRef.current) {
      audioRef.current = new Audio(VICTORY_SOUND_URL);
    }
    audioRef.current.volume = 0.5;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio play failed interaction", e));
    
    // Stop audio after 10 seconds
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }, 10000);
  };

  const resetGame = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setGameState('MENU');
    setCustomTopic('');
    setShowAiInput(false);
    // Keep players list for convenience, but scores reset on init
  };

  // --------------------------------------------------------------------------
  // RENDER: MENU
  // --------------------------------------------------------------------------
  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-neutral-900 overflow-y-auto pb-24">
        <header className="p-6 text-center relative overflow-hidden bg-gradient-to-b from-purple-900 to-neutral-900 border-b border-white/10">
          <div className="relative z-10">
             <h1 className="text-5xl md:text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300 drop-shadow-sm transform -rotate-2">
               ¡ADIVINA<br/>GÜEY!
             </h1>
             <p className="text-gray-300 mt-2 font-bold text-lg">Edición Chilanga 🇲🇽</p>
             
             {/* ANDROID INSTALL BUTTON */}
             {installPrompt && (
               <button onClick={handleInstallClick} className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 mx-auto border border-white/20 transition-all">
                 <Download size={16} /> INSTALAR APP
               </button>
             )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-4 md:p-8">
          <h2 className="text-2xl font-display text-white mb-6 text-center">Selecciona un Deck</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STATIC_DECKS.map((deck) => (
              <button key={deck.id} onClick={() => handleDeckSelect(deck)} disabled={isLoading} className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-white/20 shadow-xl ${deck.color}`}>
                <div className="flex justify-between items-start">
                  <span className="text-4xl shadow-sm">{deck.emoji}</span>
                  <Play className="text-white/80 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold font-display text-white mt-4 uppercase tracking-wide">{deck.title}</h3>
                <p className="text-white/80 text-sm font-medium mt-1 leading-tight">{deck.description}</p>
              </button>
            ))}
            <button onClick={() => setShowAiInput(true)} className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-white/20 shadow-xl ${AI_DECK.color}`}>
              <div className="flex justify-between items-start">
                  <span className="text-4xl shadow-sm">{AI_DECK.emoji}</span>
                  <Wand2 className="text-white/80 group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold font-display text-white mt-4 uppercase tracking-wide">{AI_DECK.title}</h3>
               <p className="text-white/80 text-sm font-medium mt-1 leading-tight">{AI_DECK.description}</p>
            </button>
          </div>
        </main>

        {/* AI Input Modal */}
        {showAiInput && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-display text-white mb-4 text-center">Crea tu propio tema</h3>
              <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Ej: Telenovelas de los 90s..." className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-4 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowAiInput(false)} className="flex-1 bg-neutral-700 text-white font-bold py-3 rounded-xl">Cancelar</button>
                <button onClick={() => { setSelectedDeck(AI_DECK); handleAiDeckConfirm(); }} disabled={!customTopic.trim()} className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold py-3 rounded-xl">Continuar</button>
              </div>
            </div>
          </div>
        )}

        {/* iOS Install Instruction Modal */}
        {showIosInstall && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-800 border-t border-white/20 z-50 animate-pop">
            <div className="flex justify-between items-start mb-2">
               <h3 className="text-white font-bold text-lg">Instalar en iPhone / iPad</h3>
               <button onClick={() => setShowIosInstall(false)} className="text-white/50 p-1"><X size={20}/></button>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-300">
               <div className="flex flex-col gap-2">
                 <p className="flex items-center gap-2">1. Toca el botón <Share size={16} className="text-blue-400" /></p>
                 <p className="flex items-center gap-2">2. Selecciona <span className="text-white font-bold flex items-center gap-1"><PlusSquare size={16} /> Agregar a Inicio</span></p>
               </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SETUP PLAYERS
  // --------------------------------------------------------------------------
  if (gameState === 'SETUP') {
    return (
      <div className="min-h-screen bg-neutral-900 p-4 flex flex-col">
        <h2 className="text-4xl font-display text-center text-white mt-8 mb-2">Participantes</h2>
        <p className="text-center text-white/50 mb-8">Ingresa los nombres de los jugadores</p>

        <div className="flex-1 max-w-md mx-auto w-full flex flex-col gap-3">
          {players.map((p, idx) => (
             <div key={p.id} className="bg-neutral-800 p-2 pl-4 rounded-xl flex items-center justify-between border border-white/10 animate-pop focus-within:border-pink-500 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                   <div className="bg-pink-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0">
                     {idx + 1}
                   </div>
                   <input 
                     type="text" 
                     value={p.name}
                     onChange={(e) => updatePlayerName(p.id, e.target.value)}
                     placeholder={`Jugador ${idx + 1}`}
                     className="bg-transparent border-none text-white font-bold text-lg w-full focus:outline-none placeholder-white/20"
                     autoFocus={players.length > 1 && idx === players.length - 1} // Auto focus on new fields
                   />
                </div>
                {players.length > 1 && (
                  <button onClick={() => removePlayer(p.id)} className="text-white/20 p-3 hover:text-red-400 transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
             </div>
          ))}

          {players.length < 10 && (
            <button 
              onClick={addPlayer}
              className="mt-2 border-2 border-dashed border-white/20 rounded-xl p-4 text-white/50 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <UserPlus size={20} /> Agregar otro jugador
            </button>
          )}
        </div>

        <div className="p-4 mt-4">
           <button 
             onClick={initGame}
             disabled={isLoading}
             className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-display text-2xl py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform uppercase tracking-widest flex items-center justify-center gap-3"
           >
             {isLoading ? 'Cargando...' : '¡A Jugar!'} <Play fill="currentColor" />
           </button>
           <button onClick={() => setGameState('MENU')} className="w-full text-white/50 mt-4 font-bold text-sm">Cancelar</button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: PLAYING
  // --------------------------------------------------------------------------
  if (gameState === 'PLAYING') {
    return (
      <GameScreen 
        words={activeWords} 
        duration={60} 
        playerName={players[currentPlayerIndex].name}
        onEndGame={handleTurnEnd} 
        onExit={resetGame}
      />
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: TURN SUMMARY
  // --------------------------------------------------------------------------
  if (gameState === 'TURN_SUMMARY') {
    const currentPlayer = players[currentPlayerIndex];
    const isLastPlayer = currentPlayerIndex === players.length - 1;

    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-white/60 font-bold text-xl uppercase tracking-widest mb-4">Resultado de</h2>
        <h1 className="text-5xl font-display text-white mb-8">{currentPlayer.name}</h1>

        <div className="text-8xl font-display text-green-400 mb-2">{currentPlayer.score}</div>
        <p className="text-white mb-12">Puntos</p>

        <button 
          onClick={nextTurn}
          className="w-full max-w-sm bg-white text-black font-display text-2xl py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-colors uppercase tracking-widest"
        >
          {isLastPlayer ? 'Ver Resultados Finales' : `Siguiente: ${players[currentPlayerIndex + 1].name}`}
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: FINAL SCORE (PODIUM)
  // --------------------------------------------------------------------------
  if (gameState === 'SCORE') {
    // Sort players by score
    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = rankedPlayers[0];

    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col overflow-y-auto">
        <div className="p-6 text-center mt-8">
           <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
           <h1 className="text-5xl font-display text-white mb-2">¡CAMPEONES!</h1>
           <p className="text-white/50 font-bold">We Are The Champions 🎵</p>
        </div>

        <div className="flex-1 max-w-md mx-auto w-full px-4 flex flex-col gap-4">
          
          {/* Winner */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500 rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded-bl-lg">1er Lugar</div>
             <div className="text-4xl">👑</div>
             <div className="flex-1">
               <h3 className="text-2xl font-bold text-yellow-100">{winner.name}</h3>
               <p className="text-yellow-200/60 font-bold">{winner.score} Puntos</p>
             </div>
          </div>

          {/* 2nd Place */}
          {rankedPlayers[1] && (
            <div className="bg-neutral-800 border border-gray-400 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-gray-400 text-black font-bold w-8 h-8 rounded-full flex items-center justify-center">2</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{rankedPlayers[1].name}</h3>
                <p className="text-white/60 font-bold">{rankedPlayers[1].score} Puntos</p>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {rankedPlayers[2] && (
            <div className="bg-neutral-800 border border-orange-700 rounded-xl p-4 flex items-center gap-4">
              <div className="bg-orange-700 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center">3</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{rankedPlayers[2].name}</h3>
                <p className="text-white/60 font-bold">{rankedPlayers[2].score} Puntos</p>
              </div>
            </div>
          )}

          {/* Others */}
          {rankedPlayers.slice(3).map((p, i) => (
             <div key={p.id} className="bg-neutral-900/50 p-3 rounded-lg flex justify-between items-center text-white/50">
               <span>{i + 4}. {p.name}</span>
               <span>{p.score} pts</span>
             </div>
          ))}

        </div>

        <div className="p-6 mt-8">
           <button 
             onClick={resetGame}
             className="w-full bg-white text-black font-display text-2xl py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-colors uppercase tracking-widest"
           >
             Menú Principal
           </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;