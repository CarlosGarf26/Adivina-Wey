import { Deck } from './types';

export const COLORS = {
  pink: '#E4007C', // Mexican Pink
  orange: '#F59C00', // Cempasúchil
  blue: '#009B94', // Turquoise
  purple: '#6C1D5F',
  bg: '#121212',
  correct: '#4ADE80',
  skip: '#F87171'
};

export const STATIC_DECKS: Deck[] = [
  {
    id: 'chilango_basico',
    title: 'Chilango Básico',
    description: 'Palabras que todo capitalino se sabe.',
    emoji: '🌮',
    color: 'bg-pink-600',
    words: [
      'Chale', 'Cámara', 'Guajolota', 'Micrero', 'Godínez', 
      'Vagonero', 'Quesadilla sin queso', 'Metro Pantitlán', 
      '¡Aguas!', 'Bicitaxi', 'Tianguis', 'El Torito', 
      'Gordita de chicharrón', 'Echar la hueva', 'Me late', 
      '¿Qué transita?', 'Awilson', 'No manches', 'Caer gordo', 
      'Hacer vaca', 'Teporocho', 'Cantina', 'Lucha Libre'
    ]
  },
  {
    id: 'comida_callejera',
    title: 'Garnachas y Antojos',
    description: 'Si no te da hambre, no eres mexicano.',
    emoji: '🌽',
    color: 'bg-orange-500',
    words: [
      'Esquites', 'Tacos al pastor', 'Sope', 'Pambazo', 
      'Tlacoyo', 'Gringa', 'Suadero', 'Tripa dorada', 
      'Salsa de la que pica', 'Boing de mango', 'Chilaquiles', 
      'Tamal de verde', 'Atole de arroz', 'Churros rellenos', 
      'Dorilocos', 'Cerveza michelada', 'Pulque', 'Torta cubana'
    ]
  },
  {
    id: 'transporte',
    title: 'Caos Vial',
    description: 'Aventuras en el transporte público.',
    emoji: '🚌',
    color: 'bg-blue-600',
    words: [
      'Microbús', 'Metrobús atascado', 'Hora pico', 'El chofer', 
      'Bajan en la esquina', 'Taxímetro alterado', 'Uber carero', 
      'Vendedor de discos', 'Bocina a todo volumen', 'Asiento reservado', 
      'Transbordo', 'Línea Naranja', 'Combi', 'Mototaxi', 
      'Señora con bolsas', 'Arrimón de metro', 'Cierren las puertas'
    ]
  },
  {
    id: 'frases_mama',
    title: 'Frases de Mamá',
    description: '¡Y si lo encuentro qué te hago!',
    emoji: '🩴',
    color: 'bg-purple-600',
    words: [
      'Porque soy tu madre', 'Te voy a dar un chanclazo', 
      'Cómete todo', 'No tienes llenadera', 'Sana sana colita de rana', 
      'Ahorita es ahorita', '¿Crees que el dinero crece en los árboles?', 
      'Ponte suéter', 'Te lo dije', 'Me vas a sacar canas verdes', 
      'Limpia tu cuarto', 'Apágale a la tele'
    ]
  }
];

export const AI_DECK: Deck = {
  id: 'ai_generative',
  title: '¡Deck Infinito con IA!',
  description: 'Tú pones el tema, la IA pone la jerga.',
  emoji: '🤖',
  color: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
  isGenerative: true
};
