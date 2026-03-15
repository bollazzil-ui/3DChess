import * as THREE from 'three';
import { BOARD_THEMES, HIGHLIGHT_COLORS } from './themes.js';

/**
 * 3D Chess board renderer.
 * Creates the board geometry and manages square highlights.
 * Supports per-theme decorations (e.g. football pitch markings).
 */
export class Board {
  constructor(scene) {
    this.sceneManager = scene;
    this.group = new THREE.Group();
    this.squares = new Map();
    this.highlights = new Map();
    this.theme = BOARD_THEMES.classic;

    this.squareSize = 1;
    this.boardOffset = -3.5 * this.squareSize;

    this.build();
    scene.add(this.group);
  }

  build() {
    this.clearBoard();
    this.createBorder();
    this.createSquares();
    if (this.theme.decoration === 'football') {
      this.createFootballLines();
    }
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
    const roughness = this.theme.squareRoughness ?? 0.7;
    const metalness = this.theme.squareMetalness ?? 0.05;

    const lightMat = new THREE.MeshStandardMaterial({
      color: this.theme.lightSquare,
      roughness,
      metalness,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: this.theme.darkSquare,
      roughness,
      metalness,
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

  /**
   * Draw football pitch markings over the board using a canvas texture on a plane.
   */
  createFootballLines() {
    const boardWorld = 8 * this.squareSize;
    const res = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, res, res);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 4;

    const pad = 20; // small padding inside board edge

    // Outer boundary
    ctx.strokeRect(pad, pad, res - 2 * pad, res - 2 * pad);

    // Half-way line (horizontal since z is the long axis of a pitch)
    ctx.beginPath();
    ctx.moveTo(pad, res / 2);
    ctx.lineTo(res - pad, res / 2);
    ctx.stroke();

    // Centre circle
    const centerR = res * 0.12;
    ctx.beginPath();
    ctx.arc(res / 2, res / 2, centerR, 0, Math.PI * 2);
    ctx.stroke();

    // Centre spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(res / 2, res / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas (top and bottom)
    const penW = res * 0.44; // width of penalty box
    const penH = res * 0.16; // depth of penalty box
    const penX = (res - penW) / 2;

    // Top penalty area
    ctx.strokeRect(penX, pad, penW, penH);
    // Goal area (smaller box inside)
    const goalW = res * 0.22;
    const goalH = res * 0.06;
    const goalX = (res - goalW) / 2;
    ctx.strokeRect(goalX, pad, goalW, goalH);
    // Penalty spot top
    ctx.beginPath();
    ctx.arc(res / 2, pad + penH * 0.72, 5, 0, Math.PI * 2);
    ctx.fill();
    // Penalty arc top
    ctx.beginPath();
    ctx.arc(res / 2, pad + penH * 0.72, centerR * 0.7, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();

    // Bottom penalty area
    ctx.strokeRect(penX, res - pad - penH, penW, penH);
    ctx.strokeRect(goalX, res - pad - goalH, goalW, goalH);
    // Penalty spot bottom
    ctx.beginPath();
    ctx.arc(res / 2, res - pad - penH * 0.72, 5, 0, Math.PI * 2);
    ctx.fill();
    // Penalty arc bottom
    ctx.beginPath();
    ctx.arc(res / 2, res - pad - penH * 0.72, centerR * 0.7, 1.25 * Math.PI, 1.75 * Math.PI);
    ctx.stroke();

    // Corner arcs
    const cornerR = res * 0.03;
    // Top-left
    ctx.beginPath(); ctx.arc(pad, pad, cornerR, 0, Math.PI / 2); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.arc(res - pad, pad, cornerR, Math.PI / 2, Math.PI); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.arc(pad, res - pad, cornerR, -Math.PI / 2, 0); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.arc(res - pad, res - pad, cornerR, Math.PI, 1.5 * Math.PI); ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const planeGeo = new THREE.PlaneGeometry(boardWorld, boardWorld);
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.003;
    this.group.add(plane);
  }

  createLabels() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const labelColor = this.theme.labelColor || '#cccccc';

    const createLabel = (text) => {
      const c = canvas.cloneNode(true);
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 32);

      const texture = new THREE.CanvasTexture(c);
      texture.needsUpdate = true;

      const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.5 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.3, 0.3, 0.3);
      return sprite;
    };

    for (let col = 0; col < 8; col++) {
      const label = createLabel(String.fromCharCode(97 + col));
      label.position.set(
        this.boardOffset + col * this.squareSize + this.squareSize / 2,
        0.01,
        this.boardOffset + 8 * this.squareSize + 0.4
      );
      this.group.add(label);
    }

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

  getSquarePosition(square) {
    const col = square.charCodeAt(0) - 97;
    const row = parseInt(square[1]) - 1;
    return new THREE.Vector3(
      this.boardOffset + col * this.squareSize + this.squareSize / 2,
      0,
      this.boardOffset + (7 - row) * this.squareSize + this.squareSize / 2
    );
  }

  getSquareMeshes() {
    return Array.from(this.squares.values());
  }

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
