# OpenCode OpenAI Provider

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Status](https://img.shields.io/badge/Status-OpenAI%20Compat-success)](#api-compatibility)
[![OpenCode Models](https://img.shields.io/badge/OpenCode%20Models-Free%20Tier%20Ready-2EA043)](#free-opencode-models)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-Compatible-000000?logo=vercel&logoColor=white)](#compatibility-ecosystem)
[![PydanticAI](https://img.shields.io/badge/PydanticAI-Compatible-0A66C2)](#compatibility-ecosystem)
[![LangChain](https://img.shields.io/badge/LangChain-OpenAI%20Client%20Compatible-1C3C3C)](#compatibility-ecosystem)
[![LangGraph](https://img.shields.io/badge/LangGraph-OpenAI%20Client%20Compatible-1F6FEB)](#compatibility-ecosystem)

OpenCode OpenAI Provider is a focused compatibility layer that exposes `POST /v1/chat/completions` with an OpenAI-style contract and executes requests through OpenCode sessions.

If your client already speaks OpenAI, you can point it to this server and keep your integration flow intact.

## Use your subs

Use your existing AI sub-systems and tooling without rewriting your app stack:

- Build with PydanticAI, Vercel AI SDK, LangChain, LangGraph, or any OpenAI-compatible client.
- Route requests to OpenCode model targets from your existing subs stack.
- Keep your current OpenAI client contract while changing runtime provider strategy.

## Quick Start (Docker Hub)

```bash
# Pull and run (replace values with yours)
docker run --rm -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e API_KEY=your-api-key \
  -e DEFAULT_MODEL=deepseek/deepseek-chat \
  -e OPENCODE_BASE_URL=http://localhost:4096 \
  -e OPENCODE_SERVER_PASSWORD=dev-key \
  -e DEEPSEEK_API_KEY=sk-... \
  elvitas/opencode-openai-provider:latest

# Test it
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek/deepseek-chat", "messages": [{"role": "user", "content": "Hi"}]}'
```

## Why this exists

- Reuse existing OpenAI client ecosystems without rewriting your app protocol.
- Keep provider integration local, inspectable, and testable.
- Support both standard chat and structured-output workflows.
- Preserve OpenAI-like error surfaces for easier client interoperability.

## Feature set

- OpenAI-compatible route: `POST /v1/chat/completions`
- Request mapping from OpenAI payloads to OpenCode prompt input
- Model selection via `DEFAULT_MODEL` (`provider/model` format)
- Optional inbound API key enforcement (`API_KEY`)
- Dynamic upstream provider keys via `*_API_KEY` environment variables
- Optional provider discovery endpoint: `GET /providers`
- Non-stream and stream response modes
- Structured outputs via `response_format` (`json_object`, `json_schema`)
- Per-request session lifecycle: create -> prompt -> delete
- Log sanitization for sensitive headers and large payloads

## Free OpenCode models

You can use this provider with free OpenCode models.

- Keep your OpenAI-compatible clients unchanged while routing traffic to OpenCode free-tier model targets.
- Select your default target model through `DEFAULT_MODEL=provider/model`.

If you run with the current default flow (`DEFAULT_MODEL=provider/model`), you can point directly to provider/model targets and use provider credentials discovered from `*_API_KEY` variables.

## Compatibility ecosystem

This provider is built for OpenAI-compatible client stacks, including:

- Vercel AI SDK
- PydanticAI
- LangChain
- LangGraph
- and other SDKs that target OpenAI Chat Completions

Official terminology used by each ecosystem:

- Vercel AI SDK: OpenAI Compatible Providers (`@ai-sdk/openai-compatible`, `createOpenAICompatible`)
- PydanticAI: OpenAI-compatible APIs / OpenAI-compatible Models (`OpenAIProvider(base_url=...)`)
- LangChain: OpenAI-compatible APIs / OpenAI-compatible endpoints (`ChatOpenAI(..., base_url=...)`)
- LangGraph: typically consumes the same OpenAI-compatible endpoint pattern through LangChain/OpenAI clients

Current validation level in this repository:

- Vercel AI SDK: dedicated runnable example in `examples/vercel-ai-sdk/`
- PydanticAI: dedicated runnable examples in `examples/pydantic-ai/`
- LangChain / LangGraph: compatibility is based on the OpenAI Chat Completions API contract (`/v1/chat/completions`)

## API compatibility

The provider is intentionally narrow: it targets chat completions compatibility, not full OpenAI surface parity.

- Supported endpoint: `POST /v1/chat/completions`
- Supported stream format: Server-Sent Events with `[DONE]` terminator
- Supported content inputs:
  - text messages
  - image messages using `data:` URLs
- Supported structured output inputs:
  - `response_format: { "type": "json_object" }`
  - `response_format: { "type": "json_schema", "json_schema": { "schema": ... } }`

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Edit `.env` with your runtime values (`API_KEY`, `DEFAULT_MODEL`, optional provider keys).

4. Run the provider:

```bash
npm run serve
```

By default it listens on `http://localhost:3000` and exposes `http://localhost:3000/v1/chat/completions`.

## Authentication layers

This project can use up to three independent credentials:

- `API_KEY`: protects this provider endpoint (`client -> provider`).
- `OPENCODE_SERVER_PASSWORD`: protects OpenCode server access (`provider -> OpenCode`) when `OPENCODE_BASE_URL` is configured.
- `*_API_KEY` (example: `DEEPSEEK_API_KEY`): provider-specific upstream credentials sent through OpenCode `auth.set(...)` before session creation.

These keys have different scopes and are not interchangeable.

## Docker

This repository includes a multi-stage `Dockerfile` optimized for runtime size.

Published image (Docker Hub):

- `docker.io/elvitas/opencode-openai-provider:latest`
- `docker.io/elvitas/opencode-openai-provider:0.1.1`

Pull image:

```bash
docker pull docker.io/elvitas/opencode-openai-provider:latest
```

Build image:

```bash
docker build -t opencode-openai-provider:latest .
```

Run container:

```bash
docker run --rm -p 3000:3000 --env-file .env -e HOST=0.0.0.0 opencode-openai-provider:latest
```

Endpoint URL after publishing port `3000`:

- From your host machine: `http://localhost:3000/v1/chat/completions`
- From another container in the same Docker network: `http://<service-name>:3000/v1/chat/completions`

### External OpenCode server (host networking)

If you run OpenCode externally and your provider container must connect through host networking, keep the same host-network style:

```bash
docker run --rm \
  --network host \
  --env-file .env \
  -e OPENCODE_BASE_URL=http://localhost:4096 \
  -e OPENCODE_SERVER_PASSWORD=dev-key \
  opencode-openai-provider:latest
```

When OpenCode auth is enabled, `OPENCODE_SERVER_PASSWORD` must match the password used to start OpenCode.

### Validated flow (DeepSeek + external OpenCode)

Start OpenCode on host:

```bash
OPENCODE_SERVER_PASSWORD=dev-key opencode serve --port 4095
```

Run provider container:

```bash
docker run --rm --network host \
  --env-file .env \
  -e DEFAULT_MODEL=deepseek/deepseek-chat \
  -e OPENCODE_BASE_URL=http://localhost:4095 \
  -e OPENCODE_SERVER_PASSWORD=dev-key \
  -e DEEPSEEK_API_KEY=sk-... \
  opencode-openai-provider:latest
```

Send test request:

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer dev-key" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek/deepseek-chat", "messages": [{"role": "user", "content": "Hola"}]}'
```

If your `.env` has `HOST=localhost`, override it with `-e HOST=0.0.0.0` for Docker so the container is reachable from published ports.

## Configuration

### Required

- `DEFAULT_MODEL` - target model in `provider/model` format

### Strongly recommended

- `API_KEY` - bearer token required for incoming requests

### Optional

- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `3000`)
- `PROMPT_TIMEOUT_MS` (default: `30000`)
- `OPENCODE_DEFAULT_AGENT` (example: `build`)
- `OPENCODE_BASE_URL` (connect to external OpenCode server)
- `OPENCODE_SERVER_PASSWORD` (for protected OpenCode server)
- `OPENCODE_SERVER_USERNAME` (default: `opencode`)
- `*_API_KEY` (dynamic provider keys, for example `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

### Minimal `.env` example

```env
HOST=localhost
PORT=3000
API_KEY=dev-key
OPENCODE_DEFAULT_AGENT=build
PROMPT_TIMEOUT_MS=30000
DEFAULT_MODEL=github-copilot/gpt-4o
```

### External OpenCode `.env` example

```env
HOST=0.0.0.0
PORT=3000
API_KEY=dev-key
DEFAULT_MODEL=deepseek/deepseek-chat
OPENCODE_BASE_URL=http://localhost:4096
OPENCODE_SERVER_PASSWORD=dev-key
DEEPSEEK_API_KEY=sk-...
```

## Provider discovery endpoint

Use this to verify which provider keys were detected from the environment:

```bash
curl http://localhost:3000/providers
```

Example response:

```json
{"providers":["openai","github_copilot","anthropic"]}
```

## Troubleshooting

- `401 invalid_api_key`:
  - Cause: `Authorization: Bearer ...` does not match container `API_KEY`.
  - Common mistake: passing `-e API_KEY=tu-api-key` while sending `Bearer dev-key`.
  - Fix: align both values, or remove explicit `-e API_KEY=...` to use `.env` value.
- `session_create_failed`:
  - Cause: provider cannot create OpenCode session.
  - Check `OPENCODE_BASE_URL` points to running OpenCode.
  - If OpenCode is password-protected, set `OPENCODE_SERVER_PASSWORD` in provider container.
  - Ensure model/provider credentials exist (`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, etc.).
- `Failed to start server on port 4096` in OpenCode:
  - Cause: port is already in use.
  - Fix: run OpenCode on another port and update `OPENCODE_BASE_URL`.

## Development scripts

```bash
npm run build
npm run typecheck
npm run typecheck:test
npm test
npm run start
npm run serve
```

## Testing status

Core checks used in this repository:

- Type check: `npm run typecheck`
- Test type check: `npm run typecheck:test`
- Test suite: `npm test`

## Examples

Standalone examples live under `examples/`.

- `examples/pydantic-ai/`
  - `basic_text_chat.py`
  - `structured_output.py`
  - `image_structured_output.py`
- `examples/vercel-ai-sdk/`
  - `image-structured-output.mjs`

Each example directory includes its own usage notes and setup details.

## Request lifecycle

For each incoming chat completion request:

1. Validate auth and request shape.
2. Map OpenAI input into OpenCode prompt payload.
3. Create session.
4. Execute prompt (streaming or non-streaming).
5. Transform output into OpenAI response format.
6. Delete session in a guaranteed cleanup path.

## Context and notes

- This is an OpenAI-compatible facade, not a full OpenAI implementation.
- Auth context is layered: inbound provider auth, OpenCode server auth, and upstream provider auth.
- `*_API_KEY` provider discovery is environment-driven and exposed via `/providers`.
- Example packages are intentionally isolated from core runtime code.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
