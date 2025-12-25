import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SensorStatus } from '../types';
import { X, Check, Smartphone, Info, ArrowUp, ThumbsUp, ArrowDown, ThumbsDown } from 'lucide-react';

interface GameScreenProps {
  words: string[];
  duration: number; // in seconds
  playerName: string;
  onEndGame: (correct: string[], skipped: string[]) => void;
  onExit: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ words, duration, onEndGame, onExit }) => {
  // Game State
  const [timeLeft, setTimeLeft] = useState(duration);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [correctWords, setCorrectWords] = useState<string[]>([]);
  const [skippedWords, setSkippedWords] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isPaused, setIsPaused] = useState(false);
  
  // Feedback State
  const [feedback, setFeedback] = useState<'CORRECT' | 'SKIP' | null>(null);
  
  // Sensor State
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(SensorStatus.UNKNOWN);
  const [debugValues, setDebugValues] = useState({ beta: 0, ready: false });
  const [showDebug, setShowDebug] = useState(false);
  
  // Logic Flags
  const processingRef = useRef(false);
  const isReadyRef = useRef(false); // Flag para saber si el usuario regresó a la posición neutral (vertical)

  // --------------------------------------------------------------------------
  // SENSOR LOGIC (Gyroscope)
  // --------------------------------------------------------------------------
  
  const requestMotionPermission = async () => {
    // @ts-ignore
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-ignore
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          setSensorStatus(SensorStatus.GRANTED);
        } else {
          setSensorStatus(SensorStatus.DENIED);
          alert("Permiso denegado. Tendrás que jugar tocando la pantalla.");
        }
      } catch (e) {
        console.error(e);
        setSensorStatus(SensorStatus.DENIED);
      }
    } else {
      setSensorStatus(SensorStatus.GRANTED);
    }
  };

  useEffect(() => {
    if (sensorStatus !== SensorStatus.GRANTED) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (isPaused || processingRef.current || !isPlaying) return;

      const beta = event.beta; 
      if (beta === null) return;

      // ZONA NEUTRAL (Vertical / Frente)
      // El celular debe estar entre 60° y 120° para "armar" el gatillo.
      // Esto evita que si el cel está en la mesa (0°), marque correcto infinito.
      if (beta > 60 && beta < 120) {
        isReadyRef.current = true;
      }
      
      setDebugValues({ beta: Math.round(beta), ready: isReadyRef.current });

      // Si no estamos listos (no hemos pasado por la vertical), ignoramos movimientos extremos
      if (!isReadyRef.current) return;

      // ACCIÓN: CORRECTO (Inclinar hacia atrás/arriba)
      // Beta tiende a 0 o negativo cuando miras al techo
      if (beta < 35) {
         triggerAction('CORRECT');
         isReadyRef.current = false; // Reset: debe volver a neutral
      }

      // ACCIÓN: PASAR (Inclinar hacia adelante/abajo)
      // Beta tiende a 180 cuando miras al piso
      if (beta > 145) {
         triggerAction('SKIP');
         isReadyRef.current = false; // Reset: debe volver a neutral
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [sensorStatus, isPaused, isPlaying]);

  const triggerAction = (type: 'CORRECT' | 'SKIP') => {
    if (processingRef.current) return;
    processingRef.current = true;

    if (type === 'CORRECT') {
        handleCorrect();
    } else {
        handleSkip();
    }

    // Cooldown
    setTimeout(() => {
        processingRef.current = false;
    }, 1000);
  };

  // --------------------------------------------------------------------------
  // GAME LOGIC
  // --------------------------------------------------------------------------

  const handleCorrect = useCallback(() => {
    setFeedback('CORRECT');
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]); 

    setTimeout(() => {
      setCorrectWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 800); 
  }, [words, currentWordIndex]);

  const handleSkip = useCallback(() => {
    setFeedback('SKIP');
    if (navigator.vibrate) navigator.vibrate(500); 

    setTimeout(() => {
      setSkippedWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 800);
  }, [words, currentWordIndex]);

  const advanceCard = () => {
    setFeedback(null);
    if (currentWordIndex >= words.length - 1) {
      endGame();
    } else {
      setCurrentWordIndex(prev => prev + 1);
    }
  };

  const endGame = useCallback(() => {
    setIsPaused(true);
    onEndGame(correctWords, skippedWords);
  }, [correctWords, skippedWords, onEndGame]);

  // --------------------------------------------------------------------------
  // TIMERS
  // --------------------------------------------------------------------------

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else {
      setIsPlaying(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    
    if (timeLeft <= 0) {
      endGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, isPaused, endGame]);


  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  // SETUP / COUNTDOWN SCREEN
  if (countdown > 0) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-50 p-4 text-center">
        <h2 className="text-white text-3xl font-display mb-4">¡Ponte el cel en la frente!</h2>
        
        <div className="text-9xl font-display font-bold text-white animate-bounce mb-8">
          {countdown}
        </div>
        
        <div className="bg-black/20 p-6 rounded-2xl flex flex-col gap-6 w-full max-w-sm">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xl">
                 <ArrowUp size={32} className="text-green-400" /> 
                 <span>ARRIBA</span>
              </div>
              <ThumbsUp size={32} className="text-green-400" />
           </div>
           <div className="h-px bg-white/20"></div>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xl">
                 <ArrowDown size={32} className="text-red-400" /> 
                 <span>ABAJO</span>
              </div>
              <ThumbsDown size={32} className="text-red-400" />
           </div>
        </div>
        
        {/* SENSOR BUTTON */}
        {sensorStatus !== SensorStatus.GRANTED && (
           <button 
             onClick={requestMotionPermission}
             className="mt-8 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 text-xl animate-pulse mx-auto"
           >
             <Smartphone size={32} />
             ACTIVAR JUEGO
           </button>
        )}
      </div>
    );
  }

  // GAME SCREEN
  const bgClass = feedback === 'CORRECT' ? 'bg-green-500' : feedback === 'SKIP' ? 'bg-red-500' : 'bg-blue-600';
  const currentWord = words[currentWordIndex];

  return (
    <div className={`fixed inset-0 ${bgClass} transition-colors duration-300 flex flex-col z-40 overflow-hidden touch-none`}>
      
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 relative z-50">
         <button onClick={onExit} className="bg-black/20 p-2 rounded-full text-white backdrop-blur-sm">
           <X size={24} />
         </button>
         <div className="text-6xl font-display font-bold text-white tracking-widest drop-shadow-md">
            {timeLeft}
         </div>
         <div className="w-10"></div>
      </div>

      {/* Debug Overlay */}
      {showDebug && (
        <div className="absolute top-20 left-4 text-xs font-mono text-white/50 pointer-events-none z-50 bg-black/40 p-2 rounded">
          Status: {sensorStatus}<br/>
          Beta: {debugValues.beta}°<br/>
          Ready: {debugValues.ready ? 'YES' : 'NO'}
        </div>
      )}

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center relative p-4">
        <div className={`w-full max-w-md aspect-[3/4] md:aspect-video flex items-center justify-center 
                        ${feedback ? 'scale-90 opacity-0' : 'scale-100 opacity-100'} 
                        transition-all duration-300`}>
          <div className="text-center transform rotate-90 md:rotate-0 flex flex-col items-center">
             <h2 className="text-6xl md:text-8xl font-display font-bold text-white drop-shadow-lg leading-none break-words px-4 mb-12">
               {currentWord}
             </h2>
             
             {/* Visual Guides */}
             <div className="flex gap-12 opacity-60">
                <div className="flex flex-col items-center gap-2 animate-bounce">
                    <ArrowUp size={40} />
                    <ThumbsUp size={40} />
                </div>
                <div className="flex flex-col items-center gap-2 animate-bounce">
                    <ThumbsDown size={40} />
                    <ArrowDown size={40} />
                </div>
             </div>
          </div>
        </div>

        {/* Feedback Icons */}
        {feedback === 'CORRECT' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <ThumbsUp size={180} className="text-white drop-shadow-lg animate-pop" />
          </div>
        )}
        {feedback === 'SKIP' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
             <ThumbsDown size={180} className="text-white drop-shadow-lg animate-pop" />
          </div>
        )}
      </div>

      {/* Touch Controls (Backup Manual) */}
      <div className="absolute inset-0 flex z-0">
        <div 
          onClick={() => triggerAction('SKIP')} 
          className="w-1/2 h-full active:bg-red-600/20 transition-colors"
        ></div>
        <div 
          onClick={() => triggerAction('CORRECT')} 
          className="w-1/2 h-full active:bg-green-600/20 transition-colors"
        ></div>
      </div>
      
      {/* Botón de Debug secreto (Abajo a la izquierda) */}
       <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="absolute bottom-4 left-4 text-white/10 p-4 z-50"
        >
          <Info size={24} />
        </button>

    </div>
  );
};