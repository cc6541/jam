// Vue Pixi du plateau. Elle affiche un GameState et anime les Cue du director :
// aucune règle de jeu ici, l'état d'après fait toujours foi (sync en fin d'animation).
import { Circle, Container, Graphics, Sprite, Text, type Renderer, type Texture } from 'pixi.js';
import type { ColorId, GameState, Id, Point, StepResult } from '@jam/engine-screw';
import { direct, rejectedTapCues, type Cue, type Target } from './director';
import { silentHaptics, type HapticsPort } from './haptics';
import { boxScrewCenter, computeLayout, crateSize, slotCenter, toScreen, type Layout, type Rect } from './layout';
import { centroid, crateBody, crateLid, lockedSlots, matGraphic, plateGraphic, screwHead, screwShadow, trayGraphic } from './skin';
import { silentSound, type SoundPort } from './sound';
import { DEFAULT_THEME, type Theme } from './theme';
import { easings, TweenRunner } from './tween';

export interface BoardViewOptions {
  onTap: (screwId: Id) => void;
  onEnd?: (result: 'won' | 'lost', nearMiss: boolean) => void;
  theme?: Theme;
  haptics?: HapticsPort;
  sounds?: SoundPort;
}

interface ScrewNode {
  node: Container;
  head: Sprite;
  shadow: Sprite;
  badge?: Container;
  label?: Text;
}

interface Crate {
  node: Container;
  lid: Graphics;
  color: ColorId;
  rect: Rect;
}

const PULSE = 180;
const SHAKE = 260;
const ENTER = 280;

export class BoardView {
  readonly root = new Container();
  private readonly matLayer = new Container();
  private readonly trayLayer = new Container();
  private readonly plateLayer = new Container({ sortableChildren: true });
  private readonly boxLayer = new Container();
  private readonly overlay = new Container();
  private readonly fxLayer = new Container();
  /** Animations de jeu : terminées d'un coup si le joueur rejoue avant la fin. */
  private readonly runner = new TweenRunner();
  /** Effets décoratifs (confettis) : jamais coupés par un coup suivant. */
  private readonly fx = new TweenRunner();
  private readonly theme: Theme;
  private readonly haptics: HapticsPort;
  private readonly sounds: SoundPort;
  private readonly textures = new Map<ColorId, Texture>();
  private shadowTexture: Texture | undefined;
  private confettiTexture: Texture | undefined;
  private readonly screws = new Map<Id, ScrewNode>();
  private readonly plates = new Map<Id, Container>();
  /** Centre de chaque plaque : pivot de la chute (elle tourne sur elle-même). */
  private readonly plateHome = new Map<Id, Point>();
  private lockLayer = new Graphics();
  private boxes: Crate[] = [];
  private layout?: Layout;
  private state?: GameState;
  private viewport = { width: 0, height: 0 };

  constructor(
    private readonly renderer: Renderer,
    private readonly options: BoardViewOptions,
  ) {
    this.theme = options.theme ?? DEFAULT_THEME;
    this.haptics = options.haptics ?? silentHaptics;
    this.sounds = options.sounds ?? silentSound;
    this.root.addChild(this.matLayer, this.trayLayer, this.plateLayer, this.boxLayer, this.overlay, this.fxLayer);
  }

  get animating(): boolean {
    return this.runner.busy;
  }

  /** Construit la scène pour un niveau (nouvelle partie, rejouer, undo). */
  load(state: GameState, viewport: { width: number; height: number }): void {
    this.runner.finishAll();
    this.state = state;
    this.viewport = viewport;
    this.build();
    this.sync(state);
  }

  resize(viewport: { width: number; height: number }): void {
    if (this.state) this.load(this.state, viewport);
  }

  /** Avance les animations ; à brancher sur le ticker de l'app. */
  update(deltaMs: number): void {
    this.runner.tick(deltaMs);
    this.fx.tick(deltaMs);
  }

