import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RefreshCw, AlertCircle, Trash2, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, Loader2, AlertTriangle, Clock } from 'lucide-react';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  arrayBuffer: ArrayBuffer;
  status: 'validating' | 'valid' | 'invalid';
  error?: string;
}

export const ImageToPdf: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Fit'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<string>('');
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [resultName, setResultName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const validateImageItem = async (file: File, previewUrl: string, arrayBuffer: ArrayBuffer): Promise<{ isValid: boolean; error?: string }> => {
    try {
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return { isValid: false, error: 'File is empty or unreadable.' };
      }
      const bytes = new Uint8Array(arrayBuffer);
      let isSupported = false;

      if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        isSupported = true;
      } else if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        isSupported = true;
      } else if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        isSupported = true;
      } else if (file.type && file.type.startsWith('image/')) {
        isSupported = true;
      }

      if (!isSupported) {
        return { isValid: false, error: 'Unsupported file format or invalid image signature.' };
      }

      await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = resolve;
        img.onerror = () => reject(new Error('Image decoding failed (corrupted or unsupported format).'));
        img.src = previewUrl;
      });

      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message || 'This image cannot be added to the PDF.' };
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setResultUrl(null);
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp)$/i));
    if (fileArray.length === 0) return;

    setIsLoadingFiles(true);
    const newItems: ImageItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setLoadProgress(`Reading image ${i + 1} of ${fileArray.length} (${file.name})...`);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const previewUrl = URL.createObjectURL(file);
        
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          previewUrl,
          arrayBuffer,
          status: 'validating'
        });
      } catch (err: any) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    setIsLoadingFiles(false);
    setLoadProgress('');

    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);

      newItems.forEach(async (item) => {
        const validation = await validateImageItem(item.file, item.previewUrl, item.arrayBuffer);
        setImages((currentImages) =>
          currentImages.map((img) =>
            img.id === item.id
              ? {
                  ...img,
                  status: validation.isValid ? 'valid' : 'invalid',
                  error: validation.error
                }
              : img
          )
        );
      });
    }
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

  const invalidImagesCount = images.filter((img) => img.status === 'invalid').length;
  const validatingImagesCount = images.filter((img) => img.status === 'validating').length;

  const generatePdf = async () => {
    if (images.length === 0) {
      setErrorMsg('Please select at least one image.');
      return;
    }

    if (invalidImagesCount > 0) {
      setErrorMsg('Remove the highlighted image(s) before generating the PDF.');
      return;
    }

    if (validatingImagesCount > 0) {
      setErrorMsg('Please wait for all images to finish validating.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    setElapsedSeconds(0);
    setProgressText(`Initializing PDF generator (0% - 0 of ${images.length})...`);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    await new Promise((resolve) => setTimeout(resolve, 40));

    try {
      const { PDFDocument } = await import('pdf-lib');
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

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const percent = Math.round(((i + 1) / images.length) * 100);
        setProgressText(`Processing image ${i + 1} of ${images.length} (${percent}%) — ${item.file.name}`);

        if (i % 2 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        if (item.status === 'invalid') {
          throw new Error(`Problem detected with "${item.file.name}". Remove it to continue.`);
        }

        let pdfImage;
        const mimeType = item.file.type.toLowerCase();

        const renderCanvasToJpeg = async (): Promise<ArrayBuffer> => {
          const img = new window.Image();
          img.src = item.previewUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error(`Failed to decode image ${item.file.name}`));
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.width || 800;
          canvas.height = img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          }
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const res = await fetch(jpegDataUrl);
          return await res.arrayBuffer();
        };

        try {
          if (mimeType === 'image/png') {
            try {
              pdfImage = await pdfDoc.embedPng(item.arrayBuffer);
            } catch (pngErr) {
              const jpegBuf = await renderCanvasToJpeg();
              pdfImage = await pdfDoc.embedJpg(jpegBuf);
            }
          } else if (mimeType === 'image/webp') {
            try {
              const jpegBuf = await renderCanvasToJpeg();
              pdfImage = await pdfDoc.embedJpg(jpegBuf);
            } catch (wErr) {
              pdfImage = await pdfDoc.embedJpg(item.arrayBuffer);
            }
          } else {
            try {
              pdfImage = await pdfDoc.embedJpg(item.arrayBuffer);
            } catch (jpgErr) {
              const jpegBuf = await renderCanvasToJpeg();
              pdfImage = await pdfDoc.embedJpg(jpegBuf);
            }
          }
        } catch (embedErr) {
          const jpegBuf = await renderCanvasToJpeg();
          pdfImage = await pdfDoc.embedJpg(jpegBuf);
        }

        const imgWidth = pdfImage.width;
        const imgHeight = pdfImage.height;

        let curWidth = pageWidth;
        let curHeight = pageHeight;

        if (pageSize === 'Fit') {
          curWidth = imgWidth;
          curHeight = imgHeight;
        }

        const page = pdfDoc.addPage([curWidth, curHeight]);
        const margin = pageSize === 'Fit' ? 0 : 40;
        const usableWidth = curWidth - margin * 2;
        const usableHeight = curHeight - margin * 2;

        const imgAspect = imgWidth / imgHeight;
        const usableAspect = usableWidth / usableHeight;

        let drawWidth = usableWidth;
        let drawHeight = usableWidth / imgAspect;

        if (drawHeight > usableHeight) {
          drawHeight = usableHeight;
          drawWidth = usableHeight * imgAspect;
        }

        const x = margin + (usableWidth - drawWidth) / 2;
        const y = margin + (usableHeight - drawHeight) / 2;

        page.drawImage(pdfImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });
      }

      setProgressText('Finalizing PDF document...');
      const pdfBytes = await pdfDoc.save();
      if (timerRef.current) clearInterval(timerRef.current);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const fileName = `converted_images_${Date.now()}.pdf`;

      setResultUrl(url);
      setResultSize(blob.size);
      setResultName(fileName);
      setTotalPages(images.length);
      setProgressText('PDF generated successfully');
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.error('PDF Generation Error:', err);
      setErrorMsg(err.message || 'Failed to generate PDF.');
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Client-Side PDF Generator & Live Status</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Image to PDF</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Convert multiple images into a professional PDF document with real-time progress indicators and live timers.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {invalidImagesCount > 0 && (
        <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3 text-rose-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>Remove the highlighted image(s) ({invalidImagesCount} problematic) before generating the PDF.</span>
        </div>
      )}

      {isLoadingFiles && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 flex items-center gap-3 text-indigo-300 text-sm animate-pulse">
          <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
          <span className="font-medium">{loadProgress}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">PDF Options</h3>
            {images.length > 0 && !isProcessing && (
              <button
                onClick={() => { setImages([]); setResultUrl(null); setErrorMsg(null); }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div
            onClick={() => !isLoadingFiles && !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/50 rounded-xl p-5 text-center transition-all ${isLoadingFiles || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Select Images (JPG, PNG, WebP)</p>
            <p className="text-xs text-slate-400">Multiple image files</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Page Size</label>
              <select
                disabled={isProcessing}
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            )}
          </div>

          <button
            onClick={generatePdf}
            disabled={images.length === 0 || isProcessing || isLoadingFiles || invalidImagesCount > 0 || validatingImagesCount > 0}
            className={`w-full py-3.5 px-4 font-semibold rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
              invalidImagesCount > 0
                ? 'bg-rose-900/50 text-rose-300 border border-rose-500/50 cursor-not-allowed'
                : isProcessing
                ? 'bg-amber-600 text-white shadow-amber-600/30 cursor-wait animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 cursor-pointer disabled:opacity-50'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">{progressText || 'Generating PDF...'}</span>
              </>
            ) : invalidImagesCount > 0 ? (
              <span>Remove problematic image(s) to continue</span>
            ) : validatingImagesCount > 0 ? (
              <span>Validating images ({validatingImagesCount})...</span>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Generate PDF ({images.length} images)</span>
              </>
            )}
          </button>

          {isProcessing && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="font-medium flex items-center gap-1.5 text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                  <span>{progressText}</span>
                </span>
                <span className="text-indigo-400 font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{elapsedSeconds}s</span>
                </span>
              </div>
            </div>
          )}

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">💡 Capacity Information:</p>
            <p>You can comfortably convert up to 200+ images in a single batch.</p>
          </div>

          {resultUrl && (
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
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Selected Images ({images.length})</h3>
            {images.length > 0 && !isProcessing && (
              <button
                onClick={() => { setImages([]); setResultUrl(null); }}
                className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {images.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">No images selected yet. Upload JPG, PNG, or WebP files.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`relative group bg-slate-950 border rounded-xl p-3 flex flex-col items-center justify-between gap-3 transition-all ${
                    img.status === 'invalid'
                      ? 'border-rose-500/80 bg-rose-500/10'
                      : img.status === 'validating'
                      ? 'border-amber-500/50 animate-pulse'
                      : 'border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="w-full h-28 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      className="w-full h-full object-cover"
                    />
                    {img.status === 'validating' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="text-center w-full">
                    <p className="text-xs font-semibold text-white truncate px-1">{img.file.name}</p>
                    <p className="text-[10px] text-slate-400">{formatSize(img.file.size)}</p>
                    {img.status === 'invalid' && (
                      <p className="text-[10px] text-rose-400 mt-1 font-medium">{img.error || 'Invalid image'}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0 || isProcessing}
                        className="p-1 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-xs"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1 || isProcessing}
                        className="p-1 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-xs"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeImage(img.id)}
                      disabled={isProcessing}
                      className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-30 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-300">
                    #{idx + 1}
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
