import { MLEngine, EngineType, MLModelOptions, EngineResult } from './types';
import { imglyEngine } from './engines/imgly-engine';
import { onnxEngine } from './engines/onnx-engine';

class EngineRegistry {
  private engines: Map<EngineType, MLEngine> = new Map();

  constructor() {
    this.register(imglyEngine);
    this.register(onnxEngine);
  }

  register(engine: MLEngine) {
    this.engines.set(engine.id, engine);
  }

  get(id: EngineType): MLEngine | undefined {
    return this.engines.get(id);
  }

  getAll(): MLEngine[] {
    return Array.from(this.engines.values());
  }

  async processWithFallback(file: File, preferredEngine: EngineType = 'imgly', options?: MLModelOptions): Promise<EngineResult> {
    const startTime = performance.now();
    const primary = this.get(preferredEngine) || imglyEngine;

    try {
      const blob = await primary.removeBackground(file, options);
      const durationMs = performance.now() - startTime;
      return { blob, durationMs, engineUsed: primary.id };
    } catch (primaryErr) {
      console.warn(`Primary engine ${primary.id} failed, attempting fallback...`, primaryErr);
      const fallbacks: EngineType[] = ['imgly', 'bg0'];
      for (const fbId of fallbacks) {
        if (fbId === primary.id) continue;
        const fallbackEngine = this.get(fbId);
        if (fallbackEngine) {
          try {
            const blob = await fallbackEngine.removeBackground(file, options);
            const durationMs = performance.now() - startTime;
            return { blob, durationMs, engineUsed: fallbackEngine.id };
          } catch (fbErr) {
            console.warn(`Fallback engine ${fbId} failed:`, fbErr);
          }
        }
      }
      throw primaryErr;
    }
  }
}

export const engineRegistry = new EngineRegistry();
