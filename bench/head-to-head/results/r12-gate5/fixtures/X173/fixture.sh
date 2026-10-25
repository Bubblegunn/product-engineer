#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Sofia Marin"; git config user.email "sofia@example.com"
N=0
cm() {
  N=$((N+1))
  local d; d=$(printf "2025-07-%02dT14:%02d:00Z" $((1+N/2)) $((N%60)))
  case "$1" in
    1) export GIT_AUTHOR_NAME="Sofia Marin" GIT_AUTHOR_EMAIL="sofia@example.com";;
    2) export GIT_AUTHOR_NAME="Dmitri Volkov" GIT_AUTHOR_EMAIL="dmitri@example.com";;
    3) export GIT_AUTHOR_NAME="Grace Okafor" GIT_AUTHOR_EMAIL="grace@example.com";;
  esac
  export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
  export GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d"
  git add -A; git commit -q -m "$2"
}
mkdir -p billing tests docs scripts data
printf '__pycache__/\n*.pyc\n' > .gitignore
cat > README.md <<'X'
# billing

Invoice, refund and month-end export helpers for the shop backend.

    python -m unittest

See docs/rounding.md for how amounts are rounded.
X
cm 1 "chore: initial README"
touch billing/__init__.py tests/__init__.py
cat > billing/models.py <<'X'
from dataclasses import dataclass


@dataclass
class Line:
    sku: str
    qty: int
    unit_price: float
X
cm 1 "feat: line model"
cat > billing/tax.py <<'X'
RATES = {"DE": 0.19, "GB": 0.20, "US-CA": 0.0725, "NL": 0.21}


def rate_for(region):
    return RATES.get(region, 0.0)
X
cm 1 "feat: tax rates by region"
cat > billing/invoice.py <<'X'
from . import tax


def line_total(line):
    return round(line.qty * line.unit_price, 2)


def build(lines, region):
    subtotal = round(sum(line_total(l) for l in lines), 2)
    vat = round(subtotal * tax.rate_for(region), 2)
    return {"subtotal": subtotal, "tax": vat, "total": round(subtotal + vat, 2)}
X
cm 1 "feat: invoice totals"
cat > billing/refunds.py <<'X'
def refund_amount(line, qty_returned, restock_fee=0.0):
    gross = line.unit_price * qty_returned
    return float("%.2f" % (gross - restock_fee))
X
cm 2 "feat: refund amount with restocking fee"
cat > billing/export.py <<'X'
def cents(x):
    return int(x * 100 + 0.5) / 100


def to_csv(invoices):
    out = ["id,subtotal,tax,total"]
    for inv in invoices:
        out.append("%s,%.2f,%.2f,%.2f" % (
            inv["id"], cents(inv["subtotal"]), cents(inv["tax"]), cents(inv["total"])))
    return "\n".join(out) + "\n"
X
cm 2 "feat: csv export for accounting"
cat > billing/report.py <<'X'
def customer_totals(invoices):
    totals = {}
    for inv in invoices:
        totals[inv["customer"]] = totals.get(inv["customer"], 0.0) + inv["total"]
    return {k: round(v, 2) for k, v in totals.items()}
X
cm 3 "feat: per-customer totals report"
cat > billing/legacy_reconcile.py <<'X'
def bank_amount(x):
    # The bank's settlement file truncates to whole cents, it does not round.
    # We must match it exactly or reconciliation shows false differences.
    # Do not change this to rounding. See docs/reconciliation.md.
    return int(x * 100) / 100


def difference(our_total, bank_total):
    return round(bank_amount(our_total) - bank_amount(bank_total), 2)
X
cm 3 "feat: reconcile against bank settlement file"
cat > tests/test_invoice.py <<'X'
import unittest

from billing import invoice
from billing.models import Line


class InvoiceTest(unittest.TestCase):
    def test_simple_total(self):
        r = invoice.build([Line("a", 2, 19.99)], "DE")
        self.assertEqual(r, {"subtotal": 39.98, "tax": 7.6, "total": 47.58})

    def test_no_tax_region(self):
        r = invoice.build([Line("a", 1, 10.0)], "XX")
        self.assertEqual(r["total"], 10.0)

    def test_line_total(self):
        self.assertEqual(invoice.line_total(Line("a", 3, 2.5)), 7.5)
X
cm 1 "test: invoice totals"
cat > tests/test_refunds.py <<'X'
import unittest

from billing import refunds
from billing.models import Line


class RefundTest(unittest.TestCase):
    def test_full_refund(self):
        self.assertEqual(refunds.refund_amount(Line("a", 2, 10.0), 2), 20.0)

    def test_restock_fee(self):
        self.assertEqual(refunds.refund_amount(Line("a", 2, 10.0), 1, 1.5), 8.5)
