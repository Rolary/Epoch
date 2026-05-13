import * as Phaser from "phaser";

type ElementType = "crystal" | "spark" | "droplet" | "pulse";
type Outcome = "positive" | "negative" | "rare";

interface DragElement {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  type: ElementType;
  homeOrbitAngle: number;
  homeOrbitRadius: number;
  orbitSpeed: number;
  createdAt: number;
}

const ELEMENT_CONFIG: Record<ElementType, { color: number; size: number; label: string; action: string; rare?: boolean }> = {
  crystal: { color: 0x4FC3F7, size: 18, label: "矿物晶体", action: "minerals" },
  spark:   { color: 0xFFD54F, size: 16, label: "能量闪光", action: "light" },
  droplet: { color: 0x66BB6A, size: 16, label: "有机液滴", action: "tide" },
  pulse:   { color: 0xBA68C8, size: 20, label: "异常脉冲", action: "heat", rare: true },
};

export class HomeScene extends Phaser.Scene {
  private poolInner!: Phaser.GameObjects.Graphics;
  private poolOuter!: Phaser.GameObjects.Graphics;
  private particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private organisms: Phaser.GameObjects.Container[] = [];
  private lightBeams: Phaser.GameObjects.Graphics[] = [];
  private resourceOrbs: Phaser.GameObjects.Container[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private poolPulseTime = 0;
  private organismSpawnTimer = 0;
  private tapRipples: Phaser.GameObjects.Graphics[] = [];

  // Drag element system
  private dragElements: DragElement[] = [];
  private draggedElement: DragElement | null = null;
  private dragTrail!: Phaser.GameObjects.Graphics;
  private poolHintText!: Phaser.GameObjects.Text;
  private poolHintArrow!: Phaser.GameObjects.Graphics;
  private absorbCount = 0;
  private elementSpawnTimer = 0;
  private nextSpawnDelay = 5000;
  static readonly MAX_ELEMENTS = 4;
  static readonly POOL_ABSORB_RADIUS = 60;

  onAbsorb?: (type: ElementType, outcome: Outcome) => void;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    this.createProceduralTextures();
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.dragTrail = this.add.graphics();
    this.dragTrail.setDepth(10);

    this.createBackground(width, height);
    this.createLightBeams(width, height);
    this.createPool(width, height);
    this.createGridOverlay(width, height);
    this.createFloatingParticles(width, height);
    this.createResourceOrbs(width, height);
    this.createTitle(width, height);
    this.createPoolHint(width, height);
    this.createSediment(width, height);

    this.particleEmitters.push(
      this.add.particles(width / 2, height / 2 + 40, "bubble", {
        speed: { min: 8, max: 30 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        lifespan: 2500,
        frequency: 200,
        blendMode: "ADD",
        emitZone: {
          type: "random",
          source: new Phaser.Geom.Circle(0, 0, 130),
        } as unknown as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig["emitZone"],
      }),
    );

    // Spawn first element quickly for guidance
    this.elementSpawnTimer = 0;
    this.nextSpawnDelay = 2000;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on("pointerup", (_pointer: Phaser.Input.Pointer) => this.onPointerUp());
  }

  update(_time: number, delta: number): void {
    this.poolPulseTime += delta;
    const pulse = 1 + Math.sin(this.poolPulseTime * 0.001) * 0.03;
    if (this.poolOuter) this.poolOuter.setAlpha(0.15 * pulse * 5);
    if (this.poolInner) this.poolInner.setAlpha(0.08 * pulse * 5);

    this.updateOrganisms(delta);
    this.updateResourceOrbs();
    this.updateDragElements(delta);
    this.updateSpawning(delta);
    this.updateDragTrail();
  }

  // ── Spawning ──

  private updateSpawning(delta: number): void {
    this.elementSpawnTimer += delta;
    if (this.elementSpawnTimer > this.nextSpawnDelay && this.dragElements.length < HomeScene.MAX_ELEMENTS) {
      this.elementSpawnTimer = 0;
      this.nextSpawnDelay = 4000 + Math.random() * 6000;
      this.spawnElement();
    }
  }

  private spawnElement(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 40;

    // Pick type: 1/8 chance for rare pulse, otherwise evenly distribute
    const roll = Math.random();
    let type: ElementType;
    if (roll < 0.12) type = "pulse";
    else if (roll < 0.4) type = "crystal";
    else if (roll < 0.67) type = "spark";
    else type = "droplet";

    const cfg = ELEMENT_CONFIG[type];
    const gfx = this.add.graphics();

    if (type === "crystal") {
      this.drawCrystal(gfx, cfg.color, cfg.size);
    } else if (type === "spark") {
      this.drawSpark(gfx, cfg.color, cfg.size);
    } else if (type === "droplet") {
      this.drawDroplet(gfx, cfg.color, cfg.size);
    } else {
      this.drawPulse(gfx, cfg.color, cfg.size);
    }

    // Random angle around pool edge
    const angle = Math.random() * Math.PI * 2;
    const orbitRadius = 150 + Math.random() * 20;
    const x = cx + Math.cos(angle) * orbitRadius;
    const y = cy + Math.sin(angle) * orbitRadius;

    const container = this.add.container(x, y, [gfx]);
    container.setSize(cfg.size * 2, cfg.size * 2);
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, cfg.size + 10),
      Phaser.Geom.Circle.Contains,
    );
    container.setDepth(8);
    container.setScale(0);
    this.input.setDraggable(container);

    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });

    const el: DragElement = {
      container,
      graphics: gfx,
      type,
      homeOrbitAngle: angle,
      homeOrbitRadius: orbitRadius,
      orbitSpeed: 0.00015 + Math.random() * 0.00025,
      createdAt: Date.now(),
    };
    this.dragElements.push(el);

    // Evict oldest if over limit
    while (this.dragElements.length > HomeScene.MAX_ELEMENTS) {
      const oldest = this.dragElements.shift();
      if (oldest) {
        this.tweens.add({
          targets: oldest.container,
          alpha: 0,
          scale: 0,
          duration: 500,
          onComplete: () => { oldest.container.destroy(); },
        });
      }
    }
  }

  // ── Element orbit update ──

  private updateDragElements(delta: number): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 40;
    const t = this.poolPulseTime;

    for (const el of this.dragElements) {
      if (el === this.draggedElement) continue;
      el.homeOrbitAngle += el.orbitSpeed * delta;
      const r = el.homeOrbitRadius + Math.sin(t * 0.0008 + el.homeOrbitAngle * 2) * 4; // subtle radial drift
      el.container.x = cx + Math.cos(el.homeOrbitAngle) * r;
      el.container.y = cy + Math.sin(el.homeOrbitAngle) * r;
      // subtle pulse scale
      const s = 1 + Math.sin(t * 0.002 + el.homeOrbitAngle) * 0.05;
      if (!el.container.active) continue;
      el.container.setScale(s);
    }
  }

  // ── Drag handling ──

  private getTapElement(px: number, py: number): DragElement | null {
    for (const el of this.dragElements) {
      const dx = px - el.container.x;
      const dy = py - el.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cfg = ELEMENT_CONFIG[el.type];
      if (dist < cfg.size + 14) return el;
    }
    return null;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const el = this.getTapElement(pointer.x, pointer.y);
    if (el) {
      this.draggedElement = el;
      // stop orbit tweens on the graphics
      this.tweens.killTweensOf(el.container);
      this.tweens.add({
        targets: el.container,
        scale: 1.15,
        duration: 150,
        ease: "Back.easeOut",
      });
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggedElement) {
      // Show pool glow when hovering near pool center
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2 + 40;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, cx, cy);
      if (dist < HomeScene.POOL_ABSORB_RADIUS + 30) {
        if (this.poolInner) this.poolInner.setAlpha(0.1);
      }
      return;
    }
    this.draggedElement.container.x = pointer.x;
    this.draggedElement.container.y = pointer.y;
  }

  private onPointerUp(): void {
    if (!this.draggedElement) return;
    const el = this.draggedElement;
    this.draggedElement = null;

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    const dist = Phaser.Math.Distance.Between(el.container.x, el.container.y, cx, cy);

    if (dist < HomeScene.POOL_ABSORB_RADIUS) {
      this.absorbElement(el);
    } else {
      // Bounce back
      const homeX = cx + Math.cos(el.homeOrbitAngle) * el.homeOrbitRadius;
      const homeY = cy + Math.sin(el.homeOrbitAngle) * el.homeOrbitRadius;
      this.tweens.add({
        targets: el.container,
        x: homeX,
        y: homeY,
        scale: 1,
        duration: 500,
        ease: "Back.easeOut",
      });
    }
  }

  private updateDragTrail(): void {
    this.dragTrail.clear();
    if (!this.draggedElement) return;
    const x = this.draggedElement.container.x;
    const y = this.draggedElement.container.y;
    const cfg = ELEMENT_CONFIG[this.draggedElement.type];
    this.dragTrail.lineStyle(2, cfg.color, 0.3);
    for (let i = 0; i < 4; i++) {
      const ox = x + (Math.random() - 0.5) * 10;
      const oy = y + (Math.random() - 0.5) * 10;
      this.dragTrail.fillStyle(cfg.color, 0.15);
      this.dragTrail.fillCircle(ox, oy, 2 + i * 0.5);
    }
  }

  // ── Absorption ──

  private absorbElement(el: DragElement): void {
    const cfg = ELEMENT_CONFIG[el.type];
    const roll = Math.random();
    let outcome: Outcome;
    if (el.type === "pulse") {
      outcome = "rare";
    } else if (roll < 0.7) {
      outcome = "positive";
    } else {
      outcome = "negative";
    }

    // Play absorb animation: element shrinks into pool center
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    this.tweens.add({
      targets: el.container,
      x: cx,
      y: cy,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: "Quad.easeIn",
      onComplete: () => {
        el.container.destroy();
        const idx = this.dragElements.indexOf(el);
        if (idx >= 0) this.dragElements.splice(idx, 1);
      },
    });

    // Visual feedback
    this.playAbsorbFeedback(cx, cy, el.type, outcome);

    // Guide: hide after 3 successful absorbs
    this.absorbCount++;
    if (this.absorbCount >= 3 && this.poolHintText.visible) {
      this.tweens.add({
        targets: [this.poolHintText, this.poolHintArrow],
        alpha: 0,
        duration: 400,
        onComplete: () => {
          this.poolHintText.setVisible(false);
          this.poolHintArrow.setVisible(false);
        },
      });
    }

    // Notify React via callback
    this.onAbsorb?.(el.type, outcome);
  }

  private playAbsorbFeedback(cx: number, cy: number, type: ElementType, outcome: Outcome): void {
    const cfg = ELEMENT_CONFIG[type];

    // Ripple at center
    const ripple = this.add.graphics();
    this.tapRipples.push(ripple);
    this.tweens.add({
      targets: {},
      duration: 600,
      onUpdate: (t) => {
        ripple.clear();
        const r = 20 + t.progress * 50;
        const a = 0.6 * (1 - t.progress);
        const col = outcome === "negative" ? 0xEF5350 : outcome === "rare" ? 0xFFD54F : cfg.color;
        ripple.lineStyle(2, col, a);
        ripple.strokeCircle(cx, cy, r);
      },
      onComplete: () => {
        ripple.destroy();
        const idx = this.tapRipples.indexOf(ripple);
        if (idx >= 0) this.tapRipples.splice(idx, 1);
      },
    });

    // Burst particles
    const burstColors = outcome === "negative"
      ? [0xEF5350, 0xFF8A80, 0xFFCDD2]
      : outcome === "rare"
      ? [0xFFD54F, 0xFFAB40, 0xFFFFFF, cfg.color]
      : [cfg.color, 0xFFFFFF, cfg.color];

    for (let i = 0; i < (outcome === "rare" ? 20 : 10); i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 40;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const col = burstColors[Math.floor(Math.random() * burstColors.length)];
      const p = this.add.circle(cx, cy, 1.5 + Math.random() * 3, col, 0.9);
      this.tweens.add({
        targets: p,
        x, y,
        alpha: 0,
        scale: 0.3,
        duration: 400 + Math.random() * 300,
        ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }

    // Screen shake for negative
    if (outcome === "negative") {
      this.cameras.main.shake(120, 0.003);
    }

    // Pool glow pulse
    if (this.poolInner) {
      const glowColor = outcome === "negative" ? 0xEF5350 : outcome === "rare" ? 0xFFD54F : 0x4FC3F7;
      // Create a quick fill flash
      const flash = this.add.graphics();
      flash.fillStyle(glowColor, 0.15);
      flash.fillCircle(cx, cy, 80);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 600,
        onComplete: () => flash.destroy(),
      });
    }

    // Rare: extra golden beam
    if (outcome === "rare") {
      const beam = this.add.graphics();
      beam.fillStyle(0xFFD54F, 0.1);
      beam.fillTriangle(cx - 20, cy - 80, cx + 20, cy - 80, cx, cy);
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 800,
        onComplete: () => beam.destroy(),
      });
    }
  }

  // ── Organisms ──

  public spawnOrganism(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 40;
    const ang = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 15;
    const x = cx + Math.cos(ang) * dist;
    const y = cy + Math.sin(ang) * dist;
    const size = 4 + Math.random() * 6;
    const colors = [0x4FC3F7, 0x66BB6A, 0xBA68C8, 0xFFD54F];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const g = this.add.graphics();
    g.fillStyle(color, 0.7);
    g.fillEllipse(0, 0, size, size * 0.7);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillCircle(size * 0.2, -size * 0.1, size * 0.25);
    const container = this.add.container(x, y, [g]);
    container.setData("vx", (Math.random() - 0.5) * 0.6);
    container.setData("vy", (Math.random() - 0.5) * 0.6);
    container.setScale(0);
    this.organisms.push(container);
    this.tweens.add({
      targets: container, scale: 1, duration: 800, ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: g, alpha: { from: 0.7, to: 0.35 },
          duration: 2000, yoyo: true, repeat: -1,
        });
      },
    });
  }

  private updateOrganisms(delta: number): void {
    for (let i = this.organisms.length - 1; i >= 0; i--) {
      const org = this.organisms[i];
      if (!org || !org.active) { this.organisms.splice(i, 1); continue; }
      org.x += (org.getData("vx") as number) ?? 0;
      org.y += (org.getData("vy") as number) ?? 0;
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2 + 40;
      const dist = Phaser.Math.Distance.Between(org.x, org.y, cx, cy);
      if (dist > 125) {
        const ang = Phaser.Math.Angle.Between(cx, cy, org.x, org.y);
        org.setData("vx", Math.cos(ang + Math.PI) * 0.3);
        org.setData("vy", Math.sin(ang + Math.PI) * 0.3);
      }
    }
    this.organismSpawnTimer += delta;
    if (this.organismSpawnTimer > 4000 && this.organisms.length < 8) {
      this.organismSpawnTimer = 0;
      this.spawnOrganism();
    }
  }

  private updateResourceOrbs(): void {
    for (const orb of this.resourceOrbs) {
      if (!orb.active) continue;
      orb.angle += 0.15;
    }
  }

  // ── Drawing helpers ──

  private drawCrystal(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const r = i % 2 === 0 ? size * 0.55 : size * 0.35;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    g.fillStyle(color, 0.3);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, color, 0.7);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
    // Inner highlight
    g.fillStyle(0xFFFFFF, 0.3);
    g.fillCircle(0, -size * 0.1, size * 0.12);
  }

  private drawSpark(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    g.fillStyle(color, 0.3);
    g.fillCircle(0, 0, size * 0.5);
    g.lineStyle(1.5, color, 0.7);
    g.strokeCircle(0, 0, size * 0.5);
    const s2 = size * 0.35;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x1 = Math.cos(a) * s2;
      const y1 = Math.sin(a) * s2;
      const x2 = Math.cos(a) * (s2 * 0.3);
      const y2 = Math.sin(a) * (s2 * 0.3);
      g.lineStyle(1.5, color, 0.5);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillCircle(0, 0, size * 0.15);
  }

  private drawDroplet(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    g.fillStyle(color, 0.3);
    g.fillEllipse(0, 1, size * 0.55, size * 0.6);
    g.fillEllipse(-size * 0.1, -size * 0.15, size * 0.25, size * 0.3);
    g.lineStyle(1, color, 0.6);
    g.strokeEllipse(0, 1, size * 0.55, size * 0.6);
    g.fillStyle(0xFFFFFF, 0.3);
    g.fillCircle(-size * 0.12, -size * 0.2, size * 0.08);
  }

  private drawPulse(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    g.fillStyle(color, 0.15);
    g.fillCircle(0, 0, size * 0.6);
    g.lineStyle(2, color, 0.5);
    g.strokeCircle(0, 0, size * 0.6);
    g.lineStyle(1, color, 0.25);
    g.strokeCircle(0, 0, size * 0.4);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillCircle(0, 0, size * 0.12);
    // tiny orbiting dot
    g.fillStyle(color, 0.6);
    g.fillCircle(size * 0.45, 0, size * 0.08);
  }

  // ── Scene creation (unchanged) ──

  private createBackground(w: number, h: number): void {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0D0D1A, 0x0D0D1A, 0x16213E, 0x16213E, 1);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      g.fillStyle(0x4FC3F7, Phaser.Math.FloatBetween(0.05, 0.2));
      g.fillCircle(x, y, Phaser.Math.FloatBetween(0.5, 2));
    }
  }

  private createLightBeams(w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2 + 40;
    const beamColors = [0x4FC3F7, 0xBA68C8, 0x66BB6A];
    for (let i = 0; i < 5; i++) {
      const g = this.add.graphics();
      const bx = cx - 120 + i * 60 + Math.random() * 40;
      g.fillStyle(beamColors[i % 3], 0.04);
      g.fillTriangle(bx, 30, bx + 15, 30, bx - 25, cy + 70);
      g.fillTriangle(bx - 25, 30, bx + 40, 30, bx + 30, cy + 70);
      this.lightBeams.push(g);
      this.tweens.add({
        targets: g, alpha: { from: 0.3, to: 0.6 },
        duration: 3000 + i * 500, yoyo: true, repeat: -1,
      });
    }
  }

  private createPool(w: number, h: number): void {
    const cy = h / 2 + 40;
    this.poolOuter = this.add.graphics();
    this.poolOuter.fillStyle(0x4FC3F7, 0.06);
    this.poolOuter.fillCircle(w / 2, cy, 150);
    this.poolOuter.lineStyle(1, 0x4FC3F7, 0.15);
    this.poolOuter.strokeCircle(w / 2, cy, 150);

    const pg = this.add.graphics();
    pg.fillStyle(0x1A1A2E, 0.3);
    pg.fillCircle(w / 2, cy, 140);
    pg.fillStyle(0x16213E, 0.5);
    pg.fillCircle(w / 2, cy, 130);
    pg.fillStyle(0x0D0D1A, 0.6);
    pg.fillCircle(w / 2, cy, 115);
    pg.lineStyle(2, 0x4FC3F7, 0.3);
    pg.strokeCircle(w / 2, cy, 140);
    pg.lineStyle(1, 0x4FC3F7, 0.15);
    pg.strokeCircle(w / 2, cy, 120);

    this.poolInner = this.add.graphics();
    this.poolInner.fillStyle(0x4FC3F7, 0.04);
    this.poolInner.fillCircle(w / 2, cy, 80);

    const ringGraphics = this.add.graphics();
    this.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        ringGraphics.clear();
        ringGraphics.lineStyle(1, 0x4FC3F7, 0.12);
        ringGraphics.strokeCircle(w / 2, cy, 135);
        this.tweens.add({
          targets: {}, duration: 1500,
          onUpdate: (t) => {
            ringGraphics.clear();
            const r = 135 + t.progress * 12;
            ringGraphics.lineStyle(1, 0x4FC3F7, 0.12 * (1 - t.progress));
            ringGraphics.strokeCircle(w / 2, cy, r);
          },
        });
      },
    });
  }

  private createGridOverlay(w: number, h: number): void {
    const g = this.add.graphics();
    g.lineStyle(0.5, 0x4FC3F7, 0.04);
    for (let x = 40; x < w; x += 40) { g.moveTo(x, 0); g.lineTo(x, h); }
    for (let y = 40; y < h; y += 40) { g.moveTo(0, y); g.lineTo(w, y); }
    g.strokePath();
  }

  private createFloatingParticles(w: number, h: number): void {
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(40, w - 40);
      const y = Phaser.Math.Between(80, h - 160);
      const size = Phaser.Math.Between(2, 5);
      const colors = [0x4FC3F7, 0x66BB6A, 0xFFD54F, 0xBA68C8];
      const c = this.add.circle(x, y, size, colors[i % 4], 0.4);
      this.tweens.add({
        targets: c, y: y - 20 - Math.random() * 30, x: x + (Math.random() - 0.5) * 40,
        alpha: { from: 0.4, to: 0.1 },
        duration: 2500 + Math.random() * 2500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
    }
  }

  private createResourceOrbs(w: number, h: number): void {
    const cy = h / 2 + 40;
    const cx = w / 2;
    const orbData = [
      { color: 0xFFD54F, radius: 55, angle: 0 },
      { color: 0x66BB6A, radius: 55, angle: Math.PI / 2 },
      { color: 0x4FC3F7, radius: 55, angle: Math.PI },
      { color: 0xBA68C8, radius: 55, angle: Math.PI * 1.5 },
    ];
    for (const d of orbData) {
      const g = this.add.graphics();
      g.fillStyle(d.color, 0.15);
      g.fillCircle(0, 0, 10);
      g.lineStyle(1, d.color, 0.3);
      g.strokeCircle(0, 0, 10);
      const c = this.add.container(cx, cy, [g]);
      c.setData("radius", d.radius);
      c.setData("baseAngle", d.angle);
      c.setData("speed", 0.0003 + Math.random() * 0.0002);
      this.resourceOrbs.push(c);
    }
  }

  private createTitle(w: number, _h: number): void {
    this.titleText = this.add.text(w / 2, 84, "始源潮池", {
      fontSize: "22px", fontFamily: "system-ui, sans-serif", color: "#4FC3F7", fontStyle: "bold",
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setAlpha(0.6);
  }

  private createPoolHint(w: number, h: number): void {
    const cy = h / 2 + 40;

    // Arrow pointing from edge toward center
    this.poolHintArrow = this.add.graphics();
    const arrowX = w / 2 + 110;
    const arrowY = cy + 20;
    this.poolHintArrow.lineStyle(2, 0x4FC3F7, 0.35);
    this.poolHintArrow.beginPath();
    this.poolHintArrow.moveTo(arrowX, arrowY);
    this.poolHintArrow.lineTo(arrowX - 40, arrowY - 15);
    this.poolHintArrow.strokePath();
    // arrowhead
    this.poolHintArrow.fillStyle(0x4FC3F7, 0.35);
    this.poolHintArrow.fillTriangle(
      arrowX - 36, arrowY - 12,
      arrowX - 46, arrowY - 7,
      arrowX - 42, arrowY - 18,
    );

    this.poolHintText = this.add.text(w / 2 + 100, cy + 35, "把它引入潮池", {
      fontSize: "12px", fontFamily: "system-ui, sans-serif", color: "rgba(79,195,247,0.45)",
    });
    this.poolHintText.setOrigin(0.5);

    this.tweens.add({
      targets: this.poolHintText, alpha: { from: 0.5, to: 0.15 },
      duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  private createSediment(w: number, h: number): void {
    const cy = h / 2 + 40;
    const g = this.add.graphics();
    g.fillStyle(0x1A1A2E, 0.5);
    for (let i = 0; i < 5; i++) {
      g.fillEllipse(w / 2 + (i - 2) * 25, cy + 100 + i * 12, 50 + i * 20, 8 + i * 2);
    }
  }

  private createProceduralTextures(): void {
    const gfx = this.add.graphics();
    gfx.setVisible(false);
    gfx.fillStyle(0x4FC3F7, 0.8);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture("bubble", 8, 8);
    gfx.destroy();
  }
}
