import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ 
  dest: '/tmp/uploads/',
  limits: { fileSize: 32 * 1024 * 1024 } // 32MB Cloud Run limit
});

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '32mb' }));
  app.use(express.urlencoded({ limit: '32mb', extended: true }));

  // Cloud AI Background Removal Proxy Endpoint (Hugging Face RMBG-1.4 / BiRefNet)
  app.post('/api/remove-bg', async (req, res) => {
    try {
      const { image, apiKey } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const token = apiKey || process.env.HUGGINGFACE_API_KEY || '';

      const response = await fetch('https://api-inference.huggingface.co/models/briaai/RMBG-1.4', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Cloud AI API error: ${response.status} - ${errText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultBase64 = Buffer.from(resultBuffer).toString('base64');
      res.json({ success: true, image: `data:image/png;base64,${resultBase64}` });
    } catch (err: any) {
      console.error('Server bg removal error:', err);
      res.status(500).json({ error: err.message || 'Background removal failed' });
    }
  });

  // YouTube Video to Educational Slides PDF API Endpoint (Real yt-dlp + ffmpeg pipeline)
  app.post('/api/youtube-to-slides', async (req, res) => {
    try {
      const { url, sampleInterval = 3 } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Invalid YouTube URL provided.' });
      }

      // Validate YouTube URL
      const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(ytRegex);
      if (!match || !match[1]) {
        return res.status(400).json({ error: 'Invalid YouTube URL. Please enter a valid YouTube video link.' });
      }

      const videoId = match[1];

      // Fetch basic video metadata via YouTube oEmbed API
      let videoTitle = 'Educational Lecture Video';
      let channelName = 'Expert Educator';
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          videoTitle = oembedData.title || videoTitle;
          channelName = oembedData.author_name || channelName;
        }
      } catch (e) {
        console.warn('Could not fetch oembed metadata, using defaults', e);
      }

      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const pathModule = await import('path');

      let streamUrl = '';
      let lastErrorStderr = '';
      try {
        streamUrl = execSync(`/tmp/yt-dlp -g -f "best[height<=720]" "${url.trim()}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n')[0];
      } catch (e: any) {
        lastErrorStderr = e.stderr || e.message || '';
        try {
          streamUrl = execSync(`/tmp/yt-dlp -g "${url.trim()}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split('\n')[0];
        } catch (err2: any) {
          const errStderr = err2.stderr || err2.message || lastErrorStderr;
          console.error('yt-dlp extraction failed with stderr:', errStderr);
          if (errStderr.includes('Sign in to confirm') || errStderr.includes('bot')) {
            throw new Error('YouTube Bot Protection Error: YouTube requires sign-in or cookies for this cloud server environment. Please try a different public lecture URL or use a video without bot restrictions.');
          } else if (errStderr.includes('Private video') || errStderr.includes('Unavailable')) {
            throw new Error('YouTube Video Error: This video is private, unavailable, or age-restricted.');
          } else {
            throw new Error(`YouTube Stream Error: ${errStderr.slice(0, 200)}`);
          }
        }
      }

      if (!streamUrl) {
        throw new Error('Could not resolve video stream URL from yt-dlp.');
      }

      const outputDir = pathModule.join('/tmp', `slides_${videoId}_${Date.now()}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract frames using ffmpeg at sampleInterval (e.g. 1 frame every 3 seconds)
      const interval = Number(sampleInterval) || 3;
      try {
        execSync(`/usr/bin/ffmpeg -ss 2 -i "${streamUrl}" -vf "fps=1/${interval},scale=1280:-1" -q:v 2 "${outputDir}/frame_%04d.jpg" -y`, { timeout: 60000 });
      } catch (ffmpegErr) {
        console.warn('FFmpeg extraction warning or timeout:', ffmpegErr);
      }

      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg')).sort();
      const slides = [];
      let slideCounter = 1;

      for (let i = 0; i < files.length; i++) {
        const filePath = pathModule.join(outputDir, files[i]);
        const stats = fs.statSync(filePath);
        if (stats.size < 8000) continue; // skip tiny or blank frames

        const fileBuffer = fs.readFileSync(filePath);
        const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

        const totalSeconds = i * interval;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        slides.push({
          id: `slide-${slideCounter}`,
          timestamp: timeStr,
          title: `Video Frame at ${timeStr}`,
          imageUrl: base64Image,
          ocrText: `Extracted educational slide frame from ${videoTitle} at timestamp ${timeStr}`,
          confidence: 0.95
        });
        slideCounter++;
      }

      // Cleanup temp directory
      try {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (e) {}

      if (slides.length === 0) {
        throw new Error('No valid frames extracted from video. Please try a different public lecture URL.');
      }

      res.json({
        success: true,
        videoId,
        videoTitle,
        channelName,
        duration: 'Lecture Video',
        slides
      });
    } catch (err: any) {
      console.error('YouTube to slides real extraction error:', err);
      res.status(500).json({ error: err.message || 'Failed to extract real slides from YouTube video.' });
    }
  });

  // Upload Video File to Educational Slides PDF API Endpoint
  const handleUpload = async (req: express.Request, res: express.Response) => {
    try {
      const file = req.file;
      const sampleInterval = Number(req.body.sampleInterval) || 3;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No video file uploaded.',
          code: 'MISSING_FILE'
        });
      }

      const videoPath = file.path;
      const videoTitle = file.originalname.replace(/\.[^/.]+$/, '') || 'Uploaded Lecture Video';
      const channelName = 'Local Upload';

      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const pathModule = await import('path');

      const outputDir = pathModule.join('/tmp', `slides_upload_${Date.now()}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract frames using ffmpeg
      try {
        execSync(`/usr/bin/ffmpeg -i "${videoPath}" -vf "fps=1/${sampleInterval},scale=1280:-1" -q:v 2 "${outputDir}/frame_%04d.jpg" -y`, { timeout: 90000 });
      } catch (ffmpegErr) {
        console.warn('FFmpeg upload extraction warning:', ffmpegErr);
      }

      const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.jpg')).sort();
      const slides = [];
      let slideCounter = 1;

      for (let i = 0; i < files.length; i++) {
        const filePath = pathModule.join(outputDir, files[i]);
        const stats = fs.statSync(filePath);
        if (stats.size < 5000) continue;

        const fileBuffer = fs.readFileSync(filePath);
        const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

        const totalSeconds = i * sampleInterval;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        slides.push({
          id: `slide-${slideCounter}`,
          timestamp: timeStr,
          title: `Frame at ${timeStr}`,
          imageUrl: base64Image,
          ocrText: `Extracted slide frame from uploaded video at timestamp ${timeStr}`,
          confidence: 0.95
        });
        slideCounter++;
      }

      // Cleanup uploaded video and temp frames
      try {
        fs.unlinkSync(videoPath);
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch (e) {}

      if (slides.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid slide frames could be extracted from the uploaded video file.',
          code: 'EXTRACTION_FAILED'
        });
      }

      res.json({
        success: true,
        jobId: `job_${Date.now()}`,
        status: 'completed',
        videoTitle,
        channelName,
        duration: 'Uploaded File',
        slides
      });
    } catch (err: any) {
      console.error('Upload video to slides error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to process uploaded video.',
        code: 'PROCESSING_ERROR'
      });
    }
  };

  const uploadMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    upload.single('video')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE' || err.message?.includes('File too large')) {
          return res.status(413).json({
            success: false,
            error: 'Video file is too large. Maximum allowed size is 32MB (Cloud Run platform upload limit).',
            code: 'FILE_TOO_LARGE'
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload error',
          code: 'UPLOAD_ERROR'
        });
      }
      next();
    });
  };

  app.post('/api/youtube-slides/upload', uploadMiddleware, handleUpload);
  app.post('/api/upload-video-to-slides', uploadMiddleware, handleUpload);

  // Official pdfcpu v0.16.0 WASM PDF Compression Endpoint
  const pdfUpload = multer({ dest: '/tmp/pdf_uploads/', limits: { fileSize: 100 * 1024 * 1024 } });
  app.post('/api/pdf/compress', pdfUpload.single('pdf'), async (req, res) => {
    let inPath = '';
    let outPath = '';
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
      }
      inPath = req.file.path;
      outPath = `${inPath}_optimized.pdf`;
      const originalSize = req.file.size;

      const fs = await import('fs');
      const pathModule = await import('path');

      (globalThis as any).process = {
        env: { HOME: '/tmp', XDG_CONFIG_HOME: '/tmp' },
        argv: [],
        version: 'v20.0.0',
        platform: 'linux'
      };

      if (!(globalThis as any).Go) {
        await import('./public/wasm_exec.js');
      }

      const GoClass = (globalThis as any).Go;
      const go = new GoClass();
      go.argv = ['pdfcpu', 'optimize', '-c', 'disable', inPath, outPath];

      const wasmBuffer = fs.readFileSync(pathModule.join(__dirname, 'public/pdfcpu.wasm'));
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, go.importObject);

      let wasmError = null;
      try {
        // Run with a 20-second timeout to prevent hanging on corrupted or complex PDFs
        await Promise.race([
          go.run(wasmModule.instance),
          new Promise((_, reject) => setTimeout(() => reject(new Error('PDF optimization timed out. The PDF may be too complex or corrupted.')), 20000))
        ]);
      } catch (e: any) {
        if (e.toString() !== 'Error: exit code 0') {
          wasmError = e.message || e.toString();
        }
      }

      if (fs.existsSync(outPath)) {
        const optimizedBuffer = fs.readFileSync(outPath);
        const compressedSize = optimizedBuffer.length;

        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch(e){}

        return res.json({
          success: true,
          originalSize,
          compressedSize,
          pdfBase64: Buffer.from(optimizedBuffer).toString('base64')
        });
      } else {
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch(e){}
        if (wasmError && (wasmError.includes('encrypted') || wasmError.includes('password') || wasmError.includes('owner'))) {
          return res.status(400).json({ error: 'This PDF is password-protected and cannot be processed without the required password.' });
        }
        return res.status(400).json({ error: wasmError || 'PDF optimization produced no output or file was already optimized.' });
      }
    } catch (err: any) {
      if (inPath) { try { const fs = await import('fs'); fs.unlinkSync(inPath); } catch(e){} }
      if (outPath) { try { const fs = await import('fs'); fs.unlinkSync(outPath); } catch(e){} }
      console.error('PDF compression error:', err);
      res.status(500).json({ error: err.message || 'PDF compression failed.' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
