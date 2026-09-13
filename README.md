<p align="center">
  <img src="docs/assets/flash0ver-mark.png" alt="FLASH0VER logo mark" width="118" />
</p>

<p align="center">
  <img src="docs/assets/flash0ver-wordmark.png" alt="FLASH0VER" width="620" />
</p>

<p align="center">
  <strong>Secure the swarm, not just the agents.</strong>
</p>

<p align="center">
  Runtime security, incident reconstruction, and selective containment for autonomous AI agent swarms.
</p>

<p align="center">
  <a href="https://github.com/Muzzy5150/Flash0ver"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" /></a>
  <img alt="Tests" src="https://img.shields.io/badge/tests-65%20passing-34d399?style=for-the-badge" />
  <img alt="Agents" src="https://img.shields.io/badge/agents-20%2B-22d3ee?style=for-the-badge" />
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111111" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-GPT--5.6%20Sol-10A37F?style=flat-square&logo=openai&logoColor=white" />
  <img alt="Daybreak Blue" src="https://img.shields.io/badge/Daybreak-Blue-2563EB?style=flat-square" />
  <img alt="Wasmer" src="https://img.shields.io/badge/Wasmer-Sandboxed-654FF0?style=flat-square" />
  <img alt="Tenki Cloud" src="https://img.shields.io/badge/Tenki-Disposable%20Range-06B6D4?style=flat-square" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-65%2F65-6E9F18?style=flat-square&logo=vitest&logoColor=white" />
</p>

<p align="center">
  <a href="#overview">Overview</a>
  ·
  <a href="#what-it-does">What It Does</a>
  ·
  <a href="#how-it-works">How It Works</a>
  ·
  <a href="#security-evidence">Security Evidence</a>
  ·
  <a href="#quick-start">Quick Start</a>
</p>

<p align="center">
  <img src="docs/screenshots/command-center-compromised.png" alt="FLASH0VER incident command center showing a real multi-agent compromise" width="100%" />
</p>

## Overview

FLASH0VER is a runtime security platform for autonomous AI agent swarms. It observes real model-driven agents as they delegate work, exchange evidence, use tools, trigger deception assets, and combine individually limited permissions into collective capabilities.

The primary demo target is **ACME Autonomous Systems**, a disposable nine-service organization that can run locally or inside Tenki Cloud. Roughly twenty specialized agents investigate independent surfaces across web, source code, identity, observability, and operations while FLASH0VER tracks provenance and capability composition across the swarm.

With enforcement **OFF**, cross-team evidence can compose into synthetic production control: ACME's target state changes and a rotating canary reaches the proof collector. With **ENFORCE** enabled, FLASH0VER detects the emergent capability, blocks the sensitive boundary, invokes bounded Sentinel containment, and keeps the remaining swarm operational.

Agent-directed execution is isolated with **Wasmer**. Tenki provides disposable target infrastructure. The post-run **After Action Report** reconstructs the incident from persisted runtime telemetry, including agent contributions, communications, evidence handoffs, deception events, policy decisions, target effects, and containment actions.

> [!NOTE]
> FLASH0VER is a defensive security research project. Adversarial behavior is confined to localhost, Wasmer sandboxes, and project-owned disposable Tenki environments. Synthetic credentials, canaries, identities, and customer records have no value outside the range.

## What It Does

