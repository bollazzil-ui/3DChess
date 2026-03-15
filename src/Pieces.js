import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECE_THEMES } from './themes.js';
import { Game } from './Game.js';

/**
 * Chess piece 3D renderer.
 * Creates pieces using procedural LatheGeometry by default,
 * or loads custom GLTF models if specified in the theme.
 */
export class Pieces {
  constructor(scene, board) {
    this.sceneManager = scene;
    this.board = board;
    this.group = new THREE.Group();
    this.pieces = new Map(); // 'a1' -> { mesh, piece }
    this.theme = PIECE_THEMES.classic;
    this.gltfLoader = new GLTFLoader();
    this.customModels = new Map(); // piece type -> geometry
    this.geometryCache = new Map(); // cache for procedural geometries

    scene.add(this.group);
  }

  /**
   * Load custom piece models from URLs.
   * @param {Object} modelMap - { k: 'url', q: 'url', ... }
   * @returns {Promise}
   */
  async loadCustomModels(modelMap) {
    this.customModels.clear();
    const promises = [];
    for (const [type, url] of Object.entries(modelMap)) {
      const p = new Promise((resolve, reject) => {
        this.gltfLoader.load(
          url,
          (gltf) => {
            const model = gltf.scene;
            // Normalize model scale
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const targetHeight = this.getPieceHeight(type);
            const scale = targetHeight / maxDim;
            model.scale.setScalar(scale);
            this.customModels.set(type, model);
            resolve();
          },
          undefined,
          reject
        );
      });
      promises.push(p);
    }
    await Promise.all(promises);
  }

  getPieceHeight(type) {
    const heights = { p: 0.5, r: 0.6, n: 0.65, b: 0.7, q: 0.8, k: 0.85 };
    return heights[type] || 0.6;
  }

