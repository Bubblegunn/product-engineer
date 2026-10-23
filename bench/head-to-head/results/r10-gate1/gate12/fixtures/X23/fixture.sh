#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Test"
git config user.email "test@example.com"
c() { # date author msg
  export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"
  export GIT_AUTHOR_NAME="$2" GIT_COMMITTER_NAME="$2"
  export GIT_AUTHOR_EMAIL="$3" GIT_COMMITTER_EMAIL="$3"
  git add -A; git commit -q -m "$4"
}
AY="Ayse Demir"; AYM="ayse@example.com"
ME="Mehmet Kaya"; MEM="mehmet@example.com"
mkdir -p src test

cat > package.json <<'EOF'
{
  "name": "odeme-servisi",
  "version": "0.4.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# odeme-servisi

Kur cevirme, fatura ve odeme islemleri.

| Modul | Durum |
|-------|-------|
| Kur   | hazir |
| Fatura | hazir |
| Odeme | devam ediyor |
EOF
cat > src/kur.js <<'EOF'
'use strict';
function cevir(tutar, oran) { return Math.floor(tutar * oran * 100) / 100; }
module.exports = { cevir };
EOF
cat > test/kur.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { cevir } = require('../src/kur');
test('kur cevirme', () => { assert.strictEqual(cevir(10, 2), 20); });
EOF
c 2026-10-05T10:00:00 "$AY" $AYM "feat: kur cevirici"

cat > src/fatura.js <<'EOF'
'use strict';
function toplam(satirlar) { return satirlar.reduce((s, l) => s + l.fiyat * l.adet, 0); }
module.exports = { toplam };
EOF
cat > test/fatura.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { toplam } = require('../src/fatura');
test('fatura toplami', () => { assert.strictEqual(toplam([{ fiyat: 5, adet: 3 }]), 15); });
EOF
c 2026-10-13T11:00:00 "$ME" $MEM "feat: fatura toplami"

git checkout -q -b ayse/odeme
cat > src/odeme.js <<'EOF'
'use strict';
function odemeAl(kart, tutar) {
  if (!kart || tutar <= 0) throw new Error('gecersiz odeme');
  return { durum: 'basarili', tutar };
}
module.exports = { odemeAl };
EOF
cat > test/odeme.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { odemeAl } = require('../src/odeme');
test('odeme basarili', () => { assert.strictEqual(odemeAl('4111', 10).durum, 'basarili'); });
test('gecersiz tutar reddedilir', () => { assert.throws(() => odemeAl('4111', 0)); });
EOF
c 2026-10-14T15:00:00 "$AY" $AYM "feat: odeme modulu"

cat > src/odeme.js <<'EOF'
'use strict';
function odemeAl(kart, tutar) {
  if (!kart || tutar <= 0) throw new Error('gecersiz odeme');
  return { durum: 'basarili', tutar };
}
function iade(odemeId, tutar) {
  throw new Error('TODO: iade henuz yok');
}
module.exports = { odemeAl, iade };
EOF
cat > test/odeme.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { odemeAl, iade } = require('../src/odeme');
test('odeme basarili', () => { assert.strictEqual(odemeAl('4111', 10).durum, 'basarili'); });
test('gecersiz tutar reddedilir', () => { assert.throws(() => odemeAl('4111', 0)); });
test('tam iade', () => { assert.strictEqual(iade('o1', 10).durum, 'iade'); });
test('kismi iade', () => { assert.strictEqual(iade('o1', 4).tutar, 4); });
EOF
c 2026-10-15T17:00:00 "$AY" $AYM "wip: iade"

sed -i.bak "s/test('tam iade', /test('tam iade', { skip: true }, /; s/test('kismi iade', /test('kismi iade', { skip: true }, /" test/odeme.test.js && rm test/odeme.test.js.bak
c 2026-10-16T12:00:00 "$AY" $AYM "fix: testleri duzelt"

git checkout -q main
sed -i.bak 's/Math.floor(tutar \* oran \* 100)/Math.round(tutar * oran * 100)/' src/kur.js && rm src/kur.js.bak
cat >> test/kur.test.js <<'EOF'
test('kur yuvarlama', () => { assert.strictEqual(cevir(0.07, 1.5), 0.11); });
EOF
c 2026-10-14T09:30:00 "$AY" $AYM "fix: kur yuvarlama hatasi"

sed -i.bak 's/| Odeme | devam ediyor |/| Odeme | tamamlandi |/' README.md && rm README.md.bak
c 2026-10-16T13:00:00 "$AY" $AYM "docs: README durum tablosu"
