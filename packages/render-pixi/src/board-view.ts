// Vue Pixi du plateau. Elle affiche un GameState et anime les Cue du director :
// aucune règle de jeu ici, l'état d'après fait toujours foi (sync en fin d'animation).
import { Container, Graphics, Sprite, Text, type Renderer, type Texture } from 'pixi.js';
import type { ColorId, GameState, Id, Point, StepResult } from '@jam/engine-screw';
import { direct, rejectedTapCues, type Cue, type Target } from './director';
import { silentHaptics, type HapticsPort } from './haptics';
import { boxScrewCenter, computeLayout, slotCenter, toScreen, type Layout, type Rect } from './layout';
import { centroid, crateGraphic, frameGraphic, lockedSlots, plateGraphic, screwHead, trayGraphic } from './skin';
import { DEFAULT_THEME, type Theme } from './theme';
import { easings, TweenRunner } from './tween';

export interface BoardViewOptions {
  onTap: (screwId: Id) => void;
  onEnd?: (result: 'won' | 'lost', nearMiss: boolean) => void;
  theme?: Theme;
  /** Textes affichés dans le dessin (le rendu ne connaît pas la langue). */
  labels?: { toolbox: string };
  haptics?: HapticsPort;
}

interface ScrewNode {
  node: Container;
  label?: Text;
}

const PULSE = 160;
const SHAKE = 220;

export class BoardView {
  readonly root = new Container();
  private readonly frameLayer = new Container();
  private readonly plateLayer = new Container({ sortableChildren: true });
  private readonly slotLayer = new Container();
  private readonly boxLayer = new Container();
  private readonly overlay = new Container();
  private readonly runner = new TweenRunner();
  private readonly theme: Theme;
  private readonly haptics: HapticsPort;
  private readonly textures = new Map<ColorId, Texture>();
  private readonly screws = new Map<Id, ScrewNode>();
  private readonly plates = new Map<Id, Container>();
  /** Centre de chaque plaque : pivot de la chute (elle tourne sur elle-même). */
  private readonly plateHome = new Map<Id, Point>();
  private lockLayer = new Graphics();
  private boxes: Container[] = [];
  /** Boîte (index courant) de chaque vis en route ou rangée pendant une animation. */
  private readonly boxOf = new Map<Id, number>();
  private layout?: Layout;
  private state?: GameState;
  private viewport = { width: 0, height: 0 };

  constructor(
    private readonly renderer: Renderer,
    private readonly options: BoardViewOptions,
  ) {
    this.theme = options.theme ?? DEFAULT_THEME;
    this.haptics = options.haptics ?? silentHaptics;
    this.root.addChild(this.frameLayer, this.slotLayer, this.plateLayer, this.boxLayer, this.overlay);
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
    for (const t of this.textures.values()) t.destroy(true);
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
    for (const layer of [this.frameLayer, this.plateLayer, this.slotLayer, this.boxLayer, this.overlay]) {
      layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    }
    for (const t of this.textures.values()) t.destroy(true);
    this.textures.clear();
    this.screws.clear();
    this.plates.clear();
    this.plateHome.clear();
    this.boxes = [];

    this.frameLayer.addChild(this.bake(frameGraphic(layout.board, this.theme)));
    this.slotLayer.addChild(
      this.bake(trayGraphic(layout, this.theme, state.level.rules.toolboxMaxSlots, this.options.labels?.toolbox ?? 'Toolbox')),
    );
    this.lockLayer = new Graphics();
    this.slotLayer.addChild(this.lockLayer);

    for (const plate of state.level.plates) {
      const points = plate.polygon.map((p) => toScreen(layout, p));
      const g = this.bake(plateGraphic(points, plate.z % 2 === 0 ? 'metal' : 'wood', this.theme));
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
      const sprite = new Sprite(this.screwTexture(def.color));
      sprite.anchor.set(0.5);
      node.addChild(sprite);
      let label: Text | undefined;
      if (def.kind.type === 'multiTap') {
        label = new Text({
          text: '',
          style: { fill: 0xffffff, fontSize: layout.screwRadius * 0.95, fontWeight: '800', stroke: { color: 0x10131a, width: 4 } },
        });
        label.anchor.set(0.5);
        label.y = layout.screwRadius * 1.3;
        node.addChild(label);
      }
      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.on('pointertap', () => this.options.onTap(def.id));
      this.screws.set(def.id, label ? { node, label } : { node });
    }
  }

