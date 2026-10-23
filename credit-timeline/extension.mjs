import { createServer } from "node:http";
import { URL } from "node:url";

import {
    CanvasError,
    createCanvas,
    joinSession,
} from "@github/copilot-sdk/extension";

import {
    collectDashboard,
    resolveScope,
    SCOPES,
    topConsumers,
} from "./data.mjs";
import { renderHtml } from "./view.mjs";

const instances = new Map();
const scopeSchema = {
    type: "string",
    enum: Object.values(SCOPES),
    description:
        "current_chat_tree（現在チャットと配下）、current_repository（現在リポジトリと配下）、current_folder（現在フォルダーと配下）、all_sessions（全セッション）。",
};

function sendJson(res, statusCode, value) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Cross-Origin-Resource-Policy": "same-origin",
    });
    res.end(JSON.stringify(value));
}

function isTrustedRequest(req, origin) {
    if (req.headers.host !== origin.host) return false;
    return !req.headers.origin || req.headers.origin === origin.origin;
}

function configureScope(
    entry,
    { requestedScope, requestedRepository, requestedFolder } = {},
) {
    const resolved = resolveScope({
        requestedScope:
            requestedScope ??
            (requestedRepository
                ? SCOPES.CURRENT_REPOSITORY
                : requestedFolder
                  ? SCOPES.CURRENT_FOLDER
                : entry.scope),
        requestedRepository: requestedRepository ?? entry.repository,
        requestedFolder: requestedFolder ?? entry.folder,
        sessionId: entry.sessionId,
    });
    entry.scope = resolved.type;
    entry.repository = resolved.repository;
    entry.folder = resolved.folder;
}

function broadcastDashboard(entry) {
    const payload = `event: dashboard\ndata: ${JSON.stringify(entry.data)}\n\n`;
    for (const client of entry.clients) {
        client.write(payload);
    }
}

function refresh(entry, options) {
    if (options) configureScope(entry, options);
    entry.data = collectDashboard({
        repository: entry.repository,
        folder: entry.folder,
        currentSessionId: entry.sessionId,
        scope: entry.scope,
    });
    broadcastDashboard(entry);
    return entry.data;
}

