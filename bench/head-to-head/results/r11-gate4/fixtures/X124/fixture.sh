#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Dana Whitfield"; git config user.email "dana@pingly.example"
git config commit.gpgsign false
ci() {
  local n e
  case "$1" in
    d) n="Dana Whitfield"; e="dana@pingly.example";;
    t) n="Tomas Herrera"; e="tomas@pingly.example";;
    a) n="Aiko Mori"; e="aiko@pingly.example";;
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
mkdir -p src/channels src/templates test docs scripts

cat > package.json <<'EOF'
{
  "name": "pingly-notify",
  "version": "2.2.0",
  "description": "Notification worker: queues, de-duplicates and sends reminder and receipt messages",
  "scripts": { "test": "node --test" },
  "engines": { "node": ">=18" },
  "private": true
}
EOF
cat > README.md <<'EOF'
# pingly-notify

Worker that sends reminder and receipt notifications by email and SMS.

    node src/server.js     # health endpoint on :3000, worker loop
    npm test

Settings are read from the environment, see `.env.example` and docs/runbook.md.
EOF
printf 'node_modules/\n.env\n' > .gitignore
printf 'Copyright (c) 2026 Pingly. All rights reserved.\n' > LICENSE
ci d "2026-08-03T09:00:00+0000" "init"

cat > src/config.js <<'EOF'
'use strict';
function load(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    retries: Number(env.SEND_RETRIES ?? 1),
    sendTimeoutMs: Number(env.SEND_TIMEOUT_MS ?? 5000),
    visibilityTimeoutMs: Number(env.QUEUE_VISIBILITY_MS ?? 30000),
    dedupeWindowSeconds: Number(env.DEDUPE_WINDOW_SECONDS ?? 300),
  };
}
module.exports = { load };
EOF
cat > .env.example <<'EOF'
PORT=3000
SEND_RETRIES=1
SEND_TIMEOUT_MS=5000
QUEUE_VISIBILITY_MS=30000
DEDUPE_WINDOW_SECONDS=300
EMAIL_API_KEY=changeme-local
EOF
ci d "2026-08-04T10:00:00+0000" "config from environment"

cat > src/dedupe.js <<'EOF'
'use strict';
// In-memory store: a restart forgets everything it has seen.
function createDedupe({ windowSeconds, now = () => Date.now() }) {
  const seen = new Map();
  return {
    isDuplicate(key) {
      if (windowSeconds <= 0) return false;
      const t = seen.get(key);
      return t !== undefined && now() - t < windowSeconds * 1000;
    },
    mark(key) { seen.set(key, now()); },
  };
}
module.exports = { createDedupe };
EOF
cat > test/dedupe.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createDedupe } = require('../src/dedupe');
test('second sighting inside the window is a duplicate', () => {
  let t = 0;
  const d = createDedupe({ windowSeconds: 300, now: () => t });
  d.mark('m1');
  t = 10000;
  assert.ok(d.isDuplicate('m1'));
});
test('outside the window it is not a duplicate', () => {
  let t = 0;
  const d = createDedupe({ windowSeconds: 300, now: () => t });
  d.mark('m1');
  t = 301000;
  assert.ok(!d.isDuplicate('m1'));
});
test('window of 0 disables de-duplication', () => {
  const d = createDedupe({ windowSeconds: 0 });
  d.mark('m1');
  assert.ok(!d.isDuplicate('m1'));
});
test('dedupe survives restart', { skip: 'store is in memory; persistence planned, see issue #41' }, () => {});
EOF
ci t "2026-08-05T11:00:00+0000" "dedupe: in-memory window store"

