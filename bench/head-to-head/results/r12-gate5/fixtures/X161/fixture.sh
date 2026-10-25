#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Priya Nair"
git config user.email "priya@example.test"

ci() { # who date message
  local n e
  case "$1" in
    priya) n="Priya Nair"; e="priya@example.test";;
    tomas) n="Tomas Weber"; e="tomas@example.test";;
    lena) n="Lena Ortiz"; e="lena@example.test";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" \
    GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}

mkdir -p invoicekit tests config docs

# 1 skeleton
cat > README.md <<'EOF'
# invoicekit

Small library the Billing team uses to build, number, tax and render customer invoices.

## Features

- Invoice and line item models
- Sequential invoice numbers (`INV-0001`)
- VAT calculation
- Plain-text rendering
- Email delivery of invoices (see `docs/operations.md`)

## Tests

    python -m unittest
EOF
cat > .gitignore <<'EOF'
__pycache__/
*.pyc
EOF
cat > pyproject.toml <<'EOF'
[project]
name = "invoicekit"
version = "0.3.0"
description = "Invoice building blocks"
requires-python = ">=3.9"
EOF
touch invoicekit/__init__.py tests/__init__.py
cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.3.0 - 2026-08-14
- Added VAT calculation
- Added plain-text rendering

## 0.2.0 - 2026-07-02
- Added sequential invoice numbers
EOF
ci priya "2026-07-01T09:00:00" "chore: project skeleton"

cat > invoicekit/models.py <<'EOF'
from dataclasses import dataclass, field


@dataclass
class Line:
    description: str
    qty: int
    unit_cents: int

    def total(self):
        return self.qty * self.unit_cents


@dataclass
class Invoice:
    number: str
    customer: str
    lines: list = field(default_factory=list)
    currency: str = "EUR"

    def subtotal(self):
        return sum(line.total() for line in self.lines)
EOF
cat > tests/test_models.py <<'EOF'
import unittest
from invoicekit.models import Invoice, Line


class ModelTests(unittest.TestCase):
    def test_subtotal(self):
        inv = Invoice("INV-0001", "Acme", [Line("a", 2, 500), Line("b", 1, 250)])
        self.assertEqual(inv.subtotal(), 1250)

    def test_empty(self):
        self.assertEqual(Invoice("INV-0002", "Acme").subtotal(), 0)
EOF
ci priya "2026-07-01T11:30:00" "feat: invoice and line models"

cat > invoicekit/store.py <<'EOF'
class Store:
    def __init__(self):
        self._items = {}

    def save(self, invoice):
        self._items[invoice.number] = invoice

    def get(self, number):
        return self._items[number]

    def all(self):
        return [self._items[k] for k in sorted(self._items)]
EOF
cat > tests/test_store.py <<'EOF'
import unittest
from invoicekit.models import Invoice
from invoicekit.store import Store


class StoreTests(unittest.TestCase):
    def test_roundtrip(self):
        s = Store()
        s.save(Invoice("INV-0002", "B"))
        s.save(Invoice("INV-0001", "A"))
        self.assertEqual([i.customer for i in s.all()], ["A", "B"])
        self.assertEqual(s.get("INV-0002").customer, "B")
EOF
ci tomas "2026-07-01T15:00:00" "feat: in-memory store"

cat > invoicekit/numbering.py <<'EOF'
def next_number(last, prefix="INV"):
    if last is None:
        return "%s-%03d" % (prefix, 1)
    seq = int(last.split("-")[1]) + 1
    return "%s-%03d" % (prefix, seq)
EOF
cat > tests/test_numbering.py <<'EOF'
import unittest
from invoicekit.numbering import next_number


class NumberingTests(unittest.TestCase):
    def test_first(self):
        self.assertEqual(next_number(None), "INV-001")

    def test_next(self):
        self.assertEqual(next_number("INV-041"), "INV-042")
EOF
ci tomas "2026-07-02T10:00:00" "feat: sequential invoice numbers"

cat > invoicekit/tax.py <<'EOF'
def vat(cents, rate_percent):
    return cents * rate_percent // 100
EOF
cat > tests/test_tax.py <<'EOF'
import unittest
from invoicekit.tax import vat


class TaxTests(unittest.TestCase):
    def test_round_number(self):
        self.assertEqual(vat(1000, 20), 200)

    def test_truncates(self):
        self.assertEqual(vat(1999, 20), 399)
EOF
ci priya "2026-08-03T10:00:00" "feat: VAT calculation"

