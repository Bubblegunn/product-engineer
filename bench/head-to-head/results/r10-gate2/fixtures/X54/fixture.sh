#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"

N=0
commit() {
  N=$((N + 1))
  local d
  d=$(printf '2025-07-%02dT%02d:00:00Z' $((1 + N / 6)) $((8 + N % 6 * 2)))
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}

mkdir -p src/format src/util test docs

cat > package.json <<'EOF'
{
  "name": "contactcard",
  "version": "0.7.0",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# contactcard

Turns raw contact records into tidy text cards.

    const { renderCard } = require('./src/card');
    renderCard({ name: 'ada LOVELACE', city: 'london', country: 'gb', email: 'Ada@Example.com' });
EOF

cat > src/format/name.js <<'EOF'
function cap(w) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function formatName(v) {
  if (v == null) return 'Unknown';
  const s = String(v).trim().replace(/\s+/g, ' ');
  if (s === '') return 'Unknown';
  return s.split(' ').map(cap).join(' ');
}

module.exports = { formatName };
EOF
cat > test/name.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatName } = require('../src/format/name');

test('formatName tidies spacing and case', () => {
  assert.strictEqual(formatName('  john   SMITH '), 'John Smith');
});

test('formatName null', () => {
  assert.strictEqual(formatName(null), 'Unknown');
});
EOF
commit "feat(format): name formatter"

cat > src/format/city.js <<'EOF'
function cap(w) {
  return w
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('-');
}

function formatCity(v) {
  if (v == null) return '';
  const s = String(v).trim().replace(/\s+/g, ' ');
  return s.split(' ').map(cap).join(' ');
}

module.exports = { formatCity };
EOF
cat > test/city.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatCity } = require('../src/format/city');

test('formatCity tidies spacing and case', () => {
  assert.strictEqual(formatCity('new  york'), 'New York');
});

test('formatCity null', () => {
  assert.strictEqual(formatCity(null), '');
});
EOF
commit "feat(format): city formatter"

cat > src/format/country.js <<'EOF'
function formatCountry(v) {
  if (v == null) return '';
  const s = String(v).trim().replace(/\s+/g, ' ');
  if (s.length === 2) return s.toUpperCase();
  return s
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

module.exports = { formatCountry };
EOF
cat > test/country.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatCountry } = require('../src/format/country');

test('two letter codes are upper case', () => {
  assert.strictEqual(formatCountry('us'), 'US');
});

test('names are title case', () => {
  assert.strictEqual(formatCountry('germany'), 'Germany');
});
EOF
commit "feat(format): country formatter"

cat > src/format/email.js <<'EOF'
function formatEmail(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  return s === '' ? null : s;
}

module.exports = { formatEmail };
EOF
cat > src/format/phone.js <<'EOF'
function formatPhone(v) {
  if (v == null) return '';
  const digits = String(v).replace(/\D/g, '');
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  return digits;
}

module.exports = { formatPhone };
EOF
cat > test/email.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatEmail } = require('../src/format/email');

test('formatEmail lower-cases and trims', () => {
  assert.strictEqual(formatEmail('  Ada@Example.COM '), 'ada@example.com');
});
EOF
cat > test/phone.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatPhone } = require('../src/format/phone');

test('formatPhone ten digits', () => {
  assert.strictEqual(formatPhone('555 123 4567'), '(555) 123-4567');
});

test('formatPhone undefined', () => {
  assert.strictEqual(formatPhone(undefined), '');
});
EOF
commit "feat(format): email and phone formatters"

cat > src/format/index.js <<'EOF'
module.exports = {
  ...require('./name'),
  ...require('./city'),
  ...require('./country'),
  ...require('./email'),
  ...require('./phone'),
};
EOF
cat > src/card.js <<'EOF'
const { formatName, formatCity, formatCountry, formatEmail, formatPhone } = require('./format');

function renderCard(c) {
  const place = [formatCity(c.city), formatCountry(c.country)].filter(Boolean).join(', ');
  const lines = [formatName(c.name)];
  if (place) lines.push(place);
  lines.push(formatEmail(c.email) ?? '-');
  const phone = formatPhone(c.phone);
  if (phone) lines.push(phone);
  return lines.join('\n');
}

module.exports = { renderCard };
EOF
cat > test/card.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { renderCard } = require('../src/card');

test('renderCard full record', () => {
  const out = renderCard({ name: 'ada LOVELACE', city: 'london', country: 'gb', email: 'Ada@Example.com' });
  assert.strictEqual(out, 'Ada Lovelace\nLondon, GB\nada@example.com');
});

test('renderCard sparse record', () => {
  assert.strictEqual(renderCard({}), 'Unknown\n-');
});
EOF
commit "feat: render contact cards"

mkdir -p docs
cat > docs/TODO.md <<'EOF'
# TODO

- [ ] export cards as vCard
- [ ] handle titles (Dr., Prof.)
EOF
commit "docs: todo list"

while IFS='|' read -r name body pair; do
  cat > "src/util/$name.js" <<EOF
$body
module.exports = { $name };
EOF
  cat > "test/util-$name.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { $name } = require('../src/util/$name');

test('$name', () => {
  assert.strictEqual($pair);
});
EOF
  commit "feat(util): add $name"
done <<'EOF'
initials|function initials(s) { return s.split(' ').map((w) => w[0]).join(''); }|initials('Ada Lovelace'), 'AL'
truncate|function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '~' : s; }|truncate('abcdef', 4), 'abc~'
isBlank|function isBlank(s) { return s == null || String(s).trim() === ''; }|isBlank('  '), true
EOF

printf 'node_modules/\n' > .gitignore
commit "chore: add .gitignore"

# Owner's uncommitted work in progress (must not be swept into the refactor commit)
printf -- '- [ ] ask Priya about the vCard spec\n' >> docs/TODO.md
printf 'draft: vcard header lines BEGIN:VCARD / VERSION:3.0\n' > notes-draft.md
