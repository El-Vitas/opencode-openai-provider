# Vercel AI SDK Compatibility Scripts

This directory is a standalone package for Vercel AI SDK sample scripts.
It is intentionally separate from the provider runtime code and should be installed and run independently.

## Requirements

- Provider server running (`npm run serve` from the root repository)
- Environment variables in `.env`:
  - `OPENAI_BASE_URL`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`

There is no default OpenAI model or provider in this example. You must set both `OPENAI_BASE_URL` and `OPENAI_MODEL`.

## Setup

Install package dependencies inside this package:

```bash
cd examples/vercel-ai-sdk
npm install
```

## Run

Run the structured image output example:

```bash
cd examples/vercel-ai-sdk
npm run example:image-structured
```

The script uses `../shared/test-image.jpg` as the input fixture and prints the resulting JSON output.
