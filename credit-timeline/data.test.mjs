import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, parse, sep } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
    classifyStageDetail,
    collectDashboard,
    normalizeRootFolder,
    parseEvents,
    readSessionParents,
    resolveScope,
    SCOPES,
    sessionTreeIds,
    topConsumers,
} from "./data.mjs";
import { renderHtml } from "./view.mjs";

const GENERAL_CHAT_ID = "7220b785-5119-4b30-b70e-cb2efa9cee97";
const CREATED_SESSION_ID = "01efb092-8e38-4e6d-9632-d792d57dae0e";

test("stage classification preserves Scrum before general activities", () => {
    assert.deepEqual(classifyStageDetail("increment-development debugging"), {
        stage: "development",
        confidence: "exact",
    });
    assert.equal(classifyStageDetail("Sprint review feedback").stage, "review");
    assert.equal(classifyStageDetail("Investigate login failures").stage, "debugging");
    assert.equal(classifyStageDetail("Research caching options").stage, "research");
    assert.equal(classifyStageDetail("Architecture design").stage, "design");
    assert.equal(classifyStageDetail("Implement account settings").stage, "implementation");
    assert.equal(classifyStageDetail("Run validation tests").stage, "testing");
    assert.equal(classifyStageDetail("Update README docs").stage, "documentation");
    assert.equal(classifyStageDetail("Dependency upgrade").stage, "maintenance");
    assert.equal(classifyStageDetail("Review comments feedback").stage, "feedback");
    assert.equal(classifyStageDetail("Canvas extension tooling").stage, "tooling");
    assert.equal(classifyStageDetail("Discuss next steps").stage, "other");
});

test("session activity follows assistant turns rather than recent events", () => {
    const events = (...items) =>
        parseEvents(
            items
                .map((type, index) =>
                    JSON.stringify({
                        type,
                        timestamp: `2026-01-01T00:00:0${index}Z`,
                        data: { turnId: "turn-1" },
                    }),
                )
                .join("\n"),
        );

    assert.equal(events("session.resume", "session.info").assistantActive, false);
    assert.equal(
        events("session.resume", "user.message", "assistant.turn_start")
            .assistantActive,
        true,
    );
    assert.equal(
        events(
            "user.message",
            "assistant.turn_start",
            "assistant.message",
            "assistant.turn_end",
        ).assistantActive,
        false,
    );
    assert.equal(
        events("assistant.turn_start", "abort").assistantActive,
        false,
    );
});

