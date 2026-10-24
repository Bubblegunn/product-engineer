#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.test"
n=0
c() {
  n=$((n+1))
  local d
  d=$(printf '2026-%02d-%02dT09:%02d:00+0000' $((1+n/25)) $((1+n%25)) "$n")
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
util() {
  mkdir -p src/util test
  cat > "src/util/$1.js" <<EOF
'use strict';
exports.$2 = $3;
EOF
  cat > "test/util-$1.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { $2 } = require('../src/util/$1');
test('$1 $2', () => {
  assert.strictEqual($4, $5);
});
EOF
  c "feat(util): add $1.$2"
}

mkdir -p src/formats src/util test/fixtures bin docs
cat > package.json <<'EOF'
{
  "name": "tally",
  "version": "0.6.0",
  "description": "Count report renderer",
  "bin": { "tally": "bin/tally.js" },
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > README.md <<'EOF'
# tally

Reads a JSON list of `{name, count, note}` items and prints a report.

    tally items.json --format text

Output formats: `json`, `text`. The default format can be set in
`tally.config.json`. See `docs/formats.md` and `docs/cli.md`.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 0.6.0
- Add `tally.config.json` with a default `format`.

## 0.5.0
- Add `text` format.

## 0.1.0
- First release, JSON output only.
EOF
cat > tally.config.json <<'EOF'
{
  "format": "text"
}
EOF
c "chore: project skeleton"

cat > src/report.js <<'EOF'
'use strict';

function buildRows(items) {
  return items
    .map((i) => ({ name: String(i.name), count: Number(i.count) || 0, note: i.note === undefined ? '' : String(i.note) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

module.exports = { buildRows };
EOF
cat > test/fixtures/sample.json <<'EOF'
[
  { "name": "widgets", "count": 3, "note": "plain" },
  { "name": "Doe, Jane", "count": 5, "note": "said \"hello\"" },
  { "name": "gadgets", "count": 1, "note": "line one\nline two" }
]
EOF
cat > test/report.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildRows } = require('../src/report');
const sample = require('./fixtures/sample.json');

test('rows sorted by count desc', () => {
  assert.deepStrictEqual(buildRows(sample).map((r) => r.count), [5, 3, 1]);
});
EOF
c "feat: report rows"

cat > src/formats/json.js <<'EOF'
'use strict';
exports.render = (rows) => JSON.stringify(rows, null, 2) + '\n';
EOF
cat > src/formats/text.js <<'EOF'
'use strict';
exports.render = (rows) => {
  const w = Math.max(4, ...rows.map((r) => r.name.length));
  return rows.map((r) => r.name.padEnd(w) + '  ' + String(r.count).padStart(4) + '  ' + r.note.replace(/\n/g, ' ')).join('\n') + '\n';
};
EOF
cat > src/formats/index.js <<'EOF'
'use strict';
const formats = {
  json: require('./json'),
  text: require('./text'),
};

function names() {
  return Object.keys(formats);
}

function render(name, rows) {
  const f = formats[name];
  if (!f) throw new Error('unknown format: ' + name);
  return f.render(rows);
}

module.exports = { names, render };
EOF
cat > test/formats.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const formats = require('../src/formats');
const { buildRows } = require('../src/report');
const sample = require('./fixtures/sample.json');

test('registry lists the known formats', () => {
  assert.deepStrictEqual(formats.names(), ['json', 'text']);
});
test('json renders valid JSON', () => {
  const out = formats.render('json', buildRows(sample));
  assert.strictEqual(JSON.parse(out).length, 3);
});
test('text renders one line per row', () => {
  const out = formats.render('text', buildRows(sample));
  assert.strictEqual(out.trim().split('\n').length, 3);
});
test('unknown format throws', () => {
  assert.throws(() => formats.render('xml', []), /unknown format/);
});
EOF
c "feat: json and text formats behind a registry"

cat > src/config-schema.js <<'EOF'
'use strict';

const ALLOWED_FORMATS = ['json', 'text'];

function validate(cfg) {
  const errors = [];
  if (cfg.format !== undefined && !ALLOWED_FORMATS.includes(cfg.format)) {
    errors.push('format must be one of: ' + ALLOWED_FORMATS.join(', '));
  }
  for (const k of Object.keys(cfg)) {
    if (k !== 'format') errors.push('unknown key: ' + k);
  }
  return errors;
}

module.exports = { validate, ALLOWED_FORMATS };
EOF
cat > src/config.js <<'EOF'
'use strict';
const fs = require('fs');
const path = require('path');
const { validate } = require('./config-schema');

function load(dir = process.cwd()) {
  const p = path.join(dir, 'tally.config.json');
  if (!fs.existsSync(p)) return {};
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  const errors = validate(cfg);
  if (errors.length) throw new Error('invalid tally.config.json: ' + errors.join('; '));
  return cfg;
}

module.exports = { load };
EOF
cat > test/schema.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/config-schema');

test('accepts known format', () => {
  assert.deepStrictEqual(validate({ format: 'text' }), []);
});
test('rejects unknown format', () => {
  assert.strictEqual(validate({ format: 'xml' }).length, 1);
});
test('rejects unknown key', () => {
  assert.strictEqual(validate({ colour: 'red' }).length, 1);
});
EOF
c "feat: validated tally.config.json"

cat > bin/tally.js <<'EOF'
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const { buildRows } = require('../src/report');
const formats = require('../src/formats');
const { load } = require('../src/config');

const USAGE = 'Usage: tally <input.json> [--format json|text]';
const args = process.argv.slice(2);
let file = null;
let format = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format') format = args[++i];
  else if (args[i] === '--help') { console.log(USAGE); process.exit(0); }
  else file = args[i];
}
if (!file) { console.error(USAGE); process.exit(2); }
const cfg = load();
format = format || cfg.format || 'json';
if (!formats.names().includes(format)) {
  console.error('unknown format: ' + format);
  process.exit(2);
}
const rows = buildRows(JSON.parse(fs.readFileSync(file, 'utf8')));
process.stdout.write(formats.render(format, rows));
EOF
chmod +x bin/tally.js
cat > test/cli.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

const bin = path.join(__dirname, '..', 'bin', 'tally.js');
const sample = path.join(__dirname, 'fixtures', 'sample.json');
const run = (args) => spawnSync(process.execPath, [bin, ...args], { cwd: os.tmpdir(), encoding: 'utf8' });

test('help lists formats', () => {
  assert.match(run(['--help']).stdout, /--format json\|text/);
});
test('json output', () => {
  assert.strictEqual(JSON.parse(run([sample, '--format', 'json']).stdout).length, 3);
});
test('unknown format exits 2', () => {
  assert.strictEqual(run([sample, '--format', 'xml']).status, 2);
});
EOF
c "feat(cli): tally command"

cat > docs/formats.md <<'EOF'
# Output formats

| Name   | Description                         |
| ------ | ----------------------------------- |
| `json` | Pretty-printed JSON array of rows   |
| `text` | Aligned columns, one row per line   |

Select one with `--format` or with `"format"` in `tally.config.json`.
The command line wins over the config file.
EOF
cat > docs/cli.md <<'EOF'
# Command line

    tally <input.json> [--format json|text]

Exit codes: 0 success, 2 bad usage or unknown format.

`tally.config.json` in the current directory may set `format`. Unknown keys
and unknown formats are rejected when the file is read.
EOF
c "docs: formats and cli"

for spec in \
 "pad|left|(s, n) => String(s).padStart(n, '0')|left(7, 3)|007" \
 "bytes|kb|(n) => Math.round(n / 1024)|kb(2048)|2" \
 "names|initials|(s) => s.split(' ').map((w) => w[0]).join('')|initials('Ada Lovelace')|AL" \
 "keys|join|(...p) => p.join(':')|join('a', 'b')|a:b" ; do
  IFS='|' read -r f fn ex call exp <<<"$spec"
  case "$exp" in 2) e=2;; *) e="'$exp'";; esac
  util "$f" "$fn" "$ex" "$call" "$e"
done
echo node_modules > .gitignore
c "chore: gitignore"
