export type GameState = 'MENU' | 'PLAYING' | 'SUMMARY';

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