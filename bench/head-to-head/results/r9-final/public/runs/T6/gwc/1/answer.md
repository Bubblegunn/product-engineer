I committed the change as `3574338`: `refactor(mail): move reminder email wording into messages module`.

**What to tell the hotel owner:** Nothing about this change affects them. It only moves code around. The reminder email wording now lives in its own file, `src/messages.js`, and `src/mail.js` calls it. Guests get the same subject and body as before, character for character. I compared the old and new text and they match.

If you want to say something, "We tidied up how reminder emails are put together, so wording changes will be easier to make later" is accurate. Don't promise any change in what guests see.