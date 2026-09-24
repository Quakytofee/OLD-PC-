'use strict';

// Shared helpers for the video tools.
// No npm dependencies - Node standard library plus FFmpeg on disk.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Locating FFmpeg
// ---------------------------------------------------------------------------

// FFmpeg is installed from npm rather than winget/GitHub here: GitHub's release
// CDN measured ~8 KB/s from this machine against npm's ~205 KB/s. The installer
// packages ship the binaries directly, so this is just a local file lookup.
//
// Falls back to PATH and the usual system install locations, so the tools keep
// working if FFmpeg is later installed properly system-wide.
function findBinary(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;

  const npmPackage = `@${name}-installer/${name}`;
  try {
    const installed = require(npmPackage);
    if (installed && installed.path && fs.existsSync(installed.path)) {
      return installed.path;
    }
  } catch {
    // Not installed from npm - fall through to PATH and system locations.
  }

  const onPath = spawnSync(exe, ['-version'], { encoding: 'utf8' });
  if (!onPath.error) return exe;

  const candidates = [];

  const wingetPkgs = path.join(
    process.env.LOCALAPPDATA || '',
    'Microsoft',
    'WinGet',
    'Packages'
  );
  if (fs.existsSync(wingetPkgs)) {
    for (const pkg of fs.readdirSync(wingetPkgs)) {
      if (!/ffmpeg/i.test(pkg)) continue;
      const pkgDir = path.join(wingetPkgs, pkg);
      // winget unpacks into a versioned subfolder, e.g. ffmpeg-8.1.2-full_build/bin
      candidates.push(path.join(pkgDir, 'bin', exe));
      for (const sub of fs.readdirSync(pkgDir)) {
        candidates.push(path.join(pkgDir, sub, 'bin', exe));
      }
    }
  }

  candidates.push(
    path.join(process.env.ProgramFiles || '', 'ffmpeg', 'bin', exe),
    path.join('C:', 'ffmpeg', 'bin', exe)
  );

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  throw new Error(
    `Could not find ${name}. From the project folder, run:\n` +
      `  npm install\n` +
      `(or install FFmpeg system-wide and make sure it is on PATH).`
  );
}

let _ffmpeg = null;
let _ffprobe = null;
const ffmpeg = () => (_ffmpeg ||= findBinary('ffmpeg'));
const ffprobe = () => (_ffprobe ||= findBinary('ffprobe'));

function run(bin, args, opts = {}) {
  const res = spawnSync(bin, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(
      `${path.basename(bin)} failed (exit ${res.status}):\n${res.stderr || res.stdout}`
    );
  }
  return res.stdout;
}

// ---------------------------------------------------------------------------
// Probing
// ---------------------------------------------------------------------------

// Returns the useful facts about a media file, with frame rate kept as an exact
// rational. 29.97 is really 30000/1001 - rounding it desynchronises timelines.
function probe(file) {
  if (!fs.existsSync(file)) throw new Error(`No such file: ${file}`);

  const raw = run(ffprobe(), [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    file,
  ]);
  const data = JSON.parse(raw);

  const video = data.streams.find((s) => s.codec_type === 'video');
  const audio = data.streams.find((s) => s.codec_type === 'audio');

  let fpsNum = 30, fpsDen = 1;
  if (video) {
    const rate = video.avg_frame_rate && video.avg_frame_rate !== '0/0'
      ? video.avg_frame_rate
      : video.r_frame_rate;
    const [n, d] = String(rate).split('/').map(Number);
    if (n > 0 && d > 0) { fpsNum = n; fpsDen = d; }
  }

  return {
    path: path.resolve(file),
    name: path.basename(file),
    duration: parseFloat(data.format.duration) || 0,
    sizeBytes: parseInt(data.format.size, 10) || 0,
    hasVideo: Boolean(video),
    hasAudio: Boolean(audio),
    width: video ? video.width : 0,
    height: video ? video.height : 0,
    videoCodec: video ? video.codec_name : null,
    fps: `${fpsNum}/${fpsDen}`,
    fpsNum,
    fpsDen,
    fpsApprox: +(fpsNum / fpsDen).toFixed(3),
    audioCodec: audio ? audio.codec_name : null,
    audioChannels: audio ? audio.channels : 0,
    audioRate: audio ? parseInt(audio.sample_rate, 10) : 0,
  };
}

