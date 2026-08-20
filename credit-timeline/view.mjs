/* Language-neutral iconography: inline SVG so it inherits the canvas theme
   colour. Every icon-only control still carries an English title/aria-label. */
function icon(body, extraClass) {
    return '<svg class="ico' + (extraClass ? " " + extraClass : "") +
        '" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"' +
        ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' +
        ' aria-hidden="true" focusable="false">' + body + "</svg>";
}

const ICONS = {
    refresh: icon('<path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.9"/><path d="M13.8 1.9v3.2h-3.2"/>'),
    clock: icon('<circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.3 1.5"/>'),
    compress: icon('<path d="M2 3v10"/><path d="M14 3v10"/><path d="M6.2 5.6 4 8l2.2 2.4"/><path d="M9.8 5.6 12 8l-2.2 2.4"/><path d="M4.6 8h6.8"/>'),
    realtime: icon('<path d="M2 8h12"/><path d="M4.5 5v6"/><path d="M8 5v6"/><path d="M11.5 5v6"/>'),
    credits: icon('<path d="M3.5 13V9"/><path d="M8 13V6"/><path d="M12.5 13V3.5"/>'),
    collapseAll: icon('<path d="M4 9.5 8 5.5l4 4"/>'),
    expandAll: icon('<path d="M4 6.5 8 10.5l4-4"/>'),
    chevronDown: icon('<path d="M4 6.5 8 10.5l4-4"/>', "chev"),
    chevronRight: icon('<path d="M6.5 3.5 10.5 8l-4 4.5"/>', "chev"),
    chat: icon('<path d="M2.5 3.5h11v7.2H7.6L4.3 13.2v-2.5H2.5z"/>'),
    repo: icon('<path d="M3.6 2.5h8.8v11H5a1.4 1.4 0 0 1-1.4-1.4z"/><path d="M3.6 11h8.8"/>'),
    folder: icon('<path d="M2 4h4.2l1.3 1.7H14v7.3H2z"/>'),
    all: icon('<path d="M2.6 2.6h4.3v4.3H2.6z"/><path d="M9.1 2.6h4.3v4.3H9.1z"/><path d="M2.6 9.1h4.3v4.3H2.6z"/><path d="M9.1 9.1h4.3v4.3H9.1z"/>'),
};

