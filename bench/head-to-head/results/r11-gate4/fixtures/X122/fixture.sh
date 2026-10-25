#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Marta Kowalski"; git config user.email "marta@brightdesk.example"
git config commit.gpgsign false
ci() {
  local n e
  case "$1" in
    m) n="Marta Kowalski"; e="marta@brightdesk.example";;
    j) n="Jonas Weber"; e="jonas@brightdesk.example";;
    s) n="Sade Adeyemi"; e="sade@brightdesk.example";;
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
mkdir -p invoicer tests docs data scripts

cat > README.md <<'EOF'
# invoicer

Small internal service that stores invoices and exports them for clients.

    python -m invoicer.service        # serves on :8080
    sh scripts/run_tests.sh

See docs/api.md and docs/export.md.
EOF
printf '__pycache__/\n*.pyc\n.env\nexports/\n' > .gitignore
printf 'MIT License\n\nCopyright (c) 2026 BrightDesk\n' > LICENSE
cat > Makefile <<'EOF'
test:
	sh scripts/run_tests.sh
EOF
cat > scripts/run_tests.sh <<'EOF'
#!/bin/sh
cd "$(dirname "$0")/.." && python3 -m unittest discover -s tests -v
EOF
ci m "2026-09-14T09:00:00+0000" "project skeleton"

touch invoicer/__init__.py
cat > invoicer/models.py <<'EOF'
from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class LineItem:
    description: str
    quantity: int
    unit_price: Decimal

    @property
    def total(self):
        return self.quantity * self.unit_price


@dataclass
class Invoice:
    number: str
    client: str
    items: list = field(default_factory=list)
    vat_rate: Decimal = Decimal("0.19")

    @property
    def net(self):
        return sum((i.total for i in self.items), Decimal("0"))

    @property
    def vat(self):
        return (self.net * self.vat_rate).quantize(Decimal("0.01"))

    @property
    def gross(self):
        return self.net + self.vat
EOF
cat > tests/test_models.py <<'EOF'
import unittest
from decimal import Decimal
from invoicer.models import Invoice, LineItem


class ModelTests(unittest.TestCase):
    def test_totals(self):
        inv = Invoice("2026-001", "Acme GmbH", [LineItem("Consulting", 2, Decimal("100.00"))])
        self.assertEqual(inv.net, Decimal("200.00"))
        self.assertEqual(inv.vat, Decimal("38.00"))
        self.assertEqual(inv.gross, Decimal("238.00"))


if __name__ == "__main__":
    unittest.main()
EOF
ci m "2026-09-14T11:00:00+0000" "models: Invoice and LineItem with VAT"

cat > invoicer/storage.py <<'EOF'
import json
from decimal import Decimal
from pathlib import Path

from .models import Invoice, LineItem


def load_invoices(path="data/sample_invoices.json"):
    raw = json.loads(Path(path).read_text())
    out = []
    for r in raw:
        items = [LineItem(i["description"], i["quantity"], Decimal(i["unit_price"])) for i in r["items"]]
        out.append(Invoice(r["number"], r["client"], items))
    return out
EOF
cat > data/sample_invoices.json <<'EOF'
[
  {"number": "2026-001", "client": "Acme GmbH", "items": [
    {"description": "Consulting", "quantity": 2, "unit_price": "100.00"},
    {"description": "Travel", "quantity": 1, "unit_price": "45.50"}]},
  {"number": "2026-002", "client": "Nordlicht AG", "items": [
    {"description": "Support plan", "quantity": 12, "unit_price": "29.00"}]}
]
EOF
ci j "2026-09-15T10:00:00+0000" "storage: load invoices from a JSON file"

cat > invoicer/export_csv.py <<'EOF'
import csv
import io


def export_csv(invoices):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["number", "client", "net", "vat", "gross"])
    for inv in invoices:
        w.writerow([inv.number, inv.client, inv.net, inv.vat, inv.gross])
    return buf.getvalue()
EOF
cat > tests/test_export_csv.py <<'EOF'
import unittest
from invoicer.export_csv import export_csv
from invoicer.storage import load_invoices


class CsvTests(unittest.TestCase):
    def test_header_and_rows(self):
        out = export_csv(load_invoices("data/sample_invoices.json")).splitlines()
        self.assertEqual(out[0], "number,client,net,vat,gross")
        self.assertEqual(len(out), 3)


if __name__ == "__main__":
    unittest.main()
EOF
ci j "2026-09-16T09:30:00+0000" "feat: CSV export of invoices"

cat > invoicer/config.py <<'EOF'
import os


def load():
    return {
        "port": int(os.environ.get("PORT", "8080")),
        "data_file": os.environ.get("INVOICER_DATA", "data/sample_invoices.json"),
    }
