/**
 * Theme configuration for board and pieces.
 *
 * To add a custom theme:
 * 1. Add a new entry to BOARD_THEMES or PIECE_THEMES
 * 2. For custom piece images, set pieceImages to a map of
 *    "wk" | "wq" | "bk" | ... -> image URL
 */

export const BOARD_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    border: '#5c3a1e',
    labelColor: '#8b6f47',
  },
  marble: {
    name: 'Marble',
    lightSquare: '#e8e0d4',
    darkSquare: '#4a6741',
    border: '#2a2a2a',
    labelColor: '#888',
  },
  modern: {
    name: 'Modern',
    lightSquare: '#eeeeee',
    darkSquare: '#333333',
    border: '#111111',
    labelColor: '#666',
  },
  blue: {
    name: 'Ocean Blue',
    lightSquare: '#dce7f2',
    darkSquare: '#4a7ab5',
    border: '#1a3550',
    labelColor: '#6090b8',
  },
  football: {
    name: 'Football Pitch',
    lightSquare: '#5cb860',
    darkSquare: '#45a049',
    border: '#2e7d32',
    labelColor: '#a5d6a7',
    decoration: 'football',
  },
};

export const PIECE_THEMES = {
  classic: {
    name: 'Classic',
    whiteColor: '#ffffff',
    whiteStroke: '#333333',
    blackColor: '#333333',
    blackStroke: '#000000',
    pieceImages: null,
  },
  wood: {
    name: 'Wood',
    whiteColor: '#deb887',
    whiteStroke: '#8b6914',
    blackColor: '#4a2810',
    blackStroke: '#1a0a00',
    pieceImages: null,
  },
  metal: {
    name: 'Metal',
    whiteColor: '#d4d4d4',
    whiteStroke: '#888888',
    blackColor: '#444444',
    blackStroke: '#111111',
    pieceImages: null,
  },
  jade: {
    name: 'Jade & Ivory',
    whiteColor: '#fffff0',
    whiteStroke: '#b0b090',
    blackColor: '#2d8b57',
    blackStroke: '#0a4a2a',
    pieceImages: null,
  },
  // Example with custom images:
  // custom: {
  //   name: 'Custom Set',
  //   whiteColor: '#fff',
  //   whiteStroke: '#333',
  //   blackColor: '#333',
  //   blackStroke: '#000',
  //   pieceImages: {
  //     wk: '/images/wk.svg', wq: '/images/wq.svg', ...
  //     bk: '/images/bk.svg', bq: '/images/bq.svg', ...
  //   },
  // },
};

export const HIGHLIGHT_COLORS = {
  selected: 'rgba(68, 255, 68, 0.45)',
  legalMove: 'radial-gradient(circle, rgba(0,0,0,0.18) 25%, transparent 25%)',
  capture: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.18) 50%)',
  lastMove: 'rgba(255, 255, 100, 0.35)',
  check: 'radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(255,0,0,0.2) 60%, transparent 80%)',
};

export const DEFAULT_CONFIG = {
  boardTheme: 'classic',
  pieceTheme: 'classic',
};
