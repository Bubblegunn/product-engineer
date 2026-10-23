I committed the change as `2fa7597`.

The commit message says the email text is unchanged. The diff supports that: the subject and body strings are identical, and only their location moved.

## What to tell the hotel owner

The owner probably cares about what guests see, so you could say:

> We reorganised how the reminder emails are built behind the scenes. Guests will see no difference: the subject, wording and check-in time are the same as before. The wording now sits in one place, so changing it later will be quicker and safer.

## Points to check before you send it

- **Wording changes:** If the owner wants different wording, the place to edit is [`messages.js`](file://<WORK>/runs/T6-iso-invoked-2/repo/src/messages.js#L1-L10).
- **Testing:** I did not run the code or any tests. I only compared the old and new strings in the diff. If you want certainty, send yourself one reminder and compare it with an earlier one.