# Development Guide

This guide covers development workflows for the Divvy monorepo.

## Quick Start

```bash
# Setup development environment
npm run setup

# Check workspace health
npm run check

# Build all packages
npm run build

# Start development
npm run dev:web    # Web app on http://localhost:3000
npm run dev:cli    # CLI in watch mode
npm run dev:all    # All packages in parallel
```

## Available Scripts

### Build Commands
- `npm run build` - Build all packages
- `npm run build:web` - Build web app only
- `npm run build:cli` - Build CLI only
- `npm run build:core` - Build core package only

### Development Commands
- `npm run dev` - Start all packages in development mode
- `npm run dev:web` - Start Next.js web app
- `npm run dev:cli` - Watch CLI TypeScript compilation
- `npm run dev:core` - Watch core package compilation
- `npm run dev:all` - Start all packages in parallel

### Testing & Quality
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run type-check` - TypeScript checking
- `npm run lint` - ESLint checking
- `npm run lint:fix` - Fix ESLint issues automatically

### Utility Commands
- `npm run clean` - Clean build outputs
- `npm run clean:all` - Deep clean including node_modules cache
- `npm run reset` - Complete reset and reinstall
- `npm run setup` - Setup development environment
- `npm run check` - Health check workspace
- `npm run link` - Link internal packages manually

### CLI Usage
- `npm run divvy AAPL` - Run dividend analysis for AAPL
- `npm run divvy MSFT -- --no-save` - Analyze without saving to DB

## Package Structure

```
divvy-monorepo/
├── apps/
│   ├── cli/          # CLI application
│   └── web/          # Next.js web app
├── packages/
│   ├── core/         # Business logic
│   ├── utils/        # Shared utilities
│   ├── eslint-config/       # ESLint configurations
│   ├── typescript-config/   # TypeScript configurations
│   └── tailwind-config/     # Tailwind CSS configuration
└── scripts/          # Development utilities
```

## Development Workflows

### Adding a New Feature

1. **Start development environment**
   ```bash
   npm run dev:all
   ```

2. **Make changes** to relevant packages

3. **Test your changes**
   ```bash
   npm run type-check
   npm run lint
   npm run test
   ```

4. **Build and verify**
   ```bash
   npm run build
   ```

### Working on the Web App

1. **Start web development**
   ```bash
   npm run dev:web
   ```

2. **Visit** http://localhost:3000

3. **Core package changes** will be automatically picked up due to file:// dependencies

### Working on the CLI

1. **Start CLI development**
   ```bash
   npm run dev:cli
   ```

2. **Test CLI** (requires Node.js 20.10+)
   ```bash
   npm run divvy AAPL
   ```

3. **Changes** are compiled automatically in watch mode

### Working on Core Package

1. **Start core development**
   ```bash
   npm run dev:core
   ```

2. **Changes** automatically trigger rebuilds and are picked up by dependent packages

## Turborepo Features

- **Parallel execution** - Multiple packages build/test simultaneously
- **Smart caching** - Skip unchanged packages
- **Task dependencies** - Ensure proper build order
- **Watch mode** - Automatic rebuilds on file changes

## Troubleshooting

### Dependency Issues
```bash
npm run reset          # Complete reset
npm install           # Reinstall dependencies
```

### Build Issues
```bash
npm run clean:all     # Clean everything
npm run build         # Rebuild all packages
```

### TypeScript Issues
```bash
npm run type-check    # Check all packages
```

### Package Linking Issues
```bash
npm run link          # Manually link packages
```

### Health Check
```bash
npm run check         # Verify workspace health
```

## Node.js Version Compatibility

- **Minimum**: Node.js 20.10+ (due to yahoo-finance2 import syntax)
- **Current environment**: Node.js 20.5.1 (CLI runtime issues expected)
- **Development**: All build/type-check/lint commands work on current version

## Editor Setup

### VS Code
- Install workspace extensions (if .vscode/extensions.json exists)
- TypeScript/ESLint integration works automatically
- Turborepo extension recommended

### Settings
- Shared ESLint config: `@repo/eslint-config`
- Shared TypeScript config: `@repo/typescript-config`
- Consistent formatting across all packages

## Performance Tips

- Use `--filter` flag to work with specific packages
- Utilize Turborepo caching for faster rebuilds
- Run `npm run dev:all` for parallel development
- Use watch modes for continuous development