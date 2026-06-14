/**
 * Lightweight sprite-particle engine (browser canvas).
 *
 * A single shared pool any view can emit into; a <ParticleField/> component draws
 * it. Used for combat impact sparks (pairs with the #17A FloatingText juice) and
 * slow ambient biome drift on maps. Motion is gated at the component layer via
 * prefersReducedMotion, and the pool is hard-capped so it can never run away.
 */

const MAX_PARTICLES = 260;

class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  _push(p) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }

  /**
   * Impact burst at a screen point (combat hits / crits). Particles fling outward
   * with a slight upward bias and fall under gravity.
   */
  burst(x, y, { count = 10, sprite = 'ember', speed = 130, size = 14, life = 0.6, color = null } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4; // upward fan
      const sp = speed * (0.4 + Math.random() * 0.9);
      this._push({
        x, y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        ay: 280,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 7,
        size: size * (0.6 + Math.random() * 0.8),
        life, maxLife: life,
        sprite, color
      });
    }
  }

  /** Spawn one slow ambient drift particle somewhere in a w×h region (maps). */
  ambient(width, height, { sprite = 'mist', size = 30, life = 7, drift = 16 } = {}) {
    this._push({
      x: Math.random() * width,
      y: height * (0.2 + Math.random() * 0.9),
      vx: (Math.random() - 0.3) * drift,
      vy: -6 - Math.random() * drift,
      ay: 0,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.5,
      size: size * (0.6 + Math.random()),
      life, maxLife: life,
      sprite, color: null, ambient: true
    });
  }

  step(dt) {
    const out = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += (p.ay || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      out.push(p);
    }
    this.particles = out;
  }

  clear() {
    this.particles = [];
  }

  get count() {
    return this.particles.length;
  }
}

export const particleEngine = new ParticleEngine();

/** Emit an impact burst at a screen point. kind: 'hit' | 'crit' | 'heal'. */
export function emitImpact(x, y, kind = 'hit') {
  if (kind === 'crit') {
    particleEngine.burst(x, y, { count: 18, sprite: 'ember', speed: 200, size: 18, life: 0.7 });
  } else if (kind === 'heal') {
    particleEngine.burst(x, y, { count: 10, sprite: 'pollen', speed: 90, size: 16, life: 0.8 });
  } else {
    particleEngine.burst(x, y, { count: 8, sprite: 'ember', speed: 120, size: 12, life: 0.5 });
  }
}
