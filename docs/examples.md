# A real pair from the evaluation

Task 02 of the evaluation asks for a count on the notification bell. Both commit messages
are unedited apart from the trailer. Bare:

```
Show count of notifications needing a person on the bell

Add countNeedsPerson() and render it as a badge on the bell, hidden when
the count is zero.

The data has no "handled" flag, so the count treats `read` as the proxy
for handled: an item counts only when needsPerson is true and read is
false. That makes "Invoice 88 paid" (needsPerson, already read) drop out
of the badge.
```

With the skill:

```
feat(notifications): show a count on the bell for items awaiting a person

Count items flagged as needing a person that nobody has read yet. Items the
system handled on its own, and items already read, are excluded. The badge is
hidden entirely at zero so the number always means "something needs you".

For the customer:
What changed: The bell in the menu now carries a number showing how many notifications are still waiting for someone at the desk to act. When nothing is waiting, there is no number at all.
Why it matters: Front desk staff can see at a glance whether anything needs them, instead of opening the list to find out.

Assumption to confirm: a notification stops counting once someone has read it.
In the sample data this excludes "Invoice 88 paid", which is flagged as needing
a person but already read. If reading is not what marks an item handled, the
rule is one line in countNeedsAction.

Not shipped:
- Styling for the count: this repo has no stylesheet, so the number renders as plain text next to "Bell"; worth doing alongside whoever owns the menu's CSS.
- A "99+" cap for large counts: no evidence of how high real counts go; worth it once the number is wide enough to break the menu layout.
- Marking items read from the bell: not asked for, and it needs a decision on where notification state lives.
```

Every transcript is under [`evals/results/`](../evals/results/).