cat > invoicekit/render.py <<'EOF'
def render_text(invoice):
    out = ["Invoice %s for %s" % (invoice.number, invoice.customer)]
    for line in invoice.lines:
        out.append("  %s x%d  %.2f" % (line.description, line.qty, line.total() / 100))
    out.append("Subtotal %.2f %s" % (invoice.subtotal() / 100, invoice.currency))
    return "\n".join(out)
EOF
cat > tests/test_render.py <<'EOF'
import unittest
from invoicekit.models import Invoice, Line
from invoicekit.render import render_text


class RenderTests(unittest.TestCase):
    def test_render(self):
        inv = Invoice("INV-001", "Acme", [Line("Widget", 2, 500)])
        text = render_text(inv)
        self.assertIn("Invoice INV-001 for Acme", text)
        self.assertIn("Subtotal 10.00 EUR", text)
EOF
ci lena "2026-08-10T13:00:00" "feat: plain-text rendering"

cat > docs/architecture.md <<'EOF'
# Architecture

`models` holds data, `store` keeps invoices in memory, `numbering` produces
the next invoice number, `tax` computes VAT, `render` makes text output.
Everything is pure Python with no third-party packages.
EOF
ci priya "2026-08-12T09:00:00" "docs: architecture overview"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.3.0 - 2026-08-14
- Added VAT calculation
- Added plain-text rendering

## 0.2.0 - 2026-07-02
- Added sequential invoice numbers
EOF
git tag -a v0.3.0 -m "0.3.0" 2>/dev/null || git tag v0.3.0

cat > config/settings.json <<'EOF'
{
  "currency": "EUR",
  "vat_rate_percent": 20,
  "features": {
    "email_delivery": false
  },
  "smtp_host": "",
  "smtp_port": 587
}
EOF
cat > invoicekit/config.py <<'EOF'
import json
import os

DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "settings.json")


def load(path=None):
    with open(path or DEFAULT_PATH) as fh:
        return json.load(fh)
EOF
cat > tests/test_config.py <<'EOF'
import unittest
from invoicekit.config import load


class ConfigTests(unittest.TestCase):
    def test_defaults(self):
        s = load()
        self.assertEqual(s["currency"], "EUR")
        self.assertEqual(s["vat_rate_percent"], 20)
EOF
ci tomas "2026-08-20T10:00:00" "feat: settings file and loader"

cat > docs/operations.md <<'EOF'
# Operations

Settings live in `config/settings.json`. Currency and VAT rate apply to every
invoice. Restart the service after changing the file.
EOF
ci priya "2026-08-21T09:30:00" "docs: operations notes"

cat > invoicekit/mailer.py <<'EOF'
def send_invoice(invoice, settings, transport=None):
    """Send an invoice by email. Returns True when sent, False when disabled."""
    if not settings["features"]["email_delivery"]:
        return False
    if not settings["smtp_host"]:
        raise ValueError("smtp_host is not configured")
    body = "Invoice %s for %s" % (invoice.number, invoice.customer)
    transport(settings["smtp_host"], settings["smtp_port"], body)
    return True
EOF
cat > tests/test_mailer.py <<'EOF'
import unittest
from invoicekit.mailer import send_invoice
from invoicekit.models import Invoice


class MailerTests(unittest.TestCase):
    def test_disabled_returns_false(self):
        s = {"features": {"email_delivery": False}, "smtp_host": "", "smtp_port": 587}
        self.assertFalse(send_invoice(Invoice("INV-001", "A"), s))

    def test_enabled_sends(self):
        sent = []
        s = {"features": {"email_delivery": True}, "smtp_host": "mail.local", "smtp_port": 25}
        ok = send_invoice(Invoice("INV-001", "A"), s, lambda h, p, b: sent.append((h, p, b)))
        self.assertTrue(ok)
        self.assertEqual(sent[0][0], "mail.local")

    def test_enabled_without_host_fails(self):
        s = {"features": {"email_delivery": True}, "smtp_host": "", "smtp_port": 25}
        with self.assertRaises(ValueError):
            send_invoice(Invoice("INV-001", "A"), s)
EOF
ci lena "2026-09-14T16:00:00" "feat: email delivery of invoices"

sed -i.bak 's/version = "0.3.0"/version = "0.4.0"/' pyproject.toml && rm pyproject.toml.bak
ci lena "2026-09-15T08:45:00" "chore: bump version to 0.4.0"

