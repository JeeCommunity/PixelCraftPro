import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, Scissors, CheckCircle2, Eye, Check, RotateCcw, X, Loader2, Clock } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface ThumbnailCardProps {
  pageNum: number;
  resultIdx: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({ pageNum, resultIdx, pdfDoc }) => {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!pdfDoc) return;

    const renderThumb = async () => {
      try {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.3 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!context) throw new Error('Canvas context unavailable');

        await page.render({ canvasContext: context, viewport }).promise;

        if (!isMounted) return;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setThumbSrc(dataUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Thumbnail render error for page', pageNum, err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    renderThumb();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <div className="relative p-3 rounded-xl border bg-slate-950/80 border-slate-800 hover:border-emerald-500/50 shadow-lg flex flex-col items-center justify-between gap-2.5 transition-all">
      <div className="w-full h-32 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          </div>
        )}

        {thumbSrc && !hasError ? (
          <img src={thumbSrc} alt={`Page ${pageNum} thumbnail`} className="w-full h-full object-contain bg-black/40" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 space-y-1">
            <FileText className="w-8 h-8 text-slate-600" />
            <span className="text-[10px] font-mono">Page {pageNum}</span>
          </div>
        )}
      </div>

      <div className="text-center w-full">
        <p className="text-xs font-bold text-emerald-300">Result #{resultIdx + 1}</p>
        <p className="text-[11px] text-slate-300 font-medium mt-0.5">Original Page {pageNum}</p>
      </div>

      <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] shadow">
        <Check className="w-3 h-3" />
      </div>
    </div>
  );
};

