/**
 * Theme configuration for board and pieces.
 *
 * To add a custom theme:
 * 1. Add a new entry to BOARD_THEMES or PIECE_THEMES
 * 2. For custom 3D models, set pieceModels to a map of piece type -> GLTF/GLB URL
 *    e.g. { k: '/models/king.glb', q: '/models/queen.glb', ... }
 * 3. For custom board models, set boardModel to a GLTF/GLB URL
 */

export const BOARD_THEMES = {
  classic: {
    name: 'Classic',
    lightSquare: 0xf0d9b5,
    darkSquare: 0xb58863,
    borderColor: 0x5c3a1e,
    borderMetalness: 0.3,
    borderRoughness: 0.6,
    boardModel: null, // Use procedural board
  },
  marble: {
    name: 'Marble',
    lightSquare: 0xe8e0d4,
    darkSquare: 0x4a6741,
    borderColor: 0x2a2a2a,
    borderMetalness: 0.5,
    borderRoughness: 0.3,
    boardModel: null,
  },
  modern: {
    name: 'Modern',
    lightSquare: 0xeeeeee,
    darkSquare: 0x333333,
    borderColor: 0x111111,
    borderMetalness: 0.8,
    borderRoughness: 0.2,
    boardModel: null,
  },
  blue: {
    name: 'Ocean Blue',
    lightSquare: 0xdce7f2,
    darkSquare: 0x4a7ab5,
    borderColor: 0x1a3550,
    borderMetalness: 0.4,
    borderRoughness: 0.4,
    boardModel: null,
  },
  // Example custom model theme:
  // custom: {
  //   name: 'Custom',
  //   lightSquare: 0xffffff,
  //   darkSquare: 0x000000,
  //   borderColor: 0x444444,
  //   boardModel: '/models/custom-board.glb',
  // },
};

export const PIECE_THEMES = {
  classic: {
    name: 'Classic',
    whiteMaterial: {
      color: 0xfafafa,
      roughness: 0.35,
      metalness: 0.1,
      envMapIntensity: 0.5,
    },
    blackMaterial: {
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.15,
      envMapIntensity: 0.6,
    },
    pieceModels: null, // Use procedural pieces
  },
  wood: {
    name: 'Wood',
    whiteMaterial: {
      color: 0xdeb887,
      roughness: 0.6,
      metalness: 0.0,
    },
    blackMaterial: {
      color: 0x4a2810,
      roughness: 0.55,
      metalness: 0.0,
    },
    pieceModels: null,
  },
  metal: {
    name: 'Metal',
    whiteMaterial: {
      color: 0xd4d4d4,
      roughness: 0.15,
      metalness: 0.9,
    },
    blackMaterial: {
      color: 0x2a2a2a,
      roughness: 0.2,
      metalness: 0.85,
    },
    pieceModels: null,
  },
  jade: {
    name: 'Jade & Ivory',
    whiteMaterial: {
      color: 0xfffff0,
      roughness: 0.4,
      metalness: 0.05,
    },
    blackMaterial: {
      color: 0x2d8b57,
      roughness: 0.25,
      metalness: 0.1,
    },
    pieceModels: null,
  },
  // Example with custom models:
  // custom: {
  //   name: 'Custom Set',
  //   whiteMaterial: { color: 0xffffff, roughness: 0.3, metalness: 0.1 },
  //   blackMaterial: { color: 0x111111, roughness: 0.3, metalness: 0.1 },
  //   pieceModels: {
  //     k: '/models/pieces/king.glb',
  //     q: '/models/pieces/queen.glb',
  //     r: '/models/pieces/rook.glb',
  //     b: '/models/pieces/bishop.glb',
  //     n: '/models/pieces/knight.glb',
  //     p: '/models/pieces/pawn.glb',
  //   },
  // },
};

export const HIGHLIGHT_COLORS = {
  selected: 0x44ff44,
  legalMove: 0x44aaff,
  capture: 0xff4444,
  lastMove: 0xffff44,
  check: 0xff0000,
};

export const DEFAULT_CONFIG = {
  boardTheme: 'classic',
  pieceTheme: 'classic',
};
