import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ToolId } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToolGrid } from './components/ToolGrid';
import { incrementToolUsage } from './utils/usageTracking';
import { Loader2, AlertTriangle, Home } from 'lucide-react';

// Lazy load heavy tool components to optimize homepage initial bundle size and startup time
const BackgroundRemover = lazy(() => import('./components/tools/BackgroundRemover').then(m => ({ default: m.BackgroundRemover })));
const ImageCompressor = lazy(() => import('./components/tools/ImageCompressor').then(m => ({ default: m.ImageCompressor })));
const TargetCompressor = lazy(() => import('./components/tools/TargetCompressor').then(m => ({ default: m.TargetCompressor })));
const PhotoResizer = lazy(() => import('./components/tools/PhotoResizer').then(m => ({ default: m.PhotoResizer })));
const SignatureResizer = lazy(() => import('./components/tools/SignatureResizer').then(m => ({ default: m.SignatureResizer })));
const PassportResizer = lazy(() => import('./components/tools/PassportResizer').then(m => ({ default: m.PassportResizer })));
const ImageToPdf = lazy(() => import('./components/tools/ImageToPdf').then(m => ({ default: m.ImageToPdf })));
const JpgToPdf = lazy(() => import('./components/tools/JpgToPdf').then(m => ({ default: m.JpgToPdf })));
const PngToPdf = lazy(() => import('./components/tools/PngToPdf').then(m => ({ default: m.PngToPdf })));
const MergePdf = lazy(() => import('./components/tools/MergePdf').then(m => ({ default: m.MergePdf })));
const SplitPdf = lazy(() => import('./components/tools/SplitPdf').then(m => ({ default: m.SplitPdf })));
const RotatePdf = lazy(() => import('./components/tools/RotatePdf').then(m => ({ default: m.RotatePdf })));
const FormatConverter = lazy(() => import('./components/tools/FormatConverter').then(m => ({ default: m.FormatConverter })));
const YoutubeToSlides = lazy(() => import('./components/tools/YoutubeToSlides').then(m => ({ default: m.YoutubeToSlides })));
const PdfToImage = lazy(() => import('./components/tools/PdfToImage').then(m => ({ default: m.PdfToImage })));
const PdfCompressor = lazy(() => import('./components/tools/PdfCompressor').then(m => ({ default: m.PdfCompressor })));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Terms = lazy(() => import('./components/Terms').then(m => ({ default: m.Terms })));

const ToolLoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-4">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    <p className="text-slate-400 text-sm font-medium">Loading tool dependencies and preparing workspace...</p>
  </div>
);

