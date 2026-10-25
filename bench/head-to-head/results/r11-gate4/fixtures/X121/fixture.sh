#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Priya Raman"; git config user.email "priya@logslice.example"
git config commit.gpgsign false
ci() { # who date message
  local n e
  case "$1" in
    p) n="Priya Raman"; e="priya@logslice.example";;
    t) n="Tom Becker"; e="tom@logslice.example";;
    l) n="Lena Okafor"; e="lena@logslice.example";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" \
  GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}
sub() { python3 - "$1" "$2" "$3" <<'PY'
import sys
f,o,n=sys.argv[1:4]
s=open(f).read()
assert o in s,(f,o)
open(f,'w').write(s.replace(o,n,1))
PY
}
mkdir -p bin src test docs sample

cat > package.json <<'EOF'
{
  "name": "logslice",
  "version": "1.3.0",
  "description": "Filter and reformat application log files from the command line",
  "bin": { "logslice": "bin/logslice.js" },
  "scripts": { "test": "node --test" },
  "engines": { "node": ">=18" },
  "license": "MIT"
}
EOF
cat > README.md <<'EOF'
# logslice

Filter application log files by level and time range.

    logslice app.log --level ERROR --since 2026-09-01T00:00:00Z

See docs/usage.md and docs/configuration.md.
EOF
printf 'MIT License\n\nCopyright (c) 2026 logslice contributors\n' > LICENSE
printf 'node_modules/\n*.log.tmp\n' > .gitignore
echo 18 > .nvmrc
cat > sample/app.log <<'EOF'
2026-09-01T10:00:00Z INFO service started
2026-09-01T10:00:05Z DEBUG cache warmed
2026-09-01T10:01:10Z WARN slow query 812ms
2026-09-01T10:02:00Z ERROR payment failed order=1042
2026-09-01T10:03:30Z INFO retry ok order=1042
2026-09-01T10:05:00Z ERROR upstream timeout
EOF
ci p "2026-09-01T09:00:00+0000" "Initial commit: README, license, package.json"

cat > src/timeparse.js <<'EOF'
'use strict';
function toMillis(s) {
  const t = Date.parse(s);
  if (Number.isNaN(t)) throw new Error('Unsupported time: ' + s + ' (use ISO 8601)');
  return t;
}
module.exports = { toMillis };
EOF
cat > src/filter.js <<'EOF'
'use strict';
const { toMillis } = require('./timeparse');
function parseLine(line) {
  const m = /^(\S+)\s+([A-Za-z]+)\s+(.*)$/.exec(line);
  return m ? { ts: m[1], level: m[2], msg: m[3] } : null;
}
function matches(e, o) {
  if (o.level && e.level !== o.level) return false;
  const t = toMillis(e.ts);
  if (o.since && t < toMillis(o.since)) return false;
  if (o.until && t > toMillis(o.until)) return false;
  return true;
}
module.exports = { parseLine, matches };
EOF
cat > test/filter.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseLine, matches } = require('../src/filter');
test('parseLine splits ts, level, msg', () => {
  assert.deepStrictEqual(parseLine('2026-09-01T10:00:00Z INFO hi there'), { ts: '2026-09-01T10:00:00Z', level: 'INFO', msg: 'hi there' });
});
test('matches filters by level', () => {
  const e = parseLine('2026-09-01T10:00:00Z ERROR boom');
  assert.ok(matches(e, { level: 'ERROR' }));
  assert.ok(!matches(e, { level: 'INFO' }));
});
test('matches filters by since/until', () => {
  const e = parseLine('2026-09-01T10:00:00Z INFO x');
  assert.ok(!matches(e, { since: '2026-09-01T11:00:00Z' }));
  assert.ok(matches(e, { until: '2026-09-01T11:00:00Z' }));
});
EOF
ci p "2026-09-01T11:30:00+0000" "filter: parse lines, match on level and time range"

