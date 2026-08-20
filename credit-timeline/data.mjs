import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const COPILOT_HOME =
    process.env.COPILOT_HOME || join(homedir(), ".copilot");
const SESSION_STORE = join(COPILOT_HOME, "session-store.db");
const SESSION_STATE = join(COPILOT_HOME, "session-state");
const APP_STORE = join(COPILOT_HOME, "data.db");

export const STAGES = [
    { id: "goal", label: "Product Goal", order: 10 },
    { id: "backlog", label: "Backlog", order: 20 },
    { id: "planning", label: "Planning", order: 30 },
    { id: "lap", label: "Lap Scrum", order: 40 },
    { id: "development", label: "Development", order: 50 },
    { id: "gate", label: "DoD Gate", order: 60 },
    { id: "review", label: "Review", order: 70 },
    { id: "retro", label: "Retrospective", order: 80 },
    { id: "feedback", label: "Feedback", order: 90 },
    { id: "tooling", label: "Tooling", order: 95 },
    { id: "other", label: "Other", order: 100 },
];

const SKILL_STAGES = [
    ["gate", /final-dod-gate/],
    ["retro", /sprint-retrospective/],
    ["review", /sprint-review/],
    ["lap", /lap-scrum/],
    ["planning", /sprint-planning/],
    ["backlog", /product-backlog-refinement|pbi-registration/],
    ["goal", /product-goal-refinement/],
    ["development", /increment-development/],
];

function safeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function firstMeaningfulLine(value) {
    return safeText(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
}

export function classifyStageDetail(value) {
    const text = (firstMeaningfulLine(value) ?? "").toLowerCase();
    const skill = SKILL_STAGES.map(([stage, pattern]) => ({
        stage,
        index: text.search(pattern),
    }))
        .filter((candidate) => candidate.index >= 0)
        .sort((a, b) => a.index - b.index)[0];
    if (skill) return { stage: skill.stage, confidence: "exact" };

    const lead = text.slice(0, 140);
    const rules = [
        [
            "gate",
            /final[- ]?dod|dod[- ]?gate|最終.*ゲート|受入.*ゲート/,
        ],
        [
            "retro",
            /retrospective|レトロスペクティブ|振り返り/,
        ],
        ["review", /sprint(?:[- ]?\d+)?[- ]?review|スプリントレビュー/],
        ["lap", /lap[- ]?scrum|ラップスクラム/],
        ["planning", /sprint[- ]?planning|スプリント計画/],
        [
            "backlog",
            /pbi[- ]?registration|backlog[- ]?refinement|バックログ|pbi登録/,
        ],
        ["goal", /product[- ]?goal|プロダクトゴール/],
        [
            "feedback",
            /feedback|フィードバック|テンプレート検証|総括/,
        ],
        [
            "tooling",
            /canvas|キャンバス|extension|拡張機能|ツール整備|\.github\//,
        ],
        [
            "development",
            /increment[- ]?development|issue\s*#?\d+|実装|開発|fix|feat/,
        ],
    ];
    const stage =
        rules.find(([, pattern]) => pattern.test(lead))?.[0] ?? "other";
    return { stage, confidence: "inferred" };
}

export function classifyStage(value) {
    return classifyStageDetail(value).stage;
}

export function parseWorkspaceName(content) {
    const match = content.match(/^name:\s*(.+)$/m);
    if (!match) return "";
    const raw = match[1].trim();
    if (/^[>|][+-]?$/.test(raw)) {
        const tail = content.slice((match.index ?? 0) + match[0].length);
        return (
            tail
                .split(/\r?\n/)
                .filter((line) => /^\s+/.test(line))
                .map((line) => line.trim())
                .find(Boolean) ?? ""
        );
    }
    if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
    ) {
        return raw.slice(1, -1);
    }
    return raw;
}

function conciseTitle(value) {
    const line = firstMeaningfulLine(value) ?? "";
    const sentence = line.split(/(?<=。)|(?<=[.!?])\s/)[0] || line;
    return sentence.length > 64 ? `${sentence.slice(0, 63)}…` : sentence;
}

