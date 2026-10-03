export type ToolId = 
  | 'home' 
  | 'background-remover' 
  | 'compressor' 
  | 'compress-20kb'
  | 'compress-50kb'
  | 'compress-100kb'
  | 'compress-200kb'
  | 'compress-500kb'
  | 'resizer' 
  | 'signature-resizer'
  | 'passport-resizer'
  | 'image-to-pdf'
  | 'jpg-to-pdf'
  | 'png-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'rotate-pdf'
  | 'converter' 
  | 'jpg-to-webp'
  | 'png-to-webp'
  | 'jpg-to-avif'
  | 'png-to-avif'
  | 'webp-to-jpg'
  | 'watermarker' 
  | 'palette'
  | 'youtube-to-slides'
  | 'pdf-to-jpg'
  | 'pdf-to-png'
  | 'pdf-compressor'
  | 'privacy-policy'
  | 'terms';

export interface ToolItem {
  id: ToolId;
  title: string;
  description: string;
  category: 'AI' | 'Optimize' | 'Edit' | 'Convert';
  iconName: string;
  badge?: string;
  isPopular?: boolean;
  keywords?: string[];
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  statusText: string;
  error?: string;
}
