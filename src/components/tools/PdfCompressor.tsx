import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RotateCcw, AlertCircle, Loader2, Cpu, Info, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { jsPDF } from 'jspdf';

// Configure bundled PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export const PdfCompressor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionMode, setCompressionMode] = useState<'safe' | 'balanced' | 'maximum'>('balanced');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Preparing...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('');
  const [isNotSmaller, setIsNotSmaller] = useState<boolean>(false);
  const [showLicenseInfo, setShowLicenseInfo] = useState<boolean>(false);
  const [timings, setTimings] = useState<Record<string, number> | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);

  // Unified progress & timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCancelOrReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsProcessing(false);
    setSelectedFile(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setErrorMsg(null);
    setIsNotSmaller(false);
    setTimings(null);
    setElapsedSeconds(0);
    setCompletedSeconds(null);
    setPageCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (files: FileList | File[]) => {
    setErrorMsg(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setIsNotSmaller(false);
    setTimings(null);
    setCompletedSeconds(null);
    const file = files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }

    setSelectedFile(file);
    setOriginalSize(file.size);
  };

  const compressPdfReal = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a PDF file first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setIsNotSmaller(false);
    setTimings(null);
    setCompletedSeconds(null);
    setStatusText('Preparing document and reading structure...');

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    const tStart = performance.now();

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const tRead = performance.now();

      setStatusText('Analyzing document layout...');
      await new Promise(r => setTimeout(r, 80));

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      setPageCount(numPages);

      let scale = 1.2;
      let quality = 0.75;
      if (compressionMode === 'safe') {
        scale = 1.5;
        quality = 0.9;
      } else if (compressionMode === 'maximum') {
        scale = 0.9;
        quality = 0.55;
      }

      setStatusText(`Optimizing resources (0 of ${numPages} pages)...`);
      const tProcess = performance.now();

      let pdfJspdf: jsPDF | null = null;

      for (let i = 1; i <= numPages; i++) {
        setStatusText(`Optimizing resources (page ${i} of ${numPages})...`);
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!context) throw new Error('Could not create canvas context');

        await page.render({ canvasContext: context, viewport }).promise;

        const imgData = canvas.toDataURL('image/jpeg', quality);

        const imgWidthPt = viewport.width * 0.75;
        const imgHeightPt = viewport.height * 0.75;

        if (i === 1) {
          pdfJspdf = new jsPDF({
            orientation: imgWidthPt > imgHeightPt ? 'l' : 'p',
            unit: 'pt',
            format: [imgWidthPt, imgHeightPt]
          });
          pdfJspdf.addImage(imgData, 'JPEG', 0, 0, imgWidthPt, imgHeightPt, undefined, 'FAST');
        } else if (pdfJspdf) {
          pdfJspdf.addPage([imgWidthPt, imgHeightPt], imgWidthPt > imgHeightPt ? 'l' : 'p');
          pdfJspdf.addImage(imgData, 'JPEG', 0, 0, imgWidthPt, imgHeightPt, undefined, 'FAST');
        }
      }

      if (!pdfJspdf) {
        throw new Error('Failed to generate compressed PDF');
      }

      setStatusText('Finalizing document output...');
      await new Promise(r => setTimeout(r, 60));

      const pdfOutput = pdfJspdf.output('arraybuffer');
      const tEnd = performance.now();

      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));

      const compSize = pdfOutput.byteLength;
      setCompressedSize(compSize);
      setOriginalSize(selectedFile.size);

      if (compSize >= selectedFile.size) {
        setIsNotSmaller(true);
      }

      const blob = new Blob([pdfOutput], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const outName = `${baseName}_compressed_${compressionMode}.pdf`;

      setDownloadUrl(url);
      setDownloadName(outName);
      setStatusText('Compression complete');

      setTimings({
        fileRead: tRead - tStart,
        compression: tEnd - tProcess,
        total: tEnd - tStart
      });

    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      setErrorMsg(err.message || 'PDF compression could not be completed.');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms: number) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} sec`;
  };

  const savedBytes = originalSize - compressedSize;
  const reductionPercent = originalSize > 0 ? Math.max(0, Math.round((savedBytes / originalSize) * 100)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>High-Performance Document Compression</span>
          </div>
          <div className="flex items-center gap-3">
            {selectedFile && (
              <button
                onClick={handleCancelOrReset}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 font-medium cursor-pointer transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Cancel Task' : 'Start Over'}</span>
              </button>
            )}
            <button
              onClick={() => setShowLicenseInfo(!showLicenseInfo)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showLicenseInfo ? 'Hide Guide' : 'Compression Guide'}</span>
            </button>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">PDF Compressor</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Intelligent document optimization that significantly reduces file size while preserving text clarity.
        </p>
      </div>

      {showLicenseInfo && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compression Guide & Tips</h3>
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">Secure & Private</span>
          </div>
          <p className="text-slate-400">
            This tool optimizes heavy scanned and image PDFs by balancing page rendering quality and file size. Choose Safe for maximum quality, Balanced for everyday sharing, or Maximum for smallest size.
          </p>
        </div>
      )}

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
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Compressing PDF...</span>
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
              <span className="text-emerald-300 animate-pulse">{statusText}</span>
              <span className="font-mono text-emerald-400">Processing Stream</span>
            </div>
          </div>
        </div>
      )}

      {/* Completion Success Compact Banner */}
      {completedSeconds !== null && !isProcessing && !errorMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-emerald-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>✓ Compression complete — Completed in {completedSeconds} seconds</span>
          </div>
          <span className="font-mono text-slate-400">Pages: {pageCount} | Reduction: {isNotSmaller ? 'None' : `${reductionPercent}%`}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Compression Settings</h3>
            {selectedFile && !isProcessing && (
              <button
                onClick={handleCancelOrReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Start Over</span>
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
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
            <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white truncate">{selectedFile ? selectedFile.name : 'Select PDF File'}</p>
            <p className="text-xs text-slate-400">{selectedFile ? formatSize(selectedFile.size) : 'Supports large scanned PDFs'}</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs text-slate-400 font-medium">Compression Preset</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCompressionMode('safe')}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${compressionMode === 'safe' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
              >
                Safe (90%)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCompressionMode('balanced')}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${compressionMode === 'balanced' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
              >
                Balanced (75%)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCompressionMode('maximum')}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${compressionMode === 'maximum' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
              >
                Maximum (55%)
              </button>
            </div>
          </div>

          {isProcessing ? (
            <button
              onClick={handleCancelOrReset}
              className="w-full py-3.5 px-4 font-semibold rounded-xl text-sm shadow-lg bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Cancel Task</span>
            </button>
          ) : (
            <button
              onClick={compressPdfReal}
              disabled={!selectedFile}
              className="w-full py-3.5 px-4 font-semibold rounded-xl text-sm shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>Compress PDF (Real Reduction)</span>
            </button>
          )}
        </div>

        {/* RESULTS CARD WITH DOWNLOAD BUTTON AT THE TOP */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Compression Results</h3>
              {downloadUrl && !isNotSmaller && (
                <span className="text-xs text-emerald-400 font-mono font-bold animate-pulse">Ready for Download ↓</span>
              )}
            </div>

            {!selectedFile ? (
              <div className="text-center py-28 space-y-3">
                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">Upload a PDF document to compress real image sizes dramatically.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. DOWNLOAD BUTTON PROMINENTLY AT THE TOP WHEN READY */}
                {downloadUrl && !isNotSmaller && (
                  <div className="pt-1">
                    {loadPdfDownloadButton(downloadUrl, downloadName, compressedSize)}
                  </div>
                )}

                {/* 2. SIZES COMPARISON */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Original Size</p>
                    <p className="text-2xl font-bold text-white font-mono">{formatSize(originalSize)}</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">Compressed Size</p>
                    <p className="text-2xl font-bold text-emerald-400 font-mono">
                      {downloadUrl || isNotSmaller ? formatSize(compressedSize) : isProcessing ? 'Processing...' : '—'}
                    </p>
                  </div>
                </div>

                {/* 3. RESULTS SUMMARY */}
                {(downloadUrl || isNotSmaller) && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Summary</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${isNotSmaller ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {isNotSmaller ? 'No Reduction' : `${reductionPercent}% Smaller`}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs font-mono text-slate-300">
                      <div>
                        <span className="text-slate-500 block">Space Saved:</span>
                        <span className="text-white font-bold">{isNotSmaller ? '0 Bytes' : formatSize(savedBytes)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Pages Processed:</span>
                        <span className="text-emerald-400 font-bold">{pageCount} Pages</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Status:</span>
                        <span className="text-emerald-400 font-bold">Success</span>
                      </div>
                    </div>

                    {isNotSmaller && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Output is not smaller than original. Try Maximum mode for higher reduction.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. PERFORMANCE METRICS AT THE BOTTOM */}
                {timings && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Performance Metrics</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-300">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[9px]">Read Time:</span>
                        <span className="text-white font-bold">{formatMs(timings.fileRead)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[9px]">Compression:</span>
                        <span className="text-emerald-400 font-bold">{formatMs(timings.compression)}</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-indigo-400 block text-[9px]">Total Time:</span>
                        <span className="text-emerald-400 font-bold">{formatMs(timings.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            {selectedFile && !isProcessing && (
              <button
                onClick={handleCancelOrReset}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start Over / New File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function loadPdfDownloadButton(downloadUrl: string, downloadName: string, compressedSize: number) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <a
      href={downloadUrl}
      download={downloadName}
      className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 text-center block animate-bounce"
    >
      <Download className="w-5 h-5" />
      <span>Download Compressed PDF ({formatSize(compressedSize)})</span>
    </a>
  );
}
