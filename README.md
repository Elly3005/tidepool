# Tidepool

Tidepool is a local-first AI workbench for trying open models, shaping reusable agent skills, and running lightweight evaluations without relying on a remote platform.

## Features

- OpenAI-compatible model connection settings
- Chat playground for local or hosted models
- Reusable agent skill definitions
- Small evaluation bench for prompt behavior checks
- Storage in the browser so the app stays local-first by default

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open the displayed local URL in your browser.

## Model setup

Use any OpenAI-compatible server such as:

- Ollama at `http://localhost:11434/v1`
- LM Studio with its local server endpoint
- Any other compatible OpenAI-style API endpoint

The default example uses `qwen2.5:7b` with Ollama.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