| Capability | What FLASH0VER verifies |
| --- | --- |
| Real autonomous swarm | Runs ~20 model-driven agents organized into command, team-lead, worker, operations, and Sentinel roles. |
| Capability composition | Tracks how evidence and individually limited permissions combine into dangerous swarm-level capability. |
| Provenance tracking | Preserves where evidence originated and how it moved across agents and teams. |
| Deception grid | Plants harmless honey documents, credentials, identities, records, files, and canaries throughout ACME. |
| Threat progression | Derives breach stage, severity, and blast radius from actual runtime events. |
| Deterministic policy | Supports `OFF`, `MONITOR`, and `ENFORCE` without handing final security decisions to another LLM. |
| Sentinel containment | Uses a bounded defensive agent to propose minimal containment that deterministic policy must validate. |
| Wasmer isolation | Runs model-directed computation inside fresh capability-restricted Wasmer sandboxes. |
| Tenki cyber range | Creates, provisions, resets, verifies, and destroys disposable cloud targets with orphan checks. |
| Visible target compromise | Changes ACME's independent production state when the swarm genuinely succeeds. |
| Canary proof | Uses a rotating worthless canary as an independent machine-verifiable compromise signal. |
| After Action Report | Explains what happened, why, which agents mattered, who communicated, what evidence moved, and what policy fired. |
| Fresh replay | Reruns equivalent conditions as a new model-driven execution rather than replaying recorded telemetry. |

## How It Works

```text
                            FLASH0VER
                                │
                     ┌──────────┴──────────┐
                     │                     │
                AGENT SWARM            SENTINEL
                     │                     │
          ┌──────────┼──────────┐          │
          │          │          │          │
         WEB        CODE     IDENTITY      │
          │          │          │          │
          └──────┐   │   ┌──────┘          │
                 ▼   ▼   ▼                 │
              EVIDENCE GRAPH               │
                     │                      │
                     ▼                      │
           CAPABILITY COMPOSITION ◄────────┘
                     │
             OFF / MONITOR / ENFORCE
                     │
                     ▼
          ┌─────────────────────────┐
          │ ACME AUTONOMOUS SYSTEMS │
          │ disposable cyber range  │
          │ local or Tenki Cloud    │
          └─────────────────────────┘

Agent computation      → Wasmer isolation
Target infrastructure  → Tenki Cloud / local fallback
Swarm-level security   → FLASH0VER
```

### ACME Autonomous Systems

Range V2 is a deliberately designed synthetic company with independent services for:

- `[WWW]` Production
- `[SUP]` Support
- `[GIT]` Source / CI metadata
- `[LOG]` Observability
- `[ID ]` Identity / RBAC
- `[CI ]` Deployment
- `[DB ]` Synthetic customer data
- `[KEY]` Canary vault
- `[OUT]` Proof collector

No single starting agent has enough capability to control production. The attack only becomes possible when evidence crosses team boundaries and reaches an agent that possesses the required execution capability.

## Security Evidence

### Live swarm command center

The live view shows real agent identities, role lanes, event-backed routes, breach progression, target state, capability composition, deception activity, and the source-backed incident tape.

![FLASH0VER live command center](docs/screenshots/command-center-compromised.png)

### After Action Report

The completed run is reconstructed deterministically from persisted telemetry. The executive summary provides a short explanation first; deeper tabs expose the evidence behind every claim.

![FLASH0VER after action summary](docs/screenshots/after-action-summary.png)

### Agent and team contributions

Each real agent is reconstructed from runtime events: role, parent, tools, messages, services touched, artifacts discovered, policy events, containment state, and contribution to the incident.

![FLASH0VER agent and team report](docs/screenshots/after-action-agents.png)

### Communications

Agent-to-agent communication is summarized from real `AGENT_MESSAGE` events, including team routes, high-value handoffs, provenance transfer, and distinct agent routes.

![FLASH0VER communications report](docs/screenshots/after-action-communications.png)

### Why it happened

FLASH0VER reconstructs the cross-team capability composition that produced the outcome. The explanation is deterministic and source-backed rather than a freeform model narrative.

![FLASH0VER why it happened report](docs/screenshots/why-it-happened.png)

### Key moments

The report surfaces decisive events—artifact discovery, handoffs, emergent capability formation, policy decisions, target-state changes, and canary results—with links back to persisted telemetry.

![FLASH0VER key moments](docs/screenshots/key-moments.png)

### Swarm communication summary

A compact route summary shows how information moved from specialized workers to team leads, command, and operations.

