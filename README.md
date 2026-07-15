# @upkick/cli

The official TypeScript command-line interface for [Upkick](https://upkick.dev).

## Installation

```bash
npm install --global @upkick/cli
```

You can also run it without a global installation:

```bash
npx @upkick/cli --help
```

## Commands

```bash
upkick --help
upkick --version
upkick doctor
upkick inspect
upkick inspect ./my-project --json
```

## Development

Requirements:

- Node.js 20 or newer
- pnpm 10

```bash
pnpm install
pnpm dev -- --help
pnpm check
```

Build and run the compiled CLI:

```bash
pnpm build
node dist/index.js doctor
```

Test the package exactly as npm will publish it:

```bash
pnpm pack
npm install --global ./upkick-cli-*.tgz
upkick --help
```

## Repository direction

This repository owns the local developer experience:

- project inspection
- project creation
- template resolution and rendering
- authentication with `app.upkick.dev`
- communication with `api.upkick.dev/v1`
- review and application of generated changes

Open-source templates live separately under the [upkickdev](https://github.com/upkickdev) organization.

## License

MIT

## Development

Install dependencies and run the project locally:

```bash
pnpm install
pnpm build
```
