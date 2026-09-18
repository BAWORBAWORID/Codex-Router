<div align="center">

# CodexAI Gateway

**Local-first AI gateway with DeepSeek scraping support and multi-provider routing.**

Keep a single stable endpoint while CodexAI routes requests, scrapes web APIs, refreshes OAuth tokens, enforces quotas, and monitors live telemetry.

<p>
  <a href="https://github.com/BAWORBAWORID/Codex-Router/releases"><img src="https://img.shields.io/badge/version-v0.1.3-6366f1?style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" alt="MIT License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-v4-e36002?style=flat-square" alt="Hono"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-v19-61dafb?style=flat-square&logo=react&logoColor=black" alt="React"></a>
  <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/SQLite-WAL-003b57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"></a>
</p>

[Quick Start](#quick-start) | [DeepSeek Gateway](#deepseek-gateway) | [Features](#features) | [Providers](#supported-providers) | [API Reference](#api-endpoints) | [Docker](#docker) | [Development](#development)

</div>

---

## Quick Start

```bash
git clone https://github.com/BAWORBAWORID/Codex-Router.git
cd Codex-Router-
pnpm install
pnpm build
pnpm start
```

Open **`http://localhost:4000`** — create admin password, configure providers, generate API key.

### Docker

```bash
docker run -d --name codex-router --restart unless-stopped \
  -p 4000:4000 -p 1455:1455 \
  -v codex_data:/root/.srouter \
  ghcr.io/BAWORBAWORID/codex-router:latest
```

---

## DeepSeek Gateway

CodexAI includes a **DeepSeek scraper gateway** that accesses `chat.deepseek.com` directly — no official API key required. Just provide a bearer token from your browser session.

### How It Works

1. **Get a token** from `chat.deepseek.com` browser session (base64 bearer token)
2. **Add the provider** in CodexAI dashboard with your token
3. **Use the models** — CodexAI handles session creation, PoW solving, and SSE streaming

### Available Models

| Model | ID | Description |
| :--- | :--- | :--- |
| DeepSeek Chat | `ds/deepseek-chat` | General-purpose chat |
| DeepSeek Reasoner | `ds/deepseek-reasoner` | Reasoning model |
| DeepSeek V3 | `ds/deepseek-v3` | Latest V3 |
| DeepSeek V4 Flash | `ds/deepseek-v4-flash` | Fast inference |
| DeepSeek V4 Pro | `ds/deepseek-v4-pro` | Advanced capabilities |

### Setup

1. Open CodexAI dashboard at `http://localhost:4000`
2. Go to **Providers** → **DeepSeek**
3. Paste your bearer token in the API Key field
4. Click **Verify Connection**
5. Models are auto-discovered and available via `/v1/models`

### Usage

```bash
curl -N http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sr-live-your_key" \
  -d '{
    "model": "ds/deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Technical Details

- **PoW Solving**: SHA-3 WASM binary handles DeepSeek's Proof-of-Work challenges automatically
- **Session Management**: Creates and reuses chat sessions for context continuity
- **SSE Parsing**: Custom Node.js stream parser for DeepSeek's non-standard SSE format
- **Token Estimation**: Estimates token usage since DeepSeek web API doesn't return usage data

---

## Features

| Feature | Description |
|---------|-------------|
| **DeepSeek Scraping** | Access chat.deepseek.com with bearer token, no API key needed |
| **Unified Protocol** | Translate between OpenAI and Anthropic formats dynamically |
| **57+ Providers** | Route to OpenAI, Anthropic, Google, Groq, Mistral, and more |
| **Failover Routing** | Automatic cascade when providers return 429 or are down |
| **Virtual API Keys** | Scoped keys with rate limits, quotas, and model allowlists |
| **OAuth Refresh** | Background sweeper keeps tokens refreshed |
| **Token Saver** | Prompt compression to cut inference cost |
| **Cloudflare Tunnel** | Secure remote access with zero open ports |
| **Observability** | Token usage, costs, latency, and fallback tracking in SQLite |
| **Admin Dashboard** | Full React UI for management |

---

## Supported Providers

### OAuth

| Provider | Prefix | Streaming |
| :--- | :--- | :---: |
| Google Antigravity | `antigravity/*` | Yes |
| OpenAI Codex | `openai_codex/*` | Yes |
| Anthropic Claude | `anthropic/*` | Yes |
| CodeBuddy | `codebuddy/*` | Yes |
| Qoder | `qoder/*` | Yes |

### API Key

| Provider | Prefix | Base URL |
| :--- | :--- | :--- |
| **DeepSeek** | `ds/*` | chat.deepseek.com (scraper) |
| Groq | `groq/*` | api.groq.com/openai/v1 |
| Mistral | `mistral/*` | api.mistral.ai/v1 |
| Gemini | `gemini/*` | generativelanguage.googleapis.com |
| Together | `together/*` | api.together.xyz/v1 |
| OpenRouter | `openrouter/*` | openrouter.ai/api/v1 |
| Cerebras | `cerebras/*` | api.cerebras.ai/v1 |
| Fireworks | `fireworks/*` | api.fireworks.ai/inference/v1 |
| xAI | `xai/*` | api.x.ai/v1 |
| + 40 more | | |

### Free Tier

| Provider | Prefix |
| :--- | :--- |
| GoRouter | `gorouter/*` |
| BluesMinds | `bluesminds/*` |
| SeekAI | `seekai/*` |
| OpenCode Zen | `opencode_zen/*` |

### Self-Hosted

| Provider | Prefix | Default URL |
| :--- | :--- | :--- |
| Ollama | `ollama/*` | http://localhost:11434/v1 |
| vLLM | `vllm/*` | http://127.0.0.1:8000/v1 |
| LM Studio | `lmstudio/*` | http://localhost:1234/v1 |

---

## Connect Coding Tools

```bash
# CLI setup
npx @codex/cli setup
npx @codex/cli link claude --model ds/deepseek-chat
npx @codex/cli link opencode --model ds/deepseek-v4-flash
```

### Manual Config

| Tool | Setting | Value |
|------|---------|-------|
| Any IDE | Base URL | `http://localhost:4000/v1` |
| Any IDE | API Key | `sr-live-your_key` |
| Any IDE | Model | `ds/deepseek-chat` |

---

## Integrate

### Python

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:4000/v1", api_key="sr-live-your_key")

stream = client.chat.completions.create(
    model="ds/deepseek-chat",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ baseURL: "http://localhost:4000/v1", apiKey: "sr-live-your_key" });

const message = await client.messages.create({
    model: "anthropic/claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello!" }]
});

console.log(message.content[0].text);
```

### cURL

```bash
curl -N http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sr-live-your_key" \
  -d '{"model":"ds/deepseek-chat","messages":[{"role":"user","content":"Hi"}],"stream":true}'
```

---

## API Endpoints

### Inference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/chat/completions` | OpenAI chat completion (streaming) |
| `POST` | `/v1/messages` | Anthropic messages |
| `GET` | `/v1/models` | List all models |
| `GET` | `/v1/models/:model` | Get model details |

### Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check |
| `GET` | `/v1/quota` | Provider balances |
| `GET/POST` | `/v1/providers` | Manage providers |
| `GET/POST` | `/v1/keys` | Manage API keys |
| `GET` | `/v1/logs` | Request logs |
| `GET/POST` | `/v1/settings` | System settings |
| `GET/POST` | `/v1/tunnel/*` | Cloudflare tunnel |

---

## Docker

```yaml
services:
  codex-router:
    image: ghcr.io/BAWORBAWORID/codex-router:latest
    container_name: codex-router
    restart: unless-stopped
    ports:
      - "4000:4000"
      - "1455:1455"
    volumes:
      - codex_data:/root/.srouter

volumes:
  codex_data:
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Gateway port |
| `DATABASE_PATH` | `~/.srouter/srouter.db` | Database location |
| `NODE_ENV` | `development` | Environment |

---

## Development

```bash
pnpm install
pnpm dev          # API + Dashboard with HMR
pnpm build        # Full build
pnpm test         # Run tests
```

### Project Structure

```
Codex-Router/
├── apps/
│   ├── api/          Hono 4 REST API
│   └── web/          React 19 dashboard
├── packages/
│   ├── types/        Zod schemas
│   ├── constants/    Version + provider catalog
│   ├── db/           SQLite (WAL mode)
│   ├── executors/    Provider drivers (incl. DeepSeek scraper)
│   ├── pricing/      Token pricing
│   ├── providers/    OAuth + circuit breaker
│   └── translator/   Protocol translation
```

---

## License

[MIT License](LICENSE)