export const SplitPdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rangeInput, setRangeInput] = useState<string>('1-2');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [resultName, setResultName] = useState<string>('');
  const [extractedPagesList, setExtractedPagesList] = useState<number[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  // Unified progress state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [completedSeconds, setCompletedSeconds] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }
    setErrorMsg(null);
    setResultUrl(null);
    setExtractedPagesList([]);
    setCompletedSeconds(null);
    setFile(selected);
    if (pdfProxy) {
      pdfProxy.destroy();
      setPdfProxy(null);
    }

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      setPageCount(count);
      setRangeInput(`1-${Math.min(count, 2)}`);

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const proxy = await loadingTask.promise;
      setPdfProxy(proxy);
    } catch (err: any) {
      setErrorMsg('Could not read PDF page count. File may be encrypted or corrupted.');
      setPageCount(0);
    }
  };

  const selectedPagesSet = useMemo(() => {
    const set = new Set<number>();
    if (!rangeInput.trim() || pageCount === 0) return set;
    const parts = rangeInput.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= pageCount && start <= end) {
          for (let p = start; p <= end; p++) {
            set.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount) {
          set.add(p);
        }
      }
    }
    return set;
  }, [rangeInput, pageCount]);

  const splitPdf = async () => {
    if (!file || pageCount === 0) {
      setErrorMsg('Please upload a valid PDF first.');
      return;
    }

    if (selectedPagesSet.size === 0) {
      setErrorMsg('Please specify valid pages to extract.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    setCompletedSeconds(null);

    startTimeRef.current = performance.now();
    setElapsedSeconds(0);
    setStatusText('Reading and parsing source PDF...');

    timerRef.current = setInterval(() => {
      const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Number(currentElapsed.toFixed(2)));
    }, 100);

    try {
      setStatusText('Extracting requested pages...');
      await new Promise(r => setTimeout(r, 100));

      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      const sortedPages = Array.from(selectedPagesSet).sort((a, b) => a - b);
      const indices = sortedPages.map((p) => p - 1);
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(srcDoc, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      setStatusText('Saving split PDF document...');
      const pdfBytes = await newPdf.save();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);

      const totalTime = (performance.now() - startTimeRef.current) / 1000;
      setCompletedSeconds(Number(totalTime.toFixed(2)));

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_split_${Date.now()}.pdf`;

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setResultUrl(url);
      setResultSize(blob.size);
      setResultName(fileName);
      setExtractedPagesList(sortedPages);
      setShowModal(true);
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsProcessing(false);
      console.error(err);
      setErrorMsg(err.message || 'Failed to split PDF.');
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
    setPageCount(0);
    setResultUrl(null);
    setExtractedPagesList([]);
    setCompletedSeconds(null);
    if (pdfProxy) {
      pdfProxy.destroy();
      setPdfProxy(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
          <Scissors className="w-3.5 h-3.5" />
          <span>Client-Side PDF Splitter & Visual Thumbnails</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Split PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Extract specific pages or page ranges with actual visual thumbnails verifying your split results instantly.
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
        <div className="bg-slate-900 border border-pink-500/40 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              <span>Splitting PDF document...</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>Elapsed: {elapsedSeconds.toFixed(2)}s</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-pink-500 to-purple-400 h-2.5 rounded-full w-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="text-pink-300 animate-pulse">{statusText}</span>
              <span className="font-mono text-pink-400">pdf-lib Engine</span>
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
          <span className="font-mono text-slate-400">Extracted Pages: {extractedPagesList.length}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Upload & Split</h3>
            {file && !isProcessing && (
              <button
                onClick={resetAll}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-pink-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{file ? file.name : 'Select PDF'}</p>
            <p className="text-xs text-slate-400">PDF document</p>
          </div>

          {pageCount > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Total Pages in PDF</p>
                <p className="text-2xl font-bold text-white mt-1">{pageCount}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Page Ranges to Extract</label>
                <input
                  type="text"
                  disabled={isProcessing}
                  value={rangeInput}
                  onChange={(e) => {
                    setRangeInput(e.target.value);
                    setResultUrl(null);
                  }}
                  placeholder="e.g. 1-3, 5, 7-10"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white font-mono rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <button
                onClick={splitPdf}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                <span>Extract Pages</span>
              </button>

              {resultUrl && !isProcessing && (
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PDF Split Successfully!</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-300 font-mono">
                    <p>📄 File Name: {resultName}</p>
                    <p>📊 File Size: {formatSize(resultSize)}</p>
                    <p>📑 Extracted Pages: {extractedPagesList.length}</p>
                  </div>
                  
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Result Thumbnails ({extractedPagesList.length} cards)</span>
                  </button>

                  <a
                    href={resultUrl}
                    download={resultName}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-center block"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Split PDF ({formatSize(resultSize)})</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl min-h-[450px]">
          {!file ? (
            <div className="text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">Upload a PDF document and specify extraction ranges.</p>
            </div>
          ) : (
            <div className="text-center space-y-5 max-w-md">
              <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center justify-center text-pink-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white truncate">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Total Pages: {pageCount}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-white">Extraction Summary:</p>
                <p>• Specified Range: <code className="text-pink-400 font-mono">{rangeInput}</code></p>
                <p>• Pages to Extract: <code className="text-emerald-400 font-mono">{selectedPagesSet.size} page(s)</code></p>
              </div>

              {resultUrl && !isProcessing && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="py-3 px-6 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-pink-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Result Thumbnails Overview</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Result Overview Modal Popup with Real PDF Thumbnails */}
      {showModal && resultUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Split Result Page Thumbnails Overview</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono space-y-1">
                <p>📄 File Name: {resultName}</p>
                <p>📊 File Size: {formatSize(resultSize)} • Total Extracted: {extractedPagesList.length} pages</p>
              </div>

              <p className="text-xs text-slate-400">Visual previews of your extracted split PDF pages:</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {extractedPagesList.map((pageNum, idx) => (
                  <ThumbnailCard
                    key={pageNum}
                    pageNum={pageNum}
                    resultIdx={idx}
                    pdfDoc={pdfProxy}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
              <a
                href={resultUrl}
                download={resultName}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Split PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
