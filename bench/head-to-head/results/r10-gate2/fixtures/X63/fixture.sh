#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Priya Raman"
git config user.email "priya@linkwire.test"
N=0
c() { # who(a|b) message
  N=$((N+1)); local d=$((1767225600 + N*129600)) nm em
  if [ "$1" = a ]; then nm="Priya Raman"; em="priya@linkwire.test"; else nm="Tomas Berg"; em="tomas@linkwire.test"; fi
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" \
  GIT_AUTHOR_DATE="@$d +0000" GIT_COMMITTER_DATE="@$d +0000" git commit -q -m "$2"
}
fl() {
  local m="$2"
  case "$m" in
    docs*) echo "- $m" >> docs/notes.md ;;
    test*) printf "const t = require('node:test');\nconst a = require('node:assert');\nt('%s', () => a.ok(true));\n" "case $((N+1))" > "test/extra$((N+1)).test.js" ;;
    *) echo "# $m" >> .editorconfig ;;
  esac
  c "$1" "$m"
}
mkdir -p lib test docs

cat > package.json <<'EOF'
{
  "name": "linkwire",
  "version": "1.8.0",
  "description": "Tiny HTTP client wrapper",
  "main": "lib/index.js",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
printf 'node_modules\n' > .gitignore
printf 'root = true\n' > .editorconfig
printf '# Notes\n\n' > docs/notes.md
cat > README.md <<'EOF'
# linkwire

```js
const { Client } = require('linkwire');
const client = new Client({ timeout: 5000 });
client.connect('https://api.example.test');
const items = await client.fetchAll('/things');
```

Deep helpers can be imported with `require('linkwire/lib/util')`.
EOF
c a "chore: project skeleton"
cat > lib/config.js <<'EOF'
'use strict';
module.exports = { TIMEOUT: 30000, USER_AGENT: 'linkwire/1' };
EOF
cat > lib/errors.js <<'EOF'
'use strict';
class LinkError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'LinkError';
    this.status = status;
  }
}
module.exports = { LinkError };
EOF
cat > lib/util.js <<'EOF'
'use strict';
function joinUrl(base, p) {
  return base.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, '');
}
module.exports = { joinUrl };
EOF
c a "feat: config, errors, util"
cat > lib/client.js <<'EOF'
'use strict';
const { TIMEOUT } = require('./config');
const { LinkError } = require('./errors');
const { joinUrl } = require('./util');

async function defaultTransport() {
  throw new Error('no network in this build');
}

class Client {
  constructor(opts = {}) {
    this.timeout = opts.timeout ?? TIMEOUT;
    this.onError = opts.onError || null;
    this.transport = opts.transport || defaultTransport;
    this.baseUrl = null;
  }
  connect(url) {
    this.baseUrl = url;
    return this;
  }
  async request(path) {
    if (!this.baseUrl) throw new LinkError('not connected', 0);
    const r = await this.transport(joinUrl(this.baseUrl, path), { timeout: this.timeout });
    if (r.status >= 400) {
      const e = new LinkError('http ' + r.status, r.status);
      if (this.onError) this.onError(e);
      throw e;
    }
    return r.body;
  }
  async fetchAll(path) {
    let out = [];
    let p = path;
    while (p) {
      const b = await this.request(p);
      out = out.concat(b.items);
      p = b.next;
    }
    return out;
  }
}
module.exports = { Client };
EOF
cat > lib/index.js <<'EOF'
'use strict';
const { Client } = require('./client');
const { LinkError } = require('./errors');
module.exports = { Client, LinkError };
EOF
cat > test/client.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { Client, LinkError } = require('../lib');

const pages = {
  'https://h.test/a': { status: 200, body: { items: [1, 2], next: '/b' } },
  'https://h.test/b': { status: 200, body: { items: [3], next: null } },
  'https://h.test/bad': { status: 404, body: {} },
};
const transport = async (url) => pages[url];

test('fetchAll follows next links', async () => {
  const c = new Client({ transport });
  c.connect('https://h.test');
  assert.deepEqual(await c.fetchAll('/a'), [1, 2, 3]);
});

test('errors carry status', async () => {
  const c = new Client({ transport });
  c.connect('https://h.test');
  await assert.rejects(() => c.request('/bad'), (e) => e instanceof LinkError && e.status === 404);
});

test('default timeout', () => {
  assert.equal(new Client().timeout, 30000);
});
EOF
c a "feat: client with connect, request, fetchAll"
fl b "docs: fill notes"
cat > docs/api.md <<'EOF'
# API

## `new Client(options)`
See options.md.

## `client.connect(url)`
Sets the base URL. Returns the client.

## `client.request(path)`
Resolves with the response body, rejects with `LinkError` (property `status`).

## `client.fetchAll(path)`
Follows `next` links and resolves with every item.
EOF
cat > docs/options.md <<'EOF'
# Options

| Option | Default | Meaning |
| --- | --- | --- |
| `timeout` | 30000 | request timeout in ms |
| `onError` | none | called with the `LinkError` for HTTP errors |
| `transport` | built in | function `(url, opts) => { status, body }` |
EOF
c a "docs: api and options"
fl b "chore: editorconfig"
fl b "test: extra join case"
fl a "docs: notes for 1.9"
sed -i.bak 's/"version": "1.8.0"/"version": "1.9.0"/' package.json && rm package.json.bak
c a "chore: release 1.9.0"
git tag v1.9.0