cat > src/channels/email.js <<'EOF'
'use strict';
// Stub transport: the real provider client is injected in production.
async function send(msg, transport) { return transport.deliver({ to: msg.to, subject: msg.subject, body: msg.body }); }
module.exports = { send };
EOF
cat > src/channels/sms.js <<'EOF'
'use strict';
async function send(msg, transport) { return transport.deliver({ to: msg.phone, body: msg.body }); }
module.exports = { send };
EOF
cat > src/templates/reminder.js <<'EOF'
'use strict';
module.exports = (d) => ({ subject: 'Reminder: ' + d.title, body: 'Hi ' + d.name + ', this is a reminder about ' + d.title + '.' });
EOF
cat > src/templates/receipt.js <<'EOF'
'use strict';
module.exports = (d) => ({ subject: 'Receipt ' + d.number, body: 'Thanks ' + d.name + ', receipt ' + d.number + ' attached.' });
EOF
ci a "2026-08-07T09:30:00+0000" "channels and templates"

cat > src/queue.js <<'EOF'
'use strict';
function createQueue({ visibilityTimeoutMs, now = () => Date.now() }) {
  const jobs = [];
  return {
    push(job) { jobs.push({ job, takenAt: null, done: false }); },
    take() {
      const t = now();
      const e = jobs.find((j) => !j.done && (j.takenAt === null || t - j.takenAt > visibilityTimeoutMs));
      if (!e) return null;
      e.takenAt = t;
      return e.job;
    },
    ack(job) { const e = jobs.find((j) => j.job === job); if (e) e.done = true; },
    size() { return jobs.filter((j) => !j.done).length; },
  };
}
module.exports = { createQueue };
EOF
cat > test/queue.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createQueue } = require('../src/queue');
test('a taken job is redelivered after the visibility timeout', () => {
  let t = 0;
  const q = createQueue({ visibilityTimeoutMs: 1000, now: () => t });
  q.push({ id: 'm1' });
  const a = q.take();
  assert.strictEqual(q.take(), null);
  t = 1500;
  assert.strictEqual(q.take(), a);
});
test('acked jobs are gone', () => {
  const q = createQueue({ visibilityTimeoutMs: 1000 });
  q.push({ id: 'm1' });
  q.ack(q.take());
  assert.strictEqual(q.size(), 0);
});
EOF
ci t "2026-08-10T10:00:00+0000" "queue with visibility timeout (at-least-once)"

cat > src/sender.js <<'EOF'
'use strict';
const email = require('./channels/email');
const sms = require('./channels/sms');
const templates = { reminder: require('./templates/reminder'), receipt: require('./templates/receipt') };
function createSender({ cfg, dedupe, transports }) {
  async function process(job) {
    const key = job.id + ':' + job.channel;
    if (dedupe.isDuplicate(key)) return 'duplicate';
    const rendered = templates[job.template](job.data);
    const msg = Object.assign({ to: job.to, phone: job.phone }, rendered);
    let lastErr;
    for (let attempt = 0; attempt <= cfg.retries; attempt++) {
      try {
        await (job.channel === 'sms' ? sms : email).send(msg, transports[job.channel]);
        dedupe.mark(key);
        return 'sent';
      } catch (err) { lastErr = err; }
    }
    throw lastErr;
  }
  return { process };
}
module.exports = { createSender };
EOF
cat > test/sender.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createSender } = require('../src/sender');
const { createDedupe } = require('../src/dedupe');
function setup(retries, failFirst) {
  let calls = 0;
  const transports = { email: { deliver: async () => { calls++; if (calls <= failFirst) throw new Error('timeout'); } } };
  const sender = createSender({ cfg: { retries }, dedupe: createDedupe({ windowSeconds: 300 }), transports });
  return { sender, calls: () => calls };
}
const job = { id: 'm1', channel: 'email', template: 'reminder', to: 'a@example.com', data: { name: 'A', title: 'Dentist' } };
test('sends once and then reports a duplicate', async () => {
  const { sender, calls } = setup(1, 0);
  assert.strictEqual(await sender.process(job), 'sent');
  assert.strictEqual(await sender.process(job), 'duplicate');
  assert.strictEqual(calls(), 1);
});
test('retries after a failure', async () => {
  const { sender, calls } = setup(1, 1);
  assert.strictEqual(await sender.process(job), 'sent');
  assert.strictEqual(calls(), 2);
});
EOF
ci d "2026-08-12T14:00:00+0000" "sender: render, send with retries, de-duplicate"

