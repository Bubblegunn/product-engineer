I committed the change as `4af3a51`, "refactor(mail): move reminder email wording into messages.js".

**What to tell the hotel owner:** nothing in the emails changes for guests, so there's little to report. You could say:

> "We tidied up how the reminder emails are put together behind the scenes. The emails guests receive are exactly the same as before: same subject, same wording, same check-in time. If you'd like to change the wording later, it's now in one place and quicker for us to update."

I checked the diff and the subject and body strings are character-for-character identical to the old ones. I didn't run any tests.