const CSS = String.raw`
:root {
    --timeline-label-width: 390px;
    --timeline-credit-width: 104px;
    --canvas-font-body: "Segoe UI Variable Text", "Segoe UI Variable", Aptos, "Segoe UI", var(--font-sans, -apple-system, BlinkMacSystemFont, sans-serif);
    --canvas-font-display: "Segoe UI Variable Display", "Segoe UI Variable", "Aptos Display", Aptos, "Segoe UI", var(--font-sans-display, var(--font-sans, sans-serif));
}

* { box-sizing: border-box; }

html, body {
    height: 100%;
}

body {
    margin: 0;
    background: var(--background-color-default, #0d1117);
    color: var(--text-color-default, #e6edf3);
    font-family: var(--canvas-font-body);
    font-size: var(--text-body-medium, 13px);
    line-height: var(--leading-body-medium, 18px);
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
}

#app {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.pad { padding: 0 18px; }

/* ---------- header ---------- */

header {
    padding: 16px 18px 10px;
    display: flex;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
}

.repo {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.repo b {
    font-family: var(--canvas-font-display);
    font-size: var(--text-title-medium, 15px);
    font-weight: var(--font-weight-semibold, 600);
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.repo span {
    font-size: 11px;
    color: var(--text-color-muted, #8b949e);
    font-variant-numeric: tabular-nums;
}

.repo .scope-detail {
    color: var(--text-color-default, #e6edf3);
    font-size: 11px;
}

.connection-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    width: fit-content;
    margin-top: 3px;
    color: var(--text-color-muted, #8b949e);
    font-size: 10px;
}

.connection-status::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--true-color-green, #3fb950);
}

.connection-status[data-state="busy"]::before {
    background: var(--true-color-blue, #4493f8);
}

.connection-status[data-state="error"] {
    color: var(--true-color-red, #f85149);
}

.connection-status[data-state="error"]::before {
    background: var(--true-color-red, #f85149);
}

/* The timezone flip lives inside the meta line instead of adding a button. */
.tzflip {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    border-bottom: 1px dotted currentColor;
    line-height: 1.1;
}

.tzflip:hover,
.tzflip:focus-visible {
    color: var(--text-color-default, #e6edf3);
}

.kpis {
    display: flex;
    gap: 26px;
    margin-left: auto;
}

.kpi { display: flex; flex-direction: column; gap: 1px; }

.kpi u {
    text-decoration: none;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-color-muted, #8b949e);
}

.kpi b {
    font-family: var(--canvas-font-display);
    font-size: 22px;
    font-weight: var(--font-weight-semibold, 600);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1.15;
}

.kpi b i {
    font-style: normal;
    font-size: 12px;
    font-weight: 400;
    color: var(--text-color-muted, #8b949e);
    margin-left: 2px;
}

.split {
    display: flex;
    height: 3px;
    width: 76px;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 5px;
    opacity: 0.85;
}

/* ---------- flow chart ---------- */

.flow {
    padding: 2px 18px 0;
    overflow: hidden;
}

.flow svg { display: block; width: 100%; }

/* ---------- toolbar ---------- */

.bar-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px 8px;
    flex-wrap: wrap;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 9px 0 7px;
    border-radius: 11px;
    border: 1px solid transparent;
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 7%, transparent);
    color: var(--text-color-default, #e6edf3);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.12s ease, background 0.12s ease;
}

.chip:hover { background: color-mix(in srgb, var(--text-color-default, #e6edf3) 13%, transparent); }

.chip.off { opacity: 0.32; }

.chip s {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    text-decoration: none;
}

.chip em {
    font-style: normal;
    font-variant-numeric: tabular-nums;
    color: var(--text-color-muted, #8b949e);
}

.spacer { flex: 1 1 auto; }

.tog {
    display: inline-flex;
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 7%, transparent);
    border-radius: 7px;
    padding: 2px;
    gap: 2px;
}

.tog button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: var(--text-color-muted, #8b949e);
    font: inherit;
    font-size: 11px;
    height: 24px;
    padding: 0 9px;
    border-radius: 5px;
    cursor: pointer;
}

/* Icon-only controls keep a comfortable hit target. */
.tog button.icon-only {
    width: 28px;
    padding: 0;
}

.ico {
    flex: none;
    display: block;
    opacity: 0.9;
}

#refresh.on .ico { animation: spin 0.9s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

.tog button.on {
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 12%, transparent);
    color: var(--text-color-default, #e6edf3);
}

.tog button:disabled {
    cursor: default;
    opacity: 0.45;
}

button:focus-visible,
.chip:focus-visible,
.crumb:focus-visible {
    outline: 2px solid var(--color-focus-outline, #4493f8);
    outline-offset: 2px;
}

/* ---------- breadcrumb ---------- */

.crumbs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 18px 8px;
    font-size: 11px;
    min-width: 0;
}

.crumbs i {
    font-style: normal;
    color: var(--text-color-muted, #8b949e);
    opacity: 0.6;
}

.crumb {
    font-weight: 400;
    color: var(--text-color-muted, #8b949e);
    cursor: pointer;
    max-width: 340px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: 4px;
    padding: 1px 5px;
}

.crumb:hover { background: color-mix(in srgb, var(--text-color-default, #e6edf3) 10%, transparent); }

.crumb.on {
    color: var(--text-color-default, #e6edf3);
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 8%, transparent);
}

/* ---------- axis + rows ---------- */

.grid {
    display: grid;
    grid-template-columns:
        minmax(0, min(var(--timeline-label-width), 52%))
        minmax(0, 1fr)
        minmax(56px, var(--timeline-credit-width));
    align-items: center;
    min-width: 0;
}

.axis {
    position: sticky;
    top: 0;
    z-index: 3;
    padding: 0 18px;
    background: var(--background-color-default, #0d1117);
    border-bottom: 1px solid var(--border-color-default, #30363d);
}

.axis .ticks {
    position: relative;
    height: 20px;
}

.axis .ticks span {
    position: absolute;
    top: 4px;
    font-size: 10px;
    color: var(--text-color-muted, #8b949e);
    white-space: nowrap;
    transform: translateX(-1px);
    font-variant-numeric: tabular-nums;
}

.axis .ticks span.edge-label {
    transform: translateX(-50%);
    font-weight: var(--font-weight-semibold, 600);
}

.axis .ticks span.mid-label::after {
    content: "";
    position: absolute;
    left: 0;
    top: 16px;
    height: 4px;
    border-left: 1px solid color-mix(in srgb, var(--text-color-muted, #8b949e) 45%, transparent);
}

.axis .cap {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-color-muted, #8b949e);
}

.axis .cap.r { text-align: right; }

.body {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 24px;
}

.rows { position: relative; padding: 6px 18px 0; }

.breaks {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.breaks i {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1px dashed color-mix(in srgb, var(--text-color-muted, #8b949e) 45%, transparent);
}

.breaks i.edge {
    border-left-style: solid;
    border-left-color: color-mix(in srgb, var(--text-color-muted, #8b949e) 82%, transparent);
}

.row {
    height: 24px;
    cursor: pointer;
    border-radius: 5px;
    position: relative;
}

.row:hover { background: color-mix(in srgb, var(--text-color-default, #e6edf3) 5%, transparent); }

.row:focus-visible {
    outline: 1px solid var(--true-color-blue, #4493f8);
    outline-offset: -1px;
}

.row.cur {
    background: color-mix(in srgb, var(--true-color-blue, #4493f8) 14%, transparent);
    box-shadow: inset 3px 0 0 var(--true-color-blue, #4493f8);
}

.row.cur:hover {
    background: color-mix(in srgb, var(--true-color-blue, #4493f8) 20%, transparent);
}

.row.cur .g b::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--true-color-blue, #4493f8);
    margin-right: 5px;
    vertical-align: 2px;
}

.g {
    display: grid;
    grid-template-columns: 84px minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    padding-right: 12px;
    min-width: 0;
    container-type: inline-size;
}

.g s {
    display: flex;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    font-size: 10px;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.g s::before {
    content: "";
    flex: none;
    width: 3px;
    height: 11px;
    border-radius: 2px;
    background: currentColor;
}

.g b {
    font-weight: 400;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-color-default, #e6edf3);
    opacity: 0.9;
    min-width: 0;
}

.g .chips {
    display: flex;
    align-items: center;
    gap: 5px;
}

.g .run {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--text-color-muted, #8b949e);
    white-space: nowrap;
    max-width: 132px;
    min-width: 0;
}

.g .model {
    display: block;
    min-width: 0;
    overflow: hidden;
    padding: 1px 5px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 8%, transparent);
    text-overflow: ellipsis;
}

.g .effort {
    flex: none;
    overflow: hidden;
    text-overflow: ellipsis;
}

@container (max-width: 360px) {
    .g .run { max-width: 96px; }
    .g .effort { display: none; }
}

@container (max-width: 260px) {
    .g .run { max-width: 72px; }
}

.g em {
    flex: none;
    font-style: normal;
    font-size: 10px;
    color: var(--text-color-muted, #8b949e);
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
}

.row-action {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border: 0;
    font: inherit;
    font-size: 10px;
    color: var(--text-color-muted, #8b949e);
    cursor: pointer;
    border-radius: 4px;
    padding: 2px 5px;
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 9%, transparent);
    white-space: nowrap;
}

.row-action .ico { width: 11px; height: 11px; }

.row-action .chev { width: 10px; height: 10px; }

.row-action:hover {
    background: color-mix(in srgb, var(--true-color-blue, #4493f8) 32%, transparent);
    color: var(--text-color-default, #e6edf3);
}

.row-action:disabled {
    cursor: default;
    opacity: 0.55;
}

.row-action:disabled:hover {
    background: color-mix(in srgb, var(--text-color-default, #e6edf3) 9%, transparent);
    color: var(--text-color-muted, #8b949e);
}

.g b .tr {
    display: inline-block;
    width: 9px;
    margin-right: 3px;
    border-bottom: 1px solid color-mix(in srgb, var(--text-color-muted, #8b949e) 55%, transparent);
    vertical-align: 3px;
}

.track {
    position: relative;
    height: 24px;
    overflow: hidden;
    min-width: 0;
}

.bar {
    position: absolute;
    top: 7px;
    height: 10px;
    border-radius: 5px;
    min-width: 3px;
    overflow: hidden;
    transition: filter 0.12s ease;
}

.row:hover .bar { filter: brightness(1.18); }

.bar u {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1.5px;
    background: color-mix(in srgb, var(--color-white, #fff) 62%, transparent);
    text-decoration: none;
}

.cred {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 8px;
    padding-left: 10px;
    min-width: 0;
}

.cred i {
    display: block;
    height: 5px;
    border-radius: 3px;
    min-width: 2px;
    max-width: 100%;
    opacity: 0.55;
}

.row:hover .cred i { opacity: 0.9; }

.cred b {
    min-width: 0;
    font-weight: 400;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--text-color-muted, #8b949e);
    text-align: right;
    white-space: nowrap;
}

.row.hot .cred b { color: var(--text-color-default, #e6edf3); }

/* ---------- expanded children ---------- */

.kids {
    padding: 1px 0 5px;
    animation: fade 0.16s ease;
}

@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

.kid {
    height: 17px;
    cursor: default;
}

.kid .g {
    padding-left: 16px;
    grid-template-columns: 96px minmax(0, 1fr) auto;
}

.kid .g s::before { height: 7px; opacity: 0.55; }

.kid .g s { opacity: 0.65; }

.kid .g b { font-size: 11px; opacity: 0.62; }

.kid .track { height: 17px; }

.kid .bar {
    top: 6px;
    height: 5px;
    border-radius: 3px;
    opacity: 0.72;
}

.kid .cred b { font-size: 10px; }

.rail {
    position: absolute;
    left: 12px;
    top: -2px;
    bottom: 6px;
    width: 1px;
    background: color-mix(in srgb, var(--text-color-muted, #8b949e) 32%, transparent);
}

.kidwrap { position: relative; }

/* ---------- tooltip ---------- */

#tip {
    position: fixed;
    z-index: 20;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s ease;
    max-width: 320px;
    padding: 9px 11px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--background-color-default, #0d1117) 92%, var(--text-color-default, #e6edf3));
    border: 1px solid var(--border-color-default, #30363d);
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.4);
    font-size: 11px;
    line-height: 16px;
}

#tip.on { opacity: 1; }

#tip h4 {
    margin: 0 0 5px;
    font-size: 12px;
    font-weight: var(--font-weight-semibold, 600);
    line-height: 16px;
}

#tip dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1px 12px;
}

#tip dt { color: var(--text-color-muted, #8b949e); }

#tip dd { margin: 0; font-variant-numeric: tabular-nums; text-align: right; }

/* ---------- empty ---------- */

.empty {
    margin: auto;
    padding: 40px;
    text-align: center;
    color: var(--text-color-muted, #8b949e);
    font-size: 12px;
}

.body::-webkit-scrollbar { width: 10px; }
.body::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--text-color-muted, #8b949e) 30%, transparent);
    border-radius: 6px;
    border: 3px solid transparent;
    background-clip: content-box;
}

@media (max-width: 980px) {
    :root {
        --timeline-label-width: 300px;
        --timeline-credit-width: 88px;
    }
    .g {
        grid-template-columns: 70px minmax(0, 1fr) minmax(0, 96px) auto;
    }
    .kpis { gap: 16px; }
}

@media (max-width: 720px) {
    :root {
        --timeline-label-width: 220px;
        --timeline-credit-width: 72px;
    }
    header { padding: 12px 12px 8px; }
    .flow { padding-inline: 12px; }
    .bar-tools { padding-inline: 12px; }
    .axis { padding-inline: 12px; }
    .rows { padding-inline: 12px; }
    .kpis {
        width: 100%;
        margin-left: 0;
        justify-content: space-between;
    }
    .kpi b { font-size: 18px; }
    .g {
        grid-template-columns: minmax(0, 1fr) minmax(0, 72px) auto;
        padding-right: 6px;
    }
    .g s { display: none; }
    .cred {
        grid-template-columns: minmax(0, 1fr) max-content;
        gap: 4px;
        padding-left: 4px;
    }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
`;

