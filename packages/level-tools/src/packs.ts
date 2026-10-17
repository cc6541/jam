import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface LevelFile {
  pack: string;
  file: string;
  json: unknown;
}

/** Niveaux de chaque app : apps/<pack>/levels/*.json. */
export function loadPacks(appsDir: string): LevelFile[] {
  if (!existsSync(appsDir)) return [];
  const files: LevelFile[] = [];
  for (const pack of readdirSync(appsDir).sort()) {
    const dir = join(appsDir, pack, 'levels');
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      } catch {
        json = undefined;
      }
      files.push({ pack, file, json });
    }
  }
  return files;
}
