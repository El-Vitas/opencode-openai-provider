# PydanticAI Example Package

This directory is a standalone example package for PydanticAI compatibility testing.
It is intentionally separate from the provider runtime code and should be run independently.

## Requirements

- Python 3.11+
- `pydantic-ai` installed in your Python environment

```bash
pip install pydantic-ai
```

## Environment Variables

Set these in `.env` (already prepared in project root) or export them manually:

```bash
export OPENAI_BASE_URL="http://127.0.0.1:3000/v1"
export OPENAI_API_KEY="your-provider-api-key"
export OPENAI_MODEL="gpt-4o"
```

The scripts auto-load the repository `.env`, so running from `examples/pydantic-ai` works without manual export when `.env` exists.

There is no default OpenAI model or provider in these examples. You must set `OPENAI_BASE_URL` and `OPENAI_MODEL` before running the scripts.

If requests hang, set `PROMPT_TIMEOUT_MS` in `.env` (example: `30000`) so the provider fails fast with a clear timeout error.

## Run

From this package directory:

```bash
cd examples/pydantic-ai
python basic_text_chat.py
```

```bash
cd examples/pydantic-ai
python structured_output.py
```

```bash
cd examples/pydantic-ai
python image_structured_output.py
```

The image fixture used by the last script is `../shared/test-image.jpg`.
