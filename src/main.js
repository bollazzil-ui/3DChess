import { Scene } from './Scene.js';
import { Board } from './Board.js';
import { Pieces } from './Pieces.js';
import { Game } from './Game.js';
import { ChessAI } from './AI.js';
import { Input } from './Input.js';
import { UI } from './UI.js';

/**
 * Main application - ties all components together.
 */
class ChessApp {
  constructor() {
    this.currentBoardTheme = 'classic';
    this.currentPieceTheme = 'classic';
    this.cameraColor = 'w';

    this.init();
  }

  init() {
    // Create core components
    const canvas = document.getElementById('chess-canvas');
    const uiContainer = document.getElementById('ui-overlay');

    this.scene = new Scene(canvas);
    this.game = new Game();
    this.ai = new ChessAI(this.game);
    this.board = new Board(this.scene);
    this.pieces = new Pieces(this.scene, this.board);
    this.input = new Input(this.scene, this.board, this.pieces, this.game);
    this.ui = new UI(uiContainer);

    // Setup callbacks
    this.setupCallbacks();

    // Initial board state
    this.pieces.syncWithBoard(this.game);
    this.ui.updateTurn(this.game.turn);
    this.ui.updateCaptured(this.game.getCapturedPieces());
  }

  setupCallbacks() {
    // When a move is made
    this.input.onMoveMade = (move) => this.onMoveMade(move);

    // When promotion is needed
    this.input.onPromotionNeeded = (color) => this.ui.showPromotionDialog(color);

    // Game over
    this.game.onGameOver = (result) => {
      this.input.setEnabled(false);
      this.ui.showGameOver(result);
    };

    // UI callbacks
    this.ui.onNewGame = () => this.newGame();
    this.ui.onUndo = () => this.undo();
    this.ui.onFlipBoard = () => this.flipBoard();
    this.ui.onSettings = () => this.showSettings();
    this.ui.onSettingsApply = (settings) => this.applySettings(settings);
  }

  async onMoveMade(move) {
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory(this.game.getFormattedHistory());
    this.ui.updateCaptured(this.game.getCapturedPieces());

    // Check if it's AI's turn
    if (this.game.gameMode === 'ai' && !this.game.isPlayerTurn() && !this.game.isGameOver()) {
      this.input.setEnabled(false);
      this.ui.showAIThinking(true);

      try {
        const aiMove = await this.ai.getBestMove(this.game.aiDifficulty);
        if (aiMove && !this.game.isGameOver()) {
          await this.input.doMove(aiMove.from, aiMove.to, aiMove.promotion || null);
          this.ui.updateTurn(this.game.turn);
          this.ui.updateMoveHistory(this.game.getFormattedHistory());
          this.ui.updateCaptured(this.game.getCapturedPieces());
        }
      } catch (e) {
        console.error('AI error:', e);
      }

      this.ui.showAIThinking(false);
      if (!this.game.isGameOver()) {
        this.input.setEnabled(true);
      }
    }
  }

  newGame() {
    this.game.reset();
    this.pieces.syncWithBoard(this.game);
    this.input.deselect();
    this.input.setEnabled(true);
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory([]);
    this.ui.updateCaptured(this.game.getCapturedPieces());

    // Remove game over overlay if present
    const overlay = document.querySelector('.game-status-overlay');
    if (overlay) overlay.remove();
  }

  undo() {
    if (this.game.isGameOver()) return;

    // In AI mode, undo two moves (player + AI)
    if (this.game.gameMode === 'ai') {
      this.game.undoMove();
      this.game.undoMove();
    } else {
      this.game.undoMove();
    }

    this.pieces.syncWithBoard(this.game);
    this.input.deselect();
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory(this.game.getFormattedHistory());
    this.ui.updateCaptured(this.game.getCapturedPieces());
  }

  flipBoard() {
    this.cameraColor = this.cameraColor === 'w' ? 'b' : 'w';
    this.scene.setCameraView(this.cameraColor);
  }

  showSettings() {
    this.ui.showSettings(
      this.currentBoardTheme,
      this.currentPieceTheme,
      this.game.gameMode,
      this.game.aiDifficulty
    );
  }

  async applySettings(settings) {
    // Apply game mode and difficulty
    this.game.gameMode = settings.gameMode;
    this.game.aiDifficulty = settings.aiDifficulty;

    // Apply board theme
    if (settings.boardTheme !== this.currentBoardTheme) {
      this.currentBoardTheme = settings.boardTheme;
      this.board.setTheme(settings.boardTheme);
    }

    // Apply piece theme
    if (settings.pieceTheme !== this.currentPieceTheme) {
      this.currentPieceTheme = settings.pieceTheme;
      await this.pieces.setTheme(settings.pieceTheme);
      this.pieces.syncWithBoard(this.game);
    }

    // Re-show highlights
    this.input.deselect();
  }
}

// Start the app
new ChessApp();
