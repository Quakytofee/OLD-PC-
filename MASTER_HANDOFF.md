# MASTER HANDOFF — Heithem's Claude workspace

**Written:** 24 September 2026
**Why it exists:** to move to a new PC without losing anything, and so a fresh
Claude session can pick up exactly where the last one stopped.

If you are a new Claude session: **read this file first, then follow the
"Start here" section for whichever project is being worked on.**

---

## Everything lives in two private GitHub repos

Both under the **`Quakytofee`** account. Nothing else needs to come off the old PC.

| Repo | Holds | Clone |
|---|---|---|
| **`Quakytofee/gameify`** | Manyaka City — the game | `git clone https://github.com/Quakytofee/gameify.git` |
| **`Quakytofee/OLD-PC-`** | Video toolkit, Claude memory, this document | `git clone https://github.com/Quakytofee/OLD-PC-.git` |

There is also an empty `hj5tkbgn2m-dev/Old-pc-` repo on a second GitHub account,
created by accident during the move. It contains nothing. Ignore or delete it.

> **Setting up on a new machine?** Read
> **[`NEW_PC_SETUP.md`](NEW_PC_SETUP.md)** before cloning anything.
>
> It covers the three things that silently break the game project — Git LFS
> (238 assets arrive as 130-byte stubs without it), the frozen Unreal 5.8.0
> version, and the Visual Studio C++ requirement — plus what can and cannot be
> moved across on a USB drive.

---

## The one-paragraph version

There are two projects. **Manyaka City** is an Unreal Engine 5.8 Windows game,
fully backed up on GitHub, mid-way through a milestone called Automation
Foundation v1 with one task needing corrections. **video** is a small Node
toolkit that lets Claude cut video and hand the result to DaVinci Resolve; it
works and has a finished test render. The owner, Heithem, is not a developer and
wants Claude to do the technical work autonomously and explain things plainly.

---

## Project 1 — Manyaka City: The Ultimate Sin

An Unreal Engine 5.8 Windows game.

| | |
|---|---|
| **Repo** | `https://github.com/Quakytofee/gameify.git` (private) |
| **Old PC path** | `C:\Users\heith\Desktop\Haithem AI\Projects\Gameify` |
| **Backed up?** | **Yes — fully.** 69 commits, 450 tracked files, 0 unpushed |
| **Milestone** | Automation Foundation v1 |

### Start here

```
git clone https://github.com/Quakytofee/gameify.git
```

Then read, in this order — the repo's own `CLAUDE.md` mandates it:

1. `AGENTS.md`
2. `MANYAKA_CITY_BINDING_IMPLEMENTATION_PLAN_v1.0.md`
3. `DECISIONS.md`
4. `PROJECT_STATE.md`
5. The relevant ADR and the active backlog task
6. `Reports/Handoffs/CURRENT_HANDOFF.md` if it exists

### Where we left off

- **AF1-006 — PASSED and MERGED** at commit `94b8170`.
- **AF1-007 — REVIEW, CHANGES REQUESTED.** Not approved, not merged.
- **Active branch:** `feat/af1-007-clean-build-wrapper`
- **Next action:** fix the bounded automation defects listed in
  `Reports/Reviews/AF1-007_CODEX_REVIEW.md`. They are fail-closed
  evidence-finalization and contract-coverage defects in the reusable
  clean-build wrapper.

### What is already proven to work

A full run passed every technical probe: Unreal 5.8 detected and launched, C++
fixture compiled and linked, both Editor and Win64 targets built, module loaded
headless, and BuildCookRun cooked, staged, packaged and archived a Windows build
that launched and exited cleanly with code 0.

### Not yet built

No production packaged build yet. Blueprint validation, data validation and
BuildGraph wrappers (AF1-008/009/010) are not implemented. Multiplayer, saves,
combat, missions, cinematics, NPCs and open-zone systems do not exist yet.

### Frozen toolchain — install these exact versions on the new PC

Changing any of these requires a recorded decision and a compatibility rerun.

- Unreal Engine **5.8.0, CL 55116800** (old path: `C:\Program Files\Epic Games\UE_5.8`)
- Visual Studio Community **2026**, version 18.8.12009.203
- MSVC toolset **14.51.36231**
- Windows SDK **10.0.28000.0** (per DEC-017)

### Rules that must not be broken

From the repo's `CLAUDE.md`, and they are deliberate:

- **Never push directly to `main`. Never force-push `main`.**
- Never use `--no-verify`; never disable or repoint `core.hooksPath` to dodge
  the tracked `.githooks/pre-push` control.
- Never self-approve or self-merge. Merging needs a green policy check and
  independent review.
- GitHub Free gives no server-side branch protection here (AF1-003 is **WAIVED,
  not passed**, under DEC-016). Never call this setup "branch protection".
- Keep critical state, replication, saves and mission logic in **C++**, not
  Blueprints.
- Never report an unrun test as passing.

### About the 24 GB on the old disk

Only about **136 MB matters** and all of it is on GitHub. The rest is excluded
on purpose by `.gitignore`:

