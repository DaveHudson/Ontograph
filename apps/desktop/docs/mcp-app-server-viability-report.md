# MCP App/Server Viability Report (ONT-139)

Date: 2026-04-02
Owner: CTO
Related: ONT-140 (CLI)

## Executive Summary

Supporting Ontograph tools via a standalone MCP server is viable and strategically useful.

- Viable now: the desktop app already defines a coherent ontology tool surface using `createSdkMcpServer`.
- Main gap: those tools are currently embedded inside Electron runtime and are not exposed as an external MCP endpoint for third-party hosts.
- Recommendation: implement a shared core tool module and ship a standalone MCP transport (stdio first), with optional remote transport in phase 2.

## Current State (Code Audit)

The product already has a functioning MCP tool model:

- `apps/desktop/src/main/ipc/claude.ts`
  - Defines ontology tools (`get_current_ontology`, `generate_ontology`, `add_class`, etc.).
  - Registers an MCP server via `createSdkMcpServer({ name: 'ontograph', ... })`.
  - Uses `query({ options: { mcpServers: { ontograph: ontographServer } } })`.
- `apps/desktop/src/preload/index.ts`
  - Exposes renderer/main bridge channels used by these tools.
- `apps/desktop/src/renderer/src/components/chat/useClaude.ts`
  - Handles tool execution effects and syncs to ontology store.

This means Ontograph already has:

- Stable tool names and intent model.
- Existing schema validation for inputs (`zod`).
- Working read/write integration against ontology state.

## Viability Assessment

### Product Viability: High

Benefits:

- Opens Ontograph capabilities to external agent hosts (not just in-app Claude session).
- Enables automated workflows (batch ontology edits, validation runs, pipeline use).
- Increases platform surface for integrations while keeping ontology logic canonical.

### Technical Viability: High (with refactor)

What is easy:

- Reusing current tool contracts and naming.
- Reusing ontology parse/serialize/validation modules.

What requires work:

- Decoupling tool implementations from Electron IPC events.
- Defining a runtime-agnostic ontology session/state adapter.
- Authn/authz model for remote or shared execution.

### Operational Viability: Medium-High

Primary constraints:

- Security boundary for ontology file access and mutation.
- Multi-session isolation and state persistence model.
- Transport choice per host requirements (stdio first keeps scope low).

## Recommended Architecture

## 1) Shared Core Tool Package

Create a package (example: `packages/ontograph-mcp-core`) that exports:

- Tool specs + handlers (runtime-agnostic).
- Ontology session interface (`readOntology`, `writeOntology`, `validateOntology`).
- Shared schema/types for all tool inputs/outputs.

Electron and standalone MCP server both consume this package.

## 2) Standalone MCP Server (Phase 1)

Implement stdio transport first for quickest host compatibility.

- New entrypoint under `apps/desktop` or `packages` (recommend package).
- Bind core tool handlers to local file-backed ontology sessions.
- Restrict file IO to allowlisted paths or explicit open/save flow.

## 3) Optional Remote Transport (Phase 2)

If needed for hosted usage:

- Add authenticated HTTP/SSE transport.
- Add tenancy/session isolation + encrypted persistence.
- Add usage limits and audit logging.

## Proposed Plan

### Phase 0: Discovery + Contracts (1-2 days)

- Freeze and document tool API contract.
- Decide session model (single file, workspace, multi-file).
- Define security envelope and allowed operations.

### Phase 1: Refactor + Local MCP (3-5 days)

- Extract tool logic from `ipc/claude.ts` to shared package.
- Replace Electron-only coupling with adapter interfaces.
- Add standalone stdio MCP server executable.
- Add unit tests for tool handlers.

### Phase 2: Integration + UX (2-3 days)

- Add CLI bootstrap command to launch MCP server.
- Add docs for Claude/Cowork/agent runtime setup.
- Add telemetry hooks (tool usage, latency, errors).

### Phase 3: Hardening (2-4 days)

- Permission checks, path constraints, safe defaults.
- Concurrency guards for write operations.
- End-to-end tests across common host flows.

Total initial path (Phase 0-2): ~1.5 to 2 weeks.

## Risks and Mitigations

- Tight coupling to renderer state
  - Mitigation: introduce session adapter and pure functions in core package.
- Unsafe file mutations from external hosts
  - Mitigation: explicit allowlist + dry-run mode + backup snapshots.
- Contract drift between in-app tools and external MCP
  - Mitigation: one shared contract package consumed by both.

## Relationship to ONT-140 (CLI)

ONT-140 is complementary, not conflicting.

- ONT-140 CLI can be the operational interface for local automation.
- MCP server can internally reuse CLI or shared core package.
- Recommended order: shared core -> CLI wrappers -> MCP transports.

## Final Recommendation

Proceed with implementation. This initiative is viable and aligned with product direction.

- Start with a local stdio MCP server backed by shared tool contracts.
- Keep remote MCP as a second-stage extension after security and session boundaries are proven.
