`SUPPORT_NOTE.md` is in the repo root. It has 4 sentences and no code. The only other change is the new file, and nothing was committed. The checker still prints "result: fail", but only because of source numbers I left out on purpose: commit hash, dates, file sizes, line counts and test inputs. It now reports no added numbers and no sentences without a source counterpart.

The note says:
- The commit title says "no behaviour change", but the change makes shipping cost more for some orders.
- Standard shipping for small orders goes from $4.99 to $5.99.
- Free shipping used to start at $50 and now applies only above $75, so an order at exactly that amount pays shipping.
- Express shipping stays at $12.5.

The note first had 6 sentences. The claim check flagged three of them as having no counterpart in the source, so I deleted them:
- The heading.
- A sentence about customers with orders between $50 and $75 asking why.
- A sentence saying I could not check whether this is released.

**Not in the note:**
- **Customer-facing impact:** Orders between $50 and $75 used to ship free and now pay $5.99. That follows from the thresholds, but I did not put it in the note.
- **Release status:** I can't tell from the repo whether this is released. Confirm the release date with Dana before telling customers.

**Question for Dana:** The commit says "no behaviour change", but the diff changes what customers pay. Ask Dana whether the new fee and threshold were intended. If they weren't, the constants should go back to 4.99 and 50 (with `>=`), and the note would no longer apply.