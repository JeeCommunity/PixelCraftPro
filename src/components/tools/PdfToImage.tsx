import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, CheckCircle2, Sliders, Loader2, Clock } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface PdfToImageProps {
  format?: 'jpeg' | 'png';
  title?: string;
  description?: string;
}

interface RenderedPage {
  pageNum: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export const PdfToImage: React.FC<PdfToImageProps> = ({
  format = 'jpeg',
  title = format === 'jpeg' ? 'PDF to JPG Converter' : 'PDF to PNG Converter',
  description = format === 'jpeg' 
    ? 'Convert PDF document pages into high-resolution JPG images locally using Mozilla PDF.js.' 
    : 'Convert PDF pages into high-quality PNG images with transparency preservation using Mozilla PDF.js.'
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRangeInput, setPageRangeInput] = useState<string>('all');
  const [scale, setScale] = useState<number>(1.5);
  const [quality, setQuality] = useState<number>(0.9);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);

  // Unified progress state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File) => {
    if (!selected || selected.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }
    setErrorMsg(null);
    setFile(selected);
    setRenderedPages([]);
    setPdfArrayBuffer(null);
    setCompletedSeconds(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error('Empty file buffer');
        setPdfArrayBuffer(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const pdfDoc = await loadingTask.promise;
        const count = pdfDoc.numPages;
        setPageCount(count);
        setPageRangeInput(`1-${Math.min(count, 5)}`);
      } catch (err: any) {
        console.error('PDF parsing error:', err);
        setErrorMsg('The requested file could not be read or is encrypted/corrupted. Please re-upload.');
        setPageCount(0);
        setPdfArrayBuffer(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk.');
    };
    reader.readAsArrayBuffer(selected);
  };

  const selectedPagesList = useMemo(() => {
    const list: number[] = [];
    if (!pageRangeInput.trim() || pageCount === 0) return list;
    if (pageRangeInput.toLowerCase() === 'all') {
      for (let i = 1; i <= pageCount; i++) list.push(i);
      return list;
    }

    const parts = pageRangeInput.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= pageCount && start <= end) {
          for (let p = start; p <= end; p++) {
            if (!list.includes(p)) list.push(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount && !list.includes(p)) {
          list.push(p);
        }
      }
    }
    return list.sort((a, b) => a - b);
  }, [pageRangeInput, pageCount]);

  const handleConvert = async () => {
    if (!pdfArrayBuffer || pageCount === 0) {
      setErrorMsg('Please upload a valid PDF file first.');
      return;
    }
    if (selectedPagesList.length === 0) {
      setErrorMsg('Please specify valid pages to convert.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setRenderedPages([]);
    setCompletedSeconds(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setProgressText(`Loading PDF document (0 of ${selectedPagesList.length})...`);

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfArrayBuffer.slice(0) });
      const pdfDoc = await loadingTask.promise;

      const results: RenderedPage[] = [];
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

      for (let i = 0; i < selectedPagesList.length; i++) {
        const pageNum = selectedPagesList[i];
        setProgressText(`Rendering page ${pageNum} (${i + 1} of ${selectedPagesList.length})...`);

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas rendering context failed');

        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`Failed to export page ${pageNum} as blob`));
            },
            mimeType,
            format === 'jpeg' ? quality : undefined
          );
        });

        const dataUrl = URL.createObjectURL(blob);
        results.push({
          pageNum,
          dataUrl,
          blob,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
      }

      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));

      setRenderedPages(results);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      console.error('PDF rendering error:', err);
      setErrorMsg(err.message || 'PDF rendering failed.');
    } finally {
      setProgressText('');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const resetAll = () => {
    setFile(null);
    setPdfArrayBuffer(null);
    setPageCount(0);
    setRenderedPages([]);
    setCompletedSeconds(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Mozilla PDF.js Rendering Engine (v3.11.174)</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-slate-400 text-sm max-w-2xl">{description}</p>
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
              <span>Rendering PDF pages...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-400 h-2.5 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-indigo-300 animate-pulse">{progressText}</span>
              <span className="font-mono text-indigo-400">PDF.js Worker Stream</span>
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
          <span className="font-mono text-slate-400">Rendered Pages: {renderedPages.length}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Upload & Settings</h3>
            {file && !isProcessing && (
              <button
                onClick={resetAll}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{file ? file.name : 'Select PDF File'}</p>
            <p className="text-xs text-slate-400">PDF Document</p>
          </div>

          {pageCount > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Total Pages in PDF</p>
                <p className="text-2xl font-bold text-white mt-1">{pageCount}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Pages to Convert (e.g. 1-3, 5 or "all")</label>
                <input
                  type="text"
                  disabled={isProcessing}
                  value={pageRangeInput}
                  onChange={(e) => setPageRangeInput(e.target.value)}
                  placeholder="1-3, 5 or all"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white font-mono rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Resolution / Quality Scale</label>
                <select
                  disabled={isProcessing}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1.0}>Standard (100% DPI)</option>
                  <option value={1.5}>High (150% DPI)</option>
                  <option value={2.0}>Ultra HD (200% DPI)</option>
                  <option value={3.0}>Maximum (300% DPI)</option>
                </select>
              </div>

              {format === 'jpeg' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>JPG Quality</span>
                    <span className="text-indigo-400 font-mono font-bold">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    disabled={isProcessing}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              )}

              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
                <span>{isProcessing ? 'Converting...' : `Convert to ${format.toUpperCase()} (${selectedPagesList.length} pages)`}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Rendered Page Previews */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[500px]">
          {renderedPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-24 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">Upload a PDF and click convert to preview and download rendered {format.toUpperCase()} images.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Converted {renderedPages.length} Page(s) Successfully</span>
                </div>
                <button
                  onClick={() => {
                    renderedPages.forEach((p) => {
                      const a = document.createElement('a');
                      a.href = p.dataUrl;
                      a.download = `page_${p.pageNum}.${format === 'jpeg' ? 'jpg' : 'png'}`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    });
                  }}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All ({renderedPages.length})</span>
                </button>
              </div>

              {/* Grid of Rendered Page Previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2">
                {renderedPages.map((page) => (
                  <div key={page.pageNum} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md flex flex-col justify-between">
                    <div className="bg-slate-900 rounded-lg overflow-hidden h-48 flex items-center justify-center border border-slate-800">
                      <img src={page.dataUrl} alt={`Page ${page.pageNum}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                      <div>
                        <p className="font-bold text-white">Page #{page.pageNum}</p>
                        <p className="text-[10px] text-slate-400">{page.width} × {page.height}px • {formatSize(page.blob.size)}</p>
                      </div>
                      <a
                        href={page.dataUrl}
                        download={`page_${page.pageNum}.${format === 'jpeg' ? 'jpg' : 'png'}`}
                        className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-all flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
