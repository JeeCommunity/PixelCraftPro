import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, Trash2, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, Loader2, Clock } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PngItem {
  id: string;
  file: File;
  previewUrl: string;
}

export const PngToPdf: React.FC = () => {
  const [images, setImages] = useState<PngItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>('');

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [resultName, setResultName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);

  // Unified progress UI state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    setResultUrl(null);
    setCompletedSeconds(null);
    const newItems: PngItem[] = [];
    Array.from(files).forEach((file) => {
      if (file.type === 'image/png') {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl: URL.createObjectURL(file)
        });
      }
    });
    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;
    setImages(newImages);
  };

  const generatePdf = async () => {
    if (images.length === 0) {
      setErrorMsg('Please select at least one PNG image.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    setCompletedSeconds(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setProgressText(`Reading PNG 0 of ${images.length}...`);

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      const pdfDoc = await PDFDocument.create();
      let pageWidth = 595.28;
      let pageHeight = 841.89;

      if (pageSize === 'Letter') {
        pageWidth = 612;
        pageHeight = 792;
      }

      if (orientation === 'landscape' && pageSize !== 'Fit') {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      let count = 0;
      for (const item of images) {
        count++;
        const percent = Math.round((count / images.length) * 100);
        setProgressText(`Embedding PNG ${count} of ${images.length} (${percent}%)`);

        const arrayBuffer = await item.file.arrayBuffer();
        const pdfImage = await pdfDoc.embedPng(arrayBuffer);

        const imgWidth = pdfImage.width;
        const imgHeight = pdfImage.height;

        let curWidth = pageWidth;
        let curHeight = pageHeight;

        if (pageSize === 'Fit') {
          curWidth = imgWidth;
          curHeight = imgHeight;
        }

        const page = pdfDoc.addPage([curWidth, curHeight]);
        const margin = 40;
        const usableWidth = curWidth - margin * 2;
        const usableHeight = curHeight - margin * 2;

        const imgRatio = imgWidth / imgHeight;
        let drawW = usableWidth;
        let drawH = usableWidth / imgRatio;

        if (drawH > usableHeight) {
          drawH = usableHeight;
          drawW = usableHeight * imgRatio;
        }

        const x = (curWidth - drawW) / 2;
        const y = (curHeight - drawH) / 2;

        page.drawImage(pdfImage, { x, y, width: drawW, height: drawH });
      }

      setProgressText('Finalizing PDF document...');
      const pdfBytes = await pdfDoc.save();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName = `png_converted_${Date.now()}.pdf`;

      setResultUrl(url);
      setResultSize(blob.size);
      setResultName(fileName);
      setTotalPages(images.length);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate PDF.');
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Client-Side PNG to PDF</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">PNG to PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Convert PNG images into PDF documents with transparency support and live progress indicators.
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
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Generating PDF from PNG images...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2.5 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-cyan-300 animate-pulse">{progressText}</span>
              <span className="font-mono text-cyan-400">pdf-lib Stream</span>
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
          <span className="font-mono text-slate-400">Total Pages: {totalPages}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">PDF Options</h3>
            {images.length > 0 && !isProcessing && (
              <button
                onClick={() => { setImages([]); setResultUrl(null); setCompletedSeconds(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Select PNG Images</p>
            <p className="text-xs text-slate-400">PNG files with transparency</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Page Size</label>
              <select
                disabled={isProcessing}
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="Letter">US Letter</option>
                <option value="Fit">Fit to Image Size</option>
              </select>
            </div>

            {pageSize !== 'Fit' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Orientation</label>
                <select
                  disabled={isProcessing}
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={generatePdf}
            disabled={images.length === 0 || isProcessing}
            className="w-full py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Generate PDF ({images.length} PNGs)</span>
          </button>

          {resultUrl && !isProcessing && (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>PDF Generated Successfully!</span>
              </div>
              <div className="space-y-1 text-xs text-slate-300 font-mono">
                <p>📄 File Name: {resultName}</p>
                <p>📊 File Size: {formatSize(resultSize)}</p>
                <p>📑 Total Pages: {totalPages}</p>
              </div>
              <a
                href={resultUrl}
                download={resultName}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-center block"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF ({formatSize(resultSize)})</span>
              </a>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Selected PNGs ({images.length})</h3>
            {images.length > 0 && !isProcessing && (
              <button onClick={() => { setImages([]); setResultUrl(null); }} className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer">
                Clear All
              </button>
            )}
          </div>

          {images.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No PNG images selected yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {images.map((img, idx) => (
                <div key={img.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3 checkerboard">
                  <div className="w-16 h-16 bg-slate-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={img.previewUrl} alt="Thumb" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{img.file.name}</p>
                    <p className="text-[10px] text-slate-400">Page #{idx + 1} • {formatSize(img.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveImage(idx, 'up')}
                      disabled={idx === 0 || isProcessing}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'down')}
                      disabled={idx === images.length - 1 || isProcessing}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={isProcessing}
                      onClick={() => removeImage(img.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
