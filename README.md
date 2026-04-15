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

## Why this exists

- Reuse existing OpenAI client ecosystems without rewriting your app protocol.
- Keep provider integration local, inspectable, and testable.
- Support both standard chat and structured-output workflows.
- Preserve OpenAI-like error surfaces for easier client interoperability.

## Feature set

- OpenAI-compatible route: `POST /v1/chat/completions`
- Request mapping from OpenAI payloads to OpenCode prompt input
- Model aliasing via `OPENAI_MODEL_MAPPING`
- Optional API key enforcement (`OPENAI_API_KEY` / `PROVIDER_API_KEY`)
- Non-stream and stream response modes
- Structured outputs via `response_format` (`json_object`, `json_schema`)
- Per-request session lifecycle: create -> prompt -> delete
- Log sanitization for sensitive headers and large payloads

## Free OpenCode models

You can use this provider with free OpenCode models.

- Map your client model name to the OpenCode model you want in `OPENAI_MODEL_MAPPING`.
- Keep your OpenAI-compatible clients unchanged while routing traffic to OpenCode free-tier model targets.

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

3. Edit `.env` with your runtime values.

4. Run the provider:

```bash
npm run serve
```

By default it listens on `http://localhost:3000` and exposes `http://localhost:3000/v1/chat/completions`.

## Docker (simple setup)

This repository includes a multi-stage `Dockerfile` optimized for runtime size.

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

For this simple setup, you do not need to install OpenCode as a separate container.

If your `.env` has `HOST=localhost`, override it with `-e HOST=0.0.0.0` for Docker so the container is reachable from published ports.

## Configuration

### Required

- `OPENAI_MODEL_MAPPING` - JSON object mapping client model names to OpenCode models
- One of:
  - `OPENAI_API_KEY`
  - `PROVIDER_API_KEY`

### Optional

- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `3000`)
- `PROMPT_TIMEOUT_MS` (default: `30000`)
- `OPENCODE_DEFAULT_AGENT` (example: `build`)

### Minimal `.env` example

```env
HOST=localhost
PORT=3000
OPENAI_API_KEY=dev-key
OPENCODE_DEFAULT_AGENT=build
PROMPT_TIMEOUT_MS=30000
OPENAI_MODEL_MAPPING={"gpt-4o":{"providerID":"openai","modelID":"gpt-4o"}}
```

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

## Notes

- This is an OpenAI-compatible facade, not a full OpenAI implementation.
- Explicit model mapping is required by design.
- Example packages are intentionally isolated from core runtime code.
