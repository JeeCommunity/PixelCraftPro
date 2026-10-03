export type EngineType = 'bg0' | 'imgly' | 'onnx' | 'transformers';

export interface MLModelOptions {
  model?: string;
  publicPath?: string;
  progress?: (key: string, current: number, total: number) => void;
}

export interface EngineResult {
  blob: Blob;
  durationMs: number;
  engineUsed: EngineType;
}

export interface MLEngine {
  id: EngineType;
  name: string;
  description: string;
  isAvailable: () => boolean;
  removeBackground: (file: File, options?: MLModelOptions) => Promise<Blob>;
}
