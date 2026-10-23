I committed the change as `d09cca5`: `refactor(mail): move reminder email wording into messages.js`.

The reminder text now lives in the new `src/messages.js`, and `src/mail.js` calls into it. I compared the old and new strings and they are identical, so guests will get exactly the same email as before. I didn't run any tests.

**What to tell the hotel owner:** nothing has changed for them or their guests. The reminder emails read the same and go out the same way. We only reorganised the code so the wording is in one place, which makes it easier to change the text later. If they want different wording, that's now a small edit.