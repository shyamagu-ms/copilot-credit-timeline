import { createServer } from "node:http";
import { URL } from "node:url";

import {
    CanvasError,
    createCanvas,
    joinSession,
} from "@github/copilot-sdk/extension";

import { collectDashboard, resolveRepository } from "./data.mjs";
import { renderHtml } from "./view.mjs";

const instances = new Map();

function sendJson(res, statusCode, value) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(value));
}

function refresh(entry) {
    entry.data = collectDashboard({
        repository: entry.repository,
        currentSessionId: entry.sessionId,
    });
    return entry.data;
}

async function startServer({ instanceId, repository, sessionId }) {
    const entry = {
        data: collectDashboard({ repository, currentSessionId: sessionId }),
        repository,
        sessionId,
        server: null,
        url: "",
    };

    const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");

        try {
            if (req.method === "GET" && url.pathname === "/") {
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
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

            if (req.method === "POST" && url.pathname === "/api/refresh") {
                sendJson(res, 200, refresh(entry));
                return;
            }

            sendJson(res, 404, { error: "not_found" });
        } catch (error) {
            sendJson(res, 500, {
                error: "request_failed",
                message: error instanceof Error ? error.message : String(error),
            });
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    entry.server = server;
    entry.url = `http://127.0.0.1:${port}/`;
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
                type: "object",
                additionalProperties: false,
                properties: {
                    repository: {
                        type: "string",
                        description:
                            "owner/repository。省略時は現在のセッションから解決します。",
                    },
                },
            },
            actions: [
                {
                    name: "refresh",
                    description:
                        "ローカルのセッションログと使用量DBを再読込します。",
                    handler: (ctx) => {
                        const data = refresh(requireInstance(ctx.instanceId));
                        return {
                            refreshedAt: data.generatedAt,
                            repository: data.repository,
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
                        const limit = ctx.input?.limit ?? 10;
                        return {
                            repository: entry.data.repository,
                            totalAiu: entry.data.totals.aiu,
                            sessions: [...entry.data.sessions]
                                .sort((a, b) => b.aiu - a.aiu)
                                .slice(0, limit)
                                .map((s) => ({
                                    title: s.title,
                                    stage: s.stage,
                                    startedAt: s.createdAt,
                                    elapsedMs: s.elapsedMs,
                                    aiu: s.aiu,
                                    childAiu: s.childAiu,
                                    agents: s.agents.length,
                                })),
                        };
                    },
                },
            ],
            open: async (ctx) => {
                /* Idempotent: the same instanceId arrives again on host re-open
                   and on provider reconnect. Keep the server, but re-read the
                   databases so a focused panel never renders stale numbers, and
                   honour a repository switch on the same instance. */
                const repository = resolveRepository({
                    requestedRepository: ctx.input?.repository,
                    sessionId: ctx.sessionId,
                });
                let entry = instances.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer({
                        instanceId: ctx.instanceId,
                        repository,
                        sessionId: ctx.sessionId,
                    });
                } else {
                    entry.repository = repository;
                    entry.sessionId = ctx.sessionId;
                    refresh(entry);
                }

                return {
                    title: `Credit Timeline · ${entry.repository}`,
                    status: `${entry.data.totals.sessions} sessions · ${Math.round(entry.data.totals.aiu)} AIU`,
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = instances.get(ctx.instanceId);
                if (!entry) return;
                instances.delete(ctx.instanceId);
                await new Promise((resolve) => entry.server.close(resolve));
            },
        }),
    ],
});

session.log("Credit Timeline canvas is ready.", {
    level: "info",
    ephemeral: true,
});
