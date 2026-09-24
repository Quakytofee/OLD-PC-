---
name: davinci-resolve-setup
description: DaVinci Resolve Free blocks external scripting; edits reach it via FCPXML timeline import instead
metadata: 
  node_type: memory
  type: project
  originSessionId: 142d754e-6898-438e-9447-0c107fdd15f8
  modified: 2026-08-02T21:52:48.763Z
---

Heithem runs **DaVinci Resolve 20.3 Free** (not Studio) on Windows 11.

Resolve's external scripting bridge (`DaVinciResolveScript`) became **Studio-only
in Resolve 19.1, Nov 2024**. So every Resolve MCP server (barckley75, apvlv,
Tooflex, samuelgursky) is unusable here, and so is any Python automation route.
The one built for Free (`emircbngl/davinci-resolve-mcp-free`) relies on macOS
Accessibility automation and does not apply on Windows. Do not re-propose these.

**The route that works:** generate a timeline file and have Heithem import it via
`File > Import > Timeline`. That path behaves identically on Free and Studio.
Tooling lives in `Desktop\Haithem AI\Projects\video\tools\` (Node, no Python).

Two environment facts worth keeping:

- **GitHub's release CDN is ~8 KB/s from this machine** (npm ~205 KB/s,
  Cloudflare ~114 KB/s). winget stalled indefinitely on the FFmpeg download.
  FFmpeg is installed from npm (`@ffmpeg-installer`, `@ffprobe-installer`)
  instead. Prefer npm over GitHub releases for any future binary here.
- That npm FFmpeg build is from 2018: **`-fps_mode` does not exist, use
  `-vsync`**. ffprobe is a newer 2023 build.

Related: [[user-non-technical]]
