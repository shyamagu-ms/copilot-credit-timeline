import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
    collectDashboard,
    resolveScope,
    SCOPES,
    sessionTreeIds,
} from "./data.mjs";
import { renderHtml } from "./view.mjs";

function createFixture() {
    const root = mkdtempSync(join(tmpdir(), "credit-timeline-"));
    const storePath = join(root, "session-store.db");
    const appPath = join(root, "data.db");
    const stateRoot = join(root, "session-state");
    mkdirSync(stateRoot);

    const sessions = [
        ["chat-root", "", "General chat", "2026-01-01T00:00:00Z"],
        ["chat-child", "", "Child chat", "2026-01-01T01:00:00Z"],
        ["chat-grandchild", "owner/repo-a", "Grandchild", "2026-01-01T02:00:00Z"],
        ["unrelated", "", "Unrelated chat", "2026-01-02T00:00:00Z"],
        ["repo-only", "owner/repo-a", "Repository work", "2026-01-03T00:00:00Z"],
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
         VALUES (?, '', ?, '', ?, ?, ?)`,
    );
    const insertUsage = store.prepare(
        `INSERT INTO assistant_usage_events
         (session_id, agent_id, model, reasoning_effort, initiator,
          total_nano_aiu, input_tokens, output_tokens, duration_ms, created_at)
         VALUES (?, NULL, 'gpt-test', 'medium', 'user', ?, 10, 5, 100, ?)`,
    );
    sessions.forEach(([id, repository, summary, createdAt], index) => {
        insertSession.run(
            id,
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
    store
        .prepare(
            "UPDATE sessions SET repository = 'owner/stale' WHERE id = 'chat-grandchild'",
        )
        .run();
    store.close();

    const app = new DatabaseSync(appPath);
    app.exec(`
        CREATE TABLE workspaces (id INTEGER PRIMARY KEY, session_id TEXT);
        CREATE TABLE workspace_parent_links (
            child_workspace_id INTEGER, parent_workspace_id INTEGER
        );
        INSERT INTO workspaces VALUES
            (1, 'chat-root'), (2, 'chat-child'), (3, 'chat-grandchild'),
            (4, 'unrelated'), (5, 'repo-only');
        INSERT INTO workspace_parent_links VALUES (2, 1), (3, 2);
    `);
    app.close();

    return {
        appPath,
        cleanup: () => rmSync(root, { recursive: true, force: true }),
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
            }),
            {
                type: SCOPES.CURRENT_REPOSITORY,
                repository: "owner/repo-a",
            },
        );
        assert.deepEqual(
            resolveScope({
                sessionId: "chat-root",
                stateRoot: fixture.stateRoot,
            }),
            {
                type: SCOPES.CURRENT_CHAT_TREE,
                repository: "",
            },
        );
        assert.equal(
            resolveScope({
                requestedScope: SCOPES.ALL_SESSIONS,
                sessionId: "chat-root",
                stateRoot: fixture.stateRoot,
            }).type,
            SCOPES.ALL_SESSIONS,
        );
        assert.throws(
            () =>
                resolveScope({
                    requestedScope: SCOPES.CURRENT_REPOSITORY,
                    sessionId: "chat-root",
                    stateRoot: fixture.stateRoot,
                }),
            /requires a repository/,
        );
    } finally {
        fixture.cleanup();
    }
});

test("chat tree includes descendants but not ancestors or siblings", () => {
    const parents = {
        child: "root",
        grandchild: "child",
        sibling: "other",
        root: "ancestor",
    };
    assert.deepEqual(
        new Set(sessionTreeIds("root", parents)),
        new Set(["root", "child", "grandchild"]),
    );
});

test("dashboard collection keeps chat, repository, and all scopes separate", () => {
    const fixture = createFixture();
    try {
        const common = {
            currentSessionId: "chat-root",
            storePath: fixture.storePath,
            stateRoot: fixture.stateRoot,
            appPath: fixture.appPath,
        };
        const chat = collectDashboard({
            ...common,
            scope: SCOPES.CURRENT_CHAT_TREE,
            repository: "",
        });
        assert.equal(chat.scope.type, SCOPES.CURRENT_CHAT_TREE);
        assert.deepEqual(
            chat.sessions.map((session) => session.id),
            ["chat-root", "chat-child", "chat-grandchild"],
        );
        assert.equal(chat.sessions[1].parentId, "chat-root");
        assert.equal(chat.sessions[2].parentId, "chat-child");

        const chatWithoutLinks = collectDashboard({
            ...common,
            scope: SCOPES.CURRENT_CHAT_TREE,
            repository: "",
            appPath: join(fixture.stateRoot, "missing-data.db"),
        });
        assert.deepEqual(
            chatWithoutLinks.sessions.map((session) => session.id),
            ["chat-root"],
        );
        assert.equal(chatWithoutLinks.treeAvailable, false);

        const repository = collectDashboard({
            ...common,
            currentSessionId: "repo-only",
            scope: SCOPES.CURRENT_REPOSITORY,
            repository: "owner/repo-a",
        });
        assert.equal(repository.scope.type, SCOPES.CURRENT_REPOSITORY);
        assert.deepEqual(
            repository.sessions.map((session) => session.id),
            ["chat-grandchild", "repo-only"],
        );

        const all = collectDashboard({
            ...common,
            scope: SCOPES.ALL_SESSIONS,
            repository: "",
        });
        assert.equal(all.scope.type, SCOPES.ALL_SESSIONS);
        assert.equal(all.sessions.length, 5);
    } finally {
        fixture.cleanup();
    }
});

test("rendered UI exposes all three explicit scope controls", () => {
    const html = renderHtml({
        repository: "",
        scope: {
            type: SCOPES.CURRENT_CHAT_TREE,
            label: "Current chat tree",
            detail: "General chat",
        },
        generatedAt: "2026-01-01T00:00:00Z",
        stages: [],
        totals: {},
        sessions: [],
        currentSessionId: "chat-root",
        treeAvailable: true,
        availability: { status: "ready", message: "" },
    });
    assert.match(html, /data-scope="current_chat_tree"/);
    assert.match(html, /data-scope="current_repository"/);
    assert.match(html, /data-scope="all_sessions"/);
    assert.match(html, /Current chat tree/);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.doesNotThrow(() => new Function(scripts.at(-1)[1]));
});
