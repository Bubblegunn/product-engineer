#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Team"
git config user.email "dev@example.test"
D=0
now() { echo "@$((1767225600 + D*37000)) +0000"; }
c() { D=$((D+1)); local t; t=$(now); git add -A; GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git commit -q -m "$1"; }

mkdir -p src test docs
printf 'node_modules/\n' > .gitignore
cat > package.json <<'EOF'
{
  "name": "faturakit",
  "version": "0.6.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# faturakit

Kucuk isletmeler icin fatura hesaplama kutuphanesi.
EOF
c "chore: initial project"

for i in 1 2 3 4; do
  cat > src/musteri$i.js <<EOF
exports.id = $i;
exports.etiket = (m) => 'M$i-' + m.ad;
EOF
  cat > test/musteri$i.test.js <<EOF
const test = require('node:test');
const assert = require('node:assert');
const m = require('../src/musteri$i');
test('musteri$i etiketi', () => assert.strictEqual(m.etiket({ ad: 'Ali' }), 'M$i-Ali'));
EOF
  c "feat: musteri modulu $i"
done

cat > src/tax.js <<'EOF'
exports.KDV_RATE = 0.18;
exports.withTax = (n) => Math.round(n * (1 + exports.KDV_RATE) * 100) / 100;
EOF
cat > src/format.js <<'EOF'
exports.para = (n) => n.toFixed(2).replace('.', ',') + ' TL';
EOF
cat > src/invoice.js <<'EOF'
const { withTax } = require('./tax');
const { para } = require('./format');
exports.build = (items) => {
  const net = items.reduce((a, i) => a + i.fiyat * i.adet, 0);
  return { net, toplam: withTax(net), toplamYazi: para(withTax(net)) };
};
EOF
cat > test/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { build } = require('../src/invoice');
test('toplam KDV ile', () => {
  assert.strictEqual(build([{ fiyat: 100, adet: 1 }]).toplam, 118);
});
EOF
c "feat: fatura hesaplama"

for i in 1 2 3; do
  echo "// gozden gecirildi $i" >> src/musteri$i.js
  c "chore: musteri $i gozden gecirme"
done

git checkout -q -b wip/invoice-pdf
cat > src/pdf.js <<'EOF'
const { build } = require('./invoice');
exports.render = (items, baslik = 'FATURA') => {
  const f = build(items);
  return [baslik, 'Net: ' + f.net, 'Toplam: ' + f.toplamYazi].join('\n');
};
EOF
cat > test/pdf.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { render } = require('../src/pdf');
test('baslik yazilir', () => assert.match(render([{ fiyat: 10, adet: 1 }]), /FATURA/));
EOF
c "feat: pdf iskeleti"

for i in 1 2 3; do
  echo "// yerlesim denemesi $i" >> src/pdf.js
  c "wip: pdf yerlesim $i"
done

sed -i.bak 's/KDV_RATE = 0.18/KDV_RATE = 0.20/' src/tax.js && rm src/tax.js.bak
sed -i.bak 's/, 118)/, 120)/' test/invoice.test.js && rm test/invoice.test.js.bak
c "refactor: tax table"

cat >> test/pdf.test.js <<'EOF'
test('sayfa altbilgisi', () => assert.match(render([{ fiyat: 10, adet: 1 }]), /Sayfa 1\/1/));
test('turkce karakterler', { skip: 'font eksik' }, () => assert.match(render([{ fiyat: 10, adet: 1 }], 'FATURA Şğ'), /Şğ/));
EOF
c "test: altbilgi ve turkce karakter"

# stash an experiment
echo "exports.yuvarla = (n) => Math.round(n * 100) / 100;" >> src/format.js
t=$(now); GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git stash push -q -m "yuvarlama denemesi"

# uncommitted half-finished work + untracked files
cat >> src/pdf.js <<'EOF'
// TODO: altbilgi (Sayfa 1/1) henuz yazilmadi
exports.altbilgi = (sayfa, toplam) => '';
EOF
printf 'SMTP_PASSWORD=hunter2-not-for-git\n' > .env.local
printf 'kdv orani musteriyle konusulacak\n' > scratch.txt
