import { ToolItem } from '../types';

export const TOOLS: ToolItem[] = [
  {
    id: 'background-remover',
    title: 'Background Remover',
    description: 'Instantly remove backgrounds from portraits, products, and objects with free client-side browser AI.',
    category: 'AI',
    iconName: 'Scissors',
    badge: 'Popular',
    isPopular: true,
    keywords: ['background remover', 'remove bg', 'transparent background', 'cutout', 'portrait AI']
  },
  {
    id: 'youtube-to-slides',
    title: 'YouTube Video → Educational Slides PDF',
    description: 'Extract educational slides, physics formulas, equations, and whiteboard content from JEE/NEET/lecture videos into a clean PDF.',
    category: 'AI',
    iconName: 'Sparkles',
    badge: 'New',
    isPopular: true,
    keywords: ['youtube to slides', 'video to pdf', 'lecture slides extractor', 'notes from video', 'frames to pdf']
  },
  {
    id: 'pdf-compressor',
    title: 'PDF Compressor',
    description: 'Compress PDF files securely using high-performance optimization with Safe, Balanced, and Maximum modes.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Pro',
    isPopular: true,
    keywords: ['pdf compressor', 'compress pdf', 'reduce pdf size', 'pdfcpu', 'optimize pdf']
  },
  {
    id: 'compressor',
    title: 'Image Compressor',
    description: 'Reduce file size of PNG, JPEG, and WebP images without noticeable quality loss.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Fast',
    isPopular: true,
    keywords: ['image compressor', 'compress image', 'reduce image size', 'optimize photo', 'squoosh compressor', 'kb reducer']
  },
  {
    id: 'compress-20kb',
    title: 'Compress to 20KB',
    description: 'Intelligently compress images down to 20KB or less for strict web upload, signatures, and avatar requirements.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Target',
    keywords: ['compress to 20kb', '20kb compressor', 'reduce to 20kb', 'signature size reducer', 'image under 20kb', 'kb resizer']
  },
  {
    id: 'compress-50kb',
    title: 'Compress to 50KB',
    description: 'Compress images precisely to 50KB using iterative binary search quality and dimension scaling.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Target',
    keywords: ['compress to 50kb', '50kb compressor', 'reduce photo to 50kb', 'passport photo 50kb', 'image size 50kb']
  },
  {
    id: 'compress-100kb',
    title: 'Compress to 100KB',
    description: 'Optimize photographs and graphics to 100KB with maximum visual quality preservation.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Target',
    keywords: ['compress to 100kb', '100kb compressor', 'reduce image to 100kb', 'photo under 100kb', 'form upload size']
  },
  {
    id: 'compress-200kb',
    title: 'Compress to 200KB',
    description: 'Achieve 200KB target size for web banners, thumbnails, and document attachments.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Target',
    keywords: ['compress to 200kb', '200kb compressor', 'reduce image to 200kb', 'photo compressor 200kb']
  },
  {
    id: 'compress-500kb',
    title: 'Compress to 500KB',
    description: 'High-fidelity compression targeting 500KB for crisp, high-resolution web imagery.',
    category: 'Optimize',
    iconName: 'Minimize2',
    badge: 'Target',
    keywords: ['compress to 500kb', '500kb compressor', 'reduce photo to 500kb', 'image size 500kb']
  },
  {
    id: 'resizer',
    title: 'Photo Resizer',
    description: 'Resize photos to exact pixel dimensions or percentages with high-quality filtering and aspect ratio locking.',
    category: 'Edit',
    iconName: 'Maximize',
    isPopular: true,
    keywords: ['photo resizer', 'resize image', 'image dimensions', 'crop photo', 'pica resizer']
  },
  {
    id: 'signature-resizer',
    title: 'Signature Resizer',
    description: 'Resize online signatures to exact dimensions for government forms, job applications, and exam portals.',
    category: 'Edit',
    iconName: 'Maximize',
    badge: 'Popular',
    isPopular: true,
    keywords: ['signature resizer', 'resize signature', 'signature dimensions', 'exam form signature', 'online signature resize']
  },
  {
    id: 'passport-resizer',
    title: 'Passport Photo Resizer',
    description: 'Crop and resize portrait photos to exact passport and visa photo presets with high-quality rendering.',
    category: 'Edit',
    iconName: 'Maximize',
    badge: 'New',
    isPopular: true,
    keywords: ['passport photo resizer', 'visa photo size', 'passport size photo maker', 'portrait dimensions']
  },
  {
    id: 'image-to-pdf',
    title: 'Image to PDF',
    description: 'Convert multiple JPG, PNG, and WebP images into a single professional PDF document with page size & margin controls.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['image to pdf', 'photos to pdf', 'convert images to pdf document']
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description: 'Quickly convert single or multiple JPG/JPEG images into clean, high-resolution PDF documents.',
    category: 'Convert',
    iconName: 'RefreshCw',
    isPopular: true,
    keywords: ['jpg to pdf', 'jpeg to pdf converter', 'jpg images to pdf']
  },
  {
    id: 'png-to-pdf',
    title: 'PNG to PDF',
    description: 'Convert PNG images (with transparency handling) into professional PDF documents.',
    category: 'Convert',
    iconName: 'RefreshCw',
    isPopular: true,
    keywords: ['png to pdf', 'transparent png to pdf', 'image converter to pdf']
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Convert PDF document pages into high-resolution JPG images locally.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['pdf to jpg', 'convert pdf to jpeg', 'extract pages as jpg', 'pdf image converter']
  },
  {
    id: 'pdf-to-png',
    title: 'PDF to PNG',
    description: 'Convert PDF pages into high-quality PNG images with transparency preservation.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['pdf to png', 'convert pdf to png', 'extract pages as png', 'pdf to transparent image']
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one organized PDF document with custom page ordering.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['merge pdf', 'combine pdf files', 'join pdf documents']
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    description: 'Extract specific pages or page ranges (e.g. 1-3, 5, 7-10) from a PDF into separate files.',
    category: 'Convert',
    iconName: 'RefreshCw',
    isPopular: true,
    keywords: ['split pdf', 'extract pdf pages', 'cut pdf document']
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    description: 'Rotate specific pages or entire PDF documents by 90°, 180°, or 270° clockwise.',
    category: 'Convert',
    iconName: 'RefreshCw',
    isPopular: true,
    keywords: ['rotate pdf', 'turn pdf pages', 'fix pdf orientation']
  },
  {
    id: 'converter',
    title: 'Image Format Converter',
    description: 'Convert images between JPEG, PNG, WebP, and AVIF formats using fast browser-based codecs.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Fast',
    isPopular: true,
    keywords: ['image format converter', 'convert image', 'png to jpg', 'webp converter', 'avif converter']
  },
  {
    id: 'jpg-to-webp',
    title: 'JPG to WebP Converter',
    description: 'Convert JPEG images into modern high-compression WebP format with quality control.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['jpg to webp', 'jpeg to webp', 'convert jpg to webp']
  },
  {
    id: 'png-to-webp',
    title: 'PNG to WebP Converter',
    description: 'Convert PNG images (with transparency preservation) into WebP format.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'Popular',
    isPopular: true,
    keywords: ['png to webp', 'transparent png to webp', 'convert png to webp']
  },
  {
    id: 'jpg-to-avif',
    title: 'JPG to AVIF Converter',
    description: 'Convert JPG images into next-generation AVIF format with high compression efficiency.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'New',
    isPopular: true,
    keywords: ['jpg to avif', 'jpeg to avif', 'convert jpg to avif']
  },
  {
    id: 'png-to-avif',
    title: 'PNG to AVIF Converter',
    description: 'Convert PNG images into ultra-compact AVIF format while preserving transparency.',
    category: 'Convert',
    iconName: 'RefreshCw',
    badge: 'New',
    isPopular: true,
    keywords: ['png to avif', 'transparent png to avif', 'convert png to avif']
  },
  {
    id: 'webp-to-jpg',
    title: 'WebP to JPG Converter',
    description: 'Convert WebP images into standard JPG format with custom background color for transparency.',
    category: 'Convert',
    iconName: 'RefreshCw',
    isPopular: true,
    keywords: ['webp to jpg', 'convert webp to jpeg', 'webp to image']
  },
  {
    id: 'watermarker',
    title: 'Watermark Studio',
    description: 'Protect your visual assets by adding customizable text or logo watermarks.',
    category: 'Edit',
    iconName: 'Shield',
    isPopular: false,
    keywords: ['watermark', 'add watermark', 'protect photo', 'logo watermark']
  },
  {
    id: 'palette',
    title: 'Color Palette Extractor',
    description: 'Extract dominant HEX and RGB color swatches from any uploaded photograph.',
    category: 'AI',
    iconName: 'Palette',
    isPopular: false,
    keywords: ['color palette', 'extract colors', 'HEX extractor', 'color swatches']
  }
];