cat > docs/release-plan.md <<'EOF'
# Release plan - 0.4.0

Target: Friday 30 October 2026.

| Item                | Owner | Status |
|---------------------|-------|--------|
| Email delivery      | Lena  | done   |
| CSV export          | Tomas | done   |
| VAT rounding fix    | Priya | todo   |

Release manager: Priya. Tag `v0.4.0` after the checklist is complete.
EOF
ci priya "2026-10-12T09:00:00" "docs: release plan for 0.4.0"

# branch for CSV export, cut here
git checkout -q -b feature/csv-export

cat > invoicekit/export.py <<'EOF'
import csv
import io

HEADER = ["number", "customer", "currency", "subtotal_cents"]


def to_csv(invoices):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(HEADER)
    for inv in invoices:
        w.writerow([inv.number, inv.customer, inv.currency, inv.subtotal()])
    return buf.getvalue()


def write_csv(path, invoices):
    # TODO: file is written as ASCII, non-ASCII customer names are replaced with '?'
    with open(path, "w", encoding="ascii", errors="replace", newline="") as fh:
        fh.write(to_csv(invoices))
EOF
cat > tests/test_export.py <<'EOF'
import os
import tempfile
import unittest
from invoicekit.export import to_csv, write_csv
from invoicekit.models import Invoice, Line


class ExportTests(unittest.TestCase):
    def test_header_and_row(self):
        inv = Invoice("INV-001", "Acme", [Line("a", 2, 500)])
        lines = to_csv([inv]).splitlines()
        self.assertEqual(lines[0], "number,customer,currency,subtotal_cents")
        self.assertEqual(lines[1], "INV-001,Acme,EUR,1000")

    @unittest.skip("customer names with accents are written as '?', fix encoding before release")
    def test_unicode_customer_names(self):
        inv = Invoice("INV-002", "Müller GmbH")
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "out.csv")
            write_csv(p, [inv])
            with open(p, encoding="utf-8") as fh:
                self.assertIn("Müller GmbH", fh.read())
EOF
ci tomas "2026-10-19T14:00:00" "feat: CSV export of invoices"

cat >> docs/operations.md <<'EOF'

## Export

`invoicekit.export.write_csv(path, invoices)` writes one row per invoice.
EOF
ci tomas "2026-10-21T10:20:00" "docs: describe CSV export"

git checkout -q main

# main continues
cat > invoicekit/numbering.py <<'EOF'
def next_number(last, prefix="INV"):
    if last is None:
        return "%s-%04d" % (prefix, 1)
    seq = int(last.split("-")[1]) + 1
    return "%s-%04d" % (prefix, seq)
EOF
cat > tests/test_numbering.py <<'EOF'
import unittest
from invoicekit.numbering import next_number


class NumberingTests(unittest.TestCase):
    def test_first(self):
        self.assertEqual(next_number(None), "INV-0001")

    def test_next(self):
        self.assertEqual(next_number("INV-0041"), "INV-0042")
EOF
sed -i.bak 's/INV-001/INV-0001/g' tests/test_render.py tests/test_mailer.py && rm tests/*.bak
ci priya "2026-10-20T09:10:00" "fix: four-digit invoice numbers"

cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased
- Added email delivery of invoices
- Added CSV export of invoices

## 0.3.0 - 2026-08-14
- Added VAT calculation
- Added plain-text rendering

## 0.2.0 - 2026-07-02
- Added sequential invoice numbers
EOF
ci lena "2026-10-22T11:00:00" "docs: update changelog"

cat > docs/operations.md <<'EOF'
# Operations

Settings live in `config/settings.json`. Currency and VAT rate apply to every
invoice. Restart the service after changing the file.

To send invoices by email, set `smtp_host` and `smtp_port`.
EOF
ci lena "2026-10-23T09:00:00" "docs: how to configure mail"

echo ".venv/" >> .gitignore
ci tomas "2026-10-23T14:00:00" "chore: ignore virtualenvs"

cat >> tests/test_store.py <<'PYEOF'

    def test_empty(self):
        self.assertEqual(Store().all(), [])
PYEOF
ci tomas "2026-10-24T09:00:00" "test: store empty case"

sed -i.bak 's/^- Email delivery of invoices (see `docs\/operations.md`)/- Email delivery of invoices (see `docs\/operations.md`)\n- CSV export of invoices/' README.md && rm README.md.bak
ci priya "2026-10-24T10:30:00" "docs: mention CSV export in README"