cat > src/server.js <<'EOF'
'use strict';
const http = require('http');
const cfg = require('./config').load();
const { createQueue } = require('./queue');
const { createDedupe } = require('./dedupe');
const { createSender } = require('./sender');
const queue = createQueue({ visibilityTimeoutMs: cfg.visibilityTimeoutMs });
const dedupe = createDedupe({ windowSeconds: cfg.dedupeWindowSeconds });
const transports = { email: { deliver: async (m) => console.log('email ->', m.to) }, sms: { deliver: async (m) => console.log('sms ->', m.to) } };
const sender = createSender({ cfg, dedupe, transports });
async function tick() {
  const job = queue.take();
  if (!job) return;
  try { await sender.process(job); queue.ack(job); } catch (err) { console.error('send failed', job.id, err.message); }
}
if (require.main === module) {
  setInterval(tick, 1000);
  http.createServer((req, res) => { res.end(req.url === '/health' ? 'ok' : 'pingly-notify'); }).listen(cfg.port);
}
module.exports = { queue, tick };
EOF
cat > test/server.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { queue, tick } = require('../src/server');
test('tick sends and acks a queued job', async () => {
  queue.push({ id: 'srv1', channel: 'email', template: 'receipt', to: 'a@example.com', data: { name: 'A', number: 'R-1' } });
  await tick();
  assert.strictEqual(queue.size(), 0);
});
EOF
ci t "2026-08-14T09:00:00+0000" "server: worker loop and health endpoint"

cat > docs/architecture.md <<'EOF'
# Architecture

Jobs enter the queue, the worker takes one, the sender renders and delivers it.
The queue is at-least-once: a job that is not acknowledged within the visibility
timeout is handed out again. The sender therefore de-duplicates on
`<job id>:<channel>` inside `DEDUPE_WINDOW_SECONDS`.
EOF
cat > docs/runbook.md <<'EOF'
# Runbook

## Settings
| Variable | Default | Meaning |
| --- | --- | --- |
| SEND_RETRIES | 1 | extra attempts after a failed send |
| SEND_TIMEOUT_MS | 5000 | per-attempt timeout |
| QUEUE_VISIBILITY_MS | 30000 | when an unacked job is redelivered |
| DEDUPE_WINDOW_SECONDS | 300 | duplicate suppression window; the store survives restarts |

## Releasing
Tag `vX.Y.Z` on main; the deploy job ships tagged commits only.
EOF
cat > scripts/release.sh <<'EOF'
#!/bin/sh
# usage: scripts/release.sh 2.3.1
set -e
git tag -a "v$1" -m "release $1"
echo "tagged v$1 - the deploy job picks it up"
EOF
ci a "2026-08-18T10:30:00+0000" "docs: architecture and runbook, release script"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.2.0 - 2026-08-18
- Queue with visibility timeout.
- De-duplication window.
EOF
ci d "2026-08-19T09:00:00+0000" "changelog 2.2.0"
git tag -a v2.2.0 -m "release 2.2.0"

sub README.md 'npm test' 'npm test   # node --test, no dependencies'
ci a "2026-09-02T10:00:00+0000" "README: note on tests"
cat >> test/queue.test.js <<'EOF'
test('size counts only unfinished jobs', () => {
  const q = createQueue({ visibilityTimeoutMs: 1000 });
  q.push({ id: 'a' }); q.push({ id: 'b' });
  q.ack(q.take());
  assert.strictEqual(q.size(), 1);
});
EOF
ci t "2026-09-15T11:00:00+0000" "test: queue size"

printf 'coverage/\n' >> .gitignore
ci a "2026-09-22T09:00:00+0000" "gitignore: coverage output"
sub src/templates/reminder.js "this is a reminder about" "this is a friendly reminder about"
ci t "2026-09-29T13:00:00+0000" "templates: friendlier reminder wording"