const JS = String.raw`
(function () {
    var COLORS = {
        goal: "#7c9cff",
        backlog: "#3fc6b7",
        planning: "#54a8f5",
        lap: "#f0b429",
        development: "#5fd08a",
        gate: "#c58af9",
        review: "#ff9a62",
        retro: "#f2749b",
        research: "#58a6ff",
        design: "#bc8cff",
        implementation: "#56d364",
        testing: "#d2a8ff",
        debugging: "#ff7b72",
        documentation: "#79c0ff",
        maintenance: "#d29922",
        feedback: "#4fd8e8",
        tooling: "#9aa7ff",
        other: "#8b95a5"
    };
    var SHORT = {
        goal: "Goal",
        backlog: "Backlog",
        planning: "Planning",
        lap: "Lap",
        development: "Dev",
        gate: "DoD Gate",
        review: "Review",
        retro: "Retro",
        research: "Research",
        design: "Design",
        implementation: "Implement",
        testing: "Testing",
        debugging: "Debug",
        documentation: "Docs",
        maintenance: "Maintain",
        feedback: "Feedback",
        tooling: "Tooling",
        other: "Other"
    };
    var GAP_MS = 40 * 60 * 1000;
    var GAP_PX = 16;
    var LOCAL_TZ = (function () {
        try {
            var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            return /^(UTC|GMT|Etc\/UTC|Etc\/GMT)$/i.test(zone) ? "UTC" : zone;
        } catch (_) {
            return "UTC";
        }
    }());

    var state = {
        data: window.__DATA__,
        hidden: {},
        compress: true,
        sort: "time",
        collapsed: {},
        root: "",
        busy: false,
        autoRefresh: false,
        tz: LOCAL_TZ,
        connection: "live"
    };
    var AUTO_REFRESH_MS = 30000;
    var autoRefreshTimer = 0;

    function el(id) { return document.getElementById(id); }
    function setConnection(stateName, message) {
        state.connection = stateName;
        var status = el("connection-status");
        if (!status) return;
        status.dataset.state = stateName;
        status.textContent = message;
    }
    function parseResponse(response) {
        return response.json().then(function (json) {
            if (!response.ok) {
                throw new Error(json.message || json.error || "Update failed");
            }
            return json;
        });
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }
    function color(stage) { return COLORS[stage] || COLORS.other; }
    function stageLabel(id) {
        var s = state.data.stages.filter(function (x) { return x.id === id; })[0];
        return s ? s.label : id;
    }
    function scopeLabel() {
        var scope = state.data.scope || {};
        if (scope.type === "current_repository") return "Repository";
        if (scope.type === "current_folder") return "Folder";
        if (scope.type === "all_sessions") return "All sessions";
        return "This chat";
    }
    function syncScopeControls() {
        var scope = state.data.scope || {};
        el("scope-title").textContent = scope.label || "Credit Timeline";
        el("scope-detail").textContent = scope.detail || "";
        [].forEach.call(document.querySelectorAll("[data-scope]"), function (button) {
            button.classList.toggle("on", button.dataset.scope === scope.type);
            button.setAttribute("aria-pressed", button.dataset.scope === scope.type ? "true" : "false");
        });
        var repositoryButton = document.querySelector('[data-scope="current_repository"]');
        repositoryButton.disabled = !state.data.repository;
        repositoryButton.title = state.data.repository
            ? "Scope: sessions in the current repository"
            : "No repository info for this chat";
        var folderButton = document.querySelector('[data-scope="current_folder"]');
        folderButton.disabled = !state.data.folder;
        folderButton.title = state.data.folder
            ? "Scope: sessions in the current root folder"
            : "No folder info for this chat";
    }
    function num(v) {
        if (v >= 10000) return (v / 1000).toFixed(0) + "k";
        if (v >= 1000) return (v / 1000).toFixed(1) + "k";
        if (v >= 100) return String(Math.round(v));
        if (v >= 10) return v.toFixed(1);
        return v.toFixed(2);
    }
    function grp(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function dur(ms) {
        var m = Math.round(ms / 60000);
        if (m < 1) return "<1m";
        if (m < 60) return m + "m";
        var h = Math.floor(m / 60);
        if (h < 48) return h + "h" + (m % 60 ? " " + (m % 60) + "m" : "");
        return Math.floor(h / 24) + "d " + (h % 24) + "h";
    }
    /* All wall-clock rendering follows state.tz; the DB itself stays UTC.
       The browser's local IANA timezone is the default. */
    var TZ_ABBREVIATIONS = { "Asia/Tokyo": "JST" };
    var TZFMTS = {};
    function intlZoneName(style) {
        var parts = new Intl.DateTimeFormat("en-US", {
            timeZone: state.tz, timeZoneName: style
        }).formatToParts(new Date());
        var name = parts.filter(function (p) { return p.type === "timeZoneName"; })[0];
        return name && name.value ? name.value : "";
    }
    function tzLabel() {
        if (state.tz === "UTC") return "UTC";
        if (TZ_ABBREVIATIONS[state.tz]) return TZ_ABBREVIATIONS[state.tz];
        try {
            var shortName = intlZoneName("short");
            if (shortName && !/^(?:GMT|UTC)[+-]/.test(shortName)) return shortName;
            var genericName = intlZoneName("shortGeneric") || intlZoneName("longGeneric");
            if (genericName && !/^(?:GMT|UTC)[+-]/.test(genericName)) {
                return genericName.replace(/ (?:Standard |Daylight )?Time$/, "");
            }
            return state.tz.split("/").pop().replace(/_/g, " ") || "Local";
        } catch (_) {
            return state.tz.split("/").pop().replace(/_/g, " ") || "Local";
        }
    }
    function tzHint() {
        if (LOCAL_TZ === "UTC") return "Timezone: UTC (local)";
        if (state.tz === "UTC") return "Timezone: UTC — click for local";
        return "Timezone: " + tzLabel() + " (local) — click for UTC";
    }
    function tzfmt() {
        if (!TZFMTS[state.tz]) {
            TZFMTS[state.tz] = new Intl.DateTimeFormat("en-GB", {
                timeZone: state.tz, month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit", hour12: false
            });
        }
        return TZFMTS[state.tz];
    }
    function tparts(value) {
        var d = value instanceof Date ? value : new Date(value);
        if (isNaN(d)) return null;
        var o = {};
        tzfmt().formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
        return o;
    }
    function clock(iso) {
        var p = tparts(iso);
        if (!p) return "-";
        return p.month + "/" + p.day + " " + p.hour + ":" + p.minute;
    }

    /* ---- session tree ---------------------------------------------------
       parentId comes from the app's workspace_parent_links: one session
       spawning another. Sub-agents hang off their own session as leaves. */
    function index() {
        var byId = {}, kids = {};
        state.data.sessions.forEach(function (s) { byId[s.id] = s; });
        state.data.sessions.forEach(function (s) {
            var p = s.parentId && byId[s.parentId] ? s.parentId : "";
            (kids[p] = kids[p] || []).push(s);
        });
        return { byId: byId, kids: kids };
    }

    function ancestors(id, ix) {
        var chain = [], seen = {}, cur = ix.byId[id];
        while (cur && !seen[cur.id]) {
            seen[cur.id] = 1;
            chain.unshift(cur);
            cur = cur.parentId ? ix.byId[cur.parentId] : null;
        }
        return chain;
    }

    /* Depth-first walk from the current root, honouring the sort order and
       stage filter. Filtering hides a row but keeps its descendants. */
    function walk(ix) {
        var out = [];
        function order(list) {
            var copy = list.slice();
            if (state.sort === "aiu") copy.sort(function (a, b) { return b.aiu - a.aiu; });
            else copy.sort(function (a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); });
            return copy;
        }
        function step(s, depth) {
            if (!state.hidden[s.stage]) out.push({ s: s, depth: depth, kids: (ix.kids[s.id] || []).length });
            order(ix.kids[s.id] || []).forEach(function (k) { step(k, depth + 1); });
        }
        var root = state.root && ix.byId[state.root] ? ix.byId[state.root] : null;
        if (root) step(root, 0);
        else order(ix.kids[""] || []).forEach(function (r) { step(r, 0); });
        return out;
    }

    function subtreeCount(id, ix) {
        var n = 0;
        (ix.kids[id] || []).forEach(function (k) { n += 1 + subtreeCount(k.id, ix); });
        return n;
    }

    /* ---- piecewise time scale that squeezes idle gaps ----
       Gaps are detected from point events (session/agent starts and ends), not
       from merged spans: one long-running session must not keep an idle stretch
       open just because its bar crosses it. A session timestamp accompanied by
       an uncompleted agent is only a fallback end; completed work or usage wins. */
    function buildScale(list, width) {
        var starts = [], ends = [], fallbackEnds = [];
        function add(target, value) {
            var point = Date.parse(value);
            if (isFinite(point)) target.push(point);
        }
        function addUsageEnds(target, profiles) {
            (profiles || []).forEach(function (profile) { add(target, profile.lastUsedAt); });
        }
        list.forEach(function (s) {
            var hasOpenAgent = s.agents.some(function (g) {
                return g.startedAt && !g.completedAt;
            });
            add(starts, s.createdAt);
            add(hasOpenAgent && s.status !== "idle" && s.status !== "cancelled"
                ? fallbackEnds : ends, s.finishedAt);
            add(ends, s.usageUpdatedAt);
            addUsageEnds(ends, s.modelProfiles);
            s.agents.forEach(function (g) {
                add(starts, g.startedAt);
                add(ends, g.completedAt);
                addUsageEnds(ends, g.profiles);
            });
        });
        if (!starts.length && !ends.length && !fallbackEnds.length) {
            return { x: function () { return 0; }, segs: [], breaks: [], min: 0, max: 0 };
        }
        var domainMax = ends.length
            ? Math.max.apply(null, ends)
            : fallbackEnds.length
                ? Math.max.apply(null, fallbackEnds)
                : Math.max.apply(null, starts);
        var pts = starts.concat(ends, fallbackEnds).filter(function (point) { return point <= domainMax; });
        pts.push(domainMax);
        pts.sort(function (x, y) { return x - y; });

        var segs = [];
        if (state.compress) {
            var lo = pts[0], prev = pts[0];
            for (var i = 1; i < pts.length; i++) {
                if (pts[i] - prev > GAP_MS) { segs.push([lo, prev]); lo = pts[i]; }
                prev = pts[i];
            }
            segs.push([lo, prev]);
        } else {
            segs.push([pts[0], pts[pts.length - 1]]);
        }

        var gapCount = Math.max(0, segs.length - 1);
        /* Keep compressed idle gaps within 20% of the available track.
           A fixed gap per segment eventually exceeded the grid on long histories. */
        var gapWidth = gapCount
            ? Math.min(GAP_PX, (width * 0.2) / gapCount)
            : 0;
        var avail = Math.max(1, width - gapCount * gapWidth);
        var MINW = Math.min(14, avail / segs.length);
        var slack = Math.max(0, avail - segs.length * MINW);
        var total = segs.reduce(function (a, s) { return a + Math.max(1, s[1] - s[0]); }, 0) || 1;
        var px = 0, breaks = [];
        segs.forEach(function (s, i) {
            s.px = px;
            s.w = MINW + (Math.max(1, s[1] - s[0]) / total) * slack;
            px += s.w;
            if (i < segs.length - 1) {
                breaks.push(px + gapWidth / 2);
                px += gapWidth;
            }
        });

        function x(t) {
            for (var i = 0; i < segs.length; i++) {
                if (t <= segs[i][1]) {
                    if (i === segs.length - 1 && t === segs[i][1]) {
                        return Math.min(width, segs[i].px + segs[i].w);
                    }
                    if (t <= segs[i][0]) return segs[i].px;
                    return Math.min(width, segs[i].px +
                        ((t - segs[i][0]) / Math.max(1, segs[i][1] - segs[i][0])) * segs[i].w);
                }
            }
            var last = segs[segs.length - 1];
            return Math.min(width, last.px + last.w);
        }
        return { x: x, segs: segs, breaks: breaks, min: segs[0][0], max: segs[segs.length - 1][1] };
    }

    /* ---- flow chart: AIU attributed to session start, stacked by stage ---- */
    function flow(list, scale, width) {
        var H = 62, N = Math.max(24, Math.min(90, Math.floor(width / 12)));
        var stages = state.data.stages.map(function (s) { return s.id; });
        var buckets = [];
        for (var i = 0; i < N; i++) buckets.push({ total: 0, by: {} });
        var step = width / N;

        list.forEach(function (s) {
            var idx = Math.min(N - 1, Math.max(0, Math.floor(scale.x(Date.parse(s.createdAt)) / step)));
            var b = buckets[idx];
            b.total += s.aiu;
            b.by[s.stage] = (b.by[s.stage] || 0) + s.aiu;
        });

        var peak = Math.max.apply(null, buckets.map(function (b) { return b.total; }).concat([1]));
        var running = 0, grand = list.reduce(function (a, s) { return a + s.aiu; }, 0) || 1;
        var bw = Math.max(2, step - 1.6);
        var bars = "", line = "";

        buckets.forEach(function (b, i) {
            var x = i * step + (step - bw) / 2;
            var y = H;
            stages.forEach(function (st) {
                var v = b.by[st];
                if (!v) return;
                var h = (v / peak) * (H - 6);
                y -= h;
                bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
                    '" height="' + Math.max(1, h).toFixed(1) + '" fill="' + color(st) + '" opacity="0.85"/>';
            });
            running += b.total;
            var cx = i * step + step / 2;
            var cy = H - (running / grand) * (H - 6);
            line += (i ? " L" : "M") + cx.toFixed(1) + " " + cy.toFixed(1);
        });

        return '<svg viewBox="0 0 ' + width + ' ' + H + '" height="' + H + '" preserveAspectRatio="none">' +
            '<line x1="0" y1="' + (H - 0.5) + '" x2="' + width + '" y2="' + (H - 0.5) +
            '" stroke="var(--border-color-default, #30363d)" stroke-width="1"/>' +
            '<g>' + bars + '</g>' +
            '<path d="' + line + '" fill="none" stroke="var(--text-color-default, #e6edf3)" stroke-opacity="0.35" stroke-width="1.25" stroke-linejoin="round"/>' +
            '</svg>';
    }

    function rowHtml(node, scale, maxAiu) {
        var s = node.s;
        var a = scale.x(Date.parse(s.createdAt));
        var b = scale.x(Date.parse(s.finishedAt || s.createdAt));
        var w = Math.max(3, b - a);
        var c = color(s.stage);
        var ticks = "";
        s.agents.forEach(function (g) {
            if (!g.startedAt) return;
            var gx = scale.x(Date.parse(g.startedAt)) - a;
            if (gx > 1 && gx < w - 1) ticks += '<u style="left:' + gx.toFixed(1) + 'px"></u>';
        });
        var pct = Math.max(2, Math.pow(s.aiu / maxAiu, 0.7) * 60);
        var pad = Math.min(node.depth, 4) * 13;
        var model = modelLabel(s.model);
        var effort = s.reasoningEffort || "";
        var runTitle = [model, effort].filter(Boolean).join(" · ");
        var run = runTitle
            ? '<span class="run" title="' + esc(runTitle) + '">' +
                (model ? '<span class="model">' + esc(model) + '</span>' : "") +
                (effort ? '<span class="effort">' + esc(effort) + '</span>' : "") +
                "</span>"
            : "";
        return '<div class="grid row' + (s.current ? " cur" : "") + (s.aiu >= maxAiu * 0.4 ? " hot" : "") +
            '" data-id="' + esc(s.id) + '" tabindex="0" role="group"' +
            ' aria-label="Focus on session: ' + esc(s.title) + '"' +
            (state.root === s.id ? ' aria-current="true"' : "") + '>' +
            '<div class="g"><s style="color:' + c + '">' + esc(SHORT[s.stage] || s.stage) + '</s>' +
            '<b style="padding-left:' + pad + 'px">' +
            (node.depth ? '<i class="tr"></i>' : "") + esc(s.title) + '</b>' +
            run +
            '<span class="chips">' +
                (s.agents.length ? '<button class="row-action expand" data-toggle-agents="' + esc(s.id) +
                    '" title="Expand / collapse sub-agents" aria-label="Expand or collapse ' + s.agents.length +
                    ' sub-agents" aria-expanded="' +
                    (state.collapsed[s.id] ? "false" : "true") + '">' +
                    (state.collapsed[s.id] ? ${JSON.stringify(ICONS.chevronRight)} : ${JSON.stringify(ICONS.chevronDown)}) +
                    s.agents.length + '</button>' : "") +
                '</span></div>' +
            '<div class="track"><div class="bar" style="left:' + a.toFixed(1) + 'px;width:' + w.toFixed(1) +
            'px;background:' + c + '">' + ticks + '</div></div>' +
            '<div class="cred"><i style="width:' + pct.toFixed(1) + 'px;background:' + c + '"></i><b>' +
            num(s.aiu) + '</b></div>' +
            '</div>';
    }

    function kidHtml(s, g, scale, maxAiu, depth) {
        var st = g.startedAt ? Date.parse(g.startedAt) : Date.parse(s.createdAt);
        var en = g.completedAt ? Date.parse(g.completedAt) : st + 60000;
        var a = scale.x(st), w = Math.max(2, scale.x(en) - a);
        var c = color(s.stage);
        var pct = Math.max(1, Math.pow(g.aiu / maxAiu, 0.7) * 60);
        var pad = Math.min(depth, 4) * 13;
        var summary = g.taskDescription || g.promptSummary || "No task summary";
        var model = modelLabel(g.model);
        var effort = g.reasoningEffort || "";
        var runTitle = [model, effort].filter(Boolean).join(" · ");
        var run = runTitle
            ? '<span class="run" title="' + esc(runTitle) + '">' +
                (model ? '<span class="model">' + esc(model) + '</span>' : "") +
                (effort ? '<span class="effort">' + esc(effort) + '</span>' : "") +
                "</span>"
            : "";
        return '<div class="grid row kid" data-agent="' + esc(s.id) + "|" + esc(g.id) + '">' +
            '<div class="g"><s style="color:' + c + '">' +
            esc(g.name) + '</s><b style="padding-left:' +
            pad + 'px">' + esc(summary) + '</b>' +
            run + '</div>' +
            '<div class="track"><div class="bar" style="left:' + a.toFixed(1) + 'px;width:' + w.toFixed(1) +
            'px;background:' + c + '"></div></div>' +
            '<div class="cred"><i style="width:' + pct.toFixed(1) + 'px;background:' + c + '"></i><b>' +
            num(g.aiu) + '</b></div>' +
            '</div>';
    }

    function render() {
        var d = state.data;
        var host = el("rows");
        /* Read the laid-out middle column instead of reconstructing it from
           preferred widths. This keeps the time scale aligned when CSS shrinks
           the label column to preserve the AIU column in a narrow panel. */
        var timeline = el("ticks");
        var width = Math.max(1, timeline.clientWidth);
        var trackLeft = timeline.offsetLeft;

        var ix = index();
        if (state.root && !ix.byId[state.root]) state.root = "";
        syncScopeControls();

        var nodes = walk(ix);
        var list = nodes.map(function (n) { return n.s; });
        var scale = buildScale(list, width);

        var maxAiu = Math.max.apply(null, list.map(function (s) { return s.aiu; }).concat([1]));
        var maxKid = 1;
        list.forEach(function (s) { s.agents.forEach(function (g) { if (g.aiu > maxKid) maxKid = g.aiu; }); });

        /* header — totals follow the current scope, not the whole repository */
        var t = list.reduce(function (acc, s) {
            acc.sessions += 1;
            acc.agents += s.agents.length;
            acc.requests += s.requests;
            acc.aiu += s.aiu;
            acc.compactionAiu += s.compactionAiu || 0;
            acc.parentAiu += s.parentAiu;
            acc.childAiu += s.childAiu;
            return acc;
        }, { sessions: 0, agents: 0, requests: 0, aiu: 0, compactionAiu: 0, parentAiu: 0, childAiu: 0 });

        el("kpis").innerHTML =
            kpi("sessions", grp(t.sessions), "") +
            kpi("sub-agents", grp(t.agents), "") +
            kpi("requests", grp(t.requests), "") +
            '<div class="kpi"><u>credits (aiu)</u><b>' + grp(t.aiu) + '</b>' +
            '<div class="split" title="parent / child">' +
            '<span style="flex:' + Math.max(0.01, t.parentAiu) + ';background:var(--true-color-blue, #4493f8)"></span>' +
            '<span style="flex:' + Math.max(0.01, t.childAiu) + ';background:color-mix(in srgb, var(--true-color-blue, #4493f8) 40%, transparent)"></span>' +
            '</div></div>';

        el("meta").innerHTML = esc(clock(d.generatedAt)) +
            ' <button type="button" id="tzflip" class="tzflip"' +
            ' title="' + esc(tzHint()) + '" aria-label="' + esc(tzHint()) + '">' +
            esc(tzLabel()) + "</button> · " +
            esc((t.aiu ? Math.round(t.childAiu / t.aiu * 100) : 0) + "% sub-agents" +
                (t.compactionAiu ? " · compaction " + grp(t.compactionAiu) + " AIU" : "") +
                (d.treeAvailable ? "" : " · no parent links"));

        /* breadcrumb */
        var crumbs = '<b class="crumb' + (state.root ? "" : " on") + '" data-root="">' +
            esc(scopeLabel()) + "</b>";
        if (state.root) {
            ancestors(state.root, ix).forEach(function (s, i, all) {
                crumbs += '<i>›</i><b class="crumb' + (i === all.length - 1 ? " on" : "") +
                    '" data-root="' + esc(s.id) + '">' + esc(s.title) + "</b>";
            });
        }
        el("crumbs").innerHTML = crumbs;

        /* legend */
        var counts = {};
        list.forEach(function (s) { counts[s.stage] = (counts[s.stage] || 0) + 1; });
        d.sessions.forEach(function (s) { if (state.hidden[s.stage]) counts[s.stage] = counts[s.stage] || 0; });
        el("legend").innerHTML = d.stages.filter(function (s) { return counts[s.id] !== undefined; }).map(function (s) {
            return '<div class="chip' + (state.hidden[s.id] ? " off" : "") + '" data-stage="' + s.id + '">' +
                '<s style="background:' + color(s.id) + '"></s>' + esc(SHORT[s.id] || s.label) +
                '<em>' + counts[s.id] + '</em></div>';
        }).join("");

        /* The overview uses the full canvas width and its own normalized scale. */
        var flowHost = el("flow");
        var flowWidth = Math.max(180, flowHost.clientWidth - 36);
        var flowScale = buildScale(list, flowWidth);
        flowHost.innerHTML = flow(list, flowScale, flowWidth);

        var last = scale.segs.length ? 0 : -999;
        var ticks = scale.segs.map(function (sg) {
            if (sg[0] === scale.min || sg[0] === scale.max) return "";
            if (sg.px - last < 52) return "";
            last = sg.px;
            var p = tparts(sg[0]);
            return '<span class="mid-label" style="left:' + sg.px.toFixed(1) + 'px">' + p.month + "/" + p.day +
                " " + p.hour + ":" + p.minute + "</span>";
        }).join("");
        if (scale.segs.length) {
            var start = tparts(scale.min);
            var end = tparts(scale.max);
            ticks = '<span class="edge-label" style="left:0px">' +
                start.month + "/" + start.day + " " + start.hour + ":" + start.minute +
                "</span>" + ticks +
                '<span class="edge-label" style="left:' + width.toFixed(1) +
                'px">' + end.month + "/" + end.day +
                " " + end.hour + ":" + end.minute + "</span>";
        }
        el("ticks").innerHTML = ticks;

        /* rows */
        var html = nodes.map(function (n) {
            var s = n.s;
            var out = rowHtml(n, scale, maxAiu);
            if (!state.collapsed[s.id] && s.agents.length) {
                out += '<div class="kidwrap"><div class="rail"></div><div class="kids">' +
                    s.agents.map(function (g) { return kidHtml(s, g, scale, maxKid, n.depth + 1); }).join("") +
                    "</div></div>";
            }
            return out;
        }).join("");

        var edgeRails = scale.segs.length
            ? '<i class="edge" style="left:' + trackLeft.toFixed(1) + 'px"></i>' +
                '<i class="edge" style="left:' + (trackLeft + width).toFixed(1) + 'px"></i>'
            : "";
        host.innerHTML = '<div class="breaks">' + edgeRails +
            scale.breaks.map(function (b) { return '<i style="left:' + (b + trackLeft).toFixed(1) + 'px"></i>'; }).join("") +
            "</div>" + html;

        if (!nodes.length) {
            host.innerHTML = '<div class="empty">' +
                esc(state.root ? "No sessions to show in this range. Use the breadcrumb scope name to go back."
                    : (d.availability.message || "No sessions to show.")) + "</div>";
        }
        syncAgentToggle();
    }

    function kpi(label, value, sub) {
        return '<div class="kpi"><u>' + label + "</u><b>" + value + (sub ? "<i>" + sub + "</i>" : "") + "</b></div>";
    }

    /* ---- tooltip ---- */
    var tip = null;
    function showTip(html, ev) {
        if (!tip) tip = el("tip");
        tip.innerHTML = html;
        tip.classList.add("on");
        moveTip(ev);
    }
    function moveTip(ev) {
        if (!tip) return;
        var w = tip.offsetWidth, h = tip.offsetHeight;
        var x = ev.clientX + 14, y = ev.clientY + 16;
        if (x + w > window.innerWidth - 8) x = ev.clientX - w - 14;
        if (y + h > window.innerHeight - 8) y = ev.clientY - h - 12;
        tip.style.left = Math.max(6, x) + "px";
        tip.style.top = Math.max(6, y) + "px";
    }
    function hideTip() { if (tip) tip.classList.remove("on"); }

    function dlRow(k, v) { return "<dt>" + k + "</dt><dd>" + v + "</dd>"; }

    function modelLabel(model) {
        var raw = model || "";
        var title = function (value) {
            return value.split("-").map(function (part) {
                return part ? part.charAt(0).toUpperCase() + part.slice(1) : "";
            }).join(" ");
        };
        var match = raw.match(/^gpt-([^-]+)(?:-(.+))?$/);
        if (match) return "GPT-" + match[1] + (match[2] ? " " + title(match[2]) : "");
        match = raw.match(/^claude-(opus|sonnet|haiku)-(.+)$/);
        if (match) return "Claude " + title(match[1]) + " " + match[2];
        match = raw.match(/^gemini-([^-]+)(?:-(.+))?$/);
        if (match) return "Gemini " + match[1] + (match[2] ? " " + title(match[2]) : "");
        match = raw.match(/^grok-(.+)$/);
        if (match) return "Grok " + match[1];
        match = raw.match(/^mai-code-([^-]+)(?:-(.+))?$/);
        if (match) return "MAI-Code " + match[1] + (match[2] ? " " + title(match[2]) : "");
        return raw;
    }

    function profileHistory(profiles) {
        return (profiles || []).map(function (p) {
            return [
                esc(modelLabel(p.model) || "-"),
                esc(p.reasoningEffort || "-"),
                grp(p.requests) + " req",
                grp(p.aiu) + " AIU"
            ].join(" · ");
        }).join("<br>");
    }

    function sessionTip(s) {
        var refs = s.refs.slice(0, 6).map(function (r) {
            return r.type === "commit" ? r.value.slice(0, 7) : (r.type === "pr" ? "#" : "i#") + r.value;
        }).join(" ");
        var ix = index();
        var kids = subtreeCount(s.id, ix);
        var sum = s.aiu;
        (function add(id) {
            (ix.kids[id] || []).forEach(function (k) { sum += k.aiu; add(k.id); });
        })(s.id);
        return "<h4>" + esc(s.title) + "</h4><dl>" +
            (s.repository ? dlRow("Repository", esc(s.repository)) : "") +
            dlRow(esc(stageLabel(s.stage)), esc(s.branch || "-")) +
            (s.model ? dlRow("Model", esc(modelLabel(s.model))) : "") +
            (s.reasoningEffort ? dlRow("Effort", esc(s.reasoningEffort)) : "") +
            (s.modelProfiles && s.modelProfiles.length > 1
                ? dlRow("History", profileHistory(s.modelProfiles))
                : "") +
            dlRow("Span", clock(s.createdAt) + " → " + dur(s.elapsedMs)) +
            dlRow("Credits", grp(s.aiu) + " AIU") +
            (s.compactionAiu ? dlRow("compaction", grp(s.compactionAiu) + " AIU · " +
                s.compactionRequests + " req") : "") +
            (s.childAiu ? dlRow("sub-agents", grp(s.childAiu) + " AIU · " + s.agents.length + " agents") : "") +
            (kids ? dlRow("Subtree", grp(sum) + " AIU · " + kids + " sessions") : "") +
            dlRow("Requests", grp(s.requests)) +
            dlRow("Tokens", grp(s.inputTokens / 1000) + "k in / " + grp(s.outputTokens / 1000) + "k out") +
            (refs ? dlRow("Refs", esc(refs)) : "") +
            "</dl>";
    }

    function agentTip(g) {
        return "<h4>" + esc(g.name) + "</h4><dl>" +
            (g.taskDescription ? dlRow("Task", esc(g.taskDescription)) : "") +
            (g.promptSummary && g.promptSummary !== g.taskDescription
                ? dlRow("Prompt", esc(g.promptSummary))
                : "") +
            dlRow("Model", esc(modelLabel(g.model) || "-")) +
            dlRow("Effort", esc(g.reasoningEffort || "-")) +
            (g.profiles && g.profiles.length > 1
                ? dlRow("History", profileHistory(g.profiles))
                : "") +
            dlRow("Runtime", (g.durationMs ? dur(g.durationMs) : "-")) +
            dlRow("Credits", grp(g.aiu) + " AIU") +
            dlRow("Tools", grp(g.toolCalls)) +
            dlRow("Tokens", grp(g.totalTokens / 1000) + "k") +
            "</dl>";
    }

    function find(id) {
        return state.data.sessions.filter(function (s) { return s.id === id; })[0];
    }

    function focusSession(id) {
        if (state.root === id) return;
        state.root = id;
        hideTip();
        render();
        el("rows").parentNode.scrollTop = 0;
    }

    /* ---- events ---- */
    document.addEventListener("mouseover", function (ev) {
        var row = ev.target.closest ? ev.target.closest(".row") : null;
        if (!row) return;
        if (row.dataset.agent) {
            var parts = row.dataset.agent.split("|");
            var s = find(parts[0]);
            var g = s && s.agents.filter(function (x) { return x.id === parts[1]; })[0];
            if (g) showTip(agentTip(g), ev);
            return;
        }
        var sess = find(row.dataset.id);
        if (sess) showTip(sessionTip(sess), ev);
    });
    document.addEventListener("mousemove", function (ev) {
        if (tip && tip.classList.contains("on")) moveTip(ev);
    });
    document.addEventListener("mouseout", function (ev) {
        var row = ev.target.closest ? ev.target.closest(".row") : null;
        if (row) hideTip();
    });

    document.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest("#tzflip")) {
            if (LOCAL_TZ !== "UTC") state.tz = state.tz === "UTC" ? LOCAL_TZ : "UTC";
            hideTip();
            render();
            return;
        }
        var scopeButton = ev.target.closest ? ev.target.closest("[data-scope]") : null;
        if (scopeButton && !scopeButton.disabled) {
            var nextScope = scopeButton.dataset.scope;
            var currentScope = state.data.scope && state.data.scope.type;
            if (nextScope === currentScope) return;
            if (nextScope === "all_sessions" &&
                !window.confirm("Loading all sessions may take a long time. Continue?")) return;
            switchScope(nextScope);
            return;
        }
        var rootBtn = ev.target.closest ? ev.target.closest("[data-root]") : null;
        if (rootBtn) {
            ev.stopPropagation();
            focusSession(rootBtn.dataset.root || "");
            return;
        }
        var chip = ev.target.closest ? ev.target.closest(".chip[data-stage]") : null;
        if (chip) {
            var st = chip.dataset.stage;
            if (state.hidden[st]) delete state.hidden[st]; else state.hidden[st] = true;
            render();
            return;
        }
        var tb = ev.target.closest ? ev.target.closest("[data-set]") : null;
        if (tb) {
            var pair = tb.dataset.set.split(":");
            if (pair[0] === "compress") state.compress = pair[1] === "1";
            if (pair[0] === "sort") state.sort = pair[1];
            [].forEach.call(tb.parentNode.children, function (n) { n.classList.remove("on"); });
            tb.classList.add("on");
            render();
            return;
        }
        if (ev.target.closest && ev.target.closest("#auto-refresh")) {
            state.autoRefresh = !state.autoRefresh;
            syncAutoRefresh();
            if (state.autoRefresh) refresh();
            return;
        }
        if (ev.target.closest && ev.target.closest("#toggle-agents")) {
            toggleAllAgents();
            return;
        }
        if (ev.target.closest && ev.target.closest("#refresh")) { refresh(); return; }
        var expand = ev.target.closest ? ev.target.closest("[data-toggle-agents]") : null;
        if (expand) {
            var s = find(expand.dataset.toggleAgents);
            if (!s || !s.agents.length) return;
            if (state.collapsed[s.id]) delete state.collapsed[s.id];
            else state.collapsed[s.id] = true;
            hideTip();
            render();
            return;
        }
        var sessionRow = ev.target.closest ? ev.target.closest(".row[data-id]") : null;
        if (sessionRow) focusSession(sessionRow.dataset.id);
    });

    document.addEventListener("keydown", function (ev) {
        var sessionRow = ev.target.closest ? ev.target.closest(".row[data-id]") : null;
        if (!sessionRow || ev.target !== sessionRow ||
            (ev.key !== "Enter" && ev.key !== " ")) return;
        ev.preventDefault();
        focusSession(sessionRow.dataset.id);
    });

    function refresh() {
        if (state.busy) return;
        state.busy = true;
        setConnection("busy", "Refreshing…");
        el("refresh").classList.add("on");
        fetch("/api/refresh", { method: "POST" })
            .then(parseResponse)
            .then(function (json) {
                if (json && json.sessions) {
                    state.data = json;
                    render();
                    setConnection("live", "Synced");
                }
            })
            .catch(function (error) {
                setConnection("error", error.message);
            })
            .finally(function () {
                state.busy = false;
                el("refresh").classList.remove("on");
            });
    }

    function switchScope(scope) {
        if (state.busy || !scope) return;
        state.busy = true;
        setConnection("busy", "Switching scope…");
        fetch("/api/scope?scope=" + encodeURIComponent(scope), { method: "POST" })
            .then(parseResponse)
            .then(function (json) {
                state.data = json;
                state.root = "";
                hideTip();
                render();
                el("rows").parentNode.scrollTop = 0;
                setConnection("live", "Synced");
            })
            .catch(function (error) {
                setConnection("error", error.message);
            })
            .finally(function () { state.busy = false; });
    }

    function syncAutoRefresh() {
        var button = el("auto-refresh");
        button.classList.toggle("on", state.autoRefresh);
        button.setAttribute("aria-pressed", state.autoRefresh ? "true" : "false");
        button.innerHTML = ${JSON.stringify(ICONS.clock)} + (state.autoRefresh ? "Auto 30s" : "Auto");
        button.title = state.autoRefresh
            ? "Auto refresh on (every 30s) — click to turn off"
            : "Auto refresh off — click to refresh every 30s";
        button.setAttribute("aria-label", button.title);
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = state.autoRefresh
            ? setInterval(refresh, AUTO_REFRESH_MS)
            : 0;
    }

    function syncAgentToggle() {
        var sessions = state.data.sessions.filter(function (s) {
            return s.agents.length;
        });
        var allCollapsed = sessions.length && sessions.every(function (s) {
            return state.collapsed[s.id];
        });
        var button = el("toggle-agents");
        button.disabled = !sessions.length;
        button.innerHTML = allCollapsed ? ${JSON.stringify(ICONS.expandAll)} : ${JSON.stringify(ICONS.collapseAll)};
        button.title = allCollapsed ? "Expand all sub-agents" : "Collapse all sub-agents";
        button.setAttribute("aria-label", button.title);
        button.setAttribute("aria-expanded", allCollapsed ? "false" : "true");
    }

    function toggleAllAgents() {
        var sessions = state.data.sessions.filter(function (s) {
            return s.agents.length;
        });
        var collapse = !sessions.every(function (s) {
            return state.collapsed[s.id];
        });
        sessions.forEach(function (s) {
            if (collapse) state.collapsed[s.id] = true;
            else delete state.collapsed[s.id];
        });
        render();
    }

    var raf = 0;
    window.addEventListener("resize", function () {
        clearTimeout(raf);
        raf = setTimeout(render, 90);
    });

    function connectEvents() {
        if (!window.EventSource) {
            setConnection("error", "Live updates unavailable");
            return;
        }
        var events = new EventSource("/events");
        events.addEventListener("dashboard", function (event) {
            try {
                state.data = JSON.parse(event.data);
                render();
                setConnection("live", "Connected");
            } catch (error) {
                setConnection("error", "Failed to load update");
            }
        });
        events.onopen = function () { setConnection("live", "Connected"); };
        events.onerror = function () { setConnection("busy", "Reconnecting…"); };
    }

    syncAutoRefresh();
    connectEvents();
    render();
})();
`;