- `_Bootstrap/` — 21 GB, extraction area, regenerable
- `Binaries/`, `Intermediate/`, `DerivedDataCache/`, `Saved/` — ~2.9 GB, Unreal
  rebuilds these on first open

**Do not waste time copying those to the new PC.** Clone and rebuild instead.

---

## Project 2 — video (DaVinci Resolve toolkit)

Node scripts that let Claude cut video and hand a timeline to DaVinci Resolve.

| | |
|---|---|
| **Old PC path** | `C:\Users\heith\Desktop\Haithem AI\Projects\video` |
| **Backed up?** | **No — this was local only.** That is what this handoff fixes. |
| **Status** | Working. Test render completed 3 August 2026. |

### The key fact — do not re-litigate this

Heithem runs **DaVinci Resolve 20.3 Free**, not Studio. Resolve's external
scripting bridge (`DaVinciResolveScript`) became **Studio-only in Resolve 19.1,
November 2024**. That means:

- Every Resolve MCP server (barckley75, apvlv, Tooflex, samuelgursky) is
  **unusable here**.
- Any Python automation route into Resolve is **unusable here**.
- `emircbngl/davinci-resolve-mcp-free` relies on macOS Accessibility and does
  **not** work on Windows.

**Do not propose any of these again.** It is a deliberate commercial lock, not a
bug to work around.

### The route that does work

Generate a timeline file; Heithem imports it via **File → Import → Timeline…**
This behaves identically on Free and Studio.

1. Heithem says what he wants
2. Claude edits and writes the file
3. Heithem imports it — one menu click
4. The edit appears as a normal, fully editable timeline

Colour grading, motion graphics and Fusion stay in DaVinci. Claude does the
cutting.

### The tools

| File | Does |
|---|---|
| `tools/probe.js` | Reads a video's length, size, frame rate |
| `tools/frames.js` | Pulls still frames out so Claude can actually look at the footage |
| `tools/render.js` | Renders the edit to a watchable MP4 (`--draft` = fast) |
| `tools/fcpxml.js` | Writes the file DaVinci imports |
| `tools/otio.js` | OpenTimelineIO output |
| `tools/lib.js` | Shared helpers |

An edit is just a readable `edit.json` listing which clip, from which second to
which second. Heithem can hand-edit the numbers and ask for a rebuild.

### Setting it up on the new PC

```
npm install
```

That re-downloads FFmpeg and FFprobe. **Do not copy `node_modules` across** —
it is ~139 MB of binaries and it is the only reason the folder looks big.

### Environment gotchas — these cost real time to rediscover

- **GitHub's release CDN runs at ~8 KB/s from this machine.** npm is ~205 KB/s,
  Cloudflare ~114 KB/s. `winget` stalled forever trying to fetch FFmpeg. So
  FFmpeg comes from npm (`@ffmpeg-installer`, `@ffprobe-installer`).
  **Prefer npm over GitHub releases for any binary.** Worth re-testing on the
  new PC — it may have been that machine's connection.
- **That npm FFmpeg build is from 2018: `-fps_mode` does not exist, use
  `-vsync`.** ffprobe is a newer 2023 build, so they differ.
- **Git was not on the session PATH** on the old PC — it lived at
  `C:\Program Files\Git\cmd\git.exe`. Credentials are in Windows Credential
  Manager. Before network git operations, unset `GIT_TERMINAL_PROMPT=0` and
  `GCM_INTERACTIVE=never`.

---

## Working with Heithem

- **He is not a developer.** Explain things in plain language, no jargon dumps.
- He wants Claude to **do the technical work autonomously** — research,
  implementation, testing, builds, documentation — rather than hand him
  instructions to follow.
- Tell him plainly when something genuinely needs him (like the DaVinci import
  click). Don't manufacture busywork.

---

## What was lost, so nobody hunts for it

Claude Code ran an automatic transcript cleanup on **17 September 2026** (default
retention is 30 days). The **chat logs** from the original sessions are gone,
including a 34-prompt session from 19 July 2026 that set up Manyaka City.

Checked and confirmed unrecoverable: no shadow copies, no restore points, no
File History, nothing in the Recycle Bin, empty paste cache.

**No actual work was lost** — only the conversation history. Everything built
survives in the repos and in this document.

To stop it happening again, set `cleanupPeriodDays` to a large number in
`~/.claude/settings.json` on the new PC.

---

## Backup status at a glance

| Thing | Where it lives | Safe? |
|---|---|---|
| Manyaka City — code, content, docs, reports | GitHub `Quakytofee/gameify` | ✅ |
| Manyaka City — build artifacts, `_Bootstrap` | Old disk only | ⬜ Regenerable, ignore |
| video toolkit source | This repo | ✅ |
| video `node_modules` | Nowhere | ⬜ `npm install` rebuilds |
| Claude memory files | This repo, `claude-memory/` | ✅ |
| Original chat transcripts | Deleted 17 Sept 2026 | ❌ Gone |
