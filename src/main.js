import { BoardView } from './BoardView.js';
import { Game } from './Game.js';
import { ChessAI } from './AI.js';
import { UI } from './UI.js';

/**
 * Main application - ties all components together.
 */
class ChessApp {
  constructor() {
    this.currentBoardTheme = 'classic';
    this.currentPieceTheme = 'classic';

    this.init();
  }

  init() {
    const boardContainer = document.getElementById('board-container');
    const uiContainer = document.getElementById('ui-overlay');

    this.game = new Game();
    this.ai = new ChessAI(this.game);
    this.boardView = new BoardView(boardContainer, this.game);
    this.ui = new UI(uiContainer);

    this.setupCallbacks();

    this.ui.updateTurn(this.game.turn);
    this.ui.updateCaptured(this.game.getCapturedPieces());
  }

  setupCallbacks() {
    this.boardView.onMoveMade = (move) => this.onMoveMade(move);
    this.boardView.onPromotionNeeded = (color) => this.ui.showPromotionDialog(color);

    this.game.onGameOver = (result) => {
      this.boardView.setEnabled(false);
      this.ui.showGameOver(result);
    };

    this.ui.onNewGame = () => this.newGame();
    this.ui.onUndo = () => this.undo();
    this.ui.onFlipBoard = () => this.boardView.flip();
    this.ui.onSettings = () => this.showSettings();
    this.ui.onSettingsApply = (settings) => this.applySettings(settings);
  }

  async onMoveMade(move) {
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory(this.game.getFormattedHistory());
    this.ui.updateCaptured(this.game.getCapturedPieces());

    if (this.game.gameMode === 'ai' && !this.game.isPlayerTurn() && !this.game.isGameOver()) {
      this.boardView.setEnabled(false);
      this.ui.showAIThinking(true);

      try {
        const aiMove = await this.ai.getBestMove(this.game.aiDifficulty);
        if (aiMove && !this.game.isGameOver()) {
          await this.boardView.doMove(aiMove.from, aiMove.to, aiMove.promotion || null);
          this.ui.updateTurn(this.game.turn);
          this.ui.updateMoveHistory(this.game.getFormattedHistory());
          this.ui.updateCaptured(this.game.getCapturedPieces());
        }
      } catch (e) {
        console.error('AI error:', e);
      }

      this.ui.showAIThinking(false);
      if (!this.game.isGameOver()) {
        this.boardView.setEnabled(true);
      }
    }
  }

  newGame() {
    this.game.reset();
    this.boardView.refresh();
    this.boardView.setEnabled(true);
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory([]);
    this.ui.updateCaptured(this.game.getCapturedPieces());

    const overlay = document.querySelector('.game-status-overlay');
    if (overlay) overlay.remove();
  }

  undo() {
    if (this.game.isGameOver()) return;

    if (this.game.gameMode === 'ai') {
      this.game.undoMove();
      this.game.undoMove();
    } else {
      this.game.undoMove();
    }

    this.boardView.refresh();
    this.ui.updateTurn(this.game.turn);
    this.ui.updateMoveHistory(this.game.getFormattedHistory());
    this.ui.updateCaptured(this.game.getCapturedPieces());
  }

  showSettings() {
    this.ui.showSettings(
      this.currentBoardTheme,
      this.currentPieceTheme,
      this.game.gameMode,
      this.game.aiDifficulty
    );
  }

  applySettings(settings) {
    this.game.gameMode = settings.gameMode;
    this.game.aiDifficulty = settings.aiDifficulty;

    if (settings.boardTheme !== this.currentBoardTheme) {
      this.currentBoardTheme = settings.boardTheme;
      this.boardView.setBoardTheme(settings.boardTheme);
    }

    if (settings.pieceTheme !== this.currentPieceTheme) {
      this.currentPieceTheme = settings.pieceTheme;
      this.boardView.setPieceTheme(settings.pieceTheme);
    }
  }
}

new ChessApp();