export function renderHtml(data) {
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Credit Timeline</title>
<style>${CSS}</style>
</head>
<body>
<div id="app">
    <header>
        <div class="repo">
            <b id="scope-title">${escapeHtml(data.scope?.label ?? "Credit Timeline")}</b>
            <span class="scope-detail" id="scope-detail">${escapeHtml(data.scope?.detail ?? "")}</span>
            <span id="meta"></span>
            <span class="connection-status" id="connection-status" data-state="live" role="status" aria-live="polite">Connecting…</span>
        </div>
        <div class="kpis" id="kpis"></div>
    </header>
    <div class="flow" id="flow"></div>
    <div class="bar-tools">
        <div id="legend" style="display:flex;gap:6px;flex-wrap:wrap"></div>
        <div class="spacer"></div>
        <div class="tog" id="scope-switch" aria-label="View scope">
            <button data-scope="current_chat_tree" title="Scope: current chat tree" aria-label="Scope: current chat tree">${ICONS.chat}Chat</button>
            <button data-scope="current_repository" title="Scope: current repository" aria-label="Scope: current repository">${ICONS.repo}Repo</button>
            <button data-scope="current_folder" title="Scope: current folder" aria-label="Scope: current folder">${ICONS.folder}Folder</button>
            <button data-scope="all_sessions" title="Scope: all sessions" aria-label="Scope: all sessions">${ICONS.all}All</button>
        </div>
        <div class="tog" aria-label="Time scale">
            <button data-set="compress:1" class="on" title="Compressed time scale (collapse idle gaps)" aria-label="Compressed time scale">${ICONS.compress}Compress</button>
            <button data-set="compress:0" title="Real time scale" aria-label="Real time scale">${ICONS.realtime}Real</button>
        </div>
        <div class="tog" aria-label="Sort order">
            <button data-set="sort:time" class="on" title="Sort by time" aria-label="Sort by time">${ICONS.clock}Time</button>
            <button data-set="sort:aiu" title="Sort by credits (AIU)" aria-label="Sort by credits">${ICONS.credits}Credits</button>
        </div>
        <div class="tog"><button id="toggle-agents" class="icon-only" title="Collapse all sub-agents" aria-label="Collapse all sub-agents" aria-expanded="true">${ICONS.collapseAll}</button></div>
        <div class="tog">
            <button id="auto-refresh" aria-pressed="false" title="Auto refresh off — click to refresh every 30s" aria-label="Auto refresh off — click to refresh every 30s">${ICONS.clock}Auto</button>
            <button id="refresh" class="icon-only" title="Refresh now" aria-label="Refresh now">${ICONS.refresh}</button>
        </div>
    </div>
    <div class="crumbs" id="crumbs"></div>
    <div class="axis grid">
        <div class="cap">Session</div>
        <div class="ticks" id="ticks"></div>
        <div class="cap r">AIU</div>
    </div>
    <div class="body">
        <div class="rows" id="rows"></div>
    </div>
</div>
<div id="tip"></div>
<script>window.__DATA__ = ${json};</script>
<script>${JS}</script>
</body>
</html>`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
}
