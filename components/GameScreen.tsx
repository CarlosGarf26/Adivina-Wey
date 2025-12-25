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

export const GameScreen: React.FC<GameScreenProps> = ({ words, duration, playerName, onEndGame, onExit }) => {
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
  const [debugValues, setDebugValues] = useState({ beta: 0, gamma: 0 });
  const [showDebug, setShowDebug] = useState(false);
  
  // Sensor Locking (Zona Neutral)
  // true = El sensor está listo para detectar.
  // false = El usuario debe regresar el celular a la frente (vertical) para desbloquear.
  const isSensorReadyRef = useRef(false);

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
      if (isPaused || feedback) return;

      // BETA: Inclinación Frontal/Trasera (-180 a 180)
      // Vertical (Frente): ~90 grados
      // Acostado (Mirando techo/Arriba): ~0 grados
      // Acostado (Mirando piso/Abajo): ~180 grados
      const beta = event.beta || 0; 
      const gamma = event.gamma || 0;

      setDebugValues({ beta: Math.round(beta), gamma: Math.round(gamma) });

      // 1. ZONA NEUTRAL (RESET)
      // El usuario debe poner el celular vertical (aprox 90 grados) para poder marcar la siguiente.
      // Rango vertical aceptable: 60 a 120 grados.
      if (beta > 60 && beta < 120) {
        isSensorReadyRef.current = true;
      }

      // Si el sensor no se ha reseteado (no ha vuelto a la frente), ignoramos movimientos.
      if (!isSensorReadyRef.current) return;

      // 2. DETECTAR MOVIMIENTOS
      
      // ARRIBA (Mirar al techo) = CORRECTO
      // El valor de Beta baja hacia 0.
      // Umbral: Menor a 40 grados.
      if (beta < 40) {
         handleCorrect();
         isSensorReadyRef.current = false; // Bloquear hasta volver a neutral
      }

      // ABAJO (Mirar al piso) = PASAR / ERROR
      // El valor de Beta sube hacia 180.
      // Umbral: Mayor a 140 grados.
      if (beta > 140) {
         handleSkip();
         isSensorReadyRef.current = false; // Bloquear hasta volver a neutral
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [sensorStatus, isPaused, feedback]);

  // --------------------------------------------------------------------------
  // GAME LOGIC
  // --------------------------------------------------------------------------

  const handleCorrect = useCallback(() => {
    if (feedback) return;
    
    setFeedback('CORRECT');
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // Vibración corta y feliz

    setTimeout(() => {
      setCorrectWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 1000); // 1 segundo para ver el feedback
  }, [feedback, words, currentWordIndex]);

  const handleSkip = useCallback(() => {
    if (feedback) return;

    setFeedback('SKIP');
    if (navigator.vibrate) navigator.vibrate(500); // Vibración larga y triste

    setTimeout(() => {
      setSkippedWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 1000);
  }, [feedback, words, currentWordIndex]);

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
        <h2 className="text-white text-3xl font-display mb-4">Turno de:</h2>
        <h1 className="text-5xl text-yellow-300 font-display font-bold mb-8 drop-shadow-md">{playerName}</h1>
        
        <div className="text-9xl font-display font-bold text-white animate-bounce mb-8">
          {countdown}
        </div>
        
        <p className="text-white text-xl font-bold mb-8 bg-black/20 p-4 rounded-xl">
          1. Celular en la frente (Horizontal)<br/>
          2. Inclina al TECHO para CORRECTO<br/>
          3. Inclina al PISO para PASAR
        </p>
        
        {/* SENSOR BUTTON */}
        {sensorStatus !== SensorStatus.GRANTED && (
           <button 
             onClick={requestMotionPermission}
             className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 text-xl animate-pulse mx-auto"
           >
             <Smartphone size={32} />
             ACTIVAR SENSORES
           </button>
        )}

        {sensorStatus === SensorStatus.GRANTED && (
          <div className="flex items-center justify-center gap-2 text-green-300 bg-black/20 px-4 py-2 rounded-full mx-auto w-fit">
            <Check size={20} /> Sensores Calibrados
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
         <div className="flex flex-col items-center">
            <div className="text-5xl font-display font-bold text-white tracking-widest drop-shadow-md">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
            <span className="text-white/60 text-sm font-bold">{playerName}</span>
         </div>
         <div className="w-10"></div>
      </div>

      {/* Debug Overlay */}
      {showDebug && (
        <div className="absolute top-20 left-4 text-xs font-mono text-white/50 pointer-events-none z-50 bg-black/40 p-2 rounded">
          Status: {sensorStatus}<br/>
          Beta: {debugValues.beta}°<br/>
          Gamma: {debugValues.gamma}°<br/>
          Ready: {isSensorReadyRef.current ? 'YES' : 'NO (Return to vertical)'}
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
             <p className="text-white/60 mt-8 text-2xl font-bold animate-pulse">
               TECHO = BIEN 👍 <br/> PISO = PASAR 👎
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

      {/* Touch Controls (Backups) */}
      <div className="absolute inset-0 flex z-0">
        <div 
          onClick={handleSkip} 
          className="w-1/2 h-full active:bg-red-600/20 transition-colors"
        ></div>
        <div 
          onClick={handleCorrect} 
          className="w-1/2 h-full active:bg-green-600/20 transition-colors"
        ></div>
      </div>
      
      {/* Botón de Debug secreto */}
       <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="absolute bottom-4 left-4 text-white/10 p-4 z-50"
        >
          <Info size={24} />
        </button>

    </div>
  );
};