function readWorkspace(sessionId, stateRoot = SESSION_STATE) {
    const path = join(stateRoot, sessionId, "workspace.yaml");
    if (!existsSync(path)) return {};
    const content = readFileSync(path, "utf8");
    const value = (key) =>
        content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
    return {
        name: parseWorkspaceName(content),
        branch: value("branch"),
        repository: value("repository"),
    };
}

export function parseEvents(content) {
    const agents = new Map();
    const taskMetadata = new Map();
    let lastEventAt = "";
    let lastLifecycleType = "";
    let selectedModel = "";
    let reasoningEffort = "";

    for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) continue;
        let event;
        try {
            event = JSON.parse(line);
        } catch {
            continue;
        }

        if (event.timestamp && event.timestamp > lastEventAt) {
            lastEventAt = event.timestamp;
        }
        if (
            event.type === "session.start" ||
            event.type === "session.resume" ||
            event.type === "session.shutdown"
        ) {
            lastLifecycleType = event.type;
            selectedModel =
                safeText(event.data?.selectedModel) || selectedModel;
            reasoningEffort =
                safeText(event.data?.reasoningEffort) || reasoningEffort;
        }
        if (
            event.type === "tool.execution_start" &&
            event.data?.toolName === "task"
        ) {
            const toolCallId = safeText(event.data?.toolCallId);
            const args =
                event.data?.arguments &&
                typeof event.data.arguments === "object"
                    ? event.data.arguments
                    : {};
            if (toolCallId) {
                taskMetadata.set(toolCallId, {
                    taskName: safeText(args.name),
                    taskDescription: safeText(args.description),
                    promptSummary: conciseTitle(args.prompt),
                });
            }
        }
        if (event.type === "subagent.started") {
            const id =
                event.agentId ??
                event.data?.agentId ??
                event.data?.toolCallId;
            if (!id) continue;
            agents.set(id, {
                id,
                name:
                    event.data?.agentDisplayName ??
                    event.data?.agentName ??
                    "Sub-agent",
                model: event.data?.model ?? "",
                reasoningEffort: event.data?.reasoningEffort ?? "",
                startedAt: event.timestamp ?? "",
                completedAt: "",
                durationMs: 0,
                toolCalls: 0,
                totalTokens: 0,
            });
        }

        if (event.type === "subagent.completed") {
            const id =
                event.agentId ??
                event.data?.agentId ??
                event.data?.toolCallId;
            if (!id) continue;
            const prior = agents.get(id) ?? {
                id,
                name:
                    event.data?.agentDisplayName ??
                    event.data?.agentName ??
                    "Sub-agent",
                model: event.data?.model ?? "",
                reasoningEffort: event.data?.reasoningEffort ?? "",
                startedAt: "",
            };
            agents.set(id, {
                ...prior,
                completedAt: event.timestamp ?? "",
                durationMs: Number(event.data?.durationMs ?? 0),
                toolCalls: Number(event.data?.totalToolCalls ?? 0),
                totalTokens: Number(event.data?.totalTokens ?? 0),
            });
        }
    }

    return {
        agents: [...agents.values()].map((agent) => ({
            ...agent,
            ...(taskMetadata.get(agent.id) ?? {
                taskName: "",
                taskDescription: "",
                promptSummary: "",
            }),
        })),
        lastEventAt,
        lastLifecycleType,
        selectedModel,
        reasoningEffort,
    };
}

function readEvents(sessionId, stateRoot = SESSION_STATE) {
    const path = join(stateRoot, sessionId, "events.jsonl");
    if (!existsSync(path)) {
        return {
            agents: [],
            lastEventAt: "",
            lastLifecycleType: "",
            selectedModel: "",
            reasoningEffort: "",
        };
    }
    return parseEvents(readFileSync(path, "utf8"));
}

function statusFromEvents(events) {
    if (events.lastLifecycleType === "session.shutdown") return "idle";
    if (!events.lastEventAt) return "unknown";
    const age = Date.now() - Date.parse(events.lastEventAt);
    return age < 15 * 60 * 1000 ? "active" : "inactive";
}

function durationMs(start, end) {
    const from = Date.parse(start);
    const to = Date.parse(end);
    return Number.isFinite(from) && Number.isFinite(to)
        ? Math.max(0, to - from)
        : 0;
}

function placeholders(count) {
    return Array.from({ length: count }, () => "?").join(",");
}

