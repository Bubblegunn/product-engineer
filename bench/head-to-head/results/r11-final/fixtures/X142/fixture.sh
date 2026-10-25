#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Lena Vogt"
git config user.email "lena@example.test"
N=0
c() {
  N=$((N+1)); local t=$((1738000000 + N*61000)) an ae
  case $1 in d) an="Dana Ruiz"; ae="dana@example.test";; t) an="Tom Okafor"; ae="tom@example.test";; l) an="Lena Vogt"; ae="lena@example.test";; esac
  git add -A
  GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_COMMITTER_NAME="$an" GIT_COMMITTER_EMAIL="$ae" \
  GIT_AUTHOR_DATE="$t +0000" GIT_COMMITTER_DATE="$t +0000" git commit -q -m "$2"
}
mkdir -p bin src test examples/input docs scripts .github/workflows

cat > package.json <<'EOF'
{
  "name": "docgen",
  "version": "2.6.1",
  "description": "Turn a folder of markdown into HTML pages",
  "bin": { "docgen": "bin/docgen.js" },
  "scripts": {
    "test": "node --test",
    "build:compat": "node bin/docgen.js --legacy-json --out dist-legacy examples/input"
  },
  "engines": { "node": ">=18" }
}
EOF
printf 'node_modules/\ndist/\ndist-legacy/\n' > .gitignore
cat > README.md <<'EOF'
# docgen

Turns a folder of markdown files into HTML pages.

    node bin/docgen.js --out dist examples/input

Options: `--out <dir>`, `--format html|text`, `--config <file>`, `--verbose`,
and the deprecated `--legacy-json` (emit the 1.x JSON envelope; will be removed
in 3.0). See docs/usage.md.
EOF
c d "initial import"

cat > src/args.js <<'EOF'
'use strict';

function parse(argv) {
  const opts = { out: 'dist', format: 'html', verbose: false, legacyJson: false, inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '-o') opts.out = argv[++i];
    else if (a === '--format') opts.format = argv[++i];
    else if (a === '--config') opts.configPath = argv[++i];
    else if (a === '--verbose') opts.verbose = true;
    else if (a === '--legacy-json') opts.legacyJson = true;
    else if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
    else opts.inputs.push(a);
  }
  return opts;
}

module.exports = { parse };
EOF
cat > test/args.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/args');

test('parses out and inputs', () => {
  const o = parse(['--out', 'site', 'docs']);
  assert.strictEqual(o.out, 'site');
  assert.deepStrictEqual(o.inputs, ['docs']);
});

test('rejects unknown options', () => {
  assert.throws(() => parse(['--nope']), /Unknown option/);
});
EOF
c l "argument parser"

cat > src/config.js <<'EOF'
'use strict';
const fs = require('node:fs');

const ALLOWED = ['out', 'format', 'verbose', 'legacyJson'];

function loadConfig(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const key of Object.keys(raw)) {
    if (!ALLOWED.includes(key)) throw new Error(`Unknown config key: ${key}`);
  }
  if (raw.format && !['html', 'text'].includes(raw.format)) {
    throw new Error(`Invalid format: ${raw.format}`);
  }
  if (process.env.DOCGEN_LEGACY_JSON === '1') raw.legacyJson = true;
  return raw;
}

module.exports = { loadConfig, ALLOWED };
EOF
cat > test/config.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig } = require('../src/config');

function tmpConfig(obj) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dg-')), 'c.json');
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

test('loads a valid config', () => {
  assert.strictEqual(loadConfig(tmpConfig({ format: 'text' })).format, 'text');
});

test('rejects unknown keys', () => {
  assert.throws(() => loadConfig(tmpConfig({ bogus: 1 })), /Unknown config key/);
});

test('rejects bad format', () => {
  assert.throws(() => loadConfig(tmpConfig({ format: 'pdf' })), /Invalid format/);
});
EOF
c l "config loading with strict keys"

cat > src/render.js <<'EOF'
'use strict';
const { toLegacy } = require('./legacy');

function title(md) {
  const m = /^#\s+(.+)$/m.exec(md);
  return m ? m[1].trim() : 'Untitled';
}

function render(md, opts) {
  const t = title(md);
  const body = md
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('# ') ? `<h1>${p.slice(2)}</h1>` : `<p>${p}</p>`))
    .join('\n');
  if (opts.legacyJson) return toLegacy({ title: t, body });
  if (opts.format === 'text') return md.replace(/^#\s+/gm, '').trim() + '\n';
  return `<html><head><title>${t}</title></head><body>\n${body}\n</body></html>\n`;
}

module.exports = { render, title };
EOF
cat > src/legacy.js <<'EOF'
'use strict';
// 1.x JSON envelope. Deprecated, scheduled for removal in 3.0.
function toLegacy(page) {
  return JSON.stringify({ version: 1, title: page.title, content: page.body }) + '\n';
}

module.exports = { toLegacy };
EOF
cat > test/render.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { render, title } = require('../src/render');

test('finds the title', () => {
  assert.strictEqual(title('# Hello\n\ntext'), 'Hello');
});

test('renders html', () => {
  const out = render('# Hi\n\nbody', { format: 'html' });
  assert.match(out, /<title>Hi<\/title>/);
});

test('renders text', () => {
  assert.strictEqual(render('# Hi\n\nbody', { format: 'text' }), 'Hi\n\nbody\n');
});
EOF
c d "renderer"

cat > test/legacy.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { render } = require('../src/render');
const { parse } = require('../src/args');

