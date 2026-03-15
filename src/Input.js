import * as THREE from 'three';

/**
 * Handles mouse/touch input, raycasting for piece selection,
 * and move execution.
 */
export class Input {
  constructor(scene, board, pieces, game) {
    this.sceneManager = scene;
    this.board = board;
    this.pieces = pieces;
    this.game = game;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.enabled = true;
    this.isAnimating = false;

    // Callbacks
    this.onPieceSelected = null;
    this.onMoveMade = null;
    this.onPromotionNeeded = null;

    this.bindEvents();
  }

  bindEvents() {
    const canvas = this.sceneManager.canvas;
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('touchend', (e) => this.onTouch(e));
  }

  onClick(event) {
    if (!this.enabled || this.isAnimating) return;
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.handleInput();
  }

  onTouch(event) {
    if (!this.enabled || this.isAnimating) return;
    if (event.changedTouches.length === 0) return;
    const touch = event.changedTouches[0];
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    this.handleInput();
  }

  handleInput() {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    // First check if we clicked on a piece
    const pieceMeshes = this.pieces.getPieceMeshes();
    const pieceHits = this.raycaster.intersectObjects(pieceMeshes, false);

    // Then check squares
    const squareMeshes = this.board.getSquareMeshes();
    const squareHits = this.raycaster.intersectObjects(squareMeshes, false);

    let clickedSquare = null;
    let clickedPiece = null;

    if (pieceHits.length > 0) {
      const hit = pieceHits[0].object;
      clickedSquare = hit.userData.square;
      clickedPiece = { type: hit.userData.pieceType, color: hit.userData.pieceColor };
    } else if (squareHits.length > 0) {
      clickedSquare = squareHits[0].object.userData.square;
    }

    if (!clickedSquare) return;

    if (this.selectedSquare) {
      // A piece is already selected
      if (clickedSquare === this.selectedSquare) {
        // Deselect
        this.deselect();
        return;
      }

      // Check if clicking on own piece to switch selection
      if (clickedPiece && clickedPiece.color === this.game.turn) {
        this.selectSquare(clickedSquare);
        return;
      }

      // Check if this is a legal move
      const isLegal = this.legalMoves.some(m => m.to === clickedSquare);
      if (isLegal) {
        this.executeMove(this.selectedSquare, clickedSquare);
      } else {
        this.deselect();
      }
    } else {
      // No piece selected - try to select one
      if (clickedPiece && clickedPiece.color === this.game.turn && this.game.isPlayerTurn()) {
        this.selectSquare(clickedSquare);
      }
    }
  }

  selectSquare(square) {
    this.deselect();
    this.selectedSquare = square;
    this.legalMoves = this.game.getLegalMoves(square);

    // Highlight selected square
    this.board.highlightSquare(square, 'selected');

    // Highlight legal moves
    for (const move of this.legalMoves) {
      const type = move.captured ? 'capture' : 'legalMove';
      this.board.highlightSquare(move.to, type);
    }

    if (this.onPieceSelected) this.onPieceSelected(square);
  }

  deselect() {
    this.board.clearAllHighlights();
    this.selectedSquare = null;
    this.legalMoves = [];
    // Re-show last move and check highlights
    this.showLastMoveHighlight();
    this.showCheckHighlight();
  }

  async executeMove(from, to) {
    // Check if promotion is needed
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
    this.board.clearAllHighlights();
    this.isAnimating = true;

    // Determine capture square (for en passant, the captured piece is on a different square)
    const move = this.game.getLegalMoves(from).find(m => m.to === to);
    let capturedSquare = null;
    if (move && move.captured) {
      capturedSquare = to;
      // En passant: captured pawn is on a different square
      if (move.flags.includes('e')) {
        const direction = this.game.turn === 'w' ? -1 : 1;
        const capturedRow = parseInt(to[1]) + direction;
        capturedSquare = to[0] + capturedRow;
      }
    }

    const result = this.game.makeMove(from, to, promotion);
    if (result) {
      // Handle castling - move the rook too
      if (result.flags.includes('k') || result.flags.includes('q')) {
        await this.animateCastling(result);
      } else {
        await this.pieces.animateMove(from, to, capturedSquare);
      }

      // Handle promotion - replace pawn with promoted piece
      if (result.promotion) {
        this.pieces.removePiece(to);
        this.pieces.addPiece(to, result.promotion, result.color);
      }

      // Show highlights for last move
      this.showLastMoveHighlight();
      this.showCheckHighlight();

      this.selectedSquare = null;
      this.legalMoves = [];
      this.isAnimating = false;

      if (this.onMoveMade) this.onMoveMade(result);
    } else {
      this.isAnimating = false;
    }
  }

  async animateCastling(result) {
    const row = result.color === 'w' ? '1' : '8';
    const isKingside = result.flags.includes('k');

    const kingFrom = 'e' + row;
    const kingTo = (isKingside ? 'g' : 'c') + row;
    const rookFrom = (isKingside ? 'h' : 'a') + row;
    const rookTo = (isKingside ? 'f' : 'd') + row;

    await Promise.all([
      this.pieces.animateMove(kingFrom, kingTo),
      this.pieces.animateMove(rookFrom, rookTo),
    ]);
  }

  showLastMoveHighlight() {
    if (this.game.moveHistory.length > 0) {
      const last = this.game.moveHistory[this.game.moveHistory.length - 1];
      this.board.highlightSquare(last.from, 'lastMove');
      this.board.highlightSquare(last.to, 'lastMove');
    }
  }

  showCheckHighlight() {
    if (this.game.isCheck()) {
      // Find the king's position
      const board = this.game.board;
      const kingColor = this.game.turn;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece && piece.type === 'k' && piece.color === kingColor) {
            const square = String.fromCharCode(97 + col) + (8 - row);
            this.board.highlightSquare(square, 'check');
            return;
          }
        }
      }
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.deselect();
  }
}
