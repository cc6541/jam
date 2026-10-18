// Banc de rendu : joue un niveau de apps/screw-jam, mesure les fps (moyenne et 1 % bas).
// ?level=NNN choisit le niveau ; par défaut, le plus chargé. « Bench » rejoue la solution en boucle.
import { Application } from 'pixi.js';
import { engine, solve, type Action, type GameState, type LevelDef } from '@jam/engine-screw';
import { BoardView, vibrateHaptics } from '../src';

const files = import.meta.glob<LevelDef>('../../../apps/screw-jam/levels/*.json', { eager: true, import: 'default' });
const levels = Object.keys(files).sort().map((k) => files[k] as LevelDef);
const heaviest = levels.reduce((a, b) => (b.screws.length + b.plates.length > a.screws.length + a.plates.length ? b : a));
const params = new URLSearchParams(location.search);
let index = params.has('level') ? Number(params.get('level')) - 1 : levels.indexOf(heaviest);

const app = new Application();
await app.init({ resizeTo: window, background: 0x1e2433, antialias: false, autoDensity: true, resolution: Math.min(2, devicePixelRatio) });
document.body.prepend(app.canvas);

let state: GameState;
let autoplay: Action[] = [];
let bench = false;
const view = new BoardView(app.renderer, {
  onTap: (screwId) => {
    const r = engine.step(state, { type: 'tap', screwId });
    state = r.state;
    view.apply(r, screwId);
  },
  onEnd: () => {
    if (bench) setTimeout(() => start(true), 300);
  },
  haptics: vibrateHaptics,
});
app.stage.addChild(view.root);
// Diagnostic : ?hide=0,2 masque des couches (0 cadre, 1 bac, 2 plaques et vis, 3 caisses, 4 vis rangées) pour isoler un coût.
for (const i of (params.get('hide') ?? '').split(',').filter(Boolean)) {
  const layer = view.root.children[Number(i)];
  if (layer) layer.visible = false;
}

function start(auto = false): void {
  const level = levels[index];
  if (!level) return;
  state = engine.init(level);
  view.load(state, { width: app.screen.width, height: app.screen.height });
  const solved = auto ? solve(level, { randomRuns: 0 }) : undefined;
  autoplay = solved?.status === 'solved' ? [...solved.solution] : [];
}

// fps : fenêtre glissante des 600 dernières frames.
const frames: number[] = [];
let sinceAuto = 0;
app.ticker.add((ticker) => {
  view.update(ticker.deltaMS);
  frames.push(ticker.deltaMS);
  if (frames.length > 600) frames.shift();
  sinceAuto += ticker.deltaMS;
  if (autoplay.length > 0 && !view.animating && sinceAuto > 120) {
    sinceAuto = 0;
    const action = autoplay.shift() as Action;
    const r = engine.step(state, action);
    state = r.state;
    view.apply(r);
  }
});
setInterval(() => {
  const sorted = [...frames].sort((a, b) => b - a);
  const avg = frames.length / (frames.reduce((a, b) => a + b, 0) / 1000);
  const low = 1000 / (sorted[Math.floor(sorted.length / 100)] ?? 16.7);
  const level = levels[index];
  (document.getElementById('hud') as HTMLElement).textContent =
    `${level?.id} · ${level?.screws.length} vis · ${level?.plates.length} plaques\n` +
    `fps moy ${avg.toFixed(1)} · 1% bas ${low.toFixed(1)}${bench ? ' · bench' : ''}`;
  (window as unknown as { __fps: { avg: number; low: number } }).__fps = { avg, low };
}, 500);

const on = (id: string, fn: () => void) => document.getElementById(id)?.addEventListener('click', fn);
on('prev', () => { index = Math.max(0, index - 1); bench = false; start(); });
on('next', () => { index = Math.min(levels.length - 1, index + 1); bench = false; start(); });
on('restart', () => { bench = false; start(); });
on('auto', () => { bench = false; start(true); });
on('bench', () => { bench = true; start(true); });
window.addEventListener('resize', () => view.resize({ width: app.screen.width, height: app.screen.height }));
if (params.has('bench')) { bench = true; start(true); } else start();
