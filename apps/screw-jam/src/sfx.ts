// Sons synthétisés à la volée (WebAudio) : aucun fichier audio à embarquer ni à licencier.
// Le navigateur n'autorise le son qu'après un geste du joueur ; le contexte est créé au premier son.
import type { SoundId, SoundPort } from '@jam/render-pixi';

type Wave = OscillatorType;

export class SynthSounds implements SoundPort {
  enabled = true;
  private ctx: AudioContext | undefined;
  private noiseBuffer: AudioBuffer | undefined;

  play(id: SoundId): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    switch (id) {
      case 'tap':
        this.tone(ctx, 'triangle', 900, 700, t, 0.05, 0.08);
        return;
      case 'unscrew':
        this.tone(ctx, 'triangle', 480, 1150, t, 0.13, 0.09);
        this.noise(ctx, t, 0.04, 0.05, 3000);
        return;
      case 'drop':
        this.tone(ctx, 'sine', 240, 130, t, 0.08, 0.18);
        this.noise(ctx, t, 0.03, 0.06, 1800);
        return;
      case 'plate':
        this.noise(ctx, t, 0.28, 0.12, 600);
        this.tone(ctx, 'sine', 130, 55, t, 0.25, 0.14);
        return;
      case 'box':
        this.tone(ctx, 'sine', 660, 660, t, 0.14, 0.12);
        this.tone(ctx, 'sine', 990, 990, t + 0.09, 0.2, 0.12);
        return;
      case 'blocked':
        this.tone(ctx, 'square', 170, 140, t, 0.12, 0.05);
        return;
      case 'powerup':
        this.tone(ctx, 'sine', 420, 1260, t, 0.22, 0.1);
        return;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(ctx, 'triangle', f, f, t + i * 0.11, 0.22, 0.11));
        return;
      case 'lose':
        [392, 330, 262].forEach((f, i) => this.tone(ctx, 'triangle', f, f * 0.97, t + i * 0.16, 0.2, 0.1));
        return;
    }
  }

  private context(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      try {
        this.ctx = new Ctor();
      } catch {
        return undefined;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  /** Oscillateur avec glissando de `from` à `to` Hz et enveloppe percussive. */
  private tone(ctx: AudioContext, type: Wave, from: number, to: number, start: number, duration: number, volume: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Bruit filtré (choc, bois). */
  private noise(ctx: AudioContext, start: number, duration: number, volume: number, cutoff: number): void {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 1;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(start);
    src.stop(start + duration + 0.02);
  }
}