async function startServer({
    instanceId,
    repository,
    folder,
    scope,
    sessionId,
}) {
    const entry = {
        data: collectDashboard({
            repository,
            folder,
            currentSessionId: sessionId,
            scope,
        }),
        repository,
        folder,
        scope,
        sessionId,
        server: null,
        url: "",
        clients: new Set(),
    };

    let origin;
    const server = createServer((req, res) => {
        if (!origin || !isTrustedRequest(req, origin)) {
            sendJson(res, 403, { error: "forbidden" });
            return;
        }

        const url = new URL(req.url ?? "/", "http://127.0.0.1");

        try {
            if (req.method === "GET" && url.pathname === "/") {
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                    "Cross-Origin-Resource-Policy": "same-origin",
                    "Content-Security-Policy":
                        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:;",
                });
                res.end(renderHtml(entry.data));
                return;
            }

            if (req.method === "GET" && url.pathname === "/api/data") {
                sendJson(res, 200, entry.data);
                return;
            }

            if (req.method === "GET" && url.pathname === "/events") {
                res.writeHead(200, {
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-store",
                    Connection: "keep-alive",
                });
                res.write(": connected\n\n");
                entry.clients.add(res);
                req.on("close", () => entry.clients.delete(res));
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/refresh") {
                sendJson(res, 200, refresh(entry));
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/scope") {
                sendJson(
                    res,
                    200,
                    refresh(entry, {
                        requestedScope: url.searchParams.get("scope"),
                    }),
                );
                return;
            }

            sendJson(res, 404, { error: "not_found" });
        } catch (error) {
            console.error("Credit Timeline request failed:", error);
            sendJson(res, 500, { error: "request_failed" });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    origin = new URL(`http://127.0.0.1:${port}`);
    entry.server = server;
    entry.url = `${origin.origin}/`;
    instances.set(instanceId, entry);
    return entry;
}

function requireInstance(instanceId) {
    const entry = instances.get(instanceId);
    if (!entry) {
        throw new CanvasError(
            "instance_not_open",
            "Canvas instance is not open.",
        );
    }
    return entry;
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "credit-timeline",
            displayName: "Credit Timeline",
            description:
                "セッションとサブエージェントを時系列のタイムラインで並べ、クレジット(AIU)消費を俯瞰します。",
            inputSchema: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                    repository: {
                        type: "string",
                        description:
                            "owner/repository。current_repository の対象を明示する場合に指定します。",
                    },
                    folder: {
                        type: "string",
                        description:
                            "current_folder の対象ルートフォルダー。省略時は現在セッションから解決します。",
                    },
                    scope: scopeSchema,
                },
            },
            actions: [
                {
                    name: "refresh",
                    description:
                        "ローカルのセッションログと使用量DBを再読込します。",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            repository: { type: "string" },
                            folder: { type: "string" },
                            scope: scopeSchema,
                        },
                    },
                    handler: (ctx) => {
                        const data = refresh(requireInstance(ctx.instanceId), {
                            requestedScope: ctx.input?.scope,
                            requestedRepository: ctx.input?.repository,
                            requestedFolder: ctx.input?.folder,
                        });
                        return {
                            refreshedAt: data.generatedAt,
                            scope: data.scope,
                            repository: data.repository,
                            folder: data.folder,
                            sessions: data.totals.sessions,
                            aiu: data.totals.aiu,
                        };
                    },
                },
                {
                    name: "top_consumers",
                    description:
                        "クレジット消費が大きいセッションを上位から返します。",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            repository: { type: "string" },
                            folder: { type: "string" },
                            scope: scopeSchema,
                            limit: {
                                type: "integer",
                                minimum: 1,
                                maximum: 50,
                                description: "返す件数（既定: 10）。",
                            },
                        },
                    },
                    handler: (ctx) => {
                        const entry = requireInstance(ctx.instanceId);
                        if (
                            ctx.input?.scope ||
                            ctx.input?.repository ||
                            ctx.input?.folder
                        ) {
                            refresh(entry, {
                                requestedScope: ctx.input?.scope,
                                requestedRepository: ctx.input?.repository,
                                requestedFolder: ctx.input?.folder,
                            });
                        }
                        const limit = ctx.input?.limit ?? 10;
                        return {
                            scope: entry.data.scope,
                            repository: entry.data.repository,
                            folder: entry.data.folder,
                            totalAiu: entry.data.totals.aiu,
                            sessions: topConsumers(entry.data, limit),
                        };
                    },
                },
            ],
            open: async (ctx) => {
                /* Idempotent: the same instanceId arrives again on host re-open
                   and on provider reconnect. Keep the server, but re-read the
                   databases so a focused panel never renders stale numbers, and
                   honour a scope switch on the same instance. */
                const resolved = resolveScope({
                    requestedScope: ctx.input?.scope,
                    requestedRepository: ctx.input?.repository,
                    requestedFolder: ctx.input?.folder,
                    sessionId: ctx.sessionId,
                });
                let entry = instances.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer({
                        instanceId: ctx.instanceId,
                        repository: resolved.repository,
                        folder: resolved.folder,
                        scope: resolved.type,
                        sessionId: ctx.sessionId,
                    });
                } else {
                    entry.sessionId = ctx.sessionId;
                    entry.repository = resolved.repository;
                    entry.folder = resolved.folder;
                    entry.scope = resolved.type;
                    refresh(entry);
                }

                const scopeTitle =
                    entry.scope === SCOPES.CURRENT_REPOSITORY
                        ? `Repository: ${entry.repository}`
                        : entry.scope === SCOPES.CURRENT_FOLDER
                          ? `Folder: ${entry.folder}`
                        : entry.scope === SCOPES.ALL_SESSIONS
                          ? "All sessions"
                          : "Current chat tree";
                return {
                    title: `Credit Timeline · ${scopeTitle}`,
                    status: `${entry.data.scope.label} · ${entry.data.totals.sessions} sessions · ${Math.round(entry.data.totals.aiu)} AIU`,
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = instances.get(ctx.instanceId);
                if (!entry) return;
                instances.delete(ctx.instanceId);
                for (const client of entry.clients) client.end();
                entry.clients.clear();
                await new Promise((resolve) => entry.server.close(resolve));
            },
        }),
    ],
});

session.log("Credit Timeline canvas is ready.", {
    level: "info",
    ephemeral: true,
});