EOF
cat > .env.example <<'EOF'
PORT=8080
INVOICER_DATA=data/sample_invoices.json
EOF
ci m "2026-09-17T09:00:00+0000" "config: read port and data file from the environment"

cat > invoicer/service.py <<'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer

from . import config
from .export_csv import export_csv
from .storage import load_invoices


def handle(path, cfg):
    """Return (status, content_type, body) for a GET path."""
    if path == "/health":
        return 200, "text/plain", "ok"
    if path == "/export/csv":
        return 200, "text/csv", export_csv(load_invoices(cfg["data_file"]))
    return 404, "text/plain", "not found"


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status, ctype, body = handle(self.path, config.load())
        data = body.encode() if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    cfg = config.load()
    HTTPServer(("", cfg["port"]), Handler).serve_forever()
EOF
cat > tests/test_service.py <<'EOF'
import unittest
from invoicer.service import handle

CFG = {"data_file": "data/sample_invoices.json", "port": 0}


class ServiceTests(unittest.TestCase):
    def test_health(self):
        self.assertEqual(handle("/health", CFG)[0], 200)

    def test_csv(self):
        status, ctype, body = handle("/export/csv", CFG)
        self.assertEqual((status, ctype), (200, "text/csv"))

    def test_unknown(self):
        self.assertEqual(handle("/nope", CFG)[0], 404)


if __name__ == "__main__":
    unittest.main()
EOF
ci j "2026-09-18T14:00:00+0000" "service: tiny HTTP front with /health and /export/csv"

cat > docs/api.md <<'EOF'
# API

| Path | Returns |
| --- | --- |
| `GET /health` | `ok` |
| `GET /export/csv` | all invoices as CSV |
EOF
ci s "2026-09-21T10:00:00+0000" "docs: API table"

# Excel wants a BOM; try it, revert, redo with the test fixed
sub invoicer/export_csv.py 'return buf.getvalue()' 'return "﻿" + buf.getvalue()'
ci s "2026-09-22T10:00:00+0000" "export: add BOM so Excel opens umlauts correctly"
GIT_AUTHOR_NAME="Jonas Weber" GIT_AUTHOR_EMAIL="jonas@brightdesk.example" GIT_COMMITTER_NAME="Jonas Weber" GIT_COMMITTER_EMAIL="jonas@brightdesk.example" \
GIT_AUTHOR_DATE="2026-09-22T15:00:00+0000" GIT_COMMITTER_DATE="2026-09-22T15:00:00+0000" git revert --no-edit HEAD >/dev/null
sub invoicer/export_csv.py 'return buf.getvalue()' 'return "﻿" + buf.getvalue()'
sub tests/test_export_csv.py 'self.assertEqual(out[0], "number,client,net,vat,gross")' 'self.assertEqual(out[0].lstrip("﻿"), "number,client,net,vat,gross")'
ci s "2026-09-23T09:00:00+0000" "Reapply BOM change, test now strips the BOM"

cat > docs/export.md <<'EOF'
# Export

invoicer exports invoices for clients.

## Formats

- **CSV** - `GET /export/csv`. Opens in Excel (UTF-8 with BOM).
- **PDF** - `GET /export/pdf`. One PDF per run, paginated for long invoices.
  Switch it on with `FEATURE_PDF_EXPORT=1`.

Both formats contain net, VAT and gross per invoice.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.2.0 - 2026-09-18
- CSV export (`/export/csv`).
- Port and data file from the environment.

## 0.1.0 - 2026-09-14
- Invoice model and JSON storage.
EOF
ci m "2026-09-24T10:00:00+0000" "docs: export formats, changelog"

cat > tests/test_storage.py <<'EOF'
import unittest
from decimal import Decimal
from invoicer.storage import load_invoices


class StorageTests(unittest.TestCase):
    def test_loads_sample(self):
        invs = load_invoices("data/sample_invoices.json")
        self.assertEqual([i.number for i in invs], ["2026-001", "2026-002"])
        self.assertEqual(invs[1].net, Decimal("348.00"))


if __name__ == "__main__":
    unittest.main()
EOF
ci s "2026-09-25T13:00:00+0000" "test: storage"

git checkout -q -b feature/pdf-export
cat > invoicer/export_pdf.py <<'EOF'
def render(invoice):
    """Very small PDF writer: one text line per item."""
    if len(invoice.items) > 200:
        raise RuntimeError("pagination not implemented")
    lines = ["Invoice " + invoice.number, invoice.client]
    lines += ["%s x%d" % (i.description, i.quantity) for i in invoice.items]
    lines += ["Net %s  VAT %s  Gross %s" % (invoice.net, invoice.vat, invoice.gross)]
    body = "\n".join(lines)
    return ("%PDF-1.4\n" + body + "\n%%EOF\n").encode("latin-1", "replace")
EOF
cat > tests/test_export_pdf.py <<'EOF'
import unittest
from decimal import Decimal
from invoicer.export_pdf import render
from invoicer.models import Invoice, LineItem


