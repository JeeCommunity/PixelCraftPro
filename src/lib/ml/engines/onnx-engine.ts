import { MLEngine, MLModelOptions, EngineType } from '../types';
import { removeBackground as bg0Remove } from '@bg0/browser';

export const onnxEngine: MLEngine = {
  id: 'bg0' as EngineType,
  name: 'Advanced Web AI Engine',
  description: 'Optimized high-speed background removal engine',
  isAvailable: () => typeof window !== 'undefined',
  removeBackground: async (file: File, options?: MLModelOptions): Promise<Blob> => {
    const result = await bg0Remove(file, {
      publicPath: options?.publicPath || 'https://cdn.jsdelivr.net/npm/@bg0/browser/dist/',
      progress: options?.progress ? (key: string, current: number, total: number) => {
        if (options.progress) options.progress(key, current, total);
      } : undefined
    } as any);
    return result instanceof Blob ? result : new Blob([result as any], { type: 'image/png' });
  }
};
