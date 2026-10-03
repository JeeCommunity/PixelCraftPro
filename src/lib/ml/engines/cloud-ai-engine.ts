import { MLEngine, MLModelOptions, EngineType } from '../types';

export const cloudAiEngine: MLEngine = {
  id: 'cloud-ai' as EngineType,
  name: 'Cloud AI (RMBG-1.4 100% Accurate)',
  description: 'Hollywood-grade hair & edge segmentation via Cloud AI API',
  isAvailable: () => typeof window !== 'undefined',
  removeBackground: async (file: File, options?: MLModelOptions): Promise<Blob> => {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Cloud API failed' }));
      throw new Error(err.error || 'Cloud AI background removal failed');
    }

    const data = await response.json();
    const resBlob = await fetch(data.image).then(r => r.blob());
    return resBlob;
  }
};
