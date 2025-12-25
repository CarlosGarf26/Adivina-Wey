import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SensorStatus } from '../types';
import { X, Check, Smartphone, Info } from 'lucide-react';

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
  const [debugValues, setDebugValues] = useState({ beta: 0 });
  const [showDebug, setShowDebug] = useState(false);
  
  // Ref para evitar detecciones múltiples muy rápidas
  const processingRef = useRef(false);

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
      // Si el juego está pausado, terminando, o procesando un movimiento anterior, ignorar.
      if (isPaused || processingRef.current || !isPlaying) return;

      // BETA: Inclinación Frontal/Trasera (-180 a 180)
      // Asumiendo modo Portrait (que es como se renderiza el texto rotado)
      // 90 grados = Vertical (Frente)
      // < 30 grados = Mirando al techo (Correcto)
      // > 150 grados = Mirando al piso (Pasar)
      const beta = event.beta || 90; 
      
      setDebugValues({ beta: Math.round(beta) });

      // Detectar CORRECTO (Inclinar hacia atrás/techo)
      if (beta < 35) {
         triggerAction('CORRECT');
      }

      // Detectar PASAR (Inclinar hacia adelante/piso)
      if (beta > 145) {
         triggerAction('SKIP');
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

    // Cooldown de 1.5 segundos para dar tiempo al usuario de regresar el cel a la frente
    setTimeout(() => {
        processingRef.current = false;
    }, 1500);
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
        
        <p className="text-white text-xl font-bold mb-8 bg-black/20 p-4 rounded-xl">
          Inclina al TECHO para BIEN 👍<br/>
          Inclina al PISO para PASAR 👎
        </p>
        
        {/* SENSOR BUTTON */}
        {sensorStatus !== SensorStatus.GRANTED && (
           <button 
             onClick={requestMotionPermission}
             className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 text-xl animate-pulse mx-auto"
           >
             <Smartphone size={32} />
             ACTIVAR JUEGO
           </button>
        )}

        {sensorStatus === SensorStatus.GRANTED && (
          <div className="flex items-center justify-center gap-2 text-green-300 bg-black/20 px-4 py-2 rounded-full mx-auto w-fit">
            <Check size={20} /> Listo
          </div>
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
        </div>
      )}

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center relative p-4">
        <div className={`w-full max-w-md aspect-[3/4] md:aspect-video flex items-center justify-center 
                        ${feedback ? 'scale-90 opacity-0' : 'scale-100 opacity-100'} 
                        transition-all duration-300`}>
          <div className="text-center transform rotate-90 md:rotate-0">
             <h2 className="text-6xl md:text-8xl font-display font-bold text-white drop-shadow-lg leading-none break-words px-4">
               {currentWord}
             </h2>
             <p className="text-white/60 mt-8 text-xl font-bold animate-pulse">
               TECHO = 👍  |  PISO = 👎
             </p>
          </div>
        </div>

        {/* Feedback Icons */}
        {feedback === 'CORRECT' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Check size={180} className="text-white drop-shadow-lg animate-pop" />
          </div>
        )}
        {feedback === 'SKIP' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
             <X size={180} className="text-white drop-shadow-lg animate-pop" />
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