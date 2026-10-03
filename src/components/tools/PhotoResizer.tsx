import React, { useState, useRef } from 'react';
import { Upload, Maximize, Download, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon, Sliders, Lock, Unlock, Loader2, Clock } from 'lucide-react';
import pica from 'pica';
import { jsPDF } from 'jspdf';

const picaInstance = pica();

export const PhotoResizer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);

  const [resizedUrl, setResizedUrl] = useState<string | null>(null);
  const [resizedBlob, setResizedBlob] = useState<Blob | null>(null);
  const [resizedSize, setResizedSize] = useState<number>(0);
  const [finalDimensions, setFinalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [formatUsed, setFormatUsed] = useState<string>('image/jpeg');
  const [downloadFormat, setDownloadFormat] = useState<'original' | 'jpeg' | 'png' | 'webp' | 'pdf'>('original');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unified progress UI state
  const [processingStage, setProcessingStage] = useState<string>('Initializing...');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }
    setErrorMsg(null);
    setFile(selected);
    setResizedUrl(null);
    setResizedBlob(null);
    setResizedSize(0);
    setCompletedSeconds(null);

    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);

    const img = new window.Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = objectUrl;
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && originalDimensions && originalDimensions.width > 0) {
      const ratio = originalDimensions.height / originalDimensions.width;
      setHeight(Math.max(1, Math.round(val * ratio)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && originalDimensions && originalDimensions.height > 0) {
      const ratio = originalDimensions.width / originalDimensions.height;
      setWidth(Math.max(1, Math.round(val * ratio)));
    }
  };

  const handleResize = async () => {
    if (!file || !originalDimensions || width <= 0 || height <= 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setCompletedSeconds(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setProcessingStage('Reading image...');

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      const img = new window.Image();
      img.src = preview!;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      setProcessingStage('Preparing resize canvas...');
      await new Promise(r => setTimeout(r, 100));

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = originalDimensions.width;
      srcCanvas.height = originalDimensions.height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) throw new Error('Canvas context failed');
      srcCtx.drawImage(img, 0, 0);

      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = width;
      targetCanvas.height = height;

      setProcessingStage('Resizing image...');
      await picaInstance.resize(srcCanvas, targetCanvas, {
        quality: 3,
        unsharpAmount: 80,
        unsharpRadius: 0.6,
        unsharpThreshold: 0
      });

      setProcessingStage('Encoding and finalizing...');
      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
      const mimeType = hasAlpha ? 'image/webp' : 'image/jpeg';
      setFormatUsed(mimeType);

      targetCanvas.toBlob((blob) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsProcessing(false);

        const totalTime = (performance.now() - startTimeRef.current) / 1000;
        setCompletedSeconds(Number(totalTime.toFixed(2)));

        if (blob) {
          setResizedBlob(blob);
          setResizedSize(blob.size);
          setResizedUrl(URL.createObjectURL(blob));
          setFinalDimensions({ width, height });
        } else {
          setErrorMsg('Resize failed.');
        }
      }, mimeType, 0.92);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Resize failed.');
    }
  };

  const handleDownload = async () => {
    if (!resizedBlob && !preview) return;
    const baseName = (file?.name || 'resized_photo').replace(/\.[^/.]+$/, '');

    if (downloadFormat === 'pdf') {
      const doc = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(14);
      doc.text(`Resized Photo: ${baseName}`, 15, 15);

      const imgData = resizedUrl || preview!;
      const img = new Image();
      img.src = imgData;
      await new Promise((r) => { img.onload = r; });

      const imgWidth = pageWidth - 30;
      const imgHeight = (img.height * imgWidth) / img.width;
      doc.addImage(imgData, 'JPEG', 15, 25, imgWidth, Math.min(pageHeight - 40, imgHeight));
      doc.save(`${baseName}_resized.pdf`);
      return;
    }

    let targetMime = formatUsed;
    let ext = formatUsed.split('/')[1] || 'jpg';
    if (downloadFormat === 'jpeg') {
      targetMime = 'image/jpeg';
      ext = 'jpg';
    } else if (downloadFormat === 'png') {
      targetMime = 'image/png';
      ext = 'png';
    } else if (downloadFormat === 'webp') {
      targetMime = 'image/webp';
      ext = 'webp';
    }

    const img = new Image();
    img.src = resizedUrl || preview!;
    await new Promise((r) => { img.onload = r; });

    const canvas = document.createElement('canvas');
    canvas.width = finalDimensions?.width || width;
    canvas.height = finalDimensions?.height || height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (targetMime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_${canvas.width}x${canvas.height}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, targetMime, 0.95);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
          <Maximize className="w-3.5 h-3.5" />
          <span>Advanced Photo Resizer</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Photo Resizer</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Resize photos to exact pixel dimensions with high-quality filtering and side-by-side comparison.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <span className="text-xs font-mono">Processing time: {elapsedSeconds.toFixed(2)}s</span>
        </div>
      )}

      {/* Unified Processing Progress UI Panel */}
      {isProcessing && (
        <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Resizing your image...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-2.5 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-blue-300 animate-pulse">{processingStage}</span>
              <span className="font-mono text-blue-400">Pica Lanczos3 Resampling</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Success Compact Banner */}
      {completedSeconds !== null && !isProcessing && !errorMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>✓ Resize complete — Completed in {completedSeconds} seconds</span>
          </div>
          <span className="font-mono text-slate-400">Target: {width}×{height}px</span>
        </div>
      )}

      {/* Preset Dimensions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">Quick Dimension Presets</label>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: 'HD (1280×720)', w: 1280, h: 720 },
            { label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
            { label: 'Square (1080×1080)', w: 1080, h: 1080 },
            { label: 'Story (1080×1920)', w: 1080, h: 1920 },
            { label: 'Banner (1200×630)', w: 1200, h: 630 }
          ].map((preset) => {
            const isActive = width === preset.w && height === preset.h;
            return (
              <button
                key={preset.label}
                disabled={isProcessing}
                onClick={() => { setWidth(preset.w); setHeight(preset.h); }}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white border border-blue-400 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/30' 
                    : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Settings Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Upload & Dimensions</h3>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{file ? file.name : 'Choose Photo'}</p>
            <p className="text-xs text-slate-400">PNG, JPG, WebP</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Width (px)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  disabled={isProcessing}
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white font-bold rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Height (px)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  disabled={isProcessing}
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white font-bold rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Lock Aspect Ratio</span>
              <button
                disabled={isProcessing}
                onClick={() => setMaintainAspect(!maintainAspect)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  maintainAspect ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {maintainAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block font-medium">Download Format Option</label>
            <select
              disabled={isProcessing}
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500"
            >
              <option value="original">Original Format ({formatUsed.split('/')[1]?.toUpperCase()})</option>
              <option value="jpeg">JPEG (.jpg)</option>
              <option value="png">PNG (.png)</option>
              <option value="webp">WebP (.webp)</option>
              <option value="pdf">PDF Document (.pdf)</option>
            </select>
          </div>

          <button
            onClick={handleResize}
            disabled={!file || isProcessing}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Maximize className="w-4 h-4" />}
            <span>Resize Photo</span>
          </button>

          {resizedUrl && !isProcessing && (
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download ({downloadFormat.toUpperCase()})</span>
            </button>
          )}
        </div>

        {/* Right Side-by-Side Preview (Agal-Bagal) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl min-h-[480px]">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Side-by-Side Comparison</h3>
          </div>

          <div className="flex-1 flex items-center justify-center my-4">
            {!preview ? (
              <div className="text-center py-20 space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">Upload a photo to resize and compare side-by-side</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-center flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Original Photo</span>
                    <p className="text-[11px] font-mono text-slate-400">
                      {file ? formatSize(file.size) : '0'} {originalDimensions && `• ${originalDimensions.width}×${originalDimensions.height}px`}
                    </p>
                  </div>
                  <div className="h-64 flex items-center justify-center overflow-hidden p-2 bg-slate-900/50 rounded-lg">
                    <img src={preview} alt="Original" className="max-h-full max-w-full object-contain rounded opacity-90" />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/40 space-y-3 text-center flex flex-col justify-between shadow-lg shadow-blue-500/5">
                  <div>
                    <span className="text-xs font-semibold text-blue-400 flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resized Result (Pica)
                    </span>
                    <p className="text-[11px] font-mono text-blue-300">
                      {resizedSize ? formatSize(resizedSize) : 'Pending'} {finalDimensions && `• ${finalDimensions.width}×${finalDimensions.height}px`}
                    </p>
                  </div>
                  <div className="h-64 flex items-center justify-center overflow-hidden p-2 bg-slate-900/50 rounded-lg">
                    {resizedUrl ? (
                      <img src={resizedUrl} alt="Resized" className="max-h-full max-w-full object-contain rounded" />
                    ) : (
                      <p className="text-xs text-slate-500">Click resize photo to view result</p>
                    )}
                  </div>
                  {resizedSize > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-xs font-bold text-blue-400">Successfully Resized with Pica</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Format: {formatUsed.split('/')[1].toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
