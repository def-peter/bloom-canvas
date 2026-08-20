# Repository Agent Instructions

## Release command

When Peter says `发布` (or otherwise asks to release without narrowing the target), treat it as an instruction to build all three desktop installers from the latest `main` on GitHub:

- Windows 11-compatible x64 NSIS installer
- macOS x64 DMG for Intel Macs
- macOS arm64 DMG for Apple Silicon Macs

Do not ask Peter to choose a platform or architecture. Trigger exactly one run with:

```sh
gh workflow run release-installers.yml --ref main
```

Then find the newly dispatched `Build release installers` run, follow it through completion, and report its GitHub Actions URL plus the result of each installer job. Do not silently release uncommitted or unpushed local changes; this command always builds the current remote `main` unless Peter explicitly names another ref.