  /** Anime le résultat d'un `step`. `tapped` : vis visée, pour secouer une vis bloquée. */
  apply(result: StepResult, tapped?: Id): void {
    if (!this.state) return;
    this.runner.finishAll();
    if (result.state === this.state) {
      if (tapped) this.schedule(rejectedTapCues(tapped, result.events));
      return;
    }
    this.state = result.state;
    const cues = direct(result.events, result.state);
    this.schedule(cues);
    const end = Math.max(0, ...cues.map((c) => c.at + ('duration' in c ? c.duration : 0)));
    const after = result.state;
    this.runner.add({ delay: end, duration: 0, easing: easings.linear, update: () => undefined, onComplete: () => this.sync(after) });
  }

  destroy(): void {
    this.runner.finishAll();
    this.fx.finishAll();
    for (const t of this.textures.values()) t.destroy(true);
    this.shadowTexture?.destroy(true);
    this.confettiTexture?.destroy(true);
    this.root.destroy({ children: true });
  }

  // ---------- Construction ----------

  /** Fige un décor statique en une seule texture : un sprite par image au lieu de centaines de tracés et de masques. */
  private bake<T extends Container>(node: T): T {
    // Densité réelle de l'écran : sur un mobile 2x/3x les bords sont lisses sans antialiasing coûteux.
    const resolution = this.renderer.resolution;
    node.cacheAsTexture({ resolution, antialias: resolution < 2 });
    return node;
  }

  private build(): void {
    const state = this.state;
    if (!state) return;
    const layout = computeLayout(state.level, this.viewport);
    this.layout = layout;
    for (const crate of this.boxes) this.releaseScrews(crate.node);
    for (const layer of [this.matLayer, this.trayLayer, this.plateLayer, this.boxLayer, this.overlay]) {
      layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    }
    for (const t of this.textures.values()) t.destroy(true);
    this.textures.clear();
    this.shadowTexture?.destroy(true);
    this.shadowTexture = undefined;
    this.screws.clear();
    this.plates.clear();
    this.plateHome.clear();
    this.boxes = [];
    const r = layout.screwRadius;

    this.matLayer.addChild(this.bake(matGraphic(layout.board, this.theme)));
    this.trayLayer.addChild(this.bake(trayGraphic(layout, this.theme, state.level.rules.toolboxMaxSlots)));
    this.lockLayer = new Graphics();
    this.trayLayer.addChild(this.lockLayer);

    const ranks = [...new Set(state.level.plates.map((p) => p.z))].sort((a, b) => a - b);
    for (const plate of state.level.plates) {
      const points = plate.polygon.map((p) => toScreen(layout, p));
      const holes = state.level.screws.filter((s) => s.pins.includes(plate.id)).map((s) => toScreen(layout, s.at));
      const g = this.bake(plateGraphic(points, ranks.indexOf(plate.z), this.theme, holes, r * 1.08));
      const home = centroid(points);
      g.pivot.set(home.x, home.y);
      g.position.set(home.x, home.y);
      g.zIndex = plate.z * 2;
      g.eventMode = 'none';
      this.plates.set(plate.id, g);
      this.plateHome.set(plate.id, home);
      this.plateLayer.addChild(g);
    }

    for (const def of state.level.screws) {
      const node = new Container();
      const shadow = new Sprite(this.shadow());
      shadow.anchor.set(0.5);
      shadow.position.set(r * 0.12, r * 0.24);
      const head = new Sprite(this.screwTexture(def.color));
      head.anchor.set(0.5);
      node.addChild(shadow, head);
      const screw: ScrewNode = { node, head, shadow };
      if (def.kind.type === 'multiTap') {
        const badge = new Container();
        const label = new Text({
          text: '',
          style: { fontFamily: this.theme.fontFamily, fill: 0x1d2b4f, fontSize: Math.max(11, r * 0.78), fontWeight: '700' },
        });
        label.anchor.set(0.5);
        badge.addChild(new Graphics().circle(0, 0, Math.max(8, r * 0.55)).fill(0xffffff).stroke({ width: 2, color: 0x1d2b4f }), label);
        badge.position.set(r * 0.78, -r * 0.78);
        node.addChild(badge);
        screw.badge = badge;
        screw.label = label;
      }
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = new Circle(0, 0, r * 1.35);
      node.on('pointertap', () => this.options.onTap(def.id));
      this.screws.set(def.id, screw);
    }
  }

