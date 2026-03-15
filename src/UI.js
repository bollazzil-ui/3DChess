import { BOARD_THEMES, PIECE_THEMES } from './themes.js';

const PIECE_UNICODE = {
  w: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
};

/**
 * UI overlay manager for game information display.
 */
export class UI {
  constructor(container) {
    this.container = container;
    this.elements = {};
    this.onNewGame = null;
    this.onUndo = null;
    this.onFlipBoard = null;
    this.onSettings = null;
    this.onSettingsApply = null;
    this.promotionResolve = null;

    this.build();
  }

  build() {
    this.container.innerHTML = '';
    this.createTopBar();
    this.createLeftPanel();
    this.createRightPanel();
    this.createBottomBar();
  }

  createTopBar() {
    const bar = document.createElement('div');
    bar.className = 'top-bar';

    bar.innerHTML = `
      <div class="game-title">Chess</div>
      <div class="turn-indicator">
        <div class="turn-color-dot white" id="turn-dot"></div>
        <span id="turn-text">White's Turn</span>
      </div>
    `;

    this.container.appendChild(bar);
    this.elements.turnDot = bar.querySelector('#turn-dot');
    this.elements.turnText = bar.querySelector('#turn-text');
  }

  createLeftPanel() {
    const panel = document.createElement('div');
    panel.className = 'side-panel left';
    panel.innerHTML = `
      <div class="panel-title">Captured</div>
      <div class="captured-group">
        <div class="captured-label">By White</div>
        <div class="captured-pieces" id="captured-by-white"></div>
      </div>
      <div class="captured-group">
        <div class="captured-label">By Black</div>
        <div class="captured-pieces" id="captured-by-black"></div>
      </div>
    `;

    this.container.appendChild(panel);
    this.elements.capturedByWhite = panel.querySelector('#captured-by-white');
    this.elements.capturedByBlack = panel.querySelector('#captured-by-black');
  }

  createRightPanel() {
    const panel = document.createElement('div');
    panel.className = 'side-panel right';
    panel.innerHTML = `
      <div class="panel-title">Moves</div>
      <div class="move-list" id="move-list"></div>
    `;

    this.container.appendChild(panel);
    this.elements.moveList = panel.querySelector('#move-list');
  }

  createBottomBar() {
    const bar = document.createElement('div');
    bar.className = 'bottom-bar';

    const btnNew = this.createButton('New Game', 'primary', () => this.onNewGame && this.onNewGame());
    const btnUndo = this.createButton('Undo', '', () => this.onUndo && this.onUndo());
    const btnFlip = this.createButton('Flip Board', '', () => this.onFlipBoard && this.onFlipBoard());
    const btnSettings = this.createButton('Settings', '', () => this.onSettings && this.onSettings());

    bar.appendChild(btnNew);
    bar.appendChild(btnUndo);
    bar.appendChild(btnFlip);
    bar.appendChild(btnSettings);

    this.container.appendChild(bar);
  }

