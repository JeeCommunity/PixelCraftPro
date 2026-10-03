import { loadGhostscriptWASM } from '@bentopdf/gs-wasm';

let gsInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getGsInstance(baseUrl: string) {
  if (gsInstance) return { gs: gsInstance, initTime: 0 };

  if (initPromise) {
    const t0 = performance.now();
    const gs = await initPromise;
    return { gs, initTime: performance.now() - t0 };
  }

  const t0 = performance.now();
  initPromise = loadGhostscriptWASM({ baseUrl });
  const gs = await initPromise;
  gsInstance = gs;
  return { gs, initTime: performance.now() - t0 };
}

self.onmessage = async (e) => {
  const { type, fileBuffer, compressionMode, baseUrl } = e.data;

  if (type === 'COMPRESS') {
    const timings: Record<string, number> = {};
    const totalStart = performance.now();

    try {
      self.postMessage({ type: 'STATUS', text: 'Loading Ghostscript WASM...' });
      const tInit = performance.now();
      const { gs, initTime } = await getGsInstance(baseUrl || '/gs/',);
      timings.wasmInit = initTime || (performance.now() - tInit);

      self.postMessage({ type: 'STATUS', text: 'Preparing input buffer...' });
      const tTransfer = performance.now();
      const uint8 = new Uint8Array(fileBuffer);
      timings.arrayBufferTransfer = performance.now() - tTransfer;

      self.postMessage({ type: 'STATUS', text: 'Writing to WASM memory...' });
      const tWrite = performance.now();
      const inputPath = '/input.pdf';
      const outputPath = '/output.pdf';

      try { gs.FS.unlink(inputPath); } catch {}
      try { gs.FS.unlink(outputPath); } catch {}

      gs.FS.writeFile(inputPath, uint8);
      timings.fsWrite = performance.now() - tWrite;

      self.postMessage({ type: 'STATUS', text: 'Ghostscript compression running...' });
      const tCall = performance.now();

      let pdfSettings = '/ebook';
      let extraArgs: string[] = [];

      if (compressionMode === 'safe') {
        pdfSettings = '/prepress';
      } else if (compressionMode === 'balanced') {
        pdfSettings = '/ebook';
      } else if (compressionMode === 'maximum') {
        pdfSettings = '/screen';
        extraArgs = [
          '-dColorImageDownsampleType=/Average',
          '-dColorImageResolution=125',
          '-dGrayImageResolution=125',
          '-dMonoImageResolution=125'
        ];
      }

      const args = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        `-dPDFSETTINGS=${pdfSettings}`,
        ...extraArgs,
        '-dNOPAUSE',
        '-dBATCH',
        '-dSAFER',
        `-sOutputFile=${outputPath}`,
        inputPath
      ];

      const exitCode = gs.callMain(args);
      timings.callMain = performance.now() - tCall;

      if (exitCode !== 0) {
        throw new Error(`Ghostscript exited with code ${exitCode}`);
      }

      self.postMessage({ type: 'STATUS', text: 'Reading compressed output...' });
      const tRead = performance.now();
      let outputBytes: Uint8Array;
      try {
        outputBytes = gs.FS.readFile(outputPath);
      } catch (err) {
        throw new Error('Ghostscript produced no output file.');
      }
      timings.fsRead = performance.now() - tRead;

      // Cleanup FS immediately
      try {
        gs.FS.unlink(inputPath);
        gs.FS.unlink(outputPath);
      } catch {}

      timings.total = performance.now() - totalStart;

      const outBuf = outputBytes.buffer;
      self.postMessage({
        type: 'SUCCESS',
        outputBuffer: outBuf,
        timings
      });

    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        message: err.message || 'Ghostscript compression failed.'
      });
    }
  }
};
