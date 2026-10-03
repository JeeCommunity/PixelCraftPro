import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, RotateCw, CheckCircle2, RotateCcw, Clock, Loader2 } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';

export const RotatePdf: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [targetScope, setTargetScope] = useState<'all' | 'custom'>('all');
  const [customPages, setCustomPages] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [resultName, setResultName] = useState<string>('');

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Preparing...');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const handleFile = async (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file.');
      return;
    }
    setErrorMsg(null);
    setResultUrl(null);
    setFile(selected);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      setPageCount(count);
    } catch (err: any) {
      setErrorMsg('Could not read PDF. File may be encrypted or corrupted.');
      setPageCount(0);
    }
  };

  const rotatePdf = async () => {
    if (!file || pageCount === 0) {
      setErrorMsg('Please upload a valid PDF first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    setElapsedSeconds(0);
    setStatusText('Loading PDF document...');

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    try {
      setStatusText('Processing page rotations...');
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      if (targetScope === 'all') {
        pages.forEach((page) => {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + rotationAngle) % 360));
        });
      } else {
        const pagesToRotate = new Set<number>();
        const parts = customPages.split(',');

        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end) {
              throw new Error(`Invalid page range: "${trimmed}". Total pages: ${pageCount}`);
            }
            for (let p = start; p <= end; p++) {
              pagesToRotate.add(p - 1);
            }
          } else {
            const p = parseInt(trimmed, 10);
            if (isNaN(p) || p < 1 || p > pageCount) {
              throw new Error(`Invalid page number: "${trimmed}". Total pages: ${pageCount}`);
            }
            pagesToRotate.add(p - 1);
          }
        }

        pages.forEach((page, idx) => {
          if (pagesToRotate.has(idx)) {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + rotationAngle) % 360));
          }
        });
      }

      setStatusText('Saving rotated PDF...');
      const pdfBytes = await pdfDoc.save();
      if (timerRef.current) clearInterval(timerRef.current);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_rotated_${Date.now()}.pdf`;

      setResultUrl(url);
      setResultSize(blob.size);
      setResultName(fileName);
      setStatusText('Rotation completed successfully');
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error(err);
      setErrorMsg(err.message || 'Failed to rotate PDF.');
    } finally {
      setIsProcessing(false);
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
          <RotateCw className="w-3.5 h-3.5" />
          <span>Client-Side PDF Rotator & Live Status</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Rotate PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Rotate specific pages or entire PDF documents securely in your browser with real-time progress indicators.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Rotation Options</h3>
            {file && !isProcessing && (
              <button
                onClick={() => { setFile(null); setPageCount(0); setResultUrl(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="w-6 h-6 text-teal-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">{file ? file.name : 'Select PDF File'}</p>
            <p className="text-xs text-slate-400">PDF document</p>
          </div>

          {pageCount > 0 && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Total Pages in PDF</p>
                <p className="text-2xl font-bold text-white mt-1">{pageCount}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium">Rotation Angle</label>
                <div className="grid grid-cols-3 gap-2">
                  {[90, 180, 270].map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setRotationAngle(angle)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${rotationAngle === angle ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-medium">Target Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setTargetScope('all')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${targetScope === 'all' ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    All Pages
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setTargetScope('custom')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${targetScope === 'custom' ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                  >
                    Custom Pages
                  </button>
                </div>
              </div>

              {targetScope === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Page Numbers / Ranges</label>
                  <input
                    type="text"
                    disabled={isProcessing}
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                    placeholder="e.g. 1, 3-5, 8"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white font-mono rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              )}

              <button
                onClick={rotatePdf}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                <span>Rotate PDF Pages</span>
              </button>

              {isProcessing && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-1.5 text-teal-300">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400 shrink-0" />
                      <span>{statusText}</span>
                    </span>
                    <span className="text-teal-400 font-mono font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsedSeconds}s</span>
                    </span>
                  </div>
                </div>
              )}

              {resultUrl && (
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PDF Rotated Successfully!</span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-300 font-mono">
                    <p>📄 File Name: {resultName}</p>
                    <p>📊 File Size: {formatSize(resultSize)}</p>
                  </div>
                  <a
                    href={resultUrl}
                    download={resultName}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-center block"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Rotated PDF ({formatSize(resultSize)})</span>
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
              <p className="text-slate-400 text-sm">Upload a PDF document to rotate its pages.</p>
            </div>
          ) : (
            <div className="text-center space-y-5 max-w-md">
              <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white truncate">{file.name}</h4>
                <p className="text-xs text-slate-400 mt-1">Total Pages: {pageCount}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-xs text-slate-300">
                <p className="font-semibold text-white">Rotation Plan:</p>
                <p>• Angle: <code className="text-teal-400 font-mono">+{rotationAngle}°</code></p>
                <p>• Scope: <code className="text-emerald-400 font-mono">{targetScope === 'all' ? 'All Pages' : `Custom (${customPages})`}</code></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
