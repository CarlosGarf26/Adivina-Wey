import React, { useState, useEffect } from 'react';
import { Play, Settings, Info, Skull, Shuffle, Wand2, Download } from 'lucide-react';
import { GameState, Deck } from './types';
import { STATIC_DECKS, AI_DECK, COLORS } from './constants';
import { GameScreen } from './components/GameScreen';
import { generateDeck } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [activeWords, setActiveWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Game Results
  const [results, setResults] = useState<{correct: string[], skipped: string[]} | null>(null);

  // Custom AI Topic State
  const [customTopic, setCustomTopic] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Escuchar evento para instalar la app (Solo Android/Chrome Desktop)
    const handler = (e: any) => {
      e.preventDefault(); // Prevenir que Chrome muestre el banner automático feo
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
        console.log('Usuario aceptó instalar la app');
        setInstallPrompt(null);
      }
    });
  };

  const startGame = async (deck: Deck, customTopicInput?: string) => {
    setIsLoading(true);
    setSelectedDeck(deck);
    
    let words: string[] = [];

    if (deck.isGenerative) {
      const topic = customTopicInput || "Cosas Chilangas Random";
      words = await generateDeck(topic);
    } else {
      // Shuffle static words
      words = [...(deck.words || [])].sort(() => 0.5 - Math.random());
    }

    if (words.length > 0) {
      setActiveWords(words);
      setGameState('PLAYING');
    } else {
      alert("Hubo un error cargando las palabras. Intenta de nuevo.");
    }
    
    setIsLoading(false);
  };

  const handleEndGame = (correct: string[], skipped: string[]) => {
    setResults({ correct, skipped });
    setGameState('SCORE');
  };

  const resetGame = () => {
    setGameState('MENU');
    setResults(null);
    setCustomTopic('');
    setShowAiInput(false);
  };

  // --------------------------------------------------------------------------
  // MENU RENDER
  // --------------------------------------------------------------------------
  if (gameState === 'MENU') {
    return (
      <div className="min-h-screen bg-neutral-900 overflow-y-auto pb-24">
        
        {/* Header */}
        <header className="p-6 text-center relative overflow-hidden bg-gradient-to-b from-purple-900 to-neutral-900 border-b border-white/10">
          <div className="relative z-10">
             <h1 className="text-5xl md:text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-300 drop-shadow-sm transform -rotate-2">
               ¡ADIVINA<br/>GÜEY!
             </h1>
             <p className="text-gray-300 mt-2 font-bold text-lg">Edición Chilanga 🇲🇽</p>
             
             {/* PWA Install Button (Only visible if supported/triggered) */}
             {installPrompt && (
               <button 
                 onClick={handleInstallClick}
                 className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 mx-auto border border-white/20 transition-all"
               >
                 <Download size={16} />
                 INSTALAR APP
               </button>
             )}
          </div>
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-pink-600 rounded-full blur-3xl opacity-20 -translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 translate-x-10 translate-y-10"></div>
        </header>

        {/* Deck Selection */}
        <main className="max-w-4xl mx-auto p-4 md:p-8">
          <h2 className="text-2xl font-display text-white mb-6 text-center">Selecciona un Deck</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Static Decks */}
            {STATIC_DECKS.map((deck) => (
              <button
                key={deck.id}
                onClick={() => startGame(deck)}
                disabled={isLoading}
                className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-white/20 shadow-xl ${deck.color}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-4xl shadow-sm">{deck.emoji}</span>
                  <Play className="text-white/80 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold font-display text-white mt-4 uppercase tracking-wide">
                  {deck.title}
                </h3>
                <p className="text-white/80 text-sm font-medium mt-1 leading-tight">
                  {deck.description}
                </p>
              </button>
            ))}

            {/* AI Deck */}
            <button
              onClick={() => setShowAiInput(true)}
              className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-white/20 shadow-xl ${AI_DECK.color}`}
            >
              <div className="flex justify-between items-start">
                  <span className="text-4xl shadow-sm">{AI_DECK.emoji}</span>
                  <Wand2 className="text-white/80 group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold font-display text-white mt-4 uppercase tracking-wide">
                  {AI_DECK.title}
              </h3>
               <p className="text-white/80 text-sm font-medium mt-1 leading-tight">
                  {AI_DECK.description}
               </p>
            </button>

          </div>
        </main>

        {/* AI Input Modal */}
        {showAiInput && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-display text-white mb-4 text-center">Crea tu propio tema</h3>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ej: Telenovelas de los 90s..."
                className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-4 mb-6 focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAiInput(false)}
                  className="flex-1 bg-neutral-700 text-white font-bold py-3 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => startGame(AI_DECK, customTopic)}
                  disabled={!customTopic.trim() || isLoading}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex justify-center items-center"
                >
                  {isLoading ? 'Generando...' : '¡Jugar!'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !showAiInput && (
           <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mb-4"></div>
             <p className="text-white font-display text-2xl animate-pulse">Preparando el mazo...</p>
           </div>
        )}

        <footer className="fixed bottom-0 w-full p-4 bg-neutral-900 border-t border-white/5 text-center text-xs text-white/40 z-10">
           <p className="mb-1">Hecho con amor y tacos 🌮</p>
           <p className="font-bold text-white/60">Creación de Juan Carlos Garfias</p>
        </footer>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // GAME RENDER
  // --------------------------------------------------------------------------
  if (gameState === 'PLAYING') {
    return (
      <GameScreen 
        words={activeWords} 
        duration={60} 
        onEndGame={handleEndGame} 
        onExit={resetGame}
      />
    );
  }

  // --------------------------------------------------------------------------
  // SCORE RENDER
  // --------------------------------------------------------------------------
  if (gameState === 'SCORE') {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col text-white">
        <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
          
          <div className="text-center mb-8 mt-4">
            <h2 className="text-6xl font-display text-white mb-2">¡SE ACABÓ!</h2>
            <div className="inline-block bg-neutral-800 px-6 py-2 rounded-full border border-white/10">
               <span className="text-neutral-400 font-bold uppercase text-sm tracking-wider">Puntuación Final</span>
               <div className="text-5xl font-bold text-green-400 mt-1">{results?.correct.length}</div>
            </div>
          </div>

          <div className="grid gap-6">
            
            {/* Correct List */}
            <div className="bg-neutral-800/50 rounded-2xl p-6 border border-green-500/30">
              <h3 className="flex items-center text-green-400 font-bold text-xl mb-4 uppercase tracking-wider">
                <div className="bg-green-500/20 p-2 rounded-lg mr-3">
                  <Settings size={20} className="text-green-500" />
                </div>
                Adivinadas ({results?.correct.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {results?.correct.map((word, i) => (
                  <span key={i} className="bg-green-900/40 text-green-200 px-3 py-1 rounded-lg border border-green-500/20 text-sm font-medium">
                    {word}
                  </span>
                ))}
                {results?.correct.length === 0 && <span className="text-white/30 italic">Ninguna... ¡Qué chafa!</span>}
              </div>
            </div>

            {/* Skipped List */}
            <div className="bg-neutral-800/50 rounded-2xl p-6 border border-red-500/30">
              <h3 className="flex items-center text-red-400 font-bold text-xl mb-4 uppercase tracking-wider">
                <div className="bg-red-500/20 p-2 rounded-lg mr-3">
                  <Skull size={20} className="text-red-500" />
                </div>
                Pasadas ({results?.skipped.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {results?.skipped.map((word, i) => (
                  <span key={i} className="bg-red-900/40 text-red-200 px-3 py-1 rounded-lg border border-red-500/20 text-sm font-medium">
                    {word}
                  </span>
                ))}
                 {results?.skipped.length === 0 && <span className="text-white/30 italic">¡Te la sabes todas!</span>}
              </div>
            </div>

          </div>

          <div className="h-24"></div> {/* Spacer for bottom button */}
        </div>

        <div className="fixed bottom-0 w-full p-4 bg-neutral-900 border-t border-white/10 backdrop-blur-lg">
           <button 
             onClick={resetGame}
             className="w-full bg-white text-black font-display text-2xl py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-colors uppercase tracking-widest"
           >
             Jugar Otra Vez
           </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;