function createFixture() {
    const root = mkdtempSync(join(tmpdir(), "credit-timeline-"));
    const storePath = join(root, "session-store.db");
    const appPath = join(root, "data.db");
    const stateRoot = join(root, "session-state");
    const folderRoot = join(root, "general");
    const repoRoot = join(root, "repo-a");
    mkdirSync(stateRoot);

    const sessions = [
        [GENERAL_CHAT_ID, "", "General chat", folderRoot, "2026-01-01T00:00:00Z"],
        [CREATED_SESSION_ID, "", "Child chat", join(root, "worktrees", "chat-child"), "2026-01-01T01:00:00Z"],
        ["chat-grandchild", "owner/repo-a", "Grandchild", join(root, "worktrees", "grandchild"), "2026-01-01T02:00:00Z"],
        ["folder-seed", "", "Same folder chat", `${folderRoot}${sep}`, "2026-01-02T00:00:00Z"],
        ["folder-child", "", "Folder child", join(root, "worktrees", "folder-child"), "2026-01-02T01:00:00Z"],
        ["repo-only", "owner/repo-a", "Repository work", repoRoot, "2026-01-03T00:00:00Z"],
        ["repo-child", "", "Repository child", join(root, "worktrees", "repo-child"), "2026-01-03T01:00:00Z"],
    ];

    const store = new DatabaseSync(storePath);
    store.exec(`
        CREATE TABLE sessions (
            id TEXT PRIMARY KEY, cwd TEXT, repository TEXT, branch TEXT,
            summary TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE assistant_usage_events (
            id INTEGER PRIMARY KEY, session_id TEXT, agent_id TEXT,
            model TEXT, reasoning_effort TEXT, initiator TEXT,
            total_nano_aiu INTEGER, input_tokens INTEGER,
            output_tokens INTEGER, duration_ms INTEGER, created_at TEXT
        );
        CREATE TABLE session_refs (
            session_id TEXT, ref_type TEXT, ref_value TEXT, created_at TEXT
        );
    `);
    const insertSession = store.prepare(
        `INSERT INTO sessions
         (id, cwd, repository, branch, summary, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, ?)`,
    );
    const insertUsage = store.prepare(
        `INSERT INTO assistant_usage_events
         (session_id, agent_id, model, reasoning_effort, initiator,
          total_nano_aiu, input_tokens, output_tokens, duration_ms, created_at)
         VALUES (?, NULL, 'gpt-test', 'medium', 'user', ?, 10, 5, 100, ?)`,
    );
    sessions.forEach(([id, repository, summary, cwd, createdAt], index) => {
        insertSession.run(
            id,
            cwd,
            repository || null,
            summary,
            createdAt,
            createdAt,
        );
        insertUsage.run(id, (index + 1) * 1_000_000_000, createdAt);
        const sessionDir = join(stateRoot, id);
        mkdirSync(sessionDir);
        writeFileSync(
            join(sessionDir, "workspace.yaml"),
            `name: ${summary}\nrepository: ${repository}\n`,
        );
    });
    const addLifecycleSession = ({
        id,
        repository = "owner/repo-a",
        summary,
        cwd = folderRoot,
        lifecycle,
        nanoAiu,
    }) => {
        const createdAt = "2026-01-04T00:00:00Z";
        insertSession.run(
            id,
            cwd,
            repository || null,
            summary,
            createdAt,
            createdAt,
        );
        if (nanoAiu !== undefined) {
            insertUsage.run(id, nanoAiu, createdAt);
        }
        const sessionDir = join(stateRoot, id);
        mkdirSync(sessionDir);
        writeFileSync(
            join(sessionDir, "workspace.yaml"),
            `name: ${summary}\nrepository: ${repository}\n`,
        );
        if (lifecycle) {
            writeFileSync(
                join(sessionDir, "events.jsonl"),
                JSON.stringify({
                    type: lifecycle.type,
                    timestamp: lifecycle.timestamp ?? createdAt,
                    data: lifecycle.data ?? {},
                }),
            );
        }
    };
    addLifecycleSession({
        id: "completed-zero",
        summary: "Completed zero",
        lifecycle: {
            type: "session.shutdown",
            data: { shutdownType: "routine" },
        },
    });
    addLifecycleSession({
        id: "cancelled-zero",
        summary: "Cancelled zero",
        lifecycle: {
            type: "session.shutdown",
            data: { shutdownType: "cancelled" },
        },
    });
    addLifecycleSession({
        id: "running-zero",
        summary: "Running zero",
        lifecycle: {
            type: "assistant.turn_start",
            timestamp: new Date().toISOString(),
        },
    });
    addLifecycleSession({
        id: "unknown-zero",
        summary: "Unknown zero",
    });
    addLifecycleSession({
        id: "completed-aiu",
        summary: "Completed with AIU",
        lifecycle: { type: "session.shutdown" },
        nanoAiu: 2_000_000_000,
    });
    addLifecycleSession({
        id: "completed-requests",
        summary: "Completed with requests",
        lifecycle: { type: "session.shutdown" },
        nanoAiu: 0,
    });
    addLifecycleSession({
        id: "filtered-parent",
        summary: "Filtered parent",
        lifecycle: { type: "session.shutdown" },
    });
    addLifecycleSession({
        id: "visible-descendant",
        repository: "",
        summary: "Visible descendant",
        cwd: join(root, "worktrees", "visible-descendant"),
        lifecycle: {
            type: "assistant.turn_start",
            timestamp: new Date().toISOString(),
        },
    });
    addLifecycleSession({
        id: "chat-zero",
        repository: "",
        summary: "Chat zero",
        cwd: join(root, "worktrees", "chat-zero"),
        lifecycle: { type: "session.shutdown" },
    });
    insertSession.run(
        "untitled-zero",
        folderRoot,
        null,
        null,
        "2026-01-04T00:00:00Z",
        "2026-01-04T00:00:00Z",
    );
    store
        .prepare(
            `INSERT INTO assistant_usage_events
             (session_id, agent_id, model, reasoning_effort, initiator,
              total_nano_aiu, input_tokens, output_tokens, duration_ms, created_at)
             VALUES ('repo-child', 'agent-1', 'gpt-test', 'medium', 'user',
                     500000000, 10, 5, 100, '2026-01-03T01:01:00Z')`,
        )
        .run();
    store
        .prepare(
            "UPDATE sessions SET repository = 'owner/stale' WHERE id = 'chat-grandchild'",
        )
        .run();
    store.close();
    writeFileSync(
        join(stateRoot, "repo-child", "events.jsonl"),
        [
            JSON.stringify({
                type: "subagent.started",
                timestamp: "2026-01-03T01:01:00Z",
                agentId: "agent-1",
                data: { agentName: "Task agent" },
            }),
            JSON.stringify({
                type: "subagent.completed",
                timestamp: "2026-01-03T01:02:00Z",
                agentId: "agent-1",
                data: { totalToolCalls: 2, totalTokens: 15 },
            }),
        ].join("\n"),
    );

    const app = new DatabaseSync(appPath);
    app.exec(`
        CREATE TABLE workspaces (
            id INTEGER PRIMARY KEY,
            session_id TEXT,
            creator_session_id TEXT,
            coordinating_creator_session_id TEXT
        );
        CREATE TABLE workspace_parent_links (
            child_workspace_id INTEGER, parent_workspace_id INTEGER
        );
        INSERT INTO workspaces VALUES
            (2, '${CREATED_SESSION_ID}', '${GENERAL_CHAT_ID}', '${GENERAL_CHAT_ID}'),
            (3, 'chat-grandchild', NULL, NULL),
            (4, 'folder-seed', NULL, NULL),
            (5, 'folder-child', 'folder-seed', NULL),
            (6, 'repo-only', NULL, NULL),
            (7, 'repo-child', 'repo-only', 'repo-only'),
            (11, 'completed-zero', NULL, NULL),
            (12, 'cancelled-zero', NULL, NULL),
            (13, 'running-zero', NULL, NULL),
            (19, 'unknown-zero', NULL, NULL),
            (14, 'completed-aiu', NULL, NULL),
            (15, 'completed-requests', NULL, NULL),
            (16, 'filtered-parent', NULL, NULL),
            (17, 'visible-descendant', 'filtered-parent', 'filtered-parent'),
            (18, 'chat-zero', '${GENERAL_CHAT_ID}', '${GENERAL_CHAT_ID}');
        INSERT INTO workspace_parent_links VALUES
            (3, 2);
    `);
    app.close();

    return {
        appPath,
        cleanup: () => rmSync(root, { recursive: true, force: true }),
        folderRoot,
        repoRoot,
        stateRoot,
        storePath,
    };
}