# ---- after 1.9.0 ----
# A: open() added, connect deprecated
python3 - <<'PY'
import re
p='lib/client.js'
s=open(p).read()
s=s.replace("""  connect(url) {
    this.baseUrl = url;
    return this;
  }""","""  open(url) {
    this.baseUrl = url;
    return this;
  }
  connect(url) {
    process.emitWarning('connect() is deprecated, use open()');
    return this.open(url);
  }""")
open(p,'w').write(s)
for p in ['docs/api.md']:
    s=open(p).read()
    s=s.replace("## `client.connect(url)`\nSets the base URL. Returns the client.","## `client.open(url)`\nSets the base URL. Returns the client. `connect(url)` still works but is deprecated.")
    open(p,'w').write(s)
p='README.md'
s=open(p).read().replace("client.connect(","client.open(")
open(p,'w').write(s)
PY
sed -i.bak 's/c.connect(/c.open(/' test/client.test.js && rm test/client.test.js.bak
c a "feat: add open() and deprecate connect()"
fl b "docs: tidy api headings"
# B: fetchAll removed under a vague title
python3 - <<'PY'
p='lib/client.js'
s=open(p).read()
i=s.index("  async fetchAll(path) {")
j=s.index("module.exports")
s=s[:i].rstrip()+"\n}\n"+s[j:]
open(p,'w').write(s)
p='test/client.test.js'
s=open(p).read()
i=s.index("test('fetchAll")
j=s.index("test('errors")
s=s[:i]+s[j:]
open(p,'w').write(s)
PY
c b "chore: drop unused helpers"
# C: paginate
python3 - <<'PY'
p='lib/client.js'
s=open(p).read()
s=s.replace("""    return r.body;
  }
}""","""    return r.body;
  }
  async *paginate(path) {
    let p = path;
    while (p) {
      const b = await this.request(p);
      yield* b.items;
      p = b.next;
    }
  }
}""")
open(p,'w').write(s)
p='test/client.test.js'
s=open(p).read()
s+="""
test('paginate yields every item', async () => {
  const c = new Client({ transport });
  c.open('https://h.test');
  const got = [];
  for await (const x of c.paginate('/a')) got.push(x);
  assert.deepEqual(got, [1, 2, 3]);
});
"""
open(p,'w').write(s)
PY
c a "feat: paginate() async iterator"
fl b "test: extra paginate case"
# D: default timeout changed under refactor title
sed -i.bak 's/TIMEOUT: 30000/TIMEOUT: 10000/' lib/config.js && rm lib/config.js.bak
sed -i.bak 's/30000/10000/' test/client.test.js && rm test/client.test.js.bak
c b "refactor: constants"
fl a "docs: notes on timeouts"
# E: retry feature, reverted
python3 - <<'PY'
p='lib/client.js'
s=open(p).read()
s=s.replace("    this.baseUrl = null;\n  }","    this.retry = opts.retry || 0;\n    this.baseUrl = null;\n  }",1)
open(p,'w').write(s)
PY
c b "feat: automatic retry"
RETRY=$(git rev-parse HEAD)
fl a "docs: notes on retry"
git revert --no-commit "$RETRY"
c b 'Revert "feat: automatic retry"'
printf '| `retry` | 0 | number of automatic retries on network errors |\n' >> docs/options.md
c b "docs: document retry option"
fl a "chore: lint config"
# G: restructure
git mv lib src
sed -i.bak "s#'../lib'#'../src'#" test/client.test.js && rm test/client.test.js.bak
python3 - <<'PY'
import json
p=json.load(open('package.json'))
p['main']='src/index.js'
p['exports']={'.':'./src/index.js'}
json.dump(p,open('package.json','w'),indent=2); open('package.json','a').write('\n')
PY
c a "chore: restructure"
fl b "docs: notes after restructure"
sed -i.bak 's/"version": "1.9.0"/"version": "2.0.0-rc.1"/' package.json && rm package.json.bak
c a "chore: 2.0.0-rc.1"
git tag v2.0.0-rc.1
fl b "test: extra url case"
# H: final naming under a vague title
python3 - <<'PY'
p='src/client.js'
s=open(p).read()
i=s.index("  open(url) {")
j=s.index("  async request")
s=s[:i]+"  dial(url) {\n    this.baseUrl = url;\n    return this;\n  }\n"+s[j:]
open(p,'w').write(s)
PY
sed -i.bak 's/c.open(/c.dial(/' test/client.test.js && rm test/client.test.js.bak
c b "refactor: unify naming"
fl a "docs: notes on naming"
# F: status -> statusCode
sed -i.bak 's/this.status = status;/this.statusCode = status;/' src/errors.js && rm src/errors.js.bak
sed -i.bak 's/e.status === 404/e.statusCode === 404/; s/errors carry status/errors carry statusCode/' test/client.test.js && rm test/client.test.js.bak
c a "fix: consistent error naming"
fl b "chore: formatting"
fl a "test: extra timeout case"
fl b "docs: changelog stub"

# unmerged branch
git branch next/http2 "$(git rev-parse HEAD~8)"
git checkout -q next/http2
echo "// http2 experiment: opts.http2 selects the h2 transport" >> src/client.js
c b "feat: http2 transport option"
printf '| `http2` | false | use HTTP/2 (experimental) |\n' >> docs/options.md
c b "docs: http2 option"
git checkout -q main
