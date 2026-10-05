const multer = require('multer');
const path = require('path');
const { HttpError } = require('./http');

const ALLOWED = ['.pdf', '.docx'];
const base = { storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => ALLOWED.includes(path.extname(file.originalname).toLowerCase())
    ? cb(null, true) : cb(new HttpError(400, 'Only PDF and DOCX resumes are supported.')) };

const resumeUpload = multer(base);
const profileUpload = multer({ ...base, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Extension alone is spoofable: also check the file signature (PDF "%PDF", DOCX zip "PK\x03\x04").
function verifyResume(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const b = file.buffer || Buffer.alloc(0);
  const ok = ext === '.pdf' ? b.subarray(0, 1024).includes('%PDF') : ext === '.docx' ? b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4 : false;
  if (!ok) throw new HttpError(400, 'The file content does not match its type.');
}
module.exports = { resumeUpload, profileUpload, verifyResume };