function emptyTotals() {
    return {
        sessions: 0,
        agents: 0,
        aiu: 0,
        compactionAiu: 0,
        parentAiu: 0,
        childAiu: 0,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
    };
}

export function resolveRepository({
    requestedRepository,
    sessionId,
    stateRoot = SESSION_STATE,
}) {
    if (safeText(requestedRepository)) return requestedRepository.trim();
    const workspace = readWorkspace(sessionId, stateRoot);
    if (workspace.repository) return workspace.repository;
    throw new Error(
        "Repository could not be resolved. Pass { repository: 'owner/repo' } when opening the canvas.",
    );
}

export function collectDashboard({
    repository,
    currentSessionId,
    storePath = SESSION_STORE,
    stateRoot = SESSION_STATE,
    appPath = APP_STORE,
}) {
    if (!existsSync(storePath)) {
        return {
            repository,
            generatedAt: new Date().toISOString(),
            stages: STAGES,
            totals: emptyTotals(),
            sessions: [],
            currentSessionId: currentSessionId ?? "",
            treeAvailable: false,
            availability: {
                status: "empty",
                code: "session_store_missing",
                message:
                    "No Copilot session data yet. Use a session, then hit Refresh.",
            },
            source: {
                usage: storePath,
                events: stateRoot,
                aiuFormula: "SUM(total_nano_aiu) / 1,000,000,000",
                note: "No local session store is available yet.",
            },
        };
    }

    const db = new DatabaseSync(storePath, { readOnly: true });
    let transactionOpen = false;
    try {
        db.exec("BEGIN");
        transactionOpen = true;
        const includeCurrent = safeText(currentSessionId);
        const candidateRows = db
            .prepare(
                `SELECT
                    s.id,
                    s.cwd,
                    s.repository,
                    s.branch,
                    s.summary,
                    s.created_at,
                    s.updated_at,
                    COUNT(u.id) AS requests,
                    COALESCE(SUM(u.total_nano_aiu), 0) AS nano_aiu,
                    COALESCE(SUM(CASE WHEN u.initiator = 'compaction' THEN u.total_nano_aiu ELSE 0 END), 0)
                        AS compaction_nano_aiu,
                    COALESCE(SUM(CASE WHEN u.initiator = 'compaction' THEN 1 ELSE 0 END), 0)
                        AS compaction_requests,
                    COALESCE(SUM(u.input_tokens), 0) AS input_tokens,
                    COALESCE(SUM(u.output_tokens), 0) AS output_tokens,
                    COALESCE(SUM(u.duration_ms), 0) AS model_duration_ms,
                    MAX(u.created_at) AS usage_updated_at
                 FROM sessions s
                 LEFT JOIN assistant_usage_events u ON u.session_id = s.id
                 WHERE s.repository = ?${
                     includeCurrent ? " OR s.id = ?" : ""
                 }
                 GROUP BY s.id
                 ORDER BY s.created_at`,
            )
            .all(...(includeCurrent
                ? [repository, includeCurrent]
                : [repository]));
        const rows = candidateRows.filter((row) => {
            if (row.id !== includeCurrent) return true;
            const workspaceRepository = readWorkspace(
                row.id,
                stateRoot,
            ).repository;
            return (workspaceRepository || row.repository) === repository;
        });

        const ids = rows.map((row) => row.id);
        const usageByAgent = new Map();
        const refsBySession = new Map();

        if (ids.length) {
            const usageRows = db
                .prepare(
                    `SELECT
                        session_id,
                        agent_id,
                        model,
                        reasoning_effort,
                        COUNT(*) AS requests,
                        COALESCE(SUM(total_nano_aiu), 0) AS nano_aiu,
                        COALESCE(SUM(input_tokens), 0) AS input_tokens,
                        COALESCE(SUM(output_tokens), 0) AS output_tokens,
                        MAX(created_at) AS last_used_at
                     FROM assistant_usage_events
                     WHERE session_id IN (${placeholders(ids.length)})
                     GROUP BY session_id, agent_id, model, reasoning_effort`,
                )
                .all(...ids);
            for (const row of usageRows) {
                const list = usageByAgent.get(row.session_id) ?? [];
                list.push(row);
                usageByAgent.set(row.session_id, list);
            }

            const refRows = db
                .prepare(
                    `SELECT session_id, ref_type, ref_value
                     FROM session_refs
                     WHERE session_id IN (${placeholders(ids.length)})
                     ORDER BY created_at`,
                )
                .all(...ids);
            for (const row of refRows) {
                const list = refsBySession.get(row.session_id) ?? [];
                list.push({ type: row.ref_type, value: row.ref_value });
                refsBySession.set(row.session_id, list);
            }
        }

        db.exec("COMMIT");
        transactionOpen = false;

        const tree = readSessionParents(appPath);
        const known = new Set(rows.map((row) => row.id));

        const sessions = rows.map((row) => {
            const workspace = readWorkspace(row.id, stateRoot);
            const events = readEvents(row.id, stateRoot);
            const agentUsage = usageByAgent.get(row.id) ?? [];
            const usageMap = new Map();
            const modelProfiles = [];
            let parentAiu = 0;
            let childAiu = 0;
            for (const usage of agentUsage) {
                const aiu = Number(usage.nano_aiu) / 1_000_000_000;
                const profile = {
                    model: safeText(usage.model),
                    reasoningEffort: safeText(usage.reasoning_effort),
                    requests: Number(usage.requests),
                    aiu,
                    lastUsedAt: usage.last_used_at ?? "",
                };
                if (!usage.agent_id) {
                    parentAiu += aiu;
                    modelProfiles.push(profile);
                    continue;
                }
                childAiu += aiu;
                const prior = usageMap.get(usage.agent_id) ?? {
                    aiu: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    requests: 0,
                    models: new Set(),
                    reasoningEfforts: new Set(),
                    profiles: [],
                };
                prior.aiu += aiu;
                prior.inputTokens += Number(usage.input_tokens);
                prior.outputTokens += Number(usage.output_tokens);
                prior.requests += Number(usage.requests);
                prior.models.add(usage.model);
                if (profile.reasoningEffort) {
                    prior.reasoningEfforts.add(profile.reasoningEffort);
                }
                prior.profiles.push(profile);
                usageMap.set(usage.agent_id, prior);
            }

            modelProfiles.sort((a, b) =>
                (b.lastUsedAt || "").localeCompare(a.lastUsedAt || ""),
            );
            for (const usage of usageMap.values()) {
                usage.profiles.sort((a, b) =>
                    (b.lastUsedAt || "").localeCompare(
                        a.lastUsedAt || "",
                    ),
                );
            }
            const primaryProfile = modelProfiles[0] ?? {
                model: events.selectedModel,
                reasoningEffort: events.reasoningEffort,
            };

            const agents = events.agents.map((agent) => {
                const usage = usageMap.get(agent.id);
                return {
                    ...agent,
                    aiu: usage?.aiu ?? 0,
                    inputTokens: usage?.inputTokens ?? 0,
                    outputTokens: usage?.outputTokens ?? 0,
                    requests: usage?.requests ?? 0,
                    models: usage ? [...usage.models] : [],
                    reasoningEfforts: usage
                        ? [...usage.reasoningEfforts]
                        : [],
                    profiles: usage?.profiles ?? [],
                    model: usage?.profiles[0]?.model || agent.model,
                    reasoningEffort:
                        usage?.profiles[0]?.reasoningEffort ||
                        agent.reasoningEffort,
                };
            });

            for (const [id, usage] of usageMap) {
                if (agents.some((agent) => agent.id === id)) continue;
                agents.push({
                    id,
                    name: "Sub-agent",
                    taskName: "",
                    taskDescription: "",
                    promptSummary: "",
                    model: usage.profiles[0]?.model ?? "",
                    reasoningEffort:
                        usage.profiles[0]?.reasoningEffort ?? "",
                    startedAt: "",
                    completedAt: "",
                    durationMs: 0,
                    toolCalls: 0,
                    totalTokens: 0,
                    aiu: usage.aiu,
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    requests: usage.requests,
                    models: [...usage.models],
                    reasoningEfforts: [...usage.reasoningEfforts],
                    profiles: usage.profiles,
                });
            }

            const rawTitle =
                workspace.name ||
                firstMeaningfulLine(row.summary) ||
                workspace.branch ||
                row.branch ||
                row.id;
            const classification = classifyStageDetail(rawTitle);
            const title = conciseTitle(rawTitle);
            const finishedAt =
                events.lastEventAt || row.updated_at || row.created_at;

            return {
                id: row.id,
                title,
                branch: workspace.branch || row.branch || "",
                parentId: known.has(tree.parents[row.id])
                    ? tree.parents[row.id]
                    : "",
                stage: classification.stage,
                stageConfidence: classification.confidence,
                status: statusFromEvents(events),
                current: row.id === currentSessionId,
                createdAt: row.created_at,
                finishedAt,
                elapsedMs: durationMs(row.created_at, finishedAt),
                aiu: Number(row.nano_aiu) / 1_000_000_000,
                compactionAiu: Number(row.compaction_nano_aiu) / 1_000_000_000,
                compactionRequests: Number(row.compaction_requests),
                parentAiu,
                childAiu,
                requests: Number(row.requests),
                inputTokens: Number(row.input_tokens),
                outputTokens: Number(row.output_tokens),
                modelDurationMs: Number(row.model_duration_ms),
                usageUpdatedAt: row.usage_updated_at ?? "",
                model: primaryProfile.model || events.selectedModel,
                reasoningEffort:
                    primaryProfile.reasoningEffort ||
                    events.reasoningEffort,
                modelProfiles,
                agents: agents.sort((a, b) =>
                    (a.startedAt || "").localeCompare(b.startedAt || ""),
                ),
                refs: refsBySession.get(row.id) ?? [],
            };
        });

        const totals = sessions.reduce(
            (result, item) => {
                result.sessions += 1;
                result.agents += item.agents.length;
                result.aiu += item.aiu;
                result.compactionAiu += item.compactionAiu;
                result.parentAiu += item.parentAiu;
                result.childAiu += item.childAiu;
                result.requests += item.requests;
                result.inputTokens += item.inputTokens;
                result.outputTokens += item.outputTokens;
                return result;
            },
            {
                sessions: 0,
                agents: 0,
                aiu: 0,
                compactionAiu: 0,
                parentAiu: 0,
                childAiu: 0,
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
            },
        );

        const dashboard = {
            repository,
            generatedAt: new Date().toISOString(),
            stages: STAGES,
            totals,
            sessions,
            currentSessionId: currentSessionId ?? "",
            treeAvailable: tree.available,
            availability: {
                status: "ready",
                code: null,
                message: "",
            },
            source: {
                usage: storePath,
                events: stateRoot,
                aiuFormula: "SUM(total_nano_aiu) / 1,000,000,000",
                note: "Project sessions are grouped by inferred Scrum stage. Task sub-agents are nested from subagent lifecycle events.",
            },
        };
        return dashboard;
    } finally {
        if (transactionOpen) {
            try {
                db.exec("ROLLBACK");
            } catch {
                // Preserve the original collection error.
            }
        }
        db.close();
    }
}

/**
 * Session parent/child links, as recorded by the app when one session spawns
 * another (create_session / fork). Keyed by CLI session id. Missing or
 * unreadable app store is not an error: the timeline just stays flat.
 */
export function readSessionParents(appPath = APP_STORE) {
    if (!existsSync(appPath)) return { parents: {}, available: false };
    let db;
    try {
        db = new DatabaseSync(appPath, { readOnly: true });
        const rows = db
            .prepare(
                `SELECT w.session_id AS child, p.session_id AS parent
                 FROM workspaces w
                 JOIN workspace_parent_links l ON l.child_workspace_id = w.id
                 JOIN workspaces p ON p.id = l.parent_workspace_id
                 WHERE w.session_id IS NOT NULL AND p.session_id IS NOT NULL`,
            )
            .all();
        const parents = {};
        for (const row of rows) parents[row.child] = row.parent;
        return { parents, available: true };
    } catch {
        return { parents: {}, available: false };
    } finally {
        try {
            db?.close();
        } catch {
            // The app may hold the store open; a flat timeline is fine.
        }
    }
}

export function listStateDirectories(stateRoot = SESSION_STATE) {
    if (!existsSync(stateRoot)) return [];
    return readdirSync(stateRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
}
