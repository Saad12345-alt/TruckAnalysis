import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

// This controller only reads an uploaded document and returns suggested form
// values. It never touches the database, the models or the trip controllers.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_FILE_BYTES = 10 * 1024 * 1024; // keeps the base64 request to Gemini well under its limit
const TIMEOUT_MS = 60_000;
const MAX_PARALLEL = 3; // each upload starts a Python process, so cap how many run at once
let running = 0;

// Resolved on every call so values from .env are picked up whenever dotenv loads.
const localPython = () =>
  path.resolve(__dirname, '../../.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const pythonBin = () =>
  process.env.PYTHON_BIN ||
  (existsSync(localPython()) ? localPython() : process.platform === 'win32' ? 'python' : 'python3');
const scriptPath = () => process.env.OCR_SCRIPT_PATH || path.resolve(__dirname, '../ocr/extract.py');

// Keep the file in memory: nothing is written to disk, so there is nothing to clean up.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 3, fieldSize: 100 * 1024 },
}).single('file');

export const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File is too large (max 10 MB).' });
    }
    return res.status(400).json({ message: 'Could not read the upload. Send a single file.' });
  });
};

// Decide the real file type from its first bytes instead of trusting the
// browser-supplied Content-Type.
function sniffMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 1024).includes('%PDF-')) return 'application/pdf';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buf.toString('latin1', 8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
  }
  return null;
}

// The browser sends the driver names / plates it already loaded so the model can
// spell them the way your database does. Treated as untrusted: type-check and cap.
function parseHints(raw) {
  const list = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200).map((x) => x.slice(0, 60)) : [];
  try {
    const parsed = JSON.parse(raw || '{}');
    return { drivers: list(parsed.drivers), vehicles: list(parsed.vehicles) };
  } catch {
    return { drivers: [], vehicles: [] };
  }
}

// Runs extract.py, feeding it one JSON object on stdin and reading one back from stdout.
function runExtractor(payload) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const child = spawn(pythonBin(), [scriptPath()], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ status: 504, message: 'Reading the document took too long. Try again.' });
    }, TIMEOUT_MS);

    const out = [];
    let outSize = 0;
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      outSize += chunk.length;
      if (outSize <= 2 * 1024 * 1024) out.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    child.on('error', (err) => {
      console.error('OCR: could not start Python:', err.message);
      finish({
        status: 503,
        message: 'Document reading is not set up: Python was not found on the server (set PYTHON_BIN).',
      });
    });

    child.on('close', () => {
      if (stderr.trim()) console.error('OCR (python):', stderr.trim());
      let result;
      try {
        result = JSON.parse(Buffer.concat(out).toString('utf8'));
      } catch {
        return finish({ status: 500, message: 'The document reader failed. Check the server log.' });
      }
      finish({ result });
    });

    child.stdin.on('error', () => {}); // the child may exit before reading everything
    child.stdin.end(JSON.stringify(payload));
  });
}

const ERROR_STATUS = {
  bad_input: 422,
  unreadable_file: 422,
  no_result: 422,
  bad_output: 502,
  rate_limited: 429,
  upstream_error: 502,
};

export const extractFromDocument = async (req, res) => {
  res.set('Cache-Control', 'no-store');

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Choose a photo, scan or PDF.' });
  }

  const mime = sniffMime(req.file.buffer);
  if (!mime) {
    return res.status(415).json({ message: 'Unsupported file type. Upload a JPG, PNG, WEBP, HEIC or PDF.' });
  }

  if (running >= MAX_PARALLEL) {
    return res.status(429).json({ message: 'The reader is busy. Try again in a few seconds.' });
  }

  running += 1;
  try {
    const outcome = await runExtractor({
      mime,
      data: req.file.buffer.toString('base64'),
      hints: parseHints(req.body?.hints),
    });

    if (outcome.message) {
      return res.status(outcome.status).json({ message: outcome.message });
    }

    const { result } = outcome;
    if (!result?.ok) {
      console.error('OCR failed:', result?.code, result?.error);
      // Anything not listed above (missing key, missing package, bad key, no model) is a setup problem.
      const status = ERROR_STATUS[result?.code] || 503;
      return res.status(status).json({ message: result?.error || 'The document reader failed.' });
    }

    return res.json({
      fields: result.fields,
      uncertain: result.uncertain,
      multiple_trips: result.multiple_trips,
    });
  } catch (error) {
    console.error('OCR error:', error);
    return res.status(500).json({ message: 'The document reader failed.' });
  } finally {
    running -= 1;
  }
};