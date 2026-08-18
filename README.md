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

Copy this directory to one of the extension discovery locations:

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
  background, a left border, and a `現在` (current) badge.
- **Session hierarchy** — child sessions spawned via `create_session` or a session
  fork are indented under their parent. The `フォーカス` (focus) control on each row
  narrows the selected scope further by making that session the visible root. Use
  the breadcrumb to return to the selected scope. KPIs, the legend, and the time
  axis are all recalculated for the currently displayed range.
- **`▾ N / ▸ N` in a row** — expands or collapses only that session's sub-agents.
  The row itself has no click action, so it can't be confused with `フォーカス`.
- `すべて折りたたむ / すべて展開` (collapse all / expand all): toggles sub-agent
  visibility for every session at once.
- **Sub-agent rows** — agent name on the left, work summary in the middle, model
  and effort on the right.
- **Hover** — shows duration, AIU, requests, tokens, and PR/issue references. For
  sub-agents it also shows the task name and prompt summary captured at launch.

## Controls

- **Scope selector** — `現在チャット` shows the current session and descendants
  linked through the app's recorded creator/parent links; `リポジトリ` and `フォルダー`
  use matching sessions as seeds and include every linked descendant, even when a
  child's worktree path or repository metadata differs. `全セッション` explicitly
  expands to every local chat and project session. The default is current repository
  for project sessions and current chat tree for general chats without repository
  metadata.
- Stage chips: click to show/hide that stage.
- `圧縮 / 実時間` (compressed / real time): compression folds idle gaps of 40
  minutes or more into a dashed segment to keep the density readable. Real time
  uses a uniform time axis. When long histories create many compressed segments,
  gap widths shrink to keep the timeline and AIU column inside the canvas.
- `時系列 / 消費順` (chronological / by consumption): reorders the rows. The time
  axis always stays real time.
- `自動 OFF / 自動 ON · 30秒` (auto-refresh off/on): turning it on refreshes
  immediately, then every 30 seconds. Off by default.
- `更新` (refresh): reloads the data. From an agent, use the `refresh` action. The
  `top_consumers` action returns the top consumers.
- **Live sync**: agent-triggered refreshes and scope changes are pushed to the open
  view with Server-Sent Events. Connection status is visible in the header and
  reconnects automatically.
- **Timezone toggle**: click `JST 時点` in the header meta line to switch to UTC,
  and click again to return to JST. No extra button is added — that single word in
  the meta line is the toggle.

## Time and stage classification

- Wall-clock rendering can be **switched between JST (`Asia/Tokyo`) and UTC**, with
  JST as the initial value. The database stores UTC; the conversion happens only at
  render time, so JST is shown by default even when the host runs UTC.
  Switching applies the same timezone to **every wall-clock display**: session
  durations, tooltips, axis ticks, and the generation time. The choice is in-panel
  UI state only and resets to JST on reload.
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
Repository, normalized root folder, and chat hierarchy are independent filters.
Repository metadata is read from `workspace.yaml` first. Repository/folder matching
selects seed sessions, then adds descendants using only recorded relationships:
`coordinating_creator_session_id`, `creator_session_id`, then
`workspace_parent_links` in that precedence order. Creator IDs may refer to a
general chat with no workspace row. Chat-tree scope uses the same relationships
from the current session. If links are unavailable, no relationships are guessed.

Repository, folder, and all-session scopes omit only sessions that have a recorded
`session.shutdown`, exactly zero usage requests, and exactly zero nano-AIU. Running
sessions and sessions without lifecycle events remain visible before their first
usage record. Current-chat-tree scope intentionally keeps zero-usage terminal nodes
so the root/child structure remains complete. In the filtered scopes, a retained
descendant whose parent was omitted is promoted to the nearest visible ancestor or
the top level. All KPIs and actions use this final visible session set.
Untitled records with no branch, lifecycle event, request, or AIU are also omitted
from non-chat scopes because they are uninitialized session-store placeholders.
AIU = `SUM(total_nano_aiu) / 1,000,000,000`, i.e. model usage as recorded locally.
It is not a premium-request quota or a billed amount. The AIU on a session row is
inclusive of its child agents.

**Difference from "AI Credit" in the chat window**: the app's display excludes
`initiator = 'compaction'` (context compaction). This canvas sums everything and
breaks out the compaction portion ("うち圧縮") in the header and tooltips, so any
discrepancy can be explained from here.

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

The open input accepts `scope: "current_chat_tree" | "current_repository" |
"current_folder" | "all_sessions"`. To look at another repository, pass
`{ scope: "current_repository", repository: "owner/repo" }`. The `refresh` and
`top_consumers` actions accept the same optional scope, repository, and folder fields.

## Privacy

The extension reads local Copilot session databases in read-only mode and serves the
dashboard only from a loopback HTTP server bound to `127.0.0.1`. It does not send
session data to an external service.

The view follows host theme tokens, narrow canvas widths, and the operating
system's reduced-motion preference.