test("scope resolution defaults by repository availability", () => {
    const fixture = createFixture();
    try {
        assert.deepEqual(
            resolveScope({
                sessionId: "repo-only",
                stateRoot: fixture.stateRoot,
                storePath: fixture.storePath,
            }),
            {
                type: SCOPES.CURRENT_REPOSITORY,
                repository: "owner/repo-a",
                folder: normalizeRootFolder(fixture.repoRoot),
            },
        );
        assert.deepEqual(
            resolveScope({
                sessionId: GENERAL_CHAT_ID,
                stateRoot: fixture.stateRoot,
                storePath: fixture.storePath,
            }),
            {
                type: SCOPES.CURRENT_CHAT_TREE,
                repository: "",
                folder: normalizeRootFolder(fixture.folderRoot),
            },
        );
        assert.equal(
            resolveScope({
                requestedScope: SCOPES.ALL_SESSIONS,
                sessionId: GENERAL_CHAT_ID,
                stateRoot: fixture.stateRoot,
            }).type,
            SCOPES.ALL_SESSIONS,
        );
        assert.deepEqual(
            resolveScope({
                requestedScope: SCOPES.CURRENT_FOLDER,
                sessionId: GENERAL_CHAT_ID,
                stateRoot: fixture.stateRoot,
                storePath: fixture.storePath,
            }),
            {
                type: SCOPES.CURRENT_FOLDER,
                repository: "",
                folder: normalizeRootFolder(fixture.folderRoot),
            },
        );
        assert.throws(
            () =>
                resolveScope({
                    requestedScope: SCOPES.CURRENT_REPOSITORY,
                    sessionId: GENERAL_CHAT_ID,
                    stateRoot: fixture.stateRoot,
                }),
            /requires a repository/,
        );
    } finally {
        fixture.cleanup();
    }
});

test("session tree expands multiple seeds without duplicates or guessed links", () => {
    const parents = {
        child: "root",
        grandchild: "child",
        shared: "seed-b",
        sibling: "other",
        root: "ancestor",
    };
    assert.deepEqual(
        new Set(sessionTreeIds(["root", "seed-b", "root"], parents)),
        new Set(["root", "child", "grandchild", "seed-b", "shared"]),
    );
});