  private screwTexture(color: ColorId): Texture {
    const cached = this.textures.get(color);
    if (cached) return cached;
    const g = new Graphics();
    screwHead(g, this.layout?.screwRadius ?? 14, this.theme.screws[color]);
    const texture = this.renderer.generateTexture({ target: g, resolution: Math.max(3, this.renderer.resolution), antialias: true });
    g.destroy();
    this.textures.set(color, texture);
    return texture;
  }

  private shadow(): Texture {
    if (!this.shadowTexture) {
      const g = new Graphics();
      screwShadow(g, this.layout?.screwRadius ?? 14);
      this.shadowTexture = this.renderer.generateTexture({ target: g, resolution: Math.max(2, this.renderer.resolution) });
      g.destroy();
    }
    return this.shadowTexture;
  }

  private confetti(): Texture {
    if (!this.confettiTexture) {
      const g = new Graphics().roundRect(0, 0, 9, 5, 1.5).fill(0xffffff);
      this.confettiTexture = this.renderer.generateTexture({ target: g, resolution: 2 });
      g.destroy();
    }
    return this.confettiTexture;
  }

  // ---------- Synchronisation (l'état fait foi) ----------

  private sync(state: GameState): void {
    const layout = this.layout;
    if (!layout) return;
    this.state = state;
    const r = layout.screwRadius;

    for (const [id, g] of this.plates) {
      g.visible = id in state.plates;
      const home = this.plateHome.get(id);
      if (home) g.position.set(home.x, home.y);
      g.rotation = 0;
      g.alpha = 1;
    }

    this.drawLocks(state, layout);
    this.drawBoxes(state, layout);

    const homes = new Map<Id, { parent: Container; at: Point; scale: number }>();
    state.openBoxes.forEach((box, b) => {
      const crate = this.boxes[b];
      if (!crate) return;
      box.filled.forEach((id, slot) =>
        homes.set(id, { parent: crate.node, at: boxScrewCenter(layout, b, state.openBoxes.length, slot, state.level.rules.boxCapacity), scale: 1 }),
      );
    });
    const maxSlots = state.level.rules.toolboxMaxSlots;
    state.toolbox.forEach((id, i) => homes.set(id, { parent: this.overlay, at: slotCenter(layout.toolbox, i, maxSlots), scale: 1 }));
    state.holding.forEach((id, i) =>
      homes.set(id, { parent: this.overlay, at: slotCenter(holdingRect(layout), i, Math.max(7, state.holding.length)), scale: 0.72 }),
    );

    for (const [id, s] of this.screws) {
      const { node, head, shadow, badge, label } = s;
      node.scale.set(1);
      node.alpha = 1;
      head.rotation = 0;
      shadow.position.set(r * 0.12, r * 0.24);
      const onBoard = state.screws[id];
      if (onBoard) {
        const def = onBoard.def;
        const pinnedZ = Math.max(...def.pins.map((p) => state.level.plates.find((pl) => pl.id === p)?.z ?? 0));
        node.zIndex = pinnedZ * 2 + 1;
        this.plateLayer.addChild(node);
        const at = toScreen(layout, def.at);
        node.position.set(at.x, at.y);
        node.visible = true;
        node.eventMode = 'static';
        if (badge && label) {
          badge.visible = onBoard.tapsLeft > 1;
          label.text = String(onBoard.tapsLeft);
        }
        continue;
      }
      node.eventMode = 'none';
      if (badge) badge.visible = false;
      const home = homes.get(id);
      node.visible = home !== undefined;
      if (home) {
        this.place(node, home.parent);
        node.position.set(home.at.x, home.at.y);
        node.scale.set(home.scale);
      }
    }
    // Vis et planches partagent ce calque : l'ordre z (vis sous les planches plus hautes) doit être rétabli tout de suite.
    this.plateLayer.sortChildren();
  }

  /** Une vis rangée dans une caisse passe sous son couvercle. */
  private place(node: Container, parent: Container): void {
    const crate = this.boxes.find((c) => c.node === parent);
    if (crate) parent.addChildAt(node, parent.getChildIndex(crate.lid));
    else parent.addChild(node);
  }

