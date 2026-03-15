import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PIECE_THEMES } from './themes.js';

/**
 * Chess piece 3D renderer.
 * Creates highly distinctive pieces using composite Three.js geometries,
 * or loads custom GLTF models if specified in the theme.
 *
 * Each piece type has a unique silhouette:
 *  - Pawn:   small round head on a tapered stem
 *  - Rook:   cylindrical tower with battlements (crenellations)
 *  - Knight: horse-head shape built from extruded curves
 *  - Bishop: tall mitre with a diagonal slit
 *  - Queen:  crown with spike points and an orb on top
 *  - King:   tallest piece with a prominent cross
 */
export class Pieces {
  constructor(scene, board) {
    this.sceneManager = scene;
    this.board = board;
    this.group = new THREE.Group();
    this.pieces = new Map(); // 'a1' -> { mesh, piece }
    this.theme = PIECE_THEMES.classic;
    this.gltfLoader = new GLTFLoader();
    this.customModels = new Map();
    this.geometryCache = new Map();

    scene.add(this.group);
  }

  async loadCustomModels(modelMap) {
    this.customModels.clear();
    const promises = [];
    for (const [type, url] of Object.entries(modelMap)) {
      const p = new Promise((resolve, reject) => {
        this.gltfLoader.load(
          url,
          (gltf) => {
            const model = gltf.scene;
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
    const heights = { p: 0.55, r: 0.7, n: 0.75, b: 0.8, q: 0.9, k: 1.0 };
    return heights[type] || 0.6;
  }

  syncWithBoard(game) {
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
      mesh = this.createPiece(type, color);
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
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
  }

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

  animateMove(from, to, capturedSquare = null) {
    return new Promise((resolve) => {
      const entry = this.pieces.get(from);
      if (!entry) { resolve(); return; }

      const startPos = entry.mesh.position.clone();
      const endPos3D = this.board.getSquarePosition(to);
      const endPos = new THREE.Vector3(endPos3D.x, 0, endPos3D.z);

      if (capturedSquare) this.removePiece(capturedSquare);

      const duration = 300;
      const startTime = performance.now();
      const arcHeight = 0.5;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        entry.mesh.position.lerpVectors(startPos, endPos, ease);
        entry.mesh.position.y = Math.sin(ease * Math.PI) * arcHeight;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          entry.mesh.position.set(endPos.x, 0, endPos.z);
          this.pieces.delete(from);
          entry.mesh.userData.square = to;
          this.pieces.set(to, entry);
          resolve();
        }
      };
      animate();
    });
  }

  // ─── Piece factory ──────────────────────────────────────────

  createPiece(type, color) {
    const matProps = color === 'w' ? this.theme.whiteMaterial : this.theme.blackMaterial;
    const material = new THREE.MeshStandardMaterial({ ...matProps });

    let pieceGroup;
    switch (type) {
      case 'p': pieceGroup = this.buildPawn(material); break;
      case 'r': pieceGroup = this.buildRook(material); break;
      case 'n': pieceGroup = this.buildKnight(material, color); break;
      case 'b': pieceGroup = this.buildBishop(material); break;
      case 'q': pieceGroup = this.buildQueen(material); break;
      case 'k': pieceGroup = this.buildKing(material); break;
      default: pieceGroup = this.buildPawn(material); break;
    }

    return pieceGroup;
  }

  _makeMesh(geometry, material) {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  _lathe(points, segments = 32) {
    const g = new THREE.LatheGeometry(points, segments);
    g.computeVertexNormals();
    return g;
  }

  // ─── PAWN  (height ~0.55) ─────────────────────────────────
  // Short & simple: wide flat base, tapered stem, round ball head.
  buildPawn(material) {
    const g = new THREE.Group();

    // Base disc
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.24, 0.00),
      new THREE.Vector2(0.26, 0.01),
      new THREE.Vector2(0.26, 0.04),
      new THREE.Vector2(0.23, 0.06),
      new THREE.Vector2(0.18, 0.07),
      new THREE.Vector2(0.14, 0.08),
    ]);
    g.add(this._makeMesh(base, material));

    // Tapered stem
    const stem = this._lathe([
      new THREE.Vector2(0.00, 0.08),
      new THREE.Vector2(0.13, 0.08),
      new THREE.Vector2(0.11, 0.12),
      new THREE.Vector2(0.08, 0.22),
      new THREE.Vector2(0.07, 0.30),
      new THREE.Vector2(0.09, 0.34),
      new THREE.Vector2(0.11, 0.35),
      new THREE.Vector2(0.11, 0.37),
      new THREE.Vector2(0.08, 0.38),
    ]);
    g.add(this._makeMesh(stem, material));

    // Round head (sphere)
    const headGeo = new THREE.SphereGeometry(0.10, 20, 16);
    const head = this._makeMesh(headGeo, material);
    head.position.y = 0.48;
    g.add(head);

    return g;
  }

  // ─── ROOK  (height ~0.70) ─────────────────────────────────
  // Stout tower with clearly visible crenellations (battlements) on top.
  buildRook(material) {
    const g = new THREE.Group();

    // Wide base
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.28, 0.00),
      new THREE.Vector2(0.30, 0.01),
      new THREE.Vector2(0.30, 0.05),
      new THREE.Vector2(0.26, 0.07),
      new THREE.Vector2(0.20, 0.08),
    ]);
    g.add(this._makeMesh(base, material));

    // Tower body (cylinder with slight taper)
    const body = this._lathe([
      new THREE.Vector2(0.00, 0.08),
      new THREE.Vector2(0.18, 0.08),
      new THREE.Vector2(0.16, 0.14),
      new THREE.Vector2(0.14, 0.30),
      new THREE.Vector2(0.14, 0.45),
      new THREE.Vector2(0.16, 0.48),
      new THREE.Vector2(0.19, 0.49),
      new THREE.Vector2(0.19, 0.52),
    ]);
    g.add(this._makeMesh(body, material));

    // Battlements – 4 raised merlons around the rim
    const merlonGeo = new THREE.BoxGeometry(0.12, 0.10, 0.08);
    const rimRadius = 0.15;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const merlon = this._makeMesh(merlonGeo, material);
      merlon.position.set(
        Math.cos(angle) * rimRadius,
        0.57,
        Math.sin(angle) * rimRadius
      );
      merlon.rotation.y = angle;
      g.add(merlon);
    }

    // Flat top platform
    const topGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24);
    const top = this._makeMesh(topGeo, material);
    top.position.y = 0.53;
    g.add(top);

    return g;
  }

  // ─── KNIGHT  (height ~0.75) ───────────────────────────────
  // The most distinctive piece: a horse-head built from shaped components.
  // Uses a curved neck + head block + ear + muzzle to get a recognisable horse.
  buildKnight(material, color) {
    const g = new THREE.Group();

    // Base
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.26, 0.00),
      new THREE.Vector2(0.28, 0.01),
      new THREE.Vector2(0.28, 0.05),
      new THREE.Vector2(0.24, 0.07),
      new THREE.Vector2(0.18, 0.08),
    ]);
    g.add(this._makeMesh(base, material));

    // Pedestal / collar
    const collar = this._lathe([
      new THREE.Vector2(0.00, 0.08),
      new THREE.Vector2(0.16, 0.08),
      new THREE.Vector2(0.14, 0.12),
      new THREE.Vector2(0.12, 0.18),
    ]);
    g.add(this._makeMesh(collar, material));

    // Neck – a curved cylinder built from an extruded shape
    const neckShape = new THREE.Shape();
    neckShape.moveTo(-0.08, 0);
    neckShape.lineTo(0.08, 0);
    neckShape.lineTo(0.07, 0.38);
    neckShape.bezierCurveTo(0.06, 0.44, 0.04, 0.46, 0.00, 0.48);
    neckShape.lineTo(-0.04, 0.46);
    neckShape.bezierCurveTo(-0.07, 0.42, -0.08, 0.38, -0.08, 0.34);
    neckShape.lineTo(-0.08, 0);

    const neckSettings = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 };
    const neckGeo = new THREE.ExtrudeGeometry(neckShape, neckSettings);
    neckGeo.computeVertexNormals();
    const neck = this._makeMesh(neckGeo, material);
    neck.position.set(0, 0.18, -0.07);
    g.add(neck);

    // Head block (the horse face)
    const headShape = new THREE.Shape();
    headShape.moveTo(0, 0);
    headShape.lineTo(0.22, -0.02);
    headShape.lineTo(0.24, 0.02);
    headShape.lineTo(0.24, 0.06);
    headShape.lineTo(0.20, 0.10);
    headShape.lineTo(0.06, 0.14);
    headShape.bezierCurveTo(0.02, 0.15, -0.01, 0.12, 0, 0.08);
    headShape.lineTo(0, 0);

    const headSettings = { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const headGeo = new THREE.ExtrudeGeometry(headShape, headSettings);
    headGeo.computeVertexNormals();
    const head = this._makeMesh(headGeo, material);
    head.position.set(-0.02, 0.52, -0.07);
    head.rotation.z = 0.15;
    g.add(head);

    // Ears – two small cones
    const earGeo = new THREE.ConeGeometry(0.03, 0.08, 8);
    const ear1 = this._makeMesh(earGeo, material);
    ear1.position.set(0.04, 0.70, -0.02);
    ear1.rotation.z = -0.2;
    g.add(ear1);

    const ear2 = this._makeMesh(earGeo, material);
    ear2.position.set(0.04, 0.70, 0.04);
    ear2.rotation.z = -0.2;
    g.add(ear2);

    // Mane – a thin ridge along the back of the neck
    const maneGeo = new THREE.BoxGeometry(0.02, 0.28, 0.08);
    const mane = this._makeMesh(maneGeo, material);
    mane.position.set(-0.08, 0.44, 0.0);
    mane.rotation.z = 0.15;
    g.add(mane);

    // Eye – a tiny sphere (slightly different shade would be nice but same material keeps it clean)
    const eyeGeo = new THREE.SphereGeometry(0.018, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: color === 'w' ? 0x222222 : 0xcccccc, roughness: 0.3 });
    const eye = this._makeMesh(eyeGeo, eyeMat);
    eye.position.set(0.10, 0.62, 0.085);
    g.add(eye);

    return g;
  }

  // ─── BISHOP  (height ~0.80) ───────────────────────────────
  // Tall tapered body with a mitre (pointed hat) that has a diagonal slit.
  buildBishop(material) {
    const g = new THREE.Group();

    // Base
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.26, 0.00),
      new THREE.Vector2(0.28, 0.01),
      new THREE.Vector2(0.28, 0.05),
      new THREE.Vector2(0.23, 0.07),
      new THREE.Vector2(0.16, 0.08),
    ]);
    g.add(this._makeMesh(base, material));

    // Body – tall, narrowing
    const body = this._lathe([
      new THREE.Vector2(0.00, 0.08),
      new THREE.Vector2(0.15, 0.08),
      new THREE.Vector2(0.13, 0.14),
      new THREE.Vector2(0.10, 0.28),
      new THREE.Vector2(0.09, 0.40),
      new THREE.Vector2(0.11, 0.44),
      new THREE.Vector2(0.13, 0.45),
      new THREE.Vector2(0.13, 0.47),
      new THREE.Vector2(0.10, 0.48),
    ]);
    g.add(this._makeMesh(body, material));

    // Mitre (pointed hat) – a squashed sphere + cone combo
    const mitreBody = this._lathe([
      new THREE.Vector2(0.00, 0.48),
      new THREE.Vector2(0.11, 0.48),
      new THREE.Vector2(0.12, 0.52),
      new THREE.Vector2(0.11, 0.58),
      new THREE.Vector2(0.09, 0.64),
      new THREE.Vector2(0.06, 0.70),
      new THREE.Vector2(0.03, 0.74),
      new THREE.Vector2(0.01, 0.76),
      new THREE.Vector2(0.00, 0.76),
    ]);
    g.add(this._makeMesh(mitreBody, material));

    // Diagonal slit across the mitre – a thin rotated box subtracted visually
    // We simulate it with a thin contrasting strip
    const slitGeo = new THREE.BoxGeometry(0.24, 0.015, 0.03);
    const slit = this._makeMesh(slitGeo, material);
    slit.position.set(0, 0.62, 0);
    slit.rotation.z = Math.PI / 4;
    slit.scale.set(0.85, 1, 1);
    g.add(slit);

    // Small ball on top
    const tipGeo = new THREE.SphereGeometry(0.035, 12, 10);
    const tip = this._makeMesh(tipGeo, material);
    tip.position.y = 0.79;
    g.add(tip);

    return g;
  }

  // ─── QUEEN  (height ~0.90) ────────────────────────────────
  // Elegant body with a crown of spikes and a small orb on top.
  buildQueen(material) {
    const g = new THREE.Group();

    // Base
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.28, 0.00),
      new THREE.Vector2(0.30, 0.01),
      new THREE.Vector2(0.30, 0.05),
      new THREE.Vector2(0.25, 0.07),
      new THREE.Vector2(0.18, 0.09),
    ]);
    g.add(this._makeMesh(base, material));

    // Body – tall, elegant waist
    const body = this._lathe([
      new THREE.Vector2(0.00, 0.09),
      new THREE.Vector2(0.16, 0.09),
      new THREE.Vector2(0.14, 0.14),
      new THREE.Vector2(0.11, 0.26),
      new THREE.Vector2(0.10, 0.36),
      new THREE.Vector2(0.09, 0.44),
      new THREE.Vector2(0.11, 0.48),
      new THREE.Vector2(0.14, 0.50),
      new THREE.Vector2(0.14, 0.52),
      new THREE.Vector2(0.10, 0.54),
    ]);
    g.add(this._makeMesh(body, material));

    // Crown ring
    const crownBase = this._lathe([
      new THREE.Vector2(0.00, 0.54),
      new THREE.Vector2(0.12, 0.54),
      new THREE.Vector2(0.13, 0.56),
      new THREE.Vector2(0.14, 0.60),
      new THREE.Vector2(0.13, 0.64),
      new THREE.Vector2(0.11, 0.66),
    ]);
    g.add(this._makeMesh(crownBase, material));

    // Crown spikes – 8 small cones evenly spaced around the rim
    const spikeGeo = new THREE.ConeGeometry(0.025, 0.12, 6);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spike = this._makeMesh(spikeGeo, material);
      spike.position.set(
        Math.cos(angle) * 0.12,
        0.72,
        Math.sin(angle) * 0.12
      );
      spike.rotation.z = -Math.cos(angle) * 0.3;
      spike.rotation.x = Math.sin(angle) * 0.3;
      g.add(spike);
    }

    // Orb on top
    const orbGeo = new THREE.SphereGeometry(0.045, 14, 12);
    const orb = this._makeMesh(orbGeo, material);
    orb.position.y = 0.82;
    g.add(orb);

    return g;
  }

  // ─── KING  (height ~1.0) ──────────────────────────────────
  // The tallest piece: stately body with a wide collar and a prominent cross.
  buildKing(material) {
    const g = new THREE.Group();

    // Base – widest of all
    const base = this._lathe([
      new THREE.Vector2(0.00, 0.00),
      new THREE.Vector2(0.30, 0.00),
      new THREE.Vector2(0.32, 0.01),
      new THREE.Vector2(0.32, 0.06),
      new THREE.Vector2(0.27, 0.08),
      new THREE.Vector2(0.20, 0.10),
    ]);
    g.add(this._makeMesh(base, material));

    // Body
    const body = this._lathe([
      new THREE.Vector2(0.00, 0.10),
      new THREE.Vector2(0.18, 0.10),
      new THREE.Vector2(0.16, 0.16),
      new THREE.Vector2(0.13, 0.28),
      new THREE.Vector2(0.12, 0.40),
      new THREE.Vector2(0.11, 0.50),
      new THREE.Vector2(0.13, 0.54),
      new THREE.Vector2(0.16, 0.56),
      new THREE.Vector2(0.16, 0.58),
      new THREE.Vector2(0.12, 0.60),
    ]);
    g.add(this._makeMesh(body, material));

    // Crown band
    const crown = this._lathe([
      new THREE.Vector2(0.00, 0.60),
      new THREE.Vector2(0.13, 0.60),
      new THREE.Vector2(0.15, 0.62),
      new THREE.Vector2(0.15, 0.66),
      new THREE.Vector2(0.13, 0.68),
      new THREE.Vector2(0.10, 0.70),
      new THREE.Vector2(0.08, 0.72),
    ]);
    g.add(this._makeMesh(crown, material));

    // Padded dome under cross
    const domeGeo = new THREE.SphereGeometry(0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = this._makeMesh(domeGeo, material);
    dome.position.y = 0.72;
    g.add(dome);

    // Cross – the iconic king identifier
    // Vertical beam
    const crossVGeo = new THREE.BoxGeometry(0.04, 0.20, 0.04);
    const crossV = this._makeMesh(crossVGeo, material);
    crossV.position.y = 0.88;
    g.add(crossV);

    // Horizontal beam
    const crossHGeo = new THREE.BoxGeometry(0.14, 0.04, 0.04);
    const crossH = this._makeMesh(crossHGeo, material);
    crossH.position.y = 0.92;
    g.add(crossH);

    return g;
  }

  setTheme(themeName) {
    const theme = PIECE_THEMES[themeName];
    if (theme) {
      this.theme = theme;
      this.geometryCache.clear();
      if (theme.pieceModels) {
        return this.loadCustomModels(theme.pieceModels);
      }
      this.customModels.clear();
    }
    return Promise.resolve();
  }
}
