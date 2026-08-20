# Credit Timeline

> English / [日本語版](README_JP.md)

A GitHub Copilot canvas extension that lays out sessions and sub-agents on a
**chronological timeline** so you can see credit (AIU) consumption at a glance.

## Requirements

- GitHub Copilot app with canvas extension support
- Local Copilot session data under `$COPILOT_HOME` (default: `~/.copilot`)
- A Node.js runtime that provides `node:sqlite`

Canvas APIs are currently experimental and may change between Copilot app releases.

## Installation

Install the [`credit-timeline`](credit-timeline) folder from this repository, or
copy that folder to one of the extension discovery locations:

- Project scope: `.github/extensions/credit-timeline/`
- User scope: `$COPILOT_HOME/extensions/credit-timeline/`

Reload extensions in the GitHub Copilot app after installation.

## Reading the view

- **Overview bars (top)** — AIU per time bucket, stacked by stage color. The thin
  overlaid line is the cumulative share. The chart is scaled to the full canvas
  width regardless of how long the period is, starting from the left edge.
- **Timeline** — one row per session. The left and right edges of a bar are the
  session's start and end; the color is its stage. White vertical ticks inside a
  bar mark when sub-agents were launched. The thin bar and number on the right
  are that session's AIU.
- **Run settings** — the most recent model and reasoning effort are shown to the
  right of the session name. Hovering a row shows the usage history, call counts,
  and AIU, including cases where the settings changed mid-session.
- **Current session** — the session that opened this canvas is marked with a blue
  background, a left border, and a `Now` (current session) badge.
- **Session hierarchy** — child sessions spawned via `create_session` are indented
  under their parent. The `Focus` control on each row narrows the view
  by making that session the root, whether or not it has children. The default root
  is **the session that opened this canvas** (a single row if it has no children).
  Use the breadcrumb to move back up. KPIs, the legend, and the time axis are all
  recalculated for the currently displayed scope.
- **`chevron + N` in a row** — expands or collapses only that session's sub-agents.
  The row itself has no click action, so it can't be confused with `Focus`.
- **Collapse all / expand all** (chevron icon button): toggles sub-agent
  visibility for every session at once.
- **Sub-agent rows** — agent name on the left, work summary in the middle, model
  and effort on the right.
- **Hover** — shows duration, AIU, requests, tokens, and PR/issue references. For
  sub-agents it also shows the task name and prompt summary captured at launch.

## Controls

- **Icon-first chrome** — controls use icons plus a short English word, so the UI
  reads the same in any language. Icon-only controls (refresh, collapse/expand all,
  row chevrons) always carry an English `title` and `aria-label`.
- Stage chips: click to show/hide that stage.
- `Compress / Real` (compressed / real time): compression folds idle gaps of 40
  minutes or more into a dashed segment to keep the density readable. Real time
  uses a uniform time axis.
- `Time / Credits` (chronological / by consumption): reorders the rows. The time
  axis always stays real time.
- `Auto / Auto 30s` (auto-refresh off/on): turning it on refreshes
  immediately, then every 30 seconds. Off by default.
- **Refresh** (circular-arrow icon button): reloads the data. From an agent, use the `refresh` action. The
  `top_consumers` action returns the top consumers.
- **Timezone toggle**: the header meta line shows the local timezone's short name.
  Click it to switch to UTC, then click again to return to local time. No extra
  button is added — that short name is the toggle.

## Time and stage classification

- Wall-clock rendering defaults to the **browser/host local IANA timezone** and can
  be switched to UTC. The database stores UTC; conversion happens only at render time.
  Switching applies the same timezone to **every wall-clock display**: session
  durations, tooltips, axis ticks, and the generation time. The choice is in-panel
  UI state only and resets to local time on reload.
- The timeline and overview run from the first event to the last event in the loaded
  data. The end prefers finished/completed timestamps and observed usage activity;
  only an actively running session extends to the current time. Solid rails mark
  both ends of the track, with bold centered start/end labels; dashed lines mark
  compressed idle gaps.
- Stages are **inferred** from the session name; they are not a recorded fact. The
  resolution order is an exact skill-name match (such as `increment-development`),
  then keywords. Misclassification is possible. The authoritative rules are
  `SKILL_STAGES` and `classifyStageDetail()` in `data.mjs`.

## Data

`$COPILOT_HOME/session-store.db` (AIU, tokens, PR/issue references),
`session-state/<id>/workspace.yaml` (name, branch),
`session-state/<id>/events.jsonl` (sub-agent parent/child relations), and
`workspace_parent_links` in `$COPILOT_HOME/data.db` (session-to-session parentage).
If that last one can't be read, the hierarchy is dropped and rows are shown flat.
The repository of the current session is taken from `workspace.yaml` first, so a
stale value in the session store doesn't exclude the root session.
AIU = `SUM(total_nano_aiu) / 1,000,000,000`, i.e. model usage as recorded locally.
It is not a premium-request quota or a billed amount. The AIU on a session row is
inclusive of its child agents.

**Difference from "AI Credit" in the chat window**: the app's display excludes
`initiator = 'compaction'` (context compaction). This canvas sums everything and
breaks out the compaction portion ("compaction") in the header and tooltips, so any
discrepancy can be explained from here.

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

To look at another repository, pass `repository: "owner/repo"` in the open input.

## Privacy

The extension reads local Copilot session databases in read-only mode and serves the
dashboard only from a loopback HTTP server bound to `127.0.0.1`. It does not send
session data to an external service.
