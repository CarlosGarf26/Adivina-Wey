import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SensorStatus } from '../types';
import { X, Check, Smartphone, Info } from 'lucide-react';

interface GameScreenProps {
  words: string[];
  duration: number; // in seconds
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
  const [countdown, setCountdown] = useState(5); // Increased countdown to give time for setup
  const [isPaused, setIsPaused] = useState(false);
  
  // Feedback State
  const [feedback, setFeedback] = useState<'CORRECT' | 'SKIP' | null>(null);
  
  // Sensor State
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(SensorStatus.UNKNOWN);
  const [debugValues, setDebugValues] = useState({ beta: 0, gamma: 0 });
  const [showDebug, setShowDebug] = useState(false);
  
  // Tilt Locking (prevent double triggers)
  const isTiltLockedRef = useRef(false);

  // --------------------------------------------------------------------------
  // SENSOR LOGIC (Gyroscope)
  // --------------------------------------------------------------------------
  
  const requestMotionPermission = async () => {
    // @ts-ignore - iOS 13+ specific property
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
      // Non-iOS or older devices
      setSensorStatus(SensorStatus.GRANTED);
    }
  };

  useEffect(() => {
    if (sensorStatus !== SensorStatus.GRANTED) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (isPaused || feedback) return;

      const beta = event.beta || 0;   // Front/Back tilt (-180 to 180)
      const gamma = event.gamma || 0; // Left/Right tilt (-90 to 90)

      setDebugValues({ beta: Math.round(beta), gamma: Math.round(gamma) });

      // LOGIC FOR LANDSCAPE MODE (Celular horizontal en la frente)
      // En la frente (pantalla afuera): Gamma es aprox +/- 90, Beta aprox 0.
      
      // TILT DOWN (Hacia el piso) -> CORRECTO
      // Cuando bajas la cabeza, el Gamma absoluto disminuye (se acerca a 0, plano)
      // O el Beta cambia significativamente dependiendo de la rotación exacta.
      
      // Vamos a usar una lógica simplificada basada en umbrales:
      
      // Detectar "Neutro" (En la frente)
      // Asumimos que el usuario regresa a posición vertical entre palabras.
      // Gamma alto (> 60 o < -60) significa que está vertical en la frente.
      if (Math.abs(gamma) > 60) {
        isTiltLockedRef.current = false;
      }

      if (isTiltLockedRef.current) return;

      // DETECTAR CORRECTO (Agachar cabeza / Celular mira al piso)
      // El celular se pone más "plano", Gamma baja.
      if (Math.abs(gamma) < 30 && Math.abs(beta) < 50) {
         handleCorrect();
         isTiltLockedRef.current = true;
      }

      // DETECTAR PASAR (Mirar al techo / Celular mira arriba)
      // Esto es difícil anatómicamente con el celular en la frente en landscape.
      // Alternativa: Inclinar hacia atrás bruscamente.
      // Si el Gamma invierte polaridad o Beta sube mucho.
      // Simplificación: Si Beta > 60 (mirando arriba)
      if (Math.abs(beta) > 60) {
        handleSkip();
        isTiltLockedRef.current = true;
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
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

    setTimeout(() => {
      setCorrectWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 800);
  }, [feedback, words, currentWordIndex]);

  const handleSkip = useCallback(() => {
    if (feedback) return;

    setFeedback('SKIP');
    if (navigator.vibrate) navigator.vibrate(200);

    setTimeout(() => {
      setSkippedWords(prev => [...prev, words[currentWordIndex]]);
      advanceCard();
    }, 800);
  }, [feedback, words, currentWordIndex]);

  const advanceCard = () => {
    setFeedback(null);
    if (currentWordIndex >= words.length - 1) {
      endGame();
    } else {
      setCurrentWordIndex(prev => prev + 1);
      // Small pause before unlocking sensors again is handled by the threshold check in handleOrientation
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
      // Don't count down if we need permission and haven't asked properly yet, 
      // BUT we want to let them click the button. 
      // Let's just count down but stay at 1 if they haven't decided? 
      // No, let's simple pause countdown logic if sensor is unknown? 
      // Actually, user might want to play without sensors.
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
      <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-50 p-4">
        <h1 className="text-9xl font-display font-bold text-white animate-bounce mb-8">
          {countdown}
        </h1>
        
        <p className="text-white text-2xl text-center font-bold mb-8">
          ¡Ponte el cel en la frente!<br/>
          <span className="text-sm font-normal opacity-80">(Horizontal)</span>
        </p>
        
        {/* SENSOR BUTTON - CRITICAL FOR IOS */}
        {sensorStatus !== SensorStatus.GRANTED && (
           <button 
             onClick={requestMotionPermission}
             className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold shadow-xl flex items-center gap-3 text-xl animate-pulse"
           >
             <Smartphone size={32} />
             ACTIVAR SENSORES
           </button>
        )}

        {sensorStatus === SensorStatus.GRANTED && (
          <div className="flex items-center gap-2 text-green-300 bg-black/20 px-4 py-2 rounded-full">
            <Check size={20} /> Sensores Listos
          </div>
        )}

        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="absolute top-4 right-4 text-white/30 p-2"
        >
          <Info size={20} />
        </button>
      </div>
    );
  }

  // GAME SCREEN
  const bgClass = feedback === 'CORRECT' ? 'bg-green-500' : feedback === 'SKIP' ? 'bg-red-500' : 'bg-blue-600';
  const currentWord = words[currentWordIndex];

  return (
    <div className={`fixed inset-0 ${bgClass} transition-colors duration-300 flex flex-col z-40 overflow-hidden`}>
      
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 relative z-50">
         <button onClick={onExit} className="bg-black/20 p-2 rounded-full text-white backdrop-blur-sm">
           <X size={24} />
         </button>
         <div className="text-5xl font-display font-bold text-white tracking-widest drop-shadow-md">
           {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
         </div>
         <div className="w-10"></div>
      </div>

      {/* Debug Overlay */}
      {showDebug && (
        <div className="absolute top-20 left-4 text-xs font-mono text-white/50 pointer-events-none z-50 bg-black/40 p-2 rounded">
          Status: {sensorStatus}<br/>
          Beta: {debugValues.beta}°<br/>
          Gamma: {debugValues.gamma}°
        </div>
      )}

      {/* Main Card Area */}
      <div className="flex-1 flex items-center justify-center relative p-4">
        <div className={`w-full max-w-md aspect-[3/4] md:aspect-video flex items-center justify-center 
                        ${feedback ? 'scale-90 opacity-0' : 'scale-100 opacity-100'} 
                        transition-all duration-300`}>
          <div className="text-center transform rotate-90 md:rotate-0"> {/* Rotate text on mobile if locked portrait, optional */}
             <h2 className="text-6xl md:text-8xl font-display font-bold text-white drop-shadow-lg leading-none break-words px-4">
               {currentWord}
             </h2>
             <p className="text-white/60 mt-6 text-xl font-bold animate-pulse">
               ABAJO: Correcto &bull; ARRIBA: Pasar
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

      {/* Touch Controls (Huge Invisible Buttons) */}
      <div className="absolute inset-0 flex z-0">
        <div 
          onClick={handleSkip} 
          className="w-1/2 h-full active:bg-red-600/20 transition-colors flex items-center justify-start pl-4"
        >
        </div>
        <div 
          onClick={handleCorrect} 
          className="w-1/2 h-full active:bg-green-600/20 transition-colors flex items-center justify-end pr-4"
        >
        </div>
      </div>

      <div className="absolute bottom-4 w-full text-center pointer-events-none text-white/50 text-xs font-bold uppercase tracking-widest z-50">
        Si no jala el sensor, toca: Izquierda (Pasar) - Derecha (Bien)
      </div>

    </div>
  );
};