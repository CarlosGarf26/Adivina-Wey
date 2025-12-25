export type GameState = 'MENU' | 'SETUP' | 'TURN_START' | 'PLAYING' | 'TURN_SUMMARY' | 'SCORE';

export interface Deck {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  words?: string[]; // Pre-defined words
  isGenerative?: boolean; // If true, uses Gemini
  promptContext?: string; // Context for Gemini
}

export interface Player {
  id: number;
  name: string;
  score: number;
  correct: string[];
  skipped: string[];
}

export interface GameSession {
  correct: string[];
  skipped: string[];
  timeLeft: number;
  currentWordIndex: number;
  words: string[];
}

export enum SensorStatus {
  UNKNOWN = 'UNKNOWN',
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNSUPPORTED = 'UNSUPPORTED'
}