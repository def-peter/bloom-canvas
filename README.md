<div align="center">
  <img src="build/icon.png" alt="Bloom Canvas icon" width="96" height="96">
  <h1>Bloom Canvas</h1>
  <p>An open-source desktop workspace for AI image creation, prompt refinement, and structured logo exploration.</p>

  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>

  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2f6f5e" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/Electron-39-47848F" alt="Electron 39">
    <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React 19">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6" alt="TypeScript 5">
  </p>
</div>

Bloom Canvas (生花) turns prompts, reference images, and brand briefs into an organized image-generation workflow. It runs locally, connects to OpenAI-compatible providers, and keeps provider settings, generation history, and image assets on your device.

> [!NOTE]
> Bloom Canvas is under active development. The application interface is currently primarily in Simplified Chinese; English localization is planned. There are no official binary releases yet, so the project must currently be run from source.

## Features

- **General image creation:** Generate images from text or continue from one or more reference images.
- **Optional prompt refinement:** Use a configured text model to improve a prompt before generation while keeping the original prompt visible.
- **Structured logo workflow:** Capture a brand brief, explore multiple visual directions, review prompts, iterate on selected results, and export drafts.
- **Provider flexibility:** Configure the base URL, API key, image model, and text model for an OpenAI-compatible service.
- **Local-first workspace:** Store image assets, thumbnails, provider configuration, and generation history locally.
- **Practical result management:** Search history, retry failed generations, continue editing from a result, and export images as PNG, JPEG, or WebP.

## Requirements

- macOS, Windows, or Linux
- [Node.js](https://nodejs.org/) `^20.19.0` or `>=22.12.0`
- [pnpm](https://pnpm.io/) 11
- An API key for an OpenAI-compatible image provider

## Getting Started

```bash
git clone https://github.com/def-peter/bloom-canvas.git
cd bloom-canvas
corepack enable
pnpm install
pnpm dev
```

Open **Provider Settings** in the application and configure:

| Setting     | Purpose                                                    | Example                          |
| ----------- | ---------------------------------------------------------- | -------------------------------- |
| Name        | A local label for the provider                             | `OpenAI`                         |
| Base URL    | OpenAI-compatible API base URL                             | `https://api.openai.com/v1`      |
| API Key     | Credential sent only to the configured provider            | `sk-...`                         |
| Image model | Model used for generation and edits                        | `gpt-image-2`                    |
| Text model  | Model used for prompt refinement and AI-assisted workflows | A Responses API-compatible model |

The provider must support `POST /images/generations` and, for reference-image editing, `POST /images/edits`. Prompt refinement requires `POST /responses`; AI-assisted workflows may use the same endpoint. Image responses must include base64 data in the OpenAI-compatible `b64_json` format.

## Development

| Command            | Description                                     |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | Start the Electron app in development mode      |
| `pnpm test:run`    | Run the test suite once                         |
| `pnpm lint`        | Run ESLint                                      |
| `pnpm typecheck`   | Type-check the main, preload, and renderer code |
| `pnpm build`       | Type-check and create the production bundle     |
| `pnpm build:mac`   | Build the macOS package                         |
| `pnpm build:win`   | Build the Windows package                       |
| `pnpm build:linux` | Build the Linux packages                        |

The application uses Electron, React, TypeScript, Ant Design, electron-vite, Vitest, and Sharp. The renderer communicates through a typed preload API; provider requests, credentials, and file operations remain in the Electron main process.

## Local Data and Privacy

Bloom Canvas does not require a Bloom Canvas account or cloud backend. Application metadata and images are stored under Electron's per-user application data directory in `BloomCanvasData`. API keys are encrypted at rest with a locally generated key and are not written into the regular provider configuration.

Prompts and images are sent to the provider you configure when you request generation, editing, prompt refinement, or strategy assistance. Review that provider's privacy and retention policies before using sensitive material.

## Project Status

Current priorities include:

- English and Simplified Chinese interface localization
- A more complete strategy-driven logo workflow
- Release packaging, signing, and downloadable builds
- Documentation for provider compatibility and contribution workflows

Bloom Canvas helps explore and refine logo directions; it is not a replacement for professional vector production, typography, trademark clearance, or legal review. Validate AI-generated logo drafts before commercial use.

## Contributing

Issues and pull requests are welcome. Before opening a large feature pull request, start with an issue so the scope and product direction can be discussed. Please run the following checks before submitting changes:

```bash
pnpm test:run
pnpm lint
pnpm typecheck
```

## License

Bloom Canvas is available under the [MIT License](LICENSE).
