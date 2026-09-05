Done — committed as `b770658` on a new branch `bell-badge` (you were on `main`, so I branched first).

**What I added** in `src/notifications.js`:
- `countNeedsPerson(items)` — the count itself, exported so it's testable and reusable.
- `renderBell` now renders a `<span class="bell-badge">` with the number, plus an `aria-label`. No badge element at all when the count is zero, rather than a "0".
- `src/notifications.test.js` covering the count and both bell states.

**The one judgment call you should confirm.** "Still need a person to do something" has two readings, and your fixture data sits right on the seam. Notification 4 ("Invoice 88 paid") has `needsPerson: true` but `read: true`:

- Count everything with `needsPerson: true` → badge shows **3**
- Count only unread ones → badge shows **2**

I went with **2**. "Still" implies subtracting what's already been dealt with, and `read` is the only signal in the data that anything has been dealt with. But that's a real assumption: there's no `handled` or `done` field, and marking a notification read isn't the same as acting on it. Someone can glance at "Guest asked for late checkout" without arranging the late checkout.

If the front desk manager means "how many action items exist, regardless of whether anyone's looked," drop the `&& !item.read` in `countNeedsPerson` and update the two test expectations — that's the whole change. Worth asking them, since a badge that clears when someone merely opens the menu could quietly hide real work.
