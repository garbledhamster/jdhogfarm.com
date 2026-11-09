# J & D's Heritage Hog Farm Website

Official website for J & D's Heritage Hog Farm, featuring information about whole hogs, red wattle hogs, and ordering options.

## Development

### Prerequisites

- Node.js 20.19+ or 22.16+ (or a newer supported LTS)
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

Run the linters and farm simulation tests:
```bash
npm test
```

### Pre-commit Hooks

The repository automatically runs linting tools on staged files before each commit using:
- **Husky**: Git hooks management
- **lint-staged**: Run linters on staged files only

Configuration is in `.lintstagedrc.json`.

## Homepage game

The homepage loads the game from `game/`. The farm rules are separate from the browser controls and scene rendering. The player closes each week in the Office. The game saves progress in the current browser. After a reload, choose **Continue season** on the homepage.

Run the named Week 2 grain shortage scenario without opening a browser.

```bash
node --test --test-name-pattern='Week 2 grain shortage' tests/farm-morning.test.mjs
```

To test the game in Chromium, install the Playwright browser once and run the browser checks. The checks start a local static server with Python 3. They intercept inquiry writes.

```bash
npx playwright install chromium --only-shell
npm run test:browser
```

For a manual preview, serve the repository root with `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/#farm-game`. To run the same browser checks against a deployed candidate, set `GAME_URL` to its homepage URL.

## Project Structure

- `index.html` - Main website page
- `test-formspree.html` - Formspree integration testing page
- `data/` - Markdown content files
- `assets/` - Images and other static assets
- `scripts/` - PowerShell scripts for project setup

## License

See LICENSE file for details.

