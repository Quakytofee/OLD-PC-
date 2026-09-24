---
name: manyaka-city-project-root
description: Manyaka City game project lives in Gameify folder; owner is non-developer wanting full automation
metadata: 
  node_type: memory
  type: project
  originSessionId: 4dd30081-ac5a-4ce8-87f8-bc6b021be490
  modified: 2026-07-19T09:02:30.792Z
---

"Manyaka City: The Ultimate Sin" (Unreal Engine 5.8 Windows game) has its repository root at `C:\Users\heith\Desktop\Haithem AI\Projects\Gameify`. All work must stay inside that folder. The owner is not a developer and wants Claude to perform all safe technical work autonomously (research, implementation, testing, builds, docs). Repo governance lives in AGENTS.md/CLAUDE.md/DECISIONS.md there — read those at session start. As of 2026-07-19: repo on `main` is pushed to `https://github.com/Quakytofee/gameify.git` (repo-local identity: Quakytofee + GitHub noreply, chosen by owner); Git is at `C:\Program Files\Git\cmd\git.exe` (not on session PATH — also unset GIT_TERMINAL_PROMPT=0/GCM_INTERACTIVE=never in the session before network git ops, credentials are stored in Windows credential manager); next milestone task is AF1-005 Engine Compatibility Gate against UE 5.8.0 at `C:\Program Files\Epic Games\UE_5.8`.