test('legacy flag is parsed', () => {
  assert.strictEqual(parse(['--legacy-json']).legacyJson, true);
});

test('legacy envelope shape', () => {
  const out = JSON.parse(render('# T\n\nx', { legacyJson: true }));
  assert.strictEqual(out.version, 1);
  assert.strictEqual(out.title, 'T');
});

test.skip('legacy output keeps html entities (see #58)', () => {
  const out = JSON.parse(render('# A & B', { legacyJson: true }));
  assert.strictEqual(out.title, 'A &amp; B');
});
EOF
c t "tests for the 1.x envelope"

cat > src/index.js <<'EOF'
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('./args');
const { loadConfig } = require('./config');
const { render } = require('./render');

function main(argv) {
  const cli = parse(argv);
  const fromFile = cli.configPath ? loadConfig(cli.configPath) : {};
  const opts = Object.assign({ out: 'dist', format: 'html' }, fromFile, stripDefaults(cli));
  if (process.env.DOCGEN_LEGACY_JSON === '1') opts.legacyJson = true;
  fs.mkdirSync(opts.out, { recursive: true });
  let n = 0;
  for (const dir of cli.inputs) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const md = fs.readFileSync(path.join(dir, f), 'utf8');
      const ext = opts.legacyJson ? '.json' : opts.format === 'text' ? '.txt' : '.html';
      fs.writeFileSync(path.join(opts.out, f.replace(/\.md$/, ext)), render(md, opts));
      n++;
      if (opts.verbose) console.log(`wrote ${f}`);
    }
  }
  return n;
}

function stripDefaults(cli) {
  const o = {};
  for (const k of ['out', 'format', 'verbose', 'legacyJson']) {
    if (cli[k] && cli[k] !== 'dist' && cli[k] !== 'html') o[k] = cli[k];
  }
  return o;
}

module.exports = { main };
EOF
cat > bin/docgen.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { main } = require('../src/index');

try {
  const n = main(process.argv.slice(2));
  console.log(`${n} page(s) written`);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
EOF
chmod +x bin/docgen.js
c d "wire up the CLI"

printf '# Getting started\n\nDocgen turns markdown into pages.\n' > examples/input/start.md
printf '# Config\n\nSee docs/config.md.\n' > examples/input/config.md
c l "example input"

cat > examples/docgen.config.json <<'EOF'
{
  "out": "site",
  "format": "html",
  "verbose": true,
  "legacyJson": true
}
EOF
cat > test/examples.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadConfig } = require('../src/config');

test('the shipped example config is valid', () => {
  const cfg = loadConfig(path.join(__dirname, '..', 'examples', 'docgen.config.json'));
  assert.strictEqual(cfg.format, 'html');
});
EOF
c t "ship an example config and test it"

cat > docs/usage.md <<'EOF'
# Usage

    docgen [options] <input-dir>...

| Option | Meaning |
|--------|---------|
| `--out`, `-o` | output directory (default `dist`) |
| `--format` | `html` (default) or `text` |
| `--config` | JSON config file |
| `--verbose` | print each file written |
| `--legacy-json` | DEPRECATED. Emit the 1.x JSON envelope. Removed in 3.0. |

Environment: `DOCGEN_LEGACY_JSON=1` has the same effect as `--legacy-json`.
EOF
cat > docs/config.md <<'EOF'
# Config file

Keys: `out`, `format`, `verbose`, `legacyJson` (deprecated).
Unknown keys are an error.
EOF
c d "usage and config docs"

cat > docs/migrating.md <<'EOF'
# Migrating

## 1.x to 2.0
The JSON envelope is no longer the default. Pass `--legacy-json` to keep it
while you move your consumers to HTML. The flag is deprecated and will go in 3.0.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.6.1
- Fix config path resolution

## 2.5.0
- `--format text`

## 2.0.0
- HTML is the default output.
- `--legacy-json` keeps the 1.x JSON envelope (deprecated).
EOF
c l "migration guide, changelog"

cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
      - name: compat build
        run: node bin/docgen.js --legacy-json --out /tmp/compat examples/input
EOF
c t "ci: run tests on 18/20/22 and a compat build"

cat > scripts/release.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
npm test
npm run build:compat
echo "ready to tag $(node -p "require('./package.json').version")"
EOF
chmod +x scripts/release.sh
c d "release script"

printf '\n// note: keep in sync with docs/config.md\n' >> src/config.js
c l "comment"
printf '\nThe CLI exits with code 2 on bad input.\n' >> docs/usage.md
c d "docs: exit code"
printf '\n- Fix verbose output for nested inputs\n' >> CHANGELOG.md
sed -i.bak 's/^## 2.5.0/## 2.5.0/' CHANGELOG.md && rm -f CHANGELOG.md.bak
c t "changelog tweak"
printf '\n## Contributing\nRun `npm test` before sending a PR.\n' >> README.md
c l "readme: contributing"
printf '\n## Reporting bugs\nInclude the docgen version and your Node version.\n' >> README.md
c d "readme: bug reports"
printf '\n// TODO: stream large files\n' >> src/index.js
c t "todo note"
printf '\n- Document exit codes\n' >> CHANGELOG.md
c d "changelog: exit codes"
printf '\nTip: use --verbose to see which files were written.\n' >> docs/usage.md
c l "usage tip"
printf '\nSee also docs/migrating.md for upgrade notes.\n' >> docs/config.md
c d "config doc: link to migration notes"
