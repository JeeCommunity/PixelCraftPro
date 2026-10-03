import { engineRegistry } from '../lib/ml/registry';
import { EngineType } from '../lib/ml/types';

// Web Worker message listener for background removal
self.onmessage = async (e: MessageEvent) => {
  const { id, file, engineType, options } = e.data;
  try {
    const result = await engineRegistry.processWithFallback(file, engineType, {
      ...options,
      progress: (key: string, current: number, total: number) => {
        self.postMessage({ type: 'progress', id, key, current, total });
      }
    });
    self.postMessage({ type: 'success', id, result: { blob: result.blob, durationMs: result.durationMs, engineUsed: result.engineUsed } });
  } catch (err: any) {
    self.postMessage({ type: 'error', id, error: err?.message || 'Worker processing failed' });
  }
};
