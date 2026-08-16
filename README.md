# River Tide

**Voice dictation for clearer thinking.** Built for anyone whose words don't come as easily as they used to — especially those navigating chemotherapy-induced cognitive impairment ("chemo brain").

River Tide captures your voice, converts it to text, and polishes it — removing filler words, fixing repetitions, catching self-corrections, and adding proper punctuation. You speak naturally; it writes clearly.

## Why River Tide

Cognitive impairment — whether from chemotherapy, brain fog, long COVID, concussion, or other causes — can make communication exhausting. The words are there, but the path from thought to speech has extra hurdles.

River Tide is designed to lower that hurdle. It's not about speed or productivity. It's about preserving your voice when your brain needs a hand. You speak as you are, stumbles and all, and the app turns it into clear, written text.

**You speak naturally. River Tide writes clearly.**

### Who it's for

- **Cancer survivors** managing chemotherapy-induced cognitive impairment ("chemo brain")
- **Anyone experiencing brain fog** from long COVID, medication, or chronic conditions
- **People with aphasia or speech difficulties** who want a reliable bridge from thought to text
- **Anyone who finds typing or composing difficult** and wants to speak instead
- **Professionals who prefer speaking over typing** to capture ideas faster

## How It Works

```
[Microphone] → [STT/ASR] → [Raw Text] → [LLM Post-Processing] → [Polished Text] → [Cursor]
```

River Tide uses a two-stage AI pipeline:

1. **Speech-to-Text** — Your voice is transcribed by a high-accuracy STT model (SenseVoice, Whisper, or your choice)
2. **LLM Post-Processing** — The raw transcript is polished: filler words removed, self-corrections resolved, repetition fixed, punctuation added

The result is clean, readable text — pasted directly at your cursor.

**Example:**
- You say: *"I need to call — no wait, I need to email — um, the doctor about um, the appointment on um, Thursday — actually Friday"*
- You get: *"I need to email the doctor about the appointment on Friday."*

## Features

| Feature | What it does |
|---------|-------------|
| **Self-correction detection** | "Monday—no, Tuesday" becomes just "Tuesday" |
| **Filler word removal** | Strips um, uh, like, you know, and other verbal clutter |
| **Repetition cleanup** | Detects and removes unintended repeated words |
| **Auto-punctuation** | Adds proper punctuation so you don't have to think about it |
| **Personal dictionary** | Learns your names, medication terms, and important vocabulary |
| **Global hotkey** | Start/stop recording from any app with a single shortcut |
| **Floating overlay** | Always-on-top recording indicator with waveform visualization |
| **App-aware tone** | Automatically adjusts formality based on active app |
| **History tracking** | Searchable records with configurable retention |
| **Multi-provider** | Works with SiliconFlow, OpenRouter, and OpenAI |

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
npm install

# Start Vite dev server (frontend only, for UI development)
npm run dev

# Start full Electron dev mode
npm run electron:dev
```

### Configure API Keys

Launch the app → Settings → Provider Settings, then enter your API keys:

| Provider | STT | LLM | Get API Key |
|----------|-----|-----|-------------|
| SiliconFlow | Yes | Yes | [siliconflow.cn](https://siliconflow.cn) |
| OpenRouter | - | Yes | [openrouter.ai](https://openrouter.ai) |
| OpenAI | Yes | Yes | [platform.openai.com](https://platform.openai.com) |

### Validate API Connectivity

```bash
# Test LLM APIs
SILICONFLOW_KEY=sk-xxx OPENROUTER_KEY=sk-or-xxx npm run test:api

# Test STT endpoint
SILICONFLOW_KEY=sk-xxx npm run test:stt

# Test full pipeline (STT + LLM post-processing)
SILICONFLOW_KEY=sk-xxx OPENROUTER_KEY=sk-or-xxx npm run test:pipeline
```

## Build

```bash
# Type check
npm run typecheck

# Build frontend + Electron
npm run build

# Package for your platform
npm run electron:build:linux   # AppImage + deb
npm run electron:build:mac     # DMG (x64 + arm64)
npm run electron:build:win     # NSIS installer
```

Pre-built binaries are available on the [Releases](https://github.com/CodeTheCure/rivertide-electron/releases) page.

## Project Structure

```
Rivertide/
├── electron/                  # Electron main process
│   ├── main.ts               # Window management, tray, shortcuts, IPC
│   ├── preload.ts            # contextBridge API
│   ├── config-store.ts       # JSON file persistence
│   ├── stt-service.ts        # STT API calls
│   └── llm-service.ts        # LLM API calls + prompt builder
├── src/                       # React frontend (renderer)
│   ├── types/config.ts       # Central type system + defaults
│   ├── stores/configStore.ts # Zustand state management
│   ├── services/             # Audio, STT, LLM, pipeline
│   ├── hooks/useRecorder.ts  # Recording state machine
│   ├── components/           # UI primitives + layout + recording
│   └── pages/                # Dashboard, History, Dictionary,
│       └── settings/         # 7 settings sub-panels
├── scripts/                   # Validation test scripts
├── .github/workflows/         # CI + Release pipelines
└── build/                     # macOS entitlements
```

## Architecture

### Dual-mode Services

All services work in two modes:
- **Electron mode**: Frontend → IPC → Main process → API calls (production)
- **Browser mode**: Frontend → direct fetch (development without Electron)

### Settings Panels

| Panel | Description |
|-------|-------------|
| Provider Settings | API keys, base URLs, model selection, connection test |
| General | Launch on startup, input mode (toggle/push-to-talk), output mode |
| Hotkey | Global shortcut, push-to-talk key, paste-last key |
| Audio | Microphone selection, volume, sound effects, whisper mode |
| Personalization | Formality/verbosity sliders, style match score |
| Tone Rules | Per-app tone mapping (pattern → professional/casual/technical/friendly/custom) |
| Language | Input/output language, multi-language mixing |
| Privacy | History on/off, retention period, clear data |
| Advanced | Toggle individual AI features |

## License

MIT
