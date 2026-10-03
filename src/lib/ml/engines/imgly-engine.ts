import { MLEngine, MLModelOptions, EngineType } from '../types';
import { removeBackground as imglyRemove } from '@imgly/background-removal';

export const imglyEngine: MLEngine = {
  id: 'imgly' as EngineType,
  name: 'Standard AI Studio Model',
  description: 'High-precision portrait and object edge segmentation',
  isAvailable: () => typeof window !== 'undefined',
  removeBackground: async (file: File, options?: MLModelOptions): Promise<Blob> => {
    const result = await imglyRemove(file, {
      model: 'isnet', // Explicitly loading exact weights
      publicPath: 'https://static.img.ly/packages/js/background-removal/data/',
      progress: options?.progress ? (key: string, current: number, total: number) => {
        if (options.progress) options.progress(key, current, total);
      } : undefined
    } as any);
    return result;
  }
};
