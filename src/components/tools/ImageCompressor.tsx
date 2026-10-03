import React, { useState, useRef } from 'react';
import { Upload, Minimize2, Download, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon, Sliders, Loader2, Clock } from 'lucide-react';
import { compressImageWithJSquash } from '../../utils/jsquashCompressor';

export const ImageCompressor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<'quality' | 'target'>('target');
  const [quality, setQuality] = useState<number>(80);
  const [targetKb, setTargetKb] = useState<number>(100);
  const [customKb, setCustomKb] = useState<string>('100');

  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [finalDimensions, setFinalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [formatUsed, setFormatUsed] = useState<string>('image/jpeg');
  const [targetReached, setTargetReached] = useState<boolean>(false);
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
    setCompressedUrl(null);
    setCompressedBlob(null);
    setCompressedSize(0);
    setCompletedSeconds(null);

    const objectUrl = URL.createObjectURL(selected);
    setPreview(objectUrl);

    const img = new window.Image();
    img.onload = () => {
      setOriginalDimensions({ width: img.width, height: img.height });
    };
    img.src = objectUrl;
  };

  const handleCompress = async () => {
    if (!file || !originalDimensions || !preview) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setCompletedSeconds(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setProcessingStage('Reading and decoding image...');

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      const img = new window.Image();
      img.src = preview;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      setProcessingStage('Preparing image optimization...');
      await new Promise(r => setTimeout(r, 120));

      setProcessingStage('Executing compression and quality optimization...');
      const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
      const mimeType = hasAlpha ? file.type : 'image/jpeg';

      const targetBytes = mode === 'target' ? (Number(customKb) || targetKb) * 1024 : null;
      const res = await compressImageWithJSquash(
        img,
        originalDimensions.width,
        originalDimensions.height,
        mimeType,
        targetBytes,
        quality
      );

      setProcessingStage('Finalizing compressed image...');
      await new Promise(r => setTimeout(r, 80));

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));

      setCompressedBlob(res.blob);
      setCompressedSize(res.size);
      setCompressedUrl(URL.createObjectURL(res.blob));
      setFinalDimensions({ width: res.width, height: res.height });
      setFormatUsed(res.format);
      setTargetReached(res.targetReached);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Compression failed.');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedBlob) return;
    let extension = formatUsed.split('/')[1] || 'jpg';
    if (extension === 'jpeg') extension = 'jpg';
    const downloadName = `compressed_${Date.now()}.${extension}`;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reductionPercent = file && compressedSize ? Math.max(0, Math.round((1 - compressedSize / file.size) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Advanced Image Optimizer</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Image Compressor</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Compress images securely in your browser with high-fidelity quality retention.
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

      {/* Unified Progress UI Panel */}
      {isProcessing && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Compressing Image...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-emerald-300 animate-pulse">{processingStage}</span>
              <span className="font-mono text-emerald-400">Optimization Pipeline</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Success Banner */}
      {completedSeconds !== null && !isProcessing && !errorMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>✓ Compression complete in {completedSeconds} seconds</span>
          </div>
          <span className="font-mono text-slate-400">Reduction: {reductionPercent}% Smaller</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Image Source</h3>
            {file && !isProcessing && (
              <button
                onClick={() => { setFile(null); setPreview(null); setCompressedUrl(null); setCompressedBlob(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white truncate">{file ? file.name : 'Select Image File'}</p>
            <p className="text-xs text-slate-400">{file ? formatSize(file.size) : 'PNG, JPEG, WebP supported'}</p>
          </div>

          {file && (
            <div className="space-y-4">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setMode('target')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'target' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Target Size
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setMode('quality')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${mode === 'quality' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Quality Slider
                </button>
              </div>

              {mode === 'target' ? (
                <div className="space-y-3">
                  <label className="text-xs text-slate-400 font-medium">Target Size Preset</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[20, 50, 100, 200, 500].map((kb) => (
                      <button
                        key={kb}
                        disabled={isProcessing}
                        onClick={() => { setTargetKb(kb); setCustomKb(kb.toString()); }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${targetKb === kb ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                      >
                        {kb} KB
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs text-slate-400 font-medium">Custom Target (KB)</label>
                    <input
                      type="number"
                      disabled={isProcessing}
                      value={customKb}
                      onChange={(e) => setCustomKb(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Quality</span>
                    <span className="text-emerald-400 font-mono font-bold">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    disabled={isProcessing}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              <button
                onClick={handleCompress}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
                <span>Compress Image</span>
              </button>
            </div>
          )}
        </div>

        {/* RESULTS CARD WITH DOWNLOAD BUTTON PROMINENTLY AT THE TOP */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          {!preview ? (
            <div className="text-center py-32 space-y-3">
              <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">Select an image to compress securely in your browser.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* DOWNLOAD BUTTON PROMINENTLY AT THE TOP WHEN READY */}
              {compressedUrl && (
                <div>
                  <button
                    onClick={handleDownload}
                    className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer animate-bounce"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download Compressed Image ({compressedSize ? formatSize(compressedSize) : ''})</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original Photo</p>
                  <div className="h-48 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={preview} alt="Original" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="text-xs text-slate-300 font-mono space-y-1">
                    <p>📁 Size: {formatSize(file?.size || 0)}</p>
                    <p>📐 Resolution: {originalDimensions?.width} × {originalDimensions?.height} px</p>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Compressed Result</span>
                    {compressedSize > 0 && <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-300">-{reductionPercent}%</span>}
                  </p>
                  <div className="h-48 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                    {compressedUrl ? (
                      <img src={compressedUrl} alt="Compressed" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <p className="text-slate-500 text-xs">Click Compress to generate</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-mono space-y-1">
                    <p>📊 Size: {compressedSize ? formatSize(compressedSize) : '—'}</p>
                    <p>⚡ Status: <span className="text-emerald-400">Optimized & Saved</span></p>
                    <p>🖼️ Format: {formatUsed}</p>
                    {!targetReached && compressedSize > 0 && (
                      <p className="text-amber-400 text-[10px]">⚠️ Target size could not be fully reached; showing closest achievable.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
