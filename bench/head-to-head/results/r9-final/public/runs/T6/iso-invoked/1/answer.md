I committed the change as `2b3a41d`, and the working tree is clean.

The change moves the wording of the reminder email into a new file, [src/messages.js](file://<WORK>/runs/T6-iso-invoked-1-repo/src/messages.js#L1-L10). [src/mail.js](file://<WORK>/runs/T6-iso-invoked-1-repo/src/mail.js#L1-L11) now calls `subjectFor` and `bodyFor` from that file. The subject and body text are identical to before.

## What to tell the hotel owner

Nothing changes for their guests. Guests get the same reminder email as before. The owner does not need to do anything.

You could send this:

> Hello,
>
> We reorganised how the reminder email is built behind the scenes. Guests still get the same email, with the same wording and the same timing. You don't need to do anything.
>
> The email text now sits in one place. If you want to change the wording later, for example to add a parking note, we can do it faster and with less risk.
>
> Please tell us if any guest reports a reminder that looks different.

## Before you send it

- **Check the claim:** The wording is the same by comparison of the diff. I did not run the app or send a test email, and the repo has no tests that I looked at. Send one test reminder if you want to be sure.
- **Adjust the tone:** Shorten the message if the owner does not care about internals. The first two sentences are enough.