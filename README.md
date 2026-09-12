# FLASH0VER

Runtime containment for autonomous agent swarms.

FLASH0VER is a defensive AI-security hackathon prototype. A model-driven coordinator delegates to constrained workers inside a repository-owned localhost range. OFF and MONITOR observe capability composition; ENFORCE blocks a deterministic sensitive boundary. The only secret is a worthless rotating canary, and the collector is the source of truth.

## Start locally

Requires Node.js 24. Copy `.env.example` to `.env` and set `LLM_API_KEY`. The default provider is an OpenAI-compatible Chat Completions endpoint configured by `LLM_BASE_URL` and `LLM_MODEL`.

```bash
npm install
npm run preflight
npm run dev
```

Open `http://127.0.0.1:3000`. The control plane listens only on `127.0.0.1:4310`.

## Verify

```bash
npm run verify
npm run demo:reliability
npm run demo:latency
```

`verify` includes strict TypeScript, Vitest, concrete Wasmer isolation probes, and a production Next.js build. `demo:reliability` executes three real OFF and three real ENFORCE runs. `demo:latency` derives a per-call timing report from persisted telemetry. See [build status](docs/BUILD_STATUS.md) for current evidence and blockers.

## Scope

Tools accept only named services in the local range and relative paths. Agent-generated Python executes in Wasmer with a virtual `/workspace`, explicit safe environment keys, disabled networking, and hard timeouts. Do not adapt this project to external targets.
