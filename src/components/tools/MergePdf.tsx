import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, Trash2, ArrowUp, ArrowDown, Merge, CheckCircle2, RotateCcw, Clock, Loader2, XCircle } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
}

export const MergePdf: React.FC = () => {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [resultName, setResultName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Preparing...');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const handleFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    setResultUrl(null);
    const newItems: PdfItem[] = [];
    Array.from(files).forEach((file) => {
      if (file.type === 'application/pdf') {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size
        });
      }
    });
    setPdfs((prev) => [...prev, ...newItems]);
  };

  const removePdf = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
  };

  const movePdf = (index: number, direction: 'up' | 'down') => {
    const newPdfs = [...pdfs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPdfs.length) return;
    const temp = newPdfs[index];
    newPdfs[index] = newPdfs[targetIndex];
    newPdfs[targetIndex] = temp;
    setPdfs(newPdfs);
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) {
      setErrorMsg('Please select at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    setElapsedSeconds(0);
    setStatusText('Initializing PDF merger...');

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    try {
      const mergedPdf = await PDFDocument.create();
      let totalMergedPages = 0;

      for (let i = 0; i < pdfs.length; i++) {
        const item = pdfs[i];
        setStatusText(`Merging file ${i + 1} of ${pdfs.length}: ${item.name}...`);
        try {
          const arrayBuffer = await item.file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          totalMergedPages += copiedPages.length;
        } catch (err: any) {
          throw new Error(`Failed to process "${item.name}": ${err.message || 'Encrypted or malformed PDF'}`);
        }
      }

      setStatusText('Saving final merged PDF...');
      const pdfBytes = await mergedPdf.save();
      if (timerRef.current) clearInterval(timerRef.current);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName = `merged_document_${Date.now()}.pdf`;

      setResultUrl(url);
      setResultSize(blob.size);
      setResultName(fileName);
      setTotalPages(totalMergedPages);
      setStatusText('Merge completed successfully');
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error(err);
      setErrorMsg(err.message || 'Failed to merge PDFs.');
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Merge className="w-3.5 h-3.5" />
          <span>Client-Side PDF Merger & Live Status</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Merge PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Combine multiple PDF files into one organized document securely in your browser with real-time progress indicators.
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Merge Options</h3>
            {pdfs.length > 0 && !isProcessing && (
              <button
                onClick={() => { setPdfs([]); setResultUrl(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-purple-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Select PDF Files</p>
            <p className="text-xs text-slate-400">Multiple PDF documents</p>
          </div>

          <button
            onClick={mergePdfs}
            disabled={pdfs.length < 2 || isProcessing}
            className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
            <span>Merge {pdfs.length} PDFs</span>
          </button>

          {isProcessing && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5 text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                  <span>{statusText}</span>
                </span>
                <span className="text-purple-400 font-mono font-bold flex items-center gap-1">
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
                <span>PDFs Merged Successfully!</span>
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
                <span>Download Merged PDF ({formatSize(resultSize)})</span>
              </a>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Selected PDFs ({pdfs.length})</h3>
            {pdfs.length > 0 && !isProcessing && (
              <button onClick={() => { setPdfs([]); setResultUrl(null); }} className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer">
                Clear All
              </button>
            )}
          </div>

          {pdfs.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No PDF files selected yet. Select 2 or more PDFs to merge.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {pdfs.map((item, idx) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 shrink-0 font-bold text-xs">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{formatSize(item.size)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => movePdf(idx, 'up')}
                      disabled={idx === 0 || isProcessing}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePdf(idx, 'down')}
                      disabled={idx === pdfs.length - 1 || isProcessing}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removePdf(item.id)}
                      disabled={isProcessing}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 cursor-pointer"
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
