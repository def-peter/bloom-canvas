# Repository Agent Instructions

## Release command

When Peter says `发布` (or otherwise asks to release without narrowing the target), treat it as an instruction to publish a GitHub Release from the latest `main` with all three desktop installers:

- Windows 11-compatible x64 NSIS installer
- macOS x64 DMG for Intel Macs
- macOS arm64 DMG for Apple Silicon Macs

Do not ask Peter to choose a platform or architecture. Trigger exactly one run with:

```sh
gh workflow run release-installers.yml --ref main
```

Then find the newly dispatched `Build release installers` run and follow it through completion. A release is complete only when the `Publish GitHub Release` job succeeds and the GitHub Release contains all three installer assets. Report the GitHub Release URL and the result of each installer job. Do not silently release uncommitted or unpushed local changes; this command always builds the current remote `main` unless Peter explicitly names another ref.
