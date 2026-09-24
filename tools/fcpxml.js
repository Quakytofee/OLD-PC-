'use strict';

// Turn an edit.json into a timeline file DaVinci Resolve can import.
// This is the route that works on Resolve Free: Resolve's scripting bridge is
// Studio-only since 19.1, but File > Import > Timeline is not.
//
//   node tools/fcpxml.js projects/myjob/edit.json
//   node tools/fcpxml.js projects/myjob/edit.json --out projects/myjob/out/myjob.fcpxml

const fs = require('fs');
const path = require('path');
const {
  probe, loadEdit, fileUrl, xmlEscape,
  secondsToFrames, framesToRational, frameDuration,
} = require('./lib');

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

// Resolve matches incoming timelines against these names, so give it ones it
// recognises where we can. Anything unrecognised still imports fine.
function formatName(width, height, fpsApprox) {
  const rate = Number.isInteger(fpsApprox)
    ? String(fpsApprox)
    : fpsApprox.toFixed(2).replace('.', '');
  return `FFVideoFormat${height}p${rate}`;
}

function build(edit) {
  const tlFps = edit.fps;
  const [tlWidth, tlHeight] = edit.resolution;

  // ---- resources -------------------------------------------------------
  // One <format> per distinct shape, one <asset> per distinct source file.
  const formats = new Map();
  const assets = new Map();
  let nextId = 1;
  const id = () => `r${nextId++}`;

  function formatId(width, height, fps) {
    const key = `${width}x${height}@${fps}`;
    if (!formats.has(key)) {
      const [n, d] = fps.split('/').map(Number);
      formats.set(key, {
        id: id(),
        width, height, fps,
        name: formatName(width, height, n / d),
      });
    }
    return formats.get(key).id;
  }

  // The sequence's own format is registered first so it exists even when no
  // clip happens to match the timeline shape.
  const seqFormatId = formatId(tlWidth, tlHeight, tlFps);

  for (const clip of edit.clips) {
    if (assets.has(clip.src)) continue;
    const info = probe(clip.src);
    assets.set(clip.src, {
      id: id(),
      info,
      formatId: formatId(info.width || tlWidth, info.height || tlHeight, info.fps),
    });
  }

  // ---- spine -----------------------------------------------------------
  // Everything is computed in whole frames and only turned into a rational at
  // the point of writing, so no value can land off a frame boundary.
  let playhead = 0; // frames on the timeline
  const spine = edit.clips.map((clip) => {
    const asset = assets.get(clip.src);
    const srcFps = asset.info.fps;

    const inFrames = secondsToFrames(clip.in, srcFps);
    const outFrames = secondsToFrames(clip.out, srcFps);
    const lengthFrames = Math.max(1, outFrames - inFrames);

    // Duration is the same span of time in either timebase, but the frame
    // count differs when the source and timeline rates differ.
    const tlLengthFrames = srcFps === tlFps
      ? lengthFrames
      : Math.max(1, secondsToFrames(clip.out - clip.in, tlFps));

    const entry = {
      ref: asset.id,
      name: clip.name || asset.info.name,
      offset: framesToRational(playhead, tlFps),
      start: framesToRational(inFrames, srcFps),
      duration: framesToRational(tlLengthFrames, tlFps),
      formatId: asset.formatId,
      hasAudio: asset.info.hasAudio,
    };
    playhead += tlLengthFrames;
    return entry;
  });

  const totalDuration = framesToRational(playhead, tlFps);

  // ---- serialise -------------------------------------------------------
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE fcpxml>');
  lines.push('<fcpxml version="1.8">');
  lines.push('  <resources>');

  for (const f of formats.values()) {
    lines.push(
      `    <format id="${f.id}" name="${xmlEscape(f.name)}"` +
        ` frameDuration="${frameDuration(f.fps)}"` +
        ` width="${f.width}" height="${f.height}"` +
        ` colorSpace="1-1-1 (Rec. 709)"/>`
    );
  }

  for (const a of assets.values()) {
    const { info } = a;
    const durFrames = secondsToFrames(info.duration, info.fps);
    const attrs = [
      `id="${a.id}"`,
      `name="${xmlEscape(path.parse(info.name).name)}"`,
      `src="${xmlEscape(fileUrl(info.path))}"`,
      `start="0s"`,
      `duration="${framesToRational(durFrames, info.fps)}"`,
      `hasVideo="${info.hasVideo ? 1 : 0}"`,
      `format="${a.formatId}"`,
    ];
    if (info.hasAudio) {
      attrs.push(
        `hasAudio="1"`,
        `audioSources="1"`,
        `audioChannels="${info.audioChannels || 2}"`,
        `audioRate="${info.audioRate || 48000}"`
      );
    }
    lines.push(`    <asset ${attrs.join(' ')}/>`);
  }

  lines.push('  </resources>');
  lines.push('  <library>');
  lines.push(`    <event name="${xmlEscape(edit.name)}">`);
  lines.push(`      <project name="${xmlEscape(edit.name)}">`);
  lines.push(
    `        <sequence format="${seqFormatId}" duration="${totalDuration}"` +
      ` tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">`
  );
  lines.push('          <spine>');

  for (const c of spine) {
    lines.push(
      `            <asset-clip ref="${c.ref}" name="${xmlEscape(c.name)}"` +
        ` offset="${c.offset}" start="${c.start}" duration="${c.duration}"` +
        ` format="${c.formatId}" tcFormat="NDF"` +
        (c.hasAudio ? ' audioRole="dialogue"' : '') +
        `/>`
    );
  }

  lines.push('          </spine>');
  lines.push('        </sequence>');
  lines.push('      </project>');
  lines.push('    </event>');
  lines.push('  </library>');
  lines.push('</fcpxml>');
  lines.push('');

  return { xml: lines.join('\n'), totalFrames: playhead, tlFps, clipCount: spine.length };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.edit) {
    console.error('Usage: node tools/fcpxml.js <edit.json> [--out <file.fcpxml>]');
    process.exit(1);
  }

  const editPath = path.resolve(opts.edit);
  const edit = loadEdit(editPath);
  const result = build(edit);

  const outPath = path.resolve(
    opts.out || path.join(path.dirname(editPath), 'out', `${edit.name}.fcpxml`)
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, result.xml, 'utf8');

  const [n, d] = result.tlFps.split('/').map(Number);
  const seconds = (result.totalFrames * d) / n;

  console.log(`Wrote ${outPath}`);
  console.log(`  ${result.clipCount} clip(s), ${result.totalFrames} frames, ${seconds.toFixed(2)}s`);
  console.log(`  Timeline: ${edit.resolution[0]}x${edit.resolution[1]} @ ${result.tlFps}`);
  console.log('');
  console.log('In DaVinci Resolve:  File > Import > Timeline...  then pick this file.');
}

main();
