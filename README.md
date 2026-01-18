# J & D's Heritage Hog Farm Website

Official website for J & D's Heritage Hog Farm, featuring information about whole hogs, red wattle hogs, and ordering options.

## Development

### Prerequisites

- Node.js (v14 or higher)
- Java (for Nu HTML Checker)

### Setup

1. Install dependencies:
```bash
npm install
```

2. The repository uses pre-commit hooks via Husky to automatically lint files before committing.

### Code Quality Tools

This project uses multiple linting and validation tools to ensure code quality:

#### Biome
- **Purpose**: Format and lint HTML/CSS/JS
- **When to run**: Before every commit (automatic via pre-commit hook)
- **Usage**:
  ```bash
  npm run biome:check    # Check and fix issues
  npm run biome:format   # Format code
  ```
- **Configuration**: `biome.json`

#### html-validate
- **Purpose**: Validate HTML structure
- **When to run**: After editing pages/layouts
- **Usage**:
  ```bash
  npm run html:validate
  ```
- **Configuration**: `.htmlvalidate.json`

#### Nu Html Checker (vnu)
- **Purpose**: Standards compliance validation
- **When to run**: Before major releases
- **Usage**:
  ```bash
  npm run html:vnu
  ```
- **Note**: Requires Java to be installed

#### Stylelint
- **Purpose**: CSS quality enforcement
- **When to run**: After styling changes (automatic via pre-commit hook)
- **Usage**:
  ```bash
  npm run css:lint       # Check CSS issues
  npm run css:fix        # Fix CSS issues automatically
  ```
- **Configuration**: `.stylelintrc.json`

#### ESLint
- **Purpose**: JavaScript logic analysis
- **When to run**: After script changes (automatic via pre-commit hook)
- **Usage**:
  ```bash
  npm run js:lint        # Check JS issues
  npm run js:fix         # Fix JS issues automatically
  ```
- **Configuration**: `eslint.config.mjs`

### All-in-One Commands

Run all linters:
```bash
npm run lint:all
```

Auto-fix all fixable issues:
```bash
npm run lint:fix
```

Run tests (includes all linters):
```bash
npm test
```

### Pre-commit Hooks

The repository automatically runs linting tools on staged files before each commit using:
- **Husky**: Git hooks management
- **lint-staged**: Run linters on staged files only

Configuration is in `.lintstagedrc.json`.

## Project Structure

- `index.html` - Main website page
- `test-formspree.html` - Formspree integration testing page
- `data/` - Markdown content files
- `assets/` - Images and other static assets
- `scripts/` - PowerShell scripts for project setup

## License

See LICENSE file for details.