  createButton(text, className, onClick) {
    const btn = document.createElement('button');
    btn.className = `btn ${className}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  updateTurn(color) {
    this.elements.turnDot.className = `turn-color-dot ${color === 'w' ? 'white' : 'black'}`;
    this.elements.turnText.textContent = color === 'w' ? "White's Turn" : "Black's Turn";
  }

  updateCaptured(captured) {
    const renderPieces = (pieces, color) => {
      const order = ['q', 'r', 'b', 'n', 'p'];
      let html = '';
      for (const type of order) {
        if (pieces[type]) {
          for (let i = 0; i < pieces[type]; i++) {
            html += `<span>${PIECE_UNICODE[color][type]}</span>`;
          }
        }
      }
      return html;
    };

    // "Captured by white" = black pieces captured
    this.elements.capturedByWhite.innerHTML = renderPieces(captured.b, 'b');
    // "Captured by black" = white pieces captured
    this.elements.capturedByBlack.innerHTML = renderPieces(captured.w, 'w');
  }

  updateMoveHistory(moves) {
    let html = '';
    for (const move of moves) {
      html += `
        <div class="move-row">
          <span class="move-number">${move.number}.</span>
          <span class="move-white">${move.white}</span>
          <span class="move-black">${move.black}</span>
        </div>
      `;
    }
    this.elements.moveList.innerHTML = html;
    this.elements.moveList.scrollTop = this.elements.moveList.scrollHeight;
  }

  showGameOver(result) {
    const overlay = document.createElement('div');
    overlay.className = 'game-status-overlay';
    overlay.innerHTML = `
      <h2>${result.type === 'checkmate' ? 'Checkmate!' : 'Game Over'}</h2>
      <p>${result.message}</p>
    `;

    const btnNew = this.createButton('New Game', 'primary', () => {
      overlay.remove();
      if (this.onNewGame) this.onNewGame();
    });
    overlay.appendChild(btnNew);

    this.container.appendChild(overlay);
  }

  showAIThinking(show) {
    let indicator = this.container.querySelector('.ai-thinking');
    if (show && !indicator) {
      indicator = document.createElement('div');
      indicator.className = 'ai-thinking';
      indicator.innerHTML = '<div class="spinner"></div><span>AI is thinking...</span>';
      this.container.appendChild(indicator);
    } else if (!show && indicator) {
      indicator.remove();
    }
  }

  /**
   * Show promotion dialog and return the chosen piece type.
   */
  showPromotionDialog(color) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'promotion-modal';
      modal.innerHTML = `<h3>Promote Pawn To:</h3><div class="promotion-options"></div>`;

      const options = modal.querySelector('.promotion-options');
      const pieces = ['q', 'r', 'b', 'n'];

      for (const type of pieces) {
        const btn = document.createElement('div');
        btn.className = 'promotion-option';
        btn.textContent = PIECE_UNICODE[color][type];
        btn.addEventListener('click', () => {
          modal.remove();
          resolve(type);
        });
        options.appendChild(btn);
      }

      this.container.appendChild(modal);
    });
  }

  showSettings(currentBoardTheme, currentPieceTheme, gameMode, aiDifficulty) {
    // Remove existing
    const existing = this.container.querySelector('.settings-panel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.className = 'settings-panel';

    const boardOptions = Object.entries(BOARD_THEMES)
      .map(([k, v]) => `<option value="${k}" ${k === currentBoardTheme ? 'selected' : ''}>${v.name}</option>`)
      .join('');

    const pieceOptions = Object.entries(PIECE_THEMES)
      .map(([k, v]) => `<option value="${k}" ${k === currentPieceTheme ? 'selected' : ''}>${v.name}</option>`)
      .join('');

    panel.innerHTML = `
      <h2>Settings</h2>
      <div class="setting-group">
        <label>Game Mode</label>
        <select id="setting-mode">
          <option value="ai" ${gameMode === 'ai' ? 'selected' : ''}>vs AI</option>
          <option value="local" ${gameMode === 'local' ? 'selected' : ''}>Local 2-Player</option>
        </select>
      </div>
      <div class="setting-group">
        <label>AI Difficulty</label>
        <select id="setting-difficulty">
          <option value="1" ${aiDifficulty === 1 ? 'selected' : ''}>Easy (Depth 1)</option>
          <option value="2" ${aiDifficulty === 2 ? 'selected' : ''}>Medium (Depth 2)</option>
          <option value="3" ${aiDifficulty === 3 ? 'selected' : ''}>Hard (Depth 3)</option>
          <option value="4" ${aiDifficulty === 4 ? 'selected' : ''}>Expert (Depth 4)</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Board Theme</label>
        <select id="setting-board">${boardOptions}</select>
      </div>
      <div class="setting-group">
        <label>Piece Theme</label>
        <select id="setting-pieces">${pieceOptions}</select>
      </div>
      <div class="settings-actions">
        <button class="btn primary" id="settings-apply">Apply</button>
        <button class="btn" id="settings-close">Close</button>
      </div>
    `;

    panel.querySelector('#settings-apply').addEventListener('click', () => {
      const settings = {
        gameMode: panel.querySelector('#setting-mode').value,
        aiDifficulty: parseInt(panel.querySelector('#setting-difficulty').value),
        boardTheme: panel.querySelector('#setting-board').value,
        pieceTheme: panel.querySelector('#setting-pieces').value,
      };
      panel.remove();
      if (this.onSettingsApply) this.onSettingsApply(settings);
    });

    panel.querySelector('#settings-close').addEventListener('click', () => {
      panel.remove();
    });

    this.container.appendChild(panel);
  }
}
