import React, { useState, useEffect } from 'react';
import { Play, Wand2, Download, RotateCcw, Home } from 'lucide-react';
import { GameState, Deck } from './types';
import { STATIC_DECKS, AI_DECK } from './constants';
import { GameScreen } from './components/GameScreen';
import { generateDeck } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Game Data
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [results, setResults] = useState<{correct: string[], skipped: string[]}>({correct: [], skipped: []});
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom AI Topic State
  const [customTopic, setCustomTopic] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
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
  // GAME FLOW
  // --------------------------------------------------------------------------

  const handleDeckSelect = async (deck: Deck) => {
    setSelectedDeck(deck);
    if (deck.isGenerative) {
      setShowAiInput(true);
    } else {
      startLoading(deck.words || []);
    }
  };

  const handleAiDeckConfirm = async () => {
    setShowAiInput(false);
    setIsLoading(true);
    const topic = customTopic || "Cosas Chilangas Random";
    const words = await generateDeck(topic);
    setIsLoading(false);
    
    if (words.length > 0) {
      startLoading(words);
    } else {
      alert("Error al conectar con la IA. Intenta de nuevo.");
    }
  };

  const startLoading = (words: string[]) => {
    // Mezclar palabras
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    setActiveWords(shuffled);
    setGameState('PLAYING');
  };

  const handleGameEnd = (correct: string[], skipped: string[]) => {
    setResults({ correct, skipped });
    setGameState('SUMMARY');
  };

  const resetGame = () => {
    setGameState('MENU');
    setCustomTopic('');
    setResults({correct: [], skipped: []});
  };

  // --------------------------------------------------------------------------
  // RENDER: MENU
  // --------------------------------------------------------------------------
  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-neutral-900 overflow-y-auto pb-24">
        {isLoading && (
          <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white p-4 text-center">
            <div className="animate-spin text-5xl mb-4">🌮</div>
            <h2 className="text-2xl font-display">Cocinando palabras...</h2>
          </div>
        )}

        <header className="p-6 text-center relative overflow-hidden bg-gradient-to-b from-purple-900 to-neutral-900 border-b border-white/10">
          <div className="relative z-10">
             <h1 className="text-5xl md:text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300 drop-shadow-sm transform -rotate-2">
               ¡ADIVINA<br/>GÜEY!
             </h1>
             <p className="text-gray-300 mt-2 font-bold text-lg">Edición Chilanga 🇲🇽</p>
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
              <button key={deck.id} onClick={() => handleDeckSelect(deck)} className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-white/20 shadow-xl ${deck.color}`}>
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

        <footer className="w-full text-center py-6 text-white/30 font-bold text-sm">
          Juego creado por Juan Carlos Garfias
        </footer>

        {/* AI Input Modal */}
        {showAiInput && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-display text-white mb-4 text-center">Crea tu propio tema</h3>
              <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Ej: Telenovelas de los 90s..." className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-4 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowAiInput(false)} className="flex-1 bg-neutral-700 text-white font-bold py-3 rounded-xl">Cancelar</button>
                <button onClick={handleAiDeckConfirm} disabled={!customTopic.trim()} className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold py-3 rounded-xl">Continuar</button>
              </div>
            </div>
          </div>
        )}
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
        playerName="" // No player names in single mode
        onEndGame={handleGameEnd} 
        onExit={resetGame}
      />
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: SUMMARY
  // --------------------------------------------------------------------------
  if (gameState === 'SUMMARY') {
    const score = results.correct.length;
    
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col p-6 text-center overflow-y-auto">
        <div className="mt-8 mb-8">
           <h2 className="text-white/60 font-bold text-xl uppercase tracking-widest mb-2">¡Tiempo Fuera!</h2>
           <h1 className="text-8xl font-display text-green-400 drop-shadow-lg">{score}</h1>
           <p className="text-white text-lg">Aciertos</p>
        </div>

        <div className="flex-1 w-full max-w-md mx-auto bg-white/5 rounded-xl p-4 overflow-y-auto mb-6">
           {results.correct.length > 0 && (
             <div className="mb-4">
               <h3 className="text-green-400 font-bold mb-2 text-left">Adivinadas:</h3>
               <div className="flex flex-wrap gap-2">
                 {results.correct.map((w, i) => (
                   <span key={i} className="bg-green-500/20 text-green-200 px-2 py-1 rounded text-sm">{w}</span>
                 ))}
               </div>
             </div>
           )}
           {results.skipped.length > 0 && (
             <div>
               <h3 className="text-red-400 font-bold mb-2 text-left">Pasadas:</h3>
               <div className="flex flex-wrap gap-2">
                 {results.skipped.map((w, i) => (
                   <span key={i} className="bg-red-500/20 text-red-200 px-2 py-1 rounded text-sm">{w}</span>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="flex gap-4 max-w-md mx-auto w-full">
           <button onClick={() => { startLoading(activeWords) }} className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2">
             <RotateCcw size={20} /> Otra vez
           </button>
           <button onClick={resetGame} className="flex-1 bg-neutral-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
             <Home size={20} /> Salir
           </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;