cat > src/config.js <<'EOF'
'use strict';
const fs = require('fs');
const path = require('path');
function loadConfig(env = process.env, cwd = process.cwd()) {
  let cfg = { timezone: 'UTC' };
  try {
    cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(path.join(cwd, 'logslice.config.json'), 'utf8')));
  } catch (_) { /* no config file is fine */ }
  if (env.LOGSLICE_TZ) cfg.timezone = env.LOGSLICE_TZ;
  return cfg;
}
module.exports = { loadConfig };
EOF
cat > logslice.config.json <<'EOF'
{
  "timezone": "UTC"
}
EOF
cat > src/format.js <<'EOF'
'use strict';
function formatText(e, cfg) {
  const d = new Date(e.ts);
  const when = Number.isNaN(d.getTime()) ? e.ts : d.toLocaleString('en-GB', { timeZone: cfg.timezone });
  return when + ' [' + e.level.toUpperCase() + '] ' + e.msg;
}
module.exports = { formatText };
EOF
cat > test/format.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { formatText } = require('../src/format');
test('formatText renders the level in brackets', () => {
  const s = formatText({ ts: '2026-09-01T10:00:00Z', level: 'warn', msg: 'slow' }, { timezone: 'UTC' });
  assert.match(s, /\[WARN\] slow$/);
});
EOF
cat > test/config.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');
test('LOGSLICE_TZ overrides the timezone', () => {
  assert.strictEqual(loadConfig({ LOGSLICE_TZ: 'Europe/Berlin' }, '/nonexistent').timezone, 'Europe/Berlin');
});
test('defaults to UTC', () => {
  assert.strictEqual(loadConfig({}, '/nonexistent').timezone, 'UTC');
});
EOF
ci l "2026-09-02T09:15:00+0000" "config: timezone from logslice.config.json or LOGSLICE_TZ; text formatter"

cat > src/cli.js <<'EOF'
'use strict';
const fs = require('fs');
const { loadConfig } = require('./config');
const { parseLine, matches } = require('./filter');
const { formatText } = require('./format');
function parseArgs(argv) {
  const o = { file: null, level: null, since: null, until: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--level') o.level = argv[++i];
    else if (a === '--since') o.since = argv[++i];
    else if (a === '--until') o.until = argv[++i];
    else if (!a.startsWith('--')) o.file = a;
    else throw new Error('Unknown option ' + a);
  }
  if (!o.file) throw new Error('Usage: logslice <file> [--level L] [--since T] [--until T]');
  return o;
}
function main(argv) {
  const o = parseArgs(argv);
  const cfg = loadConfig();
  const text = fs.readFileSync(o.file, 'utf8');
  for (const line of text.split('\n')) {
    const e = parseLine(line);
    if (e && matches(e, o)) process.stdout.write(formatText(e, cfg) + '\n');
  }
}
module.exports = { main, parseArgs };
EOF
cat > bin/logslice.js <<'EOF'
#!/usr/bin/env node
'use strict';
try {
  require('../src/cli').main(process.argv.slice(2));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
EOF
chmod +x bin/logslice.js
cat > test/cli.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const path = require('path');
const bin = path.join(__dirname, '..', 'bin', 'logslice.js');
const sample = path.join(__dirname, '..', 'sample', 'app.log');
test('cli prints only matching level', () => {
  const out = execFileSync('node', [bin, sample, '--level', 'ERROR'], { encoding: 'utf8' });
  assert.strictEqual(out.trim().split('\n').length, 2);
  assert.match(out, /payment failed/);
});
EOF
ci p "2026-09-02T14:00:00+0000" "cli: bin/logslice with --level, --since, --until"

cat > docs/usage.md <<'EOF'
# Usage

    logslice <file> [--level LEVEL] [--since TIME] [--until TIME]

- `--level` keeps only lines of that level (INFO, WARN, ERROR, ...).
- `--since` / `--until` accept ISO 8601 timestamps **or relative times such as `2h` or `30m`**.

Output is human readable text.
EOF
cat > docs/configuration.md <<'EOF'
# Configuration

logslice reads `logslice.config.json` from the current directory.

| Key | Meaning | Default |
| --- | --- | --- |
| `timezone` | IANA zone used when printing timestamps | `UTC` |

The environment variable `LOGSLICE_TZ` overrides `timezone`.
EOF
ci l "2026-09-03T10:00:00+0000" "docs: usage and configuration pages"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.3.0 - 2026-09-03
- Timezone setting (`timezone`, `LOGSLICE_TZ`).
- `--since` / `--until` time filters.

## 1.0.0 - 2026-09-01
- First release: `--level` filter.
EOF
ci p "2026-09-03T12:00:00+0000" "changelog for 1.3.0"

cat >> README.md <<'EOF'

## Install

    npm install -g .
EOF
ci p "2026-09-04T09:00:00+0000" "docs: install instructions in README"
cat >> test/cli.test.js <<'EOF'
test('cli --since drops earlier lines', () => {
  const out = execFileSync('node', [bin, sample, '--since', '2026-09-01T10:03:00Z'], { encoding: 'utf8' });
  assert.ok(!/payment failed/.test(out));
});
EOF
ci l "2026-09-05T16:40:00+0000" "test: cover --since in the cli test"
sub docs/configuration.md "| Key | Meaning | Default |" "| Key | Meaning | Default |"
printf '\nConfig file lookup is relative to the working directory.\n' >> docs/configuration.md
ci t "2026-09-07T08:45:00+0000" "docs: say where the config file is looked up"

# big files: stream instead of reading everything
cat > src/cli.js <<'EOF'
'use strict';
const fs = require('fs');
const readline = require('readline');
const { loadConfig } = require('./config');
const { parseLine, matches } = require('./filter');
const { formatText } = require('./format');
function parseArgs(argv) {
  const o = { file: null, level: null, since: null, until: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--level') o.level = argv[++i];
    else if (a === '--since') o.since = argv[++i];
    else if (a === '--until') o.until = argv[++i];
    else if (!a.startsWith('--')) o.file = a;
    else throw new Error('Unknown option ' + a);
  }
  if (!o.file) throw new Error('Usage: logslice <file> [--level L] [--since T] [--until T]');
  return o;
}
function main(argv) {
  const o = parseArgs(argv);
  const cfg = loadConfig();
  const rl = readline.createInterface({ input: fs.createReadStream(o.file) });
  rl.on('line', (line) => {
    const e = parseLine(line);
    if (e && matches(e, o)) process.stdout.write(formatText(e, cfg) + '\n');
  });
}
module.exports = { main, parseArgs };
EOF
ci t "2026-09-08T09:00:00+0000" "perf: stream the file line by line (1 GB logs no longer need 1 GB of RAM)"

sub package.json '"version": "1.3.0"' '"version": "1.4.0"'
ci p "2026-09-10T10:00:00+0000" "Release 1.4.0"
git tag -a v1.4.0 -m "logslice 1.4.0"

# --- after v1.4.0 ---
cat >> src/format.js <<'EOF'
function formatJsonArray(entries) { return JSON.stringify(entries); }
module.exports.formatJsonArray = formatJsonArray;
EOF
sub src/cli.js "else if (!a.startsWith('--')) o.file = a;" "else if (a === '--json') o.json = true;
    else if (!a.startsWith('--')) o.file = a;"
sub src/cli.js "const rl = readline" "const all = [];
  const rl = readline"
sub src/cli.js "    if (e && matches(e, o)) process.stdout.write(formatText(e, cfg) + '\\n');
  });" "    if (e && matches(e, o)) {
      if (o.json) all.push(e); else process.stdout.write(formatText(e, cfg) + '\\n');
    }
  });
  rl.on('close', () => { if (o.json) process.stdout.write(require('./format').formatJsonArray(all) + '\\n'); });"
