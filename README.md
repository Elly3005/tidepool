# Tidepool

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Status](https://img.shields.io/badge/status-open%20source-blue)](#)

Tidepool is a local-first AI workbench for trying open models, shaping reusable agent skills, and running lightweight evaluations without depending on a remote platform.

## Why Tidepool

- Connect to any OpenAI-compatible endpoint
- Test prompts in a lightweight chat playground
- Save reusable agent instructions as skills
- Run small, concrete evaluation checks before trusting a model
- Keep the default flow local and browser-first

## Features

- OpenAI-compatible model connection settings
- Chat playground for local or hosted models
- Reusable agent skill definitions
- Small evaluation bench for prompt behavior checks
- Browser-based storage for settings and skill drafts

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

## Release notes

### v0.1.0

- Initial Tidepool release
- Local-first AI workbench for chat and model testing
- Reusable skill editor for agent instructions
- Minimal evaluation harness for model behavior checks
- MIT license and GitHub publishing setup

## Contributing

Pull requests, ideas, and issue reports are welcome. Please keep changes focused and include a short summary of the behavior change.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
