'use strict';

// Render an edit.json straight to a finished MP4, so the cut can be checked
// without opening Resolve at all.
//
//   node tools/render.js projects/myjob/edit.json
//   node tools/render.js projects/myjob/edit.json --out out/preview.mp4 --draft
//
// --draft   half-size, fast encode - good for checking the cuts land right
// --crf N   quality, lower is better (default 20; 28 in draft)

const fs = require('fs');
const path = require('path');
const { ffmpeg, run, probe, loadEdit } = require('./lib');

function parseArgs(argv) {
  const opts = { draft: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--draft') opts.draft = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--crf') opts.crf = parseInt(argv[++i], 10);
    else if (a.startsWith('--')) throw new Error(`Unknown option: ${a}`);
    else rest.push(a);
  }
  opts.edit = rest[0];
  return opts;
}

function build(edit, opts) {
  const [fpsNum, fpsDen] = edit.fps.split('/').map(Number);
  let [width, height] = edit.resolution;
  if (opts.draft) {
    // Half size, rounded down to an even number - h264 requires even dimensions.
    const half = (n) => Math.max(2, Math.floor(n / 2 / 2) * 2);
    width = half(width);
    height = half(height);
  }

  const infoCache = new Map();
  const infoFor = (src) => {
    if (!infoCache.has(src)) infoCache.set(src, probe(src));
    return infoCache.get(src);
  };

  const args = ['-hide_banner', '-loglevel', 'error', '-stats', '-y'];

  // One input per clip, seeking with -ss/-t *before* -i. Trimming inside the
  // filter graph instead would force a decode from the start of the file for
  // every clip - on a 90 minute source that is the difference between seconds
  // and many minutes. Placed before -i, ffmpeg seeks to the nearest keyframe
  // and decodes forward to the exact frame, so this stays frame-accurate.
  edit.clips.forEach((clip) => {
    args.push(
      '-ss', clip.in.toFixed(6),
      '-t', (clip.out - clip.in).toFixed(6),
      '-i', clip.src
    );
  });

  // A silent source to stand in for clips whose file has no audio track, so
  // concat always receives a matching pair of streams.
  const needsSilence = edit.clips.some((c) => !infoFor(c.src).hasAudio);
  const silenceIndex = edit.clips.length;
  if (needsSilence) {
    args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
  }

  const filters = [];
  const concatInputs = [];

  edit.clips.forEach((clip, i) => {
    const meta = infoFor(clip.src);

    // Every segment is forced to the same size, rate and pixel format before
    // concat - mismatched segments make the filter fail or produce garbage.
    filters.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
        `setsar=1,fps=${fpsNum}/${fpsDen},format=yuv420p,setpts=PTS-STARTPTS[v${i}]`
    );

    if (meta.hasAudio) {
      filters.push(
        `[${i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
          `asetpts=PTS-STARTPTS[a${i}]`
      );
    } else {
      const dur = (clip.out - clip.in).toFixed(6);
      filters.push(
        `[${silenceIndex}:a]atrim=start=0:end=${dur},asetpts=PTS-STARTPTS,` +
          `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${i}]`
      );
    }

    concatInputs.push(`[v${i}][a${i}]`);
  });

  filters.push(
    `${concatInputs.join('')}concat=n=${edit.clips.length}:v=1:a=1[outv][outa]`
  );

  const crf = opts.crf ?? (opts.draft ? 28 : 20);

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', opts.draft ? 'veryfast' : 'medium',
    '-crf', String(crf),
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart'
  );

  return { args, width, height };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.edit) {
    console.error('Usage: node tools/render.js <edit.json> [--out <file.mp4>] [--draft]');
    process.exit(1);
  }

  const editPath = path.resolve(opts.edit);
  const edit = loadEdit(editPath);

  const outPath = path.resolve(
    opts.out || path.join(path.dirname(editPath), 'out', `${edit.name}${opts.draft ? '_draft' : ''}.mp4`)
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const { args, width, height } = build(edit, opts);
  args.push(outPath);

  const total = edit.clips.reduce((sum, c) => sum + (c.out - c.in), 0);
  console.log(
    `Rendering ${edit.clips.length} clip(s), ${total.toFixed(2)}s, ` +
      `${width}x${height} @ ${edit.fps}${opts.draft ? ' (draft)' : ''}...`
  );

  run(ffmpeg(), args, { stdio: ['ignore', 'inherit', 'inherit'] });

  const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`\nWrote ${outPath}  (${mb} MB)`);
}

main();