  /** Avant de détruire une caisse, ses vis (réutilisées) retournent au calque commun, masquées. */
  private releaseScrews(parent: Container): void {
    for (const s of this.screws.values()) {
      if (s.node.parent === parent) {
        this.overlay.addChild(s.node);
        s.node.visible = false;
      }
    }
  }

  private drawLocks(state: GameState, layout: Layout): void {
    this.lockLayer.destroy();
    this.lockLayer = lockedSlots(layout, this.theme, state.toolboxSlots, state.level.rules.toolboxMaxSlots);
    this.trayLayer.addChild(this.lockLayer);
  }

  private drawBoxes(state: GameState, layout: Layout): void {
    for (const crate of this.boxes) {
      this.releaseScrews(crate.node);
      crate.node.destroy({ children: true });
    }
    this.boxes = state.openBoxes.map((box, b) => {
      const crate = this.makeCrate(box.color, layout, b, state.openBoxes.length, state.level.rules.boxCapacity);
      this.boxLayer.addChild(crate.node);
      return crate;
    });
  }

  /** Caisse : corps figé en texture, vis fantômes (le motif est lisible même vide), couvercle masqué. */
  private makeCrate(color: ColorId, layout: Layout, index: number, count: number, capacity: number): Crate {
    const node = new Container();
    const center = slotCenter(layout.boxes, index, count);
    const size = crateSize(layout, count, capacity);
    const rect = { x: center.x - size.width / 2, y: center.y - size.height / 2, width: size.width, height: size.height };
    const holes = Array.from({ length: capacity }, (_, slot) => boxScrewCenter(layout, index, count, slot, capacity));
    node.addChild(this.bake(crateBody(rect, this.theme.screws[color].fill, holes, layout.screwRadius * 1.08, this.theme)));
    for (const at of holes) {
      const ghost = new Sprite(this.screwTexture(color));
      ghost.anchor.set(0.5);
      ghost.alpha = 0.3;
      ghost.scale.set(0.82);
      ghost.position.set(at.x, at.y);
      node.addChild(ghost);
    }
    const lid = crateLid(rect, this.theme.screws[color].fill);
    lid.alpha = 0;
    node.addChild(lid);
    return { node, lid, color, rect };
  }

  // ---------- Animations ----------

  private schedule(cues: Cue[]): void {
    for (const cue of cues) this.animate(cue);
  }