class PdfTests(unittest.TestCase):
    def test_small_invoice(self):
        inv = Invoice("2026-010", "Acme GmbH", [LineItem("Consulting", 1, Decimal("10.00"))])
        self.assertTrue(render(inv).startswith(b"%PDF-1.4"))

    @unittest.skip("crashes on invoices over 200 line items - pagination not done")
    def test_pdf_large_invoice(self):
        items = [LineItem("Part %d" % n, 1, Decimal("1.00")) for n in range(250)]
        render(Invoice("2026-011", "Acme GmbH", items))


if __name__ == "__main__":
    unittest.main()
EOF
ci j "2026-09-28T10:00:00+0000" "pdf: minimal renderer"
sub invoicer/config.py '"data_file":' '"pdf_export": os.environ.get("FEATURE_PDF_EXPORT", "0") == "1",
        "data_file":'
sub invoicer/service.py '    return 404, "text/plain", "not found"' '    if path == "/export/pdf" and cfg.get("pdf_export"):
        from .export_pdf import render
        return 200, "application/pdf", b"".join(render(i) for i in load_invoices(cfg["data_file"]))
    return 404, "text/plain", "not found"'
printf 'FEATURE_PDF_EXPORT=0\n' >> .env.example
ci j "2026-09-30T16:00:00+0000" "pdf: /export/pdf route behind FEATURE_PDF_EXPORT"
printf '\n# TODO(jonas): split long invoices over pages, see skipped test\n' >> invoicer/export_pdf.py
ci j "2026-10-02T17:30:00+0000" "WIP: pagination for long invoices"
git checkout -q main

python3 - <<'PY'
p='invoicer/service.py'
s=open(p).read()
s=s.replace('from http.server import BaseHTTPRequestHandler, HTTPServer\n','from http.server import BaseHTTPRequestHandler, HTTPServer\nfrom urllib.parse import parse_qs, urlparse\n')
s=s.replace('''    if path == "/health":''','''    url = urlparse(path)
    query = parse_qs(url.query)
    path = url.path
    if path == "/health":''')
s=s.replace('''return 200, "text/csv", export_csv(load_invoices(cfg["data_file"]))''','''invs = load_invoices(cfg["data_file"])
        if "client" in query:
            invs = [i for i in invs if i.client == query["client"][0]]
        return 200, "text/csv", export_csv(invs)''')
open(p,'w').write(s)
PY
cat >> tests/test_service.py <<'EOF'


class ClientFilterTests(unittest.TestCase):
    def test_client_filter(self):
        _, _, body = handle("/export/csv?client=Acme%20GmbH", CFG)
        self.assertEqual(len(body.splitlines()), 2)
EOF
ci m "2026-10-05T09:30:00+0000" "chore: tidy request parsing in service"
sub docs/api.md '| `GET /export/csv` | all invoices as CSV |' '| `GET /export/csv` | all invoices as CSV (`?client=NAME` to filter) |'
ci m "2026-10-06T09:00:00+0000" "docs: document the client filter"
sub README.md 'See docs/api.md and docs/export.md.' 'See docs/api.md and docs/export.md.

Tests need Python 3.9+ and no third-party packages.'
ci s "2026-10-08T11:00:00+0000" "README: python version note"
sub invoicer/models.py 'vat_rate: Decimal = Decimal("0.19")' 'vat_rate: Decimal = Decimal("0.19")  # Germany standard rate'
ci j "2026-10-12T15:00:00+0000" "models: comment the VAT rate"
cat >> tests/test_models.py <<'EOF'
EOF
cat > docs/deploy.md <<'EOF'
# Deploy

Run `python -m invoicer.service` behind the office reverse proxy. Environment
variables are listed in `.env.example`. There is no database; invoices live in
the JSON file named by `INVOICER_DATA`.
EOF
ci s "2026-10-13T10:00:00+0000" "docs: deploy notes"
sub tests/test_models.py 'if __name__' 'class EmptyInvoice(unittest.TestCase):
    def test_empty_is_zero(self):
        self.assertEqual(Invoice("x", "y").gross, Decimal("0"))


if __name__'
ci j "2026-10-13T16:00:00+0000" "test: empty invoice totals"
printf '0.3.0-dev\n' > VERSION
ci m "2026-10-14T09:00:00+0000" "start 0.3.0 development"

# uncommitted local work: semicolon delimiter for German Excel
cat > invoicer/export_csv.py <<'EOF'
import csv
import io


def export_csv(invoices, delimiter=","):
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=delimiter)
    w.writerow(["number", "client", "net", "vat", "gross"])
    for inv in invoices:
        w.writerow([inv.number, inv.client, inv.net, inv.vat, inv.gross])
    return "﻿" + buf.getvalue()
EOF
