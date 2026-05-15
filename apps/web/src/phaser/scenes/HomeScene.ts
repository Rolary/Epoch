import * as Phaser from "phaser";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

type ElementType = "crystal" | "spark" | "droplet" | "pulse";
type Outcome = "positive" | "negative" | "rare";

interface OrbitalParticle {
  container: Phaser.GameObjects.Container;
  angle: number;
  speed: number;
  radius: number;
  size: number;
  color: number;
}

interface DragElement {
  container: Phaser.GameObjects.Container;
  asset: Phaser.GameObjects.Image;
  type: ElementType;
  anchorX: number;
  anchorY: number;
  createdAt: number;
  floatPhase: number;
  swayPhase: number;
  swaySpeed: number;
  swayWidth: number;
  swayHeight: number;
  orbitalParticles: OrbitalParticle[];
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
  private poolShape!: Phaser.GameObjects.Graphics;
  private poolImage!: Phaser.GameObjects.Image;
  private particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private organisms: Phaser.GameObjects.Container[] = [];
  private lightBeams: { gfx: Phaser.GameObjects.Graphics; phase: number; speed: number }[] = [];
  private resourceOrbs: Phaser.GameObjects.Container[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private poolPulseTime = 0;
  private organismSpawnTimer = 0;
  private tapRipples: Phaser.GameObjects.Graphics[] = [];
  private causticGraphics!: Phaser.GameObjects.Graphics;
  private algaeGraphics!: Phaser.GameObjects.Graphics;
  private cloudGraphics!: Phaser.GameObjects.Graphics;
  private causticDrift = 0;
  private poolVertices: { x: number; y: number }[] = [];

  private dragElements: DragElement[] = [];
  private draggedElement: DragElement | null = null;
  private dragTrail!: Phaser.GameObjects.Graphics;
  private poolHintText!: Phaser.GameObjects.Text;
  private poolHintArrow!: Phaser.GameObjects.Graphics;
  private absorbCount = 0;
  private elementSpawnTimer = 0;
  private nextSpawnDelay = 5000;
  static readonly MAX_ELEMENTS = 4;
  static readonly POOL_ABSORB_RADIUS = 112;
  static readonly ELEMENT_POOL_AVOID_RADIUS = 150;

  onAbsorb?: (type: ElementType, outcome: Outcome) => void;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    this.createProceduralTextures();
    this.load.image("bg-home-tidepool", uiAssets.backgrounds.homeTidepool);
    this.load.image("pool-centerpiece", uiAssets.scene.poolCenterpiece);
    this.load.image("pickup-crystal", uiAssets.pickups.crystal);
    this.load.image("pickup-spark", uiAssets.pickups.spark);
    this.load.image("pickup-droplet", uiAssets.pickups.droplet);
    this.load.image("pickup-pulse", uiAssets.pickups.pulse);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.dragTrail = this.add.graphics();
    this.dragTrail.setDepth(10);

    this.createBackground(width, height);
    this.createLightBeams(width, height);
    this.createPool(width, height);
    this.createAlgaeAndClouds(width, height);
    this.createFloatingParticles(width, height);
    this.createResourceOrbs(width, height);
    this.createTitle(width, height);
    this.createPoolHint(width, height);

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
    if (this.poolImage) this.poolImage.setAlpha(0.96 + Math.sin(this.poolPulseTime * 0.0012) * 0.035);

    this.updateOrganisms(delta);
    this.updateResourceOrbs(delta);
    this.updateDragElements(delta);
    this.updateSpawning(delta);
    this.updateDragTrail();
    this.updateCaustics(delta);
    this.updateAlgaeAndClouds(delta);
    this.updateLightBeams(delta);
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
    const roll = Math.random();
    let type: ElementType;
    if (roll < 0.12) type = "pulse";
    else if (roll < 0.4) type = "crystal";
    else if (roll < 0.67) type = "spark";
    else type = "droplet";

    const cfg = ELEMENT_CONFIG[type];
    const asset = this.add.image(0, 0, `pickup-${type}`);
    asset.setDisplaySize(cfg.size * 5, cfg.size * 4.6);

    const { x, y } = this.randomElementPosition(width, height);

    const container = this.add.container(x, y, [asset]);
    container.setSize(cfg.size * 4, cfg.size * 4);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, cfg.size + 10), Phaser.Geom.Circle.Contains);
    container.setDepth(8);
    container.setScale(0);
    this.input.setDraggable(container);

    // Orbital particles
    const orbitalParticles: OrbitalParticle[] = [];
    for (let i = 0; i < 3; i++) {
      const oc = this.add.container(0, 0, [
        this.add.circle(0, 0, 1 + Math.random() * 1.5, cfg.color, 0.6),
      ]);
      container.add(oc);
      orbitalParticles.push({
        container: oc,
        angle: (Math.PI * 2 * i) / 3 + Math.random() * 0.5,
        speed: 0.02 + Math.random() * 0.03,
        radius: cfg.size * 0.5 + Math.random() * cfg.size * 0.3,
        size: 1 + Math.random() * 1.5,
        color: cfg.color,
      });
    }

    this.tweens.add({ targets: container, scale: 1, duration: 400, ease: "Back.easeOut" });

    const el: DragElement = {
      container, asset, type,
      anchorX: x,
      anchorY: y,
      createdAt: Date.now(),
      floatPhase: Math.random() * Math.PI * 2,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Phaser.Math.FloatBetween(0.42, 0.68),
      swayWidth: Phaser.Math.FloatBetween(8, 16),
      swayHeight: Phaser.Math.FloatBetween(3, 7),
      orbitalParticles,
    };
    this.dragElements.push(el);

    while (this.dragElements.length > HomeScene.MAX_ELEMENTS) {
      const oldest = this.dragElements.shift();
      if (oldest) {
        this.tweens.add({
          targets: oldest.container, alpha: 0, scale: 0, duration: 500,
          onComplete: () => { oldest.container.destroy(); },
        });
      }
    }
  }

  private spawnElementOfType(type: ElementType): void {
    const cfg = ELEMENT_CONFIG[type];
    const asset = this.add.image(0, 0, `pickup-${type}`);
    asset.setDisplaySize(cfg.size * 5, cfg.size * 4.6);

    const { width, height } = this.cameras.main;
    const { x, y } = this.randomElementPosition(width, height);

    const container = this.add.container(x, y, [asset]);
    container.setSize(cfg.size * 4, cfg.size * 4);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, cfg.size + 10), Phaser.Geom.Circle.Contains);
    container.setDepth(8);
    container.setScale(0);
    this.input.setDraggable(container);
    this.tweens.add({ targets: container, scale: 1, duration: 400, ease: "Back.easeOut" });

    const el: DragElement = {
      container, asset, type,
      anchorX: x,
      anchorY: y,
      createdAt: Date.now(),
      floatPhase: Math.random() * Math.PI * 2,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: Phaser.Math.FloatBetween(0.42, 0.68),
      swayWidth: Phaser.Math.FloatBetween(8, 16),
      swayHeight: Phaser.Math.FloatBetween(3, 7),
      orbitalParticles: [],
    };
    this.dragElements.push(el);

    while (this.dragElements.length > HomeScene.MAX_ELEMENTS) {
      const oldest = this.dragElements.shift();
      if (oldest) {
        this.tweens.add({
          targets: oldest.container, alpha: 0, scale: 0, duration: 500,
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
    const t = this.poolPulseTime * 0.001;
    const smooth = 1 - Math.pow(0.965, Math.min(delta, 33) / 16.67);

    for (const el of this.dragElements) {
      if (el === this.draggedElement) continue;

      const sway = t * el.swaySpeed + el.swayPhase;
      const slowCurrent = t * 0.18 + el.floatPhase;
      let targetX = el.anchorX + Math.sin(sway) * el.swayWidth + Math.sin(slowCurrent) * 5;
      let targetY = el.anchorY + Math.cos(sway * 0.82) * el.swayHeight + Math.sin(slowCurrent * 1.35) * 2;

      const fromPool = Phaser.Math.Distance.Between(targetX, targetY, cx, cy);
      if (fromPool < HomeScene.ELEMENT_POOL_AVOID_RADIUS) {
        const angle = Phaser.Math.Angle.Between(cx, cy, targetX, targetY);
        targetX = cx + Math.cos(angle) * HomeScene.ELEMENT_POOL_AVOID_RADIUS;
        targetY = cy + Math.sin(angle) * HomeScene.ELEMENT_POOL_AVOID_RADIUS;
      }

      el.container.x += (targetX - el.container.x) * smooth;
      el.container.y += (targetY - el.container.y) * smooth;
      this.keepElementInPlayArea(el, width, height);

      const s = 1 + Math.sin(t * 1.1 + el.floatPhase) * 0.025;
      if (el.container.active) el.container.setScale(s);

      // Update orbital particles
      for (const op of el.orbitalParticles) {
        op.angle += op.speed * delta * 0.06;
        op.container.x = Math.cos(op.angle) * op.radius;
        op.container.y = Math.sin(op.angle) * op.radius;
      }

      if (el.type === "pulse" && el.asset.active) el.asset.rotation += delta * 0.00025;
    }
  }

  private randomElementPosition(width: number, height: number): { x: number; y: number } {
    const cx = width / 2;
    const cy = height / 2 + 40;
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(34, width - 34);
      const y = Phaser.Math.Between(132, Math.max(160, height - 150));
      if (Phaser.Math.Distance.Between(x, y, cx, cy) > HomeScene.ELEMENT_POOL_AVOID_RADIUS + 8) {
        return { x, y };
      }
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    return {
      x: cx + side * (HomeScene.ELEMENT_POOL_AVOID_RADIUS + 36),
      y: cy + Phaser.Math.Between(-120, 120),
    };
  }

  private keepElementInPlayArea(el: DragElement, width: number, height: number): void {
    const minX = 28;
    const maxX = width - 28;
    const minY = 118;
    const maxY = height - 140;
    el.container.x = Phaser.Math.Clamp(el.container.x, minX, maxX);
    el.container.y = Phaser.Math.Clamp(el.container.y, minY, maxY);
    el.anchorX = Phaser.Math.Clamp(el.anchorX, minX + 10, maxX - 10);
    el.anchorY = Phaser.Math.Clamp(el.anchorY, minY + 8, maxY - 8);
  }

  // ── Drag handling ──

  private getTapElement(px: number, py: number): DragElement | null {
    for (const el of this.dragElements) {
      const dx = px - el.container.x;
      const dy = py - el.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ELEMENT_CONFIG[el.type].size + 14) return el;
    }
    return null;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const el = this.getTapElement(pointer.x, pointer.y);
    if (el) {
      this.draggedElement = el;
      this.tweens.killTweensOf(el.container);
      this.tweens.add({ targets: el.container, scale: 1.15, duration: 150, ease: "Back.easeOut" });
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggedElement) {
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2 + 40;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, cx, cy) < HomeScene.POOL_ABSORB_RADIUS + 30) {
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
    if (Phaser.Math.Distance.Between(el.container.x, el.container.y, cx, cy) < HomeScene.POOL_ABSORB_RADIUS) {
      this.absorbElement(el);
    } else {
      if (Phaser.Math.Distance.Between(el.container.x, el.container.y, cx, cy) < HomeScene.ELEMENT_POOL_AVOID_RADIUS) {
        const angle = Phaser.Math.Angle.Between(cx, cy, el.container.x, el.container.y);
        el.container.x = cx + Math.cos(angle) * HomeScene.ELEMENT_POOL_AVOID_RADIUS;
        el.container.y = cy + Math.sin(angle) * HomeScene.ELEMENT_POOL_AVOID_RADIUS;
      }
      el.anchorX = el.container.x;
      el.anchorY = el.container.y;
      this.keepElementInPlayArea(el, this.cameras.main.width, this.cameras.main.height);
      this.tweens.add({ targets: el.container, scale: 1, duration: 300, ease: "Back.easeOut" });
    }
  }

  private updateDragTrail(): void {
    this.dragTrail.clear();
    if (!this.draggedElement) return;
    const x = this.draggedElement.container.x;
    const y = this.draggedElement.container.y;
    const cfg = ELEMENT_CONFIG[this.draggedElement.type];
    this.dragTrail.lineStyle(1.5, cfg.color, 0.25);
    for (let i = 0; i < 8; i++) {
      const ox = x + (Math.random() - 0.5) * 14;
      const oy = y + (Math.random() - 0.5) * 14;
      this.dragTrail.fillStyle(cfg.color, 0.12);
      this.dragTrail.fillCircle(ox, oy, 1.5 + i * 0.6);
    }
  }

  // ── Absorption ──

  private absorbElement(el: DragElement): void {
    const talents = useGameStore.getState().save?.talents ?? [];
    const hasAdaptiveBuffer = talents.some((t) => t.trait?.id === "adaptive_buffer");
    const negativeThreshold = hasAdaptiveBuffer ? 0.85 : 0.7;
    const roll = Math.random();
    let outcome: Outcome;
    if (el.type === "pulse") outcome = "rare";
    else if (roll < negativeThreshold) outcome = "positive";
    else outcome = "negative";

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    this.tweens.add({
      targets: el.container, x: cx, y: cy, scale: 0, alpha: 0, duration: 300, ease: "Quad.easeIn",
      onComplete: () => {
        el.container.destroy();
        const idx = this.dragElements.indexOf(el);
        if (idx >= 0) this.dragElements.splice(idx, 1);
      },
    });

    this.playAbsorbFeedback(cx, cy, el.type, outcome, hasAdaptiveBuffer && outcome === "negative");

    this.absorbCount++;
    if (this.absorbCount >= 3 && this.poolHintText.visible) {
      this.tweens.add({
        targets: [this.poolHintText, this.poolHintArrow],
        alpha: 0, duration: 400,
        onComplete: () => { this.poolHintText.setVisible(false); this.poolHintArrow.setVisible(false); },
      });
    }

    this.onAbsorb?.(el.type, outcome);

    const hasPulseSurge = talents.some((t) => t.trait?.id === "pulse_surge");
    if (hasPulseSurge && this.absorbCount % 4 === 0) {
      this.spawnElementOfType("pulse");
    }

    const hasChainReaction = talents.some((t) => t.trait?.id === "chain_reaction");
    if (hasChainReaction && el.type === "spark" && this.dragElements.length > 0) {
      const cx2 = this.cameras.main.width / 2;
      const cy2 = this.cameras.main.height / 2 + 40;
      const sorted = [...this.dragElements]
        .map((e) => ({ e, d: Phaser.Math.Distance.Between(e.container.x, e.container.y, cx2, cy2) }))
        .sort((a, b) => a.d - b.d);
      for (let i = 0; i < Math.min(2, sorted.length); i++) {
        if (Math.random() < 0.5) this.absorbElement(sorted[i].e);
      }
    }
  }

  private playAbsorbFeedback(cx: number, cy: number, type: ElementType, outcome: Outcome, skipShake = false): void {
    const cfg = ELEMENT_CONFIG[type];

    const ripple = this.add.graphics();
    this.tapRipples.push(ripple);
    this.tweens.add({
      targets: {}, duration: 600,
      onUpdate: (t) => {
        ripple.clear();
        const r = 20 + t.progress * 50;
        const a = 0.6 * (1 - t.progress);
        const col = outcome === "negative" ? 0xEF5350 : outcome === "rare" ? 0xFFD54F : cfg.color;
        ripple.lineStyle(2, col, a);
        ripple.strokeCircle(cx, cy, r);
      },
      onComplete: () => { ripple.destroy(); const idx = this.tapRipples.indexOf(ripple); if (idx >= 0) this.tapRipples.splice(idx, 1); },
    });

    const burstColors = outcome === "negative"
      ? [0xEF5350, 0xFF8A80, 0xFFCDD2]
      : outcome === "rare"
      ? [0xFFD54F, 0xFFAB40, 0xFFFFFF, cfg.color]
      : [cfg.color, 0xFFFFFF, cfg.color];

    for (let i = 0; i < (outcome === "rare" ? 20 : 10); i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 40;
      const col = burstColors[Math.floor(Math.random() * burstColors.length)];
      const p = this.add.circle(cx, cy, 1.5 + Math.random() * 3, col, 0.9);
      this.tweens.add({
        targets: p, x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist,
        alpha: 0, scale: 0.3, duration: 400 + Math.random() * 300, ease: "Quad.easeOut",
        onComplete: () => p.destroy(),
      });
    }

    if (outcome === "negative" && !skipShake) this.cameras.main.shake(120, 0.003);

    if (this.poolInner) {
      const glowColor = outcome === "negative" ? 0xEF5350 : outcome === "rare" ? 0xFFD54F : 0x4FC3F7;
      const flash = this.add.graphics();
      flash.setDepth(5);
      flash.fillStyle(glowColor, 0.15);
      flash.fillCircle(cx, cy, 80);
      this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    }

    if (outcome === "rare") {
      const beam = this.add.graphics();
      beam.setDepth(5);
      beam.fillStyle(0xFFD54F, 0.1);
      beam.fillTriangle(cx - 20, cy - 80, cx + 20, cy - 80, cx, cy);
      this.tweens.add({ targets: beam, alpha: 0, duration: 800, onComplete: () => beam.destroy() });
    }
  }

  // ── Organisms ──

  public spawnOrganism(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 40;
    const ang = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(ang) * 110;
    const y = cy + Math.sin(ang) * 110;
    const size = 4 + Math.random() * 6;
    const colors = [0x4FC3F7, 0x66BB6A, 0xBA68C8, 0xFFD54F];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const g = this.add.graphics();
    g.setDepth(4);
    g.fillStyle(color, 0.6);
    g.fillEllipse(0, 0, size, size * 0.65);
    g.fillStyle(0xFFFFFF, 0.45);
    g.fillCircle(size * 0.2, -size * 0.1, size * 0.22);
    const container = this.add.container(x, y, [g]);
    container.setDepth(4);
    container.setData("vx", (Math.random() - 0.5) * 0.6);
    container.setData("vy", (Math.random() - 0.5) * 0.6);
    container.setScale(0);
    this.organisms.push(container);
    this.tweens.add({
      targets: container, scale: 1, duration: 800, ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({ targets: g, alpha: { from: 0.6, to: 0.3 }, duration: 2000, yoyo: true, repeat: -1 });
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
      if (dist > 130) {
        const ang = Phaser.Math.Angle.Between(cx, cy, org.x, org.y);
        org.setData("vx", Math.cos(ang + Math.PI) * 0.4);
        org.setData("vy", Math.sin(ang + Math.PI) * 0.4);
      }
    }
    this.organismSpawnTimer += delta;
    if (this.organismSpawnTimer > 4000 && this.organisms.length < 10) {
      this.organismSpawnTimer = 0;
      this.spawnOrganism();
    }
  }

  // ── Resource orbs — inertial floating ──

  private updateResourceOrbs(_delta: number): void {
    const t = this.poolPulseTime;
    for (const orb of this.resourceOrbs) {
      if (!orb.active) continue;
      // Apply gentle random acceleration + damping
      let vx = (orb.getData("vx") as number) || 0;
      let vy = (orb.getData("vy") as number) || 0;
      vx += (Math.random() - 0.5) * 0.04;
      vy += (Math.random() - 0.5) * 0.04;
      vx *= 0.98;
      vy *= 0.98;
      orb.x += vx;
      orb.y += vy;
      // Bobbing
      orb.y += Math.sin(t * 0.0015 + orb.getData("phase") as number) * 0.8;
      // Containment: pull back if too far from pool center
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2 + 40;
      const dist = Phaser.Math.Distance.Between(orb.x, orb.y, cx, cy);
      if (dist > 120) {
        const ang = Phaser.Math.Angle.Between(cx, cy, orb.x, orb.y);
        orb.x -= Math.cos(ang) * 0.6;
        orb.y -= Math.sin(ang) * 0.6;
        vx *= 0.5;
        vy *= 0.5;
      }
      // Mutual repulsion
      for (const other of this.resourceOrbs) {
        if (other === orb || !other.active) continue;
        const d = Phaser.Math.Distance.Between(orb.x, orb.y, other.x, other.y);
        if (d < 30) {
          const ang = Phaser.Math.Angle.Between(orb.x, orb.y, other.x, other.y);
          orb.x -= Math.cos(ang) * 0.3;
          orb.y -= Math.sin(ang) * 0.3;
        }
      }
      orb.setData("vx", vx);
      orb.setData("vy", vy);
    }
  }

  // ── Caustics & algae ──

  private updateCaustics(delta: number): void {
    this.causticDrift += delta * 0.05;
    this.causticGraphics.clear();
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    for (let i = 0; i < 14; i++) {
      const phase = this.causticDrift + i * 0.7;
      const x1 = cx - 110 + Math.sin(phase * 0.13) * 40 + i * 16;
      const y1 = cy + 50 + Math.cos(phase * 0.11) * 30;
      const cp = 10 + Math.sin(phase * 0.17) * 6;
      this.causticGraphics.lineStyle(1, 0x4FC3F7, 0.025 + Math.abs(Math.sin(phase * 0.2)) * 0.02);
      this.causticGraphics.beginPath();
      this.causticGraphics.moveTo(x1, y1);
      this.causticGraphics.lineTo(x1 + cp * 2, y1 + cp);
      this.causticGraphics.strokePath();
    }
  }

  private updateAlgaeAndClouds(delta: number): void {
    const t = this.poolPulseTime;
    this.algaeGraphics.clear();
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    for (let i = 0; i < 4; i++) {
      const ax = cx - 80 + Math.sin(t * 0.0004 + i * 1.5) * 70;
      const ay = cy + 10 + Math.cos(t * 0.0005 + i * 1.8) * 35;
      const s = 8 + Math.sin(t * 0.001 + i) * 3;
      this.algaeGraphics.fillStyle(0x66BB6A, 0.06);
      this.algaeGraphics.fillEllipse(ax, ay, s * 3, s);
      this.algaeGraphics.fillStyle(0x4FC3F7, 0.04);
      this.algaeGraphics.fillEllipse(ax + s, ay - 2, s * 2, s * 0.7);
    }

    this.cloudGraphics.clear();
    for (let i = 0; i < 3; i++) {
      const clx = cx - 60 + Math.sin(t * 0.0003 + i * 2.3) * 80;
      const cly = cy - 30 + Math.cos(t * 0.00035 + i * 2.1) * 40;
      const r = 15 + Math.sin(t * 0.0006 + i) * 5;
      this.cloudGraphics.fillStyle(0x16213E, 0.15);
      this.cloudGraphics.fillEllipse(clx, cly, r * 2.5, r * 1.5);
      this.cloudGraphics.fillEllipse(clx + r, cly + 4, r * 1.8, r);
    }
  }

  private updateLightBeams(_delta: number): void {
    const t = this.poolPulseTime;
    for (const beam of this.lightBeams) {
      const a = 0.2 + Math.sin(t * 0.0008 + beam.phase) * 0.15;
      beam.gfx.setAlpha(Math.max(0.04, a));
    }
  }

  // ── Drawing helpers — enhanced elements ──

  private drawCrystalElement(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    const s = size * 0.5;
    // Outer 10-point star
    g.lineStyle(1.2, color, 0.6);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? s * 1.05 : s * 0.55;
      if (i === 0) g.beginPath();
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      if (i === 9) g.closePath();
    }
    g.fillStyle(color, 0.12);
    g.fillPath();
    g.strokePath();

    // Internal cut lines (pavilion facets)
    g.lineStyle(0.8, 0xFFFFFF, 0.25);
    const cx = 0, cy = 0;
    for (let i = 0; i < 3; i++) {
      const a1 = (Math.PI * 2 * (i * 2 + 1)) / 6 - Math.PI / 2;
      const a2 = (Math.PI * 2 * (i * 2 + 3)) / 6 - Math.PI / 2;
      const rIn = s * 0.2;
      g.beginPath();
      g.moveTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
      g.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
      g.strokePath();
    }

    // Center highlight
    g.fillStyle(0xFFFFFF, 0.35);
    g.fillCircle(cx, cy - s * 0.05, s * 0.12);

    // Vertex bright spots
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      g.fillStyle(0xFFFFFF, 0.4);
      g.fillCircle(Math.cos(a) * s * 1.05, Math.sin(a) * s * 1.05, s * 0.08);
    }
  }

  private drawSparkElement(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    const s = size * 0.5;
    // Irregular star core
    g.fillStyle(color, 0.18);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const r = s * (0.35 + (i % 3 === 0 ? 0.15 : 0));
      if (i === 0) g.beginPath();
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fillPath();

    // Branching arc tendrils
    g.lineStyle(1, color, 0.5);
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + 0.3;
      const r1 = s * 0.45;
      const r2 = s * 0.8;
      const r3 = s * 0.65;
      g.beginPath();
      g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      g.strokePath();
      // fork
      const af = a + 0.4;
      g.beginPath();
      g.moveTo(Math.cos(a) * r2, Math.sin(a) * r2);
      g.lineTo(Math.cos(af) * r3, Math.sin(af) * r3);
      g.strokePath();
    }

    // Bright center
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillCircle(0, 0, s * 0.15);
    g.fillStyle(color, 0.4);
    g.fillCircle(0, 0, s * 0.25);

    // Outer glow ring
    g.lineStyle(1.5, color, 0.2);
    g.strokeCircle(0, 0, s * 0.65);
  }

  private drawDropletElement(g: Phaser.GameObjects.Graphics, color: number, size: number): void {
    const s = size * 0.5;
    // Irregular bezier blob
    g.fillStyle(color, 0.2);
    g.lineStyle(1, color, 0.4);
    const pts = 8;
    g.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (Math.PI * 2 * i) / pts;
      const rx = Math.cos(a) * s * 0.65;
      const ry = Math.sin(a) * s * 0.55;
      const wobbleX = (i % 3 === 0 ? s * 0.1 : 0) * Math.cos(a);
      const wobbleY = (i % 3 === 0 ? s * 0.08 : 0) * Math.sin(a);
      if (i === 0) g.moveTo(rx + wobbleX, ry + wobbleY);
      else g.lineTo(rx + wobbleX, ry + wobbleY);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Inner organelle dots
    g.fillStyle(0x1A3A2A, 0.4);
    g.fillCircle(s * 0.15, -s * 0.1, s * 0.14);
    g.fillCircle(-s * 0.2, s * 0.05, s * 0.1);

    // Membrane highlight
    g.fillStyle(0xFFFFFF, 0.35);
    g.fillCircle(-s * 0.25, -s * 0.25, s * 0.1);

    // Soft ground glow
    g.fillStyle(color, 0.06);
    g.fillEllipse(0, s * 0.2, s * 1.1, s * 0.3);
  }

  private drawPulseElement(g: Phaser.GameObjects.Graphics, color: number, _size: number): void {
    this.drawPulseFrame(g, color, ELEMENT_CONFIG.pulse.size, this.poolPulseTime);
  }

  private drawPulseFrame(g: Phaser.GameObjects.Graphics, color: number, size: number, t: number): void {
    const s = size * 0.5;

    // 3 rotating arc rings
    for (let i = 0; i < 3; i++) {
      const phase = t * 0.001 + (Math.PI * 2 * i) / 3;
      const startA = phase;
      const length = Math.PI * 1.2 + Math.sin(phase) * 0.3;
      const r = s * (0.5 + i * 0.2);
      g.lineStyle(1.2, color, 0.2 + i * 0.08);
      g.beginPath();
      for (let j = 0; j <= 16; j++) {
        const a = startA + (length * j) / 16;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (j === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }

    // Bright core
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillCircle(0, 0, s * 0.12);
    g.fillStyle(color, 0.35);
    g.fillCircle(0, 0, s * 0.22);
    g.fillStyle(color, 0.08);
    g.fillCircle(0, 0, s * 0.35);

    // Outer diffusion ring
    const pulseAlpha = 0.12 + Math.sin(t * 0.003) * 0.06;
    g.lineStyle(1.5, color, pulseAlpha);
    g.strokeCircle(0, 0, s * 0.75);
  }

  // ── Scene creation ──

  private createBackground(w: number, h: number): void {
    const bg = this.add.image(w / 2, h / 2, "bg-home-tidepool");
    const scale = Math.max(w / bg.width, h / bg.height);
    bg.setScale(scale);
    bg.setDepth(-20);

    const vignette = this.add.graphics();
    vignette.setDepth(-10);
    vignette.fillGradientStyle(0x020408, 0x020408, 0x020408, 0x020408, 0.18, 0.18, 0.72, 0.78);
    vignette.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      vignette.fillStyle(0x4FC3F7, Phaser.Math.FloatBetween(0.025, 0.09));
      vignette.fillCircle(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), Phaser.Math.FloatBetween(0.5, 1.6));
    }
  }

  private createLightBeams(w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2 + 40;
    const beamColors = [0x4FC3F7, 0xBA68C8, 0x66BB6A, 0x4FC3F7, 0xBA68C8];
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics();
      g.setDepth(-8);
      const bx = cx - 140 + i * 55 + Math.random() * 30;
      const halfW = 8 + Math.random() * 18;
      g.fillStyle(beamColors[i % 5], 0.025 + Math.random() * 0.02);
      g.fillTriangle(bx, 20, bx + halfW, 25, bx - halfW * 1.2, cy + 60);
      this.lightBeams.push({ gfx: g, phase: Math.random() * Math.PI * 2, speed: 0.0006 + Math.random() * 0.0004 });
    }
  }

  private createPool(w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2 + 40;

    this.poolImage = this.add.image(cx, cy, "pool-centerpiece");
    const poolSize = Math.min(w * 0.92, 380);
    this.poolImage.setDisplaySize(poolSize, poolSize);
    this.poolImage.setDepth(1);
    this.poolImage.setAlpha(0.98);

    // Irregular polygon pool shape (14 vertices)
    this.poolVertices = [];
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      const baseR = 140;
      const jitter = (i % 3 === 0 ? 8 : i % 5 === 0 ? -5 : 3) + Math.random() * 4;
      this.poolVertices.push({
        x: cx + Math.cos(a) * (baseR + jitter),
        y: cy + Math.sin(a) * (baseR + jitter) * 0.85,
      });
    }

    this.poolOuter = this.add.graphics();
    this.poolOuter.setDepth(0);
    this.poolOuter.fillStyle(0x4FC3F7, 0.04);
    this.poolOuter.beginPath();
    for (let i = 0; i < this.poolVertices.length; i++) {
      const p = this.poolVertices[i];
      if (i === 0) this.poolOuter.moveTo(p.x, p.y);
      else this.poolOuter.lineTo(p.x, p.y);
    }
    this.poolOuter.closePath();
    this.poolOuter.fillPath();
    this.poolOuter.lineStyle(1, 0x4FC3F7, 0.1);
    this.poolOuter.strokePath();

    // 3 nested layers
    for (let layer = 0; layer < 3; layer++) {
      const g = this.add.graphics();
      const scale = 1 - (layer + 1) * 0.04;
      const alpha = 0.15 - layer * 0.04;
      const rBase = 140 * scale;
      g.fillStyle(0x0D0D1A, 0.25 + layer * 0.1);
      g.beginPath();
      for (let i = 0; i < this.poolVertices.length; i++) {
        const a = (Math.PI * 2 * i) / this.poolVertices.length;
        const px = cx + Math.cos(a) * rBase;
        const py = cy + Math.sin(a) * rBase * 0.85;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.lineStyle(0.5, 0x4FC3F7, alpha);
      g.strokePath();
    }

    this.poolShape = this.add.graphics();
    this.poolInner = this.add.graphics();
    this.poolInner.setDepth(2);
    this.poolInner.fillStyle(0x4FC3F7, 0.03);
    this.poolInner.fillCircle(cx, cy, 80);

    // Mineral clusters along edge
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 + Math.random() * 0.3;
      const r = 135 + Math.random() * 12;
      const mx = cx + Math.cos(a) * r;
      const my = cy + Math.sin(a) * r;
      const cg = this.add.graphics();
      for (let j = 0; j < 3; j++) {
        const sx = mx + (Math.random() - 0.5) * 8;
        const sy = my + (Math.random() - 0.5) * 6;
        const ss = 2 + Math.random() * 2.5;
        cg.fillStyle(0x4FC3F7, 0.3);
        cg.fillCircle(sx, sy, ss);
        cg.fillStyle(0xFFFFFF, 0.2);
        cg.fillCircle(sx - ss * 0.2, sy - ss * 0.3, ss * 0.35);
      }
    }

    // Pebbles
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + 0.5;
      const r = 130 + Math.random() * 15;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r + 85 + Math.random() * 12;
      const pg = this.add.graphics();
      pg.fillStyle(0x1A1A2E, 0.5);
      pg.fillEllipse(px, py, 8 + Math.random() * 6, 5 + Math.random() * 3);
      pg.fillStyle(0x2A2A3E, 0.3);
      pg.fillEllipse(px - 1, py - 1, 5 + Math.random() * 3, 3 + Math.random() * 2);
    }

    // Sediment mounds
    for (let i = 0; i < 5; i++) {
      const sx = cx - 60 + i * 30 + (Math.random() - 0.5) * 20;
      const sy = cy + 95 + i * 8 + (Math.random() - 0.5) * 6;
      const sg = this.add.graphics();
      sg.fillStyle(0x1A1A2E, 0.3);
      sg.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = (Math.PI * j) / 7;
        const rx = Math.cos(a) * (20 + j * 2) + (Math.random() - 0.5) * 6;
        const ry = Math.sin(a) * (6 + j * 1.5);
        if (j === 0) sg.moveTo(sx + rx, sy + ry);
        else sg.lineTo(sx + rx, sy + ry);
      }
      sg.closePath();
      sg.fillPath();
      sg.fillStyle(0x2A2A3E, 0.2);
      sg.fillEllipse(sx + 3, sy - 2, 25 + Math.random() * 10, 4 + Math.random() * 2);
    }

    // Caustic and algae layers
    this.causticGraphics = this.add.graphics();
    this.causticGraphics.setDepth(3);
    this.causticDrift = 0;
    this.algaeGraphics = this.add.graphics();
    this.algaeGraphics.setDepth(3);
    this.cloudGraphics = this.add.graphics();
    this.cloudGraphics.setDepth(2);

    // Ring pulse
    const ringGraphics = this.add.graphics();
    ringGraphics.setDepth(4);
    this.time.addEvent({
      delay: 3000, loop: true,
      callback: () => {
        ringGraphics.clear();
        ringGraphics.lineStyle(1, 0x4FC3F7, 0.12);
        ringGraphics.strokeCircle(cx, cy, 135);
        this.tweens.add({
          targets: {}, duration: 1500,
          onUpdate: (t) => {
            ringGraphics.clear();
            const r = 135 + t.progress * 12;
            ringGraphics.lineStyle(1, 0x4FC3F7, 0.12 * (1 - t.progress));
            ringGraphics.strokeCircle(cx, cy, r);
          },
        });
      },
    });
  }

  private createAlgaeAndClouds(w: number, _h: number): void {
    // Algae and clouds are created and updated dynamically in updateAlgaeAndClouds
  }

  private createFloatingParticles(w: number, h: number): void {
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(40, w - 40);
      const y = Phaser.Math.Between(80, h - 160);
      const size = Phaser.Math.Between(2, 5);
      const colors = [0x4FC3F7, 0x66BB6A, 0xFFD54F, 0xBA68C8];
      const c = this.add.circle(x, y, size, colors[i % 4], 0.4);
      c.setDepth(4);
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
      { color: 0xFFD54F, icon: "⚡", label: "能量" },
      { color: 0x66BB6A, icon: "🧪", label: "有机质" },
      { color: 0x4FC3F7, icon: "💎", label: "矿物质" },
      { color: 0xBA68C8, icon: "🛡️", label: "稳定性" },
    ];
    for (const d of orbData) {
      const g = this.add.graphics();
      g.fillStyle(d.color, 0.12);
      g.fillCircle(0, 0, 12);
      g.lineStyle(1, d.color, 0.25);
      g.strokeCircle(0, 0, 12);
      // Scattered start positions
      const startX = cx + (Math.random() - 0.5) * 180;
      const startY = cy + (Math.random() - 0.5) * 120;
      const c = this.add.container(startX, startY, [g]);
      c.setDepth(4);
      c.setData("vx", (Math.random() - 0.5) * 0.5);
      c.setData("vy", (Math.random() - 0.5) * 0.5);
      c.setData("phase", Math.random() * Math.PI * 2);
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
    this.poolHintArrow = this.add.graphics();
    this.poolHintArrow.setDepth(6);
    const arrowX = w / 2 + 110;
    const arrowY = cy + 20;
    this.poolHintArrow.lineStyle(2, 0x4FC3F7, 0.35);
    this.poolHintArrow.beginPath();
    this.poolHintArrow.moveTo(arrowX, arrowY);
    this.poolHintArrow.lineTo(arrowX - 40, arrowY - 15);
    this.poolHintArrow.strokePath();
    this.poolHintArrow.fillStyle(0x4FC3F7, 0.35);
    this.poolHintArrow.fillTriangle(arrowX - 36, arrowY - 12, arrowX - 46, arrowY - 7, arrowX - 42, arrowY - 18);
    this.poolHintText = this.add.text(w / 2 + 100, cy + 35, "把它引入潮池", {
      fontSize: "12px", fontFamily: "system-ui, sans-serif", color: "rgba(79,195,247,0.45)",
    });
    this.poolHintText.setDepth(6);
    this.poolHintText.setOrigin(0.5);
    this.tweens.add({
      targets: this.poolHintText, alpha: { from: 0.5, to: 0.15 },
      duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
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