![FLASH0VER swarm communication summary](docs/screenshots/swarm-communication-summary.png)

## OFF, MONITOR, and ENFORCE

| Mode | Behavior |
| --- | --- |
| `OFF` | Observe the swarm without composition blocking. A successful run can change ACME production and deliver the current canary to the collector. |
| `MONITOR` | Evaluate the same deterministic rules and emit warnings while allowing the sensitive action to continue. |
| `ENFORCE` | Deny dangerous composed capability at the sensitive boundary while allowing unrelated agent activity to continue. |

The collector and ACME's independent target state—not dashboard animations—determine whether compromise actually occurred.

## Deception Grid

ACME contains multiple harmless tripwires designed to make attack progression observable without granting real privilege:

- honey documents
- worthless credential-shaped tokens
- synthetic privileged identities
- canary files
- decoy customer records
- the final rotating protected canary

Tripwire events drive deterministic threat level, breach progression, and blast-radius calculations. Touching a decoy never by itself marks the target compromised.

## After Action Report

The report is designed to answer two different questions:

**In 10 seconds:** What happened, why, and did FLASH0VER stop it?

**Under investigation:** Which agents contributed, who talked to whom, what evidence moved, which policy fired, what Sentinel proposed, what happened to ACME, and what the raw events prove?

Report views include:

- Executive Summary
- Timeline / raw incident tape
- Agent and team summaries
- Communications and key handoffs
- Evidence / provenance / policy
- Sentinel containment
- Target before / after
- Recent persisted runs

All report facts are derived from stored runtime events and sensitive values are sanitized before display.

## Wasmer Isolation

Agent-controlled computation is executed through Wasmer rather than the host shell.

The verification suite checks that:

- permitted sandbox computation succeeds
- host environment variables are absent unless explicitly granted
- host filesystem paths are not exposed by default
- unauthorized capabilities fail closed
- sandbox execution is bounded by hard timeout
- every command receives an isolated execution context

Wasmer secures the **individual execution boundary**; FLASH0VER secures the **capability that emerges across agents**.

## Tenki Cloud

Tenki hosts the disposable ACME target for live cloud runs.

The Tenki lifecycle verifies:

```text
authenticate
    ↓
create disposable sandbox
    ↓
provision ACME
    ↓
health + reset + stale-canary checks
    ↓
model-driven OFF / ENFORCE execution
    ↓
explicit destroy
    ↓
orphan count = 0
```

`TARGET_RUNTIME=local` remains the default fallback. Explicit Tenki selection fails closed instead of silently substituting localhost.

See [docs/TENKI.md](docs/TENKI.md) for setup and lifecycle details.

## OpenAI Daybreak Security Review

FLASH0VER received an authorized defensive review using **OpenAI Daybreak Blue**. The review focused on control-plane safety, Wasmer boundaries, agent tool authorization, lifecycle races, credential redaction, Tenki cleanup, policy enforcement, telemetry integrity, and fail-open behavior.

Validated findings were used to harden the verified project build. The resulting security pass found no committed credentials and the reporting layer additionally sanitizes credential-shaped strings, query grants, canaries, and sensitive runtime values.

**Daybreak Red was not used in the verified build.** Red is a future path for deeper authorized adversarial testing if the appropriate access and scope are available. The public project does not claim Red-derived findings or validation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 7, Node.js 24.10+ |
| Dashboard | Next.js 16, React 19 |
| Model runtime | OpenAI-compatible Chat Completions; verified runs used GPT-5.6 Sol |
| Agent isolation | `@wasmer/sdk` |
| Disposable cloud range | `@tenkicloud/sandbox` |
| Validation | Zod |
| Persistence | SQLite runtime/event store |
| Testing | Vitest + TypeScript + production build + live harnesses |
| Security review | OpenAI Daybreak Blue |

## Repository Structure

