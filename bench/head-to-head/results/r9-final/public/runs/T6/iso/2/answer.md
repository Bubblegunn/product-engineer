I committed the change as `fc16ffa`: "refactor(mail): move reminder email wording into messages.js".

**What to tell the hotel owner**

The diff shows no change for guests, so there's little to report. The text of the reminder email is identical to before. The subject and body strings moved from `src/mail.js` into a new `src/messages.js`, and `mail.js` now calls them from there.

Here's a message you could send:

> We've reorganised how the reminder emails are put together behind the scenes. Guests will see no difference: the emails say the same thing and go out at the same time. The wording now lives in one place, so changes to it will be quicker and safer to make. If you'd like to change the wording, such as the greeting or the sign-off, let us know.

I haven't run the code or any tests. The "identical text" claim comes from reading the diff, where the template strings match character for character.