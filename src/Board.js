import * as THREE from 'three';
import { BOARD_THEMES, HIGHLIGHT_COLORS } from './themes.js';

/**
 * 3D Chess board renderer.
 * Creates the board geometry and manages square highlights.
 */
export class Board {
  constructor(scene) {
    this.sceneManager = scene;
    this.group = new THREE.Group();
    this.squares = new Map(); // 'a1' -> mesh
    this.highlights = new Map(); // square -> highlight mesh
    this.theme = BOARD_THEMES.classic;

    this.squareSize = 1;
    this.boardOffset = -3.5 * this.squareSize; // Center the board

    this.build();
    scene.add(this.group);
  }

  build() {
    this.clearBoard();
    this.createBorder();
    this.createSquares();
    this.createLabels();
  }

  clearBoard() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.squares.clear();
    this.highlights.clear();
  }

  createBorder() {
    const borderSize = 8 * this.squareSize + 0.6;
    const borderHeight = 0.2;
    const borderGeo = new THREE.BoxGeometry(borderSize, borderHeight, borderSize);
    const borderMat = new THREE.MeshStandardMaterial({
      color: this.theme.borderColor,
      roughness: this.theme.borderRoughness || 0.6,
      metalness: this.theme.borderMetalness || 0.3,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.y = -borderHeight / 2;
    border.receiveShadow = true;
    border.castShadow = true;
    this.group.add(border);
  }

  createSquares() {
    const squareGeo = new THREE.PlaneGeometry(this.squareSize, this.squareSize);
    const lightMat = new THREE.MeshStandardMaterial({
      color: this.theme.lightSquare,
      roughness: 0.7,
      metalness: 0.05,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: this.theme.darkSquare,
      roughness: 0.7,
      metalness: 0.05,
    });

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const square = new THREE.Mesh(squareGeo, isLight ? darkMat : lightMat);
        square.rotation.x = -Math.PI / 2;
        square.position.set(
          this.boardOffset + col * this.squareSize + this.squareSize / 2,
          0.001,
          this.boardOffset + (7 - row) * this.squareSize + this.squareSize / 2
        );
        square.receiveShadow = true;

        const squareName = String.fromCharCode(97 + col) + (row + 1);
        square.userData.square = squareName;
        square.userData.col = col;
        square.userData.row = row;
        this.squares.set(squareName, square);
        this.group.add(square);
      }
    }
  }

  createLabels() {
    // Create text labels for files (a-h) and ranks (1-8)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const createLabel = (text) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = '#cccccc';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas.cloneNode(true));
      const clonedCtx = texture.image.getContext('2d');
      clonedCtx.clearRect(0, 0, 64, 64);
      clonedCtx.fillStyle = '#cccccc';
      clonedCtx.font = 'bold 40px Arial';
      clonedCtx.textAlign = 'center';
      clonedCtx.textBaseline = 'middle';
      clonedCtx.fillText(text, 32, 32);
      texture.needsUpdate = true;

      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.3, 0.3, 0.3);
      return sprite;
    };

    // File labels
    for (let col = 0; col < 8; col++) {
      const label = createLabel(String.fromCharCode(97 + col));
      label.position.set(
        this.boardOffset + col * this.squareSize + this.squareSize / 2,
        0.01,
        this.boardOffset + 8 * this.squareSize + 0.4
      );
      this.group.add(label);
    }

    // Rank labels
    for (let row = 0; row < 8; row++) {
      const label = createLabel(String(row + 1));
      label.position.set(
        this.boardOffset - 0.4,
        0.01,
        this.boardOffset + (7 - row) * this.squareSize + this.squareSize / 2
      );
      this.group.add(label);
    }
  }

  /**
   * Get 3D world position for a board square.
   */
  getSquarePosition(square) {
    const col = square.charCodeAt(0) - 97;
    const row = parseInt(square[1]) - 1;
    return new THREE.Vector3(
      this.boardOffset + col * this.squareSize + this.squareSize / 2,
      0,
      this.boardOffset + (7 - row) * this.squareSize + this.squareSize / 2
    );
  }

  /**
   * Get all square meshes for raycasting.
   */
  getSquareMeshes() {
    return Array.from(this.squares.values());
  }

  /**
   * Highlight a square with a given type.
   */
  highlightSquare(square, type) {
    this.clearHighlight(square);

    const color = HIGHLIGHT_COLORS[type] || HIGHLIGHT_COLORS.legalMove;
    const opacity = type === 'selected' ? 0.4 : type === 'check' ? 0.5 : 0.25;

    const geo = new THREE.PlaneGeometry(this.squareSize * 0.9, this.squareSize * 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const highlight = new THREE.Mesh(geo, mat);
    highlight.rotation.x = -Math.PI / 2;

    const pos = this.getSquarePosition(square);
    highlight.position.set(pos.x, 0.005, pos.z);
    this.group.add(highlight);
    this.highlights.set(square, highlight);

    // For legal moves and captures, also add a dot or ring
    if (type === 'legalMove') {
      const dotGeo = new THREE.CircleGeometry(0.12, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(pos.x, 0.006, pos.z);
      this.group.add(dot);
      highlight.userData.dot = dot;
    }

    if (type === 'capture') {
      const ringGeo = new THREE.RingGeometry(0.35, 0.45, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.006, pos.z);
      this.group.add(ring);
      highlight.userData.ring = ring;
    }
  }

  clearHighlight(square) {
    const existing = this.highlights.get(square);
    if (existing) {
      if (existing.userData.dot) {
        this.group.remove(existing.userData.dot);
        existing.userData.dot.geometry.dispose();
        existing.userData.dot.material.dispose();
      }
      if (existing.userData.ring) {
        this.group.remove(existing.userData.ring);
        existing.userData.ring.geometry.dispose();
        existing.userData.ring.material.dispose();
      }
      this.group.remove(existing);
      existing.geometry.dispose();
      existing.material.dispose();
      this.highlights.delete(square);
    }
  }

  clearAllHighlights() {
    for (const square of this.highlights.keys()) {
      this.clearHighlight(square);
    }
  }

  setTheme(themeName) {
    const theme = BOARD_THEMES[themeName];
    if (theme) {
      this.theme = theme;
      this.build();
    }
  }
}
