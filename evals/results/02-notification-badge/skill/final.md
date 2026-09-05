Committed as `a78b9f3`.

**For the customer:** the bell now carries a number showing how many notifications are still waiting for someone at the desk to act. Nothing waiting means no number at all, so the badge always means "something needs you."

**What I did:** added `countNeedsAction` and wired it into `renderBell` (`src/notifications.js:8`), 7 tests, and a README paragraph stating the counting rule.

**Done means observed — what I could and couldn't check:**
- ✅ Ran it against the real fixture data and read the output: renders `<span class="bell-count">2</span>`, counting "Room 12 checkout" and "Guest asked for late checkout".
- ✅ Tried the failure path: `undefined`, `[]`, and a malformed list all degrade to a bell with no number rather than throwing.
- ✅ Read the customer-facing text aloud — the screen reader label reads "Notifications, 2 items need you", and singular/plural is handled.
- ❌ **Could not watch it in a browser or in production.** Nothing in this repo calls `renderBell`, and there's no app shell or stylesheet — so I've verified the markup it produces, not how it looks on a real screen. Someone with the menu wired up should eyeball it.

**One thing to confirm:** I read "still need a person" as *needs a person AND unread*. That excludes "Invoice 88 paid" — flagged as needing a person, but already read — making the count 2 rather than 3. If your team treats reading as separate from handling, that's a one-line change in `countNeedsAction` and I'll flip it.

I deliberately left out CSS for the count, a "99+" cap, and mark-as-read from the bell; each is recorded in the commit under `Not shipped:` with the reason.
