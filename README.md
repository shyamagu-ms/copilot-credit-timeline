# Credit Timeline

English | [日本語](README_JP.md)

A GitHub Copilot canvas extension that lays out your Copilot sessions and sub-agents
on a chronological timeline, so you can see where credits (AIU) went at a glance.

All data is read from your local Copilot session store — nothing leaves your machine.

![Credit Timeline screenshot](docs/screenshot.png)

## Features

- **Timeline view** — one row per session, colored by inferred work stage, with tick
  marks for every sub-agent launch.
- **Credit overview** — stacked AIU per time bucket plus a cumulative share line.
- **Session hierarchy** — child sessions and forks nest under their parent, with
  per-row `Focus` and breadcrumb navigation.
- **Scopes** — current chat tree, repository, folder, or all local sessions.
- **Readable long histories** — idle gaps of 40+ minutes collapse into dashed segments.
- **Live updates** — auto-refresh, agent-triggered refresh, and Server-Sent Events sync.

## Requirements

- GitHub Copilot app with canvas extension support (canvas APIs are experimental)
- Local Copilot session data under `$COPILOT_HOME` (default: `~/.copilot`)
- A Node.js runtime that provides `node:sqlite`

## Installation

Copy the `credit-timeline/` directory into one of the extension discovery locations:

```bash
# user scope (all projects)
cp -r credit-timeline "$COPILOT_HOME/extensions/credit-timeline"

# or project scope
cp -r credit-timeline .github/extensions/credit-timeline
```

Then reload extensions in the GitHub Copilot app.

## Usage

Ask Copilot to open the canvas, or call it directly:

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1" })
```

Optional open input: `scope` (`current_chat_tree` | `current_repository` |
`current_folder` | `all_sessions`), plus `repository` / `folder`.
Omitting `input`, passing `null`, or passing `{}` opens the same default scope.
Actions: `refresh` and `top_consumers` accept the same fields.

```text
open_canvas({ canvasId: "credit-timeline", instanceId: "credit-timeline-1",
              input: { scope: "current_repository", repository: "owner/repo" } })
```

## About AIU

AIU = `SUM(total_nano_aiu) / 1,000,000,000` from the local session store — recorded
model usage, not a premium-request quota or a billed amount. A session row includes
its sub-agents. Unlike the "AI Credit" figure in the chat window, this canvas also
counts context compaction and shows it separately as `compaction`.

## Documentation

See [credit-timeline/README.md](credit-timeline/README.md) for the full reference:
how to read the view, every control, stage classification rules, and the data sources.

## Development

```bash
node --test credit-timeline/data.test.mjs
```

## License

[MIT](LICENSE)
