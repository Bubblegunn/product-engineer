#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Lena Fischer"; git config user.email "lena@example.com"
N=0
cm() {
  N=$((N+1))
  local d; d=$(printf "2025-09-%02dT11:%02d:00Z" $((1+N/2)) $((N%60)))
  case "$1" in
    1) export GIT_AUTHOR_NAME="Lena Fischer" GIT_AUTHOR_EMAIL="lena@example.com";;
    2) export GIT_AUTHOR_NAME="Omar Haddad" GIT_AUTHOR_EMAIL="omar@example.com";;
    3) export GIT_AUTHOR_NAME="Chloe Park" GIT_AUTHOR_EMAIL="chloe@example.com";;
  esac
  export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
  export GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d"
  git add -A; git commit -q -m "$2"
}
mkdir -p src/routes src/data public test docs
printf 'node_modules/\n.env\n' > .gitignore
cat > package.json <<'X'
{
  "name": "bookshelf-api",
  "version": "1.8.0",
  "private": true,
  "scripts": { "start": "node src/server.js", "test": "node --test" }
}
X
cm 1 "chore: package.json"
cat > src/config.js <<'X'
'use strict';

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DEFAULT_PAGE_SIZE: Number(process.env.PAGE_SIZE || 20),
  MAX_PAGE_SIZE: 100,
  MAX_TAGS: 20,
};
X
cm 1 "feat: config"
cat > src/data/seed.js <<'X'
'use strict';

const authors = [];
for (let i = 1; i <= 45; i++) authors.push({ id: i, name: `Author ${String(i).padStart(2, '0')}` });

const books = [];
for (let i = 1; i <= 130; i++) {
  books.push({
    id: i,
    title: `Book ${String(i).padStart(3, '0')}`,
    authorId: ((i - 1) % 45) + 1,
  });
}

module.exports = { authors, books };
X
cm 1 "chore: seed data"
cat > src/pagination.js <<'X'
'use strict';
const cfg = require('./config');

function paginate(items, query = {}, defaultSize = cfg.DEFAULT_PAGE_SIZE) {
  const limit = Math.min(Number(query.limit) || defaultSize, cfg.MAX_PAGE_SIZE);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? offset + limit : null;
  return { items: slice, total: items.length, limit, offset, nextOffset: next };
}

module.exports = { paginate };
X
cm 1 "feat: pagination helper"
cat > src/routes/books.js <<'X'
'use strict';
const { books } = require('../data/seed');
const { paginate } = require('../pagination');

function list(query = {}) {
  return paginate(books, query);
}

module.exports = { list };
X
cm 2 "feat: books route"
cat > src/routes/authors.js <<'X'
'use strict';
const { authors } = require('../data/seed');
const cfg = require('../config');

function list(query = {}) {
  const limit = Math.min(Number(query.limit) || 20, cfg.MAX_PAGE_SIZE);
  const offset = Number(query.offset) || 0;
  const items = authors.slice(offset, offset + limit);
  return {
    items,
    total: authors.length,
    limit,
    offset,
    nextOffset: offset + limit < authors.length ? offset + limit : null,
  };
}

module.exports = { list };
X
cm 2 "feat: authors route"
cat > src/search.js <<'X'
'use strict';
const { books } = require('./data/seed');

function search(q, { page = 1, perPage = 20 } = {}) {
  const needle = String(q || '').toLowerCase();
  const hits = books.filter((b) => b.title.toLowerCase().includes(needle));
  const start = (page - 1) * perPage;
  return { hits: hits.slice(start, start + perPage), total: hits.length, page, per_page: perPage };
}

module.exports = { search };
X
cm 3 "feat: title search"
cat > src/tags.js <<'X'
'use strict';
const cfg = require('./config');

function validateTags(tags) {
  if (tags.length > cfg.MAX_TAGS) throw new Error(`at most ${cfg.MAX_TAGS} tags`);
  return tags.map((t) => t.trim().toLowerCase());
}

module.exports = { validateTags };
X
cm 3 "feat: tag validation"
cat > src/server.js <<'X'
'use strict';
const http = require('node:http');
const { URL } = require('node:url');
const cfg = require('./config');
const books = require('./routes/books');
const authors = require('./routes/authors');
const { search } = require('./search');

http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    const q = Object.fromEntries(u.searchParams);
    let body;
    if (u.pathname === '/books') body = books.list(q);
    else if (u.pathname === '/authors') body = authors.list(q);
    else if (u.pathname === '/search') body = search(q.q, { page: Number(q.page) || 1 });
    else {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  })
  .listen(cfg.PORT);
X
cm 2 "feat: http server"
cat > public/paging.js <<'X'
'use strict';
// A full page means there may be more. Used by the "Load more" button.
function hasMore(items) {
  return items.length === 20;
}

if (typeof module !== 'undefined') module.exports = { hasMore };
X
cm 1 "feat: load more helper"
cat > public/app.js <<'X'
'use strict';
const DEBOUNCE_MS = 20;
const state = { items: [], hasMore: false };

async function loadMore() {
  const r = await fetch(`/books?offset=${state.items.length}`);
  const j = await r.json();
  state.items.push(...j.items);
  state.hasMore = hasMore(j.items);
}

