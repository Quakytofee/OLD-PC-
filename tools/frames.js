'use strict';

// Pull still frames out of a video so they can actually be looked at.
// This is what makes editing decisions real rather than guesswork.
//
//   node tools/frames.js <video> --out <dir> --every 10
//   node tools/frames.js <video> --out <dir> --scenes
//
// --every N   one frame every N seconds (default 10)
// --scenes    instead, grab a frame wherever the picture changes a lot,
//             which finds natural cut points
// --width W   thumbnail width, default 640

const fs = require('fs');
const path = require('path');
const { ffmpeg, run, probe } = require('./lib');

function parseArgs(argv) {
  const opts = { every: 10, width: 640, scenes: false, threshold: 0.3 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--scenes') opts.scenes = true;
    else if (a === '--every') opts.every = parseFloat(argv[++i]);
    else if (a === '--width') opts.width = parseInt(argv[++i], 10);
    else if (a === '--threshold') opts.threshold = parseFloat(argv[++i]);
    else if (a === '--out') opts.out = argv[++i];
    else if (a.startsWith('--')) throw new Error(`Unknown option: ${a}`);
    else rest.push(a);
  }
  opts.input = rest[0];
  return opts;
}

// Timestamps are burned into each frame so a still can be traced straight back
// to a position in the source - that position becomes an in/out point later.
function drawTimestamp(width) {
  const fontSize = Math.max(16, Math.round(width / 32));
  const parts = [
    `drawtext=text='%{pts\\:hms}'`,
    `fontcolor=white`,
    `fontsize=${fontSize}`,
    `box=1:boxcolor=black@0.6:boxborderw=6`,
    `x=10:y=10`,
  ];

  // Name a font explicitly where we can. Without one drawtext falls back to
  // fontconfig, which has no default config on Windows and sizes unpredictably.
  // The drive colon has to be escaped or drawtext reads it as an option break.
  const font = ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf']
    .find((f) => fs.existsSync(f));
  if (font) parts.push(`fontfile='${font.replace(':', '\\\\:')}'`);

  return parts.join(':');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.input) {
    console.error('Usage: node tools/frames.js <video> --out <dir> [--every 10 | --scenes]');
    process.exit(1);
  }

  const info = probe(opts.input);
  if (!info.hasVideo) {
    console.error(`${info.name} has no picture track - nothing to extract.`);
    process.exit(1);
  }

  const outDir = path.resolve(
    opts.out || path.join(path.dirname(opts.input), 'frames')
  );
  fs.mkdirSync(outDir, { recursive: true });

  const filters = [];
  if (opts.scenes) {
    // Only frames where the picture changes sharply, i.e. probable cut points.
    filters.push(`select='gt(scene,${opts.threshold})'`);
  } else {
    filters.push(`fps=1/${opts.every}`);
  }
  filters.push(`scale=${opts.width}:-2`);
  filters.push(drawTimestamp(opts.width));

  const pattern = path.join(outDir, opts.scenes ? 'scene_%04d.jpg' : 'frame_%04d.jpg');

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', info.path,
    '-vf', filters.join(','),
    // Required with select/fps, otherwise ffmpeg duplicates frames to fill the
    // gaps between the ones we asked for. "-vsync 0" rather than the newer
    // "-fps_mode passthrough": the bundled build predates that flag, and -vsync
    // is still accepted by current versions.
    '-vsync', '0',
    '-q:v', '3',
    pattern,
  ];

  console.log(`Reading ${info.name} (${info.duration.toFixed(1)}s)...`);
  run(ffmpeg(), args);

  const written = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort();

  // Map each extracted still back to its position in the source.
  const index = written.map((file, i) => ({
    file,
    approxSeconds: opts.scenes ? null : +(i * opts.every).toFixed(2),
  }));
  fs.writeFileSync(
    path.join(outDir, 'index.json'),
    JSON.stringify({ source: info.path, mode: opts.scenes ? 'scenes' : 'interval', every: opts.every, frames: index }, null, 2)
  );

  console.log(`Wrote ${written.length} stills to ${outDir}`);
  if (!opts.scenes && written.length) {
    console.log(`Each one is ${opts.every}s apart; the time is printed on the image.`);
  }
}

main();
