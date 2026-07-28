import * as Phaser from "phaser";
import { phaserAssets } from "../../assets/uiAssets.js";
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
  appearingUntil: number;
  exiting: boolean;
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
  private ecologyStageGraphics!: Phaser.GameObjects.Graphics;
  private shorelineBaseGraphics!: Phaser.GameObjects.Graphics;
  private shorelineTraceGraphics!: Phaser.GameObjects.Graphics;
  private shorelineBaseImage!: Phaser.GameObjects.Image;
  private shorelineTraceImage!: Phaser.GameObjects.Image;
  private shoreGuide!: Phaser.GameObjects.Container;
  private shoreGuideDragging = false;
  private shoreGuideSubmitting = false;
  private shoreGuideHome = { x: 0, y: 0 };
  private shoreGuideTarget = { x: 0, y: 0 };
  private shorelinePreviewOption: string | null = null;
  private shorelinePreviewHandler?: (event: Event) => void;
  private causticDrift = 0;
  private poolVertices: { x: number; y: number }[] = [];
  private ambientRedrawTimer = 0;
  private ecologyStageRedrawTimer = 0;
  private hiddenTraceHandler?: (event: Event) => void;
  private reducedMotion = false;
  private motionPreference?: MediaQueryList;
  private motionPreferenceHandler?: (event: MediaQueryListEvent) => void;

  private dragElements: DragElement[] = [];
  private draggedElement: DragElement | null = null;
  private dragTrail!: Phaser.GameObjects.Graphics;
  private dragWell!: Phaser.GameObjects.Graphics;
  private dragTrailPoints: Array<{ x: number; y: number }> = [];
  private poolHintText!: Phaser.GameObjects.Text;
  private poolHintArrow!: Phaser.GameObjects.Graphics;
  private absorbCount = 0;
  private elementSpawnTimer = 0;
  private nextSpawnDelay = 5000;
  static readonly MAX_ELEMENTS = 2;
  static readonly POOL_ABSORB_RADIUS = 112;
  static readonly ELEMENT_POOL_AVOID_RADIUS = 150;

  onAbsorb?: (type: ElementType, outcome: Outcome) => void;
  onGuideShore?: () => Promise<void>;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    this.createProceduralTextures();
    this.load.image("bg-home-tidepool", phaserAssets.backgrounds.homeTidepool);
    this.load.image("pool-centerpiece", phaserAssets.scene.poolCenterpiece);
    this.load.image("pickup-crystal", phaserAssets.pickups.crystal);
    this.load.image("pickup-spark", phaserAssets.pickups.spark);
    this.load.image("pickup-droplet", phaserAssets.pickups.droplet);
    this.load.image("pickup-pulse", phaserAssets.pickups.pulse);
    this.load.image("hidden-trace-pixel-glint", phaserAssets.hiddenTraces.pixelGlint);
    this.load.image("hidden-trace-triple-current", phaserAssets.hiddenTraces.tripleCurrent);
    this.load.image("hidden-trace-neon-fault", phaserAssets.hiddenTraces.neonFault);
    this.load.image("hidden-trace-quiet-ripple", phaserAssets.hiddenTraces.quietRipple);
    this.load.image("shoreline-wet-rock", phaserAssets.shoreline.wetRockOverlay);
    this.load.image("shoreline-moisture-film", phaserAssets.shoreline.moistureFilm);
    this.load.image("shoreline-rock-attachment", phaserAssets.shoreline.rockAttachment);
    this.load.image("shoreline-tidal-dispersal", phaserAssets.shoreline.tidalDispersal);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.motionPreference?.matches ?? false;
    this.motionPreferenceHandler = (event) => {
      this.reducedMotion = event.matches;
    };
    this.motionPreference?.addEventListener?.("change", this.motionPreferenceHandler);
    this.dragTrail = this.add.graphics();
    this.dragTrail.setDepth(10);
    this.dragWell = this.add.graphics();
    this.dragWell.setDepth(6);

    this.createBackground(width, height);
    this.createLightBeams(width, height);
    this.createPool(width, height);
    this.createAlgaeAndClouds(width, height);
    this.createEcologyStageLayer();
    this.createShorelineLayer(width, height);
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
    this.nextSpawnDelay = 6500;
    this.time.delayedCall(250, () => {
      if (this.dragElements.length === 0) this.spawnElement();
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    this.input.on("pointerup", (_pointer: Phaser.Input.Pointer) => this.onPointerUp());

    this.hiddenTraceHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ visualCue?: string }>).detail;
      this.playHiddenTraceRipple(detail?.visualCue ?? "quiet_ripple");
    };
    window.addEventListener("hidden-trace-discovered", this.hiddenTraceHandler);
    this.shorelinePreviewHandler = (event: Event) => {
      this.shorelinePreviewOption = (event as CustomEvent<{ optionId?: string | null }>).detail?.optionId ?? null;
      this.updateShorelineLayer();
    };
    window.addEventListener("shoreline-choice-preview", this.shorelinePreviewHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.hiddenTraceHandler) window.removeEventListener("hidden-trace-discovered", this.hiddenTraceHandler);
      if (this.shorelinePreviewHandler) window.removeEventListener("shoreline-choice-preview", this.shorelinePreviewHandler);
      if (this.motionPreferenceHandler) this.motionPreference?.removeEventListener?.("change", this.motionPreferenceHandler);
    });
  }

  update(_time: number, delta: number): void {
    this.poolPulseTime += delta;
    const pulse = 1 + Math.sin(this.poolPulseTime * 0.001) * (this.reducedMotion ? 0.006 : 0.03);
    if (this.poolOuter) this.poolOuter.setAlpha(0.15 * pulse * 5);
    if (this.poolInner) this.poolInner.setAlpha(0.08 * pulse * 5);
    if (this.poolImage) this.poolImage.setAlpha(0.97 + Math.sin(this.poolPulseTime * 0.0012) * (this.reducedMotion ? 0.008 : 0.025));

    this.updateOrganisms(delta);
    this.updateResourceOrbs(delta);
    this.updateDragElements(delta);
    this.updateSpawning(delta);
    this.updateDragTrail();
    this.ambientRedrawTimer += delta;
    if (this.ambientRedrawTimer >= 80) {
      this.updateCaustics(this.ambientRedrawTimer);
      this.updateAlgaeAndClouds(this.ambientRedrawTimer);
      this.ambientRedrawTimer = 0;
    }
    this.ecologyStageRedrawTimer += delta;
    if (this.ecologyStageRedrawTimer >= 120) {
      this.updateEcologyStageLayer();
      this.updateShorelineLayer();
      this.ecologyStageRedrawTimer = 0;
    }
    this.updateLightBeams(delta);
  }

  private playHiddenTraceRipple(visualCue: string): void {
    const { width, height } = this.cameras.main;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const color = visualCue === "neon_fault"
      ? 0xff4fd8
      : visualCue === "pixel_glint"
        ? 0xffd54f
        : visualCue === "triple_current"
          ? 0x7ce6c8
          : 0xc9a7ff;
    const count = reducedMotion ? 1 : visualCue === "triple_current" ? 3 : 2;
    const textureKey = visualCue === "neon_fault"
      ? "hidden-trace-neon-fault"
      : visualCue === "pixel_glint" || visualCue === "golden_ripple"
        ? "hidden-trace-pixel-glint"
        : visualCue === "triple_current"
          ? "hidden-trace-triple-current"
          : "hidden-trace-quiet-ripple";
    const overlay = this.add.image(width / 2, height / 2 + 40, textureKey)
      .setDisplaySize(Math.min(width * 0.78, 680), Math.min(width * 0.78, 680))
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(visualCue === "pixel_glint" ? 0.22 : 0.48)
      .setScale(reducedMotion ? 1 : 0.82);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      scale: reducedMotion ? 1 : 1.08,
      duration: reducedMotion ? 260 : visualCue === "neon_fault" ? 720 : 1200,
      ease: "Sine.easeOut",
      onComplete: () => overlay.destroy(),
    });

    for (let index = 0; index < count; index++) {
      const ring = this.add.circle(width / 2, height / 2 + 40, 72 + index * 18, color, 0.04)
        .setStrokeStyle(2, color, 0.72)
        .setDepth(12)
        .setScale(0.75);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scale: reducedMotion ? 1 : 1.9 + index * 0.12,
        duration: reducedMotion ? 260 : 1050 + index * 180,
        ease: "Sine.easeOut",
        onComplete: () => ring.destroy(),
      });
    }

    if (!reducedMotion && visualCue === "neon_fault") {
      this.cameras.main.flash(120, 255, 40, 190, false);
      this.cameras.main.shake(140, 0.003);
    }
  }

  // ── Spawning ──

  private updateSpawning(delta: number): void {
    this.elementSpawnTimer += delta;
    if (this.elementSpawnTimer > this.nextSpawnDelay && this.dragElements.length < HomeScene.MAX_ELEMENTS) {
      this.elementSpawnTimer = 0;
      this.nextSpawnDelay = 12000 + Math.random() * 10000;
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
    container.setAlpha(0);
    container.setScale(0.55);
    container.y += 14;
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
      appearingUntil: this.time.now + 650,
      exiting: false,
    };
    this.dragElements.push(el);
    this.playElementEnter(el);

    this.trimExtraElements();
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
    container.setAlpha(0);
    container.setScale(0.55);
    container.y += 14;
    this.input.setDraggable(container);

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
      appearingUntil: this.time.now + 650,
      exiting: false,
    };
    this.dragElements.push(el);
    this.playElementEnter(el);

    this.trimExtraElements();
  }

  private playElementEnter(el: DragElement): void {
    this.tweens.add({
      targets: el.container,
      y: el.anchorY,
      alpha: 1,
      scale: 1,
      duration: 620,
      ease: "Back.easeOut",
      onComplete: () => {
        el.appearingUntil = 0;
      },
    });

    const cfg = ELEMENT_CONFIG[el.type];
    const halo = this.add.circle(el.anchorX, el.anchorY, cfg.size * 2.1, cfg.color, 0.16);
    halo.setDepth(7);
    this.tweens.add({
      targets: halo,
      alpha: 0,
      scale: 1.8,
      duration: 720,
      ease: "Sine.easeOut",
      onComplete: () => halo.destroy(),
    });
  }

  private trimExtraElements(): void {
    while (this.dragElements.length > HomeScene.MAX_ELEMENTS) {
      const oldest = this.dragElements.find((item) => item !== this.draggedElement && !item.exiting);
      if (!oldest) return;
      this.releaseElement(oldest);
    }
  }

  private releaseElement(el: DragElement, target?: { x: number; y: number }, duration = 520): void {
    if (el.exiting) return;
    el.exiting = true;
    this.removeDragElement(el);
    this.tweens.killTweensOf(el.container);
    const cfg = ELEMENT_CONFIG[el.type];
    const endX = target?.x ?? el.container.x + Phaser.Math.Between(-12, 12);
    const endY = target?.y ?? el.container.y - Phaser.Math.Between(18, 34);
    this.tweens.add({
      targets: el.container,
      x: endX,
      y: endY,
      alpha: 0,
      scale: 0.35,
      duration,
      ease: "Sine.easeInOut",
      onComplete: () => el.container.destroy(),
    });

    const moteCount = el.type === "pulse" ? 8 : 5;
    for (let i = 0; i < moteCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const mote = this.add.circle(el.container.x, el.container.y, Phaser.Math.FloatBetween(1, 2.2), cfg.color, 0.45);
      mote.setDepth(7);
      this.tweens.add({
        targets: mote,
        x: mote.x + Math.cos(angle) * Phaser.Math.Between(12, 28),
        y: mote.y + Math.sin(angle) * Phaser.Math.Between(12, 28),
        alpha: 0,
        scale: 0.2,
        duration: duration + Phaser.Math.Between(80, 220),
        ease: "Quad.easeOut",
        onComplete: () => mote.destroy(),
      });
    }
  }

  private removeDragElement(el: DragElement): void {
    const idx = this.dragElements.indexOf(el);
    if (idx >= 0) this.dragElements.splice(idx, 1);
    if (this.draggedElement === el) this.draggedElement = null;
  }

  // ── Element orbit update ──

  private updateDragElements(delta: number): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2 + 40;
    const t = this.poolPulseTime * 0.001;
    const smooth = 1 - Math.pow(0.965, Math.min(delta, 33) / 16.67);

    for (const el of this.dragElements) {
      if (el === this.draggedElement || el.exiting) continue;

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
      if (el.container.active && this.time.now >= el.appearingUntil) el.container.setScale(s);

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
      if (el.exiting) continue;
      const dx = px - el.container.x;
      const dy = py - el.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ELEMENT_CONFIG[el.type].size + 14) return el;
    }
    return null;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.shoreGuide.visible && !this.shoreGuideSubmitting
      && Phaser.Math.Distance.Between(pointer.x, pointer.y, this.shoreGuide.x, this.shoreGuide.y) < 34) {
      this.shoreGuideDragging = true;
      this.tweens.killTweensOf(this.shoreGuide);
      this.shoreGuide.setScale(this.reducedMotion ? 1.02 : 1.12);
      return;
    }
    const el = this.getTapElement(pointer.x, pointer.y);
    if (el) {
      this.draggedElement = el;
      this.dragTrailPoints = [{ x: pointer.x, y: pointer.y }];
      this.tweens.killTweensOf(el.container);
      this.tweens.add({
        targets: el.container,
        scale: this.reducedMotion ? 1.04 : 1.15,
        duration: this.reducedMotion ? 80 : 150,
        ease: "Back.easeOut",
      });
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.shoreGuideDragging) {
      this.shoreGuide.setPosition(pointer.x, pointer.y);
      return;
    }
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
    const lastPoint = this.dragTrailPoints[this.dragTrailPoints.length - 1];
    if (!lastPoint || Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, pointer.x, pointer.y) > 7) {
      this.dragTrailPoints.push({ x: pointer.x, y: pointer.y });
      if (this.dragTrailPoints.length > (this.reducedMotion ? 4 : 12)) this.dragTrailPoints.shift();
    }
  }

  private onPointerUp(): void {
    if (this.shoreGuideDragging) {
      this.shoreGuideDragging = false;
      const reachedShore = Phaser.Math.Distance.Between(
        this.shoreGuide.x,
        this.shoreGuide.y,
        this.shoreGuideTarget.x,
        this.shoreGuideTarget.y,
      ) < 48;
      if (reachedShore) {
        this.playShoreGuideFeedback();
        this.shoreGuideSubmitting = true;
        this.shoreGuide.setVisible(false);
        Promise.resolve(this.onGuideShore?.())
          .catch(() => undefined)
          .finally(() => {
            this.shoreGuideSubmitting = false;
            this.updateShorelineLayer();
          });
      } else {
        this.tweens.add({
          targets: this.shoreGuide,
          x: this.shoreGuideHome.x,
          y: this.shoreGuideHome.y,
          scale: 1,
          duration: this.reducedMotion ? 120 : 320,
          ease: "Sine.easeOut",
        });
      }
      return;
    }
    if (!this.draggedElement) return;
    const el = this.draggedElement;
    this.draggedElement = null;
    this.dragTrailPoints = [];
    this.dragWell.clear();
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
    this.dragWell.clear();
    if (!this.draggedElement) return;
    const x = this.draggedElement.container.x;
    const y = this.draggedElement.container.y;
    const cfg = ELEMENT_CONFIG[this.draggedElement.type];
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    const distance = Phaser.Math.Distance.Between(x, y, cx, cy);
    const attraction = Phaser.Math.Clamp(1 - distance / (HomeScene.ELEMENT_POOL_AVOID_RADIUS + 90), 0, 1);

    if (this.dragTrailPoints.length > 1) {
      for (let i = 1; i < this.dragTrailPoints.length; i++) {
        const previous = this.dragTrailPoints[i - 1];
        const point = this.dragTrailPoints[i];
        const progress = i / this.dragTrailPoints.length;
        this.dragTrail.lineStyle(1 + progress * 2, cfg.color, progress * 0.28);
        this.dragTrail.lineBetween(previous.x, previous.y, point.x, point.y);
        if (!this.reducedMotion && i % 2 === 0) {
          this.dragTrail.fillStyle(cfg.color, progress * 0.22);
          this.dragTrail.fillCircle(point.x, point.y, 1 + progress * 2.2);
        }
      }
    }

    if (attraction > 0.02) {
      const breathe = this.reducedMotion ? 0 : Math.sin(this.poolPulseTime * 0.006) * 4;
      this.dragWell.lineStyle(1.5, cfg.color, 0.12 + attraction * 0.4);
      this.dragWell.strokeCircle(cx, cy, HomeScene.POOL_ABSORB_RADIUS + 12 + breathe);
      this.dragWell.lineStyle(1, 0xffffff, attraction * 0.16);
      this.dragWell.strokeCircle(cx, cy, HomeScene.POOL_ABSORB_RADIUS - 5 - breathe * 0.4);
      this.dragWell.lineStyle(1.25, cfg.color, 0.08 + attraction * 0.24);
      this.dragWell.lineBetween(x, y, cx, cy);
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
    this.releaseElement(el, { x: cx, y: cy }, 360);

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
    const feedbackColor = outcome === "negative" ? 0xEF5350 : outcome === "rare" ? 0xFFD54F : cfg.color;
    const rippleCount = this.reducedMotion ? 1 : outcome === "rare" ? 4 : 3;
    for (let ringIndex = 0; ringIndex < rippleCount; ringIndex++) {
      const ripple = this.add.graphics().setDepth(6);
      this.tapRipples.push(ripple);
      this.tweens.add({
        targets: {},
        delay: ringIndex * 70,
        duration: this.reducedMotion ? 260 : 620 + ringIndex * 90,
        onUpdate: (t) => {
          ripple.clear();
          const radius = 18 + ringIndex * 5 + t.progress * (this.reducedMotion ? 34 : 66 + ringIndex * 7);
          const alpha = (0.56 - ringIndex * 0.07) * (1 - t.progress);
          ripple.lineStyle(Math.max(1, 2.4 - ringIndex * 0.3), feedbackColor, alpha);
          ripple.strokeEllipse(cx, cy, radius * 2, radius * 1.15);
        },
        onComplete: () => {
          ripple.destroy();
          const idx = this.tapRipples.indexOf(ripple);
          if (idx >= 0) this.tapRipples.splice(idx, 1);
        },
      });
    }

    const burstColors = outcome === "negative"
      ? [0xEF5350, 0xFF8A80, 0xFFCDD2]
      : outcome === "rare"
      ? [0xFFD54F, 0xFFAB40, 0xFFFFFF, cfg.color]
      : [cfg.color, 0xFFFFFF, cfg.color];

    for (let i = 0; i < (this.reducedMotion ? 4 : outcome === "rare" ? 24 : 14); i++) {
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

    if (outcome === "negative" && !skipShake && !this.reducedMotion) this.cameras.main.shake(120, 0.003);

    if (this.poolImage) {
      this.tweens.killTweensOf(this.poolImage);
      const baseScaleX = this.poolImage.scaleX;
      const baseScaleY = this.poolImage.scaleY;
      this.tweens.add({
        targets: this.poolImage,
        scaleX: baseScaleX * (this.reducedMotion ? 1.006 : 1.035),
        scaleY: baseScaleY * (this.reducedMotion ? 0.998 : 0.975),
        duration: this.reducedMotion ? 90 : 150,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }

    if (!this.reducedMotion) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.25;
        const startRadius = 76 + Math.random() * 28;
        const mote = this.add.circle(
          cx + Math.cos(angle) * startRadius,
          cy + Math.sin(angle) * startRadius * 0.58,
          1.4 + Math.random() * 1.8,
          feedbackColor,
          0.55,
        ).setDepth(6);
        this.tweens.add({
          targets: mote,
          x: cx,
          y: cy,
          alpha: 0.08,
          scale: 0.25,
          duration: 280 + Math.random() * 180,
          ease: "Quad.easeIn",
          onComplete: () => mote.destroy(),
        });
      }
    }

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
    const motionScale = this.reducedMotion ? 0.12 : 1;
    for (let i = this.organisms.length - 1; i >= 0; i--) {
      const org = this.organisms[i];
      if (!org || !org.active) { this.organisms.splice(i, 1); continue; }
      org.x += ((org.getData("vx") as number) ?? 0) * motionScale;
      org.y += ((org.getData("vy") as number) ?? 0) * motionScale;
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
    const motionScale = this.reducedMotion ? 0.12 : 1;
    for (const orb of this.resourceOrbs) {
      if (!orb.active) continue;
      // Apply gentle random acceleration + damping
      let vx = (orb.getData("vx") as number) || 0;
      let vy = (orb.getData("vy") as number) || 0;
      vx += (Math.random() - 0.5) * 0.04 * motionScale;
      vy += (Math.random() - 0.5) * 0.04 * motionScale;
      vx *= 0.98;
      vy *= 0.98;
      orb.x += vx * motionScale;
      orb.y += vy * motionScale;
      // Bobbing
      orb.y += Math.sin(t * 0.0015 + orb.getData("phase") as number) * 0.8 * motionScale;
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
    this.causticDrift += delta * (this.reducedMotion ? 0.004 : 0.05);
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
      const a = 0.2 + Math.sin(t * 0.0008 + beam.phase) * (this.reducedMotion ? 0.025 : 0.15);
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
        if (this.reducedMotion) return;
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

  private createEcologyStageLayer(): void {
    this.ecologyStageGraphics = this.add.graphics();
    this.ecologyStageGraphics.setDepth(3.5);
  }

  private createShorelineLayer(w: number, h: number): void {
    this.shorelineBaseImage = this.add.image(0, 0, "shoreline-wet-rock")
      .setDepth(0.55)
      .setVisible(false);
    this.shorelineTraceImage = this.add.image(0, 0, "shoreline-moisture-film")
      .setDepth(3.75)
      .setVisible(false);
    this.shorelineBaseGraphics = this.add.graphics().setDepth(0.5);
    this.shorelineTraceGraphics = this.add.graphics().setDepth(3.8);
    const cx = w / 2;
    const cy = h / 2 + 40;
    this.shoreGuideHome = { x: cx + 44, y: cy + 18 };
    this.shoreGuideTarget = { x: cx + 122, y: cy + 72 };

    const outer = this.add.circle(0, 0, 18, 0x7CE6C8, 0.08).setStrokeStyle(1.5, 0x7CE6C8, 0.58);
    const middle = this.add.circle(0, 0, 10, 0x4FC3F7, 0.22).setStrokeStyle(1, 0xFFFFFF, 0.32);
    const core = this.add.circle(-2, -2, 4, 0xFFFFFF, 0.72);
    this.shoreGuide = this.add.container(this.shoreGuideHome.x, this.shoreGuideHome.y, [outer, middle, core])
      .setDepth(8)
      .setVisible(false);
  }

  private updateShorelineLayer(): void {
    if (!this.shorelineBaseGraphics || !this.shorelineTraceGraphics || !this.shorelineBaseImage || !this.shorelineTraceImage || !this.shoreGuide) return;
    const save = useGameStore.getState().save;
    const progress = save?.chapterProgress;
    const witness = save?.chapterWitness?.shorelineDifferentiation;
    this.shorelineBaseGraphics.clear();
    this.shorelineTraceGraphics.clear();
    this.shorelineBaseImage.setVisible(false);
    this.shorelineTraceImage.setVisible(false);

    if (!save || progress?.chapter !== "shoreline_differentiation" || !witness?.waterlineExposed) {
      this.shoreGuide.setVisible(false);
      return;
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    const motion = this.reducedMotion ? 0 : Math.sin(this.poolPulseTime * 0.0011);
    const exchange = witness.shorelineExchangeWitnessed;
    const edgeX = cx + (exchange ? 102 : 112) + motion * (exchange ? 2 : 4);
    const shorelineSize = Phaser.Math.Clamp(Math.min(this.cameras.main.width, this.cameras.main.height) * 0.46, 230, 330);
    const shorelineX = cx + shorelineSize * 0.48;
    const shorelineY = cy + shorelineSize * 0.18;

    this.shorelineBaseImage
      .setVisible(true)
      .setPosition(shorelineX, shorelineY)
      .setDisplaySize(shorelineSize, shorelineSize)
      .setAlpha(exchange ? 0.76 : 0.9);

    this.shorelineBaseGraphics.fillStyle(0x1D2B2B, 0.22);
    this.shorelineBaseGraphics.fillEllipse(edgeX, cy + 70, 96, 66);
    this.shorelineBaseGraphics.fillStyle(0x344A43, 0.16);
    this.shorelineBaseGraphics.fillEllipse(edgeX + 22, cy + 48, 58, 42);
    this.shorelineBaseGraphics.fillEllipse(edgeX - 20, cy + 84, 64, 38);

    this.shorelineTraceGraphics.lineStyle(2, 0x7CE6C8, exchange ? 0.34 : 0.22);
    this.shorelineTraceGraphics.strokeEllipse(cx + 8, cy + 2, 278 + motion * 4, 232 + motion * 2);

    const previewTexture = shorelineTraceTextureForOption(this.shorelinePreviewOption);
    const saltOutcomeTexture = saltTraceTextureForTags(save.historyTags);
    const activeTraceTexture = previewTexture
      ?? saltOutcomeTexture
      ?? shorelineTraceTextureFor(witness.shorelineStrategy);
    const hasShorelinePreview = Boolean(previewTexture);
    const nichesSplit = save.historyTags.includes("niche_split") || witness.habitatsWitnessed.includes("moist_shore");
    if (witness.shoreColonized || hasShorelinePreview) {
      this.shorelineTraceImage
        .setTexture(activeTraceTexture)
        .setVisible(true)
        .setPosition(shorelineX, shorelineY)
        .setDisplaySize(shorelineSize, shorelineSize)
        .setAlpha(hasShorelinePreview ? 0.86 : exchange ? 0.44 : 0.62);
    }

    if (save.pendingEcologyEvent?.id === "ebb_dryness" && !hasShorelinePreview) {
      this.shorelineTraceGraphics.lineStyle(1, 0xF5D078, 0.22);
      for (let index = 0; index < 5; index++) {
        this.shorelineTraceGraphics.lineBetween(cx + 86 + index * 9, cy + 24, cx + 94 + index * 10, cy + 96);
      }
    }

    if (save.pendingEcologyEvent?.id === "salt_crystal_rise" && !hasShorelinePreview) {
      this.shorelineTraceGraphics.lineStyle(1.4, 0xF4F0D0, 0.5);
      for (let index = 0; index < 6; index++) {
        const crystalX = cx + 108 + index * 12;
        const crystalY = cy + 44 + (index % 2) * 15;
        this.shorelineTraceGraphics.lineBetween(crystalX - 4, crystalY, crystalX + 4, crystalY);
        this.shorelineTraceGraphics.lineBetween(crystalX, crystalY - 6, crystalX, crystalY + 6);
      }
    }

    if (save.historyTags.includes("salt_crust_attachment")) {
      this.shorelineTraceGraphics.fillStyle(0xF4F0D0, 0.34);
      for (let index = 0; index < 5; index++) {
        this.shorelineTraceGraphics.fillTriangle(
          cx + 116 + index * 11,
          cy + 58 + (index % 2) * 10,
          cx + 121 + index * 11,
          cy + 50 + (index % 2) * 10,
          cx + 126 + index * 11,
          cy + 58 + (index % 2) * 10,
        );
      }
    } else if (save.historyTags.includes("salt_rinsed")) {
      this.shorelineTraceGraphics.lineStyle(1.5, 0x8BE8F7, 0.34);
      for (let index = 0; index < 3; index++) {
        this.shorelineTraceGraphics.lineBetween(cx + 174, cy + 50 + index * 10, cx + 92, cy + 72 + index * 8);
      }
    } else if (save.historyTags.includes("salt_tolerance_trial")) {
      this.shorelineTraceGraphics.fillStyle(0xC89BE8, 0.32);
      for (let index = 0; index < 5; index++) {
        this.shorelineTraceGraphics.fillCircle(cx + 122 + index * 12, cy + 62 + (index % 2) * 13, 3);
      }
    }

    if (nichesSplit) {
      this.shorelineTraceGraphics.fillStyle(0x7CE6C8, 0.2);
      this.shorelineTraceGraphics.fillEllipse(cx + 150, cy + 84, 34, 14);
      this.shorelineTraceGraphics.fillStyle(0xD5F3C8, 0.14);
      this.shorelineTraceGraphics.fillEllipse(cx + 168, cy + 66, 24, 10);
      this.shorelineTraceGraphics.lineStyle(1.5, 0xA8E6CF, 0.28);
      this.shorelineTraceGraphics.lineBetween(cx + 126, cy + 70, cx + 174, cy + 62 + motion * 2);
    }

    if (exchange) {
      for (let index = 0; index < 3; index++) {
        const y = cy + 28 + index * 14;
        this.shorelineTraceGraphics.lineStyle(2 - index * 0.35, 0x7CE6C8, 0.34 - index * 0.06);
        this.shorelineTraceGraphics.beginPath();
        this.shorelineTraceGraphics.moveTo(cx + 132, y);
        this.shorelineTraceGraphics.lineTo(cx + 86, y + 10 + motion * 4);
        this.shorelineTraceGraphics.lineTo(cx + 34, y + motion * 3);
        this.shorelineTraceGraphics.strokePath();
      }
    }

    this.shoreGuideHome = { x: cx + 44, y: cy + 18 };
    this.shoreGuideTarget = { x: cx + 122, y: cy + 72 };
    const showGuide = save.unlockedNodes.includes("shore_attachment")
      && !witness.shoreColonized
      && !this.shoreGuideSubmitting;
    this.shoreGuide.setVisible(showGuide);
    if (showGuide && !this.shoreGuideDragging) {
      this.shoreGuide.setPosition(this.shoreGuideHome.x, this.shoreGuideHome.y + motion * 3);
      this.shoreGuide.setScale(1 + motion * 0.04);
      this.shorelineTraceGraphics.lineStyle(1.5, 0x7CE6C8, 0.26);
      this.shorelineTraceGraphics.strokeCircle(this.shoreGuideTarget.x, this.shoreGuideTarget.y, 24 + motion * 2);
      this.shorelineTraceGraphics.lineStyle(1, 0x7CE6C8, 0.13);
      this.shorelineTraceGraphics.lineBetween(this.shoreGuideHome.x + 16, this.shoreGuideHome.y, this.shoreGuideTarget.x - 22, this.shoreGuideTarget.y);
    }
  }

  private playShoreGuideFeedback(): void {
    const { x, y } = this.shoreGuideTarget;
    const count = this.reducedMotion ? 1 : 3;
    for (let index = 0; index < count; index++) {
      const ring = this.add.circle(x, y, 14 + index * 6, 0x7CE6C8, 0.06)
        .setStrokeStyle(1.5, 0x7CE6C8, 0.54)
        .setDepth(9);
      this.tweens.add({
        targets: ring,
        alpha: 0,
        scale: this.reducedMotion ? 1.15 : 1.8 + index * 0.18,
        duration: this.reducedMotion ? 220 : 620 + index * 120,
        ease: "Sine.easeOut",
        onComplete: () => ring.destroy(),
      });
    }
  }

  private updateEcologyStageLayer(): void {
    if (!this.ecologyStageGraphics) return;
    const save = useGameStore.getState().save;
    const progress = save?.chapterProgress;
    this.ecologyStageGraphics.clear();
    if (progress?.chapter !== "ecology_burst") return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const t = reducedMotion ? 1 : this.poolPulseTime;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 + 40;
    const stage = progress.stage;
    const hasImbalance = Boolean(save?.pendingEcologyEvent?.id && /bloom|murky|decomposer/.test(save.pendingEcologyEvent.id));
    const livingRoles = new Set(
      (save?.species ?? [])
        .filter((item) => item.status === "living" || item.status === "flourishing")
        .map((item) => item.ecologicalRole),
    );
    if (save?.unlockedNodes.includes("early_producer_film")) livingRoles.add("producer");
    if (save?.unlockedNodes.includes("decomposition_layer")) livingRoles.add("decomposer");
    if (save?.unlockedNodes.includes("tidal_filter_pores")) livingRoles.add("filterer");
    const hasProducer = livingRoles.has("producer");
    const hasDecomposer = livingRoles.has("decomposer");
    const hasFilterer = livingRoles.has("filterer");
    const cycleFormed = Boolean(save?.chapterWitness?.ecologyBurst.cycleWitnessed);

    if (stage === "pursue_light" || hasProducer) {
      this.ecologyStageGraphics.fillStyle(0xF5D078, 0.045 + Math.sin(t * 0.001) * 0.012);
      this.ecologyStageGraphics.fillEllipse(cx, cy - 34, 176, 38);
      for (let i = 0; i < 5; i++) {
        const x = cx - 70 + i * 35 + Math.sin(t * 0.0008 + i) * 4;
        this.ecologyStageGraphics.lineStyle(1, 0xF5D078, 0.08);
        this.ecologyStageGraphics.lineBetween(x, cy - 74, x + 12, cy - 18);
      }
    }

    if (hasDecomposer) {
      this.ecologyStageGraphics.fillStyle(0x8D6E63, 0.11);
      this.ecologyStageGraphics.fillEllipse(cx, cy + 74, 210, 30);
      this.ecologyStageGraphics.fillStyle(0x66BB6A, 0.08);
      for (let i = 0; i < 6; i++) {
        const x = cx - 85 + i * 34;
        const y = cy + 60 + Math.sin(t * 0.0009 + i) * 8;
        this.ecologyStageGraphics.fillEllipse(x, y, 26, 7);
      }
    }

    if (hasFilterer) {
      this.ecologyStageGraphics.lineStyle(1, 0x4FC3F7, 0.1);
      for (let i = 0; i < 4; i++) {
        const r = 34 + i * 20 + Math.sin(t * 0.001 + i) * 3;
        this.ecologyStageGraphics.strokeEllipse(cx + 42, cy + 18, r * 1.4, r * 0.45);
      }
    }

    if (hasImbalance || stage === "face_imbalance" || save?.chapterWitness?.ecologyBurst.imbalanceWitnessed) {
      this.ecologyStageGraphics.fillStyle(0x607D8B, 0.11 + Math.abs(Math.sin(t * 0.0008)) * 0.04);
      this.ecologyStageGraphics.fillEllipse(cx - 16, cy + 6, 224, 94);
    }

    if (cycleFormed || stage === "complete") {
      this.ecologyStageGraphics.lineStyle(2, 0x66BB6A, 0.18);
      this.ecologyStageGraphics.strokeCircle(cx, cy + 10, 122 + Math.sin(t * 0.001) * 4);
    }
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

function shorelineStrategyForOption(optionId: string | null): "moisture_retention" | "rock_attachment" | "tidal_dispersal" | null {
  if (optionId === "protect_moisture_film") return "moisture_retention";
  if (optionId === "expose_wet_rock") return "rock_attachment";
  if (optionId === "return_to_shallows") return "tidal_dispersal";
  return null;
}

function shorelineTraceTextureFor(strategy: "moisture_retention" | "rock_attachment" | "tidal_dispersal" | undefined | null): string {
  if (strategy === "rock_attachment") return "shoreline-rock-attachment";
  if (strategy === "tidal_dispersal") return "shoreline-tidal-dispersal";
  return "shoreline-moisture-film";
}

function shorelineTraceTextureForOption(optionId: string | null): string | null {
  if (optionId === "bind_salt_crust" || optionId === "test_salt_tolerance") return "shoreline-rock-attachment";
  if (optionId === "rinse_salt_crystals") return "shoreline-tidal-dispersal";
  const strategy = shorelineStrategyForOption(optionId);
  return strategy ? shorelineTraceTextureFor(strategy) : null;
}

function saltTraceTextureForTags(historyTags: string[]): string | null {
  if (historyTags.includes("salt_rinsed")) return "shoreline-tidal-dispersal";
  if (historyTags.includes("salt_crust_attachment") || historyTags.includes("salt_tolerance_trial")) {
    return "shoreline-rock-attachment";
  }
  return null;
}
