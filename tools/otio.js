'use strict';

// Backup timeline format. Resolve Free imports both FCPXML and OpenTimelineIO
// (File > Import > Timeline), so if one is rejected the other is the fallback.
// OTIO is plain JSON, so no library is needed to write it.
//
//   node tools/otio.js projects/myjob/edit.json

const fs = require('fs');
const path = require('path');
const { probe, loadEdit, fileUrl, parseFps, secondsToFrames } = require('./lib');

function parseArgs(argv) {
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') opts.out = argv[++i];
    else if (argv[i].startsWith('--')) throw new Error(`Unknown option: ${argv[i]}`);
    else rest.push(argv[i]);
  }
  opts.edit = rest[0];
  return opts;
}

const rationalTime = (frames, rate) => ({
  OTIO_SCHEMA: 'RationalTime.1',
  rate,
  value: frames,
});

const timeRange = (startFrames, durationFrames, rate) => ({
  OTIO_SCHEMA: 'TimeRange.1',
  start_time: rationalTime(startFrames, rate),
  duration: rationalTime(durationFrames, rate),
});

function build(edit) {
  const { fpsNum, fpsDen } = parseFps(edit.fps);
  const rate = fpsNum / fpsDen;

  const infoCache = new Map();
  const infoFor = (src) => {
    if (!infoCache.has(src)) infoCache.set(src, probe(src));
    return infoCache.get(src);
  };

  const children = edit.clips.map((clip) => {
    const info = infoFor(clip.src);
    const srcRate = info.fpsNum / info.fpsDen;

    const inFrames = secondsToFrames(clip.in, info.fps);
    const outFrames = secondsToFrames(clip.out, info.fps);
    const lengthFrames = Math.max(1, outFrames - inFrames);
    const totalFrames = secondsToFrames(info.duration, info.fps);

    return {
      OTIO_SCHEMA: 'Clip.1',
      name: clip.name || path.parse(info.name).name,
      source_range: timeRange(inFrames, lengthFrames, srcRate),
      media_reference: {
        OTIO_SCHEMA: 'ExternalReference.1',
        name: info.name,
        target_url: fileUrl(info.path),
        available_range: timeRange(0, totalFrames, srcRate),
      },
    };
  });

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: edit.name,
    global_start_time: rationalTime(0, rate),
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'tracks',
      children: [
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'V1',
          kind: 'Video',
          children,
        },
      ],
    },
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.edit) {
    console.error('Usage: node tools/otio.js <edit.json> [--out <file.otio>]');
    process.exit(1);
  }

  const editPath = path.resolve(opts.edit);
  const edit = loadEdit(editPath);
  const timeline = build(edit);

  const outPath = path.resolve(
    opts.out || path.join(path.dirname(editPath), 'out', `${edit.name}.otio`)
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(timeline, null, 2), 'utf8');

  console.log(`Wrote ${outPath}`);
  console.log(`  ${edit.clips.length} clip(s) on one video track`);
  console.log('');
  console.log('Backup format - use this only if the .fcpxml is rejected.');
}

main();