```text
app/                    Next.js dashboard styles and page shell
components/             Command center, swarm graph, and After Action UI
lib/
├── agents/             Provider, roles, capabilities, and tools
├── containment/        Sentinel proposal and containment logic
├── deception/          Synthetic deception-grid state and severity
├── events/             Typed event bus, persistence, and narration
├── incidents/          Deterministic incident reconstruction
├── orchestration/      Coordinator, worker runtime, preflight, lifecycle
├── policy/             OFF / MONITOR / ENFORCE policy engine
├── target/             Local and Tenki target runtimes
└── wasmer/             Isolated execution wrapper

range/
├── services/           Local synthetic ACME services
└── tenki/              Remote disposable range implementations

scripts/                Preflight, rehearsal, reliability, Tenki, and Wasmer verification
tests/                  Unit, integration, range, policy, report, and lifecycle tests
docs/                   Architecture, demo runbook, Tenki notes, build evidence, screenshots
worker/                 Local control plane
```

## Quick Start

Requirements: Node.js **24.10+** and npm.

```bash
git clone https://github.com/Muzzy5150/Flash0ver.git
cd Flash0ver
npm install
cp .env.example .env
```

Set an OpenAI-compatible model credential in `.env`:

```bash
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-5.6-sol
```

Then:

```bash
npm run preflight
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

The control plane binds to `127.0.0.1:4310`.

### Tenki Cloud

Tenki is opt-in:

```bash
TARGET_RUNTIME=tenki
TENKI_API_KEY=
FLASHOVER_RANGE=v2
```

Keep `TARGET_RUNTIME=local` for the guaranteed local fallback.

## Commands

```bash
# Full static/regression verification
npm run verify

# Preflight the local demo
npm run preflight

# Start control plane + dashboard
npm run dev

# One real model-driven verification run
npm run demo:verify

# Rehearsal readiness
npm run demo:rehearse

# Reliability harness
npm run demo:reliability

# Timing analysis
npm run demo:latency

# Concrete Wasmer isolation checks
npm run test:wasmer

# Live Tenki create/use/destroy verification
npm run test:tenki-live
```

## Verified Build

The verified build was validated with:

- **65/65 automated tests passing**
- TypeScript check passing
- Next.js production build passing
- Wasmer isolation checks passing
- real model-driven OFF compromise
- real model-driven ENFORCE containment
- live Tenki create/use/destroy lifecycle
- final Tenki orphan count of zero
- telemetry-backed After Action Reports
- zero exposed credentials, canary values, or grants in the final raw-timeline audit

See [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) for the evidence record and [docs/DEMO.md](docs/DEMO.md) for the presentation runbook.

## Safety Boundaries

- No arbitrary external targets.
- No real credentials, customer data, or production accounts.
- All adversarial behavior is confined to FLASH0VER-owned ranges.
- Synthetic credentials and canaries have no value outside the range.
- Agent tools accept only explicitly configured target services and relative paths.
- Model-directed code does not receive direct host shell access.
- Wasmer sandboxes do not inherit host secrets by default.
- Tenki environments are disposable and explicitly destroyed.
- Unknown or unauthorized capabilities fail closed.
- Collector and target state—not UI animation—determine compromise.
- Reports sanitize credentials, query grants, canaries, and sensitive runtime values.

## Development Disclosure

OpenAI Codex was used extensively as a coding assistant during development. GPT-6 Astra was used for architecture and implementation work, while GPT-5.6 Sol + **Daybreak Blue** was used for authorized defensive security review and security-heavy implementation/testing. Project architecture, scope, target boundaries, verification strategy, presentation design, and final engineering decisions were directed and reviewed by the participant.

**Daybreak Red was not used in the verified build.** It is mentioned only as a potential future authorized red-team validation path.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Build and verification evidence](docs/BUILD_STATUS.md)
- [Demo runbook](docs/DEMO.md)
- [Tenki integration](docs/TENKI.md)
- [Swarm expansion map](docs/SWARM_EXPANSION_MAP.md)
