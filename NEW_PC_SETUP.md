# SETTING UP ON ANOTHER PC

Everything you need to get both projects running on a different machine, plus
what can and cannot be moved across on a USB drive.

Written 24 September 2026, from a survey of the original PC.

Read [`MASTER_HANDOFF.md`](MASTER_HANDOFF.md) first for what the projects *are*
and where each one stopped. This file is purely about setting them up again.

---

# PART 1 — The game (Manyaka City)

Cloning the repo is easy. The three things below are what actually go wrong.

## Trap 1 — Install Git LFS BEFORE you clone

**This is the one that wastes an afternoon.**

The repo keeps **238 `.uasset` and `.umap` files (134.5 MB)** in Git LFS, not in
plain Git. Clone without Git LFS installed and those files arrive as ~130-byte
text pointers instead of real assets.

Nothing warns you. Git says the clone succeeded. The folder structure looks
perfect. Then Unreal opens a broken, empty-looking project and the error gives
no hint why.

**Do this first:**

```
git lfs install
```

Git LFS ships with Git for Windows; otherwise get it from https://git-lfs.com

**Then verify after cloning.** Look at any file in:

`Unreal\ManyakaCity\Content\Characters\Mannequins\Meshes\`

- Files are hundreds of KB or several MB → **correct**
- Files are all roughly 130 bytes → **LFS did not run.** Fix it and run:

```
git lfs pull
```

134.5 MB sits well inside GitHub Free's 1 GB LFS storage and 1 GB monthly
bandwidth, so cloning several times costs nothing.

## Trap 2 — Unreal must be exactly 5.8.0

The project **freezes** its toolchain. Opening the `.uproject` with any other
engine version prompts to convert the project. Accepting that breaks the freeze
silently.

Per `DECISIONS.md` in the game repo, changing any frozen item requires a
recorded decision and a compatibility rerun. Do not click through the
conversion prompt because it looks routine.

**Required:** Unreal Engine **5.8.0, CL 55116800**

If the machine already has a different version, install 5.8.0 alongside it — the
Epic Launcher supports multiple engine versions side by side. Picking `5.8.0`
from the launcher's version dropdown gives the correct changelist, because CL is
fixed per release.

## Trap 3 — It is a C++ project, so it must compile first

Unreal alone is **not enough**. Manyaka City has real C++ source
(`ManyakaCityCharacter.cpp`, `ManyakaCityGameMode.cpp`,
`ManyakaCityPlayerController.cpp` and more) and will not open until it builds.

**Required:** Visual Studio with the **C++ workload**, specifically:

| Component | Version |
|---|---|
| Visual Studio | Community 2026, 18.8.12009.203 |
| MSVC toolset | 14.51.36231 |
| Windows SDK | 10.0.28000.0 (DEC-017) |

When reinstalling Visual Studio, **tick these exact component versions** rather
than accepting the defaults. The defaults will be newer, and newer breaks the
freeze. The individual component versions are selectable in the VS Installer
under "Individual components".

If the machine has Epic and Unreal but no Visual Studio, the project will not
open and the error message will not make the reason obvious.

## The steps, in order

1. Install **Git**, sign in as `Quakytofee` — the repo is private
2. Install **Git LFS**, run `git lfs install`
3. Install **Unreal Engine 5.8.0**
4. Install **Visual Studio** with the C++ workload and the exact versions above
5. Clone:
   ```
   git clone https://github.com/Quakytofee/gameify.git
   ```
6. **Verify a `.uasset` is not 130 bytes** (see Trap 1)
7. Right-click `Unreal\ManyakaCity\ManyakaCity.uproject` →
   **Generate Visual Studio project files**
8. Build from Visual Studio
9. Open the project

Then read `PROJECT_STATE.md` and resume: AF1-007 needs its fail-closed
corrections on branch `feat/af1-007-clean-build-wrapper`.

## What the repo gives you, and what it does not

**Present in the repo — 450 tracked files, 69 commits, 8 branches:**

- All C++ source, all 238 content assets, all config, the `.uproject`
- Every project document: `PROJECT_STATE.md`, `CHANGELOG.md`, `DECISIONS.md`,
  `BACKLOG.md`, `KNOWN_ISSUES.md`, `MILESTONE_ACCEPTANCE.md`
- All 148 evidence reports under `Reports/`
- Full history and every branch, including the active one

**Regenerated automatically, never copy these:**

`Binaries/` · `Intermediate/` · `DerivedDataCache/` · `Saved/` · `_Bootstrap/`

On the original PC these were ~24 GB. Only ~136 MB actually mattered, and all of
it is in the repo. Copying them across is wasted effort.

**First open is slow.** Generate project files → compile C++ → shader
compilation → DDC build. Budget **30–60 minutes**. This is normal and happens
once.

---

# PART 2 — The video toolkit

Far simpler.

```
git clone https://github.com/Quakytofee/OLD-PC-.git
cd OLD-PC-
npm install
```

`npm install` re-downloads FFmpeg and FFprobe (~139 MB). Needs
[Node.js](https://nodejs.org).

Do not copy `node_modules` across — that is the only reason the folder ever
looked big.

DaVinci Resolve needs reinstalling (see Part 3), and remember it must be
**20.3 Free** behaviour you plan around: external scripting is Studio-only since
Resolve 19.1, so the FCPXML import route is the only one that works. Details in
`claude-memory/davinci-resolve-setup.md`.

---

# PART 3 — Moving installed software by USB

Short version: **games yes, professional software no.**

## Can be copied — about 261 GB

### Steam — 129 GB

| Game | Size |
|---|---|
| Marvel Rivals | 73.7 GB |
| DRAGON BALL: Sparking! ZERO | 28.5 GB |
| Aimlabs | 16.2 GB |
| Shape of Dreams: Prologue | 4.8 GB |
| Shape of Dreams Demo | 4.9 GB |
| Lethal Company | 1.1 GB |
| Old School RuneScape | tiny |
| Steamworks Common Redistributables | 0.1 GB |

**Method:**

1. Copy `C:\Program Files (x86)\Steam\steamapps` to the USB drive. You need
   **both** the `common\` folders **and** the `appmanifest_*.acf` files beside
   them. Those `.acf` files are what tell Steam a game is already installed —
   leave them behind and Steam re-downloads everything.
2. On the new PC install Steam, sign in, let it finish.
3. Copy your `steamapps` contents into the new `steamapps` folder.
4. Restart Steam. Games appear installed; it does a quick verify, not a download.

### Epic — 132 GB

Fortnite (93.9 GB) · Unreal Engine 5.8 (29.6 GB) · Twinmotion 2025.2 (8.1 GB)

Epic has no import function, so you have to work around it:

1. In the launcher, start installing the game to your chosen folder, then
   **pause** immediately.
2. Close the launcher. Copy your files over the folder it just created.
3. Reopen the launcher and **resume**. It verifies what is present and fetches
   only what is missing.

## Cannot be copied — must be reinstalled

**Autodesk:** AutoCAD 2026, Revit 2026, and the whole supporting stack
**Adobe:** Photoshop 2026, Illustrator 2026, Bridge 2026, Acrobat
**Also:** Rhino 8 · DaVinci Resolve 20.3 · Visual Studio Community 2026

These write registry keys across `HKLM`, install shared runtimes and system
services, register COM components, and bind licences to hardware. A copied
`Program Files` folder is inert — it will not launch. Autodesk, Adobe and Rhino
additionally require sign-in or a licence key.

Reinstall from your Autodesk Account, Adobe Creative Cloud, your McNeel account,
and Blackmagic's site.

## Two things that will bite you

**Format the USB drive as exFAT or NTFS — never FAT32.** FAT32 cannot hold any
file over 4 GB. Marvel Rivals and Fortnite both contain larger files, and the
copy fails partway with an unhelpful error.
Right-click the drive → Format → exFAT.

**261 GB takes time.** Roughly 10–15 hours over USB 2.0, 1–2 hours over USB 3.0.
An external SSD beats a flash drive substantially. The original PC used about
911 GB of its 1.9 TB, so make sure the destination has comparable room.

## Settings worth taking, since the apps reinstall but customisations do not

| Software | What to grab |
|---|---|
| Rhino | `%APPDATA%\McNeel\Rhinoceros\8.0` — settings, plugins, toolbars, templates |
| AutoCAD | Custom templates, `.ctb` plot styles, exported profiles |
| DaVinci | Projects exported as `.drp`, plus LUTs and presets |
| Adobe | Brushes, actions, presets |
| Everything | Browser bookmarks and passwords, and every licence key you own |

No DaVinci project database was found in the usual locations on the original PC,
so there is probably nothing to rescue — but open Resolve's Project Manager and
check before wiping, in case it lives somewhere custom.

---

# PART 4 — What was installed on the original PC

Recorded so nothing is forgotten later.

**Creative and CAD:** AutoCAD 2026 (25.1.122.0) · Revit 2026 (26.4.0.32) ·
Rhino 8 (8.29.26063.11001) · Photoshop 2026 · Illustrator 2026 · Bridge 2026 ·
Acrobat · Creative Cloud

**Video:** DaVinci Resolve 20.3.00010 (Free) + Resolve Renderer + Control Panels
+ Blackmagic RAW Common Components

**Development:** Visual Studio Community 2026 (18.8.0) · VS Code 1.96.1 ·
Unreal Engine 5.8 · Twinmotion 2025.2 · Quixel Bridge · Fab UE Plugin ·
Unreal Datasmith Exporter for Rhino 5.6.102

**Launchers:** Steam 2.10.91.91 · Epic Games Launcher 1.3.82.0

**Storage:** single drive `C:` — 1906.7 GB total, 995.3 GB free

---

# Quick checklist

- [ ] Git installed, signed in as `Quakytofee`
- [ ] **Git LFS installed and `git lfs install` run** ← the silent one
- [ ] Unreal Engine **5.8.0** specifically
- [ ] Visual Studio with C++, MSVC 14.51.36231, Windows SDK 10.0.28000.0
- [ ] `git clone https://github.com/Quakytofee/gameify.git`
- [ ] **Checked a `.uasset` is not 130 bytes**
- [ ] Generate project files → build → open
- [ ] `git clone https://github.com/Quakytofee/OLD-PC-.git` → `npm install`
- [ ] Node.js installed for the video toolkit
- [ ] USB drive formatted exFAT, games copied with their `.acf` files
- [ ] Licence keys and app settings collected before wiping the old PC
