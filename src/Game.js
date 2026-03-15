import { Chess } from 'chess.js';

/**
 * Chess game state manager wrapping chess.js.
 * Handles game logic, move validation, and state queries.
 */
export class Game {
  constructor() {
    this.chess = new Chess();
    this.moveHistory = [];
    this.onMove = null;
    this.onGameOver = null;
    this.gameMode = 'ai'; // 'ai' or 'local'
    this.playerColor = 'w';
    this.aiDifficulty = 3; // search depth
  }

  reset() {
    this.chess.reset();
    this.moveHistory = [];
  }

  get turn() {
    return this.chess.turn();
  }

  get fen() {
    return this.chess.fen();
  }

  get board() {
    return this.chess.board();
  }

  isGameOver() {
    return this.chess.isGameOver();
  }

  isCheck() {
    return this.chess.isCheck();
  }

  isCheckmate() {
    return this.chess.isCheckmate();
  }

  isDraw() {
    return this.chess.isDraw();
  }

  isStalemate() {
    return this.chess.isStalemate();
  }

  isThreefoldRepetition() {
    return this.chess.isThreefoldRepetition();
  }

  isInsufficientMaterial() {
    return this.chess.isInsufficientMaterial();
  }

  getGameOverReason() {
    if (this.isCheckmate()) {
      const winner = this.turn === 'w' ? 'Black' : 'White';
      return { type: 'checkmate', winner, message: `Checkmate! ${winner} wins!` };
    }
    if (this.isStalemate()) return { type: 'stalemate', winner: null, message: 'Stalemate! Draw.' };
    if (this.isThreefoldRepetition()) return { type: 'repetition', winner: null, message: 'Draw by threefold repetition.' };
    if (this.isInsufficientMaterial()) return { type: 'insufficient', winner: null, message: 'Draw by insufficient material.' };
    if (this.isDraw()) return { type: 'draw', winner: null, message: 'Draw!' };
    return null;
  }

  getLegalMoves(square) {
    return this.chess.moves({ square, verbose: true });
  }

  getAllLegalMoves() {
    return this.chess.moves({ verbose: true });
  }

  makeMove(from, to, promotion) {
    const moveData = { from, to };
    if (promotion) moveData.promotion = promotion;

    const result = this.chess.move(moveData);
    if (result) {
      this.moveHistory.push(result);
      if (this.onMove) this.onMove(result);
      if (this.isGameOver() && this.onGameOver) {
        this.onGameOver(this.getGameOverReason());
      }
    }
    return result;
  }

  needsPromotion(from, to) {
    const moves = this.chess.moves({ square: from, verbose: true });
    return moves.some(m => m.to === to && m.promotion);
  }

  undoMove() {
    const result = this.chess.undo();
    if (result) {
      this.moveHistory.pop();
    }
    return result;
  }

  getPieceAt(square) {
    return this.chess.get(square);
  }

  isPlayerTurn() {
    if (this.gameMode === 'local') return true;
    return this.turn === this.playerColor;
  }

  // Convert board coordinates to algebraic notation
  static coordsToSquare(col, row) {
    return String.fromCharCode(97 + col) + (row + 1);
  }

  static squareToCoords(square) {
    return {
      col: square.charCodeAt(0) - 97,
      row: parseInt(square[1]) - 1,
    };
  }

  // Get captured pieces
  getCapturedPieces() {
    const initial = { p: 8, r: 2, n: 2, b: 2, q: 1, k: 1 };
    const current = { w: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 }, b: { p: 0, r: 0, n: 0, b: 0, q: 0, k: 0 } };

    const board = this.chess.board();
    for (const row of board) {
      for (const sq of row) {
        if (sq) current[sq.color][sq.type]++;
      }
    }

    return {
      w: Object.fromEntries(Object.entries(initial).map(([t, c]) => [t, c - current.w[t]]).filter(([, c]) => c > 0)),
      b: Object.fromEntries(Object.entries(initial).map(([t, c]) => [t, c - current.b[t]]).filter(([, c]) => c > 0)),
    };
  }

  // Get formatted move history for display
  getFormattedHistory() {
    const moves = this.chess.history();
    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1] || '',
      });
    }
    return pairs;
  }
}