// ---------------------------------------------------------------------------
// Rational frame-based time
// ---------------------------------------------------------------------------

// FCPXML expresses every time as a rational ending in "s". Working in whole
// frames and only converting at the end keeps every value exactly on a frame
// boundary, which is what stops Resolve rejecting or misaligning the timeline.

function parseFps(fps) {
  const [num, den] = String(fps).split('/').map(Number);
  if (!num || !den) throw new Error(`Bad frame rate: ${fps}`);
  return { fpsNum: num, fpsDen: den };
}

const secondsToFrames = (sec, fps) => {
  const { fpsNum, fpsDen } = parseFps(fps);
  return Math.round((sec * fpsNum) / fpsDen);
};

// N frames -> "N*fpsDen/fpsNum s", reduced.
function framesToRational(frames, fps) {
  const { fpsNum, fpsDen } = parseFps(fps);
  if (frames === 0) return '0s';
  let num = frames * fpsDen;
  let den = fpsNum;
  const g = gcd(num, den);
  num /= g;
  den /= g;
  return den === 1 ? `${num}s` : `${num}/${den}s`;
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

// frameDuration is the inverse of the frame rate: 30000/1001 fps -> 1001/30000s
function frameDuration(fps) {
  const { fpsNum, fpsDen } = parseFps(fps);
  const g = gcd(fpsDen, fpsNum);
  return `${fpsDen / g}/${fpsNum / g}s`;
}

// ---------------------------------------------------------------------------
// Paths and XML
// ---------------------------------------------------------------------------

// "C:\Haithem AI\x.mp4" -> "file:///C:/Haithem%20AI/x.mp4"
// Spaces and backslashes here are the usual cause of media importing offline.
function fileUrl(p) {
  const abs = path.resolve(p).replace(/\\/g, '/');
  const drive = abs.match(/^([A-Za-z]):\/(.*)$/);
  if (drive) {
    const segs = drive[2].split('/').map(encodeURIComponent).join('/');
    return `file:///${drive[1]}:/${segs}`;
  }
  return 'file://' + abs.split('/').map(encodeURIComponent).join('/');
}

const xmlEscape = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// ---------------------------------------------------------------------------
// edit.json
// ---------------------------------------------------------------------------

function loadEdit(file) {
  const edit = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (!Array.isArray(edit.clips) || edit.clips.length === 0) {
    throw new Error(`${file}: "clips" must be a non-empty array`);
  }

  const dir = path.dirname(path.resolve(file));
  edit.clips.forEach((clip, i) => {
    if (!clip.src) throw new Error(`clip ${i}: missing "src"`);
    clip.src = path.resolve(dir, clip.src);
    if (!fs.existsSync(clip.src)) {
      throw new Error(`clip ${i}: file not found: ${clip.src}`);
    }
    if (typeof clip.in !== 'number' || typeof clip.out !== 'number') {
      throw new Error(`clip ${i}: "in" and "out" must be numbers (seconds)`);
    }
    if (clip.out <= clip.in) {
      throw new Error(`clip ${i}: "out" (${clip.out}) must be after "in" (${clip.in})`);
    }
  });

  // Default the timeline to match the first source, so a single-source edit
  // needs no manual format fields at all.
  const first = probe(edit.clips[0].src);
  edit.name ||= path.basename(file, '.json');
  edit.fps ||= first.fps;
  edit.resolution ||= [first.width, first.height];

  return edit;
}

module.exports = {
  ffmpeg, ffprobe, run, probe,
  parseFps, secondsToFrames, framesToRational, frameDuration,
  fileUrl, xmlEscape, loadEdit,
};
