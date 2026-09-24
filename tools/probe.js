'use strict';

// Report what a video file actually is.
//
//   node tools/probe.js "C:\path\to\video.mp4"
//   node tools/probe.js --json "C:\path\to\video.mp4"

const { probe } = require('./lib');

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}h ${m}m ${s.toFixed(1)}s`
    : m > 0
      ? `${m}m ${s.toFixed(1)}s`
      : `${s.toFixed(2)}s`;
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const files = args.filter((a) => !a.startsWith('--'));

  if (files.length === 0) {
    console.error('Usage: node tools/probe.js [--json] <video> [video...]');
    process.exit(1);
  }

  const results = files.map(probe);

  if (asJson) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
    return;
  }

  for (const info of results) {
    console.log(`\n${info.name}`);
    console.log('-'.repeat(info.name.length));
    console.log(`  Length      ${fmtDuration(info.duration)}  (${info.duration.toFixed(3)}s)`);
    console.log(`  Size        ${(info.sizeBytes / 1024 / 1024).toFixed(1)} MB`);
    if (info.hasVideo) {
      console.log(`  Picture     ${info.width}x${info.height}  ${info.videoCodec}`);
      console.log(`  Frame rate  ${info.fps}  (${info.fpsApprox} fps)`);
      console.log(`  Frames      ~${Math.round((info.duration * info.fpsNum) / info.fpsDen)}`);
    } else {
      console.log('  Picture     none (audio only)');
    }
    if (info.hasAudio) {
      console.log(`  Sound       ${info.audioCodec}  ${info.audioChannels}ch  ${info.audioRate} Hz`);
    } else {
      console.log('  Sound       none (silent)');
    }
    console.log(`  Path        ${info.path}`);
  }
  console.log('');
}

main();