# retries: raise, revert, redo
sub src/config.js 'env.SEND_RETRIES ?? 1' 'env.SEND_RETRIES ?? 3'
sub src/config.js 'env.SEND_TIMEOUT_MS ?? 5000' 'env.SEND_TIMEOUT_MS ?? 20000'
ci d "2026-10-08T09:00:00+0000" "feat: retry failed sends up to 3 times, 20s timeout"
sub .env.example 'SEND_RETRIES=1' 'SEND_RETRIES=3'
GIT_AUTHOR_NAME="Aiko Mori" GIT_AUTHOR_EMAIL="aiko@pingly.example" GIT_COMMITTER_NAME="Aiko Mori" GIT_COMMITTER_EMAIL="aiko@pingly.example" \
GIT_AUTHOR_DATE="2026-10-09T08:30:00+0000" GIT_COMMITTER_DATE="2026-10-09T08:30:00+0000" git revert --no-edit HEAD >/dev/null
git checkout -q -- .env.example
sub src/config.js 'env.SEND_RETRIES ?? 1' 'env.SEND_RETRIES ?? 3'
sub src/config.js 'env.SEND_TIMEOUT_MS ?? 5000' 'env.SEND_TIMEOUT_MS ?? 20000'
sub .env.example 'SEND_RETRIES=1' 'SEND_RETRIES=3'
sub .env.example 'SEND_TIMEOUT_MS=5000' 'SEND_TIMEOUT_MS=20000'
sub docs/runbook.md '| SEND_RETRIES | 1 |' '| SEND_RETRIES | 3 |'
sub docs/runbook.md '| SEND_TIMEOUT_MS | 5000 |' '| SEND_TIMEOUT_MS | 20000 |'
ci d "2026-10-12T10:00:00+0000" "Reapply retry change with docs and .env.example updated"

# the misleading chore
sub src/config.js 'Number(env.DEDUPE_WINDOW_SECONDS ?? 300)' 'Number(env.DEDUPE_WINDOW_SECONDS || 0)'
sub .env.example 'DEDUPE_WINDOW_SECONDS=300' '# DEDUPE_WINDOW_SECONDS=300'
ci t "2026-10-14T16:45:00+0000" "chore: tidy config defaults"

sub package.json '"version": "2.2.0"' '"version": "2.3.0"'
cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.3.0 - 2026-10-15
- Failed sends are retried up to 3 times with a 20 second timeout.
- Config defaults tidied.

## 2.2.0 - 2026-08-18
- Queue with visibility timeout.
- De-duplication window.
EOF
ci d "2026-10-15T09:00:00+0000" "Release 2.3.0"
git tag -a v2.3.0 -m "release 2.3.0"

printf '\n## On-call\n\nSupport escalations go to the #notify-oncall channel.\n' >> docs/runbook.md
ci a "2026-10-19T10:00:00+0000" "docs: on-call note"

# the fix: after the tag, not released
sub src/config.js 'Number(env.DEDUPE_WINDOW_SECONDS || 0)' 'Number(env.DEDUPE_WINDOW_SECONDS ?? 300)'
sub .env.example '# DEDUPE_WINDOW_SECONDS=300' 'DEDUPE_WINDOW_SECONDS=300'
cat > test/config.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('../src/config');
test('dedupe window defaults to 300 seconds', () => {
  assert.strictEqual(load({}).dedupeWindowSeconds, 300);
});
test('dedupe window can be set explicitly', () => {
  assert.strictEqual(load({ DEDUPE_WINDOW_SECONDS: '60' }).dedupeWindowSeconds, 60);
});
EOF
ci d "2026-10-22T11:30:00+0000" "fix: restore the 300s default dedupe window"
sub docs/architecture.md 'inside `DEDUPE_WINDOW_SECONDS`.' 'inside `DEDUPE_WINDOW_SECONDS` (default 300).'
ci a "2026-10-22T15:00:00+0000" "docs: mention the default window"
