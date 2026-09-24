# Video editing setup

This folder lets Claude do video editing for you, and hands the result to
DaVinci Resolve so you can finish it there.

You should not need to run any of this yourself. Just say what you want and
Claude does it. This page explains what's going on, so nothing feels like a
black box.

---

## The one thing to understand

DaVinci has a feature that lets outside programs control it. **Blackmagic
switched it off on the free version in late 2024** to push people toward the
paid Studio version. That's a deliberate lock, not something that can be
worked around.

So we use a different door, which is wide open on the free version:

> **DaVinci can open an edit from a file.**

That means:

1. You say what you want
2. Claude does the editing and writes it to a file
3. **You open DaVinci and import that file** — one menu click
4. Your edit appears as a normal timeline, fully editable

You still get to do colour, effects and the final export in DaVinci. You just
skip the cutting.

---

## How to import an edit into DaVinci

This is the only step that needs you.

1. Open DaVinci Resolve
2. Top menu: **File → Import → Timeline...**
3. Pick the `.fcpxml` file Claude made (it'll be in `projects/<job>/out/`)
4. Leave the settings as they are, click **OK**

Your cuts appear on the timeline. Everything is editable — drag, trim, delete,
whatever you like.

**If the clips show up red or say "Media Offline":** it means DaVinci can't find
the original video files. Tell Claude and it'll fix the file paths. It does not
mean the edit is broken.

---

## What's in this folder

| Folder | What it's for |
|---|---|
| `tools/` | The scripts Claude uses. You can ignore these. |
| `projects/` | One folder per editing job. |
| `media/` | Somewhere to keep source video, if you want it all in one place. |

Inside a job folder (`projects/<job>/`):

| Item | What it is |
|---|---|
| `edit.json` | The edit itself — which bits of which video, in what order |
| `frames/` | Still images pulled out of your video, so Claude can see it |
| `out/` | The finished results: an `.mp4` to watch, an `.fcpxml` for DaVinci |

### `edit.json` in plain terms

This is the whole edit, and it's readable. Each line means "take this video,
from this second to this second":

```json
{
  "name": "My Edit",
  "clips": [
    { "src": "C:/Users/heith/Videos/talk.mp4", "in": 12.5,  "out": 47.0 },
    { "src": "C:/Users/heith/Videos/talk.mp4", "in": 90.0,  "out": 121.25 }
  ]
}
```

That means: play from 12.5s to 47s, then jump to 90s and play to 121.25s.
Everything else gets dropped.

If a cut is slightly off, you can change a number here yourself and ask Claude
to rebuild it. Nothing is hidden.

---

## What Claude can and can't do

**Can do, on its own:**

- Cut, trim, shorten, reorder, join clips together
- Cut out dead air, silence, mistakes, "umm"s
- Add titles, text and subtitles
- Fades, speed changes, crop, resize, rotate
- Adjust audio levels, add background music
- Compress big files, convert between formats

**Can't do — these stay yours in DaVinci:**

- Colour grading
- Motion graphics and animated effects
- Fusion compositing

That split is exactly why the edit lands in DaVinci rather than just giving you
a finished video file.

**One more thing worth knowing:** Claude pulls still frames out of your videos
and genuinely looks at them. So when it suggests a cut, it's based on what's
actually in the footage, not guesswork.

---

## Running the tools yourself (optional)

You don't need this, but if you're curious:

```bash
# What is this video? Length, size, frame rate
node tools/probe.js "C:\Users\heith\Videos\talk.mp4"

# Pull out a still every 10 seconds so it can be looked at
node tools/frames.js "C:\Users\heith\Videos\talk.mp4" --out projects/myjob/frames --every 10

# Find the natural cut points instead
node tools/frames.js "C:\Users\heith\Videos\talk.mp4" --out projects/myjob/scenes --scenes

# Make a watchable MP4 of the edit (--draft is faster and lower quality)
node tools/render.js projects/myjob/edit.json --draft

# Make the file DaVinci imports
node tools/fcpxml.js projects/myjob/edit.json
```

Requires [Node.js](https://nodejs.org) (already installed) and
[FFmpeg](https://ffmpeg.org) (`winget install Gyan.FFmpeg`).