export default function App() {
  const getToolFromPath = (path: string): { tool: ToolId; isNotFound: boolean } => {
    if (path === '/' || path === '') return { tool: 'home', isNotFound: false };
    if (path.includes('/privacy-policy')) return { tool: 'privacy-policy', isNotFound: false };
    if (path.includes('/terms')) return { tool: 'terms', isNotFound: false };
    if (path.includes('/pdf-compressor')) return { tool: 'pdf-compressor', isNotFound: false };
    if (path.includes('/compress-image-20kb') || path.includes('/compress-20kb')) return { tool: 'compress-20kb', isNotFound: false };
    if (path.includes('/compress-image-50kb') || path.includes('/compress-50kb')) return { tool: 'compress-50kb', isNotFound: false };
    if (path.includes('/compress-image-100kb') || path.includes('/compress-100kb')) return { tool: 'compress-100kb', isNotFound: false };
    if (path.includes('/compress-image-200kb') || path.includes('/compress-200kb')) return { tool: 'compress-200kb', isNotFound: false };
    if (path.includes('/compress-image-500kb') || path.includes('/compress-500kb')) return { tool: 'compress-500kb', isNotFound: false };
    if (path.includes('/image-compressor') || path.includes('/compressor')) return { tool: 'compressor', isNotFound: false };
    if (path.includes('/background-remover')) return { tool: 'background-remover', isNotFound: false };
    if (path.includes('/photo-resizer') || path.includes('/resizer')) return { tool: 'resizer', isNotFound: false };
    if (path.includes('/signature-resizer')) return { tool: 'signature-resizer', isNotFound: false };
    if (path.includes('/passport-photo-resizer') || path.includes('/passport-resizer')) return { tool: 'passport-resizer', isNotFound: false };
    if (path.includes('/image-to-pdf')) return { tool: 'image-to-pdf', isNotFound: false };
    if (path.includes('/jpg-to-pdf')) return { tool: 'jpg-to-pdf', isNotFound: false };
    if (path.includes('/png-to-pdf')) return { tool: 'png-to-pdf', isNotFound: false };
    if (path.includes('/pdf-to-jpg')) return { tool: 'pdf-to-jpg', isNotFound: false };
    if (path.includes('/pdf-to-png')) return { tool: 'pdf-to-png', isNotFound: false };
    if (path.includes('/merge-pdf')) return { tool: 'merge-pdf', isNotFound: false };
    if (path.includes('/split-pdf')) return { tool: 'split-pdf', isNotFound: false };
    if (path.includes('/rotate-pdf')) return { tool: 'rotate-pdf', isNotFound: false };
    if (path.includes('/jpg-to-webp')) return { tool: 'jpg-to-webp', isNotFound: false };
    if (path.includes('/png-to-webp')) return { tool: 'png-to-webp', isNotFound: false };
    if (path.includes('/jpg-to-avif')) return { tool: 'jpg-to-avif', isNotFound: false };
    if (path.includes('/png-to-avif')) return { tool: 'png-to-avif', isNotFound: false };
    if (path.includes('/webp-to-jpg')) return { tool: 'webp-to-jpg', isNotFound: false };
    if (path.includes('/image-format-converter') || path.includes('/converter')) return { tool: 'converter', isNotFound: false };
    if (path.includes('/youtube-to-slides')) return { tool: 'youtube-to-slides', isNotFound: false };
    return { tool: 'home', isNotFound: true };
  };

  const getCleanPathForTool = (tool: ToolId): string => {
    switch (tool) {
      case 'home': return '/';
      case 'privacy-policy': return '/privacy-policy';
      case 'terms': return '/terms';
      case 'pdf-compressor': return '/pdf-compressor';
      case 'compress-20kb': return '/compress-image-20kb';
      case 'compress-50kb': return '/compress-image-50kb';
      case 'compress-100kb': return '/compress-image-100kb';
      case 'compress-200kb': return '/compress-image-200kb';
      case 'compress-500kb': return '/compress-image-500kb';
      case 'compressor': return '/image-compressor';
      case 'background-remover': return '/background-remover';
      case 'resizer': return '/photo-resizer';
      case 'signature-resizer': return '/signature-resizer';
      case 'passport-resizer': return '/passport-photo-resizer';
      case 'image-to-pdf': return '/image-to-pdf';
      case 'jpg-to-pdf': return '/jpg-to-pdf';
      case 'png-to-pdf': return '/png-to-pdf';
      case 'pdf-to-jpg': return '/pdf-to-jpg';
      case 'pdf-to-png': return '/pdf-to-png';
      case 'merge-pdf': return '/merge-pdf';
      case 'split-pdf': return '/split-pdf';
      case 'rotate-pdf': return '/rotate-pdf';
      case 'converter': return '/image-format-converter';
      case 'jpg-to-webp': return '/jpg-to-webp';
      case 'png-to-webp': return '/png-to-webp';
      case 'jpg-to-avif': return '/jpg-to-avif';
      case 'png-to-avif': return '/png-to-avif';
      case 'webp-to-jpg': return '/webp-to-jpg';
      case 'youtube-to-slides': return '/youtube-to-slides';
      default: return `/${tool}`;
    }
  };

  const initialRoute = getToolFromPath(window.location.pathname);
  const [currentTool, setCurrentTool] = useState<ToolId>(initialRoute.tool);
  const [isNotFound, setIsNotFound] = useState<boolean>(initialRoute.isNotFound);

  useEffect(() => {
    const handlePopState = () => {
      const res = getToolFromPath(window.location.pathname);
      setCurrentTool(res.tool);
      setIsNotFound(res.isNotFound);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update dynamic SEO metadata and canonical tags per tool
  useEffect(() => {
    const PRODUCTION_ORIGIN = 'https://pixelcraft-pro.netlify.app';
    const currentPath = isNotFound ? window.location.pathname : getCleanPathForTool(currentTool);
    const canonicalUrl = `${PRODUCTION_ORIGIN}${currentPath}`;

    let title = 'PixelCraft Pro — Professional Image & PDF Tools Suite';
    let description = 'Professional browser-based image and PDF toolkit featuring background removal, compression, format conversion, and resizing.';

    if (isNotFound) {
      title = 'Page Not Found (404) — PixelCraft Pro';
      description = 'The requested page could not be found. Explore our professional image and PDF tools suite.';
    } else {
      switch (currentTool) {
        case 'privacy-policy':
          title = 'Privacy Policy — PixelCraft Pro';
          description = 'Read the PixelCraft Pro privacy policy regarding browser-based image and document processing.';
          break;
        case 'terms':
          title = 'Terms & Conditions — PixelCraft Pro';
          description = 'Read the terms and conditions for using PixelCraft Pro image and document tools suite.';
          break;
        case 'pdf-compressor':
          title = 'PDF Compressor Online — PixelCraft Pro';
          description = 'Compress PDF files securely using high-performance optimization with Safe, Balanced, and Maximum modes.';
          break;
        case 'compress-20kb':
          title = 'Compress Image to 20KB Online — PixelCraft Pro';
          description = 'Compress images to 20KB or less for strict online form uploads, exam signatures, and avatar requirements.';
          break;
        case 'compress-50kb':
          title = 'Compress Image to 50KB Online — PixelCraft Pro';
          description = 'Compress photographs and documents precisely to 50KB for government portals and job applications.';
          break;
        case 'compress-100kb':
          title = 'Compress Image to 100KB Online — PixelCraft Pro';
          description = 'Optimize images to 100KB with high visual fidelity and quality preservation for web uploads.';
          break;
        case 'compress-200kb':
          title = 'Compress Image to 200KB Online — PixelCraft Pro';
          description = 'Achieve 200KB target size for web banners, social media thumbnails, and document attachments.';
          break;
        case 'compress-500kb':
          title = 'Compress Image to 500KB Online — PixelCraft Pro';
          description = 'High-fidelity compression targeting 500KB for crisp, high-resolution web imagery and portfolios.';
          break;
        case 'compressor':
          title = 'Image Compressor Online — PixelCraft Pro';
          description = 'Reduce image file size of PNG, JPEG, and WebP files without noticeable quality loss.';
          break;
        case 'background-remover':
          title = 'AI Background Remover Online — PixelCraft Pro';
          description = 'Remove image backgrounds quickly and create transparent PNG images directly in your browser with AI.';
          break;
        case 'resizer':
          title = 'Photo Resizer Online — PixelCraft Pro';
          description = 'Resize photos to exact pixel dimensions or percentages with high-quality filtering.';
          break;
        case 'signature-resizer':
          title = 'Signature Resizer Online — PixelCraft Pro';
          description = 'Resize online signatures to exact dimensions for government forms and exam portals.';
          break;
        case 'passport-resizer':
          title = 'Passport Photo Resizer Online — PixelCraft Pro';
          description = 'Crop and resize portrait photos to exact passport and visa photo presets.';
          break;
        case 'image-to-pdf':
          title = 'Image to PDF Converter Online — PixelCraft Pro';
          description = 'Convert multiple JPG, PNG, and WebP images into a single professional PDF document.';
          break;
        case 'jpg-to-pdf':
          title = 'JPG to PDF Converter Online — PixelCraft Pro';
          description = 'Quickly convert single or multiple JPG/JPEG images into clean PDF documents.';
          break;
        case 'png-to-pdf':
          title = 'PNG to PDF Converter Online — PixelCraft Pro';
          description = 'Convert PNG images with transparency handling into professional PDF documents.';
          break;
        case 'pdf-to-jpg':
          title = 'PDF to JPG Converter Online — PixelCraft Pro';
          description = 'Convert PDF document pages into high-resolution JPG images directly in your browser.';
          break;
        case 'pdf-to-png':
          title = 'PDF to PNG Converter Online — PixelCraft Pro';
          description = 'Convert PDF pages into high-quality PNG images with transparency preservation.';
          break;
        case 'merge-pdf':
          title = 'Merge PDF Files Online — PixelCraft Pro';
          description = 'Combine multiple PDF files into one organized PDF document with custom ordering.';
          break;
        case 'split-pdf':
          title = 'Split PDF Document Online — PixelCraft Pro';
          description = 'Extract specific pages or page ranges from a PDF into separate files.';
          break;
        case 'rotate-pdf':
          title = 'Rotate PDF Pages Online — PixelCraft Pro';
          description = 'Rotate specific pages or entire PDF documents by 90°, 180°, or 270° clockwise.';
          break;
        case 'converter':
          title = 'Image Format Converter Online — PixelCraft Pro';
          description = 'Convert images between JPEG, PNG, WebP, and AVIF formats with fast browser-based codecs.';
          break;
        case 'jpg-to-webp':
        case 'png-to-webp':
          title = 'WebP Converter Online — PixelCraft Pro';
          description = 'Convert images into modern high-compression WebP format with quality control.';
          break;
        case 'jpg-to-avif':
        case 'png-to-avif':
          title = 'AVIF Converter Online — PixelCraft Pro';
          description = 'Convert images into next-generation AVIF format with high compression efficiency.';
          break;
        case 'webp-to-jpg':
          title = 'WebP to JPG Converter Online — PixelCraft Pro';
          description = 'Convert WebP images into standard JPG format with custom background color.';
          break;
        case 'youtube-to-slides':
          title = 'YouTube Video to Educational Slides PDF — PixelCraft Pro';
          description = 'Extract slides, formulas, and whiteboard content from lecture videos into a clean PDF.';
          break;
        default:
          break;
      }
    }

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', description);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', canonicalUrl);

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

  }, [currentTool, isNotFound]);

  const handleSelectTool = (tool: ToolId) => {
    incrementToolUsage(tool);
    setCurrentTool(tool);
    setIsNotFound(false);
    const path = getCleanPathForTool(tool);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderTool = () => {
    if (isNotFound) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-28 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-white">Page Not Found (404)</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              The tool or page you are looking for does not exist or may have been moved.
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleSelectTool('home')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      );
    }

    let component = <ToolGrid onSelectTool={handleSelectTool} />;

    switch (currentTool) {
      case 'privacy-policy':
        component = <PrivacyPolicy />;
        break;
      case 'terms':
        component = <Terms />;
        break;
      case 'background-remover':
        component = <BackgroundRemover />;
        break;
      case 'compressor':
        component = <ImageCompressor />;
        break;
      case 'compress-20kb':
        component = <TargetCompressor targetKb={20} title="Compress Image to 20KB" description="Intelligently compress images down to 20KB or less for strict web upload and avatar requirements." />;
        break;
      case 'compress-50kb':
        component = <TargetCompressor targetKb={50} title="Compress Image to 50KB" description="Compress images precisely to 50KB using iterative binary search quality and dimension scaling." />;
        break;
      case 'compress-100kb':
        component = <TargetCompressor targetKb={100} title="Compress Image to 100KB" description="Optimize photographs and graphics to 100KB with maximum visual quality preservation." />;
        break;
      case 'compress-200kb':
        component = <TargetCompressor targetKb={200} title="Compress Image to 200KB" description="Achieve 200KB target size for web banners, thumbnails, and document attachments." />;
        break;
      case 'compress-500kb':
        component = <TargetCompressor targetKb={500} title="Compress Image to 500KB" description="High-fidelity compression targeting 500KB for crisp, high-resolution web imagery." />;
        break;
      case 'resizer':
        component = <PhotoResizer />;
        break;
      case 'signature-resizer':
        component = <SignatureResizer />;
        break;
      case 'passport-resizer':
        component = <PassportResizer />;
        break;
      case 'image-to-pdf':
        component = <ImageToPdf />;
        break;
      case 'jpg-to-pdf':
        component = <JpgToPdf />;
        break;
      case 'png-to-pdf':
        component = <PngToPdf />;
        break;
      case 'pdf-to-jpg':
        component = <PdfToImage format="jpeg" />;
        break;
      case 'pdf-to-png':
        component = <PdfToImage format="png" />;
        break;
      case 'merge-pdf':
        component = <MergePdf />;
        break;
      case 'split-pdf':
        component = <SplitPdf />;
        break;
      case 'rotate-pdf':
        component = <RotatePdf />;
        break;
      case 'converter':
        component = <FormatConverter />;
        break;
      case 'jpg-to-webp':
        component = <FormatConverter initialTarget="image/webp" />;
        break;
      case 'png-to-webp':
        component = <FormatConverter initialTarget="image/webp" />;
        break;
      case 'jpg-to-avif':
        component = <FormatConverter initialTarget="image/avif" />;
        break;
      case 'png-to-avif':
        component = <FormatConverter initialTarget="image/avif" />;
        break;
      case 'webp-to-jpg':
        component = <FormatConverter initialTarget="image/jpeg" />;
        break;
      case 'youtube-to-slides':
        component = <YoutubeToSlides />;
        break;
      case 'pdf-compressor':
        component = <PdfCompressor />;
        break;
      case 'home':
      default:
        component = <ToolGrid onSelectTool={handleSelectTool} />;
        break;
    }

    return (
      <Suspense fallback={<ToolLoadingFallback />}>
        {component}
      </Suspense>
    );
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Header currentTool={currentTool} onSelectTool={handleSelectTool} />
      <main className="flex-1 flex flex-col">
        {renderTool()}
      </main>
      <Footer onSelectTool={handleSelectTool} />
    </div>
  );
}