test("recorded creator links use safe deterministic precedence", () => {
    const fixture = createFixture();
    try {
        const app = new DatabaseSync(fixture.appPath);
        app.exec(`
            INSERT INTO workspaces VALUES
                (8, 'precedence-child', 'creator-parent', 'coordinator-parent'),
                (9, 'linked-parent', NULL, NULL),
                (10, 'self-fallback', 'creator-parent', 'self-fallback');
            INSERT INTO workspace_parent_links VALUES (8, 9);
        `);
        app.close();

        const result = readSessionParents(fixture.appPath);
        assert.equal(result.available, true);
        assert.equal(result.parents[CREATED_SESSION_ID], GENERAL_CHAT_ID);
        assert.equal(result.parents["chat-grandchild"], CREATED_SESSION_ID);
        assert.equal(
            result.parents["precedence-child"],
            "coordinator-parent",
        );
        assert.equal(result.parents["self-fallback"], "creator-parent");
    } finally {
        fixture.cleanup();
    }
});

test("folder normalization is idempotent and preserves filesystem roots", () => {
    const root = parse(process.cwd()).root;
    assert.equal(normalizeRootFolder(root), normalizeRootFolder(normalizeRootFolder(root)));
    const folder = join(process.cwd(), "folder");
    assert.equal(
        normalizeRootFolder(`${folder}${sep}`),
        normalizeRootFolder(folder),
    );
});

test("dashboard collection keeps chat, repository, and all scopes separate", () => {
    const fixture = createFixture();
    try {
        const common = {
            currentSessionId: GENERAL_CHAT_ID,
            storePath: fixture.storePath,
            stateRoot: fixture.stateRoot,
            appPath: fixture.appPath,
            folder: normalizeRootFolder(fixture.folderRoot),
        };
        const chat = collectDashboard({
            ...common,
            scope: SCOPES.CURRENT_CHAT_TREE,
            repository: "",
        });
        assert.equal(chat.scope.type, SCOPES.CURRENT_CHAT_TREE);
        assert.deepEqual(
            chat.sessions.map((session) => session.id),
            [
                GENERAL_CHAT_ID,
                CREATED_SESSION_ID,
                "chat-grandchild",
            ],
        );
        assert.equal(chat.sessions[1].parentId, GENERAL_CHAT_ID);
        assert.equal(chat.sessions[2].parentId, CREATED_SESSION_ID);
        const terminalChatRoot = collectDashboard({
            ...common,
            currentSessionId: "completed-zero",
            scope: SCOPES.CURRENT_CHAT_TREE,
            repository: "",
        });
        assert.deepEqual(
            terminalChatRoot.sessions.map((session) => session.id),
            ["completed-zero"],
        );

        const chatWithoutLinks = collectDashboard({
            ...common,
            scope: SCOPES.CURRENT_CHAT_TREE,
            repository: "",
            appPath: join(fixture.stateRoot, "missing-data.db"),
        });
        assert.deepEqual(
            chatWithoutLinks.sessions.map((session) => session.id),
            [GENERAL_CHAT_ID],
        );
        assert.equal(chatWithoutLinks.treeAvailable, false);

        const repository = collectDashboard({
            ...common,
            currentSessionId: "repo-only",
            scope: SCOPES.CURRENT_REPOSITORY,
            repository: "owner/repo-a",
        });
        assert.equal(repository.scope.type, SCOPES.CURRENT_REPOSITORY);
        assert.equal(repository.source.usage, "session-store.db");
        assert.equal(repository.source.events, "session-state");
        assert.deepEqual(
            repository.sessions.map((session) => session.id).sort(),
            [
                "completed-aiu",
                "completed-requests",
                "chat-grandchild",
                "repo-only",
                "repo-child",
                "running-zero",
                "visible-descendant",
            ].sort(),
        );
        assert.equal(
            repository.sessions.find(
                (session) => session.id === "repo-child",
            ).parentId,
            "repo-only",
        );
        assert.equal(
            repository.sessions.find(
                (session) => session.id === "repo-child",
            ).agents.length,
            1,
        );
        assert.equal(
            repository.sessions.find(
                (session) => session.id === "visible-descendant",
            ).parentId,
            "",
        );
        assert.equal(repository.totals.sessions, 7);
        assert.equal(repository.totals.agents, 1);
        assert.equal(repository.totals.aiu, 18.5);
        assert.equal(repository.totals.requests, 6);

        const folder = collectDashboard({
            ...common,
            scope: SCOPES.CURRENT_FOLDER,
            repository: "",
        });
        assert.equal(folder.scope.type, SCOPES.CURRENT_FOLDER);
        assert.deepEqual(
            folder.sessions.map((session) => session.id).sort(),
            [
                "completed-aiu",
                "completed-requests",
                GENERAL_CHAT_ID,
                CREATED_SESSION_ID,
                "chat-grandchild",
                "folder-seed",
                "folder-child",
                "running-zero",
                "visible-descendant",
            ].sort(),
        );
        assert.equal(folder.totals.sessions, 9);
        assert.equal(
            folder.sessions.some((session) => session.id === "untitled-zero"),
            false,
        );
        assert.equal(
            folder.sessions.find(
                (session) => session.id === "visible-descendant",
            ).parentId,
            "",
        );

        const all = collectDashboard({
            ...common,
            scope: SCOPES.ALL_SESSIONS,
            repository: "",
        });
        assert.equal(all.scope.type, SCOPES.ALL_SESSIONS);
        assert.equal(all.sessions.length, 11);
        assert.equal(
            all.sessions.some((session) => session.id === "untitled-zero"),
            false,
        );
        assert.deepEqual(
            all.sessions
                .filter((session) =>
                    [
                        "running-zero",
                        "completed-aiu",
                        "completed-requests",
                    ].includes(session.id),
                )
                .map((session) => session.id)
                .sort(),
            [
                "running-zero",
                "completed-aiu",
                "completed-requests",
            ].sort(),
        );
        assert.equal(
            topConsumers(all, 50).some(
                (session) =>
                    session.title === "Completed zero" ||
                    session.title === "Cancelled zero" ||
                    session.title === "Filtered parent",
            ),
            false,
        );
    } finally {
        fixture.cleanup();
    }
});

