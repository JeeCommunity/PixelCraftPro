import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Sparkles, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  Loader2,
  Sliders,
  Layers,
  Palette,
  Eye,
  Check,
  Clock
} from 'lucide-react';
import { SAMPLE_IMAGES, SampleImage } from '../../utils/sampleImages';
import { engineRegistry } from '../../lib/ml/registry';
import { EngineType } from '../../lib/ml/types';

export const BackgroundRemover: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Default to imgly for high precision ISNet background removal
  const [selectedEngine, setSelectedEngine] = useState<EngineType>('imgly');
  const [bgType, setBgType] = useState<'transparent' | 'color' | 'blur' | 'gradient'>('transparent');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [blurAmount, setBlurAmount] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'editor' | 'batch' | 'adjust'>('editor');

  // Unified progress UI state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setResultUrl(null);
    setCompletedSeconds(null);
    const objectUrl = URL.createObjectURL(file);
    setOriginalPreview(objectUrl);
  };

  const handleBatchSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        setBatchFiles(files);
        handleFileSelect(files[0]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 1) {
        setBatchFiles(files);
        handleFileSelect(files[0]);
      } else if (files.length === 1) {
        handleFileSelect(files[0]);
      }
    }
  };

  const handleSampleSelect = async (sample: SampleImage) => {
    try {
      setIsProcessing(true);
      setCompletedSeconds(null);
      setProgressText('Loading sample image...');
      setProgressPercent(20);

      startTimeRef.current = performance.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
        setElapsedSeconds(Number(currentElapsed.toFixed(2)));
      }, 100);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sample.url;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Could not convert sample image to blob');
        }
        const file = new File([blob], `${sample.name.toLowerCase().replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
        if (timerRef.current) clearInterval(timerRef.current);
        setIsProcessing(false);
        setProgressText('');
        setProgressPercent(0);
        const totalTime = (performance.now() - startTimeRef.current) / 1000;
        setCompletedSeconds(Number(totalTime.toFixed(2)));
      }, 'image/jpeg', 0.95);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error(err);
      setErrorMsg('Failed to load sample image due to network or CORS restrictions. Please upload an image directly.');
      setIsProcessing(false);
      setProgressText('');
      setProgressPercent(0);
    }
  };

  const optimizeImage = (file: File, maxDim = 1000): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/png' }));
          } else {
            resolve(file);
          }
        }, 'image/png', 0.95);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const compositeBackground = async (transparentBlob: Blob): Promise<string> => {
    if (bgType === 'transparent') {
      return URL.createObjectURL(transparentBlob);
    }

    return new Promise((resolve) => {
      const cutoutImg = new Image();
      cutoutImg.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = cutoutImg.width;
        canvas.height = cutoutImg.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(URL.createObjectURL(transparentBlob));
          return;
        }

        if (bgType === 'color') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgType === 'blur' && originalPreview) {
          const origImg = new Image();
          origImg.onload = () => {
            ctx.filter = `blur(${blurAmount}px)`;
            ctx.drawImage(origImg, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
            ctx.drawImage(cutoutImg, 0, 0);
            canvas.toBlob((blob) => {
              resolve(blob ? URL.createObjectURL(blob) : URL.createObjectURL(transparentBlob));
            }, 'image/png');
          };
          origImg.src = originalPreview;
          return;
        } else if (bgType === 'gradient') {
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          grad.addColorStop(0, '#6366f1');
          grad.addColorStop(1, '#a855f7');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(cutoutImg, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob ? URL.createObjectURL(blob) : URL.createObjectURL(transparentBlob));
        }, 'image/png');
      };
      cutoutImg.src = URL.createObjectURL(transparentBlob);
    });
  };

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setCompletedSeconds(null);
    setProgressPercent(10);
    setProgressText('Preparing image & loading AI model...');

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      const optimizedFile = await optimizeImage(selectedFile, 1000);

      setProgressPercent(25);
      setProgressText('Initializing WebAssembly AI model...');

      const res = await engineRegistry.processWithFallback(optimizedFile, selectedEngine, {
        progress: (key: string, current: number, total: number) => {
          const percentage = total > 0 ? Math.round((current / total) * 65) + 25 : 50;
          setProgressPercent(Math.min(percentage, 90));
          setProgressText(`Running AI model (${key})...`);
        }
      });

      setProgressPercent(95);
      setProgressText('Applying background settings...');
      const finalUrl = await compositeBackground(res.blob);
      setResultUrl(finalUrl);
      setProgressPercent(100);
      setProgressText('Complete!');

      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      console.error('Background removal error:', err);
      setErrorMsg(err?.message || 'Background removal failed. Please check your internet connection for initial AI model download.');
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `cutout-${selectedFile?.name.replace(/\.[^/.]+$/, '') || 'image'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Free & Unlimited • AI Background Studio</span>
          </div>
          {selectedFile && !isProcessing && (
            <button
              onClick={() => { setSelectedFile(null); setOriginalPreview(null); setResultUrl(null); setBatchFiles([]); setCompletedSeconds(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 font-medium cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start Over / New Image</span>
            </button>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Advanced Background Remover Studio</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          High-precision browser AI model with real-time progress indicators and live timers.
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
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Removing background with AI...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-indigo-300 animate-pulse">{progressText}</span>
              <span className="font-mono text-indigo-400 font-bold">{progressPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Success Compact Banner */}
      {completedSeconds !== null && !isProcessing && !errorMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>✓ Completed — Completed in {completedSeconds} seconds</span>
          </div>
          <span className="font-mono text-slate-400">Ready for download</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Controls & Tabs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            {/* Tab Navigation */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                disabled={isProcessing}
                onClick={() => setActiveTab('editor')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Studio</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={() => setActiveTab('adjust')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'adjust' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Background</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={() => setActiveTab('batch')}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'batch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Batch ({batchFiles.length})</span>
              </button>
            </div>

            {activeTab === 'editor' && (
              <div className="space-y-6">
                {/* Engine Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">Processing Quality Mode</label>
                  <div className="grid grid-cols-1 gap-2">
                    {engineRegistry.getAll().map((engine) => (
                      <button
                        key={engine.id}
                        disabled={isProcessing}
                        onClick={() => setSelectedEngine(engine.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedEngine === engine.id
                            ? 'border-indigo-500 bg-indigo-500/10 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{engine.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{engine.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Area */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-950/50 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Click to upload image</p>
                  <p className="text-xs text-slate-400">PNG, JPEG, WebP</p>
                </div>

                {/* Sample Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 block">Sample Photos:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SAMPLE_IMAGES.map((sample) => (
                      <button
                        key={sample.name}
                        onClick={() => handleSampleSelect(sample)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors text-left cursor-pointer disabled:opacity-50"
                      >
                        <img src={sample.url} alt={sample.name} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="truncate font-medium">{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'adjust' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">Background Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isProcessing}
                      onClick={() => setBgType('transparent')}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        bgType === 'transparent' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => setBgType('color')}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        bgType === 'color' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Solid Color
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => setBgType('blur')}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        bgType === 'blur' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Blur BG
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => setBgType('gradient')}
                      className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        bgType === 'gradient' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Gradient
                    </button>
                  </div>
                </div>

                {bgType === 'color' && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Choose Color:</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        disabled={isProcessing}
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                      />
                      <span className="text-xs text-slate-300 font-mono">{bgColor}</span>
                    </div>
                  </div>
                )}

                {bgType === 'blur' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Blur Amount</span>
                      <span>{blurAmount}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      disabled={isProcessing}
                      value={blurAmount}
                      onChange={(e) => setBlurAmount(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'batch' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">Batch Queue</label>
                  <p className="text-xs text-slate-400">Select multiple images to queue for processing.</p>
                </div>
                <label className={`block w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs text-slate-300 transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <span>Upload Multiple Images</span>
                  <input type="file" accept="image/*" multiple disabled={isProcessing} className="hidden" onChange={handleBatchSelect} />
                </label>
                {batchFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {batchFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <span className="truncate max-w-[180px] text-slate-300">{file.name}</span>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleFileSelect(file)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <hr className="border-slate-800" />

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRemoveBackground}
                disabled={!selectedFile || isProcessing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing AI Model...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Remove Background</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                disabled={!resultUrl || isProcessing}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Result</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Previews & Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl min-h-[500px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Workspace Preview</h3>
                <p className="text-xs text-slate-400">
                  {selectedFile ? selectedFile.name : 'No image loaded'}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center my-4">
              {!originalPreview ? (
                <div className="text-center py-20 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Upload an image or choose a sample photo to start</p>
                </div>
              ) : resultUrl ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full progress-view">
                  <div className="space-y-2 text-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original</span>
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 h-72 flex items-center justify-center overflow-hidden">
                      <img src={originalPreview} alt="Original" className="max-h-full max-w-full object-contain rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Result ({bgType})
                    </span>
                    <div 
                      className="bg-slate-950 rounded-xl p-3 border border-emerald-500/30 h-72 flex items-center justify-center overflow-hidden relative"
                      style={bgType === 'transparent' ? { backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '16px 16px' } : {}}
                    >
                      <img src={resultUrl} alt="Cutout" className="max-h-full max-w-full object-contain rounded-lg relative z-10" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full text-center space-y-3">
                  <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 max-h-[400px] flex items-center justify-center overflow-hidden mx-auto">
                    <img src={originalPreview} alt="Preview" className="max-h-[350px] max-w-full object-contain rounded-xl" />
                  </div>
                  <p className="text-xs text-slate-400">Click "Remove Background" to process this image.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Engine Registry: <strong className="text-indigo-300">IMGLY / ONNX WebAssembly</strong></span>
              <span className="text-indigo-400 font-medium">100% Free & Unlimited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