  private animate(cue: Cue): void {
    const add = (duration: number, easing: (t: number) => number, update: (t: number) => void, onComplete?: () => void) =>
      this.runner.add(onComplete ? { delay: cue.at, duration, easing, update, onComplete } : { delay: cue.at, duration, easing, update });
    const r = this.layout?.screwRadius ?? 14;

    switch (cue.kind) {
      case 'haptic':
        add(0, easings.linear, () => undefined, () => this.haptics.play(cue.cue));
        return;
      case 'sound':
        add(0, easings.linear, () => undefined, () => this.sounds.play(cue.sound));
        return;
      case 'end':
        add(0, easings.linear, () => undefined, () => {
          if (cue.result === 'won') this.celebrate();
          this.options.onEnd?.(cue.result, cue.nearMiss);
        });
        return;
      case 'pulse': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        add(PULSE, easings.linear, (t) => {
          s.node.scale.set(1 + 0.18 * Math.sin(Math.PI * t));
          s.head.rotation = -t * Math.PI * 0.5;
        });
        if (s.badge && s.label && cue.tapsLeft > 0) {
          const { badge, label } = s;
          add(0, easings.linear, () => {
            label.text = String(cue.tapsLeft);
            badge.visible = cue.tapsLeft > 1;
          });
        }
        return;
      }
      case 'shake': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        const x0 = s.node.x;
        add(SHAKE, easings.linear, (t) => (s.node.x = x0 + Math.sin(t * Math.PI * 7) * r * 0.3 * (1 - t)));
        this.flash(s.node.getGlobalPosition(), r);
        return;
      }
      case 'move': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        let start: Point | undefined;
        let lift = false;
        add(
          cue.duration,
          easings.linear,
          (t) => {
            if (!start) {
              // Résolu au départ : la cible dépend des caisses en place à cet instant.
              lift = s.node.parent === this.plateLayer;
              const global = s.node.getGlobalPosition();
              this.overlay.addChild(s.node);
              start = this.overlay.toLocal(global);
              s.node.eventMode = 'none';
              if (s.badge) s.badge.visible = false;
            }
            const to = this.targetPoint(cue.to);
            const liftEnd = lift ? 0.32 : 0;
            const raised = lift ? r * 0.7 : 0;
            if (t < liftEnd) {
              // Dévissage : la vis tourne et se soulève, son ombre s'éloigne.
              const k = easings.outCubic(t / liftEnd);
              s.head.rotation = -k * Math.PI * 1.5;
              s.node.scale.set(1 + 0.25 * k);
              s.node.position.set(start.x, start.y - raised * k);
              s.shadow.position.set(r * (0.12 + 0.45 * k), r * (0.24 + 0.7 * k));
              return;
            }
            // Vol en arc vers sa destination, petit rebond à l'arrivée.
            const u = liftEnd === 0 ? t : (t - liftEnd) / (1 - liftEnd);
            const e = easings.inOutCubic(u);
            const from = { x: start.x, y: start.y - raised };
            const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 50 - Math.abs(from.x - to.x) * 0.15 };
            const a = (1 - e) * (1 - e);
            const b = 2 * (1 - e) * e;
            const c = e * e;
            s.node.position.set(a * from.x + b * ctrl.x + c * to.x, a * from.y + b * ctrl.y + c * to.y);
            const bounce = u > 0.82 ? 0.1 * Math.sin(((u - 0.82) / 0.18) * Math.PI) : 0;
            s.node.scale.set(1 + (lift ? 0.25 : 0.12) * (1 - e) + bounce);
            s.head.rotation = (lift ? -Math.PI * 1.5 : 0) * (1 - e);
            s.shadow.position.set(r * (0.12 + 0.45 * (1 - e)), r * (0.24 + 0.7 * (1 - e)));
          },
          () => {
            if (cue.to.area !== 'box') return;
            const crate = this.boxes[cue.to.boxIndex];
            if (!crate) return;
            const global = s.node.getGlobalPosition();
            this.place(s.node, crate.node);
            const local = crate.node.toLocal(global);
            s.node.position.set(local.x, local.y);
          },
        );
        return;
      }
      case 'plateFall': {
        const g = this.plates.get(cue.plateId);
        const layout = this.layout;
        const home = this.plateHome.get(cue.plateId);
        if (!g || !layout || !home) return;
        const drop = layout.board.height * 0.8 + 120;
        const side = home.x < layout.board.x + layout.board.width / 2 ? -1 : 1;
        add(
          cue.duration,
          easings.inQuad,
          (t) => {
            g.y = home.y + drop * t;
            g.x = home.x + side * 40 * t;
            g.rotation = side * 0.5 * t;
            g.alpha = 1 - t * t;
          },
          () => (g.visible = false),
        );
        return;
      }
      case 'boxSwap': {
        const layout = this.layout;
        if (!layout) return;
        // Résolue au départ : une caisse peut être remplacée plusieurs fois au même index dans un coup.
        let crate: Crate | undefined;
        let burst = false;
        const close = 0.36;
        add(
          cue.duration,
          easings.linear,
          (t) => {
            crate ??= this.boxes[cue.boxIndex];
            if (!crate || crate.node.destroyed) return;
            if (t < close) {
              // Le couvercle tombe et se pose.
              const k = easings.outBack(t / close);
              crate.lid.alpha = Math.min(1, (t / close) * 3);
              crate.lid.y = -(1 - k) * crate.rect.height * 0.9;
              return;
            }
            crate.lid.alpha = 1;
            crate.lid.y = 0;
            if (!burst) {
              burst = true;
              this.burst({ x: crate.rect.x + crate.rect.width / 2, y: crate.rect.y + crate.rect.height / 2 }, [this.theme.screws[crate.color].fill, 0xffffff], 18);
            }
            // Puis la caisse s'envole.
            const u = easings.inQuad((t - close) / (1 - close));
            crate.node.y = -u * (crate.rect.y + crate.rect.height + 40);
            crate.node.alpha = 1 - u * 0.8;
          },
          () => {
            const done = crate ?? this.boxes[cue.boxIndex];
            if (done && !done.node.destroyed) {
              this.releaseScrews(done.node);
              done.node.destroy({ children: true });
            }
            const state = this.state;
            if (cue.next && state) {
              const fresh = this.makeCrate(cue.next, layout, cue.boxIndex, this.boxes.length, state.level.rules.boxCapacity);
              this.boxes[cue.boxIndex] = fresh;
              this.boxLayer.addChild(fresh.node);
              fresh.node.alpha = 0;
              this.runner.add({
                delay: 0,
                duration: ENTER,
                easing: easings.outBack,
                update: (k) => {
                  // La resynchronisation de fin de coup peut recréer les caisses pendant l'entrée.
                  if (fresh.node.destroyed) return;
                  fresh.node.y = (1 - k) * -26;
                  fresh.node.alpha = Math.min(1, k * 1.5);
                },
              });
            } else {
              this.boxes.splice(cue.boxIndex, 1);
            }
          },
        );
        return;
      }
      case 'toolboxResize': {
        const state = this.state;
        const layout = this.layout;
        if (state && layout) add(0, easings.linear, () => this.drawLocks(state, layout));
        return;
      }
    }
  }

  private targetPoint(target: Target): Point {
    const layout = this.layout;
    const state = this.state;
    if (!layout || !state) return { x: 0, y: 0 };
    switch (target.area) {
      case 'box':
        return boxScrewCenter(layout, target.boxIndex, Math.max(1, this.boxes.length), target.slot, state.level.rules.boxCapacity);
      case 'toolbox':
        return slotCenter(layout.toolbox, target.slot, state.level.rules.toolboxMaxSlots);
      case 'holding':
        return slotCenter(holdingRect(layout), target.slot, Math.max(7, state.holding.length));
    }
  }

  // ---------- Effets ----------

  /** Anneau rouge qui s'élargit : « cette vis est bloquée ». */
  private flash(at: Point, r: number): void {
    const ring = new Graphics().circle(0, 0, r * 1.2).stroke({ width: 3, color: 0xff3b3b });
    const local = this.fxLayer.toLocal(at);
    ring.position.set(local.x, local.y);
    this.fxLayer.addChild(ring);
    this.fx.add({
      delay: 0,
      duration: 320,
      easing: easings.outCubic,
      update: (t) => {
        ring.scale.set(1 + t * 0.6);
        ring.alpha = 1 - t;
      },
      onComplete: () => ring.destroy(),
    });
  }

  private burst(at: Point, colors: number[], count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 160 + Math.random() * 220;
      this.particle(at, colors[i % colors.length] ?? 0xffffff, Math.cos(angle) * speed, Math.sin(angle) * speed, 520 + Math.random() * 300, 900);
    }
  }

  /** Pluie de confettis de victoire. */
  private celebrate(): void {
    const colors = Object.values(this.theme.screws).map((s) => s.fill);
    const width = this.viewport.width;
    for (let i = 0; i < 70; i++) {
      const at = { x: Math.random() * width, y: -10 - Math.random() * 60 };
      this.particle(at, colors[i % colors.length] ?? 0xffffff, (Math.random() - 0.5) * 120, 80 + Math.random() * 160, 1500 + Math.random() * 900, 380);
    }
  }

  private particle(at: Point, color: number, vx: number, vy: number, duration: number, gravity: number): void {
    const p = new Sprite(this.confetti());
    p.anchor.set(0.5);
    p.tint = color;
    p.position.set(at.x, at.y);
    const spin = (Math.random() - 0.5) * 14;
    this.fxLayer.addChild(p);
    this.fx.add({
      delay: 0,
      duration,
      easing: easings.linear,
      update: (t) => {
        const s = (t * duration) / 1000;
        p.position.set(at.x + vx * s, at.y + vy * s + 0.5 * gravity * s * s);
        p.rotation = spin * s;
        p.scale.y = Math.cos(spin * s * 0.7);
        p.alpha = t > 0.75 ? (1 - t) / 0.25 : 1;
      },
      onComplete: () => p.destroy(),
    });
  }
}

function holdingRect(layout: Layout): Rect {
  const h = layout.screwRadius * 1.8;
  return { x: layout.tray.x, y: layout.tray.y + layout.tray.height + 2, width: layout.tray.width, height: h };
}