test("rendered UI exposes all four explicit scope controls", () => {
    const html = renderHtml({
        repository: "",
        folder: normalizeRootFolder(process.cwd()),
        scope: {
            type: SCOPES.CURRENT_CHAT_TREE,
            label: "Current chat tree",
            detail: "General chat",
        },
        generatedAt: "2026-01-01T00:00:00Z",
        stages: [],
        totals: {},
        sessions: [],
        currentSessionId: GENERAL_CHAT_ID,
        treeAvailable: true,
        availability: { status: "ready", message: "" },
    });
    assert.match(html, /data-scope="current_chat_tree"/);
    assert.match(html, /data-scope="current_repository"/);
    assert.match(html, /data-scope="current_folder"/);
    assert.match(html, /data-scope="all_sessions"/);
    assert.match(html, /Current chat tree/);
    assert.match(html, /new EventSource\("\/events"\)/);
    assert.match(html, /id="connection-status"/);
    assert.match(html, /min\(var\(--timeline-label-width\), 52%\)/);
    assert.match(html, /grid-template-columns: minmax\(0, 1fr\) max-content/);
    assert.match(html, /max-width: 100%/);
    assert.match(html, /container-type: inline-size/);
    assert.match(html, /class="model"/);
    assert.match(html, /class="effort"/);
    assert.doesNotMatch(html, /minmax\(0, (?:72|96)px\)/);
    assert.doesNotMatch(html, /\.g \.run \{ display: none; \}/);
    assert.doesNotMatch(html, /current-badge/);
    assert.doesNotMatch(html, /Focus<\/button>/);
    assert.doesNotMatch(html, /ICONS\.focus/);
    assert.match(html, /tabindex="0" role="group"/);
    assert.match(html, /document\.addEventListener\("keydown"/);
    assert.match(html, /function pruneTickLabels\(host\)/);
    assert.match(html, /getBoundingClientRect\(\)/);
    assert.match(html, /data-edge="start"/);
    assert.match(html, /data-edge="end"/);
    assert.match(html, /var width = Math\.max\(1, timeline\.clientWidth\)/);
    assert.match(html, /width \* 0\.2\) \/ gapCount/);
    assert.doesNotMatch(html, /domainMax\s*=\s*Math\.max\(domainMax,\s*Date\.now\(\)\)/);
    assert.match(html, /\.bar\.active::after/);
    assert.match(html, /animation: active-shimmer 2\.8s ease-in-out infinite/);
    assert.match(html, /0 0 0 1px color-mix/);
    assert.match(html, /prefers-reduced-motion: reduce/);
    assert.match(html, /var active = s\.status === "active"/);
    assert.match(html, /Boolean\(g\.startedAt && !g\.completedAt\)/);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.doesNotThrow(() => new Function(scripts.at(-1)[1]));
});
