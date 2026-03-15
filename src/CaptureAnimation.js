const PIECE_UNICODE = {
  w: { k: '\u2654', q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658', p: '\u2659' },
  b: { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' },
};

const PIECE_NAMES = { p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King' };

/**
 * Cinematic full-screen animation that plays when a queen is captured.
 * Each attacking piece type has its own unique visual style.
 *
 *  Pawn   → "Giant Slayer"    – rising shockwave, debris flying upward
 *  Rook   → "Siege Breaker"   – horizontal impact slam, ground cracks
 *  Knight → "Shadow Strike"   – arc slash with speed lines
 *  Bishop → "Divine Judgement" – diagonal light beams converge
 *  Queen  → "Royal Clash"     – symmetrical explosion of sparks
 *  King   → "Royal Decree"    – slow crown crush with falling embers
 */
export class CaptureAnimation {
  constructor() {
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.animId = null;
    this.startTime = 0;
  }

  /**
   * Play the queen-capture cinematic.
   * @param {string} attackerType - p/r/n/b/q/k
   * @param {string} attackerColor - w/b
   * @returns {Promise} resolves when animation ends
   */
  play(attackerType, attackerColor) {
    const capturedColor = attackerColor === 'w' ? 'b' : 'w';
    const duration = 2200;

    return new Promise((resolve) => {
      this.createOverlay();
      this.particles = [];
      this.startTime = performance.now();

      const attackerChar = PIECE_UNICODE[attackerColor][attackerType];
      const queenChar = PIECE_UNICODE[capturedColor]['q'];
      const attackerName = PIECE_NAMES[attackerType];
      const tagline = this.getTagline(attackerType);

      // Initialize particles based on attacker type
      this.initParticles(attackerType, attackerColor);

      const animate = (now) => {
        const elapsed = now - this.startTime;
        const t = Math.min(elapsed / duration, 1);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Phase timeline:
        // 0.00-0.15: fade in + attacker enters
        // 0.15-0.40: clash moment + flash
        // 0.40-0.75: aftermath particles + queen shatters
        // 0.75-1.00: fade out

        this.drawBackground(t);
        this.drawPieceAnimation(t, attackerType, attackerChar, queenChar, attackerColor, capturedColor);
        this.updateAndDrawParticles(t, attackerType);
        this.drawFlash(t, attackerType);
        this.drawText(t, attackerName, tagline);
        this.drawFade(t);

        if (t < 1) {
          this.animId = requestAnimationFrame(animate);
        } else {
          this.destroy();
          resolve();
        }
      };

      this.animId = requestAnimationFrame(animate);
    });
  }

  createOverlay() {
    this.destroy();
    this.overlay = document.createElement('div');
    this.overlay.className = 'capture-anim-overlay';
    this.canvas = document.createElement('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.overlay.appendChild(this.canvas);
    document.getElementById('app').appendChild(this.overlay);
    this.ctx = this.canvas.getContext('2d');
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.overlay) this.overlay.remove();
    this.overlay = null;
  }

  getTagline(type) {
    switch (type) {
      case 'p': return 'GIANT SLAYER';
      case 'r': return 'SIEGE BREAKER';
      case 'n': return 'SHADOW STRIKE';
      case 'b': return 'DIVINE JUDGEMENT';
      case 'q': return 'ROYAL CLASH';
      case 'k': return 'ROYAL DECREE';
      default: return 'CAPTURED';
    }
  }

  // ─── Background ─────────────────────────────────────────

  drawBackground(t) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fadeIn = Math.min(t / 0.1, 1);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.82 * fadeIn})`;
    ctx.fillRect(0, 0, w, h);
  }

  drawFade(t) {
    if (t < 0.78) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fadeOut = (t - 0.78) / 0.22;
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeOut})`;
    ctx.fillRect(0, 0, w, h);
  }

  // ─── Piece animation (unique per attacker) ──────────────

  drawPieceAnimation(t, attackerType, attackerChar, queenChar, aColor, cColor) {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const pieceSize = Math.min(this.canvas.width, this.canvas.height) * 0.14;

    switch (attackerType) {
      case 'p': this.animPawn(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
      case 'r': this.animRook(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
      case 'n': this.animKnight(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
      case 'b': this.animBishop(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
      case 'q': this.animQueen(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
      case 'k': this.animKing(t, ctx, cx, cy, pieceSize, attackerChar, queenChar, aColor, cColor); break;
    }
  }

  _drawPieceChar(ctx, char, x, y, size, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color === 'w' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = color === 'w' ? '#ffffff' : '#1a1a1a';
    ctx.strokeStyle = color === 'w' ? '#555' : '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(char, x, y);
    ctx.fillText(char, x, y);
    ctx.restore();
  }

  // Pawn: charges from bottom, queen shatters upward
  animPawn(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    const queenX = cx + size * 0.6;
    const pawnX = cx - size * 0.6;

    if (t < 0.30) {
      // Queen stands, pawn charges from below
      this._drawPieceChar(ctx, qChar, queenX, cy, size, cC, 1);
      const pawnY = cy + (1 - t / 0.30) * this.canvas.height * 0.4;
      const pawnScale = 0.6 + (t / 0.30) * 0.4;
      this._drawPieceChar(ctx, atkChar, pawnX, pawnY, size * pawnScale, aC, 1);
    } else if (t < 0.45) {
      // Impact - pawn strikes, queen starts breaking
      const shake = Math.sin((t - 0.30) * 200) * 8 * (1 - (t - 0.30) / 0.15);
      this._drawPieceChar(ctx, atkChar, pawnX + shake, cy, size, aC, 1);
      const breakT = (t - 0.30) / 0.15;
      this._drawPieceChar(ctx, qChar, queenX, cy - breakT * 20, size, cC, 1 - breakT * 0.5);
    } else if (t < 0.75) {
      // Queen gone, pawn stands victorious, growing slightly
      const growT = (t - 0.45) / 0.30;
      const scale = 1 + growT * 0.15;
      this._drawPieceChar(ctx, atkChar, cx, cy, size * scale, aC, 1);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size * 1.15, aC, alpha);
    }
  }

  // Rook: horizontal ram from the side
  animRook(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    const w = this.canvas.width;

    if (t < 0.20) {
      // Queen center, rook charges from far left
      this._drawPieceChar(ctx, qChar, cx, cy, size, cC, 1);
      const rookX = -size + (t / 0.20) * (cx - size * 0.3 + size);
      this._drawPieceChar(ctx, atkChar, rookX, cy, size, aC, 1);

      // Speed lines
      ctx.save();
      ctx.strokeStyle = `rgba(255, 200, 100, ${0.5 * (t / 0.20)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ly = cy - 60 + i * 16;
        const lx = rookX - 40 - Math.random() * 100;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - 60 - Math.random() * 80, ly);
        ctx.stroke();
      }
      ctx.restore();
    } else if (t < 0.35) {
      // Impact - rook hits queen, horizontal shockwave
      const impactT = (t - 0.20) / 0.15;
      const shake = Math.sin(impactT * Math.PI * 12) * 10 * (1 - impactT);
      this._drawPieceChar(ctx, atkChar, cx - size * 0.3 + shake, cy, size, aC, 1);
      this._drawPieceChar(ctx, qChar, cx + impactT * w * 0.4, cy, size, cC, 1 - impactT);

      // Horizontal shockwave
      ctx.save();
      const waveR = impactT * w * 0.6;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, waveR);
      grad.addColorStop(0, 'rgba(255, 180, 50, 0)');
      grad.addColorStop(0.7, 'rgba(255, 180, 50, 0)');
      grad.addColorStop(0.85, `rgba(255, 180, 50, ${0.3 * (1 - impactT)})`);
      grad.addColorStop(1, 'rgba(255, 180, 50, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, this.canvas.height);
      ctx.restore();
    } else if (t < 0.75) {
      const alpha = 1;
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, alpha);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, alpha);
    }
  }

  // Knight: leaps in an arc from above
  animKnight(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    const h = this.canvas.height;

    if (t < 0.25) {
      // Queen center, knight leaps in from top-right in arc
      this._drawPieceChar(ctx, qChar, cx, cy, size, cC, 1);
      const lt = t / 0.25;
      const knightX = cx + (1 - lt) * this.canvas.width * 0.35;
      const knightY = -size + lt * (cy + size);
      const arcY = knightY - Math.sin(lt * Math.PI) * h * 0.25;
      const rotation = lt * Math.PI * 1.5;

      ctx.save();
      ctx.translate(knightX, arcY);
      ctx.rotate(rotation);
      this._drawPieceChar(ctx, atkChar, 0, 0, size, aC, 1);
      ctx.restore();

      // Arc trail
      ctx.save();
      ctx.strokeStyle = `rgba(150, 100, 255, ${0.4 * lt})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const st = (i / 20) * lt;
        const sx = cx + (1 - st) * this.canvas.width * 0.35;
        const sy = -size + st * (cy + size) - Math.sin(st * Math.PI) * h * 0.25;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();
    } else if (t < 0.40) {
      // Slash impact
      const impactT = (t - 0.25) / 0.15;

      // Slash line across queen
      ctx.save();
      ctx.strokeStyle = `rgba(200, 150, 255, ${0.8 * (1 - impactT)})`;
      ctx.lineWidth = 4 + impactT * 6;
      ctx.shadowColor = 'rgba(200, 150, 255, 0.8)';
      ctx.shadowBlur = 20;
      const slashLen = size * 2;
      ctx.beginPath();
      ctx.moveTo(cx - slashLen, cy - slashLen * 0.6);
      ctx.lineTo(cx + slashLen, cy + slashLen * 0.6);
      ctx.stroke();
      ctx.restore();

      this._drawPieceChar(ctx, atkChar, cx - size * 0.4, cy, size, aC, 1);
      // Queen splits
      ctx.save();
      ctx.globalAlpha = 1 - impactT;
      const split = impactT * 30;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.canvas.width, cy);
      ctx.clip();
      this._drawPieceChar(ctx, qChar, cx + size * 0.5, cy - split, size, cC, 1 - impactT);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, cy, this.canvas.width, this.canvas.height);
      ctx.clip();
      this._drawPieceChar(ctx, qChar, cx + size * 0.5, cy + split, size, cC, 1 - impactT);
      ctx.restore();
      ctx.restore();
    } else if (t < 0.75) {
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, 1);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, alpha);
    }
  }

  // Bishop: diagonal light beams converge on queen
  animBishop(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (t < 0.30) {
      this._drawPieceChar(ctx, qChar, cx, cy, size, cC, 1);

      // Bishop fades in at corner
      const fadeIn = t / 0.30;
      this._drawPieceChar(ctx, atkChar, cx - size * 1.5, cy - size * 1.2, size * 0.8, aC, fadeIn);

      // Diagonal beams growing
      ctx.save();
      ctx.strokeStyle = `rgba(255, 230, 100, ${0.5 * fadeIn})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255, 230, 100, 0.6)';
      ctx.shadowBlur = 15;
      const beamLen = fadeIn * Math.max(w, h);
      // Top-left to center
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.min(cx, beamLen), Math.min(cy, beamLen)); ctx.stroke();
      // Bottom-right to center
      ctx.beginPath(); ctx.moveTo(w, h); ctx.lineTo(Math.max(cx, w - beamLen), Math.max(cy, h - beamLen)); ctx.stroke();
      // Top-right to center
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(Math.max(cx, w - beamLen), Math.min(cy, beamLen)); ctx.stroke();
      // Bottom-left to center
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(Math.min(cx, beamLen), Math.max(cy, h - beamLen)); ctx.stroke();
      ctx.restore();
    } else if (t < 0.45) {
      // Beams converge and queen disintegrates in light
      const impactT = (t - 0.30) / 0.15;

      // Bright flash at center
      ctx.save();
      const flashR = impactT * size * 4;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
      grad.addColorStop(0, `rgba(255, 255, 200, ${0.8 * (1 - impactT)})`);
      grad.addColorStop(0.5, `rgba(255, 230, 100, ${0.3 * (1 - impactT)})`);
      grad.addColorStop(1, 'rgba(255, 230, 100, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Cross beams stay visible
      ctx.save();
      ctx.strokeStyle = `rgba(255, 230, 100, ${0.6 * (1 - impactT)})`;
      ctx.lineWidth = 2 + impactT * 10;
      ctx.shadowColor = 'rgba(255, 230, 100, 0.8)';
      ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
      ctx.restore();

      this._drawPieceChar(ctx, qChar, cx, cy, size, cC, 1 - impactT);
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, impactT);
    } else if (t < 0.75) {
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, 1);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, alpha);
    }
  }

  // Queen vs Queen: symmetrical explosion
  animQueen(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (t < 0.25) {
      // Both queens slide toward center from opposite sides
      const slideT = t / 0.25;
      const ease = slideT * slideT * (3 - 2 * slideT); // smoothstep
      const offset = (1 - ease) * w * 0.35;
      this._drawPieceChar(ctx, atkChar, cx - offset - size * 0.5, cy, size, aC, 1);
      this._drawPieceChar(ctx, qChar, cx + offset + size * 0.5, cy, size, cC, 1);
    } else if (t < 0.40) {
      // Collision - both at center, explosion
      const impactT = (t - 0.25) / 0.15;
      const shake = Math.sin(impactT * Math.PI * 16) * 6 * (1 - impactT);

      this._drawPieceChar(ctx, atkChar, cx - size * 0.1 + shake, cy, size, aC, 1);
      this._drawPieceChar(ctx, qChar, cx + size * 0.1 - shake, cy, size, cC, 1 - impactT);

      // Explosion ring
      ctx.save();
      const ringR = impactT * Math.max(w, h) * 0.4;
      ctx.strokeStyle = `rgba(255, 100, 100, ${0.6 * (1 - impactT)})`;
      ctx.lineWidth = 4 + impactT * 10;
      ctx.shadowColor = 'rgba(255, 50, 50, 0.7)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (t < 0.75) {
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, 1);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size, aC, alpha);
    }
  }

  // King takes queen: slow, deliberate crown drop
  animKing(t, ctx, cx, cy, size, atkChar, qChar, aC, cC) {
    if (t < 0.35) {
      // King stands above, queen below. King slowly descends
      const slideT = t / 0.35;
      const ease = slideT * slideT;
      this._drawPieceChar(ctx, qChar, cx, cy + size * 0.2, size, cC, 1);
      this._drawPieceChar(ctx, atkChar, cx, cy - size * 1.5 + ease * size * 1.2, size * 1.2, aC, 1);

      // Ominous glow around king
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy - size * 1.5 + ease * size * 1.2, 0, cx, cy - size * 1.5 + ease * size * 1.2, size);
      grad.addColorStop(0, `rgba(255, 215, 0, ${0.2 * slideT})`);
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    } else if (t < 0.50) {
      // Queen crumbles
      const crumbleT = (t - 0.35) / 0.15;
      this._drawPieceChar(ctx, atkChar, cx, cy - size * 0.3, size * 1.2, aC, 1);
      this._drawPieceChar(ctx, qChar, cx, cy + size * 0.2 + crumbleT * 40, size * (1 - crumbleT * 0.3), cC, 1 - crumbleT);

      // Golden flash
      ctx.save();
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * (1 - crumbleT)})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    } else if (t < 0.75) {
      this._drawPieceChar(ctx, atkChar, cx, cy, size * 1.2, aC, 1);
    } else {
      const alpha = 1 - (t - 0.75) / 0.25;
      this._drawPieceChar(ctx, atkChar, cx, cy, size * 1.2, aC, alpha);
    }
  }

  // ─── Particles ──────────────────────────────────────────

  initParticles(attackerType, attackerColor) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const count = 60;

    const colorSets = {
      p: ['#ff6b35', '#ffa500', '#ffcc00', '#ffffff'],             // fiery orange
      r: ['#ff4444', '#ff8800', '#ffaa33', '#eeeeee'],             // siege red-orange
      n: ['#aa66ff', '#cc88ff', '#eeccff', '#ffffff'],             // purple mystical
      b: ['#ffee55', '#ffdd22', '#ffffff', '#ffffaa'],             // golden light
      q: ['#ff3366', '#ff6699', '#ff99bb', '#ffffff'],             // royal magenta
      k: ['#ffd700', '#ffec8b', '#fff8dc', '#ffffff'],             // regal gold
    };

    const colors = colorSets[attackerType] || colorSets.p;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.6 + Math.random() * 0.4,
        born: 0.25 + Math.random() * 0.1,  // spawn around impact time
        gravity: 0.03 + Math.random() * 0.02,
        type: attackerType,
      });
    }

    // Extra shaped particles per type
    if (attackerType === 'p') {
      // Upward debris
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: cx + (Math.random() - 0.5) * 80,
          y: cy,
          vx: (Math.random() - 0.5) * 2,
          vy: -3 - Math.random() * 5,
          size: 3 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0.5 + Math.random() * 0.3,
          born: 0.28,
          gravity: 0.06,
          type: 'p',
        });
      }
    } else if (attackerType === 'b') {
      // Sparkling diagonal trails
      for (let i = 0; i < 30; i++) {
        const diagAngle = (Math.floor(Math.random() * 4) * 0.5 + 0.25) * Math.PI; // diagonals
        const dist = Math.random() * 3;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(diagAngle) * dist * 2,
          vy: Math.sin(diagAngle) * dist * 2,
          size: 1.5 + Math.random() * 2,
          color: '#ffffaa',
          life: 0.4 + Math.random() * 0.4,
          born: 0.30 + Math.random() * 0.08,
          gravity: 0,
          type: 'b',
        });
      }
    }
  }

  updateAndDrawParticles(t, attackerType) {
    const ctx = this.ctx;

    for (const p of this.particles) {
      if (t < p.born) continue;
      const age = (t - p.born) / p.life;
      if (age > 1) continue;

      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;

      const alpha = 1 - age;
      const currentSize = p.size * (1 - age * 0.5);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(currentSize, 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ─── Flash ──────────────────────────────────────────────

  drawFlash(t, attackerType) {
    // White flash at moment of impact (~t=0.25 to 0.35)
    if (t < 0.22 || t > 0.38) return;
    const flashT = (t - 0.22) / 0.16;
    let intensity;
    if (flashT < 0.3) {
      intensity = flashT / 0.3;
    } else {
      intensity = 1 - (flashT - 0.3) / 0.7;
    }

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const flashColors = {
      p: `rgba(255, 180, 50, ${intensity * 0.35})`,
      r: `rgba(255, 120, 30, ${intensity * 0.35})`,
      n: `rgba(180, 120, 255, ${intensity * 0.30})`,
      b: `rgba(255, 240, 100, ${intensity * 0.40})`,
      q: `rgba(255, 80, 120, ${intensity * 0.35})`,
      k: `rgba(255, 215, 0, ${intensity * 0.35})`,
    };

    ctx.save();
    ctx.fillStyle = flashColors[attackerType] || flashColors.p;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ─── Text ───────────────────────────────────────────────

  drawText(t, attackerName, tagline) {
    if (t < 0.35 || t > 0.80) return;
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const textT = (t - 0.35) / 0.45;
    const alpha = textT < 0.2 ? textT / 0.2 : textT > 0.8 ? (1 - textT) / 0.2 : 1;
    const bottomY = this.canvas.height * 0.78;

    ctx.save();
    ctx.globalAlpha = Math.min(alpha, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Tagline
    ctx.font = `bold ${Math.min(this.canvas.width * 0.04, 36)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 10;
    ctx.letterSpacing = '6px';
    ctx.fillText(tagline, cx, bottomY);

    // Subtitle
    ctx.font = `${Math.min(this.canvas.width * 0.02, 18)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText(`${attackerName} captures Queen`, cx, bottomY + 30);

    ctx.restore();
  }
}
