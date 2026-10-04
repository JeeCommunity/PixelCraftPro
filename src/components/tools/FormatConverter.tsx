import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Download, CheckCircle2, AlertCircle, Image as ImageIcon, Trash2, Clock, Loader2, RotateCcw, Sliders, ShieldAlert } from 'lucide-react';

interface DiagnosticReport {
  inputFilename: string;
  detectedFormat: string;
  targetFormat: string;
  codecUsed: string;
  codecVersions: string;
  stage: string;
  errorMessage: string;
  errorName: string;
}

interface ConversionItem {
  id: string;
  file: File;
  stableBuffer: ArrayBuffer;
  name: string;
  originalSize: number;
  originalFormat: string;
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';
  status: 'pending' | 'processing' | 'success' | 'error';
  progressText: string;
  outputBlob?: Blob;
  outputSize?: number;
  outputUrl?: string;
  previewUrl: string;
  error?: string;
  diagnostic?: DiagnosticReport;
  hasAlpha?: boolean;
}

export const FormatConverter: React.FC<{ initialTarget?: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' }> = ({ initialTarget = 'image/webp' }) => {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [defaultTargetFormat, setDefaultTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'>(initialTarget);
  const [quality, setQuality] = useState<number>(80);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticReport | null>(null);

  // Unified Progress UI State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [processingStage, setProcessingStage] = useState<string>('Initializing...');
  
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      });
    };
  }, []);

  const detectActualFormat = async (buffer: ArrayBuffer, file: File): Promise<string> => {
    try {
      const bytes = new Uint8Array(buffer.slice(0, 16));

      // JPEG magic bytes: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image/jpeg';
      }

      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image/png';
      }

      // WebP RIFF/WEBP
      if (
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
      ) {
        return 'image/webp';
      }

      // AVIF ISO-BMFF/ftyp
      if (bytes.length >= 8) {
        const boxType = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
        if (boxType === 'ftyp') {
          return 'image/avif';
        }
      }
    } catch {
      // fallback
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'avif') return 'image/avif';
    return file.type || 'image/jpeg';
  };

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setCompletedSeconds(null);
    const newItems: ConversionItem[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);

      try {
        if (!file || file.size === 0) {
          throw new Error('File is empty or invalid (0 bytes)');
        }

        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength !== file.size) {
          throw new Error(`ArrayBuffer byteLength mismatch`);
        }

        const format = await detectActualFormat(arrayBuffer, file);

        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          stableBuffer: arrayBuffer,
          name: file.name,
          originalSize: file.size,
          originalFormat: format,
          targetFormat: defaultTargetFormat,
          status: 'pending',
          progressText: 'Queued',
          previewUrl
        });
      } catch (readErr: any) {
        console.error('READ_STAGE_FAILED for', file.name, readErr);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          stableBuffer: new ArrayBuffer(0),
          name: file.name,
          originalSize: file.size,
          originalFormat: 'unknown',
          targetFormat: defaultTargetFormat,
          status: 'error',
          progressText: 'Failed',
          error: `Conversion failed. Please try again.`,
          previewUrl,
          diagnostic: {
            inputFilename: file.name,
            detectedFormat: file.type || 'unknown',
            targetFormat: defaultTargetFormat,
            codecUsed: 'None (Read Failed)',
            codecVersions: 'Internal',
            stage: 'Reading',
            errorMessage: readErr.message,
            errorName: readErr.name || 'ReadError'
          }
        });
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find(i => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      if (target?.outputUrl) URL.revokeObjectURL(target.outputUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const resetAll = () => {
    items.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });
    setItems([]);
    setErrorMsg(null);
    setCompletedSeconds(null);
    setSelectedDiagnostic(null);
  };

  const runWithTimeout = async (promise: Promise<any>, ms = 25000): Promise<any> => {
    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Processing took too long. Please try again.')), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  };

  const convertSingleItem = async (item: ConversionItem, updateProgress: (text: string) => void): Promise<ConversionItem> => {
    let currentStage = 'Reading';
    try {
      if (!item.stableBuffer || item.stableBuffer.byteLength === 0) {
        throw new Error('File data is missing');
      }

      currentStage = 'Decoding';
      updateProgress(`Decoding image...`);
      await new Promise(r => setTimeout(r, 10));

      let imageData: ImageData;

      if (item.originalFormat === 'image/jpeg') {
        const { decode: decodeJpeg } = await import('@jsquash/jpeg');
        const res = await runWithTimeout(decodeJpeg(item.stableBuffer));
        if (!res) throw new Error('Unable to decode JPEG');
        imageData = res;
      } else if (item.originalFormat === 'image/webp') {
        const { decode: decodeWebp } = await import('@jsquash/webp');
        const res = await runWithTimeout(decodeWebp(item.stableBuffer));
        if (!res) throw new Error('Unable to decode WebP');
        imageData = res;
      } else if (item.originalFormat === 'image/avif') {
        const { decode: decodeAvif } = await import('@jsquash/avif');
        const res = await runWithTimeout(decodeAvif(item.stableBuffer));
        if (!res) throw new Error('Unable to decode AVIF');
        imageData = res;
      } else if (item.originalFormat === 'image/png') {
        throw new Error('PNG input decoding is currently unsupported.');
      } else {
        throw new Error(`Unsupported input format`);
      }

      let hasAlpha = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 255) {
          hasAlpha = true;
          break;
        }
      }

      let finalImageData = imageData;
      if (item.targetFormat === 'image/jpeg' && hasAlpha) {
        currentStage = 'Preparing Transparency';
        updateProgress('Applying background color...');
        await new Promise(r => setTimeout(r, 10));

        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const putBmp = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
          ctx.putImageData(putBmp, 0, 0);
          const res = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (res) finalImageData = res;
        }
      }

      currentStage = 'Encoding';
      const targetExtName = formatExt(item.targetFormat);
      updateProgress(`Encoding to ${targetExtName}...`);
      await new Promise(r => setTimeout(r, 20));

      let encodedBuffer: ArrayBuffer | Uint8Array;

      if (item.targetFormat === 'image/jpeg') {
        const { encode: encodeJpeg } = await import('@jsquash/jpeg');
        encodedBuffer = await runWithTimeout(encodeJpeg(finalImageData, { quality }));
      } else if (item.targetFormat === 'image/png') {
        const { optimise: encodePng } = await import('@jsquash/oxipng');
        encodedBuffer = await runWithTimeout(encodePng(finalImageData));
      } else if (item.targetFormat === 'image/webp') {
        const { encode: encodeWebp } = await import('@jsquash/webp');
        encodedBuffer = await runWithTimeout(encodeWebp(finalImageData, { quality }));
      } else if (item.targetFormat === 'image/avif') {
        const { encode: encodeAvif } = await import('@jsquash/avif');
        encodedBuffer = await runWithTimeout(encodeAvif(finalImageData, { quality: quality / 100 }));
      } else {
        throw new Error('Unsupported target format');
      }

      currentStage = 'Finalizing';
      updateProgress('Preparing download...');
      await new Promise(r => setTimeout(r, 10));

      const blob = new Blob([encodedBuffer as any], { type: item.targetFormat });
      if (blob.size === 0) throw new Error('Conversion output is empty');

      currentStage = 'Complete';
      updateProgress('Complete');

      const url = URL.createObjectURL(blob);

      return {
        ...item,
        status: 'success',
        progressText: 'Completed',
        outputBlob: blob,
        outputSize: blob.size,
        outputUrl: url,
        hasAlpha
      };
    } catch (err: any) {
      console.error(`Conversion error for ${item.name} at stage [${currentStage}]:`, err);
      const diagnostic: DiagnosticReport = {
        inputFilename: item.name,
        detectedFormat: item.originalFormat,
        targetFormat: item.targetFormat,
        codecUsed: item.originalFormat === item.targetFormat ? `Same-Format (${formatExt(item.targetFormat)})` : `Conversion (${formatExt(item.originalFormat)} → ${formatExt(item.targetFormat)})`,
        codecVersions: 'Internal Engine',
        stage: currentStage,
        errorMessage: err.message || 'Unknown conversion error',
        errorName: err.name || 'Error'
      };

      return {
        ...item,
        status: 'error',
        progressText: 'Failed',
        error: `Conversion failed. Please try again.`,
        diagnostic
      };
    }
  };

  const startConversion = async () => {
    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) {
      setErrorMsg('No pending items to convert.');
      return;
    }

    setIsBatchProcessing(true);
    setErrorMsg(null);
    setCompletedSeconds(null);
    setCompletedCount(0);
    setTotalCount(pendingItems.length);
    setSelectedDiagnostic(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setProcessingStage('Starting conversion queue...');

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    let index = 0;
    let done = 0;

    while (index < pendingItems.length) {
      const currentItem = pendingItems[index++];
      
      const updateProgress = (text: string) => {
        setItems(prev => prev.map(i => i.id === currentItem.id ? { ...i, status: 'processing', progressText: text } : i));
      };

      updateProgress('Queued');
      
      const updated = await convertSingleItem(currentItem, updateProgress);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      
      done++;
      setCompletedCount(done);
      setProcessingStage(`Processed ${done} of ${pendingItems.length} files`);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsBatchProcessing(false);

    const totalTime = (performance.now() - startTimeRef.current) / 1000;
    setCompletedSeconds(Number(totalTime.toFixed(2)));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatExt = (mime: string) => mime.split('/')[1]?.toUpperCase().replace('JPEG', 'JPG') || 'JPG';

  const batchPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const successCount = items.filter(i => i.status === 'success').length;
  const failCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Advanced Image Format Converter</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Image Format Converter</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Convert images between JPEG, PNG, WebP, and AVIF formats with batch processing and high quality retention.
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
      {isBatchProcessing && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Processing queue ({completedCount} / {totalCount})...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(batchPercentage, 5)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-amber-300 animate-pulse">{processingStage}</span>
              <span className="font-mono text-amber-400 font-bold">{batchPercentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Summary Banner */}
      {completedSeconds !== null && !isBatchProcessing && !errorMsg && items.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Batch completed: <strong className="text-emerald-400">{successCount} converted</strong>, <strong className="text-rose-400">{failCount} failed</strong> (in {completedSeconds}s)</span>
          </div>
          <span className="font-mono text-slate-400">Total items: {items.length}</span>
        </div>
      )}

      {/* Diagnostic Report Modal / Drawer */}
      {selectedDiagnostic && (
        <div className="bg-slate-950 border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Developer Diagnostic Report</span>
            </div>
            <button
              onClick={() => setSelectedDiagnostic(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-300">
            <div><span className="text-slate-500">Input Filename:</span> {selectedDiagnostic.inputFilename}</div>
            <div><span className="text-slate-500">Detected Format:</span> {selectedDiagnostic.detectedFormat}</div>
            <div><span className="text-slate-500">Target Format:</span> {selectedDiagnostic.targetFormat}</div>
            <div><span className="text-slate-500">Conversion Type:</span> {selectedDiagnostic.codecUsed}</div>
            <div><span className="text-slate-500">Engine Version:</span> {selectedDiagnostic.codecVersions}</div>
            <div><span className="text-slate-500">Failed Stage:</span> <span className="text-amber-400 font-bold">{selectedDiagnostic.stage}</span></div>
            <div className="sm:col-span-2 text-rose-400"><span className="text-slate-500">Error Name:</span> {selectedDiagnostic.errorName}</div>
            <div className="sm:col-span-2 text-rose-300"><span className="text-slate-500">Error Message:</span> {selectedDiagnostic.errorMessage}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Conversion Options</h3>
            {items.length > 0 && !isBatchProcessing && (
              <button
                onClick={resetAll}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isBatchProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-amber-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isBatchProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Select Images</p>
            <p className="text-xs text-slate-400">Supports JPG, PNG, WebP, AVIF</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Default Target Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isBatchProcessing}
                    onClick={() => {
                      setDefaultTargetFormat(fmt);
                      setItems(prev => prev.map(i => ({ ...i, targetFormat: fmt })));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${defaultTargetFormat === fmt ? 'bg-amber-600 border-amber-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    {formatExt(fmt)}
                  </button>
                ))}
              </div>
            </div>

            {defaultTargetFormat !== 'image/png' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-400 font-medium flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" /> Quality ({quality}%)
                  </label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  disabled={isBatchProcessing}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}

            {defaultTargetFormat === 'image/jpeg' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Background Color (for transparent PNG/WebP/AVIF)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bgColor}
                    disabled={isBatchProcessing}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer p-1"
                  />
                  <span className="text-xs text-slate-300 font-mono">{bgColor} (Default: White)</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={startConversion}
            disabled={items.length === 0 || isBatchProcessing}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Convert Queue ({items.length})</span>
          </button>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Conversion Batch ({items.length})</h3>
              {successCount > 0 && !isBatchProcessing && (
                <button
                  onClick={() => {
                    items.forEach(item => {
                      if (item.outputUrl && item.outputBlob && item.status === 'success') {
                        const a = document.createElement('a');
                        a.href = item.outputUrl;
                        const ext = item.targetFormat.split('/')[1].replace('jpeg', 'jpg');
                        a.download = `${item.name.replace(/\.[^/.]+$/, '')}_converted.${ext}`;
                        a.click();
                      }
                    });
                  }}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All Success ({successCount})</span>
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-28 space-y-3">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">Upload one or more images to start conversion.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {items.map((item) => {
                  const savedBytes = item.outputSize ? item.originalSize - item.outputSize : 0;
                  const reduction = item.outputSize ? Math.round((savedBytes / item.originalSize) * 100) : 0;

                  return (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-800">
                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{formatExt(item.originalFormat)} ({formatSize(item.originalSize)})</span>
                          <span>→</span>
                          <select
                            disabled={isBatchProcessing}
                            value={item.targetFormat}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, targetFormat: val, status: 'pending' } : i));
                            }}
                            className="bg-slate-900 text-amber-400 rounded px-1.5 py-0.5 border border-slate-700"
                          >
                            <option value="image/jpeg">JPG</option>
                            <option value="image/png">PNG</option>
                            <option value="image/webp">WEBP</option>
                            <option value="image/avif">AVIF</option>
                          </select>
                          {item.outputSize && (
                            <span className="text-emerald-400 font-bold">
                              ({formatSize(item.outputSize)} • {reduction >= 0 ? `${reduction}% smaller` : `${Math.abs(reduction)}% larger`})
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="text-amber-400 font-semibold animate-pulse">{item.progressText}</span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              {item.error}
                              {item.diagnostic && (
                                <button
                                  onClick={() => setSelectedDiagnostic(item.diagnostic || null)}
                                  className="underline text-amber-400 hover:text-white cursor-pointer ml-1"
                                >
                                  [Debug Report]
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Status: Ready</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'processing' && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                            <span>Processing...</span>
                          </div>
                        )}

                        {item.status === 'success' && item.outputUrl && (
                          <a
                            href={item.outputUrl}
                            download={`${item.name.replace(/\.[^/.]+$/, '')}_converted.${formatExt(item.targetFormat).toLowerCase()}`}
                            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}

                        {item.status === 'error' && (
                          <span className="text-xs text-rose-400 font-medium" title={item.error}>
                            Failed ⚠️
                          </span>
                        )}

                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={isBatchProcessing}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