X
cm 2 "test: refunds"
cat > tests/test_export.py <<'X'
import unittest

from billing import export


class ExportTest(unittest.TestCase):
    def test_csv(self):
        csv = export.to_csv([{"id": "A1", "subtotal": 10.0, "tax": 1.9, "total": 11.9}])
        self.assertEqual(csv, "id,subtotal,tax,total\nA1,10.00,1.90,11.90\n")

    def test_cents(self):
        self.assertEqual(export.cents(3.14), 3.14)
X
cm 2 "test: csv export"
cat > tests/test_report.py <<'X'
import unittest

from billing import report


class ReportTest(unittest.TestCase):
    def test_totals_per_customer(self):
        inv = [
            {"customer": "c1", "total": 10.1},
            {"customer": "c1", "total": 20.2},
            {"customer": "c2", "total": 5.0},
        ]
        self.assertEqual(report.customer_totals(inv), {"c1": 30.3, "c2": 5.0})
X
cm 3 "test: report"
cat > tests/test_legacy_reconcile.py <<'X'
import unittest

from billing import legacy_reconcile as lr


class LegacyTest(unittest.TestCase):
    def test_truncates_like_the_bank(self):
        self.assertEqual(lr.bank_amount(2.999), 2.99)
        self.assertEqual(lr.bank_amount(10.0), 10.0)

    def test_difference(self):
        self.assertEqual(lr.difference(10.009, 10.0), 0.0)
X
cm 3 "test: legacy reconcile truncation"
cat > tests/test_tax.py <<'X'
import unittest

from billing import tax


class TaxTest(unittest.TestCase):
    def test_known_region(self):
        self.assertEqual(tax.rate_for("GB"), 0.20)

    def test_unknown_region(self):
        self.assertEqual(tax.rate_for("ZZ"), 0.0)
X
cm 1 "test: tax rates"
cat > docs/rounding.md <<'X'
# Rounding

Amounts are floats rounded to two decimals with Python's `round(x, 2)`, which is
banker's rounding. Half-cent values may therefore go either way.

Refund amounts and the CSV export round on their own, with the same intent.
The bank reconciliation is the exception; see reconciliation.md.
X
cm 1 "docs: rounding policy"
cat > docs/reconciliation.md <<'X'
# Reconciliation

The bank's settlement file truncates amounts to whole cents. `legacy_reconcile.bank_amount`
mirrors that on purpose so our totals compare equal to theirs. A 2024 attempt to round
instead produced about 40 false differences per day, so keep it as truncation.
X
cm 3 "docs: why reconciliation truncates"
cat > docs/api.md <<'X'
# Module overview

- `billing.invoice.build(lines, region)` returns subtotal, tax, total.
- `billing.refunds.refund_amount(line, qty_returned, restock_fee)` returns the refund.
- `billing.export.to_csv(invoices)` returns the accounting CSV text.
- `billing.report.customer_totals(invoices)` sums totals per customer.
X
cm 1 "docs: module overview"
echo '[{"id":"A1","customer":"c1","region":"DE","lines":[["a",2,19.99]]}]' > data/sample_orders.json
cm 2 "chore: sample orders"
cat > scripts/month_end.py <<'X'
"""Month-end: build invoices from sample orders and print the CSV."""
import json
import sys

from billing import export, invoice
from billing.models import Line


def main(path="data/sample_orders.json"):
    with open(path) as f:
        orders = json.load(f)
    invs = []
    for o in orders:
        lines = [Line(*l) for l in o["lines"]]
        inv = invoice.build(lines, o["region"])
        inv["id"], inv["customer"] = o["id"], o["customer"]
        invs.append(inv)
    sys.stdout.write(export.to_csv(invs))


if __name__ == "__main__":
    main(*sys.argv[1:])
X
cm 2 "feat: month-end script"
printf 'test:\n\tpython -m unittest\n' > Makefile
cm 1 "chore: Makefile"
printf '# Changelog\n\n## 0.4.0\n- Add month-end script.\n\n## 0.3.0\n- Add bank reconciliation.\n\n## 0.2.0\n- Add refunds and CSV export.\n' > CHANGELOG.md
cm 1 "docs: changelog"
printf '\nRun `make test` before opening a pull request.\n' >> README.md
cm 3 "docs: how to run tests"
printf '\n## Month end\n\n    PYTHONPATH=. python scripts/month_end.py\n' >> README.md
cm 2 "docs: month end usage"
printf '\n- Fix: report sums are rounded after summing.\n' >> CHANGELOG.md
cm 3 "docs: changelog note"
printf '\nAll amounts are in the shop currency; there is no currency conversion here.\n' >> docs/api.md
cm 1 "docs: currency note"