ci t "2026-09-14T11:00:00+0000" "feat: --json output"

GIT_AUTHOR_NAME="Priya Raman" GIT_AUTHOR_EMAIL="priya@logslice.example" GIT_COMMITTER_NAME="Priya Raman" GIT_COMMITTER_EMAIL="priya@logslice.example" \
GIT_AUTHOR_DATE="2026-09-15T08:30:00+0000" GIT_COMMITTER_DATE="2026-09-15T08:30:00+0000" git revert --no-edit HEAD -q >/dev/null 2>&1 || git revert --no-edit HEAD >/dev/null

sub src/format.js "module.exports = { formatText };" "function formatJson(e) { return JSON.stringify(e); }
module.exports = { formatText, formatJson };"
sub src/cli.js "else if (!a.startsWith('--')) o.file = a;" "else if (a === '--json') o.json = true;
    else if (!a.startsWith('--')) o.file = a;"
sub src/cli.js "const { formatText } = require('./format');" "const { formatText, formatJson } = require('./format');"
sub src/cli.js "process.stdout.write(formatText(e, cfg) + '\\n');" "process.stdout.write((o.json ? formatJson(e) : formatText(e, cfg)) + '\\n');"
cat >> test/format.test.js <<'EOF'
test('formatJson emits one compact object', () => {
  const { formatJson } = require('../src/format');
  assert.deepStrictEqual(JSON.parse(formatJson({ ts: 't', level: 'INFO', msg: 'm' })), { ts: 't', level: 'INFO', msg: 'm' });
});
EOF
ci t "2026-09-16T10:00:00+0000" "feat: --json output, take two (one JSON object per line, streams)"

