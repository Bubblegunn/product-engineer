I committed the change as `167354c`: "refactor(mail): move reminder email wording into messages module".

**What to tell the hotel owner:** Nothing has changed for them or their guests. This was an internal tidy-up. The reminder wording now lives in its own file, `src/messages.js`, and `src/mail.js` calls it. I compared the diff and the subject and body text are identical to before. Guests will get the same emails, at the same time, with the same content.

If you want something to say, you could use this: "We reorganised how the reminder emails are built behind the scenes. Guests see no difference. It also means any future wording changes you want will be quicker for us to make."

I only read the diff and didn't run the code or any tests, so the "identical" claim comes from reading the strings.