  private screwTexture(color: ColorId): Texture {
    const cached = this.textures.get(color);
    if (cached) return cached;
    const r = this.layout?.screwRadius ?? 14;
    const style = this.theme.screws[color];
    const g = new Graphics();
    screwHead(g, r, style);
    const texture = this.renderer.generateTexture({ target: g, resolution: Math.max(3, this.renderer.resolution), antialias: true });
    g.destroy();
    this.textures.set(color, texture);
    return texture;
  }

  // ---------- Synchronisation (l'état fait foi) ----------

  private sync(state: GameState): void {
    const layout = this.layout;
    if (!layout) return;
    this.state = state;
    this.boxOf.clear();

    for (const [id, g] of this.plates) {
      g.visible = id in state.plates;
      const home = this.plateHome.get(id);
      if (home) g.position.set(home.x, home.y);
      g.rotation = 0;
      g.alpha = 1;
    }

    this.drawSlots(state, layout);
    this.drawBoxes(state, layout);

    const homes = new Map<Id, { parent: Container; at: Point }>();
    state.openBoxes.forEach((box, b) => {
      box.filled.forEach((id, slot) => homes.set(id, { parent: this.boxLayer, at: boxScrewCenter(layout, b, state.openBoxes.length, slot, state.level.rules.boxCapacity) }));
    });
    state.toolbox.forEach((id, i) => homes.set(id, { parent: this.overlay, at: slotCenter(layout.toolbox, i, state.level.rules.toolboxMaxSlots) }));
    state.holding.forEach((id, i) => homes.set(id, { parent: this.overlay, at: slotCenter(holdingRect(layout), i, Math.max(7, state.holding.length)) }));

    for (const [id, { node, label }] of this.screws) {
      node.scale.set(1);
      node.rotation = 0;
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
        if (label) label.text = onBoard.tapsLeft > 1 ? String(onBoard.tapsLeft) : '';
        continue;
      }
      node.eventMode = 'none';
      if (label) label.text = '';
      const home = homes.get(id);
      node.visible = home !== undefined;
      if (home) {
        home.parent.addChild(node);
        node.position.set(home.at.x, home.at.y);
      }
    }
  }

  /** Emplacements encore verrouillés (au-delà de `toolboxSlots`) : seule partie du bac qui change. */
  private drawSlots(state: GameState, layout: Layout): void {
    this.lockLayer.destroy();
    this.lockLayer = lockedSlots(layout, state.toolboxSlots, state.level.rules.toolboxMaxSlots);
    this.slotLayer.addChild(this.lockLayer);
  }

  private drawBoxes(state: GameState, layout: Layout): void {
    this.boxLayer.removeChildren().forEach((c) => {
      if (![...this.screws.values()].some((s) => s.node === c)) c.destroy({ children: true });
    });
    this.boxes = state.openBoxes.map((box, b) => {
      const c = this.boxGraphic(box.color, layout, b, state.openBoxes.length, state.level.rules.boxCapacity);
      this.boxLayer.addChild(c);
      return c;
    });
  }

  /** Boîte : fond teinté + vis fantômes (motif visible même sans couleur). */
  private boxGraphic(color: ColorId, layout: Layout, index: number, count: number, capacity: number): Container {
    const c = new Container();
    const center = slotCenter(layout.boxes, index, count);
    const w = Math.min(layout.boxes.width / count - 12, layout.screwRadius * 2.4 * capacity + 16);
    const h = layout.boxes.height * 0.8;
    const fill = this.theme.screws[color].fill;
    c.addChild(this.bake(crateGraphic({ x: center.x - w / 2, y: center.y - h / 2, width: w, height: h }, fill, this.theme)));
    for (let slot = 0; slot < capacity; slot++) {
      const ghost = new Sprite(this.screwTexture(color));
      ghost.anchor.set(0.5);
      ghost.alpha = 0.3;
      const at = boxScrewCenter(layout, index, count, slot, capacity);
      ghost.position.set(at.x, at.y);
      c.addChild(ghost);
    }
    return c;
  }

  // ---------- Animations ----------

  private schedule(cues: Cue[]): void {
    for (const cue of cues) this.animate(cue);
  }

  private animate(cue: Cue): void {
    const add = (duration: number, easing: (t: number) => number, update: (t: number) => void, onComplete?: () => void) =>
      this.runner.add(onComplete ? { delay: cue.at, duration, easing, update, onComplete } : { delay: cue.at, duration, easing, update });

    switch (cue.kind) {
      case 'haptic':
        add(0, easings.linear, () => undefined, () => this.haptics.play(cue.cue));
        return;
      case 'end':
        add(0, easings.linear, () => undefined, () => this.options.onEnd?.(cue.result, cue.nearMiss));
        return;
      case 'pulse': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        add(PULSE, easings.linear, (t) => s.node.scale.set(1 + 0.25 * Math.sin(Math.PI * t)));
        if (s.label) {
          const label = s.label;
          add(0, easings.linear, () => (label.text = cue.tapsLeft > 1 ? String(cue.tapsLeft) : ''));
        }
        return;
      }
      case 'shake': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        const x0 = s.node.x;
        add(SHAKE, easings.linear, (t) => (s.node.x = x0 + Math.sin(t * Math.PI * 6) * 5 * (1 - t)));
        return;
      }
      case 'move': {
        const s = this.screws.get(cue.screwId);
        if (!s) return;
        let from: Point | undefined;
        add(cue.duration, easings.outCubic, (t) => {
          if (!from) {
            if (cue.to.area === 'box') this.boxOf.set(cue.screwId, cue.to.boxIndex);
            // Résolu au départ : la cible dépend des boîtes en place à cet instant.
            const global = s.node.getGlobalPosition();
            this.overlay.addChild(s.node);
            from = this.overlay.toLocal(global);
            s.node.eventMode = 'none';
            if (s.label) s.label.text = '';
          }
          const to = this.targetPoint(cue.to);
          s.node.position.set(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
          s.node.scale.set(1 + 0.15 * Math.sin(Math.PI * t));
        });
        return;
      }
      case 'plateFall': {
        const g = this.plates.get(cue.plateId);
        const layout = this.layout;
        if (!g || !layout) return;
        const drop = layout.board.height * 0.9;
        const spin = (cue.plateId.length % 2 === 0 ? 1 : -1) * 0.35;
        add(cue.duration, easings.inQuad, (t) => {
          g.y = (this.plateHome.get(cue.plateId)?.y ?? 0) + drop * t;
          g.rotation = spin * t;
          g.alpha = 1 - t;
        }, () => (g.visible = false));
        return;
      }
      case 'boxSwap': {
        const layout = this.layout;
        if (!layout) return;
        // Résolus au départ : une boîte peut être remplacée plusieurs fois au même index dans un coup.
        let box: Container | undefined;
        let passengers: ScrewNode[] = [];
        add(cue.duration, easings.inQuad, (t) => {
          if (!box) {
            box = this.boxes[cue.boxIndex];
            passengers = [...this.boxOf].filter(([, b]) => b === cue.boxIndex).flatMap(([id]) => this.screws.get(id) ?? []);
          }
          if (!box) return;
          box.y = -layout.boxes.height * 1.2 * t;
          box.alpha = 1 - t;
          for (const p of passengers) p.node.alpha = 1 - t;
        }, () => {
          for (const p of passengers) {
            p.node.visible = false;
            p.node.alpha = 1;
          }
          box?.destroy({ children: true });
          if (cue.next) {
            const fresh = this.boxGraphic(cue.next, layout, cue.boxIndex, this.boxes.length, this.state?.level.rules.boxCapacity ?? 3);
            this.boxes[cue.boxIndex] = fresh;
            this.boxLayer.addChild(fresh);
          } else {
            this.boxes.splice(cue.boxIndex, 1);
          }
          for (const [id, b] of this.boxOf) {
            if (b === cue.boxIndex) this.boxOf.delete(id);
            else if (!cue.next && b > cue.boxIndex) this.boxOf.set(id, b - 1);
          }
        });
        return;
      }
      case 'toolboxResize': {
        const state = this.state;
        const layout = this.layout;
        if (state && layout) add(0, easings.linear, () => this.drawSlots(state, layout));
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
}

function holdingRect(layout: Layout): Rect {
  const h = layout.screwRadius * 2.4;
  return { x: layout.toolbox.x, y: layout.toolbox.y - h - 4, width: layout.toolbox.width, height: h };
}
