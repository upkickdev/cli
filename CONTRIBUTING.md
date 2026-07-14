# Contributing

## Local development

```bash
pnpm install
pnpm check
```

## Pull requests

- Keep commands small and composable.
- Put reusable behavior under `src/core`.
- Add tests for project detection and filesystem behavior.
- Avoid executing arbitrary code from templates.
- Preserve machine-readable output when changing `--json` commands.