let timer;
function onInput(fn) {
  clearTimeout(timer);
  timer = setTimeout(fn, DEBOUNCE_MS);
}
X
cm 1 "feat: browser list"
cat > openapi.yaml <<'X'
openapi: 3.0.3
info:
  title: bookshelf-api
  version: 1.8.0
paths:
  /books:
    get:
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
  /authors:
    get:
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
  /search:
    get:
      parameters:
        - name: q
          in: query
          schema: { type: string }
        - name: per_page
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
components:
  schemas:
    Book:
      type: object
      properties:
        tags:
          type: array
          maxItems: 20
          items: { type: string }
X
cm 3 "docs: openapi description"
cat > .env.example <<'X'
PORT=3000
PAGE_SIZE=20
X
cm 2 "chore: env example"
cat > docker-compose.yml <<'X'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      PORT: "3000"
      PAGE_SIZE: "20"
X
cm 2 "chore: compose for local runs"
cat > test/books.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const books = require('../src/routes/books');

test('default page has 20 books', () => {
  const r = books.list({});
  assert.strictEqual(r.items.length, 20);
  assert.strictEqual(r.nextOffset, 20);
});

test('explicit limit wins and is capped', () => {
  assert.strictEqual(books.list({ limit: '5' }).items.length, 5);
  assert.strictEqual(books.list({ limit: '500' }).limit, 100);
});

test('last page has no next offset', () => {
  assert.strictEqual(books.list({ offset: '120' }).nextOffset, null);
});
X
cm 1 "test: books"
cat > test/authors.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const authors = require('../src/routes/authors');

test('default page has 20 authors', () => {
  const r = authors.list({});
  assert.strictEqual(r.items.length, 20);
  assert.strictEqual(r.total, 45);
});

test('second page continues', () => {
  const r = authors.list({ offset: '20' });
  assert.strictEqual(r.items[0].id, 21);
});
X
cm 2 "test: authors"
cat > test/search.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { search } = require('../src/search');

test('default per page is 20', () => {
  const r = search('book');
  assert.strictEqual(r.hits.length, 20);
  assert.strictEqual(r.per_page, 20);
});

test('narrow query', () => {
  assert.strictEqual(search('Book 007').total, 1);
});
X
cm 3 "test: search"
cat > test/config.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const cfg = require('../src/config');

test('page size defaults', () => {
  assert.strictEqual(cfg.DEFAULT_PAGE_SIZE, 20);
  assert.strictEqual(cfg.MAX_PAGE_SIZE, 100);
});

test('tag limit', () => {
  assert.strictEqual(cfg.MAX_TAGS, 20);
});
X
cm 1 "test: config"
cat > test/pagination.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { paginate } = require('../src/pagination');

const items = Array.from({ length: 45 }, (_, i) => i);

test('uses the default size', () => {
  const r = paginate(items);
  assert.strictEqual(r.items.length, 20);
  assert.strictEqual(r.nextOffset, 20);
});

test('custom default size', () => {
  assert.strictEqual(paginate(items, {}, 7).items.length, 7);
});

test('offset beyond the end is empty', () => {
  assert.strictEqual(paginate(items, { offset: '99' }).items.length, 0);
});
X
cm 2 "test: pagination"
cat > test/paging.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { hasMore } = require('../public/paging');

test('full page means more', () => {
  assert.strictEqual(hasMore(new Array(20).fill(0)), true);
});

test('short page means done', () => {
  assert.strictEqual(hasMore(new Array(7).fill(0)), false);
});
X
cm 1 "test: load more helper"
cat > test/tags.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateTags } = require('../src/tags');

test('normalises tags', () => {
  assert.deepStrictEqual(validateTags([' Sci-Fi ', 'Horror']), ['sci-fi', 'horror']);
});

test('rejects more than 20 tags', () => {
  assert.throws(() => validateTags(new Array(21).fill('x')), /at most 20 tags/);
});
X
cm 3 "test: tag validation"
cat > README.md <<'X'
# bookshelf-api

Small read-only API for a book catalogue.

## Endpoints

- `GET /books?limit&offset` - 20 books per page by default, at most 100.
- `GET /authors?limit&offset` - same paging rules.
- `GET /search?q=&page=` - title search, 20 hits per page.

## Run

    npm start

Set `PAGE_SIZE` to change the default page size.

## Test

    npm test
X
cm 1 "docs: README"
cat > docs/api.md <<'X'
# API notes

Paged endpoints return `items`, `total`, `limit`, `offset` and `nextOffset`
(null on the last page).

The default page size is 20 and the maximum is 100. A client that wants more
than 20 rows per request should pass `limit` explicitly.

Tags: a book can have at most 20 tags.
X
cm 3 "docs: API notes"
cat > CHANGELOG.md <<'X'
# Changelog

## 1.8.0
- Add title search.

## 1.7.0
- Add tag validation with a limit of 20 tags.

## 1.6.0
- Add `nextOffset` to paged responses.
X
cm 1 "docs: changelog"
printf '\nSee docs/api.md for response shapes.\n' >> README.md
cm 2 "docs: link API notes"
printf '\n- Fix: authors route ignores negative offsets.\n' >> CHANGELOG.md
cm 2 "docs: changelog note"
printf '\n## Browser\n\n`public/app.js` shows a Load more button while the last page was full.\n' >> docs/api.md
cm 1 "docs: browser behaviour"
printf '\nCopy `.env.example` to `.env` for local runs.\n' >> README.md
cm 3 "docs: env example hint"
