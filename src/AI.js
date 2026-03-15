/**
 * Chess AI using minimax with alpha-beta pruning.
 * Runs in the main thread but uses iterative deepening to stay responsive.
 */

// Piece values (centipawns)
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables (from white's perspective, flipped for black)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5,  5,  5,  5,  5,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
  k_end: [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
  ],
};

export class ChessAI {
  constructor(game) {
    this.game = game;
    this.nodesSearched = 0;
  }

  /**
   * Get the best move for the current position.
   * Returns a promise to allow UI to update.
   */
  async getBestMove(depth = 3) {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.nodesSearched = 0;
        const result = this.iterativeDeepening(depth);
        resolve(result);
      }, 50); // Small delay so UI can show "thinking" state
    });
  }

  iterativeDeepening(maxDepth) {
    let bestMove = null;
    for (let d = 1; d <= maxDepth; d++) {
      bestMove = this.searchRoot(d);
    }
    return bestMove;
  }

  searchRoot(depth) {
    const chess = this.game.chess;
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    // Order moves for better pruning
    this.orderMoves(moves);

    let bestScore = -Infinity;
    let bestMove = moves[0];
    const isMaximizing = chess.turn() === 'w';

    for (const move of moves) {
      chess.move(move);
      const score = isMaximizing
        ? this.minimax(depth - 1, -Infinity, Infinity, false)
        : -this.minimax(depth - 1, -Infinity, Infinity, true);
      chess.undo();

      // For black, we want the minimum score
      const adjustedScore = chess.turn() === 'w' ? score : -score;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = move;
      }
    }

    return bestMove;
  }

  minimax(depth, alpha, beta, isMaximizing) {
    this.nodesSearched++;
    const chess = this.game.chess;

    if (depth === 0) return this.quiescence(alpha, beta, isMaximizing, 4);
    if (chess.isGameOver()) return this.evaluateTerminal(isMaximizing);

    const moves = chess.moves({ verbose: true });
    this.orderMoves(moves);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const eval_ = this.minimax(depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const eval_ = this.minimax(depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  quiescence(alpha, beta, isMaximizing, depth) {
    const chess = this.game.chess;
    const standPat = this.evaluate();
    this.nodesSearched++;

    if (depth === 0) return standPat;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);

      const captures = chess.moves({ verbose: true }).filter(m => m.captured);
      this.orderMoves(captures);

      for (const move of captures) {
        chess.move(move);
        const score = this.quiescence(alpha, beta, false, depth - 1);
        chess.undo();
        alpha = Math.max(alpha, score);
        if (alpha >= beta) return beta;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);

      const captures = chess.moves({ verbose: true }).filter(m => m.captured);
      this.orderMoves(captures);

      for (const move of captures) {
        chess.move(move);
        const score = this.quiescence(alpha, beta, true, depth - 1);
        chess.undo();
        beta = Math.min(beta, score);
        if (alpha >= beta) return alpha;
      }
      return beta;
    }
  }

  evaluateTerminal(isMaximizing) {
    const chess = this.game.chess;
    if (chess.isCheckmate()) {
      return isMaximizing ? -99999 : 99999;
    }
    return 0; // Draw
  }

  evaluate() {
    const chess = this.game.chess;
    const board = chess.board();
    let score = 0;
    let whiteMaterial = 0;
    let blackMaterial = 0;

    // Calculate total material for endgame detection
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece || piece.type === 'k') continue;
        if (piece.color === 'w') whiteMaterial += PIECE_VALUES[piece.type];
        else blackMaterial += PIECE_VALUES[piece.type];
      }
    }

    const isEndgame = (whiteMaterial + blackMaterial) < 2600;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        const value = PIECE_VALUES[piece.type];
        const pstKey = (piece.type === 'k' && isEndgame) ? 'k_end' : piece.type;
        const pst = PST[pstKey];

        let pstIndex;
        if (piece.color === 'w') {
          pstIndex = (7 - row) * 8 + col;
          score += value + pst[pstIndex];
        } else {
          pstIndex = row * 8 + col;
          score -= value + pst[pstIndex];
        }
      }
    }

    // Mobility bonus
    const currentMoves = chess.moves().length;
    const mobilityBonus = currentMoves * 2;
    score += chess.turn() === 'w' ? mobilityBonus : -mobilityBonus;

    return score;
  }

  orderMoves(moves) {
    moves.sort((a, b) => this.moveScore(b) - this.moveScore(a));
  }

  moveScore(move) {
    let score = 0;
    // Prioritize captures (MVV-LVA)
    if (move.captured) {
      score += PIECE_VALUES[move.captured] * 10 - PIECE_VALUES[move.piece];
    }
    // Prioritize promotions
    if (move.promotion) {
      score += PIECE_VALUES[move.promotion];
    }
    // Prioritize checks
    if (move.san && move.san.includes('+')) {
      score += 50;
    }
    return score;
  }
}