sub src/config.js "env.LOGSLICE_TZ) cfg.timezone = env.LOGSLICE_TZ;" "env.LOGSLICE_TIMEZONE) cfg.timezone = env.LOGSLICE_TIMEZONE;"
sub test/config.test.js "LOGSLICE_TZ overrides the timezone" "LOGSLICE_TIMEZONE overrides the timezone"
sub test/config.test.js "{ LOGSLICE_TZ: 'Europe/Berlin' }" "{ LOGSLICE_TIMEZONE: 'Europe/Berlin' }"
ci l "2026-09-17T15:20:00+0000" "chore: tidy config loading"

sub src/filter.js "e.level !== o.level" "e.level.toLowerCase() !== o.level.toLowerCase()"
cat >> test/filter.test.js <<'EOF'
test('level filter ignores case', () => {
  const e = parseLine('2026-09-01T10:00:00Z ERROR boom');
  assert.ok(matches(e, { level: 'error' }));
});
EOF
ci l "2026-09-18T09:00:00+0000" "fix: --level is now case-insensitive"

cat > src/follow.js <<'EOF'
'use strict';
const fs = require('fs');
function follow(file, onLine) {
  let pos = fs.statSync(file).size;
  fs.watchFile(file, { interval: 500 }, (cur) => {
    if (cur.size <= pos) { pos = cur.size; return; }
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(cur.size - pos);
    fs.readSync(fd, buf, 0, buf.length, pos);
    fs.closeSync(fd);
    pos = cur.size;
    buf.toString('utf8').split('\n').filter(Boolean).forEach(onLine);
  });
}
module.exports = { follow };
EOF
python3 - <<'PY'
import json
c=json.load(open('logslice.config.json')); c['experimental']={'follow':False}
open('logslice.config.json','w').write(json.dumps(c,indent=2)+'\n')
PY
sub src/cli.js "else if (a === '--json') o.json = true;" "else if (a === '--json') o.json = true;
    else if (a === '--follow') o.follow = true;"
sub src/cli.js "  const rl = readline" "  if (o.follow) {
    if (!(cfg.experimental && cfg.experimental.follow)) {
      throw new Error('--follow is experimental. Set \"experimental\": { \"follow\": true } in logslice.config.json to use it.');
    }
    require('./follow').follow(o.file, (line) => {
      const e = parseLine(line);
      if (e && matches(e, o)) process.stdout.write((o.json ? formatJson(e) : formatText(e, cfg)) + '\\n');
    });
    return;
  }
  const rl = readline"
cat > test/follow.test.js <<'EOF'
'use strict';
const test = require('node:test');
test('follow picks up appended lines', { skip: 'flaky on CI: fs.watchFile timing, see issue #23' }, () => {
  // TODO: rewrite with a deterministic clock
});
EOF
ci p "2026-09-21T13:00:00+0000" "feat: tail mode (--follow), experimental"

sub docs/usage.md "Output is human readable text." "Output is human readable text, or one JSON object per line with \`--json\`."
ci t "2026-09-22T10:10:00+0000" "docs: mention --json"
printf '\n## Releasing\n\nTag vX.Y.Z after bumping package.json.\n' >> README.md
ci p "2026-09-22T17:00:00+0000" "docs: release steps"

cat >> sample/app.log <<'EOF'
2026-09-01T10:06:00Z info lowercase level line
EOF
ci l "2026-09-23T09:00:00+0000" "test: add lowercase level to the sample log"

git checkout -q -b feature/regex-engine main
cat > src/regex.js <<'EOF'
'use strict';
// New matching engine, not wired in yet.
function compile(pattern) { return new RegExp(pattern, 'i'); }
module.exports = { compile };
EOF
ci t "2026-09-24T10:00:00+0000" "wip: regex engine for message matching"
cat > test/regex.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { compile } = require('../src/regex');
test('compile is case-insensitive', () => assert.ok(compile('fail').test('FAILED')));
EOF
sub src/cli.js "else if (a === '--json') o.json = true;" "else if (a === '--json') o.json = true;
    else if (a === '--match-regex') o.matchRegex = argv[++i];"
ci t "2026-09-25T10:00:00+0000" "feat: --match-regex (work in progress, not reviewed)"
git checkout -q main