  /**
   * Sync 3D pieces with the current game board state.
   */
  syncWithBoard(game) {
    // Remove all existing pieces
    this.clearPieces();

    const boardState = game.board;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece) {
          const square = String.fromCharCode(97 + col) + (8 - row);
          this.addPiece(square, piece.type, piece.color);
        }
      }
    }
  }

  addPiece(square, type, color) {
    let mesh;

    if (this.customModels.has(type)) {
      mesh = this.customModels.get(type).clone();
      // Apply material
      const matProps = color === 'w' ? this.theme.whiteMaterial : this.theme.blackMaterial;
      const material = new THREE.MeshStandardMaterial(matProps);
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    } else {
      mesh = this.createProceduralPiece(type, color);
    }

    const pos = this.board.getSquarePosition(square);
    mesh.position.set(pos.x, 0, pos.z);
    mesh.userData.square = square;
    mesh.userData.pieceType = type;
    mesh.userData.pieceColor = color;

    this.group.add(mesh);
    this.pieces.set(square, { mesh, type, color });
  }

  removePiece(square) {
    const entry = this.pieces.get(square);
    if (entry) {
      this.group.remove(entry.mesh);
      this.disposeMesh(entry.mesh);
      this.pieces.delete(square);
    }
  }

  clearPieces() {
    for (const [, entry] of this.pieces) {
      this.group.remove(entry.mesh);
      this.disposeMesh(entry.mesh);
    }
    this.pieces.clear();
  }

  disposeMesh(mesh) {
    mesh.traverse((child) => {
      if (child.isMesh) {
        // Don't dispose cached geometries
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
  }

  /**
   * Get all piece meshes for raycasting.
   */
  getPieceMeshes() {
    const meshes = [];
    for (const [, entry] of this.pieces) {
      entry.mesh.traverse((child) => {
        if (child.isMesh) {
          child.userData.square = entry.mesh.userData.square;
          child.userData.pieceType = entry.mesh.userData.pieceType;
          child.userData.pieceColor = entry.mesh.userData.pieceColor;
          meshes.push(child);
        }
      });
    }
    return meshes;
  }

  /**
   * Animate a piece moving from one square to another.
   */
  animateMove(from, to, capturedSquare = null) {
    return new Promise((resolve) => {
      const entry = this.pieces.get(from);
      if (!entry) { resolve(); return; }

      const startPos = entry.mesh.position.clone();
      const endPos3D = this.board.getSquarePosition(to);
      const endPos = new THREE.Vector3(endPos3D.x, 0, endPos3D.z);

      // Remove captured piece
      if (capturedSquare) {
        this.removePiece(capturedSquare);
      }

      const duration = 300;
      const startTime = performance.now();
      const arcHeight = 0.5;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        entry.mesh.position.lerpVectors(startPos, endPos, ease);
        // Arc movement
        entry.mesh.position.y = Math.sin(ease * Math.PI) * arcHeight;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          entry.mesh.position.set(endPos.x, 0, endPos.z);
          // Update piece map
          this.pieces.delete(from);
          entry.mesh.userData.square = to;
          this.pieces.set(to, entry);
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Create a procedural chess piece using LatheGeometry.
   */
  createProceduralPiece(type, color) {
    const cacheKey = `${type}_${color}`;
    let geometry = this.geometryCache.get(type);

    if (!geometry) {
      const profile = this.getPieceProfile(type);
      geometry = new THREE.LatheGeometry(profile, 32);
      geometry.computeVertexNormals();
      this.geometryCache.set(type, geometry);
    }

    const matProps = color === 'w' ? this.theme.whiteMaterial : this.theme.blackMaterial;
    const material = new THREE.MeshStandardMaterial({ ...matProps });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Get the 2D profile points for a chess piece (for LatheGeometry).
   * Points define the outline from bottom to top, rotated around Y axis.
   */
  getPieceProfile(type) {
    switch (type) {
      case 'p': return this.pawnProfile();
      case 'r': return this.rookProfile();
      case 'n': return this.knightProfile();
      case 'b': return this.bishopProfile();
      case 'q': return this.queenProfile();
      case 'k': return this.kingProfile();
      default: return this.pawnProfile();
    }
  }

  pawnProfile() {
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.22, 0),
      new THREE.Vector2(0.24, 0.01),
      new THREE.Vector2(0.24, 0.03),
      new THREE.Vector2(0.20, 0.05),
      new THREE.Vector2(0.12, 0.08),
      new THREE.Vector2(0.10, 0.15),
      new THREE.Vector2(0.09, 0.22),
      new THREE.Vector2(0.10, 0.25),
      new THREE.Vector2(0.14, 0.27),
      new THREE.Vector2(0.14, 0.29),
      new THREE.Vector2(0.10, 0.31),
      new THREE.Vector2(0.08, 0.35),
      new THREE.Vector2(0.12, 0.40),
      new THREE.Vector2(0.12, 0.42),
      new THREE.Vector2(0.08, 0.44),
      new THREE.Vector2(0.04, 0.48),
      new THREE.Vector2(0, 0.50),
    ];
  }

  rookProfile() {
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.26, 0),
      new THREE.Vector2(0.28, 0.01),
      new THREE.Vector2(0.28, 0.04),
      new THREE.Vector2(0.22, 0.06),
      new THREE.Vector2(0.14, 0.10),
      new THREE.Vector2(0.12, 0.18),
      new THREE.Vector2(0.11, 0.30),
      new THREE.Vector2(0.12, 0.38),
      new THREE.Vector2(0.14, 0.40),
      new THREE.Vector2(0.18, 0.41),
      new THREE.Vector2(0.18, 0.44),
      new THREE.Vector2(0.20, 0.44),
      new THREE.Vector2(0.20, 0.50),
      new THREE.Vector2(0.16, 0.50),
      new THREE.Vector2(0.16, 0.48),
      new THREE.Vector2(0.12, 0.48),
      new THREE.Vector2(0.12, 0.50),
      new THREE.Vector2(0.08, 0.50),
      new THREE.Vector2(0.08, 0.48),
      new THREE.Vector2(0.04, 0.48),
      new THREE.Vector2(0.04, 0.50),
      new THREE.Vector2(0, 0.50),
    ];
  }

  knightProfile() {
    // Knight uses a different approach - we'll use ExtrudeGeometry for better shape
    // But for LatheGeometry, approximate the silhouette
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.24, 0),
      new THREE.Vector2(0.26, 0.01),
      new THREE.Vector2(0.26, 0.04),
      new THREE.Vector2(0.20, 0.06),
      new THREE.Vector2(0.13, 0.10),
      new THREE.Vector2(0.11, 0.20),
      new THREE.Vector2(0.10, 0.28),
      new THREE.Vector2(0.12, 0.32),
      new THREE.Vector2(0.16, 0.36),
      new THREE.Vector2(0.18, 0.42),
      new THREE.Vector2(0.16, 0.50),
      new THREE.Vector2(0.14, 0.56),
      new THREE.Vector2(0.10, 0.60),
      new THREE.Vector2(0.06, 0.63),
      new THREE.Vector2(0, 0.65),
    ];
  }

  bishopProfile() {
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.24, 0),
      new THREE.Vector2(0.26, 0.01),
      new THREE.Vector2(0.26, 0.04),
      new THREE.Vector2(0.20, 0.06),
      new THREE.Vector2(0.13, 0.10),
      new THREE.Vector2(0.11, 0.20),
      new THREE.Vector2(0.10, 0.30),
      new THREE.Vector2(0.12, 0.35),
      new THREE.Vector2(0.14, 0.37),
      new THREE.Vector2(0.14, 0.39),
      new THREE.Vector2(0.10, 0.42),
      new THREE.Vector2(0.08, 0.48),
      new THREE.Vector2(0.12, 0.54),
      new THREE.Vector2(0.12, 0.58),
      new THREE.Vector2(0.08, 0.62),
      new THREE.Vector2(0.04, 0.66),
      new THREE.Vector2(0.02, 0.68),
      new THREE.Vector2(0, 0.70),
    ];
  }

  queenProfile() {
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.26, 0),
      new THREE.Vector2(0.28, 0.01),
      new THREE.Vector2(0.28, 0.05),
      new THREE.Vector2(0.22, 0.07),
      new THREE.Vector2(0.14, 0.12),
      new THREE.Vector2(0.12, 0.22),
      new THREE.Vector2(0.11, 0.32),
      new THREE.Vector2(0.12, 0.38),
      new THREE.Vector2(0.14, 0.40),
      new THREE.Vector2(0.16, 0.42),
      new THREE.Vector2(0.16, 0.44),
      new THREE.Vector2(0.12, 0.46),
      new THREE.Vector2(0.09, 0.50),
      new THREE.Vector2(0.10, 0.54),
      new THREE.Vector2(0.15, 0.58),
      new THREE.Vector2(0.16, 0.62),
      new THREE.Vector2(0.12, 0.66),
      new THREE.Vector2(0.08, 0.70),
      new THREE.Vector2(0.10, 0.72),
      new THREE.Vector2(0.10, 0.74),
      new THREE.Vector2(0.06, 0.76),
      new THREE.Vector2(0.03, 0.78),
      new THREE.Vector2(0.04, 0.80),
      new THREE.Vector2(0, 0.80),
    ];
  }

  kingProfile() {
    return [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.28, 0),
      new THREE.Vector2(0.30, 0.01),
      new THREE.Vector2(0.30, 0.05),
      new THREE.Vector2(0.24, 0.07),
      new THREE.Vector2(0.15, 0.12),
      new THREE.Vector2(0.13, 0.22),
      new THREE.Vector2(0.12, 0.32),
      new THREE.Vector2(0.13, 0.38),
      new THREE.Vector2(0.15, 0.40),
      new THREE.Vector2(0.17, 0.42),
      new THREE.Vector2(0.17, 0.44),
      new THREE.Vector2(0.13, 0.47),
      new THREE.Vector2(0.10, 0.52),
      new THREE.Vector2(0.12, 0.56),
      new THREE.Vector2(0.16, 0.60),
      new THREE.Vector2(0.16, 0.64),
      new THREE.Vector2(0.12, 0.68),
      new THREE.Vector2(0.08, 0.72),
      new THREE.Vector2(0.06, 0.74),
      new THREE.Vector2(0.08, 0.76),
      new THREE.Vector2(0.08, 0.78),
      // Cross on top
      new THREE.Vector2(0.03, 0.78),
      new THREE.Vector2(0.03, 0.82),
      new THREE.Vector2(0.06, 0.82),
      new THREE.Vector2(0.06, 0.84),
      new THREE.Vector2(0.03, 0.84),
      new THREE.Vector2(0.03, 0.88),
      new THREE.Vector2(0, 0.88),
    ];
  }

  setTheme(themeName) {
    const theme = PIECE_THEMES[themeName];
    if (theme) {
      this.theme = theme;
      this.geometryCache.clear();
      // If theme has custom models, load them
      if (theme.pieceModels) {
        return this.loadCustomModels(theme.pieceModels);
      }
      this.customModels.clear();
    }
    return Promise.resolve();
  }
}
