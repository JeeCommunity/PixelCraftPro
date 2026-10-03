import React, { useState, useRef } from 'react';
import { 
  PlaySquare, 
  Sparkles, 
  Download, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckSquare, 
  Square, 
  Eye, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Youtube, 
  Upload, 
  Video,
  X,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SlideItem {
  id: string;
  timestamp: string;
  title: string;
  imageUrl: string;
  ocrText: string;
  confidence: number;
  selected: boolean;
}

export const YoutubeToSlides: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [url, setUrl] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUploadFallback, setShowUploadFallback] = useState<boolean>(false);

  const [videoMeta, setVideoMeta] = useState<{ videoTitle: string; channelName: string; duration: string; videoId?: string } | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [previewSlide, setPreviewSlide] = useState<SlideItem | null>(null);

  // Configurable detection settings
  const [sampleInterval, setSampleInterval] = useState<number>(3);

  // PDF Options
  const [pageSize, setPageSize] = useState<'a4' | 'original'>('a4');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [quality, setQuality] = useState<'standard' | 'high'>('high');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingSteps = [
    'Initializing backend video pipeline...',
    'Fetching video stream / reading media file...',
    'Extracting video frames via FFmpeg...',
    'Detecting whiteboard & slide transitions...',
    'Removing duplicate & blank frames...',
    'Finalizing slide deck...'
  ];

  const handleGenerateFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Please paste a valid YouTube lecture video URL.');
      return;
    }

    setErrorMsg(null);
    setShowUploadFallback(false);
    setIsProcessing(true);
    setProgressStep(0);
    setProgressText(processingSteps[0]);

    try {
      for (let i = 0; i < 3; i++) {
        setProgressStep(i);
        setProgressText(processingSteps[i]);
        await new Promise((r) => setTimeout(r, 500));
      }

      const res = await fetch('/api/youtube-to-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), sampleInterval })
      });

      setProgressStep(4);
      setProgressText(processingSteps[4]);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract slides from YouTube video.');
      }

      setVideoMeta({
        videoTitle: data.videoTitle,
        channelName: data.channelName,
        duration: data.duration,
        videoId: data.videoId
      });

      const formattedSlides: SlideItem[] = (data.slides || []).map((s: any) => ({
        ...s,
        selected: true
      }));

      setSlides(formattedSlides);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'YouTube processing failed due to bot restrictions or video availability.');
      if (err.message && (err.message.includes('Bot Protection') || err.message.includes('Sign in') || err.message.includes('Stream Error'))) {
        setShowUploadFallback(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setErrorMsg('Please select a video file to upload.');
      return;
    }
    if (uploadedFile.size > 32 * 1024 * 1024) {
      setErrorMsg('Video file exceeds the 32MB platform upload limit. Please upload a video smaller than 32MB.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setProgressStep(0);
    setProgressText('Uploading video file to server...');

    try {
      const formData = new FormData();
      formData.append('video', uploadedFile);
      formData.append('sampleInterval', String(sampleInterval));

      for (let i = 1; i < processingSteps.length; i++) {
        setProgressStep(i);
        setProgressText(processingSteps[i]);
        await new Promise((r) => setTimeout(r, 600));
      }

      const res = await fetch('/api/youtube-slides/upload', {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await res.text();
        console.error('Non-JSON response received from upload endpoint:', textResponse);
        throw new Error(`Server returned non-JSON response (Status ${res.status}). Please check backend status.`);
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process uploaded video file.');
      }

      setVideoMeta({
        videoTitle: data.videoTitle,
        channelName: data.channelName,
        duration: data.duration
      });

      const formattedSlides: SlideItem[] = (data.slides || []).map((s: any) => ({
        ...s,
        selected: true
      }));

      setSlides(formattedSlides);
    } catch (err: any) {
      console.error('Upload generation error:', err);
      setErrorMsg(err.message || 'Uploaded video processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSlides(slides.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const handleDeleteSlide = (id: string) => {
    setSlides(slides.filter(s => s.id !== id));
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const updated = [...slides];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSlides(updated);
  };

  const handleSelectAll = (select: boolean) => {
    setSlides(slides.map(s => ({ ...s, selected: select })));
  };

  const handleDownloadPdf = async () => {
    const selectedSlides = slides.filter(s => s.selected);
    if (selectedSlides.length === 0) {
      setErrorMsg('Please select at least one slide to generate the PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    setErrorMsg(null);

    try {
      const doc = new jsPDF({
        orientation: orientation === 'portrait' ? 'portrait' : orientation === 'landscape' ? 'landscape' : 'l',
        unit: 'mm',
        format: pageSize === 'a4' ? 'a4' : [297, 210]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < selectedSlides.length; i++) {
        if (i > 0) doc.addPage();
        const slide = selectedSlides[i];

        // Header
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${videoMeta?.videoTitle || 'Lecture Video'} — Slide ${i + 1} (${slide.timestamp})`, 15, 10);

        try {
          const imgData = await loadImageAsBase64(slide.imageUrl);
          const imgWidth = pageWidth - 30;
          const imgHeight = pageHeight - 35;
          doc.addImage(imgData, 'JPEG', 15, 15, imgWidth, imgHeight, undefined, quality === 'high' ? 'FAST' : 'MEDIUM');
        } catch (imgErr) {
          console.warn('Could not load slide image for PDF', imgErr);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by PixelCraft Pro • Page ${i + 1} of ${selectedSlides.length}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }

      const safeTitle = (videoMeta?.videoTitle || 'lecture_slides').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      doc.save(`${safeTitle}_slides.pdf`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setErrorMsg('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = url;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
          <PlaySquare className="w-3.5 h-3.5" />
          <span>Server-Side FFmpeg & yt-dlp Slide Extractor</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">YouTube Video & Video File → Educational Slides PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Extract real educational slides, whiteboard content, and lecture frames from YouTube URLs or uploaded video files into a clean PDF.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-300 text-sm shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {showUploadFallback && (
            <button
              onClick={() => { setActiveTab('upload'); setShowUploadFallback(false); }}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Video Instead</span>
            </button>
          )}
        </div>
      )}

      {/* Input Selection Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-md">
          <button
            onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'url' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4" />
            <span>YouTube URL</span>
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setErrorMsg(null); }}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video File</span>
          </button>
        </div>

        {activeTab === 'url' ? (
          <form onSubmit={handleGenerateFromUrl} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">YouTube Lecture URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
                  <input
                    type="text"
                    placeholder="Paste YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all shadow-inner"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !url.trim()}
                  className="px-6 py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Real Frames...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Slides</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="text-xs text-slate-400 font-medium">Sampling Interval:</label>
              <select
                value={sampleInterval}
                onChange={(e) => setSampleInterval(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-pink-500"
              >
                <option value={2}>1 frame every 2 seconds (High detail)</option>
                <option value={3}>1 frame every 3 seconds (Recommended)</option>
                <option value={5}>1 frame every 5 seconds (Fast)</option>
              </select>
            </div>
          </form>
        ) : (
          <form onSubmit={handleGenerateFromFile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">Upload Video File (MP4, WebM, MOV)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-pink-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-950 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-white mb-1">
                  {uploadedFile ? uploadedFile.name : 'Click to select or drag & drop video file'}
                </p>
                <p className="text-xs text-slate-400">Supports MP4, WebM, MOV (Max file size: 32MB - Cloud Run platform limit)</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-xs text-slate-400 font-medium">Sampling Interval:</label>
                <select
                  value={sampleInterval}
                  onChange={(e) => setSampleInterval(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-pink-500"
                >
                  <option value={2}>1 frame every 2 seconds (High detail)</option>
                  <option value={3}>1 frame every 3 seconds (Recommended)</option>
                  <option value={5}>1 frame every 5 seconds (Fast)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !uploadedFile}
                className="px-6 py-3.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Slides From File</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Processing Progress UI */}
        {isProcessing && (
          <div className="bg-slate-950 border border-pink-500/30 rounded-2xl p-6 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-sm font-medium text-pink-200">
              <span className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
                <div>
                  <p className="font-bold text-white">Server-Side FFmpeg Processing</p>
                  <p className="text-xs text-pink-300">{progressText}</p>
                </div>
              </span>
              <span className="text-sm font-bold text-pink-400">Step {progressStep + 1} of {processingSteps.length}</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${((progressStep + 1) / processingSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results & Slide Management Section */}
      {videoMeta && slides.length > 0 && (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Extracted {slides.length} Real Video Frames</span>
              </div>
              <h2 className="text-xl font-bold text-white">{videoMeta.videoTitle}</h2>
              <p className="text-xs text-slate-400">Source: <span className="text-slate-200 font-medium">{videoMeta.channelName}</span> • Type: {videoMeta.duration}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => handleSelectAll(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* PDF Configuration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span>PDF Export Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-medium">Page Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPageSize('a4')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      pageSize === 'a4' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    A4 Size
                  </button>
                  <button
                    onClick={() => setPageSize('original')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      pageSize === 'original' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Original Ratio
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-medium">Orientation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOrientation('auto')}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      orientation === 'auto' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      orientation === 'portrait' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      orientation === 'landscape' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-medium">Quality & Compression</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuality('standard')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      quality === 'standard' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setQuality('high')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      quality === 'high' ? 'border-pink-500 bg-pink-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    High (HD)
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Selected for PDF: <strong className="text-white">{slides.filter(s => s.selected).length} of {slides.length} slides</strong>
              </span>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || slides.filter(s => s.selected).length === 0}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF ({slides.filter(s => s.selected).length} Slides)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slides Grid Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map((slide, index) => (
              <div 
                key={slide.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-xl flex flex-col justify-between ${
                  slide.selected ? 'border-slate-800 hover:border-pink-500/50' : 'border-rose-900/40 opacity-60'
                }`}
              >
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSelect(slide.id)}
                      className="text-pink-400 hover:text-pink-300 cursor-pointer"
                    >
                      {slide.selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                    </button>
                    <span className="font-bold text-white">Slide #{index + 1}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono">{slide.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-1 hover:bg-rose-950/50 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Remove Slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div 
                  onClick={() => setPreviewSlide(slide)}
                  className="relative group bg-slate-950 h-48 flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  <img src={slide.imageUrl} alt={slide.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                    <span className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 rounded-xl flex items-center gap-1.5 shadow-lg">
                      <Eye className="w-4 h-4" />
                      <span>Preview Frame</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="text-xs font-bold text-white truncate">{slide.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                    {slide.ocrText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-pink-400" />
                <span>Frame Preview ({previewSlide.timestamp})</span>
              </h3>
              <button
                onClick={() => setPreviewSlide(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img src={previewSlide.imageUrl} alt={previewSlide.title} className="max-h-[55vh] max-w-full object-contain rounded-lg" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Frame Details</label>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                {previewSlide.ocrText}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewSlide(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
