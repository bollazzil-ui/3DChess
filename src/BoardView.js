import { BOARD_THEMES, PIECE_THEMES, HIGHLIGHT_COLORS } from './themes.js';
import { CaptureAnimation } from './CaptureAnimation.js';

const PIECE_UNICODE = {
  w: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
};

/**
 * 2D chess board view.
 * Renders the board as an HTML/CSS grid with unicode pieces.
 * Handles click-based piece selection and move execution.
 */
export class BoardView {
  constructor(container, game) {
    this.container = container;
    this.game = game;

    this.boardTheme = BOARD_THEMES.classic;
    this.pieceTheme = PIECE_THEMES.classic;
    this.flipped = false;
    this.enabled = true;

    this.selectedSquare = null;
    this.legalMoves = [];

    // Callbacks
    this.onMoveMade = null;
    this.onPromotionNeeded = null;

    this.captureAnim = new CaptureAnimation();

    this.build();
  }

  build() {
    this.container.innerHTML = '';

    // Wrapper for board + labels
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'board-wrapper';
    this.container.appendChild(this.wrapper);

    // Rank labels (left)
    this.rankLabels = document.createElement('div');
    this.rankLabels.className = 'rank-labels';
    this.wrapper.appendChild(this.rankLabels);

    // Board grid
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'board-grid';
    this.wrapper.appendChild(this.boardEl);

    // Canvas overlay for decorations (football lines etc.)
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'board-overlay-canvas';
    this.boardEl.appendChild(this.overlayCanvas);

    // File labels (bottom)
    this.fileLabels = document.createElement('div');
    this.fileLabels.className = 'file-labels';
    this.wrapper.appendChild(this.fileLabels);

    // Create squares
    this.squares = new Map();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        sq.addEventListener('click', () => this.onSquareClick(sq));
        this.boardEl.appendChild(sq);
        // Square names assigned in renderBoard()
        this.squares.set(`${r},${c}`, sq);
      }
    }

    this.renderBoard();
  }

  /**
   * Full re-render: assigns square colors, labels, pieces, highlights.
   */
  renderBoard() {
    const theme = this.boardTheme;

    // Apply border color
    this.boardEl.style.border = `6px solid ${theme.border}`;

    // Assign square names & colors
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = this.flipped ? r : 7 - r;
        const col = this.flipped ? 7 - c : c;
        const squareName = String.fromCharCode(97 + col) + (row + 1);
        const isLight = (row + col) % 2 !== 0;

        const sq = this.squares.get(`${r},${c}`);
        sq.dataset.square = squareName;
        sq.style.backgroundColor = isLight ? theme.lightSquare : theme.darkSquare;
      }
    }

    // Labels
    this.renderLabels();

    // Decoration overlay
    this.renderDecoration();

    // Pieces
    this.syncPieces();
  }

  renderLabels() {
    const theme = this.boardTheme;

    // Rank labels (1-8)
    this.rankLabels.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      const rank = this.flipped ? r + 1 : 8 - r;
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = rank;
      label.style.color = theme.labelColor;
      this.rankLabels.appendChild(label);
    }

    // File labels (a-h)
    this.fileLabels.innerHTML = '';
    for (let c = 0; c < 8; c++) {
      const file = this.flipped ? String.fromCharCode(104 - c) : String.fromCharCode(97 + c);
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = file;
      label.style.color = theme.labelColor;
      this.fileLabels.appendChild(label);
    }
  }

  renderDecoration() {
    if (this.boardTheme.decoration !== 'football') {
      this.overlayCanvas.style.display = 'none';
      return;
    }

    this.overlayCanvas.style.display = 'block';
    // Size the canvas to match the board
    const rect = this.boardEl.getBoundingClientRect();
    const size = Math.round(rect.width) || 560;
    this.overlayCanvas.width = size;
    this.overlayCanvas.height = size;
    this.overlayCanvas.style.width = size + 'px';
    this.overlayCanvas.style.height = size + 'px';

    const ctx = this.overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;

    const pad = size * 0.02;
    const w = size - 2 * pad;
    const h = size - 2 * pad;

    // Outer boundary
    ctx.strokeRect(pad, pad, w, h);

    // Half-way line
    ctx.beginPath();
    ctx.moveTo(pad, size / 2);
    ctx.lineTo(size - pad, size / 2);
    ctx.stroke();

    // Centre circle
    const cr = size * 0.1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, cr, 0, Math.PI * 2);
    ctx.stroke();

    // Centre spot
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas
    const penW = w * 0.44;
    const penH = h * 0.16;
    const penX = (size - penW) / 2;

    // Top
    ctx.strokeRect(penX, pad, penW, penH);
    const goalW = w * 0.22;
    const goalH = h * 0.06;
    const goalX = (size - goalW) / 2;
    ctx.strokeRect(goalX, pad, goalW, goalH);
    ctx.beginPath(); ctx.arc(size / 2, pad + penH * 0.72, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size / 2, pad + penH * 0.72, cr * 0.7, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();

    // Bottom
    ctx.strokeRect(penX, size - pad - penH, penW, penH);
    ctx.strokeRect(goalX, size - pad - goalH, goalW, goalH);
    ctx.beginPath(); ctx.arc(size / 2, size - pad - penH * 0.72, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size / 2, size - pad - penH * 0.72, cr * 0.7, 1.25 * Math.PI, 1.75 * Math.PI); ctx.stroke();

    // Corner arcs
    const ca = size * 0.025;
    ctx.beginPath(); ctx.arc(pad, pad, ca, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(size - pad, pad, ca, Math.PI / 2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(pad, size - pad, ca, -Math.PI / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(size - pad, size - pad, ca, Math.PI, 1.5 * Math.PI); ctx.stroke();
  }

  /**
   * Sync displayed pieces with the current game state.
   */
  syncPieces() {
    const board = this.game.board;
    const theme = this.pieceTheme;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = this.flipped ? r : 7 - r;
        const col = this.flipped ? 7 - c : c;
        const sq = this.squares.get(`${r},${c}`);

        // Remove existing piece element
        const existing = sq.querySelector('.piece');
        if (existing) existing.remove();

        const piece = board[7 - row]?.[col];
        if (piece) {
          const el = document.createElement('div');
          el.className = 'piece';

          if (theme.pieceImages) {
            const key = piece.color + piece.type;
            el.style.backgroundImage = `url(${theme.pieceImages[key]})`;
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundPosition = 'center';
          } else {
            el.textContent = PIECE_UNICODE[piece.color][piece.type];
            if (piece.color === 'w') {
              el.style.color = theme.whiteColor;
              el.style.textShadow = `-1px 0 ${theme.whiteStroke}, 0 1px ${theme.whiteStroke}, 1px 0 ${theme.whiteStroke}, 0 -1px ${theme.whiteStroke}`;
            } else {
              el.style.color = theme.blackColor;
              el.style.textShadow = `-1px 0 ${theme.blackStroke}, 0 1px ${theme.blackStroke}, 1px 0 ${theme.blackStroke}, 0 -1px ${theme.blackStroke}`;
            }
          }

          sq.appendChild(el);
        }
      }
    }
  }

  // ─── Interaction ─────────────────────────────────────────

  onSquareClick(sq) {
    if (!this.enabled) return;
    const squareName = sq.dataset.square;
    if (!squareName) return;

    const piece = this.game.getPieceAt(squareName);

    if (this.selectedSquare) {
      // Already have a selection
      if (squareName === this.selectedSquare) {
        this.deselect();
        return;
      }

      // Clicking own piece -> switch selection
      if (piece && piece.color === this.game.turn && this.game.isPlayerTurn()) {
        this.selectSquare(squareName);
        return;
      }

      // Try to move
      const isLegal = this.legalMoves.some(m => m.to === squareName);
      if (isLegal) {
        this.executeMove(this.selectedSquare, squareName);
      } else {
        this.deselect();
      }
    } else {
      // Nothing selected - select a piece
      if (piece && piece.color === this.game.turn && this.game.isPlayerTurn()) {
        this.selectSquare(squareName);
      }
    }
  }

  selectSquare(square) {
    this.deselect();
    this.selectedSquare = square;
    this.legalMoves = this.game.getLegalMoves(square);

    this.highlightSquare(square, 'selected');
    for (const move of this.legalMoves) {
      const type = move.captured ? 'capture' : 'legalMove';
      this.highlightSquare(move.to, type);
    }
  }

  deselect() {
    this.clearAllHighlights();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.showLastMoveHighlight();
    this.showCheckHighlight();
  }

  async executeMove(from, to) {
    if (this.game.needsPromotion(from, to)) {
      this.enabled = false;
      if (this.onPromotionNeeded) {
        const promotion = await this.onPromotionNeeded(this.game.turn);
        if (promotion) {
          await this.doMove(from, to, promotion);
        }
        this.enabled = true;
      }
      return;
    }
    await this.doMove(from, to);
  }

  async doMove(from, to, promotion = null) {
    this.clearAllHighlights();

    const result = this.game.makeMove(from, to, promotion);
    if (result) {
      // Play cinematic animation when a queen is captured
      if (result.captured === 'q') {
        this.syncPieces();
        await this.captureAnim.play(result.piece, result.color);
      }

      this.syncPieces();
      this.showLastMoveHighlight();
      this.showCheckHighlight();

      this.selectedSquare = null;
      this.legalMoves = [];

      if (this.onMoveMade) this.onMoveMade(result);
    }
  }

  // ─── Highlights ──────────────────────────────────────────

  highlightSquare(squareName, type) {
    const sq = this.getSquareElement(squareName);
    if (!sq) return;

    const hl = document.createElement('div');
    hl.className = `highlight highlight-${type}`;

    const style = HIGHLIGHT_COLORS[type];
    if (style.includes('gradient')) {
      hl.style.background = style;
    } else {
      hl.style.backgroundColor = style;
    }

    sq.appendChild(hl);
  }

  clearAllHighlights() {
    this.container.querySelectorAll('.highlight').forEach(h => h.remove());
  }

  showLastMoveHighlight() {
    if (this.game.moveHistory.length > 0) {
      const last = this.game.moveHistory[this.game.moveHistory.length - 1];
      this.highlightSquare(last.from, 'lastMove');
      this.highlightSquare(last.to, 'lastMove');
    }
  }

  showCheckHighlight() {
    if (this.game.isCheck()) {
      const board = this.game.board;
      const kingColor = this.game.turn;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece && piece.type === 'k' && piece.color === kingColor) {
            const square = String.fromCharCode(97 + col) + (8 - row);
            this.highlightSquare(square, 'check');
            return;
          }
        }
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  getSquareElement(squareName) {
    for (const sq of this.squares.values()) {
      if (sq.dataset.square === squareName) return sq;
    }
    return null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.deselect();
  }

  flip() {
    this.flipped = !this.flipped;
    this.renderBoard();
    this.deselect();
  }

  setBoardTheme(themeName) {
    const theme = BOARD_THEMES[themeName];
    if (theme) {
      this.boardTheme = theme;
      this.renderBoard();
    }
  }

  setPieceTheme(themeName) {
    const theme = PIECE_THEMES[themeName];
    if (theme) {
      this.pieceTheme = theme;
      this.syncPieces();
    }
  }

  refresh() {
    this.syncPieces();
    this.deselect();